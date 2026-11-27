const COUNT=64,SIZE=250,HALF_DIAGONAL=176.7767,PHI=.61803398875;
const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const centroid=p=>p.reduce((s,v)=>({x:s.x+v.x/p.length,y:s.y+v.y/p.length}),{x:0,y:0});
export function resamplePath(input,count=COUNT){
  if(!Array.isArray(input)||!input.length||count<2)return [];
  if(input.length===1)return Array.from({length:count},()=>({...input[0]}));
  const cum=new Array(input.length).fill(0);
  for(let i=1;i<input.length;i++)cum[i]=cum[i-1]+distance(input[i-1],input[i]);
  const total=cum.at(-1);if(total<=1e-6)return Array.from({length:count},()=>({...input[0]}));
  const out=[];let seg=1;
  for(let i=0;i<count;i++){const d=total*i/(count-1);while(seg<cum.length-1&&cum[seg]<d)seg++;const start=cum[seg-1],len=cum[seg]-start,t=len<=1e-6?0:(d-start)/len,a=input[seg-1],b=input[seg];out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
  return out;
}
export function normalizePath(input){
  const p=resamplePath(input);if(p.length!==COUNT)return null;const c=centroid(p),a=-Math.atan2(p[0].y-c.y,p[0].x-c.x),co=Math.cos(a),si=Math.sin(a);
  for(let i=0;i<p.length;i++){const x=p[i].x-c.x,y=p[i].y-c.y;p[i]={x:x*co-y*si,y:x*si+y*co};}
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  p.forEach(v=>{minX=Math.min(minX,v.x);minY=Math.min(minY,v.y);maxX=Math.max(maxX,v.x);maxY=Math.max(maxY,v.y);});
  const sx=SIZE/Math.max(maxX-minX,1e-4),sy=SIZE/Math.max(maxY-minY,1e-4);p.forEach(v=>{v.x*=sx;v.y*=sy;});const cc=centroid(p);p.forEach(v=>{v.x-=cc.x;v.y-=cc.y;});return p;
}
const pathLength=p=>p.slice(1).reduce((s,v,i)=>s+distance(p[i],v),0);
function atAngle(p,t,a){const c=centroid(p),co=Math.cos(a),si=Math.sin(a);let total=0;for(let i=0;i<p.length;i++){const x=p[i].x-c.x,y=p[i].y-c.y;total+=distance({x:x*co-y*si,y:x*si+y*co},t[i]);}return total/p.length;}
function bestAngle(p,t){let a=-Math.PI*.25,b=Math.PI*.25,x1=PHI*a+(1-PHI)*b,x2=(1-PHI)*a+PHI*b,f1=atAngle(p,t,x1),f2=atAngle(p,t,x2);while(Math.abs(b-a)>Math.PI/90){if(f1<f2){b=x2;x2=x1;f2=f1;x1=PHI*a+(1-PHI)*b;f1=atAngle(p,t,x1);}else{a=x1;x1=x2;f1=f2;x2=(1-PHI)*a+PHI*b;f2=atAngle(p,t,x2);}}return Math.min(f1,f2);}
const circle=()=>Array.from({length:64},(_,i)=>{const a=2*Math.PI*i/63;return{x:Math.cos(a)*100,y:Math.sin(a)*100};});
const lightning=()=>[{x:-52,y:-112},{x:12,y:-28},{x:-26,y:-18},{x:46,y:26},{x:8,y:34},{x:50,y:116}];
const triangle=()=>[{x:0,y:-112},{x:106,y:82},{x:-106,y:82},{x:0,y:-112}];
const spiral=()=>Array.from({length:60},(_,i)=>{const t=i/59,a=t*Math.PI*4.4,r=112*(1-t);return{x:Math.cos(a)*r,y:Math.sin(a)*r};});
const star=()=>Array.from({length:11},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2===0?112:48;return{x:Math.cos(a)*r,y:Math.sin(a)*r};});
const defs=[['Fireball',circle()],['Thunderbolt',lightning()],['Frost',triangle()],['Gravity',spiral()],['Chaos',star()]];
const templates=defs.flatMap(([spell,p])=>[{spell,points:normalizePath(p)},{spell,points:normalizePath([...p].reverse())}]);
export function recognizeGesture(input){
  if(!Array.isArray(input)||input.length<4)return null;const len=pathLength(input),chord=distance(input[0],input.at(-1));
  if(len<70||len/Math.max(chord,.001)<1.12)return null;const p=normalizePath(input);if(!p)return null;
  let best=-Infinity,second=-Infinity,spell=null;
  for(const t of templates){const score=Math.max(0,Math.min(1,1-bestAngle(p,t.points)/HALF_DIAGONAL));if(score>best){if(spell!==t.spell)second=best;best=score;spell=t.spell;}else if(t.spell!==spell&&score>second)second=score;}
  if(best<.62||best-second<.035)return null;return{spell,confidence:best,margin:best-second};
}
export const SPELLS=Object.freeze({
  Fireball:{name:'Fireball',glyph:'○',color:'#ff875a'},
  Thunderbolt:{name:'Thunderbolt',glyph:'ϟ',color:'#ffe07b'},
  Frost:{name:'Frost',glyph:'△',color:'#83d8ff'},
  Gravity:{name:'Gravity',glyph:'◉',color:'#bc9aff'},
  Chaos:{name:'Chaos',glyph:'✶',color:'#ff9bce'}
});
