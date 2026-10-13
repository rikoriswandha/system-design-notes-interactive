import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';

// Tape recorder: feet, chassis, ruled paper, two bearing-mounted feed drums,
// batch stop, route tracks and ETA followers, display wells and fasteners.
export async function build({ argv }) {
  const base = { x: -132, y: -75, w: 264, d: 150, r: 9 };
  const P = k.fitProjection([...k.boxCorners(base,-16,3),[-40,-46,76]], WIDTH, HEIGHT, { pad: 44, azimuth: 42, elevation: 38 });
  P.origin[1]+=6.5;
  const { S, L, D, at, halo } = painter(P);
  const R = A.recorder(P,{order:['scan']});
  let count = 0;
  const put = (name, centre, svg, shape) => { count++; R.put({ name, at: centre, piece: 'stand', svg, shapes: [R.solid(shape)] }); };
  const box = (name, p, z, h, tone = 'mid', details = '') => put(name, [p.x+p.w/2,p.y+p.d/2,z+h/2], S(k.slabOf(p,z,h,P,6,0.7),{tone,inner:details}), A.slab(p,z,h,{name:'stand.'+name},6));
  const cyl = (name,x,y,r,z,h,tone='mid',details='') => put(name,[x,y,z+h/2],S(k.cylinder(x,y,r,z,h,P,48,0.4),{tone,inner:details}),A.cylinder(x,y,r,z,h,{name:'stand.'+name}));
  for (const [i,[x,y]] of k.corners(base,10).entries()) {
    cyl('foot.'+i,x,y,7,-16,4,'lo'); cyl('foot-neck.'+i,x,y,5,-12,4,'lo');
  }
  box('chassis',base,-8,8,'lo',L(k.sideSeam(base,-4,P,6),{tone:'faint'}));
  const screws = (p,z) => L(k.corners(p,4).map(([x,y])=>k.ring(x,y,1.4,z,P,20)).join(''),{tone:'faint'})+D(k.corners(p,4).map(([x,y])=>at([x,y,z])),{size:0.5});
  box('lid',k.insetPlan(base,4),0,3,'mid',L(k.planOutline(k.insetPlan(base,9),3,P),{tone:'faint'})+screws(k.insetPlan(base,5),3));
  const tray = {x:-114,y:-58,w:140,d:96,r:5};
  box('tape-bed',tray,3,6,'mid',screws(tray,9)+L(k.sideSeam(tray,6,P,6),{tone:'faint'}));
  const tape = {x:-100,y:-30,w:116,d:40,r:1};
  const dots = Array.from({length:12},(_,i)=>{ const [x,y]=at([-72+i*4,-8,10]); return `<circle data-sample="${i}" cx="${x}" cy="${y}" r="1.5" fill="var(--anatomy-hi)"/>`; }).join('');
  const chartRules=L([-24,-18,-2,4].map(y=>k.lineOnTop([tape.x,y],[tape.x+tape.w,y],9.7,P)).join(''),{tone:'faint'});
  box('paper',tape,9,0.7,'hi',chartRules+`<g data-tape-points>${dots}</g>`);
  for (const [i,x] of [-93,9].entries()) {
    const F=G.frameAlong([x,-30,19.7],[0,1,0]);
    const drum=(name,s0,s1,r,tone='mid',inner='')=>
      put(name,G.pointOf(F,(s0+s1)/2,0,0),S(G.disc(s0,s1,r,F,P),{tone,inner}),
        A.disc(F,s0,s1,r,{name:'stand.'+name}));
    drum('feed-drum.'+i,0,40,10,'hi',
      L(G.arcOf(F,0,10,P),{tone:'faint'})+L(G.arcOf(F,40,10,P),{tone:'faint'}));
    drum('far-flange.'+i,-2,0,10.7,'mid');
    drum('near-flange.'+i,40,42,10.7,'mid',
      D(G.dotsOf(F,42,8,6,P,{all:true}),{size:0.55,tone:'lo'}));
    for (const [j,[s0,s1]] of [[-5,-2],[42,45]].entries()) {
      drum('feed-shaft.'+i+'.'+j,j===0?s0-0.8:s1,j===0?s0:s1+0.8,3,'mid');
      drum('feed-bearing.'+i+'.'+j,s0,s1,6,'mid',
        L(G.circleOf(F,s1,3.6,P,48),{tone:'faint'}));
      box('feed-pedestal.'+i+'.'+j,{x:x-7,y:-30+s0,w:14,d:s1-s0,r:0.5},9,4.7,'mid');
    }
  }
  for (const [i,x] of [-80,0].entries()) {
    box('bridge-foot.'+i,{x:x-5,y:-54,w:10,d:13,r:2},9,5);
    box('bridge-post.'+i,{x:x-3,y:-51,w:6,d:7,r:1},14,32);
    box('bridge-cap.'+i,{x:x-5,y:-53,w:10,d:11,r:1},46,3,'mid');
  }
  box('punch-bridge',{x:-83,y:-50,w:86,d:7,r:2},49,6,'mid');
  const vents=Array.from({length:4},(_,i)=>k.pathOf(k.roundedPlan({x:-46+i*3,y:58,w:1.1,d:6,r:0.45},4).map(([x,z])=>at([x,-43,z])),true)).join('');
  box('punch-drive',{x:-49,y:-51,w:18,d:8,r:2},55,12,'mid',
    L(k.sideSeam({x:-49,y:-51,w:18,d:8,r:2},61,P,6),{tone:'faint'})+L(vents,{tone:'faint'}));
  cyl('drive-knob',-40,-46,6,67,5,'mid',L(k.knurl(-40,-46,6,67,72,24,P),{tone:'lo'}));
  const scanTicks=k.topTicks(-76,-24,4,3,-43,52,[1,2.5],P);
  box('scan-rail',{x:-83,y:-43,w:86,d:4,r:1},49,3,'mid',
    L(scanTicks.minor,{tone:'faint'})+L(scanTicks.major,{tone:'lo'}));
  for(const [i,x] of [-83,-2].entries()) {
    box('scan-stop.'+i,{x,y:-43,w:5,d:6,r:1},52,5,'mid');
  }
  const scanBox=(name,p,z,h,tone='mid')=>{
    const svg=S(k.slabOf(p,z,h,P,6,0.5),{tone,inner:D([at([p.x+p.w/2,p.y+p.d/2,z+h])],{size:0.45})});
    count++;R.put({name,at:[p.x+p.w/2,p.y+p.d/2,z+h/2],piece:'scan',move:[44,0,0],
      svg:`<g data-scan>${svg}</g>`,shapes:[R.solid(A.slab(p,z,h,{name,owner:'scan-head'},6))]});
  };
  scanBox('scan-bearing',{x:-77,y:-43,w:10,d:7,r:1},52,5);
  scanBox('scan-arm',{x:-74,y:-36,w:4,d:29,r:0.6},52,4);
  scanBox('scan-stem',{x:-74,y:-10,w:4,d:4,r:0.5},16,36);
  scanBox('scan-shoe',{x:-76,y:-11,w:8,d:7,r:0.7},10,6,'hi');
  const gate = `<g data-batch-gate>${S(k.slabOf({x:-74,y:5,w:4,d:10,r:1},9.7,5,P,4,0.5),{tone:'mid'})}</g>`;
  // The moving gate is a tape-width stop, supported by the paper bed throughout its travel.
  put('batch-stop',[-72,10,12],gate,A.slab({x:-74,y:5,w:4,d:10,r:1},9.7,5,{name:'stand.batch-stop'},4));
  const strip = {x:-74,y:24,w:48,d:6,r:1};
  const ticks=k.topTicks(-72,-28,4,1,24,10,[2.5,2.5],P);
  box('batch-ruler',strip,9,1,'lo',L(ticks.major,{tone:'lo'}));
  R.items[R.items.length-1].svg=`<g data-batch-ruler>${R.items[R.items.length-1].svg}</g>`;
  const idPlate={x:-123,y:16,w:7,d:29,r:1};
  box('maker-plate',idPlate,3,0.7,'lo',
    L(k.planOutline(k.insetPlan(idPlate,0.8),3.7,P),{tone:'faint'})+
    L([3,5,7].map(n=>k.lineOnTop([-121,19+n],[-118,19+n],3.7,P)).join(''),{tone:'lo',free:true}));
  for(const [i,y] of [-65,64].entries()) {
    box('case-latch.'+i,{x:-17,y,w:16,d:5,r:1},3,2,'mid',
      D([at([-13,y+2.5,5]),at([-5,y+2.5,5])],{size:0.5}));
  }
  box('traffic-dial-seat',{x:93,y:-74,w:22,d:15,r:2},3,2,'mid',
    D([at([96,-71,5]),at([112,-71,5])],{size:0.5}));
  cyl('traffic-dial',104,-66,6.5,5,5,'hi',
    L(k.knurl(104,-66,6.5,5,10,32,P),{tone:'lo'})+
    L(k.ring(104,-66,5.2,10,P,48),{tone:'faint'}));
  R.items[R.items.length-1].svg=`<g data-traffic-knob>${R.items[R.items.length-1].svg}</g>`;
  cyl('traffic-dial-hub',104,-66,0.8,10,0.4,'hi');
  const routes={x:39,y:-57,w:78,d:72,r:4};
  box('route-bed',routes,3,7,'mid',screws(routes,10));
  const routeDisplays=[];
  for(const [i,y] of [-43,-16].entries()) {
    box('route-channel.'+i,{x:48,y,w:59,d:13,r:2},10,2,'lo');
    const etaTicks=k.topTicks(49,97,3,4,y+1,12.7,[1,2],P);
    box('route-rule.'+i,{x:49,y:y+1,w:57,d:3,r:0.5},12,0.7,'mid',
      L(etaTicks.minor,{tone:'faint'})+L(etaTicks.major,{tone:'lo'}));
    box('route-stop.'+i,{x:104,y:y+4,w:3,d:6,r:0.5},12,3,'mid');
    const follower=S(k.slabOf({x:49,y:y+5,w:5,d:6,r:1},12,4,P,4,0.5),{tone:'hi'});
    put('follower.'+i,[51.5,y+8,14],`<g data-route="${i}">${follower}</g>`,A.slab({x:49,y:y+5,w:5,d:6,r:1},12,4,{name:'stand.follower.'+i},4));
    const p={x:49,y:y-10,w:57,d:7,r:1};
    box('route-window.'+i,p,10,1,'mid');
    box('route-window-inlay.'+i,k.insetPlan(p,1),11,0.2,'lo');
    routeDisplays.push(`<clipPath id="c18-route-screen-${i}"><path d="${k.planOutline(k.insetPlan(p,1),11.3,P)}"/></clipPath><g clip-path="url(#c18-route-screen-${i})"><g transform="${k.topMatrix([102.5,y-5.1],11.3,P)}"><text data-route-time="${i}" text-anchor="end" font-size="5.2" fill="var(--anatomy-hi)" font-family="monospace"></text></g></g>`);
  }
  box('selector-plinth',{x:51,y:3,w:54,d:9,r:2},10,3,'mid');
  cyl('selector-pivot',78,7.5,3,13,3,'hi');
  // The sole lit part is the route selector's pointer, not a second route.
  const displays = [];
  for(const [i,[x,y,w]] of [[-109,48,96],[-7,48,53],[51,36,64],[49,19,66]].entries()) {
    const p={x,y,w,d:12,r:1.5};
    box('display-bezel.'+i,p,3,2,'mid');
    box('display-glass.'+i,k.insetPlan(p,1.4),5,0.4,'lo');
    displays.push(`<clipPath id="c18-screen-${i}"><path d="${k.planOutline(k.insetPlan(p,1.4),5.6,P)}"/></clipPath><g clip-path="url(#c18-screen-${i})"><g transform="${k.topMatrix([x+w/2,y+7.5],5.6,P)}"><text data-display="${i}" text-anchor="middle" font-size="6.2" fill="var(--anatomy-hi)" font-family="monospace"></text></g></g>`);
  }
  A.settle(R,P);
  R.items.sort((a,b)=>a.key-b.key);
  A.auditOrExit(R,P,{argv});
  const body=halo(base,-16,8)+`<g data-machine>${R.items.map((i,index)=>`<g data-draw="${index}">${i.svg}</g>`).join('')}</g>`+
    `<path data-traffic-marker class="iso-line" data-tone="hi" data-free="end" d="${k.lineOnTop([104,-66],[104,-71.2],10.1,P)}"/>`+
    `<path data-selector class="iso-line" data-tone="lit" data-free="" d="${k.lineOnTop([78,7.5],[65,-10],16.2,P)}"/>`+displays.join('')+routeDisplays.join('');
  const order=R.items.map(i=>({key:i.key,lift:i.piece==='scan'?k.depthOf([44,0,0],P):0}));
  return {markup:plate({id:18,body,role:'slider',stage:{'aria-valuemin':1,'aria-valuemax':12},keys:[{mark:'raised',key:'key.0'},{mark:'lit',key:'key.1'}]}),data:{P,parts:count,order}};
}
