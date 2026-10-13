import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';
import * as T from '../kit/tube.mjs';

// The chase is the manifest. A screw press and reuse gate reduce the transfer
// sled's payload before a guided lift delivers it to the pneumatic dispatch.
// Fixed hardware: feet, chased rails, quoins, locks, press columns and thrust
// collar, spoked handwheel, reuse wells and scale, lift guides, annular ports,
// a ball elbow, clamped riser and iris. Rim sectors sort around the handwheel.
export async function build({ audit, argv }) {
  const base = { x:-150,y:-65,w:300,d:130,r:7 };
  const P = k.fitProjection([...k.boxCorners(base,-15,0),...k.boxCorners({x:2.5,y:-19.5,w:42,d:42,r:0},91,95),[43,1.5,105]],WIDTH,HEIGHT,{pad:44,azimuth:48,elevation:35});
  const { S,L,D,at,halo } = painter(P);
  const R = A.recorder(P);
  let count=0;
  const box=(name,plan,z,h,tone='mid',extra='',attrs='')=>{
    count++;
    const shape=R.solid(A.slab(plan,z,h,{name,ground:name==='stand.base'},4));
    R.put({name,piece:'machine',at:[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2],svg:S(k.slabOf(plan,z,h,P,4,.5),{tone,inner:L(k.sideSeam(plan,z+h*.45,P,4),{tone:'faint'})})+extra,shapes:[shape],attrs});
  };
  const rect=(x,y,w,d,r=1)=>({x,y,w,d,r});
  const screwDots=(plan,z,inset=3)=>L(k.corners(plan,inset).map(([x,y])=>k.ring(x,y,1.25,z,P,20)).join(''),{tone:'lo'})+D(k.corners(plan,inset).map(([x,y])=>at([x,y,z])),{size:.48});
  const disc=(name,x,y,r,z,h,extra='',meta={})=>{
    count++;
    const F=G.frameOf([x,y,0],[0,0,1],[1,0,0],[0,1,0]);
    const shape=R.solid(A.disc(F,z,z+h,r,{name,...meta}));
    R.put({name,piece:'machine',at:[x,y,z+h/2],svg:S(k.cylinder(x,y,r,z,h,P,48,.35),{tone:'mid',inner:L(k.sideArc(x,y,r,z+h*.5,P,32),{tone:'faint'})})+extra,shapes:[shape]});
  };
  const annulus=(name,F,s0,s1,rIn,rOut,extra='',attrs='',meta={})=>{
    count++;
    const shape=R.solid(A.lathe(F,[[s0,rIn],[s0,rOut],[s1,rOut],[s1,rIn]],{name,owner:name,...meta}));
    R.put({name,piece:'machine',at:G.pointOf(F,(s0+s1)/2,0,0),svg:S(G.ringBand(s0,s1,rIn,rOut,F,P,{steps:64}),{tone:'mid',inner:L(G.arcOf(F,(s0+s1)/2,rOut,P),{tone:'faint'})})+extra,shapes:[shape],attrs});
  };
  const pipe=(name,points,gaps=[],free=[false,false])=>{
    R.route(name,points,3,{gaps,piece:'machine',owner:name,free});
    T.tubePieces(points,3,P,{gaps,maxLength:12,rings:{pitch:5,fade:[.1,.55]}}).forEach((part,index)=>{
      count++;
      R.put({name:`${name}:${index}`,piece:'machine',at:part.mid,svg:T.tubeSvg(part,{tone:'mid'}),shapes:[A.tube(part.points,part.radii)],route:name,chunk:index});
    });
  };
  for(const [i,[x,y]] of k.corners(base,18).entries()) {
    box(`foot.pad${i}`,rect(x-7,y-7,14,14,3),-15,2,'lo');
    box(`foot${i}`,rect(x-5,y-5,10,10,2),-13,3,'lo');
  }
  const clampSlots=[-80,-60,-40,-20].map(x=>k.planOutline(rect(x,52,12,4,2),0,P,5)).join('');
  const locatingHoles=[-120,-80,-40,0,60,110].map(x=>k.ring(x,-56,2,0,P,24)+k.ring(x,-56,1,0,P,24)).join('');
  box('stand.base',base,-10,10,'lo',L(k.planOutline(k.insetPlan(base,5),0,P),{tone:'faint'})+screwDots(base,0,10)+L(clampSlots+locatingHoles,{tone:'lo'}));
  const chase=rect(-132,-44,116,87,3);
  box('chase.bed',chase,0,5,'lo',L(k.planOutline(k.insetPlan(chase,3),5,P),{tone:'faint'}));
  for(const [i,p] of [rect(-132,-44,116,5),rect(-132,38,116,5),rect(-132,-39,5,77),rect(-21,-39,5,77)].entries()) box(`chase.rail${i}`,p,5,7,'mid',D(k.corners(p,2).map(([x,y])=>at([x,y,12])),{size:.45}));
  for(const [i,[x,y]] of [[-119,-36],[-38,-36],[-119,29],[-38,29]].entries()) {
    box(`quoin${i}`,rect(x,y,16,7),5,4,'mid');
    box(`lock${i}`,rect(x+5,y+1,6,5),9,3,'hi',D([at([x+8,y+3.5,12])],{size:.5}));
  }
  box('transfer.bed',rect(-7,-8,135,32,2),0,4,'lo');
  for(const y of [-8,20]) box(`transfer.rail${y}`,rect(-7,y,135,4),4,3,'mid');
  for(const x of [-11,131]) box(`transfer.stop${x}`,rect(x,-8,4,32),0,9);
  for(const x of [7,40]) for(const y of [-29,31]) {
    box(`press.foot${x}.${y}`,rect(x-6,y-6,12,12,2),0,4,'lo',D([at([x,y,4])],{size:.5}));
    box(`press.post${x}.${y}`,rect(x-2,y-2,4,4),4,56);
    box(`press.cap${x}.${y}`,rect(x-4,y-4,8,8),60,4);
  }
  const beam=rect(1,-35,45,72,2);
  const beamSlots=Array.from({length:6},(_,i)=>k.planOutline(rect(8,-26+i*9,8,3,1.5),69,P,4)).join('');
  box('press.beam',beam,64,5,'mid',screwDots(beam,69,5)+L(k.planOutline(k.insetPlan(beam,3),69,P),{tone:'faint'})+L(beamSlots,{tone:'lo'}));
  box('press.screw',rect(21,-1,5,5),29,35,'mid','', ' data-part="stem"');
  const platen=rect(4,-5,39,24,2);
  box('press.platen',platen,24,5,'hi',L(k.planOutline(k.insetPlan(platen,3),29,P),{tone:'lo'})+screwDots(platen,29,4), ' data-part="press"');
  // A real screw press has a thrust collar, spindle, spoked handwheel and grip.
  disc('press.thrust',23.5,1.5,7,69,4,L(k.knurl(23.5,1.5,7,69,73,40,P),{tone:'lo'}));
  disc('press.spindle',23.5,1.5,2.5,73,18);
  disc('press.hub',23.5,1.5,5,91,4,L(k.ring(23.5,1.5,3,95,P,32),{tone:'lo'})+D([at([23.5,1.5,95])],{size:.5}));
  const wheelF=G.frameOf([23.5,1.5,0],[0,0,1],[1,0,0],[0,1,0]);
  // Rim sectors share one machined circle, but sort individually around its hub.
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8,b=(i+1)*Math.PI/8;
    const poly=[...Array.from({length:9},(_,j)=>[21*Math.cos(a+(b-a)*j/8),21*Math.sin(a+(b-a)*j/8)]),...Array.from({length:9},(_,j)=>[18*Math.cos(b-(b-a)*j/8),18*Math.sin(b-(b-a)*j/8)])];
    const shape=R.solid(A.prism(wheelF,poly,91,95,{name:`press.rim${i}`}));count++;
    R.put({name:`press.rim${i}`,piece:'machine',at:[23.5+19.5*Math.cos((a+b)/2),1.5+19.5*Math.sin((a+b)/2),93],svg:S(k.extrude(poly.map(([x,y])=>[x+23.5,y+1.5]),91,4,P,{convex:false,bevel:.2}),{tone:'mid',crease:'faint'}),shapes:[shape]});
  }
  for(let i=0;i<4;i++){
    const angle=i*Math.PI/2,spread=.11;
    const poly=[...Array.from({length:9},(_,j)=>[18*Math.cos(angle-spread+j*spread/4),18*Math.sin(angle-spread+j*spread/4)]),...Array.from({length:9},(_,j)=>[5*Math.cos(angle+spread-j*spread/4),5*Math.sin(angle+spread-j*spread/4)])];
    const shape=R.solid(A.prism(wheelF,poly,91,95,{name:`press.spoke${i}`}));count++;
    R.put({name:`press.spoke${i}`,piece:'machine',at:[23.5+11.5*Math.cos(angle),1.5+11.5*Math.sin(angle),93],svg:S(k.extrude(poly.map(([x,y])=>[x+23.5,y+1.5]),91,4,P,{convex:false,bevel:.25}),{tone:'mid'}),shapes:[shape]});
  }
  disc('press.grip-stem',43,1.5,1.1,95,6);
  disc('press.grip',43,1.5,2.3,101,4,L(k.knurl(43,1.5,2.3,101,105,24,P),{tone:'lo'}));
  const caseWells=[62,78,94].map(x=>k.planOutline(rect(x+1,-43,10,21,1),5,P,4)).join('');
  box('reuse.bed',rect(59,-48,53,31,2),0,5,'lo',L(caseWells,{tone:'faint'}));
  for(const x of [59,75,91,108]) box(`reuse.divider${x}`,rect(x,-45,3,25),5,8,'mid');
  box('reuse.back',rect(59,-48,52,3),5,8);
  box('reuse.front',rect(59,-20,52,3),5,5);
  box('reuse.gate',rect(62,24,24,5),4,7,'hi',L(k.planOutline(rect(65,25,18,3,1),11,P),{tone:'lo'})+L(k.lineOnTop([74,24],[74,29],11,P),{tone:'hi'})+D([at([64,26.5,11]),at([84,26.5,11])],{size:.4}), ' data-part="gate"');
  // The dispatch riser is real plumbing: both straight runs finish on fittings;
  // the ball elbow turns inside the fitting and its stem carries it to the base.
  const inletF=G.frameOf([110,10,44],[1,0,0],[0,1,0],[0,0,1]);
  box('outlet.inlet-stand',rect(110,4,2,12,.4),4,34,'lo');
  annulus('outlet.inlet',inletF,0,2,3,6,D(G.dotsOf(inletF,2,4.6,8,P,{all:true}),{size:.4}));
  const elbow=[140,10,44],radius=5.3,rim=Math.sqrt(radius*radius-9);
  disc('outlet.elbow-stem',140,10,3,0,44-rim,'',{owner:'outlet.elbow'});
  const elbowShape=R.solid(A.ball(elbow,radius,{name:'outlet.elbow',owner:'outlet.elbow'}));count++;
  R.put({name:'outlet.elbow',piece:'machine',at:elbow,svg:S(G.sphereOf(elbow,radius,P,{steps:48}),{tone:'mid'}),shapes:[elbowShape]});
  // Both terminal flanges are removable quick-disconnect ports; their rims land
  // on annular seats. A free end denotes the detachable, open port, not a stub.
  pipe('outlet.feed',[[112,10,44],[140-rim,10,44]],[],[true,false]);
  pipe('outlet.riser',[[140,10,44+rim],[140,10,67]],[[58-(44+rim),61-(44+rim)]],[false,true]);
  const riserF=G.frameOf([140,10,0],[0,0,1],[1,0,0],[0,1,0]);
  const bracketFoot=rect(135.3,-11,8,8,1);
  box('outlet.bracket-foot',bracketFoot,0,3,'lo',screwDots(bracketFoot,3,1.5));
  box('outlet.bracket-post',rect(139.3,-7,1.4,2,.3),3,58,'mid');
  box('outlet.bracket-arm',rect(139.3,-5,1.4,9.5,.3),58,3,'mid');
  annulus('outlet.clamp',riserF,58,61,3,5.5,D(G.dotsOf(riserF,61,4.3,8,P,{all:true}),{size:.4}),'',{owner:'outlet.riser'});
  annulus('outlet.lip',riserF,67,71,3,6,D(G.dotsOf(riserF,71,4.6,8,P,{all:true}),{size:.4}));
  annulus('outlet.iris',riserF,71,72,.3,6,L(G.spokesOf(riserF,72,.3,6,6,P,{sweep:.2}),{tone:'lo',className:'c15-iris-blades'})+L(G.circleOf(riserF,72,.3,P,64),{tone:'lo',className:'c15-iris-aperture'}), ' data-part="jaw"');
  for(const y of [-8,20])box(`outlet.lift-guide${y}`,rect(110,y,4,4,.7),7,43,'mid',D([at([112,y+2,50])],{size:.45}));
  const strip=rect(-6,43,133,6);
  const ticks=k.topTicks(-2,123,5,5,43,1,[2,4],P);
  box('ruler',strip,0,1,'lo',L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'}));
  const reuseTicks=k.topTicks(63,107,2,5,31,1,[1.6,3.2],P);
  box('reuse.scale',rect(59,31,51,5),0,1,'lo',L(reuseTicks.minor,{tone:'lo'})+L(reuseTicks.major,{tone:'mid'}));
  const label=rect(-130,49,40,9);
  box('nameplate',label,0,1,'lo',L(k.planOutline(k.insetPlan(label,1.5),1,P),{tone:'faint'})+L([25,19,22].map((w,i)=>k.lineOnTop([-126,51.5+i*2],[-126+w,51.5+i*2],1,P)).join(''),{tone:'lo',free:true})+D([at([-94,53,1])],{size:.45}));
  A.settle(R,P);
  if(audit) A.auditOrExit(R,P,{argv});
  R.items.sort((a,b)=>a.key-b.key);
  const bearingShoes=[[-1,-7],[18,-7],[-1,19],[18,19]].map(([x,y])=>S(k.slabOf(rect(x,y,5,y<0?6:5,1),7,1,P,4,.2),{tone:'mid'})+D([at([x+2.5,y+2.5,8])],{size:.4})).join('');
  const payload=S(k.slabOf(rect(1,1,20,16,.6),10,5,P,4,.4),{tone:'hi'})+L(k.planOutline(rect(1.8,1.8,18.4,14.4,.4),15,P),{tone:'lo'});
  const packet=bearingShoes+S(k.slabOf(rect(-1,-1,24,20,1.5),7,3,P,4,.5),{tone:'hi',lit:true})+L(k.planOutline(rect(1,1,20,16,.6),10,P),{tone:'lo'})+D([[2,2],[20,2],[2,16],[20,16]].map(([x,y])=>at([x,y,10])),{size:.4})+`<g data-part="payload">${payload}</g>`;
  const sledShapes=[A.slab(rect(-1,-1,24,20,1.5),7,3,{},4),A.slab(rect(1,1,20,16,.6),10,5,{},4),...[[-1,-7],[18,-7],[-1,19],[18,19]].map(([x,y])=>A.slab(rect(x,y,5,y<0?6:5,1),7,1,{},4))];
  // Measure its two actual travel legs against the settled fixed hardware.
  // A quarter-unit grid keeps ordering changes below a pixel, without any
  // per-frame ray casts. The full payload is a real, conservative lab pose.
  const deliveryLift=44-12.5,orderResolution=4;
  function slotsFor(shapes,move){
    const steps=Math.round(Math.max(...move)*orderResolution);
    const states=Array.from({length:steps+1},(_,i)=>i/steps);
    const sled={name:'sled',at:[11,9,11],key:0,piece:'sled',move,shapes};
    const proof=A.overlapsOf([...R.items,sled],P,{states,skip:(a,b)=>a.name!=='sled'&&b.name!=='sled'});
    const limits=states.map(()=>({lo:0,hi:R.items.length}));
    for(const pair of proof.pairs){
      const index=Math.round(pair.state*steps),limit=limits[index];
      const fixedFront=pair.front[0].area>=proof.least,sledFront=pair.front[1].area>=proof.least;
      if(fixedFront&&sledFront)throw new Error(`Sled interlocks with ${R.items[pair.a].name} at ${index}/${steps}`);
      if(fixedFront)limit.hi=Math.min(limit.hi,pair.a);
      if(sledFront)limit.lo=Math.max(limit.lo,pair.a+1);
    }
    return limits.map((limit,i)=>{
      if(limit.lo>limit.hi)throw new Error(`No legal sled paint slot at ${i}/${steps}`);
      return limit.lo;
    });
  }
  const sledOrder={horizontal:slotsFor(sledShapes,[87,0,0]),lift:slotsFor(sledShapes.map(shape=>A.moved(shape,[87,0,0])),[0,0,deliveryLift]),resolution:orderResolution};
  const phaseOf=name=>name.startsWith('chase.')||name.startsWith('quoin')||name.startsWith('lock')?0:name.startsWith('press.')?1:name.startsWith('reuse.')?2:name.startsWith('outlet.')?3:null;
  const body=halo(base,-15,8)+R.items.map((item,index)=>`<g data-static-index="${index}"${phaseOf(item.name)===null?'':` data-fig-phase="${phaseOf(item.name)}"`}${item.attrs||''}>${item.svg}</g>`+(item.name==='chase.bed'?'<g data-part="blocks" data-fig-phase="0"></g>':'')+(item.name==='transfer.bed'?`<g data-part="packet" data-fig-phase="2">${packet}</g>`:'')).join('');
  return {markup:plate({id:15,body,role:'group',keys:[{mark:'raised',key:'key.0'},{mark:'lit',key:'key.1'},{mark:'edge',key:'key.2'}]}),data:{P,parts:count+6,iris:riserF,deliveryLift,sledOrder}};
}
