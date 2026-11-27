import test from 'node:test';
import assert from 'node:assert/strict';
import { recognizeGesture } from '../src/gesture.js';
const samples={
Fireball:Array.from({length:64},(_,i)=>{const a=2*Math.PI*i/63;return{x:180+Math.cos(a)*90,y:120+Math.sin(a)*90};}),
Thunderbolt:[{x:10,y:0},{x:65,y:38},{x:40,y:48},{x:100,y:90},{x:72,y:108},{x:120,y:170}],
Frost:[{x:0,y:0},{x:100,y:175},{x:-100,y:175},{x:0,y:0}],
Gravity:Array.from({length:60},(_,i)=>{const t=i/59,a=t*Math.PI*4.4,r=110*(1-t);return{x:Math.cos(a)*r,y:Math.sin(a)*r};}),
Chaos:Array.from({length:11},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2===0?110:48;return{x:Math.cos(a)*r,y:Math.sin(a)*r};})
};
test('recognizes all five one-stroke spell templates',()=>{for(const [name,points] of Object.entries(samples)){const r=recognizeGesture(points);assert.equal(r?.spell,name,name+' should be recognized');assert.ok(r.confidence>=.62);}});
test('rejects short strokes and straight lines',()=>{assert.equal(recognizeGesture([{x:0,y:0},{x:4,y:0},{x:8,y:0}]),null);const line=Array.from({length:30},(_,i)=>({x:i*6,y:i*2}));assert.equal(recognizeGesture(line),null);});
