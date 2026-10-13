import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';

// Figure: a ticket sorter with a metering shutter and a return elevator.
// Parts: bed + four feet, hopper floor/four walls, paired conveyor rails,
// six conveyor ties, worker frame/heads, quota frame/shutter, return tower,
// lift shoes/carriage, backlog tray/walls/sight scale, fasteners and covers.
export async function build({ audit, argv }) {
  const base = { x:-132, y:-65, w:264, d:130, r:7 };
  const P = k.fitProjection([...k.boxCorners(base,-14,0),[-120,-46,93],[27,-53,99]],WIDTH,HEIGHT,{pad:39,azimuth:48,elevation:32});
  P.origin[1]+=2;
  const {S,L,D,halo}=painter(P);
  const R=A.recorder(P);
  let n=0;
  function box(name,plan,z,h,tone='mid',extra='',attrs='') {
    const shape=R.solid(A.slab(plan,z,h,{name:`stand.${name}.${n++}`}));
    R.put({name,at:[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2],piece:'stand',svg:`<g ${attrs}>${S(k.slabOf(plan,z,h,P,5,0.5),{tone,inner:extra})}</g>`,shapes:[shape]});
  }
  const b=(name,x,y,w,d,z,h,tone='mid',extra='',attrs='')=>box(name,{x,y,w,d,r:Math.min(1.5,w/4,d/4)},z,h,tone,extra,attrs);
  const screws=(plan,z,inset=2)=>L(k.corners(plan,inset).map(([x,y])=>k.ring(x,y,1.15,z,P,20)).join(''),{tone:'lo'})+D(k.corners(plan,inset).map(([x,y])=>k.iso([x,y,z],P)),{size:0.42});
  const rules=(x,y,z,w)=>[0,2.2,4.4].map((dy,i)=>L(k.lineOnTop([x,y+dy],[x+w*(1-i*0.17),y+dy],z,P),{tone:'lo',free:true})).join('');
  function round(name,F,s0,s1,r,tone='mid',inner='') {
    const shape=R.solid(A.disc(F,s0,s1,r,{name:`stand.${name}.${n++}`}));
    R.put({name,at:G.pointOf(F,(s0+s1)/2,0,0),piece:'stand',svg:S(G.disc(s0,s1,r,F,P),{tone,inner}),shapes:[shape]});
  }
  function inclined(name,x0,x1,polygon,tone='mid') {
    const F=G.frameOf([0,0,0],[1,0,0],[0,1,0],[0,0,1]);
    const shape=R.solid(A.prism(F,polygon,x0,x1,{name:`stand.${name}.${n++}`}));
    R.put({name,at:[(x0+x1)/2,polygon.reduce((a,p)=>a+p[0],0)/polygon.length,polygon.reduce((a,p)=>a+p[1],0)/polygon.length],piece:'stand',svg:S(G.prismOf(F,polygon,x0,x1,P),{tone}),shapes:[shape]});
  }
  for(const [x,y] of k.corners(base,15)) b('foot',x-6,y-6,12,12,-14,6,'lo');
  box('bed',base,-8,8,'lo',L(k.sideSeam(base,-4,P,5),{tone:'faint'})+L(k.planOutline(k.insetPlan(base,4),0,P),{tone:'faint'}));
  b('rim-back',-122,-56,244,3,0,2,'lo');
  b('rim-front',-122,53,182,3,0,2,'lo');
  for(const [x,y] of k.corners(base,7)) {
    const seat={x:x-2,y:y-2,w:4,d:4,r:1};
    box('screw-seat',seat,0,0.6,'lo',L(k.ring(x,y,1.2,0.6,P,20),{tone:'lo'})+D([k.iso([x,y,0.6],P)],{size:0.5}));
  }
  const ruler={x:-112,y:43,w:128,d:6,r:1};
  const rulerTicks=k.topTicks(-108,12,4,5,43.3,0.8,[2,3.8],P);
  box('conveyor-ruler',ruler,0,0.8,'lo',L(rulerTicks.minor,{tone:'lo'})+L(rulerTicks.major,{tone:'mid'})+screws(ruler,0.8,2));
  const plaque={x:-113,y:28,w:35,d:11,r:1};
  box('maker-plate',plaque,0,0.7,'lo',L(k.planOutline(k.insetPlan(plaque,1.3),0.7,P),{tone:'faint'})+rules(-107,31,0.7,23)+D(k.pointsAt([[-111,33.5,0.7],[-80,33.5,0.7]],P),{size:0.45}));
  // Long attempt conveyor, supported by six bolted trestles.
  for(const x of [-94,-56,-18,20,58,96]) {
    b(`trestle-${x}`,x-3,-10,6,29,0,17,'mid');
    b('cross-tie',x-8,-12,16,33,17,3,'mid',D(k.pointsAt([[x,-8,20],[x,17,20]],P),{size:0.5}));
  }
  // Free-running rollers are the conveyor's recognisable working surface.
  for(let x=-102;x<=108;x+=10.5) {
    const F=G.frameAlong([x,-5,22.4],[0,1,0]);
    round('roller',F,0,19,2.4,'mid');
  }
  b('rear-rail',-110,-9,224,4,20,5,'mid');
  b('front-rail',-110,14,224,4,20,5,'mid',L(k.sideSeam({x:-110,y:14,w:224,d:4,r:1},22,P,5),{tone:'faint'})+D(k.pointsAt(Array.from({length:20},(_,i)=>[-105+i*10.5,16,25]),P),{size:0.42}));
  // Arrival hopper with genuinely open mouth.
  b('hopper-stand',-125,-12,12,34,0,25,'mid');
  b('hopper-bottom',-125,-15,48,40,25,3,'hi');
  b('hopper-back',-120,-15,43,3,28,28,'hi');
  b('hopper-left',-120,-12,3,34,28,28,'hi');
  b('hopper-right',-80,-12,3,34,36,20,'hi');
  const hopperFront={x:-117,y:22,w:37,d:3,r:0.75};
  box('hopper-front',hopperFront,28,14,'hi',L(k.sideSeam(hopperFront,32,P,5),{tone:'faint'})+`<g transform="${k.sideMatrix([0,25],0,P,'left')}"><rect class="iso-line" data-tone="lo" x="-112" y="-39" width="27" height="7" rx="1"/><path class="iso-line" data-tone="faint" d="M-112 -39L-98.5 -34L-85 -39"/></g>`+D(k.pointsAt([[-113,25,39],[-84,25,39]],P),{size:0.45}));
  b('hopper-back-fold',-120,-15,43,3,56,1,'mid');
  b('hopper-left-fold',-120,-12,3,34,56,1,'mid');
  b('hopper-right-fold',-80,-12,3,34,56,1,'mid');
  for(const y of [-7,4,15]) {
    const rim=k.segment([-117,y,28],[-117,y,56],P);
    R.items.find(i=>i.name==='hopper-left').svg=R.items.find(i=>i.name==='hopper-left').svg.replace('</g></g>',L(rim,{tone:'faint'})+'</g></g>');
  }
  // One head is a gang actuator; its capacity is workers × speed, not a head count.
  for(const y of [-21,24]) {
    b('worker-shoe',-52,y,15,10,0,4,'mid');
    b('worker-post',-48,y+2,7,6,4,53,'mid');
    b('worker-cap',-50,y,11,10,57,3,'mid');
  }
  b('worker-beam',-51,-21,13,55,60,6,'mid');
  b('drive-case',-56,-6,23,24,66,12,'mid',L(k.sideSeam({x:-56,y:-6,w:23,d:24,r:1.5},72,P,5),{tone:'faint'}));
  const cover={x:-54,y:-4,w:19,d:20,r:1.5};
  box('drive-cover',cover,78,1,'lo',screws(cover,79,2)+Array.from({length:5},(_,i)=>L(k.planOutline({x:-50,y:1+i*2.4,w:11,d:0.8,r:0.35},79,P,5),{tone:'faint'})).join(''));
  b('head-stem',-46,1,4,5,35,25,'mid');
  b('sorting-head',-51,-3,14,13,29,6,'hi');
  // Provider quota gate in a slotted frame.
  for(const y of [-21,21]) {
    b('gate-shoe',37,y,15,8,0,4,'mid');
    b('gate-column',42,y+1,5,6,4,46,'mid');
  }
  b('gate-crossbar',39,-21,11,50,50,5,'mid');
  b('gate',41,-4,4,18,28,9,'hi','', 'data-gate');
  b('quota-adjuster',39,-2,11,14,55,8,'mid');
  const dialF=G.frameAlong([44.5,5,63],[0,0,1]);
  round('quota-bezel',dialF,0,2,6,'mid',L(k.ring(44.5,5,4.8,65,P,48),{tone:'lo'}));
  round('quota-knob',dialF,2,6,4.8,'hi',L(k.knurl(44.5,5,4.8,65,69,36,P),{tone:'lo'})+L(k.ring(44.5,5,3.8,69,P,48),{tone:'faint'})+D([k.iso([44.5,5,69],P)],{size:0.65}));
  // Return elevator sits behind the working lane, never across its face.
  b('return-plinth',-2,-53,31,23,0,4,'mid');
  b('return-back',0,-53,27,4,4,82,'mid');
  for(const x of [0,22]) b('lift-guide',x,-48,5,16,4,78,'mid');
  b('return-top-left',0,-48,5,5,82,4,'mid');
  b('return-top-right',22,-48,5,16,82,4,'mid');
  const liftPlan={x:5,y:-44,w:17,d:14,r:1.5};
  box('lift-carriage',liftPlan,26,3,'hi',screws(liftPlan,29,2)+L(k.planOutline(k.insetPlan(liftPlan,3),29,P),{tone:'faint'}),'data-lift');
  b('lift-motor-bracket',0,-53,27,5,86,4,'mid');
  b('lift-drive',7,-53,12,14,90,7,'mid');
  const liftCover={x:8,y:-52,w:10,d:12,r:1};
  box('lift-drive-cover',liftCover,97,1,'lo',screws(liftCover,98,1.5)+Array.from({length:3},(_,i)=>L(k.planOutline({x:10,y:-48+i*2,w:6,d:0.6,r:0.3},98,P,4),{tone:'faint'})).join(''));
  R.items.find(i=>i.name==='return-back').svg+=`<g transform="${k.sideMatrix([0,-49],0,P,'left')}"><rect class="iso-line" data-tone="lo" x="8" y="-80" width="11" height="72" rx="5.5"/><rect class="iso-line" data-tone="faint" x="10" y="-77" width="7" height="66" rx="3.5"/></g>`;
  const liftScale={x:22,y:-32,w:5,d:2,r:0.5};
  const liftTicks=Array.from({length:17},(_,i)=>L(k.segment([22,-30,6+i*4],[22+(i%4===0?4:2.2),-30,6+i*4],P),{tone:i%4===0?'mid':'lo'})).join('');
  box('lift-ruler',liftScale,4,78,'lo',liftTicks);
  // Return trough connecting the top of the elevator to the arrival hopper.
  b('return-trough',-120,-43,120,15,82,3,'mid');
  b('return-far-lip',-120,-46,120,3,82,8,'mid');
  const upperLip={x:-95,y:-28,w:95,d:3,r:0.75};
  const upperTicks=k.topTicks(-91,-3,4,5,-27.9,90,[1.1,2.2],P);
  box('return-near-lip',upperLip,82,8,'mid',L(k.sideSeam(upperLip,86,P,5),{tone:'faint'})+L(upperTicks.minor,{tone:'faint'})+L(upperTicks.major,{tone:'lo'})+D(k.pointsAt(Array.from({length:10},(_,i)=>[-90+i*9,-25,87.5]),P),{size:0.4}));
  b('return-support',-120,-43,5,15,0,82,'mid');
  // A real transfer deck joins the attempt lane to the elevator intake.
  b('turn-deck',114,-43,17,61,25,2,'mid');
  const turnWall={x:128,y:-43,w:3,d:61,r:0.75};
  box('turn-outer-wall',turnWall,27,5,'mid',L(k.sideSeam(turnWall,29,P,5),{tone:'faint'})+D(k.pointsAt(Array.from({length:6},(_,i)=>[129.5,-38+i*9,32]),P),{size:0.45}));
  const endWall={x:114,y:15,w:14,d:3,r:0.75};
  box('turn-end-wall',endWall,27,5,'mid',L(k.sideSeam(endWall,29,P,5),{tone:'faint'})+screws(endWall,32,1.5));
  b('transfer-floor',27,-43,87,15,27,2,'mid');
  b('transfer-back-lip',27,-46,104,3,27,5,'mid');
  b('transfer-front-lip',27,-28,87,3,27,5,'mid');
  b('transfer-support',92,-41,8,12,0,27,'mid');
  b('turn-support',118,-41,8,12,0,25,'mid');
  b('upper-landing',0,-43,5,15,82,3,'mid');
  // A folded sheet-metal gravity chute drops returned tickets into the hopper.
  inclined('chute-floor',-117,-98,[[-28,85],[-28,82],[-6,54],[-6,57]],'hi');
  inclined('chute-left-rim',-120,-117,[[-28,91],[-28,85],[-6,57],[-6,63]],'mid');
  inclined('chute-right-rim',-98,-95,[[-28,91],[-28,85],[-6,57],[-6,63]],'mid');
  b('hopper-entry-landing',-117,-6,19,6,54,3,'hi');
  for(const x of [-118.5,-96.5])for(const y of [-25,-10]) {
    const at=[x,y,91-(y+28)*28/22], F=G.frameAlong(at,[0,28/22,1]);
    const name=x<-100?'chute-left-rim':'chute-right-rim';
    R.items.find(i=>i.name===name).svg+=L(G.circleOf(F,0,0.85,P,24),{tone:'lo'})+D([k.iso(at,P)],{size:0.4});
  }
  // Service panels, mounts and rail stops are working-machine details.
  for(const x of [-74,109]) {
    b('rail-stop',x,14,5,4,25,3,'mid',D(k.pointsAt([[x+2.5,16,28]],P),{size:0.5}));
    b('rail-stop-back',x,-9,5,4,25,3,'mid',D(k.pointsAt([[x+2.5,-7,28]],P),{size:0.5}));
  }
  for(const x of [-94,-56,-18,20,58,96]) {
    R.items.find(i=>i.name===`trestle-${x}`).svg+=L(k.sideSeam({x:x-3,y:-10,w:6,d:29,r:1.5},4,P,5),{tone:'faint'});
  }
  const display={x:-33,y:28,w:50,d:14,r:2};
  box('attempt-counter',display,0,20,'mid',screws(display,20,2)+L(k.planOutline(k.insetPlan(display,3),20,P),{tone:'faint'}));
  R.items[R.items.length-1].svg+=`<g transform="${k.sideMatrix([-8,42],10,P,'left')}"><defs><clipPath id="c10-attempt-window"><rect x="-22" y="-7.5" width="44" height="15" rx="1.5"/></clipPath></defs><rect class="iso-line" data-tone="lo" x="-22" y="-7.5" width="44" height="15" rx="1.5"/><g clip-path="url(#c10-attempt-window)"><text data-attempt-display x="0" y="0" dominant-baseline="central" text-anchor="middle" fill="var(--anatomy-hi)" font-family="monospace" font-size="13.5"></text></g></g>`;
  // Failure probability has its own control, separate from the provider knob.
  const failureDial={x:31,y:38,z:9,r:9.5};
  const failureF=G.frameAlong([failureDial.x,failureDial.y,0],[0,0,1]);
  round('failure-base',failureF,0,3,10.5,'mid');
  R.items[R.items.length-1].svg=`<g data-failure-control>${R.items[R.items.length-1].svg}</g>`;
  const ticks=k.radialTicks(31,38,8.5,19,3,9,[1,2],P,-Math.PI*0.82,Math.PI*1.65);
  round('failure-dial',failureF,3,9,9.5,'hi',L(k.ring(31,38,8.5,9,P,48),{tone:'lo'})+L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'})+D([k.iso([31,38,9],P)],{size:0.65}));
  R.items[R.items.length-1].svg=`<g data-failure-control>${R.items[R.items.length-1].svg}<path data-failure-needle class="iso-line" data-tone="hi" data-free="end" d="${k.lineOnTop([31,38],[31,30.5],9,P)}"/></g>`;
  // Backlog accumulator: an open bin with a vertical proportional sight gauge.
  b('bin-floor',65,30,51,25,0,4,'hi');
  const binBack={x:65,y:30,w:51,d:3,r:0.75};
  box('bin-back',binBack,4,36,'hi',L(k.sideSeam(binBack,18,P,5),{tone:'faint'})+D(k.pointsAt(Array.from({length:6},(_,i)=>[70+i*8,33,38]),P),{size:0.42}));
  b('bin-left',65,33,3,19,4,36,'hi');
  b('bin-right',113,33,3,19,4,36,'hi');
  const binFront={x:68,y:52,w:45,d:3,r:0.75};
  box('bin-front',binFront,4,16,'hi',L(k.sideSeam(binFront,8,P,5),{tone:'faint'})+`<g transform="${k.sideMatrix([0,55],0,P,'left')}"><rect class="iso-line" data-tone="lo" x="76" y="-16" width="29" height="7" rx="1.5"/><rect class="iso-line" data-tone="faint" x="79" y="-14.5" width="23" height="4" rx="1"/><circle class="iso-line" data-tone="lo" cx="73" cy="-12.5" r="1"/><circle class="iso-line" data-tone="lo" cx="108" cy="-12.5" r="1"/></g>`);
  b('bin-left-fold',65,33,3,19,40,1,'mid');
  b('bin-right-fold',113,33,3,19,40,1,'mid');
  b('bin-back-fold',65,30,51,3,40,1,'mid');
  const fillPlan={x:70,y:35,w:40,d:15,r:1};
  const fillInner=[0.25,0.5,0.75].map(t=>`<path data-fill-seam="${t}" class="iso-line" data-tone="faint" d="${k.sideSeam(fillPlan,4+34*t,P,5)}"/>`).join('')+`<path data-fill-border class="iso-line" data-tone="lo" d="${k.planOutline(k.insetPlan(fillPlan,1.5),38,P,5)}"/>`;
  box('queued-bundle',fillPlan,4,34,'hi',fillInner,'data-fill');
  b('sight-strip',116,43,5,10,0,44,'lo');
  // Sight markings are closed slots rather than free-ended face texture.
  for(let z=6;z<42;z+=6) {
    const a=k.iso([121,45,z],P),c=k.iso([121,51,z+0.8],P);
    R.items[R.items.length-1].svg+=`<path class="iso-line" data-tone="lo" d="M${a[0]} ${a[1]}L${c[0]} ${a[1]}L${c[0]} ${c[1]}L${a[0]} ${c[1]}Z"/>`;
  }
  const ptr=k.iso([123,48,5],P);
  R.items[R.items.length-1].svg+=`<g data-level><path fill="var(--anatomy-hi)" d="M${ptr[0]-3} ${ptr[1]}l6 -2v4Z"/></g>`;
  // The single lit ticket represents a message, not a count of messages.
  const ticketCenter=[-61.5,5,24.8], ticketPlan={x:-7.5,y:-5,w:15,d:10,r:1};
  const ticketRing=k.roundedPlan(ticketPlan,5), ticketBorder=k.roundedPlan({x:-6,y:-3.5,w:12,d:7,r:0.6},5);
  const ticketF=G.frameOf(ticketCenter,[0,0,1],[1,0,0],[0,1,0]);
  const ticketPaths=G.prismOf(ticketF,ticketRing,0,1.3,P);
  const ticketInner=`<path data-ticket-border class="iso-line" data-tone="faint" d="${k.planOutline({x:-67.5,y:1.5,w:12,d:7,r:0.6},26.1,P)}"/><path data-ticket-fold class="iso-line" data-tone="lo" d="${k.onTop([[-67.5,1.5],[-61.5,5],[-55.5,1.5]],26.1,P)}"/>`;
  const missingShades=ticketPaths.shades.map((d,i)=>d?'':`<path class="iso-shade" data-shade="${i}" d=""/>`).join('');
  const ticketShape=R.solid(A.prism(ticketF,ticketRing,0,1.3,{name:`stand.ticket.${n++}`}));
  R.put({name:'ticket',at:ticketCenter,piece:'stand',svg:`<g data-ticket>${S(ticketPaths,{lit:true,tone:'hi',inner:ticketInner}).replace('<path class="iso-top"',missingShades+'<path class="iso-top"')}</g>`,shapes:[ticketShape]});
  A.settle(R,P);
  R.items.sort((a,b)=>a.key-b.key);
  A.auditOrExit(R,P,{argv:audit?['--audit']:argv});
  const scene=R.items.map((i,index)=>({index,name:i.name,key:i.key}));
  // The gravity chute crosses the worker frame in projection. Measure its
  // actual surfaces at representative poses instead of guessing painter keys.
  const depthPoses=[];
  const ticketIndex=R.items.findIndex(i=>i.name==='ticket');
  const staticIndices=R.items.map((_,i)=>i).filter(i=>i!==ticketIndex);
  const ranks=new Map(R.items.map((item,i)=>[item,i]));
  const basePairs=R.settled.overlaps.pairs.filter(p=>R.settled.items[p.a].name!=='ticket'&&R.settled.items[p.b].name!=='ticket').map(p=>({...p,a:ranks.get(R.settled.items[p.a]),b:ranks.get(R.settled.items[p.b])}));
  const smooth=n=>{const v=Math.max(0,Math.min(1,n));return v*v*(3-2*v);};
  const poses=[];
  for(const y of [-35.5,-30,-25,-20,-15,-10,-6,0,5]) {
    const angle=Math.atan(28/22)*smooth((y+35.5)/12.5)*(1-smooth((y+6)/11));
    const c=Math.cos(angle),s=Math.sin(angle),floor=y=>y<=-28?85:y>=-6?57:85-(y+28)*28/22;
    const contacts=[-5,5,(-28-y)/c,(-6-y)/c].filter(v=>v>=-5&&v<=5);
    poses.push({point:[-108,y,Math.max(...contacts.map(v=>floor(y+c*v)+s*v))],angle});
  }
  for(const z of [44,28])poses.push({point:[-108,5,z],angle:0});
  for(const x of [-90,-77,-69.5,-61.5])poses.push({point:[x,5,x<-69.5?28:24.8],angle:0});
  for(const pose of poses) {
    const c=Math.cos(pose.angle),s=Math.sin(pose.angle);
    const F=G.frameOf(pose.point,[0,s,c],[1,0,0],[0,c,-s]);
    const shape=A.prism(F,ticketRing,0,1.3,{name:'stand.ticket.pose'});
    const moving={...R.items[ticketIndex],shapes:[shape],svg:S(G.prismOf(F,ticketRing,0,1.3,P),{lit:true}),move:[0,0,0]};
    const probes=[moving,...staticIndices.map(i=>R.items[i])];
    const overlaps=A.overlapsOf(probes,P,{step:0.5,least:0.35,skip:(a,b)=>a.name!=='ticket'&&b.name!=='ticket'});
    const index=i=>i===0?ticketIndex:staticIndices[i-1];
    const pairs=overlaps.pairs.map(p=>({...p,a:index(p.a),b:index(p.b)}));
    const posedItems=R.items.map((item,i)=>i===ticketIndex?moving:{...item});
    const solved=A.orderKeys(posedItems,{...overlaps,pairs:[...basePairs,...pairs]});
    if(solved.cycles.length||solved.dropped.length)throw new Error(`Ticket depth interlock at ${pose.point.join(',')}`);
    depthPoses.push({...pose,keys:solved.keys});
  }
  if(audit)console.log(`motion depth: ${depthPoses.length} measured poses · 0 interlocks`);
  const body=halo(base,-14,8)+`<g data-machine-parts>${R.items.map((i,index)=>`<g data-machine-item="${index}">${i.svg}</g>`).join('')}</g>`;
  return {markup:plate({id:10,body,role:'slider',stage:{'aria-valuemin':0,'aria-valuemax':90},keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'edge',key:'key.2'},{mark:'flat',key:'key.3'},{mark:'edge',key:'key.4'}]}),data:{P,parts:n,scene,ticketCenter,ticketRing,ticketBorder,fillPlan,depthPoses,failureDial}};
}
