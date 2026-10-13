import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';

// A cutaway coin magazine mechanically unlocks a request gate. The clock rack
// indexes refill, fixed-window phase or oldest rolling timestamp; the trays
// retain the lab's cumulative outcomes. All engraved detail belongs to a part.
export async function build({ audit, argv }) {
  const base = { x: -80, y: -75, w: 185, d: 137, r: 8 };
  const P = k.fitProjection([...k.boxCorners(base, -15, 0), [-73,-43,125]], WIDTH, HEIGHT, { pad: 42, azimuth: 52, elevation: 12 });
  const { S, L, D, at, halo } = painter(P);
  const R = A.recorder(P);
  let serial = 0;
  const plan = (x,y,w,d,r=1) => ({x,y,w,d,r});
  function put(name, centre, svg, shape, attrs = '') {
    const piece=name==='gate'?'gate':name==='clock-rider'?'clock':name==='request'?'request':'machine';
    const move=piece==='gate'?[0,0,13]:piece==='clock'?[45,0,0]:[0,0,0];
    R.put({name,piece,move,at:centre,svg:`<g data-part="${name}" ${attrs}>${svg}</g>`,shapes:[R.solid(shape)]});
  }
  function slab(name, p, z, h, tone = 'mid', extra = '', attrs = '') {
    put(name,[p.x+p.w/2,p.y+p.d/2,z+h/2],
      S(k.slabOf(p,z,h,P,5,Math.min(.7,h/3)), {tone, lit:tone==='lit', inner:extra}),
      A.slab(p,z,h,{name:`${name}.${serial++}`,ground:name==='foot'},5),attrs);
  }
  function round(name,x,y,r,z,h,tone='mid',extra='',attrs='') {
    put(name,[x,y,z+h/2],S(k.cylinder(x,y,r,z,h,P,56,.3),{tone,inner:extra}),
      A.cylinder(x,y,r,z,h,{name:`${name}.${serial++}`}),attrs);
  }
  function screws(p,z,inset=3) {
    const points=k.corners(p,inset);
    return L(points.map(([x,y])=>k.ring(x,y,1.25,z,P,24)).join(''),{tone:'lo'})+
      D(points.map(([x,y])=>at([x,y,z])),{size:.5,tone:'mid'});
  }
  function seam(p,z) { return L(k.sideSeam(p,z,P,5),{tone:'faint'}); }
  // Foundation: separately seated rubber feet, a machined deck and fastening ring.
  for(const [x,y] of k.corners(base,18)) slab('foot',plan(x-6,y-6,12,12,2),-15,5,'lo');
  slab('deck',base,-10,10,'lo',
    L(k.planOutline(k.insetPlan(base,4),0,P),{tone:'faint'})+
    seam(base,-5)+screws(base,0,10));
  const nameplate=plan(-74,43,51,13,1.5);
  slab('maker-plate',nameplate,0,.7,'lo',
    L(k.planOutline(k.insetPlan(nameplate,1.5),.7,P),{tone:'faint'})+
    [0,1,2].map(i=>L(k.lineOnTop([-69,46+i*3],[-46+i*5,46+i*3],.7,P),{tone:'lo',free:true})).join('')+
    D([at([-71,49,.7]),at([-26,49,.7])],{size:.5}));
  const dial=[-65,-61],dialRadius=7.8;
  round('clock-bezel',...dial,11,0,6,'hi',
    L(k.knurl(...dial,11,0,6,56,P),{tone:'lo'})+
    L(k.ring(...dial,9,6,P,72),{tone:'lo'}));
  const dialTicks=k.radialTicks(...dial,9,10,5,6,[1.2,2.3],P);
  R.items[R.items.length-1].svg+=L(dialTicks.minor,{tone:'lo'})+L(dialTicks.major,{tone:'mid'})+
    `<path data-clock-needle class="iso-line" data-tone="hi" data-free="end" d="${k.lineOnTop(dial,[dial[0],dial[1]-dialRadius],6.1,P)}"/>`+
    D([at([...dial,6.1])],{size:.8,tone:'hi'});
  // A supported, lipped request ramp. Closed channels and bushed end stops.
  for(const x of [-62,62]) {
    const p=plan(x,-8,12,27,2);
    slab('rail-foot',p,0,16,'mid',seam(p,8));
  }
  const rail=plan(-66,-8,146,27,2);
  slab('request-rail',rail,16,5,'mid',seam(rail,18.5));
  for(const x of [-62,76]) {
    const p=plan(x,-5,8,21,1);
    slab('rail-stop',p,21,3,'hi',screws(p,24,2.5));
  }
  slab('rear-lip',plan(-66,-8,132,3,.5),21,4,'mid');
  slab('rear-lip',plan(75,-8,5,3,.5),21,4,'mid');
  slab('front-lip',plan(-66,16,44,3,.5),21,4,'mid');
  slab('front-lip',plan(-9,16,6,3,.5),21,4,'mid');
  slab('front-lip',plan(7,16,73,3,.5),21,4,'mid');
  const ruler=plan(-48,-4,35,2.5,.3);
  slab('request-ruler',ruler,21,.5,'lo');
  const ticks=k.topTicks(-45,-16,4,5,-4,21.5,[1,2],P);
  R.items[R.items.length-1].svg+=L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'});
  // The coin tube is the dominant subject, split at the camera's tangent
  // planes so its far shell never paints over coins in the slot window.
  const coin=[-33,-37];
  const polar=(r,degrees)=>[coin[0]+r*Math.cos(degrees*Math.PI/180),coin[1]+r*Math.sin(degrees*Math.PI/180)];
  const sector=(from,to,inside,outside)=>{
    const n=Math.ceil((to-from)/2),ring=[];
    for(let i=0;i<=n;i++)ring.push(polar(outside,from+(to-from)*i/n));
    for(let i=n;i>=0;i--)ring.push(polar(inside,from+(to-from)*i/n));
    return ring;
  };
  round('magazine-seat',...coin,28,0,28,'mid',
    L(k.sideArc(...coin,28,15,P,72),{tone:'faint'})+
    L(k.ring(...coin,26.5,28,P,96),{tone:'lo'}));
  for(const [from,to,lit] of [[112,142,false],[142,322,true],[322,362,false]]) {
    const ring=sector(from,to,23.5,25);
    put('coin-tube',[...coin,60.5],
      S(k.extrude(ring,28,65,P,{convex:false}),{tone:'hi',lit}),
      A.extruded(ring,28,65,{name:`coin-tube.${from}`}));
  }
  const jamb=sector(102,112,23.5,26);
  const gauge=[];
  for(let i=0;i<30;i++){
    const z=29+i*2,a=polar(26,102),b=polar(i%5?24.5:23.5,102);
    gauge.push(k.segment([...a,z],[...b,z],P));
  }
  put('window-ruler',[...polar(25,107),60.5],
    S(k.extrude(jamb,28,65,P,{convex:false}),{tone:'hi',inner:L(gauge.join(''),{tone:'lo'})}),
    A.extruded(jamb,28,65,{name:'window-ruler'}));
  for(let i=0;i<30;i++) {
    const z=28+i*2;
    round('token',...coin,21,z,2,'hi',
      L(k.ring(...coin,17,z+2,P,96),{tone:'faint'}),
      `data-token="${i}" style="display:none"`);
  }
  const collar=G.frameAlong([...coin,93],[0,0,1]);
  put('magazine-collar',[...coin,94.5],
    S(G.ringBand(0,3,22,28,collar,P,{hole:[3,22]}),{tone:'hi',
      inner:D(Array.from({length:8},(_,i)=>at([...polar(26.5,i*45),96])),{size:.5})}),
    A.ring(collar,0,3,22,28,{name:'magazine-collar'}));
  const post=plan(-73,-43,10,12,2);
  slab('clock-post',post,0,112,'mid',seam(post,56));
  const head=plan(-73,-43,73,12,2);
  slab('clock-head',head,112,7,'mid',seam(head,115.5)+screws(head,119,3));
  slab('clock-track',plan(-60,-40,52,6,1),119,1,'lo');
  for(let i=0;i<10;i++) slab('rack-tooth',plan(-60+i*5.2,-40,1.8,6,.2),120,2,'mid');
  slab('clock-rider',plan(-59,-40,5,6,.5),122,3,'hi',
    D([at([-56.5,-37,125])],{size:.5}), 'data-clock');
  const neck=plan(-39,-33,12,10,1);
  slab('feed-neck',neck,96,16,'mid',seam(neck,104));
  // The admission bolt lifts in a guide rather than passing through its frame.
  const mount=plan(-8,19,24,12,2);
  slab('gate-mount',mount,0,25,'mid',seam(mount,13)+screws(mount,25,3));
  slab('gate-slide',plan(-5,19,18,9,1),25,4,'mid');
  const guideSlot=k.pathOf(k.roundedPlan(plan(2,25,9,14,1.2),5).map(([y,z])=>at([7,y,z])),true);
  slab('gate-guide',plan(3,-5,4,24,.5),21,22,'mid',
    L(guideSlot,{tone:'lo'})+
    L(k.sideRing([7,-2,24],.8,'x',P)+k.sideRing([7,16,40],.8,'x',P),{tone:'lo'}));
  slab('gate',plan(-2,-5,5,24,1),21,4,'mid','', 'data-gate');
  round('gate-button',3.5,25.5,2.5,29,5,'hi',
    L(k.knurl(3.5,25.5,2.5,29,34,20,P),{tone:'lo'}));
  const rejectLane=plan(-22,45,67,8,1);
  slab('reject-channel',rejectLane,0,3,'lo',L(k.planOutline(k.insetPlan(rejectLane,.8),3,P),{tone:'faint'}));
  slab('reject-guide',plan(-22,45,67,1,.3),3,3,'mid');
  slab('reject-guide',plan(-22,52,67,1,.3),3,3,'mid');
  // The removable outcome collectors have side seams and inset floors.
  const screens=[];
  for(const [id,y,d] of [['accepted',-48,30],['rejected',28,27]]) {
    const p=plan(45,y,48,d,3);
    slab('tray-floor',p,0,3,'lo',L(k.planOutline(k.insetPlan(p,5),3,P),{tone:'faint'}));
    const back=plan(45,y,48,3,1),left=plan(45,y+3,3,d-3,1),right=plan(90,y+3,3,d-3,1);
    slab('tray-back',back,3,11,'mid',seam(back,9));
    if(id==='rejected') {
      slab('tray-side',plan(45,y+3,3,15,1),3,11,'mid');
      slab('tray-side',plan(45,52,3,3,.5),3,11,'mid');
    } else slab('tray-side',left,3,11,'mid',seam(left,9));
    slab('tray-side',right,3,11,'mid',seam(right,9));
    const front=plan(48,y+d-3,42,3,1);
    if(id==='accepted') {
      for(const p of [plan(48,y+d-3,18,3,1),plan(75,y+d-3,15,3,1)])
        slab('tray-front',p,3,6,'hi',seam(p,6));
    } else slab('tray-front',front,3,6,'hi',seam(front,6));
    const display=plan(53,y+6,30,12,1);
    slab('counter-seat',display,3,3,'mid');
    const screen=k.pathOf([[54,y+18,7],[82,y+18,7],[82,y+18,14],[54,y+18,14]].map(at),true);
    slab('counter-face',display,6,9,'hi',L(screen,{tone:'lo'}));
    screens.push(`<clipPath id="c04-${id}-screen"><path d="${screen}"/></clipPath><g clip-path="url(#c04-${id}-screen)"><g transform="${k.sideMatrix([68,y+18],0,P,'left')}"><text data-${id} y="-8.5" text-anchor="middle" font-size="6" font-family="monospace" fill="var(--anatomy-hi)"></text></g></g>`);
  }
  // A true selector bank, each detent is mounted on the same plate.
  const selector=plan(-74,22,55,18,2);
  slab('selector-plate',selector,0,3,'mid',screws(selector,3,3));
  for(let i=0;i<3;i++) {
    const x=-63+i*16,y=31;
    round('selector-detent',x,y,5.5,3,2,'mid',L(k.ring(x,y,4.5,5,P,40),{tone:'lo'}));
    round('selector-knob',x,y,3.5,5,4,'hi',
      L(k.knurl(x,y,3.5,5,9,24,P),{tone:'lo'})+
      L(k.lineOnTop([x,y],[x,y-3.4],9,P),{tone:'hi',free:'end'})+
      D([at([x,y,9])],{size:.5}),`data-mode="${i}"`);
  }
  // The inspection pallet never crosses the bolt; actual decisions use the two result routes.
  slab('request',plan(-52,1,6,6,1),21,3,'hi','', 'data-request style="opacity:0"');
  const poses=[];
  for(const gate of [0,.25,.5,.75,1]) for(const clock of [0,.25,.5,.75,1])
    poses.push({label:`gate ${gate} · clock ${clock}`,shares:{gate,clock}});
  A.settle(R,P,{states:poses});
  const routes={
    preview:[[0,0,0,0],[1,32,0,0]],
    accepted:[[0,0,0,0],[.65,120,0,0],[.8425,120,-22,0],[1,120,-30,-18]],
    rejected:[[0,0,0,0],[.45,32,0,0],[.72,32,45,-18],[1,120,45,-18]]
  };
  const eventSeconds=.8; // Finish before the legacy automatic mode's next one-second tick.
  if(audit) {
    A.auditOrExit(R,P,{argv:argv||['--audit'],frames:poses,apart:true});
    const requestShape=R.solids.find(shape=>shape.piece==='request');
    const collisions=[];
    for(const [name,route] of Object.entries(routes)) for(let i=0;i<=100;i++) {
      const progress=i/100;
      let end=route.findIndex(point=>point[0]>=progress);
      if(end<1)end=1;
      const a=route[end-1],b=route[end],t=(progress-a[0])/(b[0]-a[0]);
      const offset=a.slice(1).map((value,axis)=>value+(b[axis+1]-value)*t);
      const seconds=progress*eventSeconds;
      const opening=name==='accepted'
        ? 1-Math.exp(-seconds/.19)
        : name==='rejected'?Math.exp(-seconds/.19):0;
      const solids=R.solids.filter(shape=>shape!==requestShape).map(shape=>
        shape.piece==='gate'?A.moved(shape,[0,0,opening*13]):shape);
      solids.push(A.moved(requestShape,offset));
      collisions.push(...A.solidClearances(solids).map(collision=>({...collision,route:name,progress})));
    }
    console.log(`request paths: ${collisions.length} solid collisions · 303 sampled poses`);
    if(collisions.length)throw new Error(JSON.stringify(collisions));
  }
  const selectionStyle='<style>.iso-figure[data-figure="4"] [data-mode][data-selected="false"] .iso-line{stroke:var(--anatomy-lo)}.iso-figure[data-figure="4"] [data-part="magazine-collar"] .iso-fill{fill-rule:evenodd}</style>';
  const body=selectionStyle+halo(base,-15,10)+`<g data-machine>${R.items.sort((a,b)=>a.key-b.key).map(i=>`<g data-depth="${i.key}" data-piece="${i.piece}">${i.svg}</g>`).join('')}<g data-screens>${screens.join('')}</g></g>`;
  const controls='<div class="iso-controls">'+[['send','send'],['burst','burst'],['tick','tick'],['mode','mode']].map(([action,key])=>`<button class="btn" data-action="${action}" data-fig-text="fig.c04.btn.${key}"></button>`).join('')+'</div>';
  return {markup:plate({id:4,body,role:'group',controls,keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'edge',key:'key.2'}]}),data:{P,dial,dialRadius,routes,eventSeconds,parts:R.items.length}};
}
