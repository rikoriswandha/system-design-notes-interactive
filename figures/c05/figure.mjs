import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';

// Rotary dividing head: T-slotted bed, worm drive and perforated index plate,
// three stepped chuck jaws, a sprung crank plunger and successor probe.
// Live rim holes retain every hash position; only inspected pins are raised.
export async function build({ audit, argv }) {
  const base = { x: -115, y: -100, w: 230, d: 222, r: 12 };
  const P = k.fitProjection(k.boxCorners(base, -16, 61), WIDTH, HEIGHT, { pad: 18, elevation: 42, azimuth: 45 });
  P.origin[1] -= 20;
  const { S, L, D, at, halo } = painter(P);
  const R = A.recorder(P);
  let count = 0;
  function put(name, ref, svg, shape) {
    count++;
    R.put({ name: 'stand.' + name, piece: 'stand.frame', at: ref, svg, shapes: [R.solid(shape)] });
  }
  function box(name, plan, z, h, tone = 'mid', detail = '') {
    put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, 5, .6), { tone, inner: detail }), A.slab(plan, z, h, { name: 'stand.' + name }, 5));
  }
  function round(name, x, y, r, z, h, tone = 'mid', detail = '') {
    put(name, [x, y, z + h / 2], S(k.cylinder(x, y, r, z, h, P, r > 30 ? 96 : 24, .4), { tone, inner: detail }), A.cylinder(x, y, r, z, h, { name: 'stand.' + name }));
  }
  for (const [i, [x,y]] of k.corners(base, 19).entries()) {
    round('foot'+i, x,y,7,-16,5,'lo');
    round('shoe'+i,x,y,5,-11,3,'lo');
  }
  let bedDetail=L(k.sideSeam(base,-4,P,5)+k.planOutline(k.insetPlan(base,4),0,P,5),{tone:'faint'});
  for(const x of [-103,-72,72,103]) {
    bedDetail+=L(k.planOutline({x:x-2,y:-87,w:4,d:172,r:1},0,P,3),{tone:'lo'});
    bedDetail+=L(k.planOutline({x:x-4,y:-87,w:8,d:172,r:1},0,P,3),{tone:'faint'});
  }
  bedDetail+=L(k.corners(base,11).map(([x,y])=>k.ring(x,y,2.5,0,P,20)).join(''),{tone:'lo'});
  bedDetail+=D(k.corners(base,11).map(([x,y])=>at([x,y,0])),{size:.6,tone:'mid'});
  box('bed',base,-8,8,'lo',bedDetail);
  round('bearing-flange',0,0,60,0,5,'mid');
  round('bearing-case',0,0,49,5,16,'mid',L(k.sideArc(0,0,49,12,P,48),{tone:'faint'}));
  round('worm-wheel',0,0,85,21,5,'mid',L(k.knurl(0,0,85,21,26,120,P,0),{tone:'lo'}));
  let platterDetail=L(k.sideArc(0,0,89,30,P,64),{tone:'faint'});
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3;
    const radial=(u,v)=>[u*Math.cos(a)-v*Math.sin(a),u*Math.sin(a)+v*Math.cos(a)];
    platterDetail+=L(k.onTop([radial(25,-3),radial(67,-3),radial(67,3),radial(25,3)],35,P,true),{tone:'faint'});
  }
  round('platter',0,0,89,26,9,'hi',platterDetail);
  round('hub',0,0,24,35,5,'mid',L(k.ring(0,0,21,40,P,64),{tone:'lo'}));
  round('spindle',0,0,11,40,5,'hi',L(k.ring(0,0,7,45,P,40),{tone:'lo'}));
  for(let i=0;i<3;i++) {
    const a=i*Math.PI*2/3;
    const radial=(u,v)=>[u*Math.cos(a)-v*Math.sin(a),u*Math.sin(a)+v*Math.cos(a)];
    const plan=[radial(29,-6),radial(62,-6),radial(62,6),radial(29,6)];
    let detail='';
    for(let u=32;u<=58;u+=5)detail+=L(k.onTop([radial(u,-6),radial(u,6)],39,P),{tone:'lo'});
    put('jaw-bed'+i,[...radial(45,0),37],S(k.extrude(plan,35,4,P),{tone:'mid',inner:detail}),A.extruded(plan,35,4,{name:'stand.jaw-bed'+i}));
    for(const [step,[from,to,height]] of [[29,33,10],[33,38,7],[38,43,4]].entries()){
      const jaw=[radial(from,-5),radial(to,-5),radial(to,5),radial(from,5)];
      let grip='';
      if(-Math.cos(a)-Math.sin(a)>0)for(let z=41;z<39+height;z+=2)grip+=L(k.segment([...radial(from,-5),z],[...radial(from,5),z],P),{tone:'lo'});
      put('jaw'+i+'-step'+step,[...radial((from+to)/2,0),39+height/2],S(k.extrude(jaw,39,height,P),{tone:'hi',inner:grip}),A.extruded(jaw,39,height,{name:'stand.jaw'+i+'-step'+step}));
    }
    const screw=radial(53,0);round('jaw-bolt'+i,...screw,2,39,2,'mid');
  }
  box('worm-foot',{x:63,y:70,w:30,d:24,r:3},0,7);
  for(const [i,[x,y]]of [[65,72],[65,92],[91,92]].entries())round('worm-mount-bolt'+i,x,y,1.2,7,1.8,'mid');
  box('worm-case',{x:67,y:74,w:24,d:16,r:3},7,17,'mid',L(k.sideSeam({x:67,y:74,w:24,d:16,r:3},16,P,5),{tone:'faint'}));
  const wormFrame=G.frameAlong([20,82,16],[1,0,0]);
  const wormProfile=[[0,5],[28,5],[28,3],[47,3]];
  const wormThreads=[];
  const wormView=G.viewOf(P);
  let thread=[];
  for(let n=0;n<=768;n++){
    const fraction=n/768,a=fraction*Math.PI*16;
    const v=G.radialOf(wormFrame,a);
    if(G.dot3(v,wormView)>=0){thread.push(at(G.pointOf(wormFrame,fraction*28,5,a)));}
    else if(thread.length){if(thread.length>1)wormThreads.push(k.fadeLineSvg(thread,{tone:'lo',fade:[.6,.6]}));thread=[];}
  }
  if(thread.length>1)wormThreads.push(k.fadeLineSvg(thread,{tone:'lo',fade:[.6,.6]}));
  put('worm-spindle',[43.5,82,16],S(G.solidOf(wormProfile,wormFrame,P),{tone:'mid',inner:wormThreads.join('')}),A.solid(wormFrame,wormProfile,{name:'stand.worm-spindle'}));
  round('index-neck',79,82,5,24,5);
  const holes=[];
  for(let i=0;i<24;i++){const a=i*Math.PI/12;holes.push(k.ring(79+14*Math.cos(a),82+14*Math.sin(a),.8,33,P,12));}
  for(let i=0;i<16;i++){const a=i*Math.PI/8;holes.push(k.ring(79+10*Math.cos(a),82+10*Math.sin(a),.75,33,P,12));}
  round('index-plate',79,82,19,29,4,'mid',L(holes.join('')+k.ring(79,82,17,33,P,64),{tone:'lo'}));
  round('crank-pivot',79,82,4,33,3,'mid');
  box('crank-arm',{x:76,y:80,w:20,d:4,r:1},36,3,'hi');
  round('plunger-sleeve',94,82,2.4,39,3,'mid');
  round('plunger',94,82,1.3,42,5,'hi');
  round('plunger-grip',94,82,3.2,47,4,'mid',L(k.knurl(94,82,3.2,47,51,20,P,0),{tone:'lo'}));
  box('probe-seat',{x:-102,y:65,w:20,d:19,r:3},0,4);
  for(const [i,[x,y]]of [[-99,68],[-99,81],[-85,81]].entries())round('probe-mount-bolt'+i,x,y,1.1,4,1.5,'mid');
  round('probe-post-lower',-92,74,3,4,8);
  round('probe-lower-bushing',-92,74,4,12,3,'mid');
  round('probe-post-middle',-92,74,3,15,26,'mid');
  round('probe-upper-bushing',-92,74,4,41,3,'mid');
  round('probe-post-upper',-92,74,3,44,4,'mid');
  box('probe-clamp',{x:-98,y:68,w:12,d:12,r:2},48,6);
  box('probe-arm',{x:-92,y:70,w:46,d:5,r:1},54,3);
  round('probe-knob',-92,74,5,57,4,'mid',L(k.knurl(-92,74,5,57,61,24,P,0),{tone:'lo'}));
  round('probe-tip',-49,72.5,1.5,47,7);
  box('nameplate',{x:-105,y:93,w:43,d:13,r:1},0,.8,'lo',L(k.planOutline({x:-103,y:95,w:39,d:9,r:.5},.8,P)+k.lineOnTop([-101,97],[-74,97],.8,P)+k.lineOnTop([-101,100],[-83,100],.8,P)+k.lineOnTop([-101,103],[-79,103],.8,P),{tone:'lo',free:true}));
  A.settle(R,P);
  if(audit) A.auditOrExit(R,P,{argv});
  const body = ['<style>@media(max-width:600px){.iso-figure[data-figure=\"5\"] [data-machine],.iso-figure[data-figure=\"5\"] [data-ground=\"c05\"]{transform-box:view-box;transform-origin:300px 195px;transform:scale(1.15)}}</style>',halo(base,-16,10,' data-ground=\"c05\"'),'<g data-machine>',...R.items.sort((a,b)=>a.key-b.key).map(i=>i.svg),
    L(k.ring(0,0,86,35,P,120)+k.ring(0,0,74,35,P,120)+k.ring(0,0,68,35,P,120),{tone:'faint'}),
    '<g data-pegs></g><g data-pins></g><path data-successor class="iso-line" data-tone="lit"/><g data-selected></g><g data-owner></g></g>'];
  const controls='<div class="iso-controls"><button class="btn" data-action="remove" data-fig-text="fig.c05.remove"></button><button class="btn" data-action="add" data-fig-text="fig.c05.add"></button></div>';
  return { markup: plate({id:5,body,role:'group',controls,keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'edge',key:'key.2'}]}), data:{P,parts:count} };
}
