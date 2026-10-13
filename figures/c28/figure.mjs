import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';

export async function build({ argv }) {
  // Compact staggered feeders leave room for FIFO at 101 without widening
  // the bed. Every ticket represents ten lots from the chapter's real book.
  const base={x:-112,y:-74,w:232,d:167,r:7};
  const priceFrom=-72,priceStep=24,stroke=6*priceStep;
  const railTop=63,buyerFloor=69,ticketPitch=1;
  const extents=[...k.boxCorners(base,-16,0),[-90,38,122],[90,74,122]];
  const P=k.fitProjection(extents,WIDTH,HEIGHT,{pad:31,azimuth:48,elevation:35});
  const {S,L,D,at,halo}=painter(P),R=A.recorder(P);
  let count=0;
  const screw=(points,z,r=1.2)=>L(points.map(([x,y])=>k.ring(x,y,r,z,P,20)).join(''),{tone:'lo'})+D(points.map(([x,y])=>at([x,y,z])),{size:.45});
  const moves=name=>name==='carriage'||name.startsWith('bush-')||name.startsWith('bid-')||name.startsWith('buyer-');
  function put(name,point,svg,shape){
    const moving=moves(name),offset=moving?[priceFrom,0,0]:[0,0,0];
    const drawing=svg.replace('<g data-part=',`<g transform="${k.translateAlong(P,offset)}" data-part=`);
    R.put({name,moving,piece:moving?'buyer':'machine',move:moving?[stroke,0,0]:[0,0,0],at:[point[0]+offset[0],point[1],point[2]],svg:drawing,shapes:[R.solid(A.moved(shape,offset))]});
  }
  function slab(name,p,z,h,tone='mid',extra='',lit=false){
    count++;
    const inner=h>1?L(k.sideSeam(p,z+h*.55,P,5),{tone:'faint'}):'';
    put(name,[p.x+p.w/2,p.y+p.d/2,z+h/2],`<g data-part="${name}">${S(k.slabOf(p,z,h,P,5,Math.min(.5,h*.15)),{tone,lit,inner})}${extra}</g>`,A.slab(p,z,h,{name:name==='base'?'stand.base':name},5));
  }
  function cylinder(name,x,y,r,z,h,tone='mid',extra=''){
    count++;put(name,[x,y,z+h/2],`<g data-part="${name}">${S(k.cylinder(x,y,r,z,h,P,64,.4),{tone,inner:L(k.sideArc(x,y,r,z+h*.5,P,32),{tone:'faint'})})}${extra}</g>`,A.cylinder(x,y,r,z,h,{name}));
  }
  for(const [i,[x,y]] of k.corners(base,15).entries()){
    slab(`foot-${i}`,{x:x-7,y:y-7,w:14,d:14,r:3},-16,3,'lo');
    slab(`foot-cap-${i}`,{x:x-5,y:y-5,w:10,d:10,r:2},-13,3,'mid');
  }
  const cooling=Array.from({length:14},(_,i)=>k.pathOf(k.roundedPlan({x:-96+i*14,y:3,w:2,d:4,r:.7},4).map(([x,z])=>at([x,93,-z])),true)).join('');
  const grooves=[101,102,104].map(p=>L(k.planOutline({x:priceFrom+(p-99)*priceStep-12,y:-68,w:24,d:99,r:3},0,P),{tone:'faint'})).join('');
  slab('base',base,-10,10,'lo',L(k.planOutline(k.insetPlan(base,4),0,P),{tone:'faint'})+screw(k.corners(base,9),0,1.6)+L(cooling,{tone:'faint'})+grooves);
  const px=p=>priceFrom+(p-99)*priceStep;
  for(const p of [101,102,104])slab(`price-strip-${p}`,{x:px(p)-1.2,y:-67,w:2.4,d:98,r:.4},0,.7,'lo',screw([[px(p),29]],.7,.6));
  // Front stops are exposed and reachable, rather than hidden by feeder faces.
  for(let p=99;p<=105;p++){
    const saddle={x:px(p)-6,y:87,w:12,d:5,r:.8};
    slab(`price-seat-${p}`,saddle,0,1,'mid',screw([[px(p)-3,89.5],[px(p)+3,89.5]],1,.7));
  }
  const slots=[{id:'A1',p:101,y:-54,q:70},{id:'A2',p:101,y:-18,q:30},{id:'A3',p:102,y:15,q:50},{id:'A4',p:104,y:-28,q:100}],tickets=[];
  for(const [i,o] of slots.entries()){
    const x=px(o.p),tray={x:x-14,y:o.y-13,w:28,d:26,r:2};
    slab(`tray-${i}`,tray,.7,3,'mid',screw(k.corners(tray,3),3.7,.8));
    const fence={x:x-14,y:o.y-13,w:28,d:2,r:.5};
    const vents=[7,13,19,25,31,37,43].map(z=>L(k.pathOf([[x-10,o.y-11,3.7+z],[x+10,o.y-11,3.7+z],[x+10,o.y-11,5+z],[x-10,o.y-11,5+z]].map(at),true),{tone:'faint'})).join('');
    slab(`fence-${i}`,fence,3.7,48,'mid',vents);
    for(const side of [-1,1]){
      const guide={x:side<0?x-14:x+12,y:o.y-11,w:2,d:22,r:.5};
      slab(`guide-${i}-${side}`,guide,3.7,12,'mid',D([[guide.x+1,o.y-7,15.7],[guide.x+1,o.y+7,15.7]].map(at),{size:.4}));
    }
    const plan={x:x-11,y:o.y-10,w:22,d:20,r:1},names=[];
    for(let n=0;n<o.q/10;n++){
      const name=`ask-${i}-${n}`,z=3.7+n*4;names.push(name);
      const face=L(k.planOutline(k.insetPlan(plan,2),z+4,P),{tone:'faint'})+L(k.lineOnTop([plan.x+3,plan.y+6],[plan.x+19,plan.y+6],z+4,P),{tone:'lo',free:true});
      slab(name,plan,z,4,'hi',face);
    }
    tickets.push(names);
    slab(`latch-${i}`,{x:x-4,y:o.y+13,w:8,d:4,r:.8},.7,4,'mid',screw([[x,o.y+15]],4.7,.85));
  }
  for(const x of [-100,92])for(const y of [37,68]){
    const foot={x:x-3,y:y-3,w:11,d:10,r:1.5};
    slab(`column-shoe-${x}-${y}`,foot,0,3,'mid',screw(k.corners(foot,2),3,.65));
    slab(`column-${x}-${y}`,{x:x-1,y:y-1,w:5,d:6,r:.7},3,54,'mid');
    slab(`column-cap-${x}-${y}`,{x:x-3,y:y-3,w:9,d:10,r:1},57,3,'mid');
  }
  for(const y of [39,66])slab(`rail-${y}`,{x:-95,y,w:187,d:4,r:1},60,3,'mid',screw([[-90,y+2],[87,y+2]],63,.65));
  for(const x of [-100,92])slab(`stop-${x}`,{x,y:36,w:5,d:37,r:1},60,7,'mid',screw([[x+2.5,40],[x+2.5,69]],67,.9));
  const car={x:-16,y:38,w:32,d:35,r:2};
  const priceWindow=k.pathOf([[16,48,64],[16,48,68],[16,60,68],[16,60,64]].map(at),true);
  const priceDisplay=`<clipPath id="c28-price-window"><path d="${priceWindow}"/></clipPath><g clip-path="url(#c28-price-window)"><g transform="${k.sideMatrix([16,54],0,P,'right')}"><text data-price-display x="0" y="-65" text-anchor="middle" font-size="3" fill="var(--anatomy-hi)" font-family="monospace"></text></g></g>${L(priceWindow,{tone:'lo'})}`;
  slab('carriage',car,railTop,6,'mid',L(k.planOutline(k.insetPlan(car,3),69,P),{tone:'lo'})+priceDisplay,true);
  const buyerNames=['carriage'];
  for(const [i,[x,y]] of k.corners(car,2).entries()){
    const name=`bush-${i}`;buyerNames.push(name);
    slab(name,{x:x-2,y:y-2,w:4,d:4,r:.5},69,3,'mid',screw([[x,y]],72,.7));
  }
  const bidPlan={x:-10,y:45,w:20,d:24,r:1},bidTickets=[];
  for(let n=0;n<50;n++){
    const name=`bid-${n}`;bidTickets.push(name);buyerNames.push(name);
    const z=buyerFloor+n*ticketPitch,face=L(k.planOutline(k.insetPlan(bidPlan,1),z+ticketPitch,P),{tone:'faint'})+L(k.lineOnTop([-7,53],[7,53],z+ticketPitch,P),{tone:'lo',free:true});
    slab(name,bidPlan,z,ticketPitch,'hi',face);
  }
  for(const x of [-13,11])for(const y of [44,65]){
    const name=`buyer-guide-${x}-${y}`;buyerNames.push(name);slab(name,{x,y,w:2,d:2,r:.4},69,50,'mid');
  }
  for(const z of [69,85,101,116]){
    const name=`buyer-back-${z}`;buyerNames.push(name);slab(name,{x:-13,y:42,w:26,d:2,r:.6},z,3,'mid');
  }
  const qtyWindow=k.planOutline({x:-5,y:49,w:10,d:12,r:1},122,P);
  const qtyDisplay=`<clipPath id="c28-qty-window"><path d="${qtyWindow}"/></clipPath><g clip-path="url(#c28-qty-window)"><g transform="${k.topMatrix([0,56],122,P,'x')}"><text data-bid-display x="0" y="1" text-anchor="middle" font-size="3" fill="var(--anatomy-hi)" font-family="monospace"></text></g></g>`;
  buyerNames.push('buyer-cap');slab('buyer-cap',{x:-13,y:42,w:26,d:28,r:1},119,3,'mid',screw([[-10,45],[10,45],[-10,67],[10,67]],122,.7)+L(qtyWindow,{tone:'lo'})+qtyDisplay);
  buyerNames.push('buyer-knob');cylinder('buyer-knob',0,81,4,63,6,'mid',L(k.knurl(0,81,4,63,69,24,P,0),{tone:'lo'}));
  buyerNames.push('buyer-handle');slab('buyer-handle',{x:-3,y:73,w:6,d:4,r:.6},63,5,'mid');
  buyerNames.push('buyer-pointer');slab('buyer-pointer',{x:-1,y:85,w:2,d:2,r:.3},.8,68.2,'mid');
  buyerNames.push('buyer-pointer-bridge');slab('buyer-pointer-bridge',{x:-2,y:77,w:4,d:10,r:.5},69,2,'mid');
  const ticks=k.topTicks(priceFrom,px(105),3,8,79,.8,[1.5,5],P);
  slab('ruler',{x:-78,y:79,w:156,d:7,r:1},0,.8,'lo',L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'})+screw([[-75,83],[75,83]],.8,.7));
  const dial=[-63,54];
  slab('gauge-foot',{x:-85,y:31,w:44,d:46,r:3},0,5,'mid',screw([[-81,35],[-45,35],[-81,73],[-45,73]],5,1));
  cylinder('gauge-neck',...dial,10,5,11);
  const gaugeTicks=k.radialTicks(...dial,18,28,4,25,[1.5,3],P,-.75*Math.PI,1.4*Math.PI);
  const capacityMark=k.onTop([[18,Math.PI/4-.08],[13,Math.PI/4],[18,Math.PI/4+.08]].map(([r,a])=>[dial[0]+r*Math.sin(a),dial[1]-r*Math.cos(a)]),25,P);
  cylinder('gauge',...dial,21,16,9,'hi',L(k.ring(...dial,18,25,P,64),{tone:'lo'})+L(gaugeTicks.minor,{tone:'lo'})+L(gaugeTicks.major,{tone:'mid'})+`<path class="iso-line" data-tone="hi" style="stroke-width:1.2" d="${capacityMark}"/>`+L(k.knurl(...dial,21,22,25,64,P,0),{tone:'lo'})+`<path data-needle class="iso-line" data-tone="hi" data-free="" d="${k.lineOnTop(dial,[dial[0],dial[1]-15],25.2,P)}"/>`+D([at([dial[0],dial[1],25.2])],{size:1}));
  const service={x:82,y:-62,w:30,d:60,r:2};
  slab('service-cover',service,0,.8,'lo',L(k.planOutline(k.insetPlan(service,3),.8,P),{tone:'faint'})+screw(k.corners(service,4),.8,.9)+Array.from({length:8},(_,i)=>L(k.planOutline({x:88,y:-52+i*5,w:18,d:1.4,r:.7},.8,P),{tone:'faint'})).join(''));
  const label={x:-106,y:-22,w:15,d:26,r:1};
  slab('maker-plate',label,0,.8,'lo',L(k.planOutline(k.insetPlan(label,1),.8,P),{tone:'faint'})+screw([[-103,-19],[-94,1]],.8,.65)+[8,13,18].map((y,i)=>L(k.lineOnTop([-103,-22+y],[-94+i,-22+y],.8,P),{tone:'lo',free:true})).join(''));
  A.settle(R,P,{states:A.uniformStates(32)});A.auditOrExit(R,P,{argv,frames:A.uniformStates(96),apart:true});
  const body=halo(base,-16,7)+R.items.sort((a,b)=>a.key-b.key).map(i=>i.svg.replace('<g transform=',`<g data-order-key="${i.key}" data-moving="${i.moving?1:0}" transform=`)).join('');
  return {markup:plate({id:28,body,role:'slider',stage:{'aria-valuemin':99,'aria-valuemax':105},keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'edge',key:'key.2'},{mark:'dim',key:'key.3'}]}),data:{P,dial,parts:count,tickets,bidTickets,buyerNames,priceFrom,priceStep,depthX:k.depthOf([1,0,0],P)}};
}
