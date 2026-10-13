import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';

// A precision transfer-weighing bench. Three scale pans preserve A + transit + C;
// the suspended last-transfer weight travels on a cantilever carriage above them.
// The mechanical journal feed times one complete replay of the snapshot tail.
export async function build({ argv }) {
  const base = { x:-118, y:-65, w:236, d:125, r:7 };
  const P = k.fitProjection([
    ...k.boxCorners(base,-15,0),
    ...k.boxCorners({x:-116,y:-48,w:232,d:60,r:0},80,96),
  ], WIDTH, HEIGHT, {pad:44,azimuth:35,elevation:18});
  P.scale *= 1.025;
  const { S,L,D,halo } = painter(P);
  const R = A.recorder(P);
  let count = 0;
  const at = p => k.iso(p,P);
  const screws = (plan,z) => {
    const points=k.corners(plan,Math.min(3,plan.d/3,plan.w/3));
    return L(points.map(([x,y])=>k.ring(x,y,1.2,z,P,20)).join(''),{tone:'lo'})+
      D(points.map(([x,y])=>at([x,y,z])),{size:.45,tone:'mid'});
  };
  function box(name,plan,z,h,{tone='mid',extra='',attrs='',inner,lit=false}={}) {
    count++;
    const shape=R.solid(A.slab(plan,z,h,{name,owner:'machine'},5));
    const seam=inner===undefined?L(k.sideSeam(plan,z+h*.55,P,5),{tone:'faint'}):inner;
    const svg=S(k.slabOf(plan,z,h,P,5,.6),{tone,lit,inner:seam})+extra;
    const moving=attrs.includes('data-carriage');
    R.put({name,at:[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2],piece:moving?'carriage':'machine',move:moving?[90,0,0]:[0,0,0],svg,shapes:[shape],attrs});
  }
  function round(name,x,y,r,z,h,{tone='mid',extra='',attrs='',knurled=false,lit=false}={}) {
    count++;
    const shape=R.solid(A.cylinder(x,y,r,z,h,{name,owner:'machine'}));
    const inner=L(k.sideArc(x,y,r,z+h*.4,P,48),{tone:'faint'})+
      (knurled?L(k.knurl(x,y,r,z,z+h,40,P,0),{tone:'lo'}):'');
    const moving=attrs.includes('data-carriage');
    R.put({name,at:[x,y,z+h/2],piece:moving?'carriage':'machine',move:moving?[90,0,0]:[0,0,0],shapes:[shape],attrs,
      svg:S(k.cylinder(x,y,r,z,h,P,64,.3),{tone,lit,inner})+extra});
  }
  function dial(i,x) {
    const F=G.frameAlong([x,32,20],[0,1,0]),name=`scale.dial.${i}`;
    count++;
    const shape=R.solid(A.disc(F,0,4,14,{name,owner:'machine'}));
    const ticks=Array.from({length:41},(_,j)=>{
      const a=-2+j/40*4,r=j%5===0?9.8:10.8;
      return L(k.pathOf([[Math.sin(a)*r,-Math.cos(a)*r],[Math.sin(a)*12,-Math.cos(a)*12]]),{tone:j%5===0?'mid':'lo'});
    }).join('');
    const face=`<g transform="${k.sideMatrix([x,36],20,P,'left')}"><circle class="iso-line" data-tone="lo" r="12"/>${ticks}<path data-dial="${i}" class="iso-line" data-tone="hi" data-free="end" d="M0 0L-10 4.5"/><circle cx="0" cy="0" r="1.1" style="fill:var(--anatomy-paper);stroke:var(--anatomy-hi);stroke-width:.5"/><defs><clipPath id="c27-scale-${i}"><rect x="-9" y="5" width="18" height="4" rx=".7"/></clipPath></defs><rect x="-9" y="5" width="18" height="4" rx=".7" style="fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:.4"/><text data-balance="${i}" clip-path="url(#c27-scale-${i})" x="0" y="8" text-anchor="middle" style="font:3.2px var(--anatomy-mono);fill:var(--anatomy-hi)"></text></g>`;
    R.put({name,at:[x,34,20],piece:'machine',attrs:` data-hit-recovery="${i===0?'cancel':'resume'}"`,shapes:[shape],svg:S(G.disc(0,4,14,F,P,{steps:64,bevel:.3}),{tone:'hi',inner:k.fadedSvg(G.ribsOf(F,0,4,14,64,P,{fade:[.1,.55],seams:true}),{tone:'lo'})})+face});
  }
  const screen=(i,x,y=38,z=0)=>`<g transform="${k.sideMatrix([x,y],z,P,'left')}"><defs><clipPath id="c27-scale-${i}"><rect x="-20" y="-10" width="40" height="7" rx="1"/></clipPath></defs>${L(k.pathOf(k.roundedPlan({x:-20,y:-10,w:40,d:7,r:1},5),true),{tone:'lo'})}<text data-balance="${i}" clip-path="url(#c27-scale-${i})" x="0" y="-5" text-anchor="middle" style="font:4.2px var(--anatomy-mono);fill:var(--anatomy-hi)"></text></g>`;
  for(const [x,y] of k.corners(base,15)) {
    box('stand.foot',{x:x-6,y:y-6,w:12,d:12,r:2},-15,5,{tone:'lo'});
    box('stand.pad',{x:x-7,y:y-7,w:14,d:14,r:2},-10,2,{tone:'lo'});
  }
  const mounts=[-50,-36,-10].flatMap(y=>Array.from({length:9},(_,i)=>[-80+i*20,y]));
  box('stand.base',base,-8,8,{tone:'lo',extra:L(k.planOutline(k.insetPlan(base,4),0,P),{tone:'faint'})+screws(base,0)+L(mounts.map(([x,y])=>k.ring(x,y,.7,0,P,20)).join(''),{tone:'faint'})+D(mounts.map(([x,y])=>at([x,y,0])),{size:.25,tone:'lo'})});
  const service={x:-99,y:-26,w:198,d:10,r:2};
  box('service.cover',service,0,.8,{tone:'lo',inner:'',extra:screws(service,.8)+L(k.planOutline(k.insetPlan(service,2),.8,P),{tone:'faint'})+L(Array.from({length:12},(_,i)=>k.planOutline({x:-86+i*15,y:-23.5,w:10,d:2.5,r:1},.8,P,5)).join(''),{tone:'faint'})});
  for(const [i,x] of [[0,-90],[2,90]]) {
    const plinth={x:x-24,y:-10,w:48,d:40,r:4};
    const hit=` data-hit-recovery="${i===0?'cancel':'resume'}"`;
    for(const [dx,y] of [[-18,25],[18,25],[0,-7]])round('scale.level',x+dx,y,3.5,0,3,{tone:'lo',knurled:true,attrs:hit});
    box('scale.plinth',plinth,3,5,{extra:screws(plinth,8)+L(k.planOutline(k.insetPlan(plinth,3),8,P),{tone:'faint'}),attrs:hit});
    round('scale.column',x,8,7,8,32,{extra:L(k.ring(x,8,5.5,40,P,48),{tone:'faint'}),attrs:hit});
    round('scale.platform',x,8,25,40,4,{tone:'hi',extra:L(k.ring(x,8,23,44,P,72),{tone:'lo'}),attrs:hit});
    box('scale.dial.mount',{x:x-4,y:28,w:8,d:4,r:1},8,14,{extra:screws({x:x-4,y:28,w:8,d:4,r:1},22),attrs:hit});
    dial(i,x);
  }
  const tray={x:-22,y:-6,w:44,d:36,r:3};
  box('transit.tray',tray,0,4,{extra:screws(tray,4)+L(k.planOutline(k.insetPlan(tray,3),4,P),{tone:'faint'}),attrs:' data-hit-recovery="none"'});
  box('transit.back',{x:-22,y:-6,w:44,d:2,r:.5},4,3,{attrs:' data-hit-recovery="none"'});
  for(const x of [-22,20])box('transit.cheek',{x,y:-4,w:2,d:32,r:.4},4,3,{attrs:' data-hit-recovery="none"'});
  box('transit.front',{x:-20,y:28,w:40,d:2,r:.4},4,1,{attrs:' data-hit-recovery="none"'});
  for(const x of [-110,110]) {
    const shoe={x:x-7,y:-48,w:14,d:18,r:2};
    box('column.shoe',shoe,0,6,{extra:screws(shoe,6)});
    const post={x:x-3,y:-42,w:6,d:6,r:1};
    // The full-height inset stiffener belongs to the column face, edge to edge.
    box('column',post,6,74,{extra:L(k.segment([x+3,-39,6],[x+3,-39,80],P),{tone:'faint'})});
    const cap={x:x-6,y:-45,w:12,d:12,r:2};
    box('column.cap',cap,86,6,{extra:screws(cap,92)});
    const cleat={x:x+3,y:-42,w:3,d:6,r:.6};
    box('column.cleat',cleat,30,12,{extra:D([at([x+6,-40,33]),at([x+6,-38,39])],{size:.45})});
    round('column.lock',x+4.5,-39,1.3,42,3,{knurled:true});
  }
  const beam={x:-110,y:-42,w:220,d:6,r:1};
  box('beam',beam,80,6,{extra:D([-100,-75,-50,-25,0,25,50,75,100].map(x=>at([x,-39,86])),{size:.4,tone:'lo'})});
  box('transit.console',{x:-23,y:-46,w:46,d:4,r:1},80,16,{extra:screen(1,0,-42,85)+screws({x:-23,y:-46,w:46,d:4,r:1},96)});
  box('rail',{x:-110,y:-36,w:220,d:6,r:1},76,4,{tone:'hi'});
  const ticks=k.topTicks(-102,102,5,5,-36,80,[1.2,2.8],P);
  R.items.find(i=>i.name==='rail').svg+=L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'});
  for(const x of [-106,103])box('rail.stop',{x,y:-36,w:3,d:6,r:.6},80,5,{extra:D([at([x+1.5,-33,85])],{size:.5})});
  const carriage={x:-10,y:-36,w:20,d:10,r:2};
  box('carriage',carriage,80,6,{extra:screws(carriage,86),attrs:' data-carriage'});
  for(const x of [-8,4])box('bearing',{x,y:-36,w:4,d:10,r:.7},86,3,{extra:L(k.planOutline({x:x+.8,y:-34,w:2.4,d:6,r:.5},89,P),{tone:'faint'}),attrs:' data-carriage'});
  const arm={x:-3,y:-26,w:6,d:40,r:1};
  box('carriage.arm',arm,80,4,{extra:D([-21,9].map(y=>at([0,y,84])),{size:.45}),attrs:' data-carriage'});
  box('transfer.cradle.floor',{x:-15,y:9,w:30,d:4,r:.5},58,2,{attrs:' data-carriage'});
  // Split the cradle floor behind the payload from the hanger in front of it.
  // The kit's general prism hull cannot represent this concave hook opening.
  let hook=[[-2,80],[2,80],[2,72],[15,72],[15,60],[13,60],[13,70],[-2,70]];
  const area=hook.reduce((sum,[x,z],i)=>sum+x*hook[(i+1)%hook.length][1]-hook[(i+1)%hook.length][0]*z,0);
  if(area<0)hook.reverse();
  const HF=G.frameOf([0,11,0],[0,1,0],[1,0,0],[0,0,1]);
  const hp=G.prismOf(HF,hook,-2,2,P);
  const near=hook.map(([x,z])=>at([x,13,z])),far=hook.map(([x,z])=>at([x,9,z]));
  const seen=hook.map(([x,z],i)=>{const [xx,zz]=hook[(i+1)%hook.length];return G.dot3(G.unit3([zz-z,0,x-xx]),R.V)>0;});
  hp.fill=[hp.top,...hp.shades].join('');
  hp.outline=k.pathOf(near,true)+hook.map((_,i)=>seen[i]?k.pathOf([far[i],far[(i+1)%hook.length]]):'').join('')+hook.map((_,i)=>seen[i]!==seen[(i+hook.length-1)%hook.length]?k.pathOf([near[i],far[i]]):'').join('');
  count++;
  const hs=R.solid(A.prism(HF,hook,-2,2,{name:'transfer.cradle.hanger',owner:'machine'}));
  R.put({name:'transfer.cradle.hanger',at:[6.5,11,70],piece:'carriage',move:[90,0,0],attrs:' data-carriage',shapes:[hs],svg:S(hp,{tone:'mid'})});
  for(let j=0;j<4;j++) {
    const z=60+j*2;
    round('transfer.weight',0,11,11,z,2,{tone:'hi',lit:j===3,attrs:` data-carriage data-weight="${j}"`,extra:`<g data-weight-stamp-face transform="${k.topMatrix([0,16],z+2,P)}"><text data-weight-stamp="${j}" text-anchor="middle" style="font:3px var(--anatomy-mono);fill:var(--anatomy-hi)"></text></g>`});
  }
  const ledger={x:-56,y:41,w:112,d:17,r:3};
  box('ledger.case',ledger,0,10,{extra:screws(ledger,10)+L(k.planOutline(k.insetPlan(ledger,3),10,P),{tone:'faint'})});
  box('ledger.paper',{x:-49,y:43,w:98,d:12,r:1},10,.8,{tone:'hi',inner:'',extra:
    L([5,7,6].map((w,i)=>k.lineOnTop([-45,45+i*3],[-45+w,45+i*3],10.8,P)).join(''),{tone:'lo',free:true})+
    D([-46,-42,-38,-34,-30,-26,-22,-18,-14,-10,-6,-2,2,6,10,14,18,22,26,30,34,38,42,46].flatMap(x=>[at([x,43.8,10.8]),at([x,54.2,10.8])]),{size:.25,tone:'lo'})});
  for(const x of [-52,49])box('ledger.clamp',{x,y:42,w:3,d:14,r:.6},10,3,{extra:D([at([x+1.5,44,13]),at([x+1.5,54,13])],{size:.45})});
  for(const x of [-59,56]) {
    box('ledger.lug',{x,y:44,w:3,d:10,r:1},0,10);
    round('ledger.knob',x+1.5,49,3.5,10,3,{knurled:true,extra:x>0?`<path data-replay-pointer class="iso-line" data-tone="hi" data-free="start" d="${k.lineOnTop([x+1.5,49],[x+4.5,49],13,P)}"/>`:L(k.lineOnTop([x+1.5,49],[x+4.5,49],13,P),{tone:'hi',free:'start'})});
  }
  const label={x:-100,y:46,w:27,d:10,r:1};
  R.items.find(i=>i.name==='stand.base').svg+=L(k.planOutline(label,0,P),{tone:'faint'})+screws(label,0)+L([16,12,15].map((w,i)=>k.lineOnTop([-95,49+i*2],[-95+w,49+i*2],0,P)).join(''),{tone:'lo',free:true});
  const selector={x:-30,y:58,w:60,d:1.5,r:.5};
  const selectorScrews=`<g transform="${k.sideMatrix([0,59.5],0,P,'left')}"><circle class="iso-line" data-tone="lo" cx="-28" cy="-5" r=".7"/><circle class="iso-line" data-tone="lo" cx="28" cy="-5" r=".7"/></g>`;
  box('selector.mount',selector,1,8,{extra:selectorScrews+D([at([-28,59.5,5]),at([28,59.5,5])],{size:.45})});
  for(const [i,x] of [-20,0,20].entries()) {
    const key={x:x-7,y:59.5,w:14,d:1.2,r:.6};
    const inset=`<g transform="${k.sideMatrix([x,60.7],0,P,'left')}">${L(k.pathOf(k.roundedPlan({x:-5,y:-6.8,w:10,d:3.6,r:.6},5),true),{tone:'faint'})}</g>`;
    box('selector.key',key,2,6,{tone:'mid',extra:inset,attrs:` data-choice="${i}"`});
  }
  for(const [i,x] of [-90,0,90].entries())for(let j=0;j<4;j++) {
    const radius=i===1?15:18,z=[44,4,44][i]+j*3;
    round('balance.weight',x,11,radius,z,3,{tone:'hi',attrs:` data-load="${i}" data-layer="${j}"`,extra:`<g data-bank-stamp-face transform="${k.topMatrix([x,16],z+3,P)}"><text data-bank-stamp="${i}-${j}" text-anchor="middle" style="font:3px var(--anatomy-mono);fill:var(--anatomy-hi)"></text></g>`});
  }
  const poses=Array.from({length:41},(_,i)=>({label:`carriage ${(i-20)*4.5}`,shares:{carriage:(i-20)/20}}));
  A.settle(R,P,{states:poses});
  R.items.sort((a,b)=>a.key-b.key);
  A.auditOrExit(R,P,{argv,frames:poses});
  const body=[`<style>.iso-figure[data-figure="27"] [data-choice][data-on] .iso-top{fill:var(--anatomy-shade-1)}</style>`,halo(base,-15,9),
    `<g data-machine>${R.items.map(i=>`<g data-key="${i.key}" data-lift="${A.keyAt(i,{shares:{carriage:1}},R.V)-i.key}"${i.attrs||''}>${i.svg}</g>`).join('')}</g>`,
    `<g transform="${k.topMatrix([0,49],11,P)}"><defs><clipPath id="c27-tape"><rect x="-40" y="-4" width="82" height="8"/></clipPath></defs><text data-tape clip-path="url(#c27-tape)" text-anchor="middle" style="font:4.6px var(--anatomy-mono);fill:var(--anatomy-hi)"></text></g>`];
  return {markup:plate({id:27,body,role:'group',keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'edge',key:'key.2'},{mark:'flat',key:'key.3'}]}),data:{P,parts:count,replayKnob:[57.5,49,13],loadBase:[44,4,44],loadRadius:[18,15,18]}};
}
