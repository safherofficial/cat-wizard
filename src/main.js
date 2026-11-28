import * as THREE from 'three';
import { buildLighting as buildArtLighting, buildArena as buildArtArena, buildWizardCat, buildWisps as buildArtWisps, animateWorld } from './world-art.js';
import { recognizeGesture, SPELLS } from './gesture.js';
import { PerformanceMonitor, resolveQualityPreset } from './performance.js';
import './style.css';

const W = 26, D = 15, clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const rand = (a,b) => a + Math.random() * (b-a);
const dist = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);

function createGlowTexture(){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const context=canvas.getContext('2d');
  const gradient=context.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(255,255,245,1)');
  gradient.addColorStop(.14,'rgba(255,229,173,.96)');
  gradient.addColorStop(.34,'rgba(255,145,67,.7)');
  gradient.addColorStop(.62,'rgba(255,82,32,.2)');
  gradient.addColorStop(1,'rgba(255,52,20,0)');
  context.fillStyle=gradient;
  context.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.generateMipmaps=true;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  return texture;
}

class CatWizard {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#83d1ed');
    this.scene.fog = new THREE.Fog('#b9e2e8',42,92);
    this.camera = new THREE.PerspectiveCamera(48,1,.1,120);
    this.camera.position.set(0,20,20);
    this.cameraLook = new THREE.Vector3(0,0,-2);
    this.camera.lookAt(this.cameraLook);
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0),-.05);
    const params = new URLSearchParams(window.location.search);
    this.quality = resolveQualityPreset(params.get('quality'));
    this.renderer = new THREE.WebGLRenderer({canvas,antialias:this.quality.antialias,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,this.quality.maxPixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .98;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = this.quality.shadowMap === 'soft' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.performanceMonitor = params.get('perf') === '1'
      ? new PerformanceMonitor(canvas.parentElement, this.quality.label)
      : null;
    this.glowTexture=createGlowTexture();

    this.clock = new THREE.Timer();
    this.clock.connect(document);
    this.keys = new Set();
    this.props = [];
    this.obstacles = [];
    this.wisps = [];
    this.effects = [];
    this.debris = [];
    this.stroke = [];
    this.strokeLine = null;
    this.spellPointer = null;
    this.movePointer = null;
    this.moveOrigin = null;
    this.touchMove = new THREE.Vector2();
    this.playerMove = new THREE.Vector2();
    this.playerHealth = 5;
    this.playerInvul = 0;
    this.respawn = 0;
    this.wispsDefeated = 0;
    this.castCount = 0;
    this.lastSpell = 'No spell cast yet';
    this.worldTime = 0;
    this.timeScale = 1;
    this.restore = null;
    this.buildLighting();
    this.buildArena();
    this.buildPlayer();
    this.buildWisps();
    this.bindInput();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    this.updateHud();
    this.hasRendered = false;
    this.renderer.setAnimationLoop(() => {
      try {
        this.frame();
        if (!this.hasRendered) {
          this.hasRendered = true;
          window.__CAT_WIZARD_READY__ = true;
          const loading = document.getElementById('loading-screen');
          loading?.classList.remove('startup-error');
          loading?.classList.add('loaded');
        }
      } catch (error) {
        console.error('Cat Wizard render loop failed:', error);
        this.renderer.setAnimationLoop(null);
        window.__CAT_WIZARD_SHOW_ERROR__?.(error);
      }
    });
  }

  buildLighting() { buildArtLighting(this); }

  buildArena() { buildArtArena(this); }

  addPillar(x,z) {
    const group=new THREE.Group();group.position.set(x,0,z);this.scene.add(group);
    this.obstacles.push({x,z,radius:.74,fixed:true});
    const mat=new THREE.MeshStandardMaterial({color:'#565462',roughness:.94});
    const base=new THREE.Mesh(new THREE.BoxGeometry(1.05,.25,1.05),mat);base.position.y=.13;group.add(base);
    const body=new THREE.Mesh(new THREE.BoxGeometry(.78,1.9,.78),mat);body.position.y=1.2;body.castShadow=true;group.add(body);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(.98,.22,.98),new THREE.MeshStandardMaterial({color:'#756879'}));cap.position.y=2.25;group.add(cap);
  }

  addShadow(parent,w,d,opacity=.25) {
    const s=new THREE.Mesh(new THREE.CircleGeometry(.5,28),new THREE.MeshBasicMaterial({color:'#08060c',transparent:true,opacity,depthWrite:false}));
    s.rotation.x=-Math.PI/2;s.position.set(.06,.018,.08);s.scale.set(w,d,1);parent.add(s);return s;
  }

  addProp(type,x,z,width,height,hp) {
    const group=new THREE.Group();group.position.set(x,0,z);this.scene.add(group);this.addShadow(group,width*.8,width*.52,.48);
    const palette={crate:'#bb8654',barrel:'#69a79b',vase:'#df8e83',stone:'#879eae'};
    const mat=new THREE.MeshStandardMaterial({color:palette[type],roughness:type==='vase'?.42:.86,metalness:type==='vase'?.08:0,flatShading:true});
    let body;
    if(type==='barrel') {
      body=new THREE.Mesh(new THREE.CylinderGeometry(width*.44,width*.48,height,12),mat);
      for(const y of [.18,height-.18]){const hoop=new THREE.Mesh(new THREE.TorusGeometry(width*.45,.045,6,24),new THREE.MeshStandardMaterial({color:'#b18a57',metalness:.72,roughness:.4}));hoop.rotation.x=Math.PI/2;hoop.position.y=y;group.add(hoop);}
    } else if(type==='vase') body=new THREE.Mesh(new THREE.CylinderGeometry(width*.18,width*.46,height,12),mat);
    else body=new THREE.Mesh(new THREE.BoxGeometry(width,height,type==='stone'?width:width*.9),mat);
    body.position.y=height/2;body.castShadow=true;body.receiveShadow=true;group.add(body);
    if(type==='crate'){
      const plank=new THREE.Mesh(new THREE.BoxGeometry(width*1.02,height*.13,.11),new THREE.MeshStandardMaterial({color:'#bf9162'}));plank.position.y=height*.5;group.add(plank);
      const brace=new THREE.Mesh(new THREE.BoxGeometry(width*.82,height*.11,.12),new THREE.MeshStandardMaterial({color:'#c49b70'}));brace.position.y=height*.38;brace.rotation.z=Math.PI/4;group.add(brace);
    }
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),new THREE.LineBasicMaterial({color:'#1e1820',transparent:true,opacity:.35}));edge.position.copy(body.position);group.add(edge);
    const propState={group,body,mat,type,hp,radius:Math.max(.38,width*.58),velocity:new THREE.Vector2(),spin:rand(-.2,.2),frozen:0,destroyed:false};
    this.props.push(propState);this.obstacles.push(propState);
  }

  buildPlayer() { this.player=buildWizardCat(this); }

  buildWisps() { this.wisps=buildArtWisps(this); }

  bindInput() {
    window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();this.keys.add(k);});
    window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
    const cancelActiveInput=()=>{
      this.keys.clear();
      this.movePointer=null;
      this.moveOrigin=null;
      this.touchMove.set(0,0);
      if(this.spellPointer!==null)this.cancelGesture();
    };
    window.addEventListener('blur',cancelActiveInput);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelActiveInput();});
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.canvas.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      const rect=this.canvas.getBoundingClientRect(),x=e.clientX-rect.left;
      if(e.pointerType==='touch'&&x<rect.width*.32&&this.movePointer===null){
        this.movePointer=e.pointerId;this.moveOrigin={x:e.clientX,y:e.clientY};this.touchMove.set(0,0);this.canvas.setPointerCapture(e.pointerId);e.preventDefault();return;
      }
      if(this.spellPointer===null){
        this.spellPointer=e.pointerId;this.stroke=[{x:e.clientX,y:e.clientY}];this.timeScale=.15;this.restore=null;
        this.drawStroke();this.status('Time slowed · draw your glyph');this.canvas.setPointerCapture(e.pointerId);e.preventDefault();
      }
    });
    this.canvas.addEventListener('pointermove',e=>{
      if(e.pointerId===this.movePointer&&this.moveOrigin){
        const r=this.canvas.getBoundingClientRect(),radius=Math.max(50,Math.min(r.width,r.height)*.13);
        this.touchMove.set(clamp((e.clientX-this.moveOrigin.x)/radius,-1,1),clamp((e.clientY-this.moveOrigin.y)/radius,-1,1));return;
      }
      if(e.pointerId===this.spellPointer){const p=this.stroke.at(-1);if(!p||Math.hypot(e.clientX-p.x,e.clientY-p.y)>3){this.stroke.push({x:e.clientX,y:e.clientY});this.drawStroke();}}
    });
    const release=(e,cancelled=false)=>{
      if(e.pointerId===this.movePointer){this.movePointer=null;this.moveOrigin=null;this.touchMove.set(0,0);}
      if(e.pointerId===this.spellPointer){
        if(cancelled)this.cancelGesture();
        else this.endGesture();
      }
    };
    this.canvas.addEventListener('pointerup',e=>release(e,false));
    this.canvas.addEventListener('pointercancel',e=>release(e,true));
    this.canvas.addEventListener('lostpointercapture',e=>release(e,true));
  }

  resize() {
    const r=this.canvas.parentElement.getBoundingClientRect(),w=Math.max(320,r.width),h=Math.max(260,r.height);
    this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);
  }

  screenToWorld(p) {
    const r=this.canvas.getBoundingClientRect(),ndc=new THREE.Vector2(((p.x-r.left)/r.width)*2-1,-(((p.y-r.top)/r.height)*2-1));
    this.raycaster.setFromCamera(ndc,this.camera);const hit=new THREE.Vector3();
    if(!this.raycaster.ray.intersectPlane(this.groundPlane,hit))return new THREE.Vector3(this.player.position.x,.12,this.player.position.z);
    hit.x=clamp(hit.x,-17.5,17.5);hit.z=clamp(hit.z,-13,13);hit.y=.12;return hit;
  }

  drawStroke() {
    if(this.strokeLine){this.scene.remove(this.strokeLine);this.strokeLine.geometry.dispose();this.strokeLine.material.dispose();}
    if(this.stroke.length<2)return;
    const g=new THREE.BufferGeometry().setFromPoints(this.stroke.map(p=>this.screenToWorld(p)));
    this.strokeLine=new THREE.Line(g,new THREE.LineBasicMaterial({color:'#bcefff',transparent:true,opacity:.95}));
    this.strokeLine.frustumCulled=false;this.scene.add(this.strokeLine);
  }

  clearGestureStroke() {
    if(this.strokeLine){this.scene.remove(this.strokeLine);this.strokeLine.geometry.dispose();this.strokeLine.material.dispose();this.strokeLine=null;}
    this.stroke=[];
  }

  restoreWorldTime() {
    this.restore={from:this.timeScale,elapsed:0,duration:.25};
  }

  cancelGesture() {
    if(this.spellPointer===null)return;
    this.spellPointer=null;
    this.clearGestureStroke();
    this.restoreWorldTime();
    this.status('Gesture cancelled · time returning to normal');
  }

  endGesture() {
    if(this.spellPointer===null)return;
    this.spellPointer=null;
    const result=recognizeGesture(this.stroke);
    const target=this.stroke.length?this.screenToWorld(this.stroke.at(-1)):this.player.position.clone();
    if(result)this.cast(result.spell,target,result.confidence);
    else{this.lastSpell='Unrecognized glyph';this.status('The glyph slipped. Draw one clear, continuous stroke.');this.updateHud();}
    this.clearGestureStroke();
    this.restoreWorldTime();
  }

  cast(spell,target,confidence) {
    this.castCount++;this.lastSpell=SPELLS[spell].name;this.status(this.lastSpell+' cast · '+Math.round(confidence*100)+'% match');this.updateHud();
    if(spell==='Fireball'){
      const orb=new THREE.Group();
      const shell=new THREE.Mesh(new THREE.IcosahedronGeometry(.28,1),new THREE.MeshStandardMaterial({color:'#ff6a3d',emissive:'#ff542c',emissiveIntensity:1.9,roughness:.28,flatShading:true}));
      const core=new THREE.Mesh(new THREE.SphereGeometry(.145,12,10),new THREE.MeshBasicMaterial({color:'#fff1b4',toneMapped:false}));
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glowTexture,color:'#ff8a42',transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
      glow.scale.set(1.5,1.5,1);orb.add(shell,core,glow);orb.add(new THREE.PointLight('#ff783e',6,4));
      this.scene.add(orb);
      this.effects.push({kind:'fire',object:orb,start:new THREE.Vector3(this.player.position.x,.95,this.player.position.z),target:new THREE.Vector3(target.x,.95,target.z),age:0,duration:.46,lastTrail:-1});
    }else if(spell==='Thunderbolt'){
      const a=new THREE.Vector3(this.player.position.x,.8,this.player.position.z),b=new THREE.Vector3(target.x,1.1,target.z);
      this.addLightning(a,b);
      this.damageLine(a,b);this.burst(new THREE.Vector3(target.x,.65,target.z),'#ffe18a',28,2.4);
    }else if(spell==='Frost'){
      this.castFrost(target);
    }else if(spell==='Gravity'){
      const center=new THREE.Vector2(target.x,target.z);
      this.wisps.forEach(w=>{if(!w.defeated&&dist(w.group.position,{x:target.x,z:target.z})<=5.8){this.hitWisp(w,'Gravity',.8,center);this.pullWisp(w,center,1.6);}});
      const ring=this.ring(target,'#b995ff');
      const echo=this.ring(target,'#e4d7ff');echo.position.y=.24;
      this.effects.push({kind:'ring',object:echo,age:0,duration:1.15,scale:4.7});
      this.effects.push({kind:'gravity',object:ring,center,age:0,duration:1.15});
      this.burst(new THREE.Vector3(target.x,.3,target.z),'#c4a4ff',16,1.8);
    }else if(spell==='Chaos')this.radial(spell,target,3.8,2.4,'#ff9ccc',17,0);
  }

  castFrost(target){
    this.radial('Frost',target,3.25,.25,'#91dcff',0,1.4);
    this.burst(new THREE.Vector3(target.x,.4,target.z),'#b8ecff',34,2.1);
    const material=new THREE.MeshStandardMaterial({color:'#c6f4ff',emissive:'#69c8e8',emissiveIntensity:.5,roughness:.2,metalness:.18,transparent:true,opacity:.92});
    for(let i=0;i<9;i++){
      const a=i*Math.PI*2/9,r=rand(.8,2.7),shard=new THREE.Mesh(new THREE.OctahedronGeometry(rand(.14,.25),0),material.clone());
      shard.position.set(target.x+Math.cos(a)*r,rand(.65,1.25),target.z+Math.sin(a)*r);
      shard.rotation.set(rand(0,Math.PI),rand(0,Math.PI),rand(0,Math.PI));this.scene.add(shard);
      this.debris.push({object:shard,v:new THREE.Vector3(Math.cos(a)*rand(.15,.55),rand(1.4,2.8),Math.sin(a)*rand(.15,.55)),age:0,duration:rand(.8,1.35),gravity:1.7});
    }
  }

  addLightning(start,end){
    const points=[start.clone()];
    const count=15;
    for(let i=1;i<count;i++){
      const t=i/count,p=start.clone().lerp(end,t);
      p.x+=rand(-.55,.55);p.z+=rand(-.55,.55);p.y+=Math.sin(t*Math.PI)*rand(.15,.9);points.push(p);
    }
    points.push(end.clone());
    this.lineEffect(points,'#fff9dc',.34);
    const glowPoints=points.map(p=>new THREE.Vector3(p.x,p.y-.035,p.z));
    this.lineEffect(glowPoints,'#82eaff',.28);
    [4,8,11].forEach((at,index)=>{
      const origin=points[at],sign=index%2?1:-1;
      const branchEnd=origin.clone().add(new THREE.Vector3(sign*rand(.55,1.15),rand(-.15,.25),rand(.35,.85)));
      const branchPoints=[origin,origin.clone().lerp(branchEnd,.42).add(new THREE.Vector3(rand(-.18,.18),.16,rand(-.18,.18))),branchEnd];
      this.lineEffect(branchPoints,'#fff1a8',.22);
    });
  }

  ring(p,color) {const m=new THREE.Mesh(new THREE.TorusGeometry(.75,.065,8,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,depthWrite:false}));m.rotation.x=Math.PI/2;m.position.set(p.x,.22,p.z);this.scene.add(m);return m;}
  lineEffect(points,color,duration){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true}));this.scene.add(o);this.effects.push({kind:'line',object:o,age:0,duration});}
  radial(spell,target,radius,damage,color,impulse,freeze){
    const ring=this.ring(target,color);this.effects.push({kind:'ring',object:ring,age:0,duration:.58,scale:radius*1.28});
    this.burst(new THREE.Vector3(target.x,.35,target.z),color,spell==='Chaos'?46:34,radius*1.5);
    this.props.forEach(p=>{if(!p.destroyed&&dist(p.group.position,{x:target.x,z:target.z})<=radius){this.hitProp(p,spell,target,damage,impulse);if(freeze)this.freezeProp(p,freeze);}});
    this.wisps.forEach(w=>{if(!w.defeated&&dist(w.group.position,{x:target.x,z:target.z})<=radius+.35){this.hitWisp(w,spell,({Fireball:1.75,Thunderbolt:2.5,Frost:.7,Gravity:.8,Chaos:3.25})[spell]||1);if(freeze)w.freeze=freeze;if(impulse)this.pushWisp(w,target,impulse*.15);}});
  }
  damageLine(a,b){
    const ab=new THREE.Vector2(b.x-a.x,b.z-a.z);
    const dTo=p=>{const ap=new THREE.Vector2(p.x-a.x,p.z-a.z),t=clamp(ap.dot(ab)/Math.max(ab.lengthSq(),1e-4),0,1);return new THREE.Vector2(p.x,p.z).distanceTo(new THREE.Vector2(a.x,a.z).addScaledVector(ab,t));};
    this.props.forEach(p=>{if(!p.destroyed&&dTo(p.group.position)<.95)this.hitProp(p,'Thunderbolt',a,1.1,7);});
    this.wisps.forEach(w=>{if(!w.defeated&&dTo(w.group.position)<1.05)this.hitWisp(w,'Thunderbolt',2.5);});
  }
  hitProp(p,spell,center,damage,impulse){
    const dir=new THREE.Vector2(p.group.position.x-center.x,p.group.position.z-center.z);if(dir.lengthSq()<.001)dir.set(rand(-1,1),rand(-1,1));dir.normalize();
    if(spell==='Gravity')dir.multiplyScalar(-1);p.velocity.addScaledVector(dir,impulse*.16);p.spin+=rand(-1,1)*Math.max(.3,impulse*.05);p.hp-=damage;
    if(spell==='Frost')this.freezeProp(p,1.35);if(p.hp<=0)this.shatter(p,dir);
  }
  freezeProp(p,t){p.frozen=t;p.mat.color.set('#83d8ff');p.mat.emissive=new THREE.Color('#245d82');p.mat.emissiveIntensity=.45;}
  shatter(p,dir){
    p.destroyed=true;const pos=p.group.position.clone(),color=p.mat.color.clone();this.scene.remove(p.group);
    for(let i=0;i<8;i++){const size=rand(.08,.2),o=new THREE.Mesh(new THREE.BoxGeometry(size,size,size),new THREE.MeshStandardMaterial({color}));o.position.set(pos.x+rand(-.28,.28),rand(.25,.9),pos.z+rand(-.28,.28));o.rotation.set(rand(0,Math.PI),rand(0,Math.PI),rand(0,Math.PI));this.scene.add(o);this.debris.push({object:o,v:new THREE.Vector3(dir.x*rand(1.5,3.8)+rand(-1,1),rand(1,3),dir.y*rand(1.5,3.8)+rand(-1,1)),age:0,duration:1.5});}
    this.burst(new THREE.Vector3(pos.x,.4,pos.z),'#d0a47b',8,1.2);
  }
  hitWisp(w,spell,damage,center=null){
    if(w.defeated)return;w.health-=damage;w.flash=.16;this.burst(new THREE.Vector3(w.group.position.x,1,w.group.position.z),w.color,6,.8);
    if(spell==='Frost')w.freeze=1.4;if(spell==='Gravity')this.pullWisp(w,center||new THREE.Vector2(this.player.position.x,this.player.position.z),1.3);
    if(w.health<=0){w.defeated=true;this.wispsDefeated++;const p=w.group.position.clone();this.scene.remove(w.group);this.burst(new THREE.Vector3(p.x,.9,p.z),w.color,28,2.8);this.status('A cursed wisp has been dispersed');}
    this.updateHud();
  }
  pullWisp(w,target,force){const d=new THREE.Vector2(target.x-w.group.position.x,target.y===undefined?target.z:target.y-w.group.position.z);if(d.lengthSq()>.001)w.velocity.addScaledVector(d.normalize(),force);}
  pushWisp(w,center,force){const d=new THREE.Vector2(w.group.position.x-center.x,w.group.position.z-center.z);if(d.lengthSq()>.001)w.velocity.addScaledVector(d.normalize(),force);}
  burst(p,color,count,spread){
    for(let i=0;i<count;i++){
      const size=rand(.035,.095),geometry=i%4===0?new THREE.OctahedronGeometry(size*1.25,0):new THREE.SphereGeometry(size,7,6);
      const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
      const particle=new THREE.Mesh(geometry,material);
      particle.position.set(p.x+rand(-.12,.12),Math.max(.12,(p.y||0)+rand(-.12,.12)),p.z+rand(-.12,.12));
      particle.rotation.set(rand(0,Math.PI),rand(0,Math.PI),rand(0,Math.PI));this.scene.add(particle);
      this.debris.push({object:particle,v:new THREE.Vector3(rand(-spread,spread),rand(.4,2.1),rand(-spread,spread)),age:0,duration:rand(.42,1.05),gravity:1.05});
    }
  }

  disposeEffectObject(object){
    object.traverse(node=>{
      node.geometry?.dispose();
      if(node.material){
        const materials=Array.isArray(node.material)?node.material:[node.material];
        // Maps can be shared by sprites and other effects; release material
        // instances here and dispose the shared glow texture once at shutdown.
        materials.forEach(material=>material.dispose());
      }
    });
  }

  status(text){const e=document.getElementById('game-status');if(e)e.textContent=text;}
  updateHud(){
    const h=document.getElementById('health-value'),bar=document.getElementById('health-fill'),w=document.getElementById('wisp-value'),last=document.getElementById('last-spell'),count=document.getElementById('cast-count');
    if(h)h.textContent=this.playerHealth+' / 5';if(bar)bar.style.width=(this.playerHealth/5*100)+'%';if(w)w.textContent=this.wispsDefeated+' / 3';if(last)last.textContent=this.lastSpell;if(count)count.textContent=String(this.castCount).padStart(2,'0');
  }
  updatePlayer(dt,realDt){
    this.playerInvul=Math.max(0,this.playerInvul-realDt);
    if(this.respawn>0){this.respawn=Math.max(0,this.respawn-realDt);this.player.visible=Math.floor(this.respawn*20)%2===0;if(this.respawn===0){this.player.position.set(0,0,-3.4);this.playerHealth=5;this.playerMove.set(0,0);this.player.visible=true;this.updateHud();}return;}
    const m=new THREE.Vector2();if(this.keys.has('a')||this.keys.has('arrowleft'))m.x--;if(this.keys.has('d')||this.keys.has('arrowright'))m.x++;if(this.keys.has('w')||this.keys.has('arrowup'))m.y--;if(this.keys.has('s')||this.keys.has('arrowdown'))m.y++;m.add(this.touchMove);if(m.lengthSq()>1)m.normalize();
    this.playerMove.lerp(m.multiplyScalar(5.2),1-Math.exp(-dt*12));
    this.player.position.x=clamp(this.player.position.x+this.playerMove.x*dt,-16.7,16.7);
    this.player.position.z=clamp(this.player.position.z+this.playerMove.y*dt,-12.2,12.2);
    for(const obstacle of this.obstacles){
      if(obstacle.destroyed)continue;
      const ox=obstacle.fixed?obstacle.x:obstacle.group.position.x;
      const oz=obstacle.fixed?obstacle.z:obstacle.group.position.z;
      const dx=this.player.position.x-ox,dz=this.player.position.z-oz;
      const minimum=.5+obstacle.radius,d2=dx*dx+dz*dz;
      if(d2<minimum*minimum){
        const d=Math.sqrt(Math.max(d2,.0001)),nx=d2>.0001?dx/d:1,nz=d2>.0001?dz/d:0;
        this.player.position.x=ox+nx*minimum;
        this.player.position.z=oz+nz*minimum;
      }
    }
    this.player.position.x=clamp(this.player.position.x,-16.7,16.7);
    this.player.position.z=clamp(this.player.position.z,-12.2,12.2);
    if(this.catRoot){const moving=this.playerMove.length()>.24;if(moving)this.catRoot.rotation.y=Math.atan2(this.playerMove.x,this.playerMove.y);this.catRoot.position.y=.035+Math.sin(this.worldTime*(moving?12:4.2))*(moving?.065:.025);if(this.tail){this.tail.rotation.y=Math.sin(this.worldTime*2.6)*.28;this.tail.rotation.x=Math.cos(this.worldTime*2.1)*.12;}}
  }
  hurtPlayer(w){
    if(this.playerInvul>0||this.respawn>0)return;this.playerHealth=Math.max(0,this.playerHealth-1);this.playerInvul=1.15;
    const d=new THREE.Vector2(this.player.position.x-w.group.position.x,this.player.position.z-w.group.position.z);if(d.lengthSq()>.001)this.playerMove.addScaledVector(d.normalize(),4.4);
    this.burst(new THREE.Vector3(this.player.position.x,1.1,this.player.position.z),'#ffb0a0',16,1.15);
    this.status('Ouch. The cat has been cursed.');this.updateHud();if(this.playerHealth===0){this.respawn=1.15;this.status('The cat is returning to the chamber…');}
  }
  updateProps(dt){
    this.props.forEach(p=>{if(p.destroyed)return;if(p.frozen>0){p.frozen=Math.max(0,p.frozen-dt);if(!p.frozen){p.mat.color.set(({crate:'#956342',barrel:'#70452f',vase:'#a66f70',stone:'#686b7a'})[p.type]);p.mat.emissiveIntensity=0;}return;}
      p.group.position.x+=p.velocity.x*dt;p.group.position.z+=p.velocity.y*dt;p.group.rotation.y+=p.spin*dt;p.velocity.multiplyScalar(Math.exp(-dt*1.55));p.spin*=Math.exp(-dt*1.6);
      if(Math.abs(p.group.position.x)>12.2){p.group.position.x=clamp(p.group.position.x,-12.2,12.2);p.velocity.x*=-.42;}if(Math.abs(p.group.position.z)>6.7){p.group.position.z=clamp(p.group.position.z,-6.7,6.7);p.velocity.y*=-.42;}
    });
  }
  updateWisps(dt){
    this.wisps.forEach(w=>{if(w.defeated)return;if(w.flash>0){w.flash=Math.max(0,w.flash-dt);w.body.material.emissiveIntensity=w.flash?2.2:.85;}
      if(w.freeze>0){w.freeze=Math.max(0,w.freeze-dt);return;}
      const dx=this.player.position.x-w.group.position.x,dz=this.player.position.z-w.group.position.z,d=Math.hypot(dx,dz);let tx,tz;
      if(d<13&&this.respawn===0){tx=this.player.position.x;tz=this.player.position.z;}else{const a=this.worldTime*.7+w.phase;tx=w.home.x+Math.cos(a)*1.05;tz=w.home.y+Math.sin(a*1.25)*.68;}
      const dir=new THREE.Vector2(tx-w.group.position.x,tz-w.group.position.z);if(dir.lengthSq()>.05){dir.normalize();w.group.position.x+=dir.x*1.55*dt;w.group.position.z+=dir.y*1.55*dt;}
      w.velocity.multiplyScalar(Math.exp(-dt*2));w.group.position.x+=w.velocity.x*dt;w.group.position.z+=w.velocity.y*dt;
      w.group.position.y=.08+Math.sin(this.worldTime*3.1+w.phase)*.16;w.group.rotation.y+=dt*(.45+Math.sin(this.worldTime+w.phase)*.12);w.aura.scale.setScalar(1+Math.sin(this.worldTime*3+w.phase)*.1);w.halo.rotation.z+=dt*.7;w.light.intensity=2.7+Math.sin(this.worldTime*4+w.phase)*.7;
      if(w.cooldown>0)w.cooldown-=dt;if(d<.92&&w.cooldown<=0){this.hurtPlayer(w);w.cooldown=1;}
    });
  }
  updateEffects(dt){
    for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.age+=dt;const t=clamp(e.age/e.duration,0,1);
      if(e.kind==='fire'){
        e.object.position.copy(e.start).lerp(e.target,t);
        e.object.rotation.y+=dt*5;e.object.rotation.z+=dt*2.4;
        const trailStep=Math.floor(e.age*18);
        if(trailStep!==e.lastTrail){e.lastTrail=trailStep;this.burst(e.object.position,'#ffad5c',2,.28);}
        if(t>=1){this.radial('Fireball',e.target,2.1,1.25,'#ff875a',11,0);this.burst(new THREE.Vector3(e.target.x,.8,e.target.z),'#fff0b3',18,1.35);this.scene.remove(e.object);this.disposeEffectObject(e.object);this.effects.splice(i,1);continue;}
      }
      if(e.kind==='ring'){e.object.scale.setScalar(.6+t*e.scale);e.object.material.opacity=1-t;}
      if(e.kind==='gravity'){e.object.scale.setScalar(.8+t*4.2);e.object.rotation.y+=dt*2.7;e.object.material.opacity=.95-t*.5;
        this.props.forEach(p=>{if(p.destroyed||p.frozen>0)return;const d=new THREE.Vector2(e.center.x-p.group.position.x,e.center.y-p.group.position.z),r=Math.max(.45,d.length());if(r<5.4&&r>.001)p.velocity.addScaledVector(d.normalize(),dt*4.8/r);});
        this.wisps.forEach(w=>{if(w.defeated)return;const d=new THREE.Vector2(e.center.x-w.group.position.x,e.center.y-w.group.position.z);if(d.length()<5.8&&d.length()>.001)w.velocity.addScaledVector(d.normalize(),dt*4);});
      }
      if(e.kind==='line')e.object.material.opacity=1-t;
      if(t>=1){this.scene.remove(e.object);this.disposeEffectObject(e.object);this.effects.splice(i,1);}
    }
    for(let i=this.debris.length-1;i>=0;i--){
      const p=this.debris[i];p.age+=dt;p.v.y-=(p.gravity||5)*dt;p.object.position.addScaledVector(p.v,dt);
      p.object.rotation.x+=dt*3;p.object.rotation.z+=dt*4;
      const life=clamp(1-p.age/p.duration,0,1);p.object.scale.setScalar(Math.max(.01,life));
      if(p.object.material?.transparent)p.object.material.opacity=life;
      if(p.age>=p.duration){this.scene.remove(p.object);this.disposeEffectObject(p.object);this.debris.splice(i,1);}
    }
  }

  updateCamera(realDt,worldDt){animateWorld(this,worldDt,realDt);}

  frame(){
    const frameStartedAt = this.performanceMonitor ? performance.now() : 0;
    // Preserve elapsed time on low-refresh devices while keeping simulation
    // steps small enough for stable movement, impacts, and enemy contact.
    this.clock.update();
    const frameDelta=Math.min(this.clock.getDelta(),.25);
    const stepCount=Math.max(1,Math.ceil(frameDelta/.05));
    const realStep=frameDelta/stepCount;
    let worldDelta=0;
    for(let i=0;i<stepCount;i++){
      if(this.restore){
        this.restore.elapsed+=realStep;
        const t=clamp(this.restore.elapsed/this.restore.duration,0,1);
        this.timeScale=this.restore.from+(1-this.restore.from)*t;
        if(t>=1){this.timeScale=1;this.restore=null;}
      }
      const dt=realStep*this.timeScale;
      worldDelta+=dt;
      this.worldTime+=dt;
      this.updatePlayer(dt,realStep);
      this.updateProps(dt);
      this.updateWisps(dt);
      this.updateEffects(dt);
    }
    if(this.playerInvul>0&&this.respawn===0)this.player.visible=Math.floor((1.15-this.playerInvul)*18)%2===0;else if(!this.respawn)this.player.visible=true;
    this.updateCamera(frameDelta,worldDelta);
    this.renderer.render(this.scene,this.camera);
    if(this.performanceMonitor){
      this.performanceMonitor.update(
        performance.now() - frameStartedAt,
        this.renderer.info,
        this.renderer.getPixelRatio()
      );
    }
  }
  dispose(){
    this.renderer.setAnimationLoop(null);
    this.performanceMonitor?.dispose();
    this.resizeObserver.disconnect();
    this.clock.dispose();
    this.glowTexture.dispose();
    this.renderer.dispose();
  }
}

function boot(){
  try {
    const canvas=document.getElementById('game-canvas');
    if(!canvas)throw new Error('Game canvas #game-canvas not found.');
    const game=new CatWizard(canvas);
    if(new URLSearchParams(location.search).get('debug')==='1'){
      window.__CAT_WIZARD_DEBUG__=()=>({
        player:{x:game.player.position.x,z:game.player.position.z,health:game.playerHealth,invulnerability:game.playerInvul,respawn:game.respawn,moveX:game.playerMove.x,moveZ:game.playerMove.y},
        wisps:game.wisps.map(w=>({x:w.group.position.x,z:w.group.position.z,health:w.health,freeze:w.freeze,cooldown:w.cooldown,defeated:w.defeated,distance:Math.hypot(game.player.position.x-w.group.position.x,game.player.position.z-w.group.position.z)})),
        world:{time:game.worldTime,timeScale:game.timeScale,casts:game.castCount,defeated:game.wispsDefeated}
      });
    }
    window.addEventListener('beforeunload',()=>game.dispose(),{once:true});
    document.getElementById('fullscreen-button')?.addEventListener('click',()=>{const el=document.getElementById('game-shell');if(!document.fullscreenElement)el.requestFullscreen?.();else document.exitFullscreen?.();});
  } catch(error) {
    console.error('Cat Wizard startup failed:', error);
    window.__CAT_WIZARD_SHOW_ERROR__?.(error);
  }
}
boot();
