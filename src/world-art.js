import * as THREE from 'three';
import { buildMeadowArena, animateMeadow } from './meadow-art.js';

export function buildLighting(g){
  g.scene.background=new THREE.Color('#83d1ed');g.scene.fog=new THREE.Fog('#b9e2e8',42,92);
  g.scene.add(new THREE.HemisphereLight('#e5fbff','#6f8d62',1.25));
  const sun=new THREE.DirectionalLight('#fff0cf',2.05);sun.position.set(-12,24,10);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-19,right:19,top:17,bottom:-17,near:.5,far:60});
  sun.shadow.bias=-.00018;sun.shadow.normalBias=.025;g.scene.add(sun);
  const fill=new THREE.DirectionalLight('#b7e9ff',.38);fill.position.set(13,10,-12);g.scene.add(fill);
  [[-9,-4,'#ffb36b'],[0,-5,'#79e5df'],[9,3,'#9b8cff'],[-8,5,'#f08ca4'],[8,-5,'#9ce5a2']].forEach(([x,z,c])=>{
    const l=new THREE.PointLight(c,2.8,8,2);l.position.set(x,3.1,z);g.scene.add(l);
  });
}
function makeFloorTexture(renderer){
  const c=document.createElement('canvas');c.width=1040;c.height=600;const g=c.getContext('2d');g.fillStyle='#e9d8b8';g.fillRect(0,0,c.width,c.height);
  const tile=65;
  for(let y=0;y<c.height;y+=tile)for(let x=0;x<c.width;x+=tile){
    const grass=((x/tile+y/tile)%2===0),v=THREE.MathUtils.randFloat(-7,7),base=grass?[133,185,116]:[232,214,178];
    g.fillStyle='rgb('+base.map(n=>THREE.MathUtils.clamp(n+v,0,255)).join(',')+')';g.fillRect(x+1,y+1,tile-2,tile-2);
    g.fillStyle=grass?'rgba(255,255,255,.15)':'rgba(255,255,255,.29)';g.fillRect(x+3,y+3,tile-6,3);
    g.fillStyle='rgba(68,77,57,.09)';g.fillRect(x+3,y+tile-5,tile-6,2);
    for(let i=0;i<5;i++){g.fillStyle=grass?'rgba(45,105,68,.11)':'rgba(151,108,70,.10)';g.fillRect(x+THREE.MathUtils.randFloat(7,58),y+THREE.MathUtils.randFloat(7,58),2,2);}
  }
  const cx=520,cy=300,glow=g.createRadialGradient(cx,cy,70,cx,cy,220);glow.addColorStop(0,'rgba(252,239,205,.36)');glow.addColorStop(1,'rgba(252,239,205,0)');
  g.fillStyle=glow;g.fillRect(cx-220,cy-220,440,440);
  [[142,'rgba(125,94,64,.55)',5],[128,'rgba(255,250,222,.78)',2],[100,'rgba(103,173,159,.6)',5],[88,'rgba(255,250,222,.6)',2],[43,'rgba(203,137,104,.68)',3]].forEach(([r,col,w])=>{g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.strokeStyle=col;g.lineWidth=w;g.stroke();});
  g.strokeStyle='rgba(255,250,224,.55)';g.lineWidth=3;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;g.beginPath();g.moveTo(cx+Math.cos(a)*55,cy+Math.sin(a)*55);g.lineTo(cx+Math.cos(a)*126,cy+Math.sin(a)*126);g.stroke();}
  g.fillStyle='rgba(151,109,66,.68)';g.font='bold 28px Georgia';g.textAlign='center';g.textBaseline='middle';
  for(let i=0;i<8;i++){const a=i*Math.PI/4;g.fillText('✦',cx+Math.cos(a)*162,cy+Math.sin(a)*162);}
  g.strokeStyle='rgba(94,145,116,.58)';g.lineWidth=10;g.strokeRect(10,10,1020,580);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
}
function palm(scene,x,z,index){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=index*.62;scene.add(g);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.13,.25,2.9,7),new THREE.MeshStandardMaterial({color:'#a9784c',roughness:.92,flatShading:true}));
  trunk.position.y=1.42;trunk.rotation.z=index%2===0?.08:-.08;trunk.castShadow=true;g.add(trunk);
  const crown=new THREE.Group();crown.position.y=2.78;g.add(crown);
  const mats=['#4f9b65','#65ad6a','#8dbd70'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.86,flatShading:true,side:THREE.DoubleSide}));
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7,d=new THREE.Vector3(Math.cos(a),-.28,Math.sin(a)).normalize();const leaf=new THREE.Mesh(new THREE.ConeGeometry(.18,2.05,5),mats[i%3]);leaf.position.copy(d).multiplyScalar(.92);leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d);leaf.castShadow=true;crown.add(leaf);}
  const fruit=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,0),new THREE.MeshStandardMaterial({color:'#e9a65f',flatShading:true}));fruit.position.y=2.7;g.add(fruit);
}
function planter(scene,x,z,index){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  const bed=new THREE.Mesh(new THREE.BoxGeometry(2.35,.42,1.05),new THREE.MeshStandardMaterial({color:index%2?'#d7c49f':'#c6d6c1',roughness:.9,flatShading:true}));bed.position.y=.18;bed.castShadow=true;g.add(bed);
  const soil=new THREE.Mesh(new THREE.BoxGeometry(2.08,.12,.8),new THREE.MeshStandardMaterial({color:'#795c48'}));soil.position.y=.43;g.add(soil);
  for(let i=0;i<7;i++){const x0=THREE.MathUtils.randFloat(-.85,.85),z0=THREE.MathUtils.randFloat(-.27,.27),h=THREE.MathUtils.randFloat(.3,.58);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.045,h,5),new THREE.MeshStandardMaterial({color:'#47895b'}));stem.position.set(x0,.47+h/2,z0);g.add(stem);
    const flower=new THREE.Mesh(new THREE.IcosahedronGeometry(.15,1),new THREE.MeshStandardMaterial({color:['#ee9d9c','#f5d17e','#8fcfc1','#af9be0'][i%4],roughness:.48,flatShading:true}));flower.position.set(x0,.55+h,z0);g.add(flower);}
}
function cloud(scene,x,y,z,s=1){
  const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);scene.add(g);const m=new THREE.MeshStandardMaterial({color:'#f6fbf7',roughness:1,flatShading:true});
  [[0,0,0,.8],[.72,-.06,.08,.56],[-.65,-.08,.02,.58],[.18,.28,-.04,.55]].forEach(([x0,y0,z0,r])=>{const p=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),m);p.position.set(x0,y0,z0);p.scale.y=.55;g.add(p);});
}
function entrance(scene){
  const g=new THREE.Group();g.position.set(-.2,0,-7.02);scene.add(g);
  const stone=new THREE.MeshStandardMaterial({color:'#d8c49f',roughness:.9,flatShading:true}),trim=new THREE.MeshStandardMaterial({color:'#bb8b5a',roughness:.65,metalness:.12});
  [-2.15,2.15].forEach(x=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(.36,.44,3.3,8),stone);c.position.set(x,1.55,0);c.castShadow=true;g.add(c);const b=new THREE.Mesh(new THREE.CylinderGeometry(.6,.62,.3,8),trim);b.position.set(x,.15,0);g.add(b);const cap=new THREE.Mesh(new THREE.CylinderGeometry(.56,.46,.28,8),trim);cap.position.set(x,3.22,0);g.add(cap);});
  const beam=new THREE.Mesh(new THREE.BoxGeometry(5.3,.42,.55),stone);beam.position.y=3.48;beam.castShadow=true;g.add(beam);
  const plaque=new THREE.Mesh(new THREE.BoxGeometry(2.2,.7,.13),new THREE.MeshStandardMaterial({color:'#73b9ad',roughness:.4,metalness:.18}));plaque.position.set(0,3.45,.36);g.add(plaque);
  const star=new THREE.Mesh(new THREE.OctahedronGeometry(.26),new THREE.MeshStandardMaterial({color:'#ffdf9a',emissive:'#d58b39',emissiveIntensity:.8}));star.position.set(0,3.49,.47);g.add(star);
}
export function buildArena(game){ buildMeadowArena(game); }

export function buildWizardCat(g){
  const player=new THREE.Group();player.position.set(0,0,5.2);g.scene.add(player);g.addShadow(player,.9,.42,.25);
  const cat=new THREE.Group();player.add(cat);g.catRoot=cat;
  const fur=new THREE.MeshStandardMaterial({color:'#858f98',roughness:.82,flatShading:true}),furLight=new THREE.MeshStandardMaterial({color:'#b9c3c4',roughness:.8,flatShading:true});
  const pink=new THREE.MeshStandardMaterial({color:'#ef91b2',roughness:.4,flatShading:true}),robe=new THREE.MeshStandardMaterial({color:'#385c78',roughness:.82,flatShading:true});
  const robeLight=new THREE.MeshStandardMaterial({color:'#648ba0',roughness:.8,flatShading:true}),gold=new THREE.MeshStandardMaterial({color:'#e5b969',roughness:.4,metalness:.35});
  const dark=new THREE.MeshStandardMaterial({color:'#25313a',roughness:.4}),white=new THREE.MeshStandardMaterial({color:'#fff4db',roughness:.35});
  const eye=new THREE.MeshStandardMaterial({color:'#293e42',roughness:.18}),innerEar=new THREE.MeshStandardMaterial({color:'#d88e98',roughness:.65,flatShading:true});
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.4,.66,.92,9,1),robe);torso.position.y=.58;torso.castShadow=true;cat.add(torso);
  const panel=new THREE.Mesh(new THREE.ConeGeometry(.54,.62,8,1,true),robeLight);panel.position.set(0,.62,.05);panel.scale.set(.72,1,.26);cat.add(panel);
  const hem=new THREE.Mesh(new THREE.TorusGeometry(.61,.055,7,24),gold);hem.rotation.x=Math.PI/2;hem.position.y=.16;cat.add(hem);
  for(const s of [-1,1]){
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,.42,6),fur);leg.position.set(s*.24,.18,.04);cat.add(leg);
    const boot=new THREE.Mesh(new THREE.SphereGeometry(.17,8,6),dark);boot.scale.set(1,.58,1.25);boot.position.set(s*.24,.075,.16);cat.add(boot);
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.115,.48,4,7),robe);arm.position.set(s*.48,.96,.04);arm.rotation.z=s*-.42;cat.add(arm);
    const paw=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6),furLight);paw.position.set(s*.61,.72,.28);cat.add(paw);
  }
  const head=new THREE.Mesh(new THREE.SphereGeometry(.53,12,10),fur);head.scale.set(1.02,.86,.88);head.position.set(0,1.47,.05);head.castShadow=true;cat.add(head);
  for(const s of [-1,1]){
    const ear=new THREE.Mesh(new THREE.ConeGeometry(.23,.55,4),fur);ear.position.set(s*.34,1.91,.02);ear.rotation.z=s*-.16;cat.add(ear);
    const inner=new THREE.Mesh(new THREE.ConeGeometry(.105,.32,4),innerEar);inner.position.set(s*.34,1.91,.13);inner.rotation.z=s*-.16;cat.add(inner);
    const cheek=new THREE.Mesh(new THREE.SphereGeometry(.2,8,6),furLight);cheek.position.set(s*.18,1.34,.43);cheek.scale.set(1,.76,.58);cat.add(cheek);
    const ew=new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),white);ew.position.set(s*.2,1.57,.48);ew.scale.set(1,1.12,.5);cat.add(ew);
    const pupil=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),eye);pupil.position.set(s*.2,1.565,.535);cat.add(pupil);
    const whisker=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(s*.22,1.34,.57),new THREE.Vector3(s*.52,1.39,.56),new THREE.Vector3(s*.67,1.37,.52)]),new THREE.LineBasicMaterial({color:'#e6e1d4'}));cat.add(whisker);
    const wing=new THREE.Mesh(new THREE.SphereGeometry(.16,7,6),pink);wing.position.set(s*.14,1.08,.59);wing.scale.set(1,.68,.38);cat.add(wing);
  }
  const muzzle=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),white);muzzle.scale.set(1.3,.72,.72);muzzle.position.set(0,1.33,.54);cat.add(muzzle);
  const nose=new THREE.Mesh(new THREE.SphereGeometry(.065,7,6),innerEar);nose.position.set(0,1.42,.67);cat.add(nose);
  const knot=new THREE.Mesh(new THREE.SphereGeometry(.085,8,6),gold);knot.position.set(0,1.08,.65);cat.add(knot);
  const brim=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,.1,10),robe);brim.position.y=1.92;cat.add(brim);
  const hat=new THREE.Mesh(new THREE.ConeGeometry(.43,.88,8),new THREE.MeshStandardMaterial({color:'#594b8d',roughness:.72,flatShading:true}));hat.position.set(0,2.37,0);hat.rotation.z=-.1;hat.castShadow=true;cat.add(hat);
  const band=new THREE.Mesh(new THREE.TorusGeometry(.44,.045,7,24),gold);band.rotation.x=Math.PI/2;band.position.y=2.02;cat.add(band);
  const star=new THREE.Mesh(new THREE.OctahedronGeometry(.13),new THREE.MeshStandardMaterial({color:'#ffe5a0',emissive:'#d99d47',emissiveIntensity:.9}));star.position.set(.27,2.56,.12);cat.add(star);
  const pipe=new THREE.Group();pipe.position.set(.58,.78,.42);pipe.rotation.x=Math.PI/2.8;pipe.rotation.z=-.22;cat.add(pipe);
  const pipeMat=new THREE.MeshStandardMaterial({color:'#70452e',roughness:.5}),stem=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.47,7),pipeMat);stem.rotation.x=Math.PI/2;stem.position.z=.15;pipe.add(stem);
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,.22,7),pipeMat);bowl.position.set(0,.01,.42);pipe.add(bowl);
  const tailPivot=new THREE.Group();tailPivot.position.set(0,.48,-.46);cat.add(tailPivot);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(-.25,.18,-.22),new THREE.Vector3(-.37,.48,-.36),new THREE.Vector3(-.12,.7,-.42)]);
  const tail=new THREE.Mesh(new THREE.TubeGeometry(curve,18,.095,7,false),fur);tail.castShadow=true;tailPivot.add(tail);g.tail=tailPivot;
  return player;
}
export function buildWisps(g){
  return [[-9.5,-1.6,'#ef8e68'],[0,-5.6,'#64c8dc'],[9.4,.8,'#aa8ee5']].map(([x,z,color])=>{
    const group=new THREE.Group();group.position.set(x,0,z);g.scene.add(group);
    const aura=new THREE.Mesh(new THREE.SphereGeometry(.82,14,10),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.16,depthWrite:false}));aura.position.y=1.15;group.add(aura);
    const mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.8,roughness:.26,flatShading:true});
    const body=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,1),mat);body.position.y=1.05;body.scale.set(.88,1.15,.84);body.castShadow=true;group.add(body);
    const tail=new THREE.Mesh(new THREE.ConeGeometry(.3,.8,7),mat);tail.position.set(0,.45,-.02);tail.rotation.x=Math.PI;group.add(tail);
    const core=new THREE.Mesh(new THREE.OctahedronGeometry(.22,1),new THREE.MeshBasicMaterial({color:'#fff4d4'}));core.position.set(0,1.1,.37);group.add(core);
    const eyes=new THREE.MeshBasicMaterial({color:'#283b48'});
    [-1,1].forEach(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),eyes);e.position.set(s*.14,1.13,.39);group.add(e);const horn=new THREE.Mesh(new THREE.ConeGeometry(.11,.24,5),new THREE.MeshStandardMaterial({color:'#e4d8c8',flatShading:true}));horn.position.set(s*.28,1.48,.02);horn.rotation.z=s*-.3;group.add(horn);});
    const halo=new THREE.Mesh(new THREE.TorusGeometry(.62,.025,7,40),new THREE.MeshBasicMaterial({color:'#fff4d5',transparent:true,opacity:.75}));halo.position.y=1.6;halo.rotation.x=Math.PI/2.7;group.add(halo);
    const light=new THREE.PointLight(color,3.4,4.5,2);light.position.y=1.05;group.add(light);g.addShadow(group,.72,.3,.2);
    return {group,body,aura,light,halo,home:new THREE.Vector2(x,z),health:5,color,phase:THREE.MathUtils.randFloat(0,Math.PI*2),freeze:0,cooldown:0,velocity:new THREE.Vector2(),defeated:false,flash:0};
  });
}
export function animateWorld(game,dt){ animateMeadow(game,dt); }
