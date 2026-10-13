import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';

// Figure: a frontier sorting bench. Three chutes are a cutaway sample, not a host count.
// Hardware: feet, deck, hopper, three supported queue beds and gate assemblies,
// hash sieve, two collection bins, capacity scales, and a travelling page coupon.
export async function build({ audit, argv }) {
  const base = { x: -130, y: -65, w: 260, d: 140, r: 7 };
  const P = k.fitProjection([...k.boxCorners(base, -14, 0), ...k.boxCorners({x:-122,y:-55,w:42,d:99,r:1},46,77)], WIDTH, HEIGHT, { pad: 44, azimuth: 45, elevation: 30 });
  const { S, L, D, at, halo } = painter(P);
  const R = A.recorder(P);
  let count = 0;
  function panel(axis, face, u0, u1, z0, z1, slots = false) {
    const point = (u,z) => axis === 'x' ? [face,u,z] : [u,face,z];
    const outline = (u,z,w,h,r=1) => k.pathOf(k.roundedPlan({x:u,y:z,w,d:h,r},4).map(([a,b])=>at(point(a,b))),true);
    let out=L(outline(u0,z0,u1-u0,z1-z0),{tone:'faint'});
    const bolts=[[u0+1.7,z0+1.7],[u1-1.7,z0+1.7],[u0+1.7,z1-1.7],[u1-1.7,z1-1.7]];
    out+=L(bolts.map(([u,z])=>k.pathOf(Array.from({length:17},(_,i)=>at(point(u+Math.sin(i*Math.PI/8)*.8,z+Math.cos(i*Math.PI/8)*.8))),true)).join(''),{tone:'lo'});
    out+=D(bolts.map(([u,z])=>at(point(u,z))),{size:.4});
    if(slots) for(let u=u0+8;u<u1-7;u+=4) out+=L(outline(u,z0+5,1.6,z1-z0-10,.7),{tone:'faint'});
    return out;
  }
  function topBolts(p,z,inset=2.5) {
    const bolts=k.corners(p,inset);
    return L(bolts.map(([x,y])=>k.ring(x,y,.95,z,P,16)).join(''),{tone:'lo'})+D(bolts.map(([x,y])=>at([x,y,z])),{size:.4});
  }
  function slab(name, p, z, h, tone = 'mid', extra = '') {
    if(p.w>=10 && p.d>=8 && h>=3) extra+=L(k.planOutline(k.insetPlan(p,2),z+h,P,4),{tone:'faint'})+topBolts(p,z+h);
    if(p.w>=25 && h>=16 && p.d<=4) extra+=panel('y',p.y+p.d,p.x+2,p.x+p.w-2,z+2,z+h-2);
    if(p.d>=25 && h>=16 && p.w<=4) extra+=panel('x',p.x+p.w,p.y+3,p.y+p.d-3,z+3,z+h-3,p.d>70);
    if(h>=10) extra+=L(k.sideSeam(p,z+h*.55,P,4),{tone:'faint'});
    const svg = S(k.slabOf(p, z, h, P, 4, 0.6), { tone, inner: extra });
    R.put({ name, piece: 'stand.frame', at: [p.x + p.w / 2, p.y + p.d / 2, z + h / 2], svg, shapes: [R.solid(A.slab(p, z, h, { name, owner: 'stand.frame' },4))] });
    count++;
  }
  function round(name,x,y,r,z,h,extra='',tone='hi') {
    const svg=S(k.cylinder(x,y,r,z,h,P,48,.4),{tone,inner:extra});
    R.put({name,piece:'stand.frame',at:[x,y,z+h/2],svg,shapes:[R.solid(A.cylinder(x,y,r,z,h,{name,owner:'stand.frame'}))]});
    count++;
  }
  const plan = (x,y,w,d,r=1) => ({x,y,w,d,r});
  for (const [x,y] of k.corners(base, 16)) slab('stand.foot'+count, plan(x-5,y-5,10,10,2), -14, 6, 'lo');
  slab('stand.deck',base,-8,8,'lo',L(k.sideSeam(base,-3,P,4),{tone:'faint'}));
  const deckDetails = L(k.planOutline(k.insetPlan(base,4),0,P),{tone:'faint'}) + topBolts(base,0,9);
  R.items.find(x=>x.name==='stand.deck').svg += deckDetails;
  const maker=plan(-121,48,35,20,2);
  slab('stand.makerPlate',maker,0,.7,'lo',L(k.planOutline(k.insetPlan(maker,2),.7,P),{tone:'faint'})+topBolts(maker,.7,3));
  for(let i=0;i<3;i++) R.items.find(x=>x.name==='stand.makerPlate').svg+=L(k.lineOnTop([-114,54+i*3],[-94+i*3,54+i*3],.7,P),{tone:'lo',free:true});
  // Open frontier hopper with its real floor, walls, reinforcing rim and feet.
  for (const y of [-48,25]) slab('hopper.leg'+count,plan(-115,y,9,9),3,43);
  slab('hopper.floor',plan(-118,-52,35,92,0),46,3,'hi');
  for(const y of [-16,16]) {
    slab('hopper.divider'+count,plan(-117,y,33,2),49,14,'mid');
    for(const x of [-116,-89]) slab('hopper.dividerBracket'+count,plan(x,y-3,4,3),49,4,'mid',D([at([x+2,y-1.5,53])],{size:.45}));
  }
  slab('hopper.backWall',plan(-121,-55,3,98),46,29);
  slab('hopper.outletLintel',plan(-83,-55,3,98),52,23);
  for(const [y,d] of [[-55,15],[-22,14],[10,12],[40,3]]) slab('hopper.outletPier'+count,plan(-83,y,3,d),46,6);
  for (const y of [-55,40]) slab('hopper.end'+count,plan(-118,y,35,3),46,29);
  for (const y of [-55,40]) slab('hopper.rim'+count,plan(-122,y,42,4),75,2,'hi');
  // Riveted foundation plates anchor the hopper uprights to the deck.
  for(const y of [-48,25]) slab('hopper.strap'+count,plan(-116,y-1,11,11,1),0,3,'mid',topBolts(plan(-116,y-1,11,11),3));
  // The queue chutes are representative parallel host queues, not three actual hosts.
  for (const y of [-42,-10,20]) {
    slab('queue.inlet'+count,plan(-83,y+2,3,18,0),46,3,'hi');
    const F={o:[0,0,0],a:[0,1,0],u:[1,0,0],v:[0,0,1]};
    const section=[[-80,49],[-65,21],[-65,23],[-80,51]];
    const nameRamp='queue.feedRamp'+count;
    const ribs=[-78,-75,-72,-69,-66].map(x=>k.segment([x,y+2,51-(x+80)*28/15],[x,y+20,51-(x+80)*28/15],P)).join('');
    R.put({name:nameRamp,piece:'stand.frame',at:[-72.5,y+11,36],svg:S(G.prismOf(F,section,y+2,y+20,P),{tone:'hi',inner:L(ribs,{tone:'faint'})}),
      shapes:[R.solid(A.prism(F,section,y+2,y+20,{name:nameRamp,owner:'stand.frame'}))]});
    count++;
    for(const edge of [y+2,y+19]) {
      const railSection=[[-80,51],[-65,23],[-65,26],[-80,54]];
      const nameRail='queue.feedGuide'+count;
      R.put({name:nameRail,piece:'stand.frame',at:[-72.5,edge+.5,39],svg:S(G.prismOf(F,railSection,edge,edge+1,P),{tone:'mid'}),
        shapes:[R.solid(A.prism(F,railSection,edge,edge+1,{name:nameRail,owner:'stand.frame'}))]});
      count++;
    }
    for (const x of [-72,18]) slab('queue.leg'+count,plan(x,y,6,20),0,18);
    slab('queue.floor'+count,plan(-75,y,102,22,1),18,3,'hi');
    for (const side of [y,y+20]) slab('queue.rail'+count,plan(-75,side,102,2),21,7);
    const mountName='queue.gateMount'+count;
    slab(mountName,plan(-10,y,5,22),28,4,'hi');
    const latchName='queue.latch'+count;
    slab(latchName,plan(-10,y+2,5,18),21,7,'hi');
    const latch=R.items.find(x=>x.name===latchName);
    latch.svg=`<g data-latch="${y}">${latch.svg}</g>`;
    slab('queue.gateStop'+count,plan(-19,y+2,4,3),21,7);
    slab('queue.gateStop'+count,plan(-19,y+17,4,3),21,7);
    slab('queue.pickHead'+count,plan(17,y+5,10,12,2),21,9);
    const name='queue.delay'+count;
    const delayStrip=plan(-48,y+12,38,6);
    const divisions=k.topTicks(-46,-12,2,5,y+12,21.6,[1.5,3],P);
    slab('queue.delayScale'+count,delayStrip,21,.6,'lo',L(divisions.minor,{tone:'lo'})+L(divisions.major,{tone:'mid'}));
    slab(name,plan(-45,y+12,10,6),21.6,2.4,'hi',topBolts(plan(-45,y+12,10,6),24,1.4));
    R.items.find(x=>x.name===name).svg = `<g data-delay>${R.items.find(x=>x.name===name).svg}</g>`;
    const screws = D([[ -7.5,y+2,32],[-7.5,y+20,32]].map(at),{size:0.5});
    R.items.find(x=>x.name===mountName).svg += screws;
    // Each eligibility gate carries a clock bezel, needle and crown; it is not a host count.
    const dialMount=plan(-18,y+2,21,18,2);
    slab('queue.clockBracket'+count,dialMount,32,2,'mid',topBolts(dialMount,34,2));
    const cx=-7.5,cy=y+11,cz=37;
    const dialTicks=k.radialTicks(cx,cy,6.1,40,5,cz,[.8,1.6],P);
    const timerName='queue.clock'+count;
    round(timerName,cx,cy,8,34,3,
      L(k.knurl(cx,cy,8,34,37,40,P),{tone:'lo'})+
      L(k.ring(cx,cy,6.3,cz,P,48),{tone:'lo'})+
      L(dialTicks.minor,{tone:'lo'})+L(dialTicks.major,{tone:'mid'})+
      `<path data-clock="${y}" class="iso-line" data-tone="hi" data-free="true" d="${k.lineOnTop([cx,cy],[cx,cy-5],cz+.1,P)}"/>`);
    const timer=R.items.find(x=>x.name===timerName);
    timer.svg=`<g data-delay-control="${y}" data-timer-face="${y}">${timer.svg}</g>`;
    const hubName='queue.clockHub'+count;
    round(hubName,cx,cy,1,cz,.8);
    const hub=R.items.find(x=>x.name===hubName);
    hub.svg=`<g data-delay-control="${y}">${hub.svg}</g>`;
    slab('queue.clockCrown'+count,plan(.5,y+9,4,4),34,2,'hi');
    round('queue.pickNeck'+count,22,y+11,3.8,30,2);
    round('queue.pickCap'+count,22,y+11,4.8,32,2,
      L(k.knurl(22,y+11,4.8,32,34,28,P),{tone:'lo'})+
      L(k.ring(22,y+11,3,34,P,32),{tone:'faint'})+
      D([at([22,y+11,34])],{size:.5}));
  }
  // The downloader heads share a supported drive gantry; stems end on each head's cap.
  for(const y of [-51,44]) {
    slab('gantry.foot'+count,plan(15,y-1,14,8),0,3,'lo',topBolts(plan(15,y-1,14,8),3,1.5));
    const uprightSlot=k.pathOf(k.roundedPlan(plan(21,15,2,43,1),4).map(([x,z])=>at([x,y+6,z])),true);
    slab('gantry.upright'+count,plan(17,y,10,6),3,67,'mid',panel('y',y+6,18.5,25.5,9,64)+L(uprightSlot,{tone:'faint'}));
    slab('gantry.cap'+count,plan(15,y-1,14,8),70,3,'mid',topBolts(plan(15,y-1,14,8),73,1.5));
  }
  slab('gantry.beam',plan(17,-51,10,101),73,3,'mid');
  for(const y of [-31,1,31]) round('gantry.headStem'+count,22,y,2,34,39,
    L([45,59].map(z=>k.sideArc(22,y,2,z,P,24)).join(''),{tone:'faint'}),'mid');
  slab('gantry.motorShoe',plan(16,-48,12,15),76,2,'mid');
  const motor=plan(14,-50,16,19,2);
  const motorSlots=[-47,-43,-39,-35].map(y=>k.planOutline(plan(17,y,10,1.2,.5),86,P,4)).join('');
  slab('gantry.motor',motor,78,8,'mid',L(motorSlots,{tone:'faint'}));
  round('gantry.motorCrown',22,-41,2.8,86,2,L(k.knurl(22,-41,2.8,86,88,24,P),{tone:'lo'}));
  // Content-hash sieve: a perforated deck with a variable diversion shoe.
  for (const y of [-47,39]) slab('sieve.leg'+count,plan(34,y,8,8),0,18);
  const sieve=plan(32,-48,39,95,2);
  slab('sieve.floor',sieve,18,3,'hi', D(k.dotGrid(37,-41,6,13,5,21,P),{size:0.6,tone:'lo'}));
  for (const y of [-49,45]) slab('sieve.rail'+count,plan(30,y,44,3),21,8);
  slab('sieve.shoe',plan(45,-5,20,10,1),21,3,'hi');
  R.items.find(x=>x.name==='sieve.shoe').svg = `<g data-sieve>${R.items.find(x=>x.name==='sieve.shoe').svg}</g>`;
  // Unique and rejected-content bins, open at the top.
  for (const y of [-45,8]) {
    slab('bin.floor'+count,plan(80,y,40,40,2),0,3,'lo');
    for (const x of [80,117]) slab('bin.side'+count,plan(x,y,3,40),3,20);
    for (const yy of [y,y+37]) slab('bin.end'+count,plan(83,yy,34,3),3,20);
    slab('bin.handle'+count,plan(91,y+40,16,3),8,4,'hi');
    const contents=plan(85,y+5,30,30,1);
    const volumeName='bin.contents'+y;
    const volumeSvg=S(k.slabOf(contents,3,14,P,4,.5),{tone:'hi',inner:`<path class="iso-line" data-volume-rim data-tone="faint" d="${k.planOutline(k.insetPlan(contents,2),17,P,4)}"/>`});
    R.put({name:volumeName,piece:'stand.frame',at:[100,y+20,10],svg:`<g data-volume="${y}">${volumeSvg}</g>`,
      shapes:[R.solid(A.slab(contents,3,14,{name:volumeName,owner:'stand.frame'},4))]});
    count++;
  }
  // Capacity scales: one mechanical cursor for each bar in evaluate().
  for (let i=0;i<2;i++) {
    const y=53+i*9;
    const p=plan(-75,y,130,6);
    const ticks=k.topTicks(-72,52,4,5,y,1,[2,4],P);
    slab('scale.'+i,p,0,1,'lo',L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'}));
    slab('cursor.'+i,plan(-73,y+.5,5,5),1,4,'hi',D([at([-70.5,y+3,5])],{size:.5}));
    const it=R.items.find(x=>x.name==='cursor.'+i); it.svg=`<g data-capacity="${i}">${it.svg}</g>`;
  }
  // One coupon represents flow; it does not claim a literal count of pages.
  const coupon = S(k.slabOf(plan(-64,25,20,6,0.7),21,1,P,4,0.3), { tone:'hi',lit:true,
    inner:L(k.lineOnTop([-62,28],[-46,28],22,P),{tone:'lo',free:true}) });
  R.put({name:'coupon',piece:'stand.frame',at:[-54,28,21.5],svg:`<g data-page>${coupon}</g>`,shapes:[R.solid(A.slab(plan(-64,25,20,6,0.7),21,1,{name:'coupon',owner:'stand.frame'}))]});
  A.settle(R,P);
  if (audit) A.auditOrExit(R,P,{argv});
  const body = halo(base,-14,8) + R.items.sort((a,b)=>a.key-b.key).map(x=>x.svg).join('');
  return { markup:plate({id:9,body,role:'slider',stage:{'aria-valuemin':0,'aria-valuemax':5000},keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'dim',key:'key.2'},{mark:'flat',key:'key.3'}]}), data:{P,parts:count+1} };
}
