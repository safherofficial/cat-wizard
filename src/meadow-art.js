import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

function seeded(seed){
  let s=seed>>>0;
  return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
}

function distanceToSegment(x,z,a,b){
  const dx=b[0]-a[0],dz=b[1]-a[1];
  const d=Math.max(dx*dx+dz*dz,.0001);
  const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/d,0,1);
  return Math.hypot(x-(a[0]+dx*t),z-(a[1]+dz*t));
}

const PATH=[[0,12],[-1.8,8],[-1.1,5],[0.2,2],[0,-1.5],[-2.8,-5],[-6.5,-9.8]];
function distanceToPath(x,z){
  let d=Infinity;
  for(let i=0;i<PATH.length-1;i++)d=Math.min(d,distanceToSegment(x,z,PATH[i],PATH[i+1]));
  return d;
}

function meadowTexture(){
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1536;
  const ctx=canvas.getContext('2d');
  const r=seeded(91217);
  const base=ctx.createLinearGradient(0,0,0,canvas.height);
  base.addColorStop(0,'#91b97a');base.addColorStop(.38,'#8eb36e');base.addColorStop(1,'#789b5c');
  ctx.fillStyle=base;ctx.fillRect(0,0,canvas.width,canvas.height);

  // Broad, soft brush patches give the grass its painted rather than tiled look.
  const greens=['rgba(178,199,119,.20)','rgba(57,119,70,.15)','rgba(204,190,115,.16)','rgba(99,151,82,.20)','rgba(64,126,78,.13)'];
  for(let i=0;i<1250;i++){
    const x=r()*canvas.width,y=r()*canvas.height,rx=18+r()*95,ry=10+r()*45;
    ctx.save();ctx.translate(x,y);ctx.rotate((r()-.5)*1.3);
    ctx.fillStyle=greens[Math.floor(r()*greens.length)];
    ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,TAU);ctx.fill();ctx.restore();
  }

  // A winding earth path, brushed in several layers with a broken, natural edge.
  const toPx=([x,z])=>[(x+20)/40*canvas.width,(15-z)/30*canvas.height];
  const drawPath=(color,width)=>{
    ctx.beginPath();const first=toPx(PATH[0]);ctx.moveTo(...first);
    for(let i=1;i<PATH.length-1;i++){
      const p=toPx(PATH[i]),n=toPx(PATH[i+1]);
      ctx.quadraticCurveTo(p[0],p[1],(p[0]+n[0])*.5,(p[1]+n[1])*.5);
    }
    const last=toPx(PATH[PATH.length-1]);ctx.lineTo(...last);
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  };
  drawPath('rgba(70,83,52,.20)',158);
  drawPath('#b59a69',132);
  drawPath('rgba(219,192,139,.55)',104);
  drawPath('rgba(239,217,167,.34)',4);

  // Warm, irregular worn earth around the central spell clearing.
  const cx=canvas.width*.5,cy=canvas.height*.5;
  const clearing=ctx.createRadialGradient(cx,cy,160,cx,cy,315);
  clearing.addColorStop(0,'rgba(189,158,105,.34)');
  clearing.addColorStop(.68,'rgba(184,158,112,.17)');
  clearing.addColorStop(1,'rgba(184,158,112,0)');
  ctx.fillStyle=clearing;ctx.fillRect(cx-320,cy-320,640,640);

  // Small directional strokes, not pixel noise: the surface reads as painted grass.
  const strokes=['rgba(43,94,52,.25)','rgba(220,221,157,.32)','rgba(76,132,72,.25)','rgba(183,194,116,.35)','rgba(242,218,156,.22)'];
  for(let i=0;i<19000;i++){
    const x=r()*canvas.width,y=r()*canvas.height;
    const a=(r()-.5)*1.8,len=3+r()*13;
    ctx.strokeStyle=strokes[Math.floor(r()*strokes.length)];
    ctx.lineWidth=.6+r()*1.7;ctx.beginPath();
    ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len);ctx.stroke();
  }

  // Scattered pale flecks along the path hint at pebbles and crushed leaves.
  for(let i=0;i<1500;i++){
    const x=r()*canvas.width,y=r()*canvas.height;
    const worldX=x/canvas.width*40-20,worldZ=15-y/canvas.height*30;
    if(distanceToPath(worldX,worldZ)>1.3)continue;
    ctx.fillStyle=i%3?'rgba(246,230,190,.42)':'rgba(115,91,63,.22)';
    ctx.beginPath();ctx.ellipse(x,y,1+r()*4,.8+r()*2,r()*TAU,0,TAU);ctx.fill();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  return texture;
}

function makeBladeGeometry(){
  const positions=[],indices=[];
  for(let blade=0;blade<3;blade++){
    const a=blade*Math.PI/3,ca=Math.cos(a),sa=Math.sin(a);
    const points=[[-.055,0,0],[.055,0,0],[-.038,.24,.035],[.038,.24,.035],[0,.52,.12]];
    const start=positions.length/3;
    for(const [x,y,z] of points)positions.push(x*ca-z*sa,y,x*sa+z*ca);
    indices.push(start,start+1,start+2,start+1,start+3,start+2,start+2,start+3,start+4);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

function addGrass(game){
  const random=seeded(48821),count=9000;
  const geometry=makeBladeGeometry();
  const material=new THREE.MeshLambertMaterial({color:'#ffffff',side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.uniforms.uMeadowTime={value:0};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uMeadowTime;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
#ifdef USE_INSTANCING
      float meadowPhase = dot(instanceMatrix[3].xz, vec2(0.43, 0.27));
      float meadowBend = pow(clamp(position.y / 0.52, 0.0, 1.0), 1.8);
      transformed.x += sin(uMeadowTime * 1.35 + meadowPhase) * 0.075 * meadowBend;
      transformed.z += cos(uMeadowTime * 0.94 + meadowPhase * 1.3) * 0.04 * meadowBend;
#endif
`);
    material.userData.shader=shader;
  };
  const mesh=new THREE.InstancedMesh(geometry,material,count);
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const dummy=new THREE.Object3D();
  const palette=['#4f8a4c','#629c53','#7eac61','#a3b96f','#477b49','#92ad60'];
  const color=new THREE.Color();
  let placed=0,attempts=0;
  while(placed<count&&attempts<count*5){
    attempts++;
    const x=random()*35-17.5,z=random()*28-14;
    if(Math.hypot(x,z)<4.2)continue;
    if(distanceToPath(x,z)<1.02)continue;
    if(x>9.8&&z>-11&&z<10)continue;
    if(Math.abs(x)>16||Math.abs(z)>13)continue;
    dummy.position.set(x,.015,z);
    dummy.rotation.set(0,random()*TAU,0);
    const height=.65+random()*.8;
    const width=.66+random()*.72;
    dummy.scale.set(width,height,width);
    dummy.updateMatrix();mesh.setMatrixAt(placed,dummy.matrix);
    color.set(palette[Math.floor(random()*palette.length)]);mesh.setColorAt(placed,color);
    placed++;
  }
  mesh.count=placed;mesh.frustumCulled=false;mesh.receiveShadow=false;mesh.castShadow=false;
  game.scene.add(mesh);game.grassMaterial=material;
}

function addFlowers(game){
  const random=seeded(7788),count=980;
  const stemGeometry=new THREE.CylinderGeometry(.012,.018,.23,4);
  const stemMaterial=new THREE.MeshStandardMaterial({color:'#4c8952',roughness:1});
  const stems=new THREE.InstancedMesh(stemGeometry,stemMaterial,count);
  const petalGeometry=new THREE.SphereGeometry(.052,5,4);
  petalGeometry.scale(1.25,.72,1);
  const petalMaterial=new THREE.MeshStandardMaterial({color:'#fff',roughness:.82,flatShading:true});
  const petals=new THREE.InstancedMesh(petalGeometry,petalMaterial,count*5);
  const centerGeometry=new THREE.IcosahedronGeometry(.035,0);
  const centerMaterial=new THREE.MeshStandardMaterial({color:'#f4d16e',roughness:.7,flatShading:true});
  const centers=new THREE.InstancedMesh(centerGeometry,centerMaterial,count);
  const dummy=new THREE.Object3D(),col=new THREE.Color();
  const colors=['#fff2d4','#f2a4a0','#f4c86e','#b6a2dc','#e9a5c4','#d9e8a4'];
  let n=0,p=0;
  for(let i=0;i<count*8&&n<count;i++){
    const x=random()*34-17,z=random()*26-13;
    if(Math.hypot(x,z)<4.5||distanceToPath(x,z)<1.35||(x>9.7&&z>-11&&z<10))continue;
    if(random()<.18)continue;
    const y=.115+random()*.035,scale=.72+random()*.9;
    dummy.position.set(x,y,z);dummy.scale.setScalar(scale);dummy.rotation.set(0,random()*TAU,0);dummy.updateMatrix();stems.setMatrixAt(n,dummy.matrix);
    col.set(colors[Math.floor(random()*colors.length)]);
    for(let j=0;j<5;j++){
      const a=j*TAU/5,idx=p++;
      dummy.position.set(x+Math.cos(a)*.075*scale,y+.13*scale,z+Math.sin(a)*.075*scale);
      dummy.scale.set(.9*scale,.9*scale,.9*scale);dummy.rotation.set(0,a,0);dummy.updateMatrix();
      petals.setMatrixAt(idx,dummy.matrix);petals.setColorAt(idx,col);
    }
    dummy.position.set(x,y+.14*scale,z);dummy.scale.setScalar(scale);dummy.rotation.set(0,random()*TAU,0);dummy.updateMatrix();
    centers.setMatrixAt(n,dummy.matrix);n++;
  }
  stems.count=n;centers.count=n;petals.count=p;
  stems.receiveShadow=true;petals.castShadow=false;centers.castShadow=false;
  game.scene.add(stems,petals,centers);
}

function branch(parent,start,end,radius,material){
  const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),delta=b.clone().sub(a);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius*.62,radius,delta.length(),6),material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
}

function addTree(game,x,z,scale=1,phase=0){
  const group=new THREE.Group();group.position.set(x,0,z);group.scale.setScalar(scale);game.scene.add(group);
  const trunkMaterial=new THREE.MeshStandardMaterial({color:'#8d6243',roughness:.96,flatShading:true});
  const barkLight=new THREE.MeshStandardMaterial({color:'#bb8b5c',roughness:.93,flatShading:true});
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.2,.37,2.9,7),trunkMaterial);
  trunk.position.y=1.42;trunk.castShadow=true;trunk.receiveShadow=true;group.add(trunk);
  branch(group,[-.04,1.9,0],[-.85,3.1,.12],.18,trunkMaterial);
  branch(group,[.02,2.0,0],[.82,3.05,-.16],.17,barkLight);
  branch(group,[0,2.05,0],[.16,3.45,.42],.15,trunkMaterial);
  branch(group,[-.03,1.75,0],[-.22,2.95,-.75],.14,barkLight);

  const crown=new THREE.Group();crown.position.y=2.65;group.add(crown);
  const leafGeo=new THREE.IcosahedronGeometry(.32,0);
  const leafMat=new THREE.MeshStandardMaterial({color:'#fff',roughness:.92,flatShading:true});
  const leafMesh=new THREE.InstancedMesh(leafGeo,leafMat,138);
  const r=seeded(Math.floor((x+30)*999+(z+30)*31+phase*1000));
  const dummy=new THREE.Object3D(),col=new THREE.Color();
  const palette=['#4e8d55','#5c9b57','#71a960','#83b46a','#a3bd72','#3e794d'];
  for(let i=0;i<138;i++){
    const a=r()*TAU,rad=Math.pow(r(),.56)*1.45;
    dummy.position.set(Math.cos(a)*rad,(r()-.5)*1.42,Math.sin(a)*rad*.82);
    const s=.62+r()*.9;dummy.scale.set(s*(.85+r()*.3),s*(.78+r()*.3),s);
    dummy.rotation.set(r()*TAU,r()*TAU,r()*TAU);dummy.updateMatrix();leafMesh.setMatrixAt(i,dummy.matrix);
    col.set(palette[Math.floor(r()*palette.length)]);leafMesh.setColorAt(i,col);
  }
  leafMesh.castShadow=true;leafMesh.receiveShadow=true;crown.add(leafMesh);
  game.treeTops.push({group:crown,phase,amount:.035+r()*.035});
  game.obstacles.push({x,z,radius:.72*scale,fixed:true});
}

function addBush(game,x,z,scale=1){
  const group=new THREE.Group();group.position.set(x,0,z);group.scale.setScalar(scale);game.scene.add(group);
  const colors=['#4d884e','#679d55','#82aa62'];
  for(let i=0;i<7;i++){
    const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,1),new THREE.MeshStandardMaterial({color:colors[i%3],roughness:.95,flatShading:true}));
    mesh.position.set(Math.cos(i*TAU/7)*.34,.3+(i%3)*.07,Math.sin(i*TAU/7)*.28);
    mesh.scale.set(1,.75,.9);mesh.castShadow=true;group.add(mesh);
  }
}

function addStandingStone(game,x,z,height=2.1,lean=0){
  const group=new THREE.Group();group.position.set(x,0,z);group.rotation.z=lean;game.scene.add(group);
  const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(.7,0),new THREE.MeshStandardMaterial({color:'#a9a58b',roughness:.96,flatShading:true}));
  stone.scale.set(.72,height,0.48);stone.position.y=height*.55;stone.castShadow=true;stone.receiveShadow=true;group.add(stone);
  const rune=new THREE.Mesh(new THREE.BoxGeometry(.045,height*.38,.025),new THREE.MeshBasicMaterial({color:'#e4c985',transparent:true,opacity:.65}));
  rune.position.set(0,height*.6,.34);group.add(rune);
  game.obstacles.push({x,z,radius:.62,fixed:true});
}

function addCottage(game,x,z){
  const group=new THREE.Group();group.position.set(x,0,z);game.scene.add(group);
  const wall=new THREE.MeshStandardMaterial({color:'#d9c79e',roughness:.94,flatShading:true});
  const wood=new THREE.MeshStandardMaterial({color:'#8e6043',roughness:.9,flatShading:true});
  const roof=new THREE.MeshStandardMaterial({color:'#a95f4c',roughness:.92,flatShading:true});
  const dark=new THREE.MeshStandardMaterial({color:'#3c5151',roughness:.65});
  const base=new THREE.Mesh(new THREE.BoxGeometry(3.7,.3,3.0),wood);base.position.y=.15;base.castShadow=true;group.add(base);
  const body=new THREE.Mesh(new THREE.BoxGeometry(3.35,2.55,2.75),wall);body.position.y=1.42;body.castShadow=true;body.receiveShadow=true;group.add(body);
  const roofMesh=new THREE.Mesh(new THREE.ConeGeometry(2.55,1.58,4),roof);roofMesh.position.set(0,3.48,0);roofMesh.rotation.y=Math.PI/4;roofMesh.castShadow=true;group.add(roofMesh);
  for(const s of [-1,1]){
    const beam=new THREE.Mesh(new THREE.BoxGeometry(.16,2.65,.16),wood);beam.position.set(s*1.58,1.43,1.39);group.add(beam);
    const window=new THREE.Mesh(new THREE.BoxGeometry(.56,.72,.07),dark);window.position.set(s*.92,1.55,1.42);group.add(window);
    const crossA=new THREE.Mesh(new THREE.BoxGeometry(.06,.78,.08),wood);crossA.position.copy(window.position);crossA.rotation.z=.45;group.add(crossA);
    const crossB=crossA.clone();crossB.rotation.z=-.45;group.add(crossB);
  }
  const door=new THREE.Mesh(new THREE.BoxGeometry(.72,1.42,.09),wood);door.position.set(0,.87,1.44);group.add(door);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(.055,7,6),new THREE.MeshStandardMaterial({color:'#e6c47b',metalness:.6,roughness:.35}));knob.position.set(.22,.88,1.51);group.add(knob);
  const chimney=new THREE.Mesh(new THREE.BoxGeometry(.46,1.15,.48),wood);chimney.position.set(.92,3.45,-.58);chimney.castShadow=true;group.add(chimney);
  const smoke=new THREE.Group();smoke.position.set(.92,4.1,-.58);group.add(smoke);
  const smokeMat=new THREE.MeshBasicMaterial({color:'#f2eee0',transparent:true,opacity:.22,depthWrite:false});
  for(let i=0;i<3;i++){const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(.18+i*.06,1),smokeMat);puff.position.set(i*.09,i*.24,0);smoke.add(puff);}
  game.cottageSmoke=smoke;
}

function addWindmill(game,x,z){
  const group=new THREE.Group();group.position.set(x,0,z);game.scene.add(group);
  const stone=new THREE.MeshStandardMaterial({color:'#c9b78e',roughness:.92,flatShading:true});
  const roof=new THREE.MeshStandardMaterial({color:'#765e57',roughness:.85,flatShading:true});
  const tower=new THREE.Mesh(new THREE.CylinderGeometry(.72,1.08,3.75,9),stone);tower.position.y=1.9;tower.castShadow=true;tower.receiveShadow=true;group.add(tower);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(1.18,1.3,9),roof);cap.position.y=4.42;cap.castShadow=true;group.add(cap);
  const window=new THREE.Mesh(new THREE.BoxGeometry(.36,.6,.05),new THREE.MeshStandardMaterial({color:'#38505a'}));window.position.set(0,2.25,.76);group.add(window);
  const hub=new THREE.Group();hub.position.set(0,3.72,.94);group.add(hub);
  const wood=new THREE.MeshStandardMaterial({color:'#8a6447',roughness:.9});
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    const blade=new THREE.Group();blade.rotation.z=a;hub.add(blade);
    const spar=new THREE.Mesh(new THREE.BoxGeometry(.17,2.25,.12),wood);spar.position.y=1.15;blade.add(spar);
    const sail=new THREE.Mesh(new THREE.BoxGeometry(.82,1.3,.07),new THREE.MeshStandardMaterial({color:i%2?'#e7d3a9':'#c6d9c2',roughness:.86,flatShading:true}));
    sail.position.set(.35,1.65,.07);sail.rotation.z=-.2;blade.add(sail);
  }
  game.windmills.push(hub);
}

function addWater(game){
  const points=[[-18,-9.8],[-13,-8.8],[-9,-9.5],[-5,-8.7],[-1,-9.35],[4,-8.55],[8,-9.5],[13,-8.7],[18,-9.5]];
  const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,-.025,z)));
  const samples=curve.getPoints(120),positions=[],uv=[],indices=[];
  for(let i=0;i<samples.length;i++){
    const p=samples[i],t=curve.getTangent(i/(samples.length-1));
    const side=new THREE.Vector3(t.z,0,-t.x).normalize();
    const width=1.05+.18*Math.sin(i*.21);
    const left=p.clone().addScaledVector(side,width),right=p.clone().addScaledVector(side,-width);
    positions.push(left.x,left.y,left.z,right.x,right.y,right.z);
    uv.push(0,i/(samples.length-1),1,i/(samples.length-1));
    if(i<samples.length-1){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const waterMat=new THREE.MeshPhysicalMaterial({color:'#78bfce',roughness:.24,metalness:.08,transparent:true,opacity:.9,side:THREE.DoubleSide,clearcoat:.65,clearcoatRoughness:.2});
  const water=new THREE.Mesh(geometry,waterMat);water.receiveShadow=true;game.scene.add(water);game.waterMaterial=waterMat;
  const bankMaterial=new THREE.MeshStandardMaterial({color:'#d0b886',roughness:1,flatShading:true});
  for(const [x,z] of points){const pebble=new THREE.Mesh(new THREE.IcosahedronGeometry(.28,0),bankMaterial);pebble.position.set(x,-.01,z+(x%2?.95:-.95));pebble.scale.set(1,.4,.65);game.scene.add(pebble);}
  game.riverCurve=curve;
}

export function buildMeadowArena(game){
  game.treeTops=[];game.windmills=[];game.windShaders=[];game.effectsGround=[];
  const ground=new THREE.Mesh(
    new THREE.PlaneGeometry(40,30),
    new THREE.MeshStandardMaterial({map:meadowTexture(),roughness:1,metalness:0})
  );
  ground.rotation.x=-Math.PI/2;ground.position.y=-.09;ground.receiveShadow=true;game.scene.add(ground);

  const outerGrass=new THREE.Mesh(new THREE.PlaneGeometry(70,54),new THREE.MeshStandardMaterial({color:'#6e9862',roughness:1}));
  outerGrass.rotation.x=-Math.PI/2;outerGrass.position.set(0,-.12,-4);outerGrass.receiveShadow=true;game.scene.add(outerGrass);

  // A low, broken ring of old stones makes a natural magical clearing, not a boxed arena.
  const stoneMat=new THREE.MeshStandardMaterial({color:'#b8a98a',roughness:.95,flatShading:true});
  const gold=new THREE.MeshStandardMaterial({color:'#d8b574',metalness:.38,roughness:.48,emissive:'#735128',emissiveIntensity:.13});
  const mint=new THREE.MeshStandardMaterial({color:'#83cbb7',metalness:.22,roughness:.32,emissive:'#297a72',emissiveIntensity:.25});
  for(let i=0;i<10;i++){
    const a=i*TAU/10+.12,r=4.35+(i%3)*.12;
    const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(.52,0),stoneMat);
    stone.position.set(Math.cos(a)*r,.24,Math.sin(a)*r);stone.scale.set(.78,.65,.48);
    stone.rotation.set(.1,i*.7,.12);stone.castShadow=true;stone.receiveShadow=true;game.scene.add(stone);
  }
  [[3.5,.052,gold],[3.18,.026,mint],[2.65,.035,gold],[1.15,.025,mint]].forEach(([radius,tube,material])=>{
    const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,8,100),material);
    ring.rotation.x=Math.PI/2;ring.position.y=.095;ring.castShadow=true;game.scene.add(ring);
  });
  for(let i=0;i<12;i++){
    const a=i*TAU/12;
    const rune=new THREE.Mesh(new THREE.OctahedronGeometry(.15),new THREE.MeshStandardMaterial({color:'#f8e6bb',emissive:'#77cbb9',emissiveIntensity:.32,flatShading:true}));
    rune.position.set(Math.cos(a)*3.78,.22,Math.sin(a)*3.78);rune.scale.set(.68,.4,1.1);game.scene.add(rune);
  }

  const coreGroup=new THREE.Group();coreGroup.position.set(0,2.55,0);game.scene.add(coreGroup);
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,2),new THREE.MeshPhysicalMaterial({color:'#b7e7d9',emissive:'#4a9d8c',emissiveIntensity:.42,roughness:.22,metalness:.12,clearcoat:.8}));
  core.castShadow=true;coreGroup.add(core);
  const inner=new THREE.Mesh(new THREE.OctahedronGeometry(.28,1),new THREE.MeshStandardMaterial({color:'#fff0c8',emissive:'#d4a75d',emissiveIntensity:.6,roughness:.25,metalness:.2}));
  coreGroup.add(inner);
  const orbitA=new THREE.Mesh(new THREE.TorusGeometry(.92,.026,8,80),new THREE.MeshBasicMaterial({color:'#f5dfad'}));orbitA.rotation.set(.8,.35,.3);coreGroup.add(orbitA);
  const orbitB=new THREE.Mesh(new THREE.TorusGeometry(1.25,.018,8,80),new THREE.MeshBasicMaterial({color:'#8fe0ce'}));orbitB.rotation.set(1.3,-.4,.15);coreGroup.add(orbitB);
  coreGroup.add(new THREE.PointLight('#80dcca',3.2,6,2));game.magicCore=coreGroup;game.magicOrbits=[orbitA,orbitB];

  addWater(game);
  const hillMat=new THREE.MeshStandardMaterial({color:'#8eaf78',roughness:1,flatShading:true});
  [[-17,-13,7,4,8],[0,-18,11,5,7],[18,-14,8,4,9],[-22,0,7,6,8],[24,3,8,5,8]].forEach(([x,z,sx,sy,sz])=>{
    const hill=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),hillMat);
    hill.position.set(x,sy*.35,z);hill.scale.set(sx,sy,sz);hill.receiveShadow=true;game.scene.add(hill);
  });

  // Small landmarks in the distance make the meadow feel like a place.
  addCottage(game,-8.9,-12.1);
  addWindmill(game,8.9,-12.4);
  [[-4.9,-10.4],[0,-11.8],[4.3,-10.6]].forEach(([x,z],i)=>addStandingStone(game,x,z,2.0+(i%2)*.5,(i-1)*.08));

  const trees=[
    [-11.2,-4.8,1.05,.2],[11.3,-4.2,1.05,1.1],[-10.8,4.7,.92,2.1],
    [10.9,4.2,.98,2.7],[-6.1,8.1,.88,3.6],[5.7,8.4,.92,4.4],
    [-15,-1.7,1.2,5.1],[15.2,1.4,1.12,5.8]
  ];
  trees.forEach(([x,z,s,p])=>addTree(game,x,z,s,p));
  [[-8.8,-1.8],[8.6,-2.8],[-8.9,5.9],[8.7,5.8],[-13,3.2],[13,-4.5],[-4.8,9.3],[3.4,9.5]].forEach(([x,z],i)=>addBush(game,x,z,.8+(i%3)*.12));

  addGrass(game);
  addFlowers(game);

  // The destructible props are scattered through the clearing like things left by its keeper.
  const props=[
    ['crate',-7.8,-2.8,1.1,1.1,2.6],['barrel',-6.4,3.9,.78,1.15,2.1],
    ['vase',-3.8,5.1,.72,1,1.6],['stone',4.5,4.6,1.35,1.3,3.5],
    ['crate',7.0,3.1,1.1,1.1,2.6],['barrel',8.4,1.2,.78,1.15,2.1],
    ['stone',8.8,-4.7,1.25,1.3,3.5],['vase',4.5,-5.0,.72,1,1.6],
    ['crate',-4.7,-5.3,1.1,1.1,2.6],['stone',-9.2,1.0,1.15,1.3,3.5],
    ['barrel',1.8,5.9,.78,1.15,2.1],['crate',6.1,-1.5,1.1,1.1,2.6]
  ];
  props.forEach(p=>game.addProp(...p));
}

export function animateMeadow(game,dt){
  if(game.player){
    const p=game.player.position;
    const target=new THREE.Vector3(p.x*.12,8.6,p.z+9.3);
    const look=new THREE.Vector3(p.x,1.05,p.z-3.2);
    const a=1-Math.exp(-dt*2.8);
    game.camera.position.lerp(target,a);game.cameraLook.lerp(look,a);game.camera.lookAt(game.cameraLook);
  }
  const shader=game.grassMaterial?.userData?.shader;
  if(shader?.uniforms?.uMeadowTime)shader.uniforms.uMeadowTime.value=game.worldTime;
  game.treeTops?.forEach(t=>{t.group.rotation.z=Math.sin(game.worldTime*.72+t.phase)*t.amount;t.group.rotation.x=Math.cos(game.worldTime*.58+t.phase)*t.amount*.55;});
  game.windmills?.forEach((m,i)=>{m.rotation.z+=dt*(.34+i*.025);});
  if(game.magicCore){
    game.magicCore.rotation.y+=dt*.24;
    game.magicCore.rotation.x=Math.sin(game.worldTime*.35)*.09;
    game.magicCore.position.y=2.55+Math.sin(game.worldTime*1.6)*.1;
    game.magicOrbits[0].rotation.z+=dt*.55;game.magicOrbits[1].rotation.y-=dt*.42;
  }
  if(game.cottageSmoke)game.cottageSmoke.position.y=4.1+Math.sin(game.worldTime*.45)*.13;
}
