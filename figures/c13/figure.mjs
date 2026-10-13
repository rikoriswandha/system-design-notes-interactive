import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';

// Figure: a cutaway card catalogue. Rear files are bundles, not literal candidates;
// the front holder contains exactly the model's k cards. A travelling feeler reads
// the whole rear file in scan mode, and stops at the front holder in cached mode.
export async function build({ argv }) {
  const base = { x: -112, y: -73, w: 228, d: 177, r: 5 };
  const bounds=[...k.boxCorners(base,-12,0),...k.boxCorners({x:-96,y:-62,w:148,d:76,r:2},0,138),...k.boxCorners({x:-88,y:-53,w:136,d:155,r:1},63,102),...k.boxCorners({x:57,y:-52,w:43,d:43,r:2},0,111)];
  const P = k.fitProjection(bounds, WIDTH, HEIGHT, { pad: 44, azimuth: 52, elevation: 17 });
  const p = painter(P), R = A.recorder(P);
  let n = 0;
  function slab(name, plan, z, h, tone = 'mid', extra = '') {
    const paths = k.slabOf(plan, z, h, P, 4, Math.min(.6, h / 3));
    const svg = p.S(paths, { tone, inner: extra });
    R.put({ name: `${name}.${n++}`, piece: 'cabinet', at: [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], svg,
      shapes: [R.solid(A.slab(plan, z, h, { name, ground: name === 'stand.foot' }, 4))] });
  }
  const rect = (x,y,w,d,r=.5) => ({x,y,w,d,r});
  const facePath=(x,y,z,w,h)=>k.pathOf([[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]].map(point=>p.at(point)),true);
  const screwsOn=(plan,z)=>p.L(k.corners(plan,3).map(([x,y])=>k.ring(x,y,1.1,z,P,20)).join(''),{tone:'lo'})+p.D(k.pointsAt(k.corners(plan,3).map(([x,y])=>[x,y,z]),P),{size:.45});
  const printOn=(x,y,z,w)=>[0,2,4].map((dy,i)=>p.L(k.lineOnTop([x,y+dy],[x+w-i*2,y+dy],z,P),{tone:'lo',free:true})).join('');
  for (const [x,y] of k.corners(base, 15)) slab('stand.foot',rect(x-6,y-6,12,12,2),-12,8,'lo');
  slab('stand.base',base,-4,4,'lo',p.L(k.planOutline(k.insetPlan(base,4),0,P),{tone:'faint'}));
  // Cabinet is built as a frame, not a solid box: the drawer has a real opening.
  slab('plinth',rect(-96,-62,148,76,2),0,8,'lo');
  for(const x of [-91,37]) {
    const tab=rect(x,14,10,8,1);
    slab('plinth.mount',tab,0,3,'mid',p.L(k.ring(x+5,18,1.5,3,P,24),{tone:'lo'})+p.D([p.at([x+5,18,3])],{size:.45}));
  }
  slab('back',rect(-94,-60,144,4),8,124);
  const liner=[[-90,-50,94],[-90,10,94],[-90,10,128],[-90,-50,128]];
  const linerScrews=[[-90,-46,98],[-90,6,98],[-90,-46,124],[-90,6,124]];
  slab('left.wall',rect(-94,-56,4,70),8,124,'mid',p.L(k.pathOf(liner.map(point=>p.at(point)),true),{tone:'faint'})+p.L(linerScrews.map(point=>k.sideRing(point,.9,'x',P)).join(''),{tone:'lo'})+p.D(k.pointsAt(linerScrews,P),{size:.4}));
  // Cut away the upper near wall so the scanner can travel above its lip.
  const nearWall=rect(46,-56,4,70);
  slab('right.wall',nearWall,8,76,'mid',[34,60].map(z=>p.L(k.sideSeam(nearWall,z,P,4),{tone:'faint'})).join(''));
  for (const z of [8,34,60]) slab('shelf',rect(-90,-56,136,70),z,3);
  slab('top',rect(-96,-62,148,76,2),132,5,'mid',p.L(k.planOutline(rect(-91,-57,138,66,1),137,P),{tone:'faint'}));
  const hatch=rect(-70,-43,93,40,2);
  slab('service.hatch',hatch,137,1,'mid',p.L(k.planOutline(k.insetPlan(hatch,3),138,P),{tone:'faint'})+screwsOn(hatch,138)+printOn(-50,-27,138,34));
  // Four lower catalogue drawers and their physical pulls / card holders.
  for(const z of [11,37]) for(const x of [-88,-19]) {
    slab('drawer.front',rect(x,11,63,4,1),z,21,'hi');
    slab('holder',rect(x+20,15,24,1),z+10,6,'lo');
    slab('label.card',rect(x+22,16,20,.5),z+11,4,'hi');
    // The three rules are printed catalogue text, not invented rankings.
    const rules=[0,1,2].map(i=>p.L(k.segment([x+24,16.5,z+12+i],[x+37-i*2,16.5,z+12+i],P),{tone:'lo',free:true})).join('');
    R.items[R.items.length-1].svg+=rules+p.D(k.pointsAt([[x+21,16,z+13],[x+43,16,z+13]],P),{size:.45});
    for (const dx of [17,43]) slab('pull.mount',rect(x+dx,15,3,5),z+4,3);
    slab('pull.bar',rect(x+17,20,29,3),z+4,3,'hi');
  }
  // One prefix drawer is extended permanently so both lookup paths are visible.
  slab('tray.floor',rect(-88,-53,132,145,1),63,6,'lo');
  slab('tray.left',rect(-88,-53,3,142),69,15);
  slab('tray.right',rect(41,-53,3,142),69,15);
  slab('tray.back',rect(-85,-53,126,3),69,28);
  const trayFront=rect(-88,89,132,4,1);
  slab('tray.front',trayFront,69,18,'hi',p.L(k.sideSeam(trayFront,84,P,4),{tone:'faint'}));
  R.items[R.items.length-1].svg+=p.D(k.pointsAt(Array.from({length:15},(_,i)=>[-84+i*8.5,93,85]),P),{size:.45});
  for(const x of [-53,9]) slab('tray.handle.mount',rect(x,93,4,5),73,4);
  slab('tray.handle',rect(-53,98,66,4,1),73,4,'hi');
  // The accordion is a schematic bundle, never a literal candidate count.
  slab('file.stop',rect(-81,-47,116,3),69,26,'hi');
  for(let i=0;i<8;i++) {
    const file=rect(-79,-40+i*11,112,2,.2);
    slab('file.bundle',file,69,23+(i%3),'hi',p.L(k.planOutline(rect(-74,file.y+.1,102,1.8,.1),92+(i%3),P),{tone:'faint'}));
  }
  // The cached holder sits on the front rim, not below the drawer wall:
  // readers can see all k cards even at the shallow cabinet camera angle.
  slab('cache.holder',rect(-80,75,113,18,1),87,2,'mid');
  const nameplate=rect(-68,96,82,7,1);
  slab('stand.nameplate',nameplate,0,.8,'lo',screwsOn(nameplate,.8)+printOn(-57,97,.8,48));
  // Square snapshot-age instrument on a bracket, with a top-face pointer.
  slab('clock.bracket',rect(57,-52,43,43,2),0,8);
  slab('clock.mount',rect(100,-35,8,15,1),0,3,'mid',p.L(k.ring(104,-27.5,1.5,3,P,24),{tone:'lo'})+p.D([p.at([104,-27.5,3])],{size:.45}));
  const clockStand=rect(60,-49,37,37,2);
  slab('clock.stand',clockStand,8,96,'mid',[30,77].map(z=>p.L(k.sideSeam(clockStand,z,P,4),{tone:'faint'})).join(''));
  slab('clock.case',rect(57,-52,43,43,2),104,6,'hi');
  const dialPlan=rect(61,-48,35,35,1);
  const dialTicks=k.radialTicks(78.5,-30.5,14,28,4,111,[1.5,3],P,0,Math.PI*1.75);
  slab('clock.face',dialPlan,110,1,'lo',p.L(k.ring(78.5,-30.5,14,111,P,64),{tone:'lo'})+p.L(k.ring(78.5,-30.5,1.5,111,P,20),{tone:'hi'}));
  const vents=Array.from({length:6},(_,i)=>p.L(facePath(68,-12,80+i*2.3,21,.8),{tone:'lo'})).join('');
  const fasteners=[[65,-12,18],[91,-12,18],[65,-12,94],[91,-12,94]];
  const clockLines=p.L(dialTicks.minor,{tone:'lo'})+p.L(dialTicks.major,{tone:'mid'})+screwsOn(rect(57,-52,43,43,2),110)+p.L(facePath(64,-12,16,29,80),{tone:'faint'})+vents+p.L(fasteners.map(point=>k.sideRing(point,.9,'y',P)).join(''),{tone:'lo'})+p.D(k.pointsAt(fasteners,P),{size:.4});
  const screws=screwsOn(base,0);
  for(let i=0;i<10;i++) {
    const plan=rect(-77+i*11,77,8,14,.5);
    const svg=`<g data-card="${i}">${p.S(k.slabOf(plan,89,3,P,4,.5),{tone:'hi',inner:printOn(plan.x+1.5,80,92,4.5)})}</g>`;
    R.put({name:`cache.card.${i}`,piece:'cabinet',at:[plan.x+4,84,90.5],svg,shapes:[R.solid(A.slab(plan,89,3,{name:`cache.card.${i}`},4))]});
  }
  const railPlan=rect(44,-47,2,141,.4);
  const rulerTicks=k.topTicks(-45,92,4,5,44,87,[1,2],P,'y');
  const rail=p.S(k.slabOf(railPlan,84,3,P,4,.5),{tone:'mid'})+p.L(rulerTicks.minor,{tone:'lo'})+p.L(rulerTicks.major,{tone:'mid'});
  R.put({name:'feeler.rail',piece:'cabinet',at:[45,23.5,85.5],svg:rail,shapes:[R.solid(A.slab(railPlan,84,3,{name:'feeler.rail'},4))]});
  for(const y of [-47,89]) slab('feeler.stop',rect(44,y,4,5,.5),87,3,'mid');
  const carriagePlan=rect(44,83,4,5,.5), barPlan=rect(-83,84,127,2,.4);
  const feeler=p.S(k.slabOf(barPlan,99,3,P,4,.5),{lit:true})+p.S(k.slabOf(carriagePlan,87,15,P,4,.4),{tone:'mid',inner:p.L(k.ring(46,85.5,1,102,P,20),{tone:'lo'})+p.D([p.at([46,85.5,102])],{size:.45})});
  R.put({name:'scanner',piece:'scanner',at:[-19.5,85,100.5],move:[0,-124,0],svg:feeler,shapes:[R.solid(A.slab(barPlan,99,3,{name:'feeler.bar'},4)),R.solid(A.slab(carriagePlan,87,15,{name:'feeler.carriage'},4))]});
  // Pointer and tour can visit every position of this stroke. Check the entire
  // path, not just its ends, and solve one depth key that works throughout it.
  const poses=Array.from({length:45},(_,i)=>({label:`lookup ${i}/44`,shares:{scanner:i/44,cabinet:0}}));
  A.settle(R,P,{states:poses});
  R.items.sort((a,b)=>a.key-b.key);
  A.auditOrExit(R,P,{argv,frames:poses,apart:true});
  const needle=p.L(k.lineOnTop([78.5,-30.5],[78.5,-43],111.2,P),{tone:'hi',free:true,className:'snapshot-needle'});
  const controls='<div class="iso-controls"><button class="btn" data-mode="cached" data-fig-text="fig.c13.btn.cached"></button><button class="btn" data-mode="scan" data-fig-text="fig.c13.btn.scan"></button><button class="btn" data-next data-fig-text="fig.c13.btn.metric"></button></div>';
  const V=A.cameraBasis(P).V;
  const paint=R.items.map(it=>({key:it.key,lift:it.move?it.move.reduce((total,n,i)=>total+n*V[i],0):0,scanner:it.piece==='scanner'}));
  const lookupFor=it=>it.piece==='scanner'?'toggle':it.name.startsWith('cache.')?'cached':it.name.startsWith('file.')?'scan':null;
  const body=p.halo(base,-12,10)+`<g data-paint-layer>${R.items.map((it,i)=>`<g data-paint="${i}"${it.piece==='scanner'?' data-feeler':''}${lookupFor(it)?` data-lookup="${lookupFor(it)}"`:''}>${it.svg}</g>`).join('')}</g>`+screws+clockLines+needle;
  return {markup:plate({id:13,role:'group',body,keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'dim',key:'key.2'}],controls}),data:{P,parts:R.solids.length,clock:[78.5,-30.5,111.2],scanTravel:-124,paint}};
}
