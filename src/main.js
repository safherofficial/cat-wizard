import * as THREE from 'three';
import { buildLighting as buildArtLighting, buildArena as buildArtArena, buildWizardCat, animateWorld } from './world-art.js';
import { segmentCircleIntersection, radialFalloff, closestPointOnSegment, vortexAcceleration, resolveCircleCollision } from './spell-physics.js';
import { recognizeGesture, SPELLS } from './gesture.js';
import { PerformanceMonitor, resolveQualityPreset } from './performance.js';
import { clampWorldPosition } from './world-map.js';
import { CAMERA_ORBIT_DEFAULTS, cameraRelativeMovement, rotateCameraOrbit } from './camera-controls.js';
import './style.css';

const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
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
    this.camera = new THREE.PerspectiveCamera(48,1,.1,220);
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
    this.effects = [];
    this.debris = [];
    this.stroke = [];
    this.strokeLine = null;
    this.spellPointer = null;
    this.movePointer = null;
    this.moveOrigin = null;
    this.cameraPointer = null;
    this.cameraLastPointer = null;
    this.cameraOrbit = { ...CAMERA_ORBIT_DEFAULTS };
    this.touchMove = new THREE.Vector2();
    this.playerMove = new THREE.Vector2();
    this.castCount = 0;
    this.lastSpell = 'No spell cast yet';
    this.worldTime = 0;
    this.timeScale = 1;
    this.restore = null;
    this.buildLighting();
    this.buildArena();
    this.buildPlayer();
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
    const propState = {
      group,
      body,
      mat,
      type,
      hp,
      radius: Math.max(.38, width * .58),
      mass: Math.max(.55, width * height * .8),
      baseColor: mat.color.clone(),
      baseEmissive: mat.emissive.clone(),
      baseEmissiveIntensity: mat.emissiveIntensity,
      velocity: new THREE.Vector2(),
      spin: rand(-.2, .2),
      frozen: 0,
      destroyed: false
    };
    this.props.push(propState);this.obstacles.push(propState);
  }

  buildPlayer() { this.player=buildWizardCat(this); }

  bindInput() {
    window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();this.keys.add(k);});
    window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
    const cancelActiveInput=()=>{
      this.keys.clear();
      this.movePointer=null;
      this.moveOrigin=null;
      this.cameraPointer=null;
      this.cameraLastPointer=null;
      this.touchMove.set(0,0);
      if(this.spellPointer!==null)this.cancelGesture();
    };
    window.addEventListener('blur',cancelActiveInput);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelActiveInput();});
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.canvas.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button===2){
        if(this.cameraPointer===null){
          this.cameraPointer=e.pointerId;
          this.cameraLastPointer={x:e.clientX,y:e.clientY};
          this.canvas.setPointerCapture(e.pointerId);
          this.status('Camera orbit · move the mouse to look around');
          e.preventDefault();
        }
        return;
      }
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
      if(e.pointerId===this.cameraPointer&&this.cameraLastPointer){
        const deltaX=e.clientX-this.cameraLastPointer.x;
        const deltaY=e.clientY-this.cameraLastPointer.y;
        this.cameraOrbit=rotateCameraOrbit(this.cameraOrbit,deltaX,deltaY);
        this.cameraLastPointer={x:e.clientX,y:e.clientY};
        e.preventDefault();
        return;
      }
      if(e.pointerId===this.movePointer&&this.moveOrigin){
        const r=this.canvas.getBoundingClientRect(),radius=Math.max(50,Math.min(r.width,r.height)*.13);
        this.touchMove.set(clamp((e.clientX-this.moveOrigin.x)/radius,-1,1),clamp((e.clientY-this.moveOrigin.y)/radius,-1,1));return;
      }
      if(e.pointerId===this.spellPointer){const p=this.stroke.at(-1);if(!p||Math.hypot(e.clientX-p.x,e.clientY-p.y)>3){this.stroke.push({x:e.clientX,y:e.clientY});this.drawStroke();}}
    });
    const release=(e,cancelled=false)=>{
      if(e.pointerId===this.cameraPointer){
        this.cameraPointer=null;
        this.cameraLastPointer=null;
        this.status('Camera orbit · WASD to explore');
      }
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
    const target=clampWorldPosition(hit.x,hit.z,.35);
    hit.x=target.x;hit.z=target.z;hit.y=.12;return hit;
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

  cast(spell, target, confidence) {
    this.castCount++;
    this.lastSpell = SPELLS[spell].name;
    this.status(this.lastSpell + ' cast · ' + Math.round(confidence * 100) + '% match');
    this.updateHud();

    if (spell === 'Fireball') {
      const orb = new THREE.Group();
      const shell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(.28, 1),
        new THREE.MeshStandardMaterial({
          color: '#ff6a3d',
          emissive: '#ff542c',
          emissiveIntensity: 1.9,
          roughness: .28,
          flatShading: true
        })
      );
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(.145, 12, 10),
        new THREE.MeshBasicMaterial({ color: '#fff1b4', toneMapped: false })
      );
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTexture,
        color: '#ff8a42',
        transparent: true,
        opacity: .95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      }));
      glow.scale.set(1.5, 1.5, 1);
      orb.add(shell, core, glow);
      orb.add(new THREE.PointLight('#ff783e', 6, 4));

      const start = new THREE.Vector3(this.player.position.x, .95, this.player.position.z);
      const destination = new THREE.Vector3(target.x, .95, target.z);
      const travelDistance = Math.hypot(destination.x - start.x, destination.z - start.z);
      const duration = clamp(travelDistance / 18, .14, 1.15);
      orb.position.copy(start);
      this.scene.add(orb);
      this.effects.push({
        kind: 'fire',
        object: orb,
        start,
        target: destination,
        age: 0,
        duration,
        lastTrail: -1
      });
    } else if (spell === 'Thunderbolt') {
      const start = new THREE.Vector3(this.player.position.x, .8, this.player.position.z);
      const end = new THREE.Vector3(target.x, 1.1, target.z);
      this.addLightning(start, end);
      this.damageLine(start, end);
      this.burst(new THREE.Vector3(target.x, .65, target.z), '#ffe18a', 28, 2.4);
    } else if (spell === 'Frost') {
      this.castFrost(target);
    } else if (spell === 'Gravity') {
      const center = { x: target.x, z: target.z };
      const ring = this.ring(target, '#b995ff');
      const echo = this.ring(target, '#e4d7ff');
      echo.position.y = .24;
      this.effects.push({ kind: 'ring', object: echo, age: 0, duration: 1.15, scale: 4.7 });
      this.effects.push({
        kind: 'gravity',
        object: ring,
        center,
        age: 0,
        duration: 1.35,
        radius: 5.8,
        pull: 9.5,
        swirl: 3.8
      });
      this.burst(new THREE.Vector3(target.x, .3, target.z), '#c4a4ff', 16, 1.8);
    } else if (spell === 'Chaos') {
      this.radial(spell, target, 3.8, 2.4, '#ff9ccc', 17, 0);
    }
  }

  castFrost(target){
    this.radial('Frost', target, 3.25, 0, '#91dcff', 0, 2.2);
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
  radial(spell, target, radius, damage, color, impulse, freeze = 0) {
    const ring = this.ring(target, color);
    this.effects.push({ kind: 'ring', object: ring, age: 0, duration: .58, scale: radius * 1.28 });
    this.burst(
      new THREE.Vector3(target.x, .35, target.z),
      color,
      spell === 'Chaos' ? 46 : 34,
      radius * 1.5
    );

    this.props.forEach(prop => {
      if (prop.destroyed) return;
      const distance = dist(prop.group.position, { x: target.x, z: target.z });
      const falloff = radialFalloff(distance, radius, .06);
      if (!falloff) return;
      if (freeze > 0) this.freezeProp(prop, freeze);
      else this.hitProp(prop, spell, target, damage, impulse, falloff);
    });
  }

  damageLine(start, end) {
    const axis = new THREE.Vector2(end.x - start.x, end.z - start.z);
    if (axis.lengthSq() < 1e-5) axis.set(0, -1);
    axis.normalize();

    this.props.forEach(prop => {
      if (prop.destroyed) return;
      const nearest = closestPointOnSegment(prop.group.position, start, end);
      const falloff = radialFalloff(nearest.distance, prop.radius + .9, .05);
      if (!falloff) return;

      const offset = new THREE.Vector2(
        prop.group.position.x - nearest.x,
        prop.group.position.z - nearest.z
      );
      const direction = axis.clone();
      if (offset.lengthSq() > 1e-5) direction.addScaledVector(offset.normalize(), .42);
      direction.normalize();
      this.hitProp(prop, 'Thunderbolt', start, 1.25, 8, falloff, direction);
    });
  }

  hitProp(prop, spell, center, damage, impulse, falloff = 1, direction = null) {
    if (prop.destroyed) return;
    this.unfreezeProp(prop);

    const forceDirection = direction
      ? direction.clone()
      : new THREE.Vector2(
        prop.group.position.x - center.x,
        prop.group.position.z - center.z
      );
    if (forceDirection.lengthSq() < .001) forceDirection.set(rand(-1, 1), rand(-1, 1));
    forceDirection.normalize();
    if (spell === 'Gravity') forceDirection.multiplyScalar(-1);

    const mass = Math.max(.55, prop.mass);
    prop.velocity.addScaledVector(forceDirection, impulse * .18 * falloff / mass);
    prop.velocity.clampLength(0, 8.5);
    prop.spin += rand(-1, 1) * Math.max(.3, impulse * .045) * falloff / mass;
    prop.hp -= damage * falloff;
    if (prop.hp <= 0) this.shatter(prop, forceDirection);
  }

  freezeProp(prop, duration) {
    if (prop.destroyed) return;
    prop.frozen = Math.max(prop.frozen, duration);
    prop.velocity.set(0, 0);
    prop.spin = 0;
    prop.mat.color.set('#83d8ff');
    prop.mat.emissive.set('#245d82');
    prop.mat.emissiveIntensity = .45;
  }

  unfreezeProp(prop) {
    if (prop.frozen <= 0) return;
    prop.frozen = 0;
    prop.mat.color.copy(prop.baseColor);
    prop.mat.emissive.copy(prop.baseEmissive);
    prop.mat.emissiveIntensity = prop.baseEmissiveIntensity;
  }

  shatter(prop, direction) {
    if (prop.destroyed) return;
    prop.destroyed = true;
    const position = prop.group.position.clone();
    const color = prop.mat.color.clone();
    this.scene.remove(prop.group);
    this.disposeEffectObject(prop.group);

    for (let i = 0; i < 8; i++) {
      const size = rand(.08, .2);
      const fragment = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshStandardMaterial({ color })
      );
      fragment.position.set(
        position.x + rand(-.28, .28),
        rand(.25, .9),
        position.z + rand(-.28, .28)
      );
      fragment.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
      this.scene.add(fragment);
      this.debris.push({
        object: fragment,
        v: new THREE.Vector3(
          direction.x * rand(1.5, 3.8) + rand(-1, 1),
          rand(1, 3),
          direction.y * rand(1.5, 3.8) + rand(-1, 1)
        ),
        age: 0,
        duration: 1.5
      });
    }
    this.burst(new THREE.Vector3(position.x, .4, position.z), '#d0a47b', 8, 1.2);
  }

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
  updateHud() {
    const last = document.getElementById('last-spell');
    const count = document.getElementById('cast-count');
    if (last) last.textContent = this.lastSpell;
    if (count) count.textContent = String(this.castCount).padStart(2, '0');
  }

  updatePlayer(dt) {
    const movement = new THREE.Vector2();
    if (this.keys.has('a') || this.keys.has('arrowleft')) movement.x--;
    if (this.keys.has('d') || this.keys.has('arrowright')) movement.x++;
    if (this.keys.has('w') || this.keys.has('arrowup')) movement.y--;
    if (this.keys.has('s') || this.keys.has('arrowdown')) movement.y++;
    movement.add(this.touchMove);
    if (movement.lengthSq() > 1) movement.normalize();

    // WASD and the touch stick are camera-local: rotating the orbit camera
    // also rotates the player's movement basis on the horizontal plane.
    const worldMovement = cameraRelativeMovement(
      movement.x,
      movement.y,
      this.cameraOrbit.yaw
    );
    movement.set(worldMovement.x, worldMovement.z);
    this.playerMove.lerp(movement.multiplyScalar(5.2), 1 - Math.exp(-dt * 12));
    const nextPosition = clampWorldPosition(
      this.player.position.x + this.playerMove.x * dt,
      this.player.position.z + this.playerMove.y * dt,
      .65
    );
    this.player.position.x = nextPosition.x;
    this.player.position.z = nextPosition.z;

    for (const obstacle of this.obstacles) {
      if (obstacle.destroyed) continue;
      const obstacleX = obstacle.fixed ? obstacle.x : obstacle.group.position.x;
      const obstacleZ = obstacle.fixed ? obstacle.z : obstacle.group.position.z;
      const dx = this.player.position.x - obstacleX;
      const dz = this.player.position.z - obstacleZ;
      const minimum = .5 + obstacle.radius;
      const distanceSquared = dx * dx + dz * dz;
      if (distanceSquared < minimum * minimum) {
        const distance = Math.sqrt(Math.max(distanceSquared, .0001));
        const nx = distanceSquared > .0001 ? dx / distance : 1;
        const nz = distanceSquared > .0001 ? dz / distance : 0;
        this.player.position.x = obstacleX + nx * minimum;
        this.player.position.z = obstacleZ + nz * minimum;
      }
    }

    const safePosition = clampWorldPosition(this.player.position.x, this.player.position.z, .65);
    this.player.position.x = safePosition.x;
    this.player.position.z = safePosition.z;
    if (this.catRoot) {
      const moving = this.playerMove.length() > .24;
      if (moving) this.catRoot.rotation.y = Math.atan2(this.playerMove.x, this.playerMove.y);
      this.catRoot.position.y = .035 + Math.sin(this.worldTime * (moving ? 12 : 4.2)) * (moving ? .065 : .025);
      if (this.tail) {
        this.tail.rotation.y = Math.sin(this.worldTime * 2.6) * .28;
        this.tail.rotation.x = Math.cos(this.worldTime * 2.1) * .12;
      }
    }
  }

  updateProps(dt) {
    for (const prop of this.props) {
      if (prop.destroyed) continue;
      if (prop.frozen > 0) {
        prop.frozen = Math.max(0, prop.frozen - dt);
        if (prop.frozen > 0) continue;
        this.unfreezeProp(prop);
      }

      const position = prop.group.position;
      position.x += prop.velocity.x * dt;
      position.z += prop.velocity.y * dt;
      prop.group.rotation.y += prop.spin * dt;
      prop.velocity.multiplyScalar(Math.exp(-dt * 1.15));
      prop.spin *= Math.exp(-dt * 1.45);

      const minX = -12.2 + prop.radius;
      const maxX = 12.2 - prop.radius;
      const minZ = -6.7 + prop.radius;
      const maxZ = 6.7 - prop.radius;
      if (position.x < minX || position.x > maxX) {
        position.x = clamp(position.x, minX, maxX);
        prop.velocity.x *= -.42;
      }
      if (position.z < minZ || position.z > maxZ) {
        position.z = clamp(position.z, minZ, maxZ);
        prop.velocity.y *= -.42;
      }
    }

    const bodies = this.props.filter(prop => !prop.destroyed).map(prop => ({
      position: prop.group.position,
      velocity: prop.velocity,
      radius: prop.radius,
      mass: prop.mass,
      frozen: prop.frozen > 0
    }));

    // Pillars and frozen props act as static bodies in the collision solver.
    for (const body of bodies) {
      for (const obstacle of this.obstacles) {
        if (!obstacle.fixed || obstacle.destroyed) continue;
        resolveCircleCollision(body, {
          position: { x: obstacle.x, z: obstacle.z },
          velocity: { x: 0, y: 0 },
          radius: obstacle.radius,
          mass: 1,
          frozen: true
        });
      }
    }

    // Pairwise collisions transfer momentum according to each prop's mass.
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        resolveCircleCollision(bodies[i], bodies[j], .3, .16);
      }
    }
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];

      if (effect.kind === 'fire') {
        effect.age += dt;
        const t = clamp(effect.age / effect.duration, 0, 1);
        const previous = effect.object.position.clone();
        const next = effect.start.clone().lerp(effect.target, t);
        next.y += Math.sin(Math.PI * t) * 1.1;

        // Swept collision prevents the projectile tunnelling through small props.
        let firstImpactT = Infinity;
        for (const prop of this.props) {
          if (prop.destroyed) continue;
          const hitT = segmentCircleIntersection(
            previous,
            next,
            prop.group.position,
            prop.radius + .34
          );
          if (hitT !== null && hitT < firstImpactT) firstImpactT = hitT;
        }

        if (firstImpactT < Infinity) {
          const impact = previous.clone().lerp(next, firstImpactT);
          this.detonateFireball(effect, impact);
          this.effects.splice(i, 1);
          continue;
        }

        effect.object.position.copy(next);
        effect.object.rotation.y += dt * 5;
        effect.object.rotation.z += dt * 2.4;
        const trailStep = Math.floor(effect.age * 18);
        if (trailStep !== effect.lastTrail) {
          effect.lastTrail = trailStep;
          this.burst(effect.object.position, '#ffad5c', 2, .28);
        }

        if (t >= 1) {
          this.detonateFireball(effect, effect.target);
          this.effects.splice(i, 1);
        }
        continue;
      }

      effect.age += dt;
      const t = clamp(effect.age / effect.duration, 0, 1);
      if (effect.kind === 'ring') {
        effect.object.scale.setScalar(.6 + t * effect.scale);
        effect.object.material.opacity = 1 - t;
      }
      if (effect.kind === 'gravity') {
        effect.object.scale.setScalar(.8 + t * 4.2);
        effect.object.rotation.y += dt * 2.7;
        effect.object.material.opacity = .95 - t * .5;
        this.props.forEach(prop => {
          if (prop.destroyed || prop.frozen > 0) return;
          const acceleration = vortexAcceleration(
            prop.group.position,
            effect.center,
            effect.radius,
            effect.pull,
            effect.swirl
          );
          prop.velocity.x += acceleration.x * dt;
          prop.velocity.y += acceleration.z * dt;
          prop.velocity.clampLength(0, 8.5);
        });
      }
      if (effect.kind === 'line') effect.object.material.opacity = 1 - t;
      if (t >= 1) {
        this.scene.remove(effect.object);
        this.disposeEffectObject(effect.object);
        this.effects.splice(i, 1);
      }
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const fragment = this.debris[i];
      fragment.age += dt;
      fragment.v.y -= (fragment.gravity || 5) * dt;
      fragment.object.position.addScaledVector(fragment.v, dt);
      fragment.object.rotation.x += dt * 3;
      fragment.object.rotation.z += dt * 4;
      const life = clamp(1 - fragment.age / fragment.duration, 0, 1);
      fragment.object.scale.setScalar(Math.max(.01, life));
      if (fragment.object.material?.transparent) fragment.object.material.opacity = life;
      if (fragment.age >= fragment.duration) {
        this.scene.remove(fragment.object);
        this.disposeEffectObject(fragment.object);
        this.debris.splice(i, 1);
      }
    }
  }

  detonateFireball(effect, impact) {
    this.radial('Fireball', impact, 2.1, 1.35, '#ff875a', 11, 0);
    this.burst(
      new THREE.Vector3(impact.x, Math.max(.8, impact.y), impact.z),
      '#fff0b3',
      18,
      1.35
    );
    this.scene.remove(effect.object);
    this.disposeEffectObject(effect.object);
  }

  updateCamera(realDt,worldDt){animateWorld(this,worldDt,realDt);}

  frame(){
    const frameStartedAt = this.performanceMonitor ? performance.now() : 0;
    // Preserve elapsed time on low-refresh devices while keeping movement,
    // prop collisions and spell impacts stable.
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
      this.updatePlayer(dt);
      this.updateProps(dt);
      this.updateEffects(dt);
    }
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
      window.__CAT_WIZARD_DEBUG__ = () => ({
        player: {
          x: game.player.position.x,
          z: game.player.position.z,
          moveX: game.playerMove.x,
          moveZ: game.playerMove.y
        },
        props: game.props.map(prop => ({
          type: prop.type,
          x: prop.group.position.x,
          z: prop.group.position.z,
          velocityX: prop.velocity.x,
          velocityZ: prop.velocity.y,
          hp: prop.hp,
          frozen: prop.frozen,
          destroyed: prop.destroyed
        })),
        world: {
          time: game.worldTime,
          timeScale: game.timeScale,
          casts: game.castCount,
          activeEffects: game.effects.length,
          debris: game.debris.length
        }
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
