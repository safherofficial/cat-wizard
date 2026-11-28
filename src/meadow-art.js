import * as THREE from 'three';
import { WORLD_BOUNDS, WORLD_SIZE } from './world-map.js';
import {
  createCloudPuffLayout,
  createCrystalGroveLayout,
  createDistantMountainLayout,
  createPeripheralPineLayout
} from './environment-layout.js';
import { terrainElevationAt } from './terrain.js';

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

const PATHS=[
  [[0,12],[-1.8,8],[-1.1,5],[.2,2],[0,-1.5],[-2.8,-5],[-6.5,-9.8]],
  [[-6.5,-9.8],[-14,-13],[-22,-15],[-31,-11],[-39,-4],[-51,-8],[-61,-20],[-66,-36]],
  [[-1,-3],[8,-8],[17,-14],[26,-18],[37,-16],[49,-19],[60,-15],[66,-27]],
  [[0,12],[-2,19],[2,27],[0,35],[-1,42],[0,49]],
  [[-2,-10],[3,-18],[1,-27],[-4,-35],[5,-44],[19,-51],[37,-49],[51,-42]],
  [[0,35],[-12,42],[-26,48],[-42,47],[-51,43]],
  [[37,-16],[45,-7],[54,2],[65,8]]
];
function distanceToPath(x,z){
  let d=Infinity;
  for(const path of PATHS){
    for(let i=0;i<path.length-1;i++)d=Math.min(d,distanceToSegment(x,z,path[i],path[i+1]));
  }
  return d;
}

function meadowTexture(){
  const canvas=document.createElement('canvas');canvas.width=3584;canvas.height=2816;
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

  // Winding footpaths connect the central clearing to the valley's outer landmarks.
  const mapMinX=WORLD_BOUNDS.minX-2,mapMaxX=WORLD_BOUNDS.maxX+2;
  const mapMinZ=WORLD_BOUNDS.minZ-2,mapMaxZ=WORLD_BOUNDS.maxZ+2;
  const toPx=([x,z])=>[
    (x-mapMinX)/WORLD_SIZE.width*canvas.width,
    (mapMaxZ-z)/WORLD_SIZE.depth*canvas.height
  ];
  const drawPath=(path,color,width)=>{
    ctx.beginPath();const first=toPx(path[0]);ctx.moveTo(...first);
    for(let i=1;i<path.length-1;i++){
      const p=toPx(path[i]),n=toPx(path[i+1]);
      ctx.quadraticCurveTo(p[0],p[1],(p[0]+n[0])*.5,(p[1]+n[1])*.5);
    }
    const last=toPx(path[path.length-1]);ctx.lineTo(...last);
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  };
  PATHS.forEach(path=>{
    drawPath(path,'rgba(70,83,52,.22)',73);
    drawPath(path,'#b59a69',60);
    drawPath(path,'rgba(219,192,139,.55)',46);
    drawPath(path,'rgba(239,217,167,.34)',3);
  });

  // Warm, irregular worn earth around the central spell clearing.
  const cx=canvas.width*.5,cy=canvas.height*.5;
  const clearing=ctx.createRadialGradient(cx,cy,120,cx,cy,310);
  clearing.addColorStop(0,'rgba(189,158,105,.34)');
  clearing.addColorStop(.68,'rgba(184,158,112,.17)');
  clearing.addColorStop(1,'rgba(184,158,112,0)');
  ctx.fillStyle=clearing;ctx.fillRect(cx-260,cy-260,520,520);

  // Small directional strokes, not pixel noise: the surface reads as painted grass.
  const strokes=['rgba(43,94,52,.25)','rgba(220,221,157,.32)','rgba(76,132,72,.25)','rgba(183,194,116,.35)','rgba(242,218,156,.22)'];
  for(let i=0;i<32000;i++){
    const x=r()*canvas.width,y=r()*canvas.height;
    const a=(r()-.5)*1.8,len=3+r()*13;
    ctx.strokeStyle=strokes[Math.floor(r()*strokes.length)];
    ctx.lineWidth=.6+r()*1.7;ctx.beginPath();
    ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len);ctx.stroke();
  }

  // Scattered pale flecks along the path hint at pebbles and crushed leaves.
  for(let i=0;i<1500;i++){
    const x=r()*canvas.width,y=r()*canvas.height;
    const worldX=mapMinX+x/canvas.width*WORLD_SIZE.width;
    const worldZ=mapMaxZ-y/canvas.height*WORLD_SIZE.depth;
    if(distanceToPath(worldX,worldZ)>1.45)continue;
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
  const random=seeded(48821),count=56000;
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
    const x=WORLD_BOUNDS.minX+random()*(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX);
    const z=WORLD_BOUNDS.minZ+random()*(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ);
    if(Math.hypot(x,z)<4.2)continue;
    if(distanceToPath(x,z)<1.02)continue;
    const nearLandmark=(game.obstacles||[]).some(obstacle=>
      obstacle.fixed&&!obstacle.destroyed&&
      Math.hypot(x-obstacle.x,z-obstacle.z)<(obstacle.radius||.6)+.85
    );
    if(nearLandmark)continue;
    dummy.position.set(x,terrainElevationAt(x,z)+.015,z);
    dummy.rotation.set(0,random()*TAU,0);
    const height=.46+random()*.66;
    const width=.62+random()*.76;
    dummy.scale.set(width,height,width);
    dummy.updateMatrix();mesh.setMatrixAt(placed,dummy.matrix);
    color.set(palette[Math.floor(random()*palette.length)]);mesh.setColorAt(placed,color);
    placed++;
  }
  mesh.count=placed;mesh.frustumCulled=false;mesh.receiveShadow=false;mesh.castShadow=false;
  game.scene.add(mesh);game.grassMaterial=material;
}

function addFireflies(game){
  const random=seeded(66021),count=520,positions=new Float32Array(count*3),phases=new Float32Array(count),base=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const x=WORLD_BOUNDS.minX+2+random()*(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX-4);
    const z=WORLD_BOUNDS.minZ+2+random()*(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ-4);
    const y=terrainElevationAt(x,z)+.55+random()*2.2;
    base[i*3]=x;base[i*3+1]=y;base[i*3+2]=z;
    phases[i]=random()*TAU;
    positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=z;
  }
  const geometry=new THREE.BufferGeometry();
  const positionAttribute=new THREE.BufferAttribute(positions,3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position',positionAttribute);
  const material=new THREE.PointsMaterial({color:'#fff0b0',size:.13,transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
  const points=new THREE.Points(geometry,material);
  points.frustumCulled=false;game.scene.add(points);game.fireflies={points,base,phases};
}

function addFlowers(game){
  const random=seeded(7788),count=6000;
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
    const x=WORLD_BOUNDS.minX+random()*(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX);
    const z=WORLD_BOUNDS.minZ+random()*(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ);
    if(Math.hypot(x,z)<4.5||distanceToPath(x,z)<1.35)continue;
    const nearLandmark=(game.obstacles||[]).some(obstacle=>
      obstacle.fixed&&!obstacle.destroyed&&
      Math.hypot(x-obstacle.x,z-obstacle.z)<(obstacle.radius||.6)+.5
    );
    if(nearLandmark||random()<.18)continue;
    const y=terrainElevationAt(x,z)+.115+random()*.035,scale=.72+random()*.9;
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
  const group=new THREE.Group();group.position.set(x,terrainElevationAt(x,z),z);group.scale.setScalar(scale);game.scene.add(group);
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

function addBushes(game,placements){
  const lobesPerBush=7;
  const geometry=new THREE.IcosahedronGeometry(.34,1);
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.95,flatShading:true});
  const instances=new THREE.InstancedMesh(geometry,material,placements.length*lobesPerBush);
  const colors=['#4d884e','#679d55','#82aa62'];
  const dummy=new THREE.Object3D();
  const color=new THREE.Color();
  let index=0;

  placements.forEach(([x,z,scale])=>{
    for(let i=0;i<lobesPerBush;i++){
      const angle=i*TAU/lobesPerBush;
      const lobeX=x+Math.cos(angle)*.34*scale;
      const lobeZ=z+Math.sin(angle)*.28*scale;
      dummy.position.set(
        lobeX,
        terrainElevationAt(lobeX,lobeZ)+(.3+(i%3)*.07)*scale,
        lobeZ
      );
      dummy.scale.set(scale,scale*.75,scale*.9);
      dummy.rotation.set(0,0,0);
      dummy.updateMatrix();
      instances.setMatrixAt(index,dummy.matrix);
      color.set(colors[i%colors.length]);
      instances.setColorAt(index,color);
      index++;
    }
  });

  instances.count=index;
  instances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  instances.castShadow=true;
  instances.receiveShadow=false;
  instances.computeBoundingSphere();
  game.scene.add(instances);
}


function addPeripheralPineForest(game){
  const layout=createPeripheralPineLayout();
  const trunkGeometry=new THREE.CylinderGeometry(.13,.22,2.25,6);
  const trunkMaterial=new THREE.MeshStandardMaterial({color:'#73543d',roughness:.96,flatShading:true});
  const trunks=new THREE.InstancedMesh(trunkGeometry,trunkMaterial,layout.length);
  const coneGeometry=new THREE.ConeGeometry(1,1,7,1);
  const coneMaterial=new THREE.MeshStandardMaterial({
    color:'#ffffff',vertexColors:true,roughness:.94,flatShading:true
  });
  const layers=[0,1,2].map(()=>new THREE.InstancedMesh(coneGeometry,coneMaterial,layout.length));
  const palettes=[
    ['#315f4c','#3d7654','#477f5c'],
    ['#38694d','#4b8055','#568b5d'],
    ['#426f52','#5b8b5a','#659763'],
    ['#315b4a','#477a56','#55875b']
  ];
  const dummy=new THREE.Object3D();
  const color=new THREE.Color();

  layout.forEach((tree,index)=>{
    const s=tree.scale;
    const groundY=terrainElevationAt(tree.x,tree.z);
    dummy.position.set(tree.x,groundY+1.14*s,tree.z);
    dummy.rotation.set(0,tree.rotationY,0);
    dummy.scale.set(s,s,s);
    dummy.updateMatrix();
    trunks.setMatrixAt(index,dummy.matrix);

    const levels=[
      {y:1.55,w:1.32,h:2.25},
      {y:2.58,w:1.02,h:1.95},
      {y:3.48,w:.70,h:1.55}
    ];
    levels.forEach((level,layerIndex)=>{
      dummy.position.set(tree.x,groundY+level.y*s,tree.z);
      dummy.rotation.set(0,tree.rotationY+layerIndex*.18,0);
      dummy.scale.set(level.w*s,level.h*s,level.w*s);
      dummy.updateMatrix();
      layers[layerIndex].setMatrixAt(index,dummy.matrix);
      color.set(palettes[tree.tintIndex][layerIndex]);
      layers[layerIndex].setColorAt(index,color);
    });
    game.obstacles.push({x:tree.x,z:tree.z,radius:.58*s,fixed:true});
  });

  trunks.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  trunks.castShadow=true;
  trunks.receiveShadow=true;
  trunks.computeBoundingSphere();
  game.scene.add(trunks);
  layers.forEach(mesh=>{
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    mesh.computeBoundingSphere();
    game.scene.add(mesh);
  });
  game.pineForest={trunks,layers};
}

function addCrystalGroves(game){
  const layout=createCrystalGroveLayout();
  const geometry=new THREE.OctahedronGeometry(1,0);
  const material=new THREE.MeshStandardMaterial({
    color:'#ffffff',
    vertexColors:true,
    emissive:'#285e72',
    emissiveIntensity:.42,
    metalness:.16,
    roughness:.27,
    flatShading:true
  });
  const crystals=new THREE.InstancedMesh(geometry,material,layout.length);
  const dummy=new THREE.Object3D();
  const color=new THREE.Color();
  const palette=['#66cdbb','#84b9df','#a993de','#b2d8ca'];

  layout.forEach((crystal,index)=>{
    const groundY=terrainElevationAt(crystal.x,crystal.z);
    dummy.position.set(crystal.x,groundY+crystal.height*.49,crystal.z);
    dummy.rotation.set(crystal.lean,crystal.rotationY,-crystal.lean*.55);
    dummy.scale.set(crystal.width,crystal.height,crystal.width*.78);
    dummy.updateMatrix();
    crystals.setMatrixAt(index,dummy.matrix);
    color.set(palette[crystal.tintIndex]);
    crystals.setColorAt(index,color);
    game.obstacles.push({
      x:crystal.x,z:crystal.z,radius:.22+crystal.width*.42,fixed:true
    });
  });
  crystals.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  crystals.castShadow=true;
  crystals.receiveShadow=true;
  crystals.computeBoundingSphere();
  game.scene.add(crystals);

  const groveCenters=[[55,-38],[-55,-35]];
  groveCenters.forEach(([x,z],index)=>{
    const groundRing=new THREE.Mesh(
      new THREE.TorusGeometry(index===0?4.8:3.9,.055,8,64),
      new THREE.MeshStandardMaterial({
        color:'#69cbb9',emissive:'#246f70',emissiveIntensity:.32,
        roughness:.42,metalness:.18
      })
    );
    groundRing.rotation.x=Math.PI/2;
    groundRing.position.set(x,terrainElevationAt(x,z)+.055,z);
    game.scene.add(groundRing);
    const light=new THREE.PointLight('#77d9cf',1.25,11,2);
    light.position.set(x,terrainElevationAt(x,z)+2.2,z);
    game.scene.add(light);
  });
  game.crystalGroves=crystals;
}

function addStarlightShrine(game,x=0,z=50){
  const stone=new THREE.MeshStandardMaterial({
    color:'#b8b19c',roughness:.9,flatShading:true
  });
  const trim=new THREE.MeshStandardMaterial({
    color:'#d5b879',metalness:.3,roughness:.46
  });
  const base=new THREE.Mesh(new THREE.CylinderGeometry(4.15,4.45,.34,16),stone);
  base.position.set(x,.17,z);
  base.receiveShadow=true;
  base.castShadow=true;
  game.scene.add(base);

  const border=new THREE.Mesh(
    new THREE.TorusGeometry(3.95,.09,8,64),
    trim
  );
  border.rotation.x=Math.PI/2;
  border.position.set(x,.34,z);
  game.scene.add(border);

  for(const side of [-1,1]){
    const pillar=new THREE.Mesh(
      new THREE.CylinderGeometry(.31,.43,3.15,8),
      stone
    );
    pillar.position.set(x+side*2.52,1.82,z+.18);
    pillar.castShadow=true;
    pillar.receiveShadow=true;
    game.scene.add(pillar);

    const capital=new THREE.Mesh(
      new THREE.BoxGeometry(.92,.24,.82),
      trim
    );
    capital.position.set(x+side*2.52,3.48,z+.18);
    game.scene.add(capital);
    game.obstacles.push({x:x+side*2.52,z:z+.18,radius:.48,fixed:true});
  }

  const portal=new THREE.Mesh(
    new THREE.TorusGeometry(2.28,.19,10,48),
    trim
  );
  portal.position.set(x,3.42,z+.2);
  portal.castShadow=true;
  game.scene.add(portal);

  const crystal=new THREE.Mesh(
    new THREE.OctahedronGeometry(.62,1),
    new THREE.MeshStandardMaterial({
      color:'#b6eee0',emissive:'#4baf9c',emissiveIntensity:.72,
      roughness:.2,metalness:.18
    })
  );
  crystal.position.set(x,2.05,z+.05);
  crystal.scale.set(.72,1.6,.72);
  game.scene.add(crystal);

  const innerRing=new THREE.Mesh(
    new THREE.TorusGeometry(.92,.035,8,48),
    new THREE.MeshBasicMaterial({color:'#a9e6d6'})
  );
  innerRing.position.set(x,2.05,z+.05);
  innerRing.rotation.set(.65,.35,.15);
  game.scene.add(innerRing);

  const light=new THREE.PointLight('#a2e8d9',2.2,13,2);
  light.position.set(x,2.5,z+.65);
  game.scene.add(light);
  game.starlightShrine={crystal,portal};
}

function addStandingStone(game,x,z,height=2.1,lean=0){
  const group=new THREE.Group();group.position.set(x,terrainElevationAt(x,z),z);group.rotation.z=lean;game.scene.add(group);
  const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(.7,0),new THREE.MeshStandardMaterial({color:'#a9a58b',roughness:.96,flatShading:true}));
  stone.scale.set(.72,height,0.48);stone.position.y=height*.55;stone.castShadow=true;stone.receiveShadow=true;group.add(stone);
  const rune=new THREE.Mesh(new THREE.BoxGeometry(.045,height*.38,.025),new THREE.MeshBasicMaterial({color:'#e4c985',transparent:true,opacity:.65}));
  rune.position.set(0,height*.6,.34);group.add(rune);
  game.obstacles.push({x,z,radius:.62,fixed:true});
}

function addCottage(game,x,z){
  const group=new THREE.Group();group.position.set(x,terrainElevationAt(x,z),z);game.scene.add(group);
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
  waterMat.onBeforeCompile=shader=>{
    shader.uniforms.uWaterTime={value:0};
    shader.vertexShader=shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nuniform float uWaterTime;'
    );
    shader.vertexShader=shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      transformed.y += sin(position.x * 0.85 + position.z * 1.15 + uWaterTime * 1.6) * 0.012
        + cos(position.x * 1.25 - position.z * 0.65 + uWaterTime * 1.05) * 0.008;`
    );
    shader.fragmentShader=shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nuniform float uWaterTime;'
    );
    shader.fragmentShader=shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float waterGlint = sin(gl_FragCoord.x * 0.027 + gl_FragCoord.y * 0.013 + uWaterTime * 2.0);
      diffuseColor.rgb *= 0.985 + waterGlint * 0.018;`
    );
    waterMat.userData.shader=shader;
  };
  const water=new THREE.Mesh(geometry,waterMat);water.receiveShadow=true;game.scene.add(water);game.waterMaterial=waterMat;

  const bankGeometry=new THREE.IcosahedronGeometry(.28,0);
  const bankMaterial=new THREE.MeshStandardMaterial({color:'#d0b886',roughness:1,flatShading:true});
  const bankPebbles=new THREE.InstancedMesh(bankGeometry,bankMaterial,points.length);
  const pebbleTransform=new THREE.Object3D();
  points.forEach(([x,z],i)=>{
    pebbleTransform.position.set(x,-.01,z+(x%2?.95:-.95));
    pebbleTransform.scale.set(1,.4,.65);
    pebbleTransform.updateMatrix();
    bankPebbles.setMatrixAt(i,pebbleTransform.matrix);
  });
  bankPebbles.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  bankPebbles.receiveShadow=true;
  bankPebbles.computeBoundingSphere();
  game.scene.add(bankPebbles);
  game.riverCurve=curve;
}


function addRiverBankLife(game){
  const curve=game.riverCurve;
  if(!curve)return;

  const random=seeded(28471);
  const stemGeometry=new THREE.CylinderGeometry(.018,.033,.55,5);
  const stemMaterial=new THREE.MeshStandardMaterial({color:'#6e9a67',roughness:1,flatShading:true});
  const leafGeometry=new THREE.ConeGeometry(.045,.36,5);
  const leafMaterial=new THREE.MeshStandardMaterial({color:'#83a96e',roughness:1,flatShading:true});
  const seedGeometry=new THREE.SphereGeometry(.052,6,5);
  const seedMaterial=new THREE.MeshStandardMaterial({color:'#bd9563',roughness:.92,flatShading:true});
  const reedCount=24;
  const reeds=new THREE.InstancedMesh(stemGeometry,stemMaterial,reedCount);
  const leaves=new THREE.InstancedMesh(leafGeometry,leafMaterial,reedCount*2);
  const seedHeads=new THREE.InstancedMesh(seedGeometry,seedMaterial,reedCount);
  const dummy=new THREE.Object3D();
  let reedIndex=0,leafIndex=0;

  [0.08,.22,.37,.55,.72,.9].forEach((t,index)=>{
    const point=curve.getPointAt(t);
    const tangent=curve.getTangentAt(t).normalize();
    const side=new THREE.Vector3(tangent.z,0,-tangent.x).normalize();
    const bankSign=index%2===0?1:-1;
    for(let j=0;j<4;j++){
      if(reedIndex>=reedCount)break;
      const along=(j-1.5)*.14;
      const location=point.clone()
        .addScaledVector(side,bankSign*(1.22+random()*.2))
        .addScaledVector(tangent,along);
      const height=.42+random()*.34;
      const lean=(random()-.5)*.26;
      dummy.position.set(location.x,height*.5,location.z);
      dummy.rotation.set(0,random()*TAU,lean);
      dummy.scale.set(1,height/.55,1);
      dummy.updateMatrix();
      reeds.setMatrixAt(reedIndex,dummy.matrix);

      dummy.position.set(location.x+Math.sin(lean)*height*.42,height+.025,location.z);
      dummy.rotation.set(0,0,lean);
      dummy.scale.set(.72,1.05,.72);
      dummy.updateMatrix();
      seedHeads.setMatrixAt(reedIndex,dummy.matrix);

      for(let leaf=0;leaf<2;leaf++){
        const direction=leaf===0?-1:1;
        dummy.position.set(location.x+direction*.075,height*.43,location.z+direction*.045);
        dummy.rotation.set(direction*.35,random()*TAU,direction*(.58+random()*.2));
        dummy.scale.set(1,.75+random()*.4,1);
        dummy.updateMatrix();
        leaves.setMatrixAt(leafIndex++,dummy.matrix);
      }
      reedIndex++;
    }
  });
  reeds.count=reedIndex;
  seedHeads.count=reedIndex;
  leaves.count=leafIndex;
  [reeds,leaves,seedHeads].forEach(mesh=>{
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow=false;
    mesh.receiveShadow=false;
    mesh.computeBoundingSphere();
    game.scene.add(mesh);
  });

  // A few restrained lily pads break up the reflective ribbon without hiding it.
  const padGeometry=new THREE.CircleGeometry(.23,10,.34,TAU-.55);
  const padMaterial=new THREE.MeshStandardMaterial({
    color:'#659b70',roughness:.86,side:THREE.DoubleSide,flatShading:true
  });
  const pads=new THREE.InstancedMesh(padGeometry,padMaterial,10);
  const bloomGeometry=new THREE.SphereGeometry(.045,7,5);
  const bloomMaterial=new THREE.MeshStandardMaterial({
    color:'#f1d58a',emissive:'#8d642c',emissiveIntensity:.08,roughness:.7,flatShading:true
  });
  const blooms=new THREE.InstancedMesh(bloomGeometry,bloomMaterial,6);
  let padIndex=0,bloomIndex=0;
  [.16,.27,.43,.58,.76,.87].forEach((t,index)=>{
    const point=curve.getPointAt(t);
    const tangent=curve.getTangentAt(t).normalize();
    const side=new THREE.Vector3(tangent.z,0,-tangent.x).normalize();
    const offset=(random()-.5)*.8;
    const x=point.x+side.x*offset,z=point.z+side.z*offset;
    dummy.position.set(x,.012,z);
    dummy.rotation.set(-Math.PI/2,random()*TAU,0);
    const scale=.78+random()*.48;
    dummy.scale.set(scale,scale,.82*scale);
    dummy.updateMatrix();
    pads.setMatrixAt(padIndex++,dummy.matrix);
    if(index%2===0){
      dummy.position.set(x,.075,z);
      dummy.scale.setScalar(.85+random()*.3);
      dummy.rotation.set(0,0,0);
      dummy.updateMatrix();
      blooms.setMatrixAt(bloomIndex++,dummy.matrix);
    }
  });
  pads.count=padIndex;
  blooms.count=bloomIndex;
  [pads,blooms].forEach(mesh=>{
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow=false;
    mesh.receiveShadow=false;
    mesh.computeBoundingSphere();
    game.scene.add(mesh);
  });
}

function addMushrooms(game){
  const random=seeded(73621);
  const clusters=[
    [-13.25,-7.0,8],[13.2,-6.4,8],[-13.65,6.2,8],[13.5,6.25,8],
    [-7.55,10.35,7],[7.35,10.3,7],[-16.0,-2.7,7],[16.0,.15,7],
    [-14.0,-11.05,6],[14.0,-10.9,6],
    [-31,-8,14],[-34,-20,10],[-25,-25,10],
    [30,-15,15],[36,-22,12],[25,-27,9],
    [-12,29,11],[0,35,12],[14,28,11],
    [-20,16,8],[22,14,9],[0,-31,10],
    [-62,26,10],[-65,10,9],[-55,-46,9],
    [57,26,10],[64,14,9],[56,-47,10],
    [-29,49,9],[29,49,9],[0,-51,9]
  ];
  const capacity=320;
  const stemGeometry=new THREE.CylinderGeometry(.058,.092,.34,7);
  const capGeometry=new THREE.SphereGeometry(.24,9,6,0,TAU,0,Math.PI/2);
  const spotGeometry=new THREE.SphereGeometry(.031,6,5);
  const mossGeometry=new THREE.SphereGeometry(1,7,5);
  const stemMaterial=new THREE.MeshStandardMaterial({
    color:'#e7d8bd',roughness:.9,flatShading:true
  });
  const capMaterial=new THREE.MeshStandardMaterial({
    color:'#ffffff',vertexColors:true,roughness:.62,flatShading:true
  });
  const spotMaterial=new THREE.MeshStandardMaterial({
    color:'#f8edcf',roughness:.82,flatShading:true
  });
  const mossMaterial=new THREE.MeshStandardMaterial({
    color:'#ffffff',vertexColors:true,roughness:1,flatShading:true
  });
  const stems=new THREE.InstancedMesh(stemGeometry,stemMaterial,capacity);
  const caps=new THREE.InstancedMesh(capGeometry,capMaterial,capacity);
  const spots=new THREE.InstancedMesh(spotGeometry,spotMaterial,capacity*3);
  const moss=new THREE.InstancedMesh(mossGeometry,mossMaterial,clusters.length*2);
  const dummy=new THREE.Object3D();
  const color=new THREE.Color();
  const capColors=['#cf7659','#b986a4','#d4a967','#809e7d','#bd795d'];
  const mossColors=['#668b5b','#789866','#8da56b'];
  let count=0,spotCount=0,mossCount=0,attempts=0;

  clusters.forEach(([cx,cz,wanted],clusterIndex)=>{
    // Soft moss at the foot of each group visually anchors the small mushrooms.
    for(let patch=0;patch<2;patch++){
      const angle=patch*Math.PI+clusterIndex*.43;
      const mossX=cx+Math.cos(angle)*.34;
       const mossZ=cz+Math.sin(angle)*.28;
       dummy.position.set(mossX,terrainElevationAt(mossX,mossZ)+.018,mossZ);
      dummy.scale.set(.48+random()*.2,.035,.32+random()*.16);
      dummy.rotation.set(0,random()*TAU,0);
      dummy.updateMatrix();
      moss.setMatrixAt(mossCount,dummy.matrix);
      color.set(mossColors[Math.floor(random()*mossColors.length)]);
      moss.setColorAt(mossCount++,color);
    }

    let placed=0,localAttempts=0;
    while(placed<wanted&&count<capacity&&localAttempts<48){
      localAttempts++;attempts++;
      const angle=random()*TAU;
      const radius=.24+random()*.92;
      const x=cx+Math.cos(angle)*radius;
      const z=cz+Math.sin(angle)*radius*.78;
      if(x<WORLD_BOUNDS.minX+1||x>WORLD_BOUNDS.maxX-1||z<WORLD_BOUNDS.minZ+1||z>WORLD_BOUNDS.maxZ-1||Math.hypot(x,z)<5.25)continue;
      if(distanceToPath(x,z)<1.38)continue;
      const blocked=(game.obstacles||[]).some(obstacle=>{
        if(obstacle.destroyed)return false;
        const ox=obstacle.fixed?obstacle.x:obstacle.group.position.x;
        const oz=obstacle.fixed?obstacle.z:obstacle.group.position.z;
        return Math.hypot(x-ox,z-oz)<(obstacle.radius||.5)+.46;
      });
      if(blocked)continue;

      const scale=.72+random()*.62;
      const stemHeight=.34*scale;
      const groundY=terrainElevationAt(x,z);
       dummy.position.set(x,groundY+stemHeight*.5,z);
      dummy.rotation.set(0,random()*TAU,(random()-.5)*.08);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      stems.setMatrixAt(count,dummy.matrix);

      dummy.position.set(x,groundY+stemHeight,z);
      dummy.rotation.set(0,random()*TAU,0);
      dummy.scale.set(scale,scale*.82,scale);
      dummy.updateMatrix();
      caps.setMatrixAt(count,dummy.matrix);
      color.set(capColors[Math.floor(random()*capColors.length)]);
      caps.setColorAt(count,color);

      for(let dot=0;dot<3;dot++){
        const dotAngle=dot*TAU/3+random()*.25;
        const radial=.105*scale;
        const surfaceY=stemHeight+Math.sqrt(Math.max(.01,.24*.24-.105*.105))*scale+.009;
        const dotX=x+Math.cos(dotAngle)*radial;
         const dotZ=z+Math.sin(dotAngle)*radial;
         dummy.position.set(dotX,groundY+surfaceY,dotZ);
        dummy.scale.setScalar(.9+random()*.35);
        dummy.rotation.set(0,0,0);
        dummy.updateMatrix();
        spots.setMatrixAt(spotCount++,dummy.matrix);
      }
      count++;placed++;
    }
  });

  stems.count=count;
  caps.count=count;
  spots.count=spotCount;
  moss.count=mossCount;
  [stems,caps,spots,moss].forEach(mesh=>{
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow=false;
    mesh.receiveShadow=false;
    mesh.computeBoundingSphere();
    game.scene.add(mesh);
  });
}


function addMoonPond(game){
  const centerX=-31,centerZ=-8;
  const waterMaterial=new THREE.MeshPhysicalMaterial({
    color:'#76c3cf',roughness:.2,metalness:.1,transparent:true,opacity:.91,
    clearcoat:.82,clearcoatRoughness:.16,side:THREE.DoubleSide
  });
  waterMaterial.onBeforeCompile=shader=>{
    shader.uniforms.uPondTime={value:0};
    shader.fragmentShader=shader.fragmentShader.replace(
      '#include <common>','#include <common>\\nuniform float uPondTime;'
    );
    shader.fragmentShader=shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float pondRipple = sin(gl_FragCoord.x * .035 + gl_FragCoord.y * .022 + uPondTime * 1.65);
      diffuseColor.rgb *= .982 + pondRipple * .022;`
    );
    waterMaterial.userData.shader=shader;
  };
  const water=new THREE.Mesh(new THREE.CircleGeometry(1,64),waterMaterial);
  water.rotation.x=-Math.PI/2;
  water.scale.set(8.15,5.7,1);
  water.position.set(centerX,-.035,centerZ);
  water.receiveShadow=true;
  game.scene.add(water);
  game.pondMaterial=waterMaterial;

  const bankGeometry=new THREE.DodecahedronGeometry(.48,0);
  const bankMaterial=new THREE.MeshStandardMaterial({color:'#aaa58a',roughness:.95,flatShading:true});
  const bank=new THREE.InstancedMesh(bankGeometry,bankMaterial,24);
  const dummy=new THREE.Object3D();
  const random=seeded(9182);
  for(let i=0;i<24;i++){
    const angle=i/24*TAU;
    const x=centerX+Math.cos(angle)*(8.9+random()*.45);
    const z=centerZ+Math.sin(angle)*(6.35+random()*.4);
    const scale=.72+random()*.7;
    dummy.position.set(x,.12,z);
    dummy.scale.set(scale,.48+random()*.38,scale*.82);
    dummy.rotation.set(random()*.15,random()*TAU,random()*.15);
    dummy.updateMatrix();
    bank.setMatrixAt(i,dummy.matrix);
    game.obstacles.push({x,z,radius:.48*scale,fixed:true});
  }
  bank.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  bank.castShadow=true;
  bank.receiveShadow=true;
  bank.computeBoundingSphere();
  game.scene.add(bank);

  const padGeometry=new THREE.CircleGeometry(.26,12);
  const padMaterial=new THREE.MeshStandardMaterial({color:'#699c70',roughness:.82,side:THREE.DoubleSide,flatShading:true});
  const pads=new THREE.InstancedMesh(padGeometry,padMaterial,8);
  const bloomGeometry=new THREE.IcosahedronGeometry(.075,0);
  const bloomMaterial=new THREE.MeshStandardMaterial({color:'#f5d98d',emissive:'#956d35',emissiveIntensity:.1,roughness:.65});
  const blooms=new THREE.InstancedMesh(bloomGeometry,bloomMaterial,3);
  for(let i=0;i<8;i++){
    const angle=i/8*TAU+.22;
    const x=centerX+Math.cos(angle)*(2+random()*3.5);
    const z=centerZ+Math.sin(angle)*(1.4+random()*2.5);
    dummy.position.set(x,-.004,z);
    dummy.rotation.set(-Math.PI/2,random()*TAU,0);
    const scale=.7+random()*.9;
    dummy.scale.set(scale,scale,scale);
    dummy.updateMatrix();
    pads.setMatrixAt(i,dummy.matrix);
    if(i%2===0){
      dummy.position.set(x,.065,z);
      dummy.rotation.set(0,0,0);
      dummy.scale.setScalar(.8+random()*.4);
      dummy.updateMatrix();
      blooms.setMatrixAt(i/2,dummy.matrix);
    }
  }
  [pads,blooms].forEach(mesh=>{
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow=false;mesh.receiveShadow=false;mesh.computeBoundingSphere();game.scene.add(mesh);
  });
}

function addAncientRuins(game,x=1,z=-31){
  const stoneMat=new THREE.MeshStandardMaterial({color:'#a9a18b',roughness:.97,flatShading:true});
  const goldMat=new THREE.MeshStandardMaterial({color:'#d7b778',metalness:.3,roughness:.5,emissive:'#76592f',emissiveIntensity:.12});
  for(let i=0;i<9;i++){
    const angle=i/9*TAU+.16;
    const radius=5.1+(i%3)*.18;
    addStandingStone(
      game,
      x+Math.cos(angle)*radius,
      z+Math.sin(angle)*radius,
      1.7+(i%3)*.42,
      Math.sin(angle)*.1
    );
  }
  const ring=new THREE.Mesh(
    new THREE.TorusGeometry(4.65,.065,8,96),
    goldMat
  );
  ring.rotation.x=Math.PI/2;
  ring.position.set(x,.105,z);
  game.scene.add(ring);
  const innerRing=new THREE.Mesh(
    new THREE.TorusGeometry(2.2,.035,7,72),
    stoneMat
  );
  innerRing.rotation.x=Math.PI/2;
  innerRing.position.set(x,.11,z);
  game.scene.add(innerRing);
  for(let i=0;i<6;i++){
    const a=i/6*TAU;
    const rune=new THREE.Mesh(
      new THREE.OctahedronGeometry(.2,0),
      new THREE.MeshStandardMaterial({color:'#e6d6a5',emissive:'#9c8955',emissiveIntensity:.24,flatShading:true})
    );
    rune.position.set(x+Math.cos(a)*3.25,.18,z+Math.sin(a)*3.25);
    rune.scale.set(.6,.35,1.1);
    game.scene.add(rune);
  }
}


function addWoodlandBridge(game){
  const centerX=10.1,centerZ=-9.35;
  const wood=new THREE.MeshStandardMaterial({color:'#906747',roughness:.88,flatShading:true});
  const sunlitWood=new THREE.MeshStandardMaterial({color:'#bd9163',roughness:.82,flatShading:true});
  const darkWood=new THREE.MeshStandardMaterial({color:'#654b3a',roughness:.94,flatShading:true});
  const brass=new THREE.MeshStandardMaterial({color:'#d6b879',metalness:.48,roughness:.38});
  const deck=new THREE.Group();
  deck.position.set(centerX,-.14,centerZ);
  game.scene.add(deck);

  // Individual planks create a hand-built silhouette while sharing their material.
  for(let i=0;i<12;i++){
    const plank=new THREE.Mesh(
      new THREE.BoxGeometry(2.62,.13,.245),
      i%3===0?sunlitWood:wood
    );
    plank.position.set(0,.12,-1.62+i*.295);
    plank.rotation.y=(i%2===0?1:-1)*.008;
    plank.castShadow=true;
    plank.receiveShadow=true;
    deck.add(plank);
  }

  for(const side of [-1,1]){
    const rail=new THREE.Mesh(new THREE.BoxGeometry(.16,.18,3.55),darkWood);
    rail.position.set(side*1.28,.88,0);
    rail.castShadow=true;
    deck.add(rail);
    for(const z of [-1.52,0,1.52]){
      const post=new THREE.Mesh(new THREE.BoxGeometry(.18,.92,.18),wood);
      post.position.set(side*1.28,.51,z);
      post.castShadow=true;
      deck.add(post);
      const cap=new THREE.Mesh(new THREE.SphereGeometry(.12,7,5),brass);
      cap.position.set(side*1.28,.99,z);
      deck.add(cap);
    }
  }

  for(const z of [-1.72,1.72]){
    const support=new THREE.Mesh(new THREE.BoxGeometry(2.86,.22,.24),darkWood);
    support.position.set(0,-.045,z);
    support.castShadow=true;
    deck.add(support);
  }

  // Warm lanterns at both ends make the crossing readable at a glance.
  for(const z of [-1.9,1.9]){
    const lantern=new THREE.Group();
    lantern.position.set(0,.05,z);
    deck.add(lantern);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.36,7),brass);
    stem.position.y=1.08;
    lantern.add(stem);
    const glow=new THREE.Mesh(
      new THREE.OctahedronGeometry(.12,1),
      new THREE.MeshStandardMaterial({
        color:'#ffe5a7',emissive:'#d98c3f',emissiveIntensity:.8,
        roughness:.25,metalness:.12
      })
    );
    glow.position.y=1.3;
    lantern.add(glow);
    const light=new THREE.PointLight('#ffd18c',.48,3.4,2);
    light.position.y=1.3;
    lantern.add(light);
  }

  game.bridge=deck;
}

function addRockOutcrops(game){
  const random=seeded(57291);
  const clusters=[
    [-41,23,11],[40,22,11],[-41,-28,10],[41,-29,10],
    [-22,32,9],[24,32,9],[-22,-31,9],[24,-31,9],
    [-45,2,7],[45,3,7],
    [-64,43,11],[64,43,11],[-64,-43,11],[64,-43,11],
    [-31,53,8],[31,53,8],[-31,-53,8],[31,-53,8]
  ];
  const capacity=220;
  const geometry=new THREE.IcosahedronGeometry(.72,1);
  const material=new THREE.MeshStandardMaterial({
    color:'#ffffff',vertexColors:true,roughness:.96,flatShading:true
  });
  const mossGeometry=new THREE.SphereGeometry(1,7,5);
  const mossMaterial=new THREE.MeshStandardMaterial({
    color:'#ffffff',vertexColors:true,roughness:1,flatShading:true
  });
  const rocks=new THREE.InstancedMesh(geometry,material,capacity);
  const moss=new THREE.InstancedMesh(mossGeometry,mossMaterial,capacity);
  const dummy=new THREE.Object3D();
  const color=new THREE.Color();
  const rockColors=['#8c958a','#a09b88','#7f8980','#9c907d','#858f88'];
  const mossColors=['#688d5e','#7c9a67','#91a36c'];
  let count=0,mossCount=0;

  clusters.forEach(([cx,cz,wanted])=>{
    let placed=0,attempts=0;
    while(placed<wanted&&count<capacity&&attempts<wanted*12){
      attempts++;
      const angle=random()*TAU;
      const radius=.4+random()*2.2;
      const x=cx+Math.cos(angle)*radius;
      const z=cz+Math.sin(angle)*radius*.82;
      if(x<WORLD_BOUNDS.minX+1.2||x>WORLD_BOUNDS.maxX-1.2||
        z<WORLD_BOUNDS.minZ+1.2||z>WORLD_BOUNDS.maxZ-1.2)continue;
      if(distanceToPath(x,z)<2.3)continue;
      if(Math.hypot(x+31,z+8)<10.5)continue;
      if(Math.hypot(x-1,z+31)<9.2)continue;
      const blocked=(game.obstacles||[]).some(obstacle=>{
        if(obstacle.destroyed)return false;
        const ox=obstacle.fixed?obstacle.x:obstacle.group.position.x;
        const oz=obstacle.fixed?obstacle.z:obstacle.group.position.z;
        return Math.hypot(x-ox,z-oz)<(obstacle.radius||.55)+.65;
      });
      if(blocked)continue;

      const scale=.46+random()*.72;
      const sx=scale*(.78+random()*.42),sz=scale*(.78+random()*.42);
      const groundY=terrainElevationAt(x,z);
       dummy.position.set(x,groundY+scale*.45,z);
      dummy.scale.set(sx,scale*(.68+random()*.35),sz);
      dummy.rotation.set(random()*.24,random()*TAU,random()*.2);
      dummy.updateMatrix();
      rocks.setMatrixAt(count,dummy.matrix);
      color.set(rockColors[Math.floor(random()*rockColors.length)]);
      rocks.setColorAt(count,color);

      if(random()<.62){
        const mossX=x+(random()-.5)*.24;
         const mossZ=z+(random()-.5)*.22;
         dummy.position.set(mossX,terrainElevationAt(mossX,mossZ)+scale*.82,mossZ);
        dummy.scale.set(scale*.42,.055+random()*.035,scale*.3);
        dummy.rotation.set(0,random()*TAU,random()*.08);
        dummy.updateMatrix();
        moss.setMatrixAt(mossCount,dummy.matrix);
        color.set(mossColors[Math.floor(random()*mossColors.length)]);
        moss.setColorAt(mossCount++,color);
      }

      game.obstacles.push({x,z,radius:.42*Math.max(sx,sz),fixed:true});
      count++;placed++;
    }
  });

  rocks.count=count;
  moss.count=mossCount;
  [rocks,moss].forEach(mesh=>{
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    mesh.computeBoundingSphere();
    game.scene.add(mesh);
  });
}


function addSkyDome(game){
  const material=new THREE.ShaderMaterial({
    vertexShader:`
      varying vec3 vSkyDirection;
      void main(){
        vSkyDirection=normalize(position);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader:`
      varying vec3 vSkyDirection;
      void main(){
        float elevation=clamp(normalize(vSkyDirection).y,-0.18,1.0);
        float blend=smoothstep(-0.14,0.82,elevation);
        vec3 horizon=vec3(0.82,0.88,0.78);
        vec3 zenith=vec3(0.31,0.59,0.74);
        vec3 sky=mix(horizon,zenith,blend);
        vec3 sunDirection=normalize(vec3(-0.36,0.82,0.42));
        float sunDot=max(dot(normalize(vSkyDirection),sunDirection),0.0);
        float halo=pow(sunDot,9.0)*0.12;
        float sunDisc=pow(sunDot,62.0)*0.24;
        sky=mix(sky,vec3(1.0,0.91,0.72),halo);
        sky+=vec3(1.0,0.74,0.48)*sunDisc;
        gl_FragColor=vec4(sky,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side:THREE.BackSide,
    depthTest:false,
    depthWrite:false,
    toneMapped:false
  });
  const dome=new THREE.Mesh(new THREE.SphereGeometry(280,48,28),material);
  dome.frustumCulled=false;
  dome.renderOrder=-1000;
  game.scene.add(dome);
  game.skyDome=dome;
}

function addDistantMountainBackdrop(game){
  const layout=createDistantMountainLayout();
  const geometry=new THREE.ConeGeometry(1,1,8,3);
  const position=geometry.attributes.position;
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),z=position.getZ(i),y=position.getY(i);
    const angle=Math.atan2(z,x);
    const variation=1+Math.sin(angle*3.0+y*13.0)*0.11;
    position.setX(i,x*variation);
    position.setZ(i,z*variation);
  }
  geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({
    color:'#ffffff',
    roughness:1,
    metalness:0,
    flatShading:true
  });
  const peaks=new THREE.InstancedMesh(geometry,material,layout.length);
  const dummy=new THREE.Object3D();
  const color=new THREE.Color();
  layout.forEach((mountain,index)=>{
    dummy.position.set(
      mountain.x,
      mountain.baseY+mountain.height*.5,
      mountain.z
    );
    dummy.scale.set(mountain.width,mountain.height,mountain.depth);
    dummy.rotation.set(0,mountain.rotationY,0);
    dummy.updateMatrix();
    peaks.setMatrixAt(index,dummy.matrix);
    color.set(mountain.tint);
    peaks.setColorAt(index,color);
  });
  peaks.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  peaks.castShadow=false;
  peaks.receiveShadow=false;
  peaks.frustumCulled=false;
  game.scene.add(peaks);
  game.distantMountains=peaks;
}

function addCloudLayer(game){
  const layout=createCloudPuffLayout();
  const geometry=new THREE.SphereGeometry(1,14,9);
  const material=new THREE.MeshStandardMaterial({
    color:'#ffffff',
    roughness:1,
    metalness:0,
    flatShading:false
  });
  const mesh=new THREE.InstancedMesh(geometry,material,layout.length);
  const dummy=new THREE.Object3D();
  const color=new THREE.Color();
  layout.forEach((puff,index)=>{
    dummy.position.set(
      puff.x+puff.offsetX,
      puff.y+puff.offsetY,
      puff.z+puff.offsetZ
    );
    dummy.scale.set(puff.scaleX,puff.scaleY,puff.scaleZ);
    dummy.rotation.set(0,puff.rotationY,0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index,dummy.matrix);
    color.set(puff.tint);
    mesh.setColorAt(index,color);
  });
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow=false;
  mesh.receiveShadow=false;
  mesh.frustumCulled=false;
  game.scene.add(mesh);
  game.cloudLayer={mesh,layout,dummy};
}

export function buildMeadowArena(game){
  game.treeTops=[];game.windmills=[];game.windShaders=[];game.effectsGround=[];
  addSkyDome(game);
  addCloudLayer(game);
  addDistantMountainBackdrop(game);
  const groundGeometry=new THREE.PlaneGeometry(
    WORLD_SIZE.width,
    WORLD_SIZE.depth,
    Math.round(WORLD_SIZE.width*2),
    Math.round(WORLD_SIZE.depth*2)
  );
  const groundPositions=groundGeometry.attributes.position;
  for(let index=0;index<groundPositions.count;index++){
    const x=groundPositions.getX(index);
    const z=-groundPositions.getY(index);
    groundPositions.setZ(index,terrainElevationAt(x,z));
  }
  groundPositions.needsUpdate=true;
  groundGeometry.computeVertexNormals();
  groundGeometry.computeBoundingBox();
  groundGeometry.computeBoundingSphere();
  const ground=new THREE.Mesh(
    groundGeometry,
    new THREE.MeshStandardMaterial({map:meadowTexture(),roughness:1,metalness:0})
  );
  ground.rotation.x=-Math.PI/2;ground.position.y=-.09;ground.receiveShadow=true;game.scene.add(ground);game.terrainMesh=ground;

  const outerGrass=new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE.width+44,WORLD_SIZE.depth+44),
    new THREE.MeshStandardMaterial({color:'#6e9862',roughness:1})
  );
  outerGrass.rotation.x=-Math.PI/2;outerGrass.position.set(0,-1.05,0);outerGrass.receiveShadow=true;game.scene.add(outerGrass);

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
  addRiverBankLife(game);
  addMoonPond(game);
  addWoodlandBridge(game);
  const hillMat=new THREE.MeshStandardMaterial({color:'#8eaf78',roughness:1,flatShading:true});
  [
    [-17,-13,7,4,8],[0,-18,11,5,7],[18,-14,8,4,9],[-22,0,7,6,8],[24,3,8,5,8],
    [-63,-52,15,5,13],[0,-53,18,6,10],[63,-52,15,5,13],
    [-64,0,16,6,18],[64,0,16,6,18],
    [-63,52,15,5,13],[0,53,18,6,10],[63,52,15,5,13],
    [-80,-60,19,7,16],[0,-72,21,7,13],[80,-60,19,7,16],
    [-82,0,18,8,20],[82,0,18,8,20],
    [-80,60,19,7,16],[0,72,21,7,13],[80,60,19,7,16]
  ].forEach(([x,z,sx,sy,sz])=>{
    const hill=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),hillMat);
    hill.position.set(x,terrainElevationAt(x,z)+sy*.35,z);hill.scale.set(sx,sy,sz);hill.receiveShadow=true;game.scene.add(hill);
  });

  // Small landmarks in the distance make the meadow feel like a place.
  addCottage(game,-8.9,-12.1);
  addWindmill(game,8.9,-12.4);
  [[-4.9,-10.4],[0,-11.8],[4.3,-10.6]].forEach(([x,z],i)=>addStandingStone(game,x,z,2.0+(i%2)*.5,(i-1)*.08));

  const trees=[
    [-11.2,-4.8,1.05,.2],[11.3,-4.2,1.05,1.1],[-10.8,4.7,.92,2.1],
    [10.9,4.2,.98,2.7],[-6.1,8.1,.88,3.6],[5.7,8.4,.92,4.4],
    [-15,-1.7,1.2,5.1],[15.2,1.4,1.12,5.8],
    [-38,-20,1.2,.35],[-41,5,1.35,1.3],[-25,-23,1.05,2.2],[-22,7,.95,3.1],
    [22,-5,1.0,3.8],[41,-8,1.28,4.6],[23,-25,1.15,5.2],[41,-25,1.25,5.8],
    [-17,25,1.1,.7],[-12,36,1.2,1.7],[13,35,1.25,2.7],[17,24,1.05,3.7],
    [-15,-32,1.2,4.7],[15,-34,1.25,5.7],
    [-50,-29,1.25,.2],[-50,-10,1.3,.8],[-50,10,1.3,1.4],[-50,29,1.25,2.0],
    [50,-29,1.25,2.6],[50,-10,1.3,3.2],[50,10,1.3,3.8],[50,29,1.25,4.4],
    [-33,-40,1.2,5.0],[-12,-40,1.2,5.6],[12,-40,1.2,6.2],[33,-40,1.2,6.8],
    [-33,40,1.2,7.4],[-12,40,1.2,8.0],[12,40,1.2,8.6],[33,40,1.2,9.2],
    [-68,-18,1.3,9.8],[-68,18,1.25,10.4],[68,-18,1.3,11.0],[68,18,1.25,11.6],
    [-42,-52,1.25,12.2],[42,-52,1.25,12.8],[-42,52,1.25,13.4],[42,52,1.25,14.0]
  ];
  trees.forEach(([x,z,s,p])=>addTree(game,x,z,s,p));
  addTree(game,0,30,1.85,5.5);
  addStarlightShrine(game,0,50);
  addPeripheralPineForest(game);
  addCrystalGroves(game);
  addBushes(game,[
    [-8.8,-1.8,.8],[8.6,-2.8,.92],[-8.9,5.9,1.04],[8.7,5.8,.8],
    [-13,3.2,.92],[13,-4.5,1.04],[-4.8,9.3,.8],[3.4,9.5,.92],
    [-36,-2,.95],[-25,-18,.9],[-23,13,1.0],[20,-3,.9],
    [37,-2,1.0],[25,-25,.92],[-18,31,.9],[18,31,1.0],
    [-63,-17,1.0],[-57,15,.9],[62,15,1.0],[58,-27,.9],
    [-31,50,1.05],[31,50,1.0],[-31,-49,.95],[31,-49,1.0]
  ]);

  addGrass(game);
  addFlowers(game);
  addFireflies(game);

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
  addAncientRuins(game);
  addRockOutcrops(game);
  addMushrooms(game);
}

export function animateMeadow(game,worldDt,realDt=worldDt){
  if(game.player){
    const p=game.player.position;
    const target=game.cameraTarget||(game.cameraTarget=new THREE.Vector3());
    const look=game.cameraLookTarget||(game.cameraLookTarget=new THREE.Vector3());
    const orbit=game.cameraOrbit||{yaw:0,pitch:.533,distance:11.9};
    // Keep the orbit pivot on the player, with a small movement-aware lead.
    // This avoids the world-fixed focus offset drifting sideways after camera orbit.
    const move=game.playerMove||{x:0,y:0};
    const speed=Math.min(1,Math.hypot(move.x,move.y)/5.2);
    look.set(
      p.x+move.x*.085,
      terrainElevationAt(p.x,p.z)+1.32,
      p.z+move.y*.085
    );
    const horizontal=Math.cos(orbit.pitch)*orbit.distance;
    target.set(
      look.x+Math.sin(orbit.yaw)*horizontal,
      look.y+Math.sin(orbit.pitch)*orbit.distance,
      look.z+Math.cos(orbit.yaw)*horizontal
    );
    // The focus point reacts slightly faster than the camera body to keep
    // the wizard visually anchored during turns and direction changes.
    const positionAlpha=1-Math.exp(-realDt*4.8);
    const focusAlpha=1-Math.exp(-realDt*(5.8+speed*.8));
    game.camera.position.lerp(target,positionAlpha);
    game.cameraLook.lerp(look,focusAlpha);
    game.camera.lookAt(game.cameraLook);
    if(game.sunLight){
      game.sunLight.position.set(p.x-12,p.y+24,p.z+10);
      game.sunLight.target.position.set(p.x,p.y,p.z);
    }
  }
  const shader=game.grassMaterial?.userData?.shader;
  if(shader?.uniforms?.uMeadowTime)shader.uniforms.uMeadowTime.value=game.worldTime;
  const waterShader=game.waterMaterial?.userData?.shader;
  if(waterShader?.uniforms?.uWaterTime)waterShader.uniforms.uWaterTime.value=game.worldTime;
  const pondShader=game.pondMaterial?.userData?.shader;
  if(pondShader?.uniforms?.uPondTime)pondShader.uniforms.uPondTime.value=game.worldTime;
  if(game.cloudLayer){
    const {mesh,layout,dummy}=game.cloudLayer;
    layout.forEach((puff,index)=>{
      const phase=game.worldTime*.035+puff.phase;
      dummy.position.set(
        puff.x+puff.offsetX+Math.sin(phase)*puff.driftX,
        puff.y+puff.offsetY,
        puff.z+puff.offsetZ+Math.cos(phase)*puff.driftZ
      );
      dummy.scale.set(puff.scaleX,puff.scaleY,puff.scaleZ);
      dummy.rotation.set(0,puff.rotationY,0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index,dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;
  }
  game.treeTops?.forEach(t=>{t.group.rotation.z=Math.sin(game.worldTime*.72+t.phase)*t.amount;t.group.rotation.x=Math.cos(game.worldTime*.58+t.phase)*t.amount*.55;});
  game.windmills?.forEach((m,i)=>{m.rotation.z+=worldDt*(.34+i*.025);});
  if(game.magicCore){
    game.magicCore.rotation.y+=worldDt*.24;
    game.magicCore.rotation.x=Math.sin(game.worldTime*.35)*.09;
    game.magicCore.position.y=2.55+Math.sin(game.worldTime*1.6)*.1;
    game.magicOrbits[0].rotation.z+=worldDt*.55;game.magicOrbits[1].rotation.y-=worldDt*.42;
  }
  if(game.cottageSmoke)game.cottageSmoke.position.y=4.1+Math.sin(game.worldTime*.45)*.13;
  if(game.fireflies){
    const attribute=game.fireflies.points.geometry.attributes.position;
    for(let i=0;i<game.fireflies.phases.length;i++){
      const phase=game.fireflies.phases[i],k=i*3;
      attribute.array[k]=game.fireflies.base[k]+Math.sin(game.worldTime*.42+phase)*.16;
      attribute.array[k+1]=game.fireflies.base[k+1]+Math.sin(game.worldTime*1.35+phase)*.28;
      attribute.array[k+2]=game.fireflies.base[k+2]+Math.cos(game.worldTime*.36+phase)*.14;
    }
    attribute.needsUpdate=true;
    game.fireflies.points.material.opacity=.52+Math.sin(game.worldTime*2.1)*.16;
  }
}
