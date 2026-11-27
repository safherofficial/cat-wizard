import * as THREE from 'three';
import { recognizeGesture, SPELLS } from './gesture.js';
import './style.css';

const W = 26, D = 15, clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const rand = (a,b) => a + Math.random() * (b-a);
const dist = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);

class CatWizard {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#100d14');
    this.scene.fog = new THREE.Fog('#100d14', 25, 50);
    this.camera = new THREE.OrthographicCamera(-13,13,7.5,-7.5,.1,80);
    this.camera.position.set(0,30,0);
    this.camera.up.set(0,0,-1);
    this.camera.lookAt(0,0,0);
    this.renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.clock = new THREE.Clock();
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
    this.loadCat();
    this.updateHud();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  buildLighting() {
    this.scene.add(new THREE.HemisphereLight('#aeb6d2','#1d1620',2));
    const key = new THREE.DirectionalLight('#f0d7b1',2.2);
    key.position.set(-5,17,-7); key.castShadow = true;
    key.shadow.mapSize.set(1024,1024);
    Object.assign(key.shadow.camera,{left:-16,right:16,top:10,bottom:-10});
    this.scene.add(key);
    [[-9,-4,'#df7048'],[0,-5,'#8b71dd'],[9,3,'#4d9bd0']].forEach(([x,z,c]) => {
      const l = new THREE.PointLight(c,17,8,2); l.position.set(x,3.5,z); this.scene.add(l);
    });
  }

  floorTexture() {
    const c = document.createElement('canvas'); c.width = 1040; c.height = 600;
    const g = c.getContext('2d'); g.fillStyle = '#29242d'; g.fillRect(0,0,c.width,c.height);
    for(let y=0;y<c.height;y+=40) for(let x=0;x<c.width;x+=40) {
      const s = Math.floor(rand(-7,9));
      g.fillStyle = 'rgb('+(43+s)+','+(37+s)+','+(48+s)+')';
      g.fillRect(x+1,y+1,38,38); g.strokeStyle = 'rgba(5,4,9,.5)'; g.strokeRect(x+2,y+2,36,36);
      g.strokeStyle = 'rgba(206,173,133,.05)'; g.beginPath(); g.moveTo(x+4,y+4); g.lineTo(x+36,y+4); g.stroke();
    }
    const cx=520,cy=300;
    [[126,'rgba(206,163,111,.45)',4],[115,'rgba(206,163,111,.2)',2],[90,'rgba(167,133,203,.32)',3],[48,'rgba(206,163,111,.42)',3]].forEach(([r,col,w])=>{
      g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.strokeStyle=col;g.lineWidth=w;g.stroke();
    });
    g.strokeStyle='rgba(206,163,111,.32)';g.lineWidth=2;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.moveTo(cx+Math.cos(a)*55,cy+Math.sin(a)*55);g.lineTo(cx+Math.cos(a)*108,cy+Math.sin(a)*108);g.stroke();}
    g.fillStyle='rgba(211,174,124,.62)';g.font='bold 24px Georgia';g.textAlign='center';g.textBaseline='middle';
    for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;g.fillText('✦',cx+Math.cos(a)*156,cy+Math.sin(a)*156);}
    g.strokeStyle='rgba(190,148,101,.35)';g.lineWidth=8;g.strokeRect(12,12,1016,576);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return t;
  }

  buildArena() {
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,D),new THREE.MeshStandardMaterial({map:this.floorTexture(),roughness:.94,metalness:.04}));
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.scene.add(floor);
    const stone=new THREE.MeshStandardMaterial({color:'#4b3b4b',roughness:.85});
    const trim=new THREE.MeshStandardMaterial({color:'#8b684d',metalness:.62,roughness:.42});
    [[0,-7.85,26.7,.7],[0,7.85,26.7,.7],[-13.35,0,.7,15.7],[13.35,0,.7,15.7]].forEach(([x,z,sx,sz])=>{
      const wall=new THREE.Mesh(new THREE.BoxGeometry(sx,1.25,sz),stone);wall.position.set(x,.62,z);wall.castShadow=true;wall.receiveShadow=true;this.scene.add(wall);
      const cap=new THREE.Mesh(new THREE.BoxGeometry(sx*1.01,.12,sz*1.01),trim);cap.position.set(x,1.3,z);this.scene.add(cap);
    });
    const ringMat=new THREE.MeshStandardMaterial({color:'#92704e',metalness:.72,roughness:.34,emissive:'#3a2117',emissiveIntensity:.2});
    [[3.15,.055],[2.83,.025],[1.35,.04]].forEach(([r,t])=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,120),ringMat);ring.rotation.x=Math.PI/2;ring.position.y=.035;this.scene.add(ring);});
    for(let i=0;i<8;i++){const a=i*Math.PI/4;const rune=new THREE.Mesh(new THREE.OctahedronGeometry(.13),new THREE.MeshStandardMaterial({color:'#c29a6d',emissive:'#7440aa',emissiveIntensity:.2,metalness:.65}));rune.position.set(Math.cos(a)*3.02,.16,Math.sin(a)*3.02);rune.scale.y=.35;this.scene.add(rune);}
    [[-11.3,-6.1],[11.3,-6.1],[-11.3,6.1],[11.3,6.1]].forEach(([x,z])=>this.addPillar(x,z));
    const specs=[
      ['crate',-8,-3.1,1.1,1.1,2.6],['crate',-7,-4.5,1.1,1.1,2.6],['barrel',-4.3,3.5,.78,1.15,2.1],
      ['vase',-2,5.2,.72,1,1.6],['stone',4,4.8,1.4,1.35,3.5],['crate',7.1,3.8,1.15,1.1,2.6],
      ['barrel',8.5,1.8,.78,1.15,2.1],['stone',9,-4.5,1.3,1.35,3.5],['vase',4.1,-4.8,.72,1,1.6],
      ['crate',-4.8,-5.2,1.15,1.1,2.6],['stone',-10,1.2,1.2,1.4,3.5],['barrel',1,5.5,.78,1.15,2.1],
      ['crate',6.4,-1.2,1.15,1.1,2.6],['vase',-1.5,-5.5,.72,1,1.6]
    ];
    specs.forEach(s=>this.addProp(...s));
  }

  addPillar(x,z) {
    const group=new THREE.Group();group.position.set(x,0,z);this.scene.add(group);
    this.obstacles.push({x,z,radius:.74,fixed:true});
    const mat=new THREE.MeshStandardMaterial({color:'#565462',roughness:.94});
    const base=new THREE.Mesh(new THREE.BoxGeometry(1.05,.25,1.05),mat);base.position.y=.13;group.add(base);
    const body=new THREE.Mesh(new THREE.BoxGeometry(.78,1.9,.78),mat);body.position.y=1.2;body.castShadow=true;group.add(body);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(.98,.22,.98),new THREE.MeshStandardMaterial({color:'#756879'}));cap.position.y=2.25;group.add(cap);
  }

  addShadow(parent,w,d,opacity=.42) {
    const s=new THREE.Mesh(new THREE.CircleGeometry(.5,28),new THREE.MeshBasicMaterial({color:'#08060c',transparent:true,opacity,depthWrite:false}));
    s.rotation.x=-Math.PI/2;s.position.set(.06,.018,.08);s.scale.set(w,d,1);parent.add(s);return s;
  }

  addProp(type,x,z,width,height,hp) {
    const group=new THREE.Group();group.position.set(x,0,z);this.scene.add(group);this.addShadow(group,width*.8,width*.52,.48);
    const palette={crate:'#956342',barrel:'#70452f',vase:'#a66f70',stone:'#686b7a'};
    const mat=new THREE.MeshStandardMaterial({color:palette[type],roughness:type==='vase'?.48:.88,metalness:type==='vase'?.1:0});
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

  buildPlayer() {
    this.player=new THREE.Group();this.player.position.set(0,0,-3.4);this.scene.add(this.player);this.addShadow(this.player,.82,.36,.52);
    const placeholder=new THREE.Mesh(new THREE.SphereGeometry(.62,16,12),new THREE.MeshStandardMaterial({color:'#9b9ba8'}));placeholder.position.y=.95;placeholder.scale.set(.9,1,.65);this.player.add(placeholder);this.placeholder=placeholder;
  }

  loadCat() {
    new THREE.TextureLoader().load(import.meta.env.BASE_URL+'assets/cat-wizard.webp',(map)=>{
      map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
      this.catSprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthWrite:false,depthTest:false,toneMapped:false}));
      this.catSprite.scale.set(2.6,1.95,1);this.catSprite.position.y=1.04;this.catSprite.renderOrder=20;this.player.add(this.catSprite);this.placeholder.visible=false;
    },undefined,()=>this.status('Cat artwork could not load; placeholder remains visible.'));
  }

  buildWisps() {
    [[-10.2,-1.7,'#f07855'],[0,5.7,'#70b5ff'],[10.2,1.65,'#b282e8']].forEach(([x,z,color])=>{
      const group=new THREE.Group();group.position.set(x,0,z);this.scene.add(group);
      const aura=new THREE.Mesh(new THREE.SphereGeometry(.72,20,16),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.16,depthWrite:false}));aura.position.y=.92;group.add(aura);
      const body=new THREE.Mesh(new THREE.SphereGeometry(.43,22,18),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.85,roughness:.24}));body.position.y=.9;body.scale.set(.9,1.15,.78);body.castShadow=true;group.add(body);
      const core=new THREE.Mesh(new THREE.SphereGeometry(.22,16,12),new THREE.MeshBasicMaterial({color:'#fff2db'}));core.position.set(-.04,1,.14);group.add(core);
      const eyes=new THREE.MeshBasicMaterial({color:'#1a1021'});
      [-1,1].forEach(side=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.055,8,8),eyes);eye.position.set(side*.13,.89,.34);group.add(eye);});
      const light=new THREE.PointLight(color,2.2,3.4,2);light.position.y=1;group.add(light);this.addShadow(group,.62,.25,.32);
      this.wisps.push({group,body,aura,light,home:new THREE.Vector2(x,z),health:5,color,phase:rand(0,Math.PI*2),freeze:0,cooldown:0,velocity:new THREE.Vector2(),defeated:false,flash:0});
    });
  }

  bindInput() {
    window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();this.keys.add(k);});
    window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur',()=>{this.keys.clear();this.touchMove.set(0,0);this.movePointer=null;if(this.spellPointer!==null)this.endGesture();});
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
    const release=e=>{if(e.pointerId===this.movePointer){this.movePointer=null;this.moveOrigin=null;this.touchMove.set(0,0);}if(e.pointerId===this.spellPointer)this.endGesture();};
    this.canvas.addEventListener('pointerup',release);this.canvas.addEventListener('pointercancel',release);this.canvas.addEventListener('lostpointercapture',release);
  }

  resize() {
    const r=this.canvas.parentElement.getBoundingClientRect(),w=Math.max(320,r.width),h=Math.max(260,r.height),aspect=w/h;
    const vh=Math.max(D+1.2,(W+1.2)/aspect),vw=vh*aspect;this.viewWidth=vw;this.viewHeight=vh;
    Object.assign(this.camera,{left:-vw/2,right:vw/2,top:vh/2,bottom:-vh/2});this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);
  }

  screenToWorld(p) {
    const r=this.canvas.getBoundingClientRect(),x=clamp((p.x-r.left)/r.width,0,1),y=clamp((p.y-r.top)/r.height,0,1);
    return new THREE.Vector3((x-.5)*(this.viewWidth||W),.12,(y-.5)*(this.viewHeight||D));
  }

  drawStroke() {
    if(this.strokeLine){this.scene.remove(this.strokeLine);this.strokeLine.geometry.dispose();this.strokeLine.material.dispose();}
    if(this.stroke.length<2)return;
    const g=new THREE.BufferGeometry().setFromPoints(this.stroke.map(p=>this.screenToWorld(p)));
    this.strokeLine=new THREE.Line(g,new THREE.LineBasicMaterial({color:'#bcefff',transparent:true,opacity:.95}));
    this.strokeLine.frustumCulled=false;this.scene.add(this.strokeLine);
  }

  endGesture() {
    if(this.spellPointer===null)return;
    this.spellPointer=null;
    const result=recognizeGesture(this.stroke);
    const target=this.stroke.length?this.screenToWorld(this.stroke.at(-1)):this.player.position.clone();
    if(result)this.cast(result.spell,target,result.confidence);
    else{this.lastSpell='Unrecognized glyph';this.status('The glyph slipped. Draw one clear, continuous stroke.');this.updateHud();}
    if(this.strokeLine){this.scene.remove(this.strokeLine);this.strokeLine.geometry.dispose();this.strokeLine.material.dispose();this.strokeLine=null;}
    this.stroke=[];this.restore={from:this.timeScale,elapsed:0,duration:.25};
  }

  cast(spell,target,confidence) {
    this.castCount++;this.lastSpell=SPELLS[spell].name;this.status(this.lastSpell+' cast · '+Math.round(confidence*100)+'% match');this.updateHud();
    if(spell==='Fireball'){
      const orb=new THREE.Mesh(new THREE.SphereGeometry(.2,16,12),new THREE.MeshStandardMaterial({color:'#ff9a5d',emissive:'#ff542c',emissiveIntensity:2.2}));
      orb.add(new THREE.PointLight('#ff783e',4,3));this.scene.add(orb);
      this.effects.push({kind:'fire',object:orb,start:new THREE.Vector3(this.player.position.x,.9,this.player.position.z),target:new THREE.Vector3(target.x,.9,target.z),age:0,duration:.34});
    }else if(spell==='Thunderbolt'){
      const a=new THREE.Vector3(this.player.position.x,.3,this.player.position.z),b=new THREE.Vector3(target.x,.3,target.z),points=[];
      for(let i=0;i<=12;i++){const p=a.clone().lerp(b,i/12);if(i&&i!==12){p.x+=rand(-.35,.35);p.z+=rand(-.35,.35);}points.push(p);}
      this.lineEffect(points,'#ffe18a',.25);this.damageLine(a,b);this.burst(target,'#ffe18a',18,2.6);
    }else if(spell==='Frost')this.radial(spell,target,3.25,.25,'#91dcff',0,1.4);
    else if(spell==='Gravity'){
      const center=new THREE.Vector2(target.x,target.z);
      this.wisps.forEach(w=>{if(!w.defeated&&dist(w.group.position,{x:target.x,z:target.z})<=5.8){this.hitWisp(w,'Gravity',.8,center);this.pullWisp(w,center,1.6);}});
      const ring=this.ring(target,'#b995ff');this.effects.push({kind:'gravity',object:ring,center,age:0,duration:1.15});
    }else if(spell==='Chaos')this.radial(spell,target,3.8,2.4,'#ff9ccc',17,0);
  }

  ring(p,color) {const m=new THREE.Mesh(new THREE.TorusGeometry(.75,.065,8,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,depthWrite:false}));m.rotation.x=Math.PI/2;m.position.set(p.x,.22,p.z);this.scene.add(m);return m;}
  lineEffect(points,color,duration){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true}));this.scene.add(o);this.effects.push({kind:'line',object:o,age:0,duration});}
  radial(spell,target,radius,damage,color,impulse,freeze){
    const ring=this.ring(target,color);this.effects.push({kind:'ring',object:ring,age:0,duration:.48,scale:radius*1.25});this.burst(target,color,24,radius*1.5);
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
    for(let i=0;i<count;i++){const s=rand(.045,.11),o=new THREE.Mesh(new THREE.SphereGeometry(s,7,6),new THREE.MeshBasicMaterial({color,transparent:true}));o.position.set(p.x+rand(-.1,.1),Math.max(.12,(p.y||0)+rand(-.1,.1)),p.z+rand(-.1,.1));this.scene.add(o);this.debris.push({object:o,v:new THREE.Vector3(rand(-spread,spread),rand(.3,1.8),rand(-spread,spread)),age:0,duration:rand(.35,.95),gravity:1.3});}
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
    this.player.position.x=clamp(this.player.position.x+this.playerMove.x*dt,-12.1,12.1);
    this.player.position.z=clamp(this.player.position.z+this.playerMove.y*dt,-6.6,6.6);
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
    this.player.position.x=clamp(this.player.position.x,-12.1,12.1);
    this.player.position.z=clamp(this.player.position.z,-6.6,6.6);
    if(this.catSprite){this.catSprite.position.y=1+Math.sin(this.worldTime*7)*.035;if(Math.abs(this.playerMove.x)>.1)this.catSprite.scale.x=this.playerMove.x<0?-1.75:1.75;}
  }
  hurtPlayer(w){
    if(this.playerInvul>0||this.respawn>0)return;this.playerHealth=Math.max(0,this.playerHealth-1);this.playerInvul=1.15;
    const d=new THREE.Vector2(this.player.position.x-w.group.position.x,this.player.position.z-w.group.position.z);if(d.lengthSq()>.001)this.playerMove.addScaledVector(d.normalize(),4.4);
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
      w.group.position.y=.07+Math.sin(this.worldTime*3.1+w.phase)*.13;w.aura.scale.setScalar(1+Math.sin(this.worldTime*3+w.phase)*.08);w.light.intensity=2+Math.sin(this.worldTime*4+w.phase)*.4;
      if(w.cooldown>0)w.cooldown-=dt;if(d<.92&&w.cooldown<=0){this.hurtPlayer(w);w.cooldown=1;}
    });
  }
  updateEffects(dt){
    for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.age+=dt;const t=clamp(e.age/e.duration,0,1);
      if(e.kind==='fire'){e.object.position.copy(e.start).lerp(e.target,t);if(t>=1){this.radial('Fireball',e.target,2.1,1.25,'#ff875a',11,0);this.scene.remove(e.object);e.object.geometry.dispose();e.object.material.dispose();this.effects.splice(i,1);continue;}}
      if(e.kind==='ring'){e.object.scale.setScalar(.6+t*e.scale);e.object.material.opacity=1-t;}
      if(e.kind==='gravity'){e.object.scale.setScalar(.8+t*4.2);e.object.rotation.y+=dt*2.7;e.object.material.opacity=.95-t*.5;
        this.props.forEach(p=>{if(p.destroyed||p.frozen>0)return;const d=new THREE.Vector2(e.center.x-p.group.position.x,e.center.y-p.group.position.z),r=Math.max(.45,d.length());if(r<5.4&&r>.001)p.velocity.addScaledVector(d.normalize(),dt*4.8/r);});
        this.wisps.forEach(w=>{if(w.defeated)return;const d=new THREE.Vector2(e.center.x-w.group.position.x,e.center.y-w.group.position.z);if(d.length()<5.8&&d.length()>.001)w.velocity.addScaledVector(d.normalize(),dt*4);});
      }
      if(e.kind==='line')e.object.material.opacity=1-t;
      if(t>=1){this.scene.remove(e.object);e.object.geometry.dispose();e.object.material.dispose();this.effects.splice(i,1);}
    }
    for(let i=this.debris.length-1;i>=0;i--){const p=this.debris[i];p.age+=dt;p.v.y-=(p.gravity||5)*dt;p.object.position.addScaledVector(p.v,dt);p.object.rotation.x+=dt*3;p.object.rotation.z+=dt*4;p.object.scale.setScalar(Math.max(.01,1-p.age/p.duration));if(p.age>=p.duration){this.scene.remove(p.object);p.object.geometry.dispose();p.object.material.dispose();this.debris.splice(i,1);}}
  }

  frame(){
    const real=Math.min(this.clock.getDelta(),.05);
    if(this.restore){this.restore.elapsed+=real;const t=clamp(this.restore.elapsed/this.restore.duration,0,1);this.timeScale=this.restore.from+(1-this.restore.from)*t;if(t>=1){this.timeScale=1;this.restore=null;}}
    const dt=real*this.timeScale;this.worldTime+=dt;this.updatePlayer(dt,real);this.updateProps(dt);this.updateWisps(dt);this.updateEffects(dt);
    if(this.playerInvul>0&&this.respawn===0)this.player.visible=Math.floor((1.15-this.playerInvul)*18)%2===0;else if(!this.respawn)this.player.visible=true;
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.renderer.setAnimationLoop(null);this.resizeObserver.disconnect();this.renderer.dispose();}
}

function boot(){
  const game=new CatWizard(document.getElementById('game-canvas'));
  if(new URLSearchParams(location.search).get('debug')==='1'){
    window.__CAT_WIZARD_DEBUG__=()=>({
      player:{x:game.player.position.x,z:game.player.position.z,health:game.playerHealth,invulnerability:game.playerInvul,respawn:game.respawn,moveX:game.playerMove.x,moveZ:game.playerMove.y},
      wisps:game.wisps.map(w=>({x:w.group.position.x,z:w.group.position.z,health:w.health,freeze:w.freeze,cooldown:w.cooldown,defeated:w.defeated,distance:Math.hypot(game.player.position.x-w.group.position.x,game.player.position.z-w.group.position.z)})),
      world:{time:game.worldTime,timeScale:game.timeScale,casts:game.castCount,defeated:game.wispsDefeated}
    });
  }
  window.addEventListener('beforeunload',()=>game.dispose(),{once:true});
  document.getElementById('fullscreen-button').addEventListener('click',()=>{const el=document.getElementById('game-shell');if(!document.fullscreenElement)el.requestFullscreen?.();else document.exitFullscreen?.();});
  setTimeout(()=>document.getElementById('loading-screen').classList.add('loaded'),500);
}
boot();
