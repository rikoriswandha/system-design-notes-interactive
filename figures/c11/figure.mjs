import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';

// Figure: a pigeonhole mailroom, with a copying shuttle and an author tray.
// Structural bays are schematic samples, never a claimed recipient count.
export async function build({ audit, argv }) {
  const base = { x: -150, y: -66, w: 300, d: 140, r: 7 };
  const P = k.fitProjection([...k.boxCorners(base, -15, 0), ...k.boxCorners({x:-77,y:-49,w:205,d:55,r:1},0,128)], WIDTH, HEIGHT, { pad: 44, azimuth: 56, elevation: 27 });
  const { S, L, D, halo, at } = painter(P);
  const R = A.recorder(P);
  let parts = 0;
  const box = (name, plan, z, h, tone = 'mid', extra = '', attrs = '') => {
    const svg = `<g ${attrs}>${S(k.slabOf(plan, z, h, P, 4, .7), { tone, lit: name === 'shuttle.card', inner: extra })}</g>`;
    R.put({ name, piece: 'stand.mailroom', at: [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], svg, shapes: [R.solid(A.slab(plan, z, h, { name, owner: 'stand.mailroom' }))] });
    parts++;
  };
  const screws = (points, radius = 1.3) => L(points.map(([x,y,z])=>k.ring(x,y,radius,z,P,20)).join(''),{tone:'lo'}) + D(points.map(at),{size:.5});
  const groove = (plan,z) => L(k.planOutline(k.insetPlan(plan,3),z,P,4),{tone:'faint'});
  for (const [x, y] of k.corners(base, 19)) box('stand.foot' + parts, { x: x - 7, y: y - 7, w: 14, d: 14, r: 2 }, -15, 6, 'lo');
  box('stand.base', base, -9, 9, 'lo', L(k.planOutline(k.insetPlan(base, 5), 0, P), { tone: 'faint' }) + screws(k.corners(base, 10).map(([x,y])=>[x,y,0])) + L(k.sideSeam(base,-3,P,4),{tone:'faint'}));
  // A back, five uprights and four shelves make open, genuinely deep bays.
  box('rack.back', { x: -77, y: -49, w: 205, d: 4, r: 1 }, 0, 126);
  for (let i = 0; i < 5; i++) {
    const x = -77 + i * 50;
    const panel = i === 4 ? L(k.pathOf([at([x+5,-40,12]),at([x+5,-1,12]),at([x+5,-1,118]),at([x+5,-40,118])],true),{tone:'faint'}) +
      L([20,44,84,110].flatMap(z=>[-36,-5].map(y=>k.sideRing([x+5,y,z],1.2,'x',P))).join(''),{tone:'lo'}) +
      D([20,44,84,110].flatMap(z=>[-36,-5].map(y=>at([x+5,y,z]))),{size:.5}) +
      L([36,76].map(z=>k.pathOf(k.roundedPlan({x:-34,y:z,w:27,d:1.5,r:.7},4).map(([y,height])=>at([x+5,y,height])),true)).join(''),{tone:'faint'}) +
      L([44,84].map(z=>k.sideSeam({x,y:-45,w:5,d:49,r:.6},z,P,4)).join(''),{tone:'faint'}) : '';
    box('rack.upright' + i, { x, y: -45, w: 5, d: 49, r: .6 }, 4, 122, 'mid', panel);
    box('rack.shoe' + i, { x: x - 2, y: -45, w: 9, d: 49, r: 1 }, 0, 4, 'mid', screws([[x+2.5,-39,4],[x+2.5,-1,4]],.9));
  }
  for (let row = 0; row < 4; row++) {
    const z = 4 + row * 40;
    for (let col = 0; col < 4; col++) {
      const x = -72 + col * 50;
      const shelf = { x, y: -45, w: 45, d: 49, r: .5 };
      box(`rack.shelf${row}.${col}`, shelf, z, 2, 'mid', row===3 ? groove(shelf,z+2)+screws([[x+4,-40,z+2],[x+41,-40,z+2]]) : '');
      box(`rack.lip${row}.${col}`, { x, y: 4, w: 45, d: 2, r: .4 }, z, 4, 'mid',
        L(k.pathOf([at([x+9,6,z+1]),at([x+36,6,z+1]),at([x+36,6,z+3]),at([x+9,6,z+3])],true),{tone:'faint'}) +
        D([at([x+3,5,z+4]),at([x+42,5,z+4])], { size: .45 }));
      if (row < 3) {
        const card = { x: x+6, y: -34, w: 33, d: 29, r: 1 };
        const ink = L([k.lineOnTop([x+10,-21],[x+29,-21],z+3.4,P),k.lineOnTop([x+10,-18],[x+25,-18],z+3.4,P)].join(''), { tone:'lo', free:true });
        const fold = L(k.onTop([[x+6,-34],[x+22.5,-25],[x+39,-34]],z+3.4,P),{tone:'faint'});
        box(`feed.card${row}.${col}`, card, z+2, 1.4, 'hi', ink+fold, `data-feed-card data-row="${row}" data-col="${col}"`);
      }
    }
  }
  // Author tray on the left: one durable source, rather than replicated contents.
  const author={ x: -137, y: -43, w: 48, d: 45, r: 2 };
  box('author.floor', author, 0, 5, 'mid',groove(author,5));
  for (const x of [-137,-92]) box('author.wall'+x, { x, y:-43, w:3, d:45, r:.5 }, 5, 17, 'mid',screws([[x+1.5,-37,22],[x+1.5,-3,22]],.8));
  box('author.back', { x:-134,y:-43,w:42,d:3,r:.5 },5,17,'mid',D([-126,-113,-100].map(x=>at([x,-40,15])),{size:.45}));
  box('author.source',{x:-130,y:-35,w:34,d:29,r:1},5,3,'hi',L([k.lineOnTop([-126,-21],[-106,-21],8,P),k.lineOnTop([-126,-18],[-110,-18],8,P),k.lineOnTop([-126,-15],[-115,-15],8,P)].join(''),{tone:'lo',free:true}) + L(k.onTop([[-130,-35],[-113,-26],[-96,-35]],8,P),{tone:'faint'}));
  // The shuttle is captive on a broad rail with stops and a ruler.
  box('rail.bed',{x:-137,y:24,w:267,d:19,r:2},0,7,'mid',L(k.sideSeam({x:-137,y:24,w:267,d:19,r:2},3,P,4),{tone:'faint'}) + screws([[-130,27,7],[-130,41,7],[123,27,7],[123,41,7]],.8));
  box('rail.track',{x:-132,y:29,w:257,d:8,r:1},7,3,'hi');
  for (const x of [-137,125]) box('rail.stop'+x,{x,y:24,w:5,d:19,r:1},7,9,'mid',D([at([x+2.5,33,16])],{size:.5}));
  const strip={x:-130,y:39,w:253,d:3,r:.3};
  box('rail.scale',strip,7, .7,'lo', L(k.topTicks(-126,120,6,5,39,7.7,[1.2,2.5],P).minor,{tone:'faint'}) + L(k.topTicks(-126,120,6,5,39,7.7,[1.2,2.5],P).major,{tone:'lo'}));
  box('shuttle.body',{x:-129,y:10,w:27,d:30,r:2},10,8,'mid',screws([[-125,13,18],[-106,37,18]],.9) + L(k.sideSeam({x:-129,y:10,w:27,d:30,r:2},14,P,4),{tone:'faint'}),'data-shuttle-base');
  // The mast stays with the carriage; the pickup visits each shelf level.
  const mastRule=Array.from({length:17},(_,i)=>k.segment([-102,15,26+i*5],[-102,i%4===0?12.4:13.8,26+i*5],P)).join('');
  box('shuttle.mast',{x:-107,y:10,w:5,d:6,r:.5},18,98,'mid',L(k.pathOf([at([-102,11,22]),at([-102,15,22]),at([-102,15,112]),at([-102,11,112])],true),{tone:'faint'}) + L(mastRule,{tone:'lo'}),'data-shuttle-base');
  box('shuttle.cap',{x:-108,y:9,w:7,d:8,r:.7},116,3,'mid',screws([[-104.5,13,119]],.9),'data-shuttle-base');
  box('shuttle.arm',{x:-122,y:16,w:20,d:21,r:1},24,3,'mid',screws([[-118,18,27],[-105,18,27]],.8),'data-shuttle-head');
  box('shuttle.card',{x:-120,y:20,w:18,d:15,r:.8},27,1.2,'hi',L(k.onTop([[-120,20],[-111,26],[-102,20]],28.2,P),{tone:'hi'}),'data-shuttle-head');
  for(const y of [22,32]) box('shuttle.grip'+y,{x:-122,y,w:2,d:3,r:.3},27,3,'mid','','data-shuttle-head');
  const reader={x:55,y:49,w:58,d:19,r:2};
  box('reader.tray',reader,0,4,'hi',L(k.planOutline({x:60,y:53,w:48,d:11,r:1},4,P),{tone:'lo'}) + screws([[58,52,4],[110,65,4]],.8));
  box('reader.feed',{x:63,y:54,w:39,d:9,r:.6},4,1,'hi',L(k.onTop([[63,54],[82.5,59],[102,54]],5,P),{tone:'faint'}) + L(k.lineOnTop([73,61],[94,61],5,P),{tone:'lo',free:true}));
  const gauge={x:-130,y:54,w:155,d:8,r:1};
  const activeTicks=k.topTicks(-126,21,7.5,2,54,1,[2,4],P);
  box('active.strip',gauge,0,1,'lo',L(k.planOutline(k.insetPlan(gauge,.8),1,P),{tone:'faint'}) + L(activeTicks.minor,{tone:'faint'}) + L(activeTicks.major,{tone:'lo'}));
  box('active.rider',{x:-129,y:54,w:3,d:8,r:.4},1,3,'hi','','data-active');
  const label={x:32,y:51,w:18,d:14,r:1};
  box('stand.label',label,0,.8,'lo',groove(label,.8) + L([7,10,5].map((w,i)=>k.lineOnTop([36,55+i*2],[36+w,55+i*2],.8,P)).join(''),{tone:'lo',free:true}) + screws([[34,53,.8],[48,63,.8]],.7));
  A.settle(R,P);
  // The entire shuttle travel lies in front of the rack.
  let front = Math.max(...R.items.map(item=>item.key)) + 1;
  for(const item of R.items.filter(item=>item.name.startsWith('shuttle.')).sort((a,b)=>a.key-b.key)) item.key=front++;
  if (audit) A.auditOrExit(R,P,{argv});
  const body = halo(base,-15,8) + R.items.sort((a,b)=>a.key-b.key).map(item=>item.svg).join('');
  const controls = '<div class="iso-controls">' + ['push','pull','hybrid'].map(mode=>`<button type="button" class="btn" data-mode="${mode}" data-fig-text="fig.c11.mode.${mode}"></button>`).join('') + '</div>';
  return { markup: plate({id:11,body,role:'group',keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'edge',key:'key.2'}],controls}), data:{P,parts} };
}
