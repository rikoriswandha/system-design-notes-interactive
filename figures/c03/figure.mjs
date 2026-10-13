import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';

// A wound interview timer. Its four rim stops divide one complete discussion.
export async function build({ audit, argv }) {
  const base = { x: -116, y: -90, w: 232, d: 180, r: 12 };
  const cx = -20, cy = -15, r = 63, z = 31;
  const gx = 81, gy = -23;
  const knobs = [[-92, 51], [-47, 61], [0, 66], [49, 61]];
  // Fit the actual silhouette, not an imaginary tall box around the entire plate.
  const extremes = [
    ...k.roundedPlan(base, 12).flatMap(([x, y]) => [[x, y, -10], [x, y, 0]]),
    ...k.corners(base, 8).flatMap(([x,y]) => k.circleRing(x,y,7,32).map(([a,b])=>[a,b,-18])),
    ...k.circleRing(cx,cy,r+3,96).map(([x,y])=>[x,y,z+4]),
    ...k.circleRing(gx,gy,22,64).map(([x,y])=>[x,y,18]),
    ...knobs.flatMap(([x,y])=>k.circleRing(x,y,7,32).map(([a,b])=>[a,b,14]))
  ];
  const P = k.fitProjection(extremes, WIDTH, HEIGHT, { pad: 44, azimuth: 42, elevation: 42 });
  const { S, L, D, halo, at } = painter(P);
  const R = A.recorder(P);
  function slab(name, plan, bottom, height, tone = 'mid', extra = '') {
    const svg = S(k.slabOf(plan, bottom, height, P, 6, 0.7), {
      tone, inner: L(k.sideSeam(plan, bottom + height / 2, P, 6), { tone: 'faint' })
    }) + extra;
    R.put({ name, at: [plan.x + plan.w / 2, plan.y + plan.d / 2, bottom + height / 2], svg,
      shapes: [R.solid(A.slab(plan, bottom, height, { name }, 6))] });
  }
  function round(name, x, y, radius, bottom, height, tone = 'mid', extra = '') {
    R.put({ name, at: [x, y, bottom + height / 2],
      svg: S(k.cylinder(x, y, radius, bottom, height, P, 64, 0.4), { tone }) + extra,
      shapes: [R.solid(A.cylinder(x, y, radius, bottom, height, { name }))] });
  }
  function screw(name, x, y, bottom, radius = 1.3) {
    round(name, x, y, radius, bottom, 0.65, 'lo',
      L(k.ring(x,y,radius*0.65,bottom+0.65,P,24),{tone:'faint'}) +
      L(k.lineOnTop([x-radius*0.55,y],[x+radius*0.55,y],bottom+0.65,P),{tone:'lo'}));
  }
  for (const [i, [x, y]] of k.corners(base, 8).entries()) {
    round(`stand.foot${i}`, x, y, 7, -18, 3, 'lo');
    round(`stand.sole${i}`, x, y, 5, -15, 5, 'lo',
      L(k.sideArc(x,y,5,-12.5,P,32),{tone:'faint'}));
  }
  slab('stand.base', base, -10, 10, 'lo',
    L(k.planOutline(k.insetPlan(base, 5), 0, P), { tone: 'faint' }));
  for (const [i, [x, y]] of k.corners(base, 10).entries()) screw(`stand.screw${i}`, x, y, 0, 1.6);

  round('timer.plinth', cx, cy, r + 5, 0, 5, 'lo',
    L(k.sideArc(cx,cy,r+5,2.5,P,64),{tone:'faint'}));
  round('timer.lower-case', cx, cy, r + 3, 5, 9, 'mid',
    L(k.sideArc(cx,cy,r+3,9,P,64),{tone:'faint'}));
  const bellSlots=Array.from({length:11},(_,i)=>{
    const angle=(17+i*5)*Math.PI/180;
    const slot=k.roundedPlan({x:-0.65,y:15.2,w:1.3,d:5.8,r:0.65},4);
    return k.pathOf(slot.map(([u,height])=>at([cx+Math.cos(angle+u/(r+3))*(r+3),cy+Math.sin(angle+u/(r+3))*(r+3),height])),true);
  }).join('');
  round('timer.upper-case', cx, cy, r + 3, 14, 8, 'mid',
    L(bellSlots,{tone:'lo'}));
  round('timer.bezel', cx, cy, r + 3, 22, 8, 'hi',
    L(k.knurl(cx,cy,r+3,22,30,128,P,0),{tone:'lo'}) +
    L(k.sideArc(cx,cy,r+3,25,P,96),{tone:'faint'}));
  round('timer.face', cx, cy, r, 30, 1, 'hi',
    L([48,54,60,16].map(radius=>k.ring(cx,cy,radius,z,P,128)).join(''),{tone:'lo'}));
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    screw(`timer.bolt${i}`, cx + Math.sin(a) * 61, cy - Math.cos(a) * 61, z, 1.1);
  }

  // Individual crowns have raised seats, a real spindle and a knurled sleeve.
  knobs.forEach(([x,y], i) => {
    slab(`control.pad${i}`,{x:x-11,y:y-11,w:22,d:22,r:3},0,2,'lo',
      L(k.planOutline({x:x-9,y:y-9,w:18,d:18,r:2},2,P),{tone:'faint'}));
    round(`control.washer${i}`,x,y,8,2,2,'lo');
    round(`control.spindle${i}`,x,y,3,4,3,'mid');
    round(`control.crown${i}`,x,y,7,7,6,'mid',
      L(k.knurl(x,y,7,7,13,36,P,0),{tone:'lo'}) +
      L(k.sideArc(x,y,7,10,P,48),{tone:'faint'}));
    round(`control.cap${i}`,x,y,5,13,1,'mid',
      L(k.ring(x,y,4,14,P,48),{tone:'faint'}));
    // Paired mounting screws belong to the crown's plate, not to an arbitrary dot row.
    screw(`control.fix${i}.left`,x-8.5,y+8.5,2,0.8);
    screw(`control.fix${i}.right`,x+8.5,y-8.5,2,0.8);
    const window={x:x-8,y:y+14,w:16,d:7,r:1};
    slab(`control.counter${i}`,window,0,1,'lo',
      L(k.planOutline(k.insetPlan(window,1),1,P,3),{tone:'mid'}));
  });

  slab('share.mount',{x:gx-24,y:gy-24,w:48,d:48,r:5},0,5,'lo',
    L(k.planOutline({x:gx-21,y:gy-21,w:42,d:42,r:3},5,P),{tone:'faint'}));
  round('share.case',gx,gy,22,5,8,'mid',L(k.sideArc(gx,gy,22,9,P,64),{tone:'faint'}));
  round('share.bezel',gx,gy,22,13,3,'hi',L(k.knurl(gx,gy,22,13,16,64,P,0),{tone:'lo'}));
  const ticks=k.radialTicks(gx,gy,18,20,5,17,[1.5,3],P);
  round('share.face',gx,gy,20,16,1,'hi',
    L(k.ring(gx,gy,18,17,P,96),{tone:'lo'}) + L(ticks.minor,{tone:'lo'}) + L(ticks.major,{tone:'mid'}));
  for(const [i,[x,y]] of k.corners({x:gx-24,y:gy-24,w:48,d:48,r:5},5).entries()) screw(`share.fix${i}`,x,y,5,0.9);
  round('share.hub',gx,gy,2,17,1,'mid');
  const sharePanel={x:60,y:-82,w:42,d:20,r:2};
  slab('share.counter',sharePanel,0,0.8,'lo',
    L(k.planOutline(k.insetPlan(sharePanel,2),0.8,P),{tone:'faint'})+
    L(k.planOutline({x:68,y:-77,w:26,d:10,r:1},0.8,P),{tone:'mid'})+
    D(k.corners(sharePanel,3).map(([x,y])=>at([x,y,0.8])),{size:0.45,tone:'mid'}));

  const nameplate={x:57,y:20,w:43,d:14,r:2};
  slab('nameplate',nameplate,0,0.8,'lo',
    L(k.planOutline(k.insetPlan(nameplate,2),0.8,P),{tone:'faint'}) +
    L([0,1,2].map(i=>k.lineOnTop([63,24+i*3],[87-(i===1?5:0),24+i*3],0.8,P)).join(''),{tone:'lo',free:true}));
  screw('nameplate.left',60,27,0.8,0.65);
  screw('nameplate.right',97,27,0.8,0.65);

  // Stops are captive spring-loaded pegs seated on the face at stage boundaries.
  // The browser moves these whole pre-built parts around the same flat rim.
  const defaults=[7/45,19/45,41/45], stopRadii=[48,54,60];
  defaults.forEach((fraction,i)=>{
    const angle=fraction*Math.PI*2,x=cx+Math.sin(angle)*stopRadii[i],y=cy-Math.cos(angle)*stopRadii[i];
    round(`stop.seat${i}`,x,y,2.7,z,0.8,'lo');
    round(`stop.pin${i}`,x,y,1.5,z+0.8,2.2,'mid');
    round(`stop.head${i}`,x,y,2,z+3,1.2,'hi',
      L(k.ring(x,y,1.2,z+4.2,P,24),{tone:'lo'}));
  });
  A.settle(R,P);
  R.items.sort((a,b)=>a.key-b.key);
  if(audit) A.auditOrExit(R,P,{argv:argv.includes('--audit')?argv:[...argv,'--audit']});
  const staticBody=R.items.filter(x=>!x.name.startsWith('stop.')&&x.name!=='share.hub')
    .map(item=>item.name.startsWith('control.cap')?`<g data-cap="${item.name.slice('control.cap'.length)}">${item.svg}</g>`:item.svg).join('');
  const shareHub=R.items.find(x=>x.name==='share.hub').svg;
  const stopMarkup=defaults.map((fraction,i)=>`<g data-stop="${i}">${R.items.filter(x=>x.name.endsWith(String(i))&&x.name.startsWith('stop.')).map(x=>x.svg).join('')}</g>`).join('');
  const faceMatrix=k.topMatrix([cx,cy],z+0.05,P);
  const sectors=['scope','high','deep','wrap','short','over'].map(n=>
    `<path data-sector="${n}" fill="var(--anatomy-${n==='deep'?'shade-1':n==='high'?'shade-2':n==='short'||n==='over'?'shade-0':'shade-3'})" stroke="var(--anatomy-mid)" stroke-width="0.35"/>`).join('');
  const counterMarkup=knobs.map(([x,y],i)=>
    `<g transform="${k.topMatrix([x,y+17.5],1.05,P)}"><clipPath id="c03-count-${i}"><rect x="-7" y="-2.5" width="14" height="5" rx="0.3"/></clipPath><text data-count="${i}" clip-path="url(#c03-count-${i})" text-anchor="middle" dominant-baseline="central" font-size="4.4" font-family="var(--anatomy-mono)" fill="var(--anatomy-mid)"></text></g>`).join('');
  const dynamic=`<g transform="${faceMatrix}">${sectors}<path data-part="deep-grooves" class="iso-line" data-tone="faint"/></g><g data-part="tick-scale"></g>${stopMarkup}<g transform="${faceMatrix}"><path data-part="hand" fill="var(--anatomy-lit)" stroke="var(--anatomy-lit)" stroke-width="0.25"/><circle r="13" fill="var(--anatomy-top)" stroke="var(--anatomy-mid)" stroke-width="0.6"/><circle r="11" fill="none" stroke="var(--anatomy-faint)" stroke-width="0.4"/><text data-part="total" text-anchor="middle" dominant-baseline="central" font-size="5.2" fill="var(--anatomy-mid)" font-family="var(--anatomy-mono)"/></g><path data-part="share" class="iso-line" data-tone="hi" data-free="end"/>${counterMarkup}`;
  const shareDisplay=`<g transform="${k.topMatrix([gx,-72],0.85,P)}"><clipPath id="c03-share-window"><rect x="-12" y="-4" width="24" height="8"/></clipPath><text data-part="share-value" clip-path="url(#c03-share-window)" text-anchor="middle" dominant-baseline="central" font-size="6" font-family="var(--anatomy-mono)" fill="var(--anatomy-mid)"></text></g>`;
  const bounds=extremes.map(p=>k.iso(p,P));
  return {
    markup:plate({id:3,body:halo(base,-18,12)+staticBody+dynamic+shareHub+shareDisplay,role:'group',keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'edge',key:'key.2'}]}),
    data:{P,cx,cy,z:z+0.05,r,gx,gy,knobs,defaults,stopRadii,parts:R.items.length,bounds:{x:Math.min(...bounds.map(p=>p[0])),y:Math.min(...bounds.map(p=>p[1])),width:Math.max(...bounds.map(p=>p[0]))-Math.min(...bounds.map(p=>p[0])),height:Math.max(...bounds.map(p=>p[1]))-Math.min(...bounds.map(p=>p[1]))}}
  };
}
