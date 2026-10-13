import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';

// Duplication deck: fixed head housings represent a worker pool, never worker counts.
// The visible output spools and magazine latches alone carry a discrete model count.
// Spoked flange rims and curved film wraps are split at their visibility tangents
// so the depth audit checks actual shapes rather than hiding overlaps with biases.
export async function build({ audit, argv }) {
  // The bed follows the working path rather than leaving rectangular apron space.
  const bedRing=[[-138,-51],[-132,-57],[21,-57],[27,-63],[27,-69],[33,-75],[143,-75],[149,-69],[149,52],[143,58],[66,58],[60,56],[-44,40],[-132,26],[-138,20]];
  const insetRing=[[-134,-49],[-130,-53],[23,-53],[31,-61],[31,-67],[35,-71],[141,-71],[145,-67],[145,50],[141,54],[67,54],[61,52],[-43,36],[-130,22],[-134,18]];
  const cameraAngle=48*Math.PI/180;
  const inputRimHigh=[-105-25*Math.cos(cameraAngle),-23-25*Math.sin(cameraAngle),23.2];
  const P=k.fitProjection([...bedRing.flatMap(([x,y])=>[[x,y,-16],[x,y,0]]),...k.boxCorners({x:31,y:-69,w:110,d:12,r:2},0,82),inputRimHigh],WIDTH,HEIGHT,{pad:44,azimuth:48,elevation:38});
  const {S,L,D,at}=painter(P);
  const R = A.recorder(P);
  let count=0;
  function put(name,paths,shape,centre,style={},detail='',attrs='') {
    count++;
    const downstream=/^stand\.(cache|origin|cdn|viewer)/.test(name);
    const offset=downstream?[0,-20,0]:[0,0,0];
    const svg=`<g ${attrs}><g transform="${k.translateAlong(P,offset)}">${S(paths,{tone:'mid',...style,inner:detail})}</g></g>`;
    const pose=attrs.includes('data-gauge="0"')?{piece:'load',move:[75,0,0]}:attrs.includes('data-gauge="1"')?{piece:'hit',move:[75,0,0]}:attrs.includes('data-gate=')?{piece:'load',move:[0,0,3]}:{piece:'stand.frame',move:[0,0,0]};
    R.put({name,...pose,at:centre.map((n,i)=>n+offset[i]),svg,shapes:[R.solid(A.moved(shape,offset))]});
  }
  function box(name,plan,z,h,tone='mid',detail='',attrs='') {
    put(name,k.slabOf(plan,z,h,P,6,.6),A.slab(plan,z,h,{name}),[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2],{tone},detail,attrs);
  }
  function cyl(name,x,y,r,z,h,tone='mid',detail='',attrs='') {
    put(name,k.cylinder(x,y,r,z,h,P,48,.4),A.cylinder(x,y,r,z,h,{name}),[x,y,z+h/2],{tone},detail,attrs);
  }
  const screws=(plan,z)=>L(k.corners(plan,3).map(([x,y])=>k.ring(x,y,1.1,z,P,16)).join(''),{tone:'lo'})+D(k.corners(plan,3).map(([x,y])=>at([x,y,z])),{size:.5});
  for(const [i,[x,y]] of [[-126,-45],[137,-63],[-126,17],[137,49]].entries()) {
    cyl(`stand.foot${i}`,x,y,7,-16,3,'lo');
    cyl(`stand.pad${i}`,x,y,5,-13,5,'lo');
  }
  const bedScrews=[[-131,-50],[36,-68],[142,-68],[142,51],[-130,19]];
  const bedDetail=L(k.onTop(insetRing,0,P,true),{tone:'faint'})+L(bedScrews.map(([x,y])=>k.ring(x,y,1.1,0,P,16)).join(''),{tone:'lo'})+D(bedScrews.map(([x,y])=>at([x,y,0])),{size:.5});
  put('stand.bed',k.extrude(bedRing,-8,8,P,{convex:false,bevel:.8}),A.extruded(bedRing,-8,8,{name:'stand.bed'}),[15,-8,-4],{tone:'lo'},bedDetail);
  const head={x:-42,y:-50,w:63,d:62,r:4};
  box('stand.drive-seat',head,0,5,'lo');
  for(let i=0;i<3;i++) {
    const h={x:-42+i*21,y:-45,w:18,d:51,r:2};
    const vents=Array.from({length:8},(_,j)=>k.pathOf(k.roundedPlan({x:-37+j*4,y:13,w:1.5,d:8,r:.75},4).map(([y,z])=>at([h.x+18,y,z])),true)).join('');
    box(`stand.head${i}`,h,5,25,'mid',L(k.sideSeam(h,25,P,6)+vents,{tone:'faint'}));
    const lid=k.insetPlan(h,1);
    box(`stand.head-lid${i}`,lid,30,2,'mid',screws(lid,32)+L(Array.from({length:5},(_,j)=>k.planOutline({x:h.x+3,y:-36+j*6,w:12,d:2,r:1},32,P)).join(''),{tone:'faint'}));
    box(`stand.gate-bracket${i}`,{x:h.x+2,y:6,w:14,d:5,r:1},5,19,'mid');
    box(`stand.gate${i}`,{x:h.x+5,y:11,w:8,d:3,r:.6},13,8,'hi','',`data-gate="${i}"`);
    cyl(`stand.head-knob${i}`,h.x+9,-14,4,32,4,'mid',L(k.knurl(h.x+9,-14,4,32,36,22,P),{tone:'lo'}));
  }
  // A fixed output magazine, not a count of workers: its spindle slots receive variants.
  for(const x of [34,138]) {
    box(`stand.magazine-foot${x}`,{x:x-5,y:-69,w:10,d:12,r:2},0,5,'lo',screws({x:x-5,y:-69,w:10,d:12,r:2},5));
    box(`stand.magazine-post${x}`,{x:x-3,y:-65,w:6,d:6,r:1},5,72,'mid');
  }
  box('stand.magazine-cap',{x:31,y:-66,w:110,d:8,r:2},77,5,'mid',L(k.planOutline({x:35,y:-64,w:102,d:4,r:1},82,P),{tone:'faint'}));
  box('stand.magazine-back',{x:37,y:-65,w:98,d:2,r:1},7,63,'lo',L(k.sideSeam({x:37,y:-65,w:98,d:2,r:1},58,P,6),{tone:'faint'}));
  for(let i=0;i<8;i++) {
    const x=42+i*11;
    box(`stand.magazine-slot${i}`,{x,y:-63,w:7,d:1,r:.3},12,40,'mid');
    box(`stand.magazine-latch${i}`,{x:x+1,y:-62,w:5,d:3,r:.5},45,4,'hi','',`data-variant="${i}"`);
  }
  function reel(name,x,y,r,z,attrs='') {
    cyl(`${name}.seat`,x,y,r+2,0,z,'lo');
    cyl(`${name}.lower`,x,y,r,z,1.6,'mid');
    cyl(`${name}.film`,x,y,r-2,z+1.6,5,'hi',L(k.sideArc(x,y,r-2,z+3.8,P,40),{tone:'faint'}));
    const facing=P.azimuth*Math.PI/180;
    for(let half=0;half<2;half++) {
      const start=facing-Math.PI/2+half*Math.PI;
      const arc=radius=>Array.from({length:65},(_,j)=>{const a=start+j*Math.PI/64;return [x+Math.cos(a)*radius,y+Math.sin(a)*radius];});
      const ring=[...arc(r),...arc(r-2).reverse()],a=start+Math.PI/2;
      put(`${name}.rim${half}`,k.extrude(ring,z+6.6,1.6,P,{convex:false}),A.extruded(ring,z+6.6,1.6,{name:`${name}.rim${half}`}),[x+Math.cos(a)*r,y+Math.sin(a)*r,z+7.4],{tone:'hi'},'',attrs);
    }
    cyl(`${name}.hub-seat`,x,y,3,z+6.6,1.6,'hi');
    for(let i=0;i<6;i++) {
      const a=i*Math.PI/3,span=.09;
      const inner=3/Math.cos(span);
      const points=[[x+Math.cos(a-span)*inner,y+Math.sin(a-span)*inner],[x+Math.cos(a-span)*(r-2),y+Math.sin(a-span)*(r-2)],[x+Math.cos(a+span)*(r-2),y+Math.sin(a+span)*(r-2)],[x+Math.cos(a+span)*inner,y+Math.sin(a+span)*inner]];
      put(`${name}.spoke${i}`,k.extrude(points,z+6.6,1.6,P),A.extruded(points,z+6.6,1.6,{name:`${name}.spoke${i}`}),[x+Math.cos(a)*r/2,y+Math.sin(a)*r/2,z+7.4],{tone:'hi'});
    }
    cyl(`${name}.hub`,x,y,3,z+8.2,2,'mid');
  }
  reel('stand.input',-105,-23,25,15);
  // Variant count is state.variants. Hide the entire physical spool, not just its lid.
  for(let i=0;i<8;i++) {
    const before=R.items.length;
    const x=44+i*13.5,y=-48;
    cyl(`stand.variant${i}.seat`,x,y,6.5,0,6,'lo');
    cyl(`stand.variant${i}.film`,x,y,4.5,6,6.6,'hi');
    const holes=Array.from({length:5},(_,j)=>{const a=j*Math.PI*2/5;return k.ring(x+Math.cos(a)*3.5,y+Math.sin(a)*3.5,.8,14.2,P,16);}).join('');
    cyl(`stand.variant${i}.flange`,x,y,6,12.6,1.6,'hi',L(holes+k.ring(x,y,1.3,14.2,P,24),{tone:'lo'}));
    for(const item of R.items.slice(before)) item.svg=`<g data-variant="${i}">${item.svg}</g>`;
  }
  // Mechanical film guide: closed, filled strips sit on the bed between spools.
  box('stand.feed-track',{x:-78,y:-28,w:36,d:10,r:1},0,4,'mid',L(k.planOutline({x:-75,y:-25,w:30,d:4,r:1},4,P),{tone:'faint'}));
  for(const [i,x] of [-69,-52].entries()) {
    cyl(`stand.sprocket-seat${i}`,x,-23,3,4,9,'lo');
    cyl(`stand.sprocket${i}`,x,-23,4,13,8,'hi',L(k.knurl(x,-23,4,13,21,24,P),{tone:'lo'}));
    cyl(`stand.sprocket-cap${i}`,x,-23,5,21,1.5,'mid',L(k.ring(x,-23,2,22.5,P,20),{tone:'lo'}));
  }
  // The perforated film really wraps both sprocket drums, rather than merely pointing at them.
  const arc=(cx,r,from,to)=>Array.from({length:33},(_,i)=>{const a=from+(to-from)*i/32;return [cx+Math.cos(a)*r,-23+Math.sin(a)*r];});
  const tangent=(P.azimuth+270)*Math.PI/180;
  const sections=[
    r=>arc(-69,r,Math.PI,1.5*Math.PI),
    r=>[[-69,-23-r],[-52,-23-r]],
    r=>arc(-52,r,1.5*Math.PI,tangent),
    r=>arc(-52,r,tangent,2*Math.PI),
  ];
  for(const [i,section] of sections.entries()) {
    const ring=[...section(4.04),...section(4.84).reverse()];
    const c=section(4.44)[Math.floor(section(4.44).length/2)];
    for(const [suffix,z,h,tone] of [['shoe',4,14,'lo'],['ribbon',18,3,'hi']]) {
      const name=`stand.film-${suffix}${i}`;
      const perforations=section(4.44).filter((_,j)=>j%4===0).map(([x,y])=>at([x,y,21]));
      put(name,k.extrude(ring,z,h,P,{convex:false}),A.extruded(ring,z,h,{name}),[...c,z+h/2],{tone},suffix==='ribbon'?D(perforations,{size:.45,tone:'mid'}):'');
    }
  }
  box('stand.film-feed',{x:-82,y:-23.8,w:9,d:.8,r:0},18,3,'hi');
  box('stand.film-exit',{x:-47.96,y:-23.8,w:5.96,d:.8,r:0},18,3,'hi');
  // A real take-up path from the encoding bank to the first variant (always present).
  for(const [i,[x,y]] of [[25,-26.44],[31.88,-44.56]].entries()) {
    cyl(`stand.variant-guide-foot${i}`,x,y,4,0,4,'lo');
    cyl(`stand.variant-guide-drum${i}`,x,y,3,4,7.8,'mid',L(k.knurl(x,y,3,4,11.8,20,P),{tone:'lo'}));
    cyl(`stand.variant-guide-cap${i}`,x,y,4,11.8,1.2,'hi',L(k.ring(x,y,1.4,13,P,20),{tone:'lo'}));
  }
  const arcAt=(x,y,r,start,end)=>Array.from({length:33},(_,i)=>{const a=start+(end-start)*i/32;return [x+Math.cos(a)*r,y+Math.sin(a)*r];});
  for(const [i,[x,y,start,end]] of [[25,-26.44,Math.PI/2,0],[31.88,-44.56,Math.PI,1.5*Math.PI]].entries()) {
    const ring=[...arcAt(x,y,3.04,start,end),...arcAt(x,y,3.84,start,end).reverse()];
    for(const [suffix,z,h,tone] of [['shoe',4,4.8,'lo'],['film',8.8,3,'hi']]) {
      const name=`stand.variant-${suffix}${i}`;
      put(name,k.extrude(ring,z,h,P,{convex:false}),A.extruded(ring,z,h,{name}),[x,y,z+h/2],{tone});
    }
  }
  box('stand.variant-thread-feed',{x:18,y:-23.4,w:7,d:.8,r:0},8.8,3,'hi');
  box('stand.variant-thread-shoe',{x:28.04,y:-44.56,w:.8,d:18.12,r:0},4,4.8,'lo');
  box('stand.variant-thread-film',{x:28.04,y:-44.56,w:.8,d:18.12,r:0},8.8,3,'hi',D(Array.from({length:10},(_,i)=>at([28.44,-43+i*1.6,11.8])),{size:.4,tone:'mid'}));
  box('stand.variant-take-up',{x:31.88,y:-48.4,w:7.62,d:.8,r:0},8.8,3,'hi');
  for(const [i,x] of [-40,15].entries()) {
    cyl(`stand.exit-drum-foot${i}`,x,15.8,3,0,4,'lo');
    cyl(`stand.exit-drum${i}`,x,15.8,2.5,4,18,'mid',L(k.knurl(x,15.8,2.5,4,22,20,P),{tone:'lo'}));
    cyl(`stand.exit-drum-cap${i}`,x,15.8,3,22,1.2,'hi',L(k.ring(x,15.8,1.2,23.2,P,16),{tone:'lo'}));
  }
  const filmWindows=Array.from({length:16},(_,i)=>[15,20].map(z=>k.pathOf(k.roundedPlan({x:-35+i*3,y:z,w:1.6,d:1,r:.2},3).map(([x,z])=>at([x,15.8,z])),true)).join('')).join('');
  box('stand.threaded-film',{x:-37.5,y:15,w:50,d:.8,r:0},14,8,'hi',L(filmWindows,{tone:'lo'}));
  for(let i=0;i<3;i++) box(`stand.film-gate-guide${i}`,{x:-37+i*21,y:14,w:8,d:1,r:.1},14,3,'mid');
  const gauges=[];
  for(let i=0;i<2;i++) {
    const plan={x:i===0?-130:-28,y:i===0?8:23,w:86,d:12,r:2};
    const control=i===1?'data-hit-control':'';
    box(`stand.gauge${i}`,plan,0,4,'mid',screws(plan,4),control);
    const strip={x:plan.x+6,y:plan.y+3,w:75,d:6,r:.6};
    const ticks=k.topTicks(strip.x,strip.x+75,5,5,strip.y,5,[2,4],P);
    box(`stand.scale${i}`,strip,4,1,'lo',L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'}),control);
    const marker={x:strip.x-2,y:strip.y+6,w:4,d:3,r:.3};
    box(`stand.marker${i}`,marker,4,2,i===0?'hi':'mid','',`data-gauge="${i}" ${control}`);
    for(const [j,x] of [strip.x-5,strip.x+78].entries()) box(`stand.gauge-stop${i}.${j}`,{x,y:plan.y+1.5,w:2,d:9,r:.5},4,3,'mid','',control);
    gauges.push({x:strip.x,y:strip.y+6,z:6});
  }
  reel('stand.cache',85,40,18,14);
  reel('stand.origin',131,40,11,9);
  // A viewer take-up guide remains wide regardless of cache hits: all viewers receive egress.
  const viewer={x:63,y:65,w:77,d:7,r:2};
  box('stand.viewer-deck',viewer,0,7,'mid',screws(viewer,7)+L(k.planOutline(k.insetPlan(viewer,1.8),7,P),{tone:'faint'}));
  box('stand.cdn-take-up-post',{x:84,y:65,w:2,d:5,r:.4},7,11,'mid');
  box('stand.origin-take-up-post',{x:130,y:65,w:2,d:5,r:.4},7,6,'mid');
  box('stand.cdn-film',{x:84.6,y:56,w:.8,d:9,r:0},18,2.5,'hi',D(Array.from({length:5},(_,i)=>at([85,57+i*1.5,20.5])),{size:.4,tone:'mid'}));
  box('stand.origin-film',{x:130.6,y:49,w:.8,d:16,r:0},13,2.5,'hi',D(Array.from({length:9},(_,i)=>at([131,50+i*1.5,15.5])),{size:.4,tone:'mid'}));
  box('stand.cache-guide',{x:81,y:60,w:8,d:5,r:1},0,4,'mid');
  box('stand.origin-guide',{x:127,y:53,w:8,d:12,r:1},0,4,'mid');
  // CDN reservoir rack: a reusable winding magazine, distinct from the origin supply.
  for(const x of [64,108]) {
    box(`stand.cdn-foot${x}`,{x:x-4,y:10,w:8,d:12,r:1},0,4,'lo');
    for(const [z,h] of [[4,9],[15,12],[29,14]]) box(`stand.cdn-upright${x}.${z}`,{x:x-2,y:10,w:4,d:6,r:1},z,h,'mid');
  }
  for(const z of [13,27,43]) {
    box(`stand.cdn-shelf${z}`,{x:62,y:9,w:48,d:9,r:1},z,2,'mid',screws({x:62,y:9,w:48,d:9,r:1},z+2));
  }
  box('stand.cdn-magazine',{x:68,y:11,w:36,d:5,r:1},15,10,'hi',L(k.sideSeam({x:68,y:11,w:36,d:5,r:1},20,P,6),{tone:'faint'}));
  box('stand.cdn-magazine-top',{x:68,y:11,w:36,d:5,r:1},29,10,'hi',L(k.sideSeam({x:68,y:11,w:36,d:5,r:1},34,P,6),{tone:'faint'}));
  const platePlan={x:-105,y:22,w:35,d:7,r:1};
  const labelScrews=k.corners(platePlan,2.2);
  box('stand.serial-plate',platePlan,0,.8,'lo',L([0,1,2].map(i=>k.lineOnTop([-101,23.3+i*1.6],[-76-i*3,23.3+i*1.6],.8,P)).join(''),{tone:'lo',free:true})+L(labelScrews.map(([x,y])=>k.ring(x,y,.7,.8,P,16)).join(''),{tone:'lo'})+D(labelScrews.map(([x,y])=>at([x,y,.8])),{size:.4}));
  const poses=Array.from({length:11},(_,load)=>Array.from({length:11},(_,hit)=>({label:`load ${load/10}, hit ${hit/10}`,shares:{load:load/10,hit:hit/10}}))).flat();
  A.settle(R,P,{states:poses});
  R.items.sort((a,b)=>a.key-b.key);
  if(audit) A.auditOrExit(R,P,{argv:argv || ['--audit'],frames:poses,apart:false});
  const pointers=[[-105,-23,25.2,20],[85,20,24.2,13],[131,20,19.2,7]].map(([x,y,z,r],i)=>`<path data-wheel="${i}" class="iso-line" data-tone="${i===0?'lit':'mid'}" data-free="end" d="${k.lineOnTop([x,y],[x+r,y],z,P)}"/>${D([at([x,y,z])],{size:.65,tone:'mid'})}`).join('');
  const items=R.items.map(item=>({key:item.key,lift:k.depthOf(item.move,P),piece:item.piece}));
  const shadow=`<path class="iso-halo" d="${k.onTop(bedRing,-16,P,true)}"/>`;
  return {markup:plate({id:14,body:shadow+`<g data-machine><g data-depth-stack>${R.items.map((item,i)=>`<g data-sort="${i}">${item.svg}</g>`).join('')}</g>${pointers}</g>`,role:'slider',stage:{'aria-valuemin':0,'aria-valuemax':99},keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'edge',key:'key.2'}]}),data:{P,gauges,parts:count,items,wheels:[[-105,-23,25.2,20],[85,20,24.2,13],[131,20,19.2,7]]}};
}
