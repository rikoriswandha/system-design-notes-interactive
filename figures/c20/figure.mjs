import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';

// Three age-range drawers and a screw-driven sampling press share a bolted bench.
// Card packs encode point shares, never a pretend count of individual samples.
export async function build({ argv }) {
  const base = { x:-118,y:-58,w:246,d:136,r:6 };
  const extremes=[...k.boxCorners(base,-16,0),...k.boxCorners({x:-104,y:-43,w:89,d:76,r:1},0,122),[51,-40,132],[79,-12,132],[105,-18,119]];
  const P=k.fitProjection(extremes,WIDTH,HEIGHT,{pad:44,azimuth:48,elevation:18});
  const {S,L,D,halo}=painter(P), R=A.recorder(P);
  const p=(x,y,w,d,r=1)=>({x,y,w,d,r});
  const at=q=>k.iso(q,P);
  const path3=(points,closed=false)=>k.pathOf(points.map(at),closed);
  let count=0;
  const screws=(plan,z,inset=3)=>k.corners(plan,inset).map(([x,y])=>L(k.ring(x,y,1.2,z,P,20),{tone:'lo'})+D([at([x,y,z])],{size:0.45})).join('');
  function slab(name,plan,z,h,tone='mid',extra='',inner='') {
    if(name.startsWith('drawer.'))extra+=` data-pick="${name.split('.')[2]}"`;
    const svg=S(k.slabOf(plan,z,h,P,4,0.6),{tone,crease:'faint',inner});
    R.put({name,piece:'machine',at:[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2],svg:extra?`<g ${extra}>${svg}</g>`:svg,shapes:[R.solid(A.slab(plan,z,h,{name,ground:name.startsWith('stand.')},4))]});count++;
  }
  function cylinder(name,x,y,r,z,h,tone='mid',extra='',inner='') {
    const svg=S(k.cylinder(x,y,r,z,h,P,64,0.4),{tone,crease:'faint',inner});
    R.put({name,piece:'machine',at:[x,y,z+h/2],svg:extra?`<g ${extra}>${svg}</g>`:svg,shapes:[R.solid(A.cylinder(x,y,r,z,h,{name,ground:name.startsWith('stand.')}))]});count++;
  }
  const topDetail=(plan,z)=>L(k.planOutline(k.insetPlan(plan,3),z,P,4),{tone:'faint'})+screws(plan,z,4);
  const sideOutline=(x,plan)=>path3(k.roundedPlan(plan,5).map(([y,z])=>[x,y,z]),true);
  const frontOutline=(y,plan)=>path3(k.roundedPlan(plan,5).map(([x,z])=>[x,y,z]),true);
  for(const [x,y] of k.corners(base,16)) {
    slab(`stand.foot.${x}.${y}`,p(x-6,y-6,12,12,2),-16,4,'lo');
    slab(`stand.shoe.${x}.${y}`,p(x-5,y-5,10,10,1),-12,4,'lo');
  }
  slab('stand.base',base,-8,8,'lo','',L(k.planOutline(k.insetPlan(base,4),0,P),{tone:'faint'})+screws(base,0,10)+L(k.sideSeam(base,-4,P,4),{tone:'faint'}));
  slab('chest.left',p(-104,-43,5,76),0,122);
  slab('chest.right',p(-20,-43,5,76),0,122);
  slab('chest.back',p(-99,-43,79,4),0,122);
  for(const z of [0,39,78,117]) {
    const shelf=p(-99,-39,79,72);
    slab(`chest.shelf.${z}`,shelf,z,5,'mid','',z===117?topDetail(shelf,122):'');
  }
  // The service panel has a rolled lip, ventilation slots and captive screws.
  const service=p(-15,-38,0.8,66,0.25);
  let panel=L(sideOutline(-14.2,p(-34,8,58,106,2)),{tone:'faint'});
  for(const z of [22,61,100])for(let i=0;i<8;i++)panel+=L(sideOutline(-14.2,p(-28+i*5,z,1.1,9,0.5)),{tone:'lo'});
  for(const y of [-32,22])for(const z of [12,57,110])panel+=L(k.sideRing([-14.2,y,z],1.3,'x',P),{tone:'lo'})+D([at([-14.2,y,z])],{size:0.45});
  slab('chest.service',service,5,112,'mid','',panel);
  // Recessed lifting grip, visibly bolted to the cabinet lid.
  for(const x of [-84,-42]) {
    const shoe=p(x,-12,12,18,2);
    slab(`chest.grip.shoe.${x}`,shoe,122,1,'lo','',screws(shoe,123,3));
    slab(`chest.grip.upright.${x}`,p(x+4,-7,4,8),123,4);
  }
  slab('chest.grip.bar',p(-80,-7,46,8,2),127,3,'hi','',L(k.planOutline(p(-76,-5,38,4,1),130,P),{tone:'faint'}));
  const tiers=[];
  for(let i=0;i<3;i++) {
    const z=5+i*39,plan=p(-95,-35,71,60,1.5);
    slab(`drawer.floor.${i}`,plan,z,2,'lo','',L(k.planOutline(k.insetPlan(plan,2),z+2,P),{tone:'faint'}));
    for(const x of [-95,-26])slab(`drawer.cheek.${i}.${x}`,p(x,-35,2,60,0.5),z+2,8,'mid','',L(k.sideSeam(p(x,-35,2,60,0.5),z+6,P,4),{tone:'faint'}));
    const face=p(-95,25,71,4,1);
    let faceDetail=L(frontOutline(29,p(-92,z+1,65,8,0.8)),{tone:'faint'});
    for(const x of [-91,-28])faceDetail+=L(k.sideRing([x,29,z+5],1,'y',P),{tone:'lo'})+D([at([x,29,z+5])],{size:0.45});
    slab(`drawer.front.${i}`,face,z,10,'mid','',faceDetail);
    let label=L(frontOutline(29.8,p(-71,z+2,21,5,0.5)),{tone:'faint'});
    for(let j=0;j<3;j++)label+=L(path3([[-69,29.8,z+2.7+j*1.4],[-54-j*2,29.8,z+2.7+j*1.4]]),{tone:'lo',free:true});
    slab(`drawer.holder.${i}`,p(-73,29,25,0.8,0.5),z+1,7,'hi','',label);
    for(const x of [-76,-48])slab(`drawer.lug.${i}.${x}`,p(x,29,3,4.8),z+5,3);
    slab(`drawer.pull.${i}`,p(-76,33.8,31,3),z+5,3,'hi','',L(k.sideSeam(p(-76,33.8,31,3),z+6.5,P,4),{tone:'faint'}));
    const stack=p(-90,-29,60,48,1);
    const paper=`<path class="iso-line" data-tone="lo" data-cards="${i}" d=""/><path class="iso-line" data-tone="faint" data-card-top="${i}" d=""/><path class="iso-line" data-tone="lo" data-free data-card-print="${i}" d=""/>`;
    slab(`tier.stack.${i}`,stack,z+2,17,'hi',`data-stack="${i}"`,paper);
    tiers.push({plan:stack,z:z+2});
  }
  // A screw press: shoes, machined guide posts, collars, ram, and platen.
  for(const x of [30,100]) {
    const shoe=p(x-5,-34,10,16), cap=p(x-5,-34,10,16);
    slab(`press.shoe.${x}`,shoe,0,5,'lo','',screws(shoe,5,2));
    slab(`press.post.${x}`,p(x-3,-31,6,10),5,101,'mid','',L(k.sideSeam(p(x-3,-31,6,10),12,P,4),{tone:'faint'})+L(k.sideSeam(p(x-3,-31,6,10),99,P,4),{tone:'faint'}));
    slab(`press.cap.${x}`,cap,106,5,'mid','',screws(cap,111,2));
    const rail=p(x-3,-18,6,47);
    slab(`press.rail.${x}`,rail,0,5,'mid','',L(k.planOutline(k.insetPlan(rail,1.5),5,P),{tone:'lo'}));
    const stop=p(x-4,23,8,6);
    slab(`press.stop.${x}`,stop,5,6,'mid','',screws(stop,11,2));
  }
  const beam=p(25,-34,80,16,2);
  slab('press.beam',beam,111,8,'mid','',topDetail(beam,119)+L(k.sideSeam(beam,115,P,4),{tone:'faint'}));
  for(const [name,plan]of [['left',p(58,-33,4,14)],['right',p(68,-33,4,14)],['back',p(62,-33,6,4)],['front',p(62,-23,6,4)]])slab(`press.guide.${name}`,plan,103,8,'mid');
  slab('press.ram',p(62,-29,6,6),78,33,'mid','data-ram');
  const platen=p(42,-31,46,40,2);
  slab('press.platen',platen,74,4,'hi','data-platen',L(k.sideSeam(platen,76,P,4),{tone:'faint'}));
  for(const [name,plan]of [['left',p(46,-27,16,32)],['right',p(68,-27,16,32)]])slab(`press.platen.trim.${name}`,plan,78,1,'mid','data-platen',topDetail(plan,79));
  const pedestal=p(38,-31,54,55,2);
  slab('press.pedestal',pedestal,0,5,'lo','',L(k.sideSeam(pedestal,2.5,P,4),{tone:'faint'}));
  slab('press.bed',pedestal,5,4,'lo','',topDetail(pedestal,9));
  slab('press.feed',p(44,-25,42,41,1),9,48,'hi','data-supply','<path class="iso-line" data-tone="lo" data-supply-cards d=""/><path class="iso-line" data-tone="faint" data-supply-top d=""/><path class="iso-line" data-tone="lo" data-free data-supply-print d=""/>');
  // Guide fence brackets surround (and never intersect) the variable-height pack.
  for(const x of [40,88])slab(`press.feed.fence.${x}`,p(x,-25,2,41),9,4,'mid');
  cylinder('press.spindle',65,-26,3,119,9,'hi','',L(k.knurl(65,-26,3,119,128,20,P),{tone:'lo'}));
  const dialInner=L(k.ring(65,-26,11.5,132,P,72),{tone:'lo'})+L(k.ring(65,-26,3,132,P,32),{tone:'lo'})+L(k.knurl(65,-26,14,128,132,56,P),{tone:'lo'})+'<path class="iso-line" data-tone="hi" data-wheel d=""/>';
  cylinder('press.handwheel',65,-26,14,128,4,'hi','',dialInner);
  const strip=p(40,34,64,8);
  slab('press.slider',strip,0,2,'lo','',screws(strip,2,2));
  const ruler=p(42,35,60,6);
  const ticks=k.topTicks(44,100,4,5,35,2.6,[2,4],P);
  slab('press.ruler',ruler,2,0.6,'lo','',L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'}));
  cylinder('press.index',45,38,3,2.6,3,'hi','data-index',L(k.knurl(45,38,3,2.6,5.6,24,P),{tone:'lo'})+L(k.ring(45,38,1.4,5.6,P,24),{tone:'lo'}));
  const label=p(49,50,45,14);
  let rules=L(k.planOutline(k.insetPlan(label,1.6),0.8,P),{tone:'faint'})+screws(label,0.8,3);
  for(const dy of [53,57,61])rules+=L(k.lineOnTop([55,dy],[85-(dy-53),dy],0.8,P),{tone:'lo',free:true});
  slab('press.label',label,0,0.8,'lo','',rules);
  A.settle(R,P);R.items.sort((a,b)=>a.key-b.key);
  A.auditOrExit(R,P,{argv});
  const body=halo(base,-16,8)+R.items.map(item=>item.svg).join('');
  const controls='<div class="iso-controls"><button class="btn" data-tier="0" data-fig-text="fig.c20.btn.raw"></button><button class="btn" data-tier="1" data-fig-text="fig.c20.btn.minute"></button><button class="btn" data-tier="2" data-fig-text="fig.c20.btn.hour"></button></div>';
  return {markup:plate({id:20,body,role:'group',keys:[{mark:'raised',key:'key.0'},{mark:'lit',key:'key.1'},{mark:'edge',key:'key.2'}],controls}),data:{P,tiers,parts:count,supply:{plan:p(44,-25,42,41,1),z:9}}};
}
