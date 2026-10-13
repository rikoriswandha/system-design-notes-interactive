import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as G from '../kit/lathe.mjs';
import * as A from '../kit/audit.mjs';

// A real upright split-flap board: each installed cassette is one actual shard.
// Cabinet, feet, shoes, lid, 32 window cassettes, collector rails/stops/bearings,
// four clipped counter windows, selector keys, load gauge, ventilation and service details.
export async function build({ argv }) {
  const base = { x: -161, y: -45, w: 322, d: 143, r: 8 };
  const cabinet = { x: -147, y: -31, w: 294, d: 46, r: 4 };
  const P = k.fitProjection([...k.boxCorners(base, -16, 0), ...k.boxCorners(cabinet, 0, 178)], WIDTH, HEIGHT, { pad: 43, azimuth: 65, elevation: 24 });
  // Fit the real rounded silhouette, not only the looser square corner envelope.
  const zoom = 1.02;
  P.scale *= zoom;
  P.origin = [WIDTH / 2 + (P.origin[0] - WIDTH / 2) * zoom, HEIGHT / 2 + (P.origin[1] - HEIGHT / 2) * zoom + 1.5];
  const { S, L, D, halo } = painter(P);
  const R = A.recorder(P, { order: ['collector'], spring: { stiffness: 64, damping: 16, stagger: 0 } });
  let serial = 0;
  const at = point => k.iso(point, P);
  const line = (a, b, tone = 'faint', free = false) => L(k.segment(a, b, P), { tone, free });
  const dot = points => D(k.pointsAt(points, P), { size: 0.5, tone: 'mid' });
  function put(name, at, svg, shape, attrs = '') {
    serial++;
    const moving = attrs.includes('data-carriage') || attrs.includes('data-bearing');
    shape.name = `${name === 'base' || name.startsWith('foot') ? 'stand' : 'tote'}.${name}`;
    R.put({ id: serial, name: shape.name, piece: moving ? 'collector' : 'stand', move: moving ? [238, 0, 0] : [0, 0, 0], at, svg: `<g data-item="${serial}" ${attrs}>${svg}</g>`, shapes: [R.solid(shape)] });
  }
  function slab(name, plan, z, h, tone = 'mid', extra = '', attrs = '', lit = false) {
    put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, 6, Math.min(0.8, h / 4)), { tone, lit, inner: extra }), A.slab(plan, z, h, { name: `stand.${name}` }, 6), attrs);
  }
  const screws = (plan, z, inset = 4) => {
    const points = k.corners(plan, inset);
    return L(points.map(([x,y]) => k.ring(x,y,1.4,z,P,20)).join(''), { tone:'lo' }) + dot(points.map(([x,y]) => [x,y,z]));
  };
  function faceRing(x, y, z, w, h, r = 1) {
    return k.pathOf(k.roundedPlan({ x, y: z, w, d: h, r }, 5).map(([u,v]) => at([u,y,v])), true);
  }
  function facePlate(name, x, y, z, w, h, thickness, tone, extra = '', attrs = '') {
    const F = G.frameOf([x, y, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    const polygon = [[0,0],[w,0],[w,h],[0,h]];
    put(name, [x + w/2,y + thickness/2,z+h/2], S(G.prismOf(F,polygon,0,thickness,P), { tone, inner:extra }), A.prism(F,polygon,0,thickness,{name:`stand.${name}`}),attrs);
  }
  function turned(name, F, s0, s1, radius, extra = '', attrs = '') {
    put(name, G.pointOf(F, (s0 + s1) / 2, 0, 0), S(G.disc(s0, s1, radius, F, P), { tone: 'mid', inner: extra }), A.disc(F, s0, s1, radius, { name: `stand.${name}` }), attrs);
  }
  for (const [index,[x,y]] of k.corners(base,21).entries()) {
    slab(`foot${index}`, {x:x-7,y:y-7,w:14,d:14,r:2},-16,6,'lo');
  }
  slab('base',base,-10,10,'lo',L(k.sideSeam(base,-5,P,6),{tone:'faint'})+L(k.planOutline(k.insetPlan(base,4),0,P,6),{tone:'faint'})+screws(base,0,9));
  for (const x of [-131,111]) slab(`shoe${x}`,{x,y:-25,w:20,d:35,r:2},0,5,'mid',screws({x,y:-25,w:20,d:35,r:2},5));
  const shell = {...cabinet};
  // The shoes terminate flush at the underside of the upright housing.
  let shellDetail = L(k.sideSeam(shell,14,P,6),{tone:'faint'}) + L(k.sideSeam(shell,162,P,6),{tone:'faint'});
  // Closed louver slots and a recessed service cover on the cabinet's visible side.
  const sidePath = (y,z,w,h) => k.pathOf(k.roundedPlan({x:y,y:z,w,d:h,r:0.7},4).map(([u,v])=>at([147,u,v])),true);
  for(let i=0;i<9;i++) shellDetail += L(sidePath(-23,91+i*5,28,1.5),{tone:'lo'});
  const trimFasteners = [];
  for (const x of [-141, 141]) for (const z of [23, 62, 101, 140, 165]) trimFasteners.push([x, 15, z]);
  shellDetail += dot(trimFasteners) + L(faceRing(-140, 15, 20, 280, 141, 2), { tone: 'faint' });
  // Punched ventilation underneath each cassette column cools its flap drive.
  for (let column = 0; column < 8; column++) {
    for (let vent = 0; vent < 5; vent++) {
      shellDetail += L(faceRing(-131 + column * 34 + vent * 4.5, 15, 28, 2, 10, 1), { tone: 'faint' });
    }
  }
  slab('housing',shell,5,164,'mid',shellDetail);
  // A removable side cover with a proud latch and two real hinge barrels.
  const coverF = G.frameOf([147, -25, 34], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const coverPolygon = [[0,0], [32,0], [32,42], [0,42]];
  const coverDetail = L(k.pathOf([[150,-22,37],[150,4,37],[150,4,73],[150,-22,73]].map(at), true), { tone:'faint' });
  put('service-cover', [148.5,-9,55], S(G.prismOf(coverF,coverPolygon,0,3,P), {tone:'mid',inner:coverDetail}), A.prism(coverF,coverPolygon,0,3,{name:'stand.service-cover'}));
  const latchF = G.frameOf([150, -9, 48], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const latchPolygon = [[0,0], [4,0], [4,12], [0,12]];
  put('service-latch', [151,-7,54], S(G.prismOf(latchF,latchPolygon,0,2,P), {tone:'hi'}), A.prism(latchF,latchPolygon,0,2,{name:'stand.service-latch'}));
  for (const z of [40, 64]) {
    const F = G.frameAlong([148,-26,z], [0,0,1]);
    turned(`cover-hinge${z}`,F,0,7,1,L(G.arcOf(F,3.5,1,P),{tone:'faint'}));
  }
  const lid={x:-149,y:-33,w:298,d:50,r:4};
  // Lid louvers and screws run across the housing, not as floating texture marks.
  let lidDetail = screws(lid,174,7);
  for(let i=0;i<12;i++) lidDetail+=L(k.planOutline({x:-91+i*15,y:-21,w:9,d:16,r:1},174,P,4),{tone:'faint'});
  slab('lid',lid,169,5,'mid',lidDetail);
  const slots=[];
  for(let i=0;i<32;i++) {
    const x=-134+(i%8)*34, z=132-Math.floor(i/8)*29;
    const w=28,h=24,y=15;
    const clip=`c25-shard-clip-${i}`;
    const inset=faceRing(x+2,y+2,z+2,w-4,h-4,0.6);
    let detail=L(inset,{tone:'lo'})+line([x,y+2,z+12],[x+w,y+2,z+12],'mid');
    detail+=dot([[x+1.1,y+2,z+12],[x+w-1.1,y+2,z+12]]);
    detail += L(faceRing(x+0.3,y+2,z+11.2,1.6,1.6,0.8),{tone:'lo'}) + L(faceRing(x+w-1.9,y+2,z+11.2,1.6,1.6,0.8),{tone:'lo'});
    detail+=`<clipPath id="${clip}"><path d="${inset}"/></clipPath><g clip-path="url(#${clip})"><text data-shard-value="${i}" transform="${k.sideMatrix([x+w/2,y+2],z+8,P,'left')}" text-anchor="middle" font-family="monospace" font-size="7" fill="var(--anatomy-hi)"></text></g>`;
    facePlate(`cassette${i}`,x,y,z,w,h,2,'hi',detail,`data-shard="${i}"`);
    slots.push([x+w/2,z+12]);
  }
  const consolePlan={x:-147,y:43,w:294,d:43,r:4};
  slab('console',consolePlan,0,16,'mid',L(k.sideSeam(consolePlan,8,P,6),{tone:'faint'})+screws(consolePlan,16,5));
  // The console's front skin is a removable, ventilated electronics service strip.
  let frontServiceDetail = L(faceRing(-137,86.8,4,274,8,1),{tone:'faint'});
  for (let vent = 0; vent < 8; vent++) frontServiceDetail += L(faceRing(-113+vent*29,86.8,6,20,3,1),{tone:'lo'});
  frontServiceDetail += dot([[-134,86.8,8],[134,86.8,8]]);
  frontServiceDetail += L(faceRing(-135.2,86.8,6.8,2.4,2.4,1.2),{tone:'lo'}) + L(faceRing(132.8,86.8,6.8,2.4,2.4,1.2),{tone:'lo'});
  facePlate('console-service-strip',-139,86,2,278,12,0.8,'mid',frontServiceDetail);
  for(let i=0;i<4;i++) {
    const x=-135+i*58,plan={x,y:49,w:51,d:20,r:1.5};
    const clip=`c25-counter-${i}`;
    const detail=`<clipPath id="${clip}"><path d="${k.planOutline(k.insetPlan(plan,1.5),16.8,P,5)}"/></clipPath><g clip-path="url(#${clip})"><text data-value="${i}" transform="${k.topMatrix([x+25.5,61],16.8,P)}" text-anchor="middle" font-family="monospace" font-size="10" fill="var(--anatomy-hi)"></text><text data-unit="${i}" transform="${k.topMatrix([x+25.5,66.5],16.8,P)}" text-anchor="middle" font-family="monospace" font-size="3.7" fill="var(--anatomy-mid)"></text></g>`;
    slab(`counter${i}`,plan,16,0.8,'lo',detail);
  }
  for(let i=0;i<3;i++) slab(`selector${i}`,{x:-132+i*22,y:74,w:16,d:7,r:1},16,2,'hi','',`data-mode="${i}"`);
  const label={x:-56,y:74,w:56,d:7,r:1};
  let labelDetail=L(k.planOutline(k.insetPlan(label,1),16.5,P,4),{tone:'faint'});
  for(const [i,w] of [[0,38],[1,25],[2,31]]) labelDetail+=L(k.lineOnTop([-51,75.8+i*1.5],[-51+w,75.8+i*1.5],16.5,P),{tone:'lo',free:true});
  slab('label',label,16,0.5,'lo',labelDetail);
  // A load gauge is set into the console, sized to the model's 100,000-update maximum.
  const gauge={x:96,y:47,w:39,d:34,r:3};
  const gaugeDetail=L(k.planOutline(k.insetPlan(gauge,2),18,P,5),{tone:'lo'});
  slab('gauge',gauge,16,2,'hi',gaugeDetail);
  const scale={x:101,y:53,w:28,d:17,r:1};
  const ticks=k.topTicks(102,128,1.3,4,53,18.6,[3,6],P);
  slab('load-scale',scale,18,0.6,'lo',L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'}));
  // Two rails on the base hold the large merge collector at the bottom of the board.
  for(const y of [23,34]) slab(`rail${y}`,{x:-141,y,w:282,d:4,r:0.6},0,12,'mid');
  const ruler={x:-136,y:26,w:272,d:7,r:0.7};
  const ticksRail=k.topTicks(-134,134,8.5,4,26,12.5,[2,5],P);
  slab('travel-ruler',ruler,12,0.5,'lo',L(ticksRail.minor,{tone:'lo'})+L(ticksRail.major,{tone:'mid'}));
  for(const x of [-147,141]) slab(`stop${x}`,{x,y:21,w:6,d:21,r:1},0,18,'mid',screws({x,y:21,w:6,d:21,r:1},18,1.5));
  // The collector rides a lead screw in a bored nut, wholly below its floor.
  const screwF = G.frameAlong([-141,41,10.2],[1,0,0]);
  const thread = k.coil(-141,141,[41,10.2],0.8,56,'x',P);
  turned('lead-screw',screwF,0,282,0.8,L(thread.front,{tone:'lo'}));
  const crankF = G.frameAlong([147,41,10.2],[1,0,0]);
  turned('crank',crankF,0,5,3,k.fadedSvg(G.ribsOf(crankF,0,5,3,24,P,{fade:[0.1,0.55],seams:true}),{tone:'lo'})+L(G.circleOf(crankF,5,1.8,P),{tone:'mid'}));
  const carriage={x:-139,y:21,w:40,d:21,r:2};
  slab('collector',carriage,12,8,'hi',screws(carriage,20,4),'data-carriage',true);
  for(const x of [-136,-105]) for(const y of [23,34]) slab(`bearing${x}-${y}`,{x,y,w:4,d:4,r:0.6},20,2,'mid','','data-bearing');
  const collectorWindow={x:-130,y:27,w:22,d:11,r:1};
  const collectorClip='c25-collector-count';
  const collectorDisplay=`<clipPath id="${collectorClip}"><path d="${k.planOutline(k.insetPlan(collectorWindow,1),20.7,P,4)}"/></clipPath><g clip-path="url(#${collectorClip})"><text data-merge-count transform="${k.topMatrix([-119,34.5],20.7,P)}" text-anchor="middle" font-family="monospace" font-size="5" fill="var(--anatomy-hi)"></text></g>`;
  slab('collector-display',collectorWindow,20,0.7,'lo',collectorDisplay,'data-bearing');
  // Four machined cheeks form the collector's square bore. Splitting the actual nut
  // lets the screw draw between its near and far walls throughout the traverse.
  const nutF = G.frameOf([-130,41,10.2],[1,0,0],[0,1,0],[0,0,1]);
  const cheeks = [
    [[-1.8,1],[1.8,1],[1.8,1.8],[-1.8,1.8]],
    [[-1.8,-1.8],[1.8,-1.8],[1.8,-1],[-1.8,-1]],
    [[-1.8,-1],[-1,-1],[-1,1],[-1.8,1]],
    [[1,-1],[1.8,-1],[1.8,1],[1,1]]
  ];
  cheeks.forEach((polygon,i) => put(`collector-nut${i}`,G.pointOf(nutF,1.5,0,0),S(G.prismOf(nutF,polygon,0,3,P),{tone:'mid'}),A.prism(nutF,polygon,0,3,{name:`tote.collector-nut${i}`}),'data-bearing'));
  A.settle(R,P);
  A.auditOrExit(R,P,{argv});
  R.items.sort((a,b)=>a.key-b.key);
  const needle=`<path data-needle class="iso-line" data-tone="hi" data-free="end" d="${k.lineOnTop([102,69],[102,54],18.9,P)}"/>`;
  const extremes=[...k.boxCorners(base,-16,0),...k.boxCorners(lid,169,174)].map(at);
  const bounds={x:Math.min(...extremes.map(p=>p[0])),y:Math.min(...extremes.map(p=>p[1])),width:Math.max(...extremes.map(p=>p[0]))-Math.min(...extremes.map(p=>p[0])),height:Math.max(...extremes.map(p=>p[1]))-Math.min(...extremes.map(p=>p[1]))};
  const sorting=R.items.map(item=>({id:item.id,key:item.key,lift:G.dot3(item.move,G.viewOf(P))}));
  return {markup:plate({id:25,body:halo(base,-16,10)+R.items.map(item=>item.svg).join('')+needle,role:'group',keys:[{mark:'raised',key:'key.0'},{mark:'lit',key:'key.1'},{mark:'edge',key:'key.2'}]}),data:{P,slots,parts:serial,bounds,sorting,travel:34,needle:{start:102,span:26,y0:69,y1:54,z:18.9}}};
}
