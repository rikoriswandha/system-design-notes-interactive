import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';

// Figure: a real register with a sliding keyed stop over its receipt roller.
// The 76 solids include feet, cash drawer and pull, register fascia and vents,
// keypad, four counter windows, knurled retry knob, supported paper roller,
// stop carriage on a ruled rail, reconciliation tray on guides with end stops,
// and a calibrated webhook indicator. All displayed counts use the lab result.
export async function build({ argv }) {
  const base = { x:-120,y:-74,w:240,d:148,r:7 };
  const P = k.fitProjection([...k.boxCorners(base,-20,0),...k.boxCorners({x:-79,y:-44,w:113,d:31,r:3},66,70)],WIDTH,HEIGHT,{pad:43,azimuth:48,elevation:32});
  const { S,L,D,at,halo } = painter(P);
  const R=A.recorder(P);
  let count=0;
  function box(name,plan,z,h,tone='mid',extra='',part='') {
    count++;
    const svg=S(k.slabOf(plan,z,h,P,5,Math.min(.7,h/3)),{tone,lit:part==='gate',inner:extra});
    const piece=part==='gate'||part==='gate-arm'?'gate':name.startsWith('ledger.')?'ledger':'register';
    const move=piece==='gate'?[18,0,0]:piece==='ledger'?[0,7,0]:undefined;
    const content=part?`<g data-part="${part}">${svg}</g>`:svg;
    R.put({name,at:[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2],piece,move,svg:piece==='ledger'?`<g data-ledger-item>${content}</g>`:content,shapes:[R.solid(A.slab(plan,z,h,{name,owner:piece}))]});
  }
  function round(name,x,y,r,z,h,tone='mid',extra='') {
    count++;
    R.put({name,at:[x,y,z+h/2],piece:'register',svg:`<g data-round="${name}">${S(k.cylinder(x,y,r,z,h,P,40,.3),{tone,inner:extra})}</g>`,shapes:[R.solid(A.cylinder(x,y,r,z,h,{name,owner:'register'}))]});
  }
  function turned(name,F,s0,s1,r,tone='mid',extra='') {
    count++;
    R.put({name,at:G.pointOf(F,(s0+s1)/2,0,0),piece:'register',svg:S(G.disc(s0,s1,r,F,P),{tone,inner:extra}),shapes:[R.solid(A.disc(F,s0,s1,r,{name,owner:'register'}))]});
  }
  const screw = (x,y,z) => L(k.ring(x,y,1.5,z,P,24),{tone:'lo'})+D([at([x,y,z])],{size:.45});
  const screws = (plan,z,inset=4) => k.corners(plan,inset).map(([x,y])=>screw(x,y,z)).join('');
  const facePlan = (x,y,z,w,h,r=.7) => k.pathOf(k.roundedPlan({x,y:z,w,d:h,r},6).map(([u,v])=>at([u,y,v])),true);
  const sidePlan = (x,y,z,w,h,r=.7) => k.pathOf(k.roundedPlan({x:y,y:z,w,d:h,r},6).map(([u,v])=>at([x,u,v])),true);
  for(const [x,y] of k.corners(base,10)) {round('stand.foot',x,y,6,-20,2,'lo');round('stand.pad',x,y,4.5,-18,8,'lo');}
  box('stand.base',base,-10,10,'lo',L(k.planOutline(k.insetPlan(base,4),0,P),{tone:'faint'})+screws(base,0,9));
  const shell={x:-94,y:-53,w:137,d:111,r:5};
  box('drawer.shell',shell,0,19,'mid',L(k.sideSeam(shell,14,P,5),{tone:'faint'})+L(sidePlan(43,-45,3,88,10,1.5),{tone:'faint'})+D([-38,-18,2,22,38].map(y=>at([43,y,5])),{size:.42,tone:'lo'}));
  const drawerFace={x:-90,y:58,w:129,d:2,r:.7};
  box('drawer.front',drawerFace,3,13,'hi',L(facePlan(-86,60,5,121,9,1.2),{tone:'faint'})+D([-84,-64,14,33].map(x=>at([x,60,7])),{size:.45}));
  for(const x of [-42,-12]) box('drawer.pull-post',{x,y:60,w:3,d:5,r:.4},7,4);
  box('drawer.pull',{x:-42,y:65,w:33,d:3,r:1},7,4,'hi');
  const register={x:-90,y:-49,w:129,d:100,r:6};
  const sideVents=Array.from({length:11},(_,i)=>sidePlan(39,-37+i*5,25,1.6,12,.8)).join('');
  const frontGrille=[29,31.5,34].map(z=>facePlan(-77,51,z,23,1,.5)).join('');
  box('register.body',register,19,29,'mid',L(k.sideSeam(register,42,P,5),{tone:'faint'})+L(k.planOutline(k.insetPlan(register,4),48,P),{tone:'faint'})+L(sidePlan(39,-42,23,68,16,2),{tone:'faint'})+L(sideVents,{tone:'lo'})+L(facePlan(-83,51,24,109,13,2),{tone:'faint'})+L(frontGrille,{tone:'lo'})+D([-78,-50,-22,6,22].map(x=>at([x,51,27])),{size:.42,tone:'lo'}));
  const badgeRules=[29,30.8,32.6].map((z,i)=>k.segment([-34,52,z],[-15-i*3,52,z],P)).join('');
  box('register.badge',{x:-41,y:51,w:35,d:1,r:.4},27.8,6.2,'lo',L(facePlan(-39,52,28.7,31,4.4,.5),{tone:'faint'})+L(badgeRules,{tone:'lo',free:true})+D([at([-38,52,29]),at([-9,52,29]),at([-38,52,33]),at([-9,52,33])],{size:.4}));
  box('keypad.well',{x:-69,y:7,w:75,d:37,r:3},48,1,'lo');
  for(let row=0;row<4;row++) for(let col=0;col<4;col++) {
    const p={x:-65+col*17,y:10+row*8,w:13,d:5.8,r:1};
    box('key',p,49,2.5,'hi',L(k.planOutline(k.insetPlan(p,1.2),51.5,P),{tone:'faint'})+L(k.lineOnTop([p.x+4,p.y+2.9],[p.x+9,p.y+2.9],51.5,P),{tone:'lo',free:true}));
  }
  const displaySupport={x:-78,y:-43,w:111,d:30,r:3};
  const counterSeams=[-52,-26,0].map(x=>k.segment([x,-13,48],[x,-13,66],P)).join('');
  box('display.pedestal',displaySupport,48,18,'mid',L(k.sideSeam(displaySupport,62,P,5),{tone:'faint'})+L(facePlan(-73,-13,53,100,8,1),{tone:'faint'})+L(counterSeams,{tone:'faint'})+D([-68,-39,-10,21].map(x=>at([x,-13,57])),{size:.45}));
  const display={x:-79,y:-44,w:113,d:31,r:3};
  let screens='';
  for(let i=0;i<4;i++) {
    const p={x:-74+i*26,y:-39,w:23,d:21,r:1};
    screens+=L(k.planOutline(p,70,P),{tone:'lo'});
    screens+=`<clipPath id="c26-counter-${i}"><path d="${k.planOutline(k.insetPlan(p,1),70,P)}"/></clipPath><g clip-path="url(#c26-counter-${i})"><g transform="${k.topMatrix([p.x+p.w/2,p.y+13],70,P)}"><text data-counter="${i}" text-anchor="middle" font-family="var(--anatomy-mono)" font-size="4.8" fill="var(--anatomy-hi)"></text></g></g>`;
  }
  box('display.housing',display,66,4,'hi',screens+screws(display,70,3));
  const slot={x:6,y:0,w:30,d:42,r:1.5};
  box('receipt.slot',slot,48,1,'lo',screws(slot,49,2));
  for(const x of [6,33]) box('receipt.guide',{x,y:16,w:3,d:26,r:.6},49,3,'mid',D([at([x+1.5,19,52]),at([x+1.5,39,52])],{size:.4}));
  for(const x of [6,33]) box('receipt.bearing',{x,y:2,w:3,d:6,r:.7},49,6,'mid',screw(x+1.5,5,55));
  const roller=G.frameAlong([0,5,53.6],[1,0,0]);
  turned('receipt.axle-left',roller,9,10,1.2);
  turned('receipt.roll',roller,10,32,4,'hi');
  turned('receipt.axle-right',roller,32,33,1.2);
  const paper={x:10,y:3,w:22,d:32,r:.3};
  const rules=[9,14,19,24,29].map((y,i)=>k.lineOnTop([13,y],[i%2?25:29,y],49.6,P)).join('');
  box('receipt.paper',paper,49,.6,'hi',`<g data-part="receipt-print">${L(rules,{tone:'lo',free:true})}</g>`,'receipt');
  round('gate.foot',22,-5,5,48,3);
  round('gate.spindle',22,-5,1.5,51,9);
  round('gate.collar',22,-5,3,60,2);
  box('gate.slide-rail',{x:17,y:-8,w:30,d:6,r:.6},62,2,'mid');
  box('gate.arm',{x:17,y:-5,w:8,d:20,r:.7},64,2,'mid','','gate-arm');
  box('gate.keyed-stop',{x:17,y:12,w:8,d:3,r:.4},49.6,14.4,'hi','','gate');
  for(const x of [15,45]) box('gate.end-stop',{x,y:-9,w:2,d:8,r:.5},62,4,'mid',screw(x+1,-5,66));
  const ruler={x:17,y:-8,w:30,d:2.8,r:.4};
  box('gate.scale',ruler,64,.5,'lo');
  const ticks=k.topTicks(18,45,3,3,-8,64.5,[1,2],P);
  R.items[R.items.length-1].svg+=L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'});
  for(const x of [56,98]) box('stand.ledger-rail',{x,y:-28,w:3,d:89,r:.6},0,2,'mid',D([at([x+1.5,-26,2]),at([x+1.5,59,2])],{size:.45}));
  for(const y of [-30,62]) box('stand.ledger-stop',{x:55,y,w:48,d:2,r:.5},0,4,'mid',D([at([57,y+1,4]),at([101,y+1,4])],{size:.45}));
  const trayScale={x:105,y:-24,w:3,d:71,r:.5};
  box('stand.ledger-scale',trayScale,0,.6,'lo');
  const trayTicks=k.topTicks(-22,44,3,5,105,.6,[1,2],P,'y');
  R.items[R.items.length-1].svg+=L(trayTicks.minor,{tone:'lo'})+L(trayTicks.major,{tone:'mid'});
  box('ledger.floor',{x:55,y:-24,w:48,d:71,r:2},2,4,'lo',L(k.planOutline({x:60,y:-19,w:38,d:61,r:1},6,P),{tone:'faint'}));
  for(const p of [{x:55,y:-24,w:3,d:71,r:.7},{x:100,y:-24,w:3,d:71,r:.7},{x:58,y:-24,w:42,d:3,r:.7}]) box('ledger.wall',p,6,10,'mid',L(k.sideSeam(p,13,P,5),{tone:'faint'}));
  const ledger={x:61,y:-15,w:36,d:55,r:1};
  const ledgerRules=[0,8,16,24,32].map(y=>k.lineOnTop([65,y],[93,y],6.8,P)).join('');
  box('ledger.sheet',ledger,6,.8,'hi',L(k.planOutline({x:64,y:-12,w:30,d:48,r:.5},6.8,P),{tone:'faint'})+L(ledgerRules,{tone:'lo',free:true})+L(k.lineOnTop([73,-12],[73,36],6.8,P),{tone:'faint'}),'ledger');
  for(const x of [67,86]) box('ledger.pull-post',{x,y:47,w:2,d:3,r:.4},3,2);
  box('ledger.pull',{x:67,y:50,w:21,d:2,r:.7},3,2,'hi');
  const lampBase={x:64,y:-61,w:29,d:24,r:3};
  box('webhook.plinth',lampBase,0,4,'mid',screws(lampBase,4,4)+L(k.planOutline(k.insetPlan(lampBase,2),4,P),{tone:'faint'}));
  round('webhook.stem',78,-49,3,4,21);
  round('webhook.lamp',78,-49,7,25,8,'hi');
  const deliveryTicks=k.radialTicks(78,-49,6.2,11,5,35,[.8,1.6],P,0,Math.PI);
  round('webhook.cap',78,-49,8,33,2,'mid',L(k.ring(78,-49,6.2,35,P,48),{tone:'lo'})+L(deliveryTicks.minor,{tone:'lo'})+L(deliveryTicks.major,{tone:'mid'})+`<path class="iso-line" data-tone="hi" data-free="end" data-part="webhook-needle" d="${k.lineOnTop([78,-49],[78,-54.6],35,P)}"/>`+D([at([78,-49,35])],{size:.65}));
  box('register.trim',{x:-85,y:45,w:117,d:3,r:.7},48,1,'lo');
  turned('drawer.lock',G.frameAlong([-67,60,10],[0,1,0]),0,1.2,2.5,'hi',L(facePlan(-68.5,61.2,9.75,3,.5,.25),{tone:'mid'}));
  round('retry.knob-seat',-82,-4,6.2,48,1,'lo');
  round('retry.knob',-82,-4,5.3,49,4,'mid',L(k.knurl(-82,-4,5.3,49,53,30,P,0),{tone:'lo'}));
  const retryTicks=k.radialTicks(-82,-4,4.1,6,1,53.6,[1,1.3],P,0,Math.PI);
  round('retry.cap',-82,-4,5.3,53,.6,'hi',L(k.ring(-82,-4,4.1,53.6,P,40),{tone:'lo'})+L(retryTicks.major,{tone:'mid'})+`<path class="iso-line" data-tone="hi" data-free="end" data-part="retry-needle" d="${k.lineOnTop([-82,-4],[-82,-7.4],53.6,P)}"/>`+D([at([-82,-4,53.6])],{size:.5}));
  const label={x:-115,y:6,w:15,d:42,r:1};
  box('stand.label',label,0,.8,'lo',L(k.planOutline(k.insetPlan(label,1.4),.8,P),{tone:'faint'})+L([0,1,2].map(i=>k.lineOnTop([-112+i*3,14],[-112+i*3,38-i*4],.8,P)).join(''),{tone:'lo',free:true})+screw(-107.5,10,.8)+screw(-107.5,44,.8));
  // Sample the complete, monotone stable ↔ new-key slide, not only its endpoints.
  const gateStates=Array.from({length:73},(_,i)=>[0,.5,1].map(ledger=>({label:`key travel ${i}/72; ledger ${ledger}`,shares:{gate:i/72,ledger}}))).flat();
  A.settle(R,P,{states:gateStates});
  R.items.sort((a,b)=>a.key-b.key);
  A.auditOrExit(R,P,{argv,apart:true,frames:gateStates});
  const machine=R.items.map(item=>`<g data-order-item data-key="${item.key}" data-lift="${G.dot3(item.move||[0,0,0],G.viewOf(P))}" data-moving="${item.move?item.piece:''}">${item.svg}</g>`).join('');
  const body=[halo(base,-20,8),`<g data-machine>${machine}</g>`];
  return {markup:plate({id:26,body,role:'group',keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'edge',key:'key.2'},{mark:'raised',key:'key.3'}]}),data:{P,parts:count,paper}};
}
