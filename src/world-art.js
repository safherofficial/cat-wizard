import * as THREE from 'three';
import { buildMeadowArena, animateMeadow } from './meadow-art.js';

export function buildLighting(g){
  g.scene.background=new THREE.Color('#a9d8e5');
  g.scene.fog=new THREE.Fog('#d7e8dc',40,90);
  g.scene.add(new THREE.HemisphereLight('#f6fbf1','#718b66',1.48));

  const sun=new THREE.DirectionalLight('#ffe5bd',2.25);
  sun.position.set(-12,24,10);
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-19,right:19,top:17,bottom:-17,near:.5,far:60});
  sun.shadow.bias=-.00016;
  sun.shadow.normalBias=.022;
  g.scene.add(sun);

  const fill=new THREE.DirectionalLight('#b8e4f2',.52);
  fill.position.set(13,10,-12);
  g.scene.add(fill);
  const rim=new THREE.DirectionalLight('#f3c98e',.42);
  rim.position.set(2,8,-18);
  g.scene.add(rim);

  [[-9,-4,'#ffca91'],[0,-5,'#8de1d2'],[9,3,'#aa9af0'],[-8,5,'#f2a6b6'],[8,-5,'#b4e5ac']].forEach(([x,z,c])=>{
    const light=new THREE.PointLight(c,1.9,8,2);
    light.position.set(x,3.1,z);
    g.scene.add(light);
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
  const player=new THREE.Group();
  player.position.set(0,0,5.2);
  g.scene.add(player);
  g.addShadow(player,.98,.44,.28);

  const cat=new THREE.Group();
  player.add(cat);
  g.catRoot=cat;

  const fur=new THREE.MeshStandardMaterial({color:'#8999a5',roughness:.72});
  const furLight=new THREE.MeshStandardMaterial({color:'#d2d9d4',roughness:.68});
  const furShade=new THREE.MeshStandardMaterial({color:'#657782',roughness:.82});
  const innerEar=new THREE.MeshStandardMaterial({color:'#d98d9b',roughness:.72});
  const robe=new THREE.MeshStandardMaterial({color:'#344b78',roughness:.74});
  const robeLight=new THREE.MeshStandardMaterial({color:'#5878a0',roughness:.68});
  const capeMat=new THREE.MeshStandardMaterial({color:'#202e55',roughness:.82,side:THREE.DoubleSide});
  const capeLining=new THREE.MeshStandardMaterial({color:'#76558e',roughness:.82,side:THREE.DoubleSide});
  const gold=new THREE.MeshStandardMaterial({color:'#e4bd79',metalness:.48,roughness:.34});
  const goldLight=new THREE.MeshStandardMaterial({color:'#ffe2a4',metalness:.32,roughness:.3,emissive:'#8b5924',emissiveIntensity:.12});
  const pink=new THREE.MeshStandardMaterial({color:'#e99ab8',roughness:.42});
  const pinkLight=new THREE.MeshStandardMaterial({color:'#f5c2d0',roughness:.48});
  const dark=new THREE.MeshStandardMaterial({color:'#283440',roughness:.6});
  const wood=new THREE.MeshStandardMaterial({color:'#805238',roughness:.48});
  const woodLight=new THREE.MeshStandardMaterial({color:'#ba8151',roughness:.38});
  const eyeWhite=new THREE.MeshStandardMaterial({color:'#fff6e6',roughness:.24});
  const iris=new THREE.MeshStandardMaterial({color:'#55bda7',roughness:.22,metalness:.08,emissive:'#1b786d',emissiveIntensity:.12});
  const pupil=new THREE.MeshStandardMaterial({color:'#172d35',roughness:.18});
  const noseMat=new THREE.MeshStandardMaterial({color:'#c77e8e',roughness:.38});
  const unitSphere=new THREE.SphereGeometry(1,24,18);

  function orb(parent,material,position,scale,geometry=unitSphere){
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(position[0],position[1],position[2]);
    mesh.scale.set(scale[0],scale[1],scale[2]);
    parent.add(mesh);
    return mesh;
  }
  function tube(parent,points,radius,material,segments=32){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],p[2])));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,8,false),material);
    parent.add(mesh);
    return mesh;
  }

  // A shaped, layered robe gives the silhouette more volume than a primitive cylinder.
  const torso=new THREE.Group();
  cat.add(torso);
  const robeProfile=[
    new THREE.Vector2(0,0),new THREE.Vector2(.43,.025),new THREE.Vector2(.56,.12),
    new THREE.Vector2(.58,.25),new THREE.Vector2(.51,.48),new THREE.Vector2(.42,.82),
    new THREE.Vector2(.35,1.08),new THREE.Vector2(.29,1.15),new THREE.Vector2(0,1.15)
  ];
  const robeBody=new THREE.Mesh(new THREE.LatheGeometry(robeProfile,32),robe);
  robeBody.position.y=.12;
  robeBody.castShadow=true;
  robeBody.receiveShadow=true;
  torso.add(robeBody);

  const hem=new THREE.Mesh(new THREE.TorusGeometry(.555,.036,10,56),gold);
  hem.rotation.x=Math.PI/2;
  hem.position.y=.27;
  torso.add(hem);
  const hemInner=new THREE.Mesh(new THREE.TorusGeometry(.515,.014,8,56),goldLight);
  hemInner.rotation.x=Math.PI/2;
  hemInner.position.y=.31;
  torso.add(hemInner);

  const mantle=orb(torso,robeLight,[0,1.03,-.015],[.52,.19,.38]);
  mantle.rotation.x=-.08;
  const collar=new THREE.Mesh(new THREE.TorusGeometry(.31,.075,10,48),robeLight);
  collar.rotation.x=Math.PI/2;
  collar.position.set(0,1.13,.02);
  torso.add(collar);

  // The cloak has a curved hem, a violet lining and a fine gold edge.
  const cape=new THREE.Group();
  cape.position.set(0,1.03,-.31);
  cat.add(cape);
  const capeShape=new THREE.Shape();
  capeShape.moveTo(-.32,.08);
  capeShape.bezierCurveTo(-.54,-.12,-.5,-.55,-.66,-.91);
  capeShape.quadraticCurveTo(0,-1.02,.66,-.91);
  capeShape.bezierCurveTo(.5,-.55,.54,-.12,.32,.08);
  capeShape.closePath();
  const capeMesh=new THREE.Mesh(new THREE.ShapeGeometry(capeShape,18),capeMat);
  capeMesh.castShadow=true;
  cape.add(capeMesh);
  const liningShape=new THREE.Shape();
  liningShape.moveTo(-.22,-.04);
  liningShape.bezierCurveTo(-.38,-.34,-.36,-.68,-.49,-.89);
  liningShape.quadraticCurveTo(0,-.96,.49,-.89);
  liningShape.bezierCurveTo(.36,-.68,.38,-.34,.22,-.04);
  liningShape.closePath();
  const lining=new THREE.Mesh(new THREE.ShapeGeometry(liningShape,14),capeLining);
  lining.position.z=.006;
  cape.add(lining);
  tube(cape,[[-.65,-.9,.012],[-.34,-.98,.012],[0,-1.0,.012],[.34,-.98,.012],[.65,-.9,.012]],.025,gold);
  tube(cape,[[-.32,.05,.014],[0,-.12,.014],[.32,.05,.014]],.018,goldLight);

  // Waist details and the little illuminated star at the centre of the robe.
  const belt=new THREE.Mesh(new THREE.TorusGeometry(.435,.038,9,48),woodLight);
  belt.rotation.x=Math.PI/2;
  belt.position.y=.72;
  torso.add(belt);
  const clasp=new THREE.Mesh(new THREE.DodecahedronGeometry(.105,1),goldLight);
  clasp.position.set(0,.72,.432);
  torso.add(clasp);
  orb(torso,iris,[0,.72,.52],[.052,.052,.025]);
  orb(torso,gold,[0,.88,.395],[.035,.035,.025]);
  orb(torso,gold,[0,.96,.377],[.022,.022,.018]);

  // Small boots and articulated sleeves remain separate for the walk cycle.
  const legPivots=[],armPivots=[];
  for(const s of [-1,1]){
    const legPivot=new THREE.Group();
    legPivot.position.set(s*.23,.31,.06);
    cat.add(legPivot);
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.22,4,10),fur);
    leg.position.y=-.12;
    leg.castShadow=true;
    legPivot.add(leg);
    const boot=new THREE.Mesh(new THREE.SphereGeometry(.18,16,12),dark);
    boot.scale.set(1,.62,1.25);
    boot.position.set(0,-.27,.1);
    legPivot.add(boot);
    for(let toe=0;toe<3;toe++){
      orb(legPivot,furLight,[((toe-1)*.075),-.27,.235],[.028,.027,.035]);
    }
    legPivots.push(legPivot);

    const armPivot=new THREE.Group();
    armPivot.position.set(s*.43,1.04,.02);
    cat.add(armPivot);
    const sleeve=new THREE.Mesh(new THREE.CapsuleGeometry(.115,.38,5,10),robe);
    sleeve.position.set(s*.04,-.075,.015);
    sleeve.rotation.z=s*-.32;
    sleeve.castShadow=true;
    armPivot.add(sleeve);
    const cuff=new THREE.Mesh(new THREE.TorusGeometry(.12,.022,8,24),gold);
    cuff.position.set(s*.11,-.26,.055);
    cuff.rotation.x=Math.PI/2;
    armPivot.add(cuff);
    const paw=orb(armPivot,furLight,[s*.14,-.31,.11],[.145,.13,.145]);
    paw.castShadow=true;
    for(let toe=0;toe<3;toe++)orb(armPivot,fur,[s*.14+(toe-1)*.055,-.36,.23],[.035,.035,.045]);
    armPivots.push(armPivot);
  }

  // Expressive feline face: warm muzzle, bright eyes, shaped brows and whiskers.
  const head=new THREE.Group();
  head.position.set(0,1.53,.04);
  cat.add(head);
  const skull=orb(head,fur,[0,0,0],[.54,.48,.47]);
  skull.castShadow=true;
  for(const s of [-1,1]){
    const ear=new THREE.Mesh(new THREE.ConeGeometry(.235,.61,14,5),fur);
    ear.position.set(s*.34,.39,-.015);
    ear.rotation.z=s*-.17;
    ear.castShadow=true;
    head.add(ear);
    const inner=new THREE.Mesh(new THREE.ConeGeometry(.135,.4,12,4),innerEar);
    inner.position.set(s*.34,.39,.105);
    inner.rotation.z=s*-.17;
    head.add(inner);
    orb(head,furLight,[s*.22,-.18,.34],[.23,.17,.22]);
    orb(head,eyeWhite,[s*.205,.055,.407],[.145,.185,.09]);
    orb(head,iris,[s*.205,.048,.482],[.085,.125,.043]);
    orb(head,pupil,[s*.205,.048,.514],[.031,.095,.022]);
    orb(head,eyeWhite,[s*.178,.105,.532],[.027,.034,.014]);
    tube(head,[[s*.09,.23,.39],[s*.2,.265,.415],[s*.32,.23,.38]],.025,furShade,12);
    tube(head,[[s*.27,-.18,.49],[s*.47,-.15,.49],[s*.63,-.12,.43]],.009,furLight,14);
    tube(head,[[s*.28,-.25,.48],[s*.49,-.27,.46],[s*.62,-.3,.4]],.008,furLight,14);
    tube(head,[[s*.28,-.1,.48],[s*.48,-.06,.45],[s*.61,-.04,.39]],.008,furLight,14);
  }
  orb(head,eyeWhite,[0,-.205,.43],[.19,.12,.17]);
  orb(head,furLight,[0,-.18,.39],[.105,.12,.13]);
  const nose=orb(head,noseMat,[0,-.105,.538],[.075,.052,.045]);
  nose.scale.y=.68;
  tube(head,[[0,-.145,.56],[0,-.225,.57],[-.075,-.255,.54]],.012,furShade,12);
  tube(head,[[0,-.225,.57],[.075,-.255,.54]],.012,furShade,12);

  // The pink bow remains the character's signature accent.
  orb(cat,pink,[-.14,1.14,.49],[.15,.105,.075]).rotation.z=-.28;
  orb(cat,pink,[.14,1.14,.49],[.15,.105,.075]).rotation.z=.28;
  const bowKnot=orb(cat,pinkLight,[0,1.14,.56],[.075,.075,.05]);
  bowKnot.rotation.z=.2;

  // A broad felt brim and a gently bent crown make the hat read as a crafted object.
  const hatGroup=new THREE.Group();
  hatGroup.position.y=2.0;
  cat.add(hatGroup);
  const hatFelt=new THREE.MeshStandardMaterial({color:'#51467f',roughness:.86});
  const brim=new THREE.Mesh(new THREE.CylinderGeometry(.66,.66,.12,40,1),robe);
  brim.castShadow=true;
  brim.receiveShadow=true;
  hatGroup.add(brim);
  const brimEdge=new THREE.Mesh(new THREE.TorusGeometry(.645,.035,10,56),gold);
  brimEdge.rotation.x=Math.PI/2;
  brimEdge.position.y=-.035;
  hatGroup.add(brimEdge);
  const crownGeo=new THREE.ConeGeometry(.43,.94,28,8);
  const crownPos=crownGeo.attributes.position;
  for(let i=0;i<crownPos.count;i++){
    const y=crownPos.getY(i);
    const h=THREE.MathUtils.clamp((y+.47)/.94,0,1);
    crownPos.setX(i,crownPos.getX(i)+.23*h*h);
    crownPos.setZ(i,crownPos.getZ(i)+.055*h*h);
    crownPos.setY(i,y);
  }
  crownGeo.computeVertexNormals();
  const crown=new THREE.Mesh(crownGeo,hatFelt);
  crown.position.y=.48;
  crown.castShadow=true;
  hatGroup.add(crown);
  const hatBand=new THREE.Mesh(new THREE.TorusGeometry(.435,.045,10,48),gold);
  hatBand.rotation.x=Math.PI/2;
  hatBand.position.y=.075;
  hatGroup.add(hatBand);
  const buckle=new THREE.Mesh(new THREE.BoxGeometry(.14,.12,.035),goldLight);
  buckle.position.set(.36,.09,.19);
  hatGroup.add(buckle);
  orb(hatGroup,robeLight,[.36,.09,.214],[.035,.035,.018]);
  for(let i=0;i<9;i++){
    const a=i/9*TAU;
    orb(hatGroup,goldLight,[Math.cos(a)*.56,-.01,Math.sin(a)*.56],[.018,.018,.018]);
  }
  const hatStar=new THREE.Mesh(new THREE.OctahedronGeometry(.14,1),goldLight);
  hatStar.position.set(.25,.72,.15);
  hatStar.rotation.set(.3,.2,.4);
  hatGroup.add(hatStar);
  tube(hatGroup,[[.28,.72,.15],[.39,.88,.17],[.48,1.02,.16]],.018,goldLight,18);
  orb(hatGroup,goldLight,[.49,1.04,.16],[.045,.045,.045]);

  // The tiny wooden pipe gives the wizard a memorable, slightly eccentric profile.
  const pipe=new THREE.Group();
  pipe.position.set(.47,-.095,.405);
  head.add(pipe);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.032,.04,.39,12),wood);
  stem.rotation.z=-Math.PI/2;
  stem.position.set(.14,-.025,.02);
  pipe.add(stem);
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.095,.135,.2,14),woodLight);
  bowl.position.set(.36,.015,.02);
  bowl.castShadow=true;
  pipe.add(bowl);
  const bowlRim=new THREE.Mesh(new THREE.TorusGeometry(.093,.018,8,24),gold);
  bowlRim.rotation.x=Math.PI/2;
  bowlRim.position.set(.36,.12,.02);
  pipe.add(bowlRim);
  const ember=new THREE.Mesh(new THREE.SphereGeometry(.045,12,10),new THREE.MeshBasicMaterial({color:'#ffad58',toneMapped:false}));
  ember.position.set(.36,.13,.02);
  pipe.add(ember);
  const smoke=new THREE.Group();
  smoke.position.set(.36,.17,.02);
  pipe.add(smoke);
  const smokeMat=new THREE.MeshBasicMaterial({color:'#fff4dc',transparent:true,opacity:.32,depthWrite:false});
  for(let i=0;i<4;i++){
    const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(.04+i*.012,1),smokeMat);
    puff.position.set(Math.sin(i*1.7)*.035,i*.105,0);
    smoke.add(puff);
  }

  // A full, tapered tail balances the silhouette and moves independently.
  const tailPivot=new THREE.Group();
  tailPivot.position.set(0,.48,-.47);
  cat.add(tailPivot);
  const tailCurve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,0,0),new THREE.Vector3(-.2,.12,-.18),
    new THREE.Vector3(-.38,.35,-.3),new THREE.Vector3(-.36,.62,-.38),
    new THREE.Vector3(-.12,.77,-.4)
  ]);
  const tail=new THREE.Mesh(new THREE.TubeGeometry(tailCurve,28,.105,10,false),fur);
  tail.castShadow=true;
  tailPivot.add(tail);
  orb(tailPivot,furLight,[-.12,.77,-.4],[.12,.12,.12]);

  const pendantRing=new THREE.Mesh(new THREE.TorusGeometry(.075,.018,8,24),gold);
  pendantRing.position.set(0,.86,.46);
  cat.add(pendantRing);
  const pendant=new THREE.Mesh(new THREE.OctahedronGeometry(.075,1),iris);
  pendant.position.set(0,.86,.49);
  cat.add(pendant);
  const aura=new THREE.PointLight('#f6d69d',.5,3.8,2);
  aura.position.set(0,1.35,.2);
  cat.add(aura);

  g.tail=tailPivot;
  g.catRig={torso,head,hat:hatGroup,cape,pipe,ember,smoke,tail:tailPivot,legPivots,armPivots};
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
export function animateWorld(game,dt){
  animateMeadow(game,dt);
  const rig=game.catRig;
  if(rig){
    const moving=game.playerMove.length()>.24;
    const stride=game.worldTime*11.5;
    const amount=moving?Math.min(1,game.playerMove.length()/4.6):0;
    rig.torso.rotation.z=Math.sin(game.worldTime*2.1)*.018+Math.sin(stride*2)*.025*amount;
    rig.torso.rotation.x=Math.sin(stride)*.035*amount;
    rig.head.rotation.z=Math.sin(game.worldTime*1.35)*.025+Math.sin(stride)*.025*amount;
    rig.head.rotation.x=Math.cos(game.worldTime*1.7)*.018;
    rig.legPivots.forEach((pivot,i)=>{pivot.rotation.x=Math.sin(stride+i*Math.PI)*.58*amount;});
    rig.armPivots.forEach((pivot,i)=>{pivot.rotation.x=Math.sin(stride+i*Math.PI+Math.PI)*.43*amount;});
    rig.hat.rotation.z=-.1+Math.sin(game.worldTime*1.3)*.035+Math.sin(stride)*.025*amount;
    rig.cape.rotation.x=Math.sin(game.worldTime*2.2)*.045+Math.sin(stride)*.075*amount;
    rig.cape.rotation.z=Math.sin(game.worldTime*1.35)*.035+Math.sin(stride*.5)*.08*amount;
    rig.tail.rotation.y=Math.sin(game.worldTime*2.45)*.28+Math.sin(stride*.5)*.12*amount;
    rig.tail.rotation.x=Math.cos(game.worldTime*2.05)*.12;
    rig.pipe.rotation.z=-.22+Math.sin(game.worldTime*3.1)*.025;
    rig.ember.scale.setScalar(.85+Math.sin(game.worldTime*8)*.16);
    rig.smoke.children.forEach((puff,i)=>{
      puff.position.y=.12*i+((game.worldTime*.32+i*.22)% .38);
      puff.position.x=Math.sin(game.worldTime*1.8+i)*.06;
      puff.scale.setScalar(.85+((game.worldTime+i*.31)% .4));
    });
    game.catRoot.position.y=.025+Math.sin(game.worldTime*(moving?11:3.6))*(moving?.055:.018);
  }
  game.wisps?.forEach((w,i)=>{
    if(w.defeated)return;
    w.group.rotation.z=Math.sin(game.worldTime*1.8+w.phase)*.055;
    w.halo.rotation.x=Math.PI/2.7+Math.sin(game.worldTime*1.1+w.phase)*.08;
    w.body.scale.y=1.15+Math.sin(game.worldTime*2.8+w.phase)*.045;
  });
}
