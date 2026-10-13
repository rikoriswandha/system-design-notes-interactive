import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as G from '../kit/lathe.mjs';
import * as A from '../kit/audit.mjs';

// A numbering press: one printing wheel per usable bit, a sprung crosshead,
// fixed budget rail, sliding partition markers, and a rollback clock.
export async function build({ argv }) {
  const base = { x: -126, y: -66, w: 252, d: 156, r: 8 };
  const P = k.fitProjection([...k.boxCorners(base, -18, 0), ...k.boxCorners({x:-107,y:-42,w:214,d:67,r:0},100,116)], WIDTH, HEIGHT, { pad: 34.8, azimuth: 48, elevation: 28 });
  const { S, L, D, halo } = painter(P);
  const R = A.recorder(P,{order:['press']});
  let count = 0;
  const put = (name,at,svg,shape,attrs='') => {
    count++;
    const moving=attrs.includes('data-press');
    R.put({ name, piece:moving?'press':'stamp', move:moving?[0,0,-1.5]:[0,0,0], at, svg:`<g ${attrs}>${svg}</g>`, shapes:[R.solid(shape)] });
  };
  const screw = (x,y,z) => L(k.ring(x,y,1.7,z,P,24),{tone:'lo'}) + D(k.pointsAt([[x,y,z]],P),{size:0.5});
  const slab = (name,plan,z,h,tone='mid',inner='',attrs='') => put(name,[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2],S(k.slabOf(plan,z,h,P,6,.6),{tone,inner,lit:name==='sequence-rider'}),A.slab(plan,z,h,{name,ground:name.startsWith('stand.')},6),attrs);
  const groove = (plan,z) => L(k.planOutline(k.insetPlan(plan,3),z,P,6),{tone:'faint'});
  const panel = (name,plan,z,h,tone='mid',attrs='') => slab(name,plan,z,h,tone,groove(plan,z+h)+k.corners(plan,5).map(([x,y])=>screw(x,y,z+h)).join(''),attrs);
  const facePath = points => k.pathOf(points.map(p=>k.iso(p,P)),true);
  const turned = (name,F,from,to,r,tone='mid',inner='',attrs='') => put(name,G.pointOf(F,(from+to)/2,0,0),S(G.disc(from,to,r,F,P,{bevel:.35}),{tone,inner}),A.disc(F,from,to,r,{name}),attrs);

  for (const [i,[x,y]] of k.corners(base,19).entries()) {
    slab(`stand.foot${i}`,{x:x-8,y:y-8,w:16,d:16,r:3},-18,5,'lo');
    slab(`stand.sole${i}`,{x:x-6,y:y-6,w:12,d:12,r:2},-13,3,'lo');
  }
  panel('stand.base',base,-10,10,'lo');
  const bed={x:-110,y:-14,w:220,d:55,r:5};
  panel('bed',bed,0,10);
  for (const x of [-101,93]) {
    panel(`footing${x}`,{x,y:-45,w:16,d:30,r:3},0,8);
    const post={x:x+4,y:-39,w:8,d:18,r:1};
    const oilSlot=facePath([[x+12,-34,22],[x+12,-25,22],[x+12,-25,79],[x+12,-34,79]]);
    const seams=[24,82].map(z=>L(k.sideSeam(post,z,P,6),{tone:'faint'})).join('');
    slab(`post${x}`,post,8,84,'mid',seams+L(oilSlot,{tone:'faint'}));
    panel(`cap${x}`,{x:x+1,y:-42,w:14,d:24,r:2},92,8);
    slab(`guide-lower${x}`,{x:x+5,y:-21,w:6,d:4,r:1},8,52,'mid',L(k.sideSeam({x:x+5,y:-21,w:6,d:4,r:1},48,P,6),{tone:'faint'}));
    slab(`guide-upper${x}`,{x:x+5,y:-21,w:6,d:4,r:1},68,24,'mid');
    slab(`stop${x}`,{x:x+1,y:-21,w:14,d:4,r:.5},60,8,'mid');
  }
  panel('bridge',{x:-107,y:-39,w:214,d:18,r:3},100,10);
  panel('crown',{x:-24,y:-38,w:48,d:16,r:3},110,5);
  for (const y of [-10,27]) slab(`rail${y}`,{x:-101,y,w:202,d:5,r:1},10,6,'mid',L(k.sideSeam({x:-101,y,w:202,d:5,r:1},13,P,6),{tone:'faint'}));
  panel('anvil',{x:-100,y:-5,w:200,d:30,r:3},10,12);
  const pad={x:-98,y:-3,w:196,d:26,r:2};
  slab('pad',pad,22,8,'hi',groove(pad,30));
  // Registration marks on the receiving sheet use the same usable-bit span
  // as the wheel bank; the roller's contact line lands inside the sheet.
  const sheet={x:-97,y:1,w:194,d:21,r:1};
  const registration=k.topTicks(-94.5,94.5,3,7,22,30.5,[-1.2,-2.4],P);
  const perforations=[[-94,3],[-94,19],[94,3],[94,19]].map(([x,y])=>L(k.ring(x,y,.7,30.5,P,16),{tone:'lo'})).join('');
  slab('receipt',sheet,30,.5,'hi',L(registration.minor,{tone:'lo'})+L(registration.major,{tone:'mid'})+perforations);
  slab('ruler',{x:-100,y:34,w:200,d:7,r:1},10,1,'lo');
  const ticks = k.topTicks(-94.5,94.5,3,7,34,11,[2,4],P);
  const ruler = L(ticks.minor,{tone:'lo'}) + L(ticks.major,{tone:'mid'});
  for(const x of [-107,101]) {
    slab(`rail-stop${x}`,{x,y:26,w:6,d:16,r:1},10,9,'mid',screw(x+3,34,19));
    slab(`hanger${x}`,{x,y:1,w:6,d:10,r:1},40,28,'mid',L(k.sideSeam({x,y:1,w:6,d:10,r:1},45,P,6),{tone:'faint'}), 'data-press');
  }
  panel('crosshead',{x:-107,y:-17,w:214,d:42,r:3},68,8,'mid','data-press');
  const neck={x:-13,y:-35,w:26,d:30,r:2};
  slab('plunger-bridge',neck,76,3,'mid',groove(neck,79),'data-press');
  const rodFrame=G.frameAlong([0,-30,82],[0,0,-1]);
  const rod=G.rodOut(rodFrame,0,3,3,P,{stroke:1.5});
  put('sliding-plunger',[0,-30,80.5],`<defs><clipPath id="c07-plunger-clip"><path data-hold d="${rod.clip}"/></clipPath></defs><g clip-path="url(#c07-plunger-clip)">${S(rod.paths,{tone:'hi'})}</g>`,A.slide(rodFrame,0,3,3,{name:'sliding-plunger'}),'data-press data-plunger');
  const springFrame=G.frameAlong([0,-30,82],[0,0,1]);
  for(let i=0;i<7;i++) {
    const s=i*2.5;
    const profile=[[s,3],[s+.45,7.5],[s+1.05,7.5],[s+1.3,3]];
    put(`return-washer${i}`,G.pointOf(springFrame,s+.65,0,0),S(G.solidOf(profile,springFrame,P,{smooth:false}),{tone:'mid'}),A.solid(springFrame,profile,{name:`return-washer${i}`}));
    turned(`plunger-gap${i}`,springFrame,s+1.3,i===6?18:s+2.5,3,'hi');
  }
  const axle=G.frameAlong([0,6,44],[1,0,0]);
  turned('wheel-axle-left',axle,-101,-94.5,2.4,'mid','', 'data-press');
  turned('wheel-axle-right',axle,94.5,101,2.4,'mid','', 'data-press');
  // 63 is the real model's reserved-sign-bit budget. Runtime partitions this
  // fixed wheel bank using timestampBits, workerBits and sequenceBits.
  for(let i=0;i<63;i++) {
    const s=-94.5+i*3;
    // Wheel and the hidden shaft core are one contiguous recorded assembly.
    // Only the two exposed shaft ends are separate solids.
    const shape=A.disc(axle,s,s+3,12,{name:`bit-wheel${i}`});
    const grooves=k.fadedSvg(G.ribsOf(axle,s,s+3,12,12,P,{fade:[.05,.4],seams:true}),{tone:'lo'});
    const outer=S(G.disc(s,s+3,12,axle,P,{bevel:.2}),{tone:'hi',inner:grooves});
    put(`bit-wheel${i}`,G.pointOf(axle,s+1.5,0,0),outer,shape,`data-wheel="${i}" data-press`);
  }
  for(const [i,x] of [-96,27,57,93].entries()) {
    const plan={x,y:34,w:3,d:7,r:.5};
    slab(`partition${i}`,plan,11,5,'mid',screw(x+1.5,37.5,16),`data-divider="${i}"`);
    slab(`partition-foot${i}`,{x,y:32,w:3,d:9,r:.5},16,2,'mid','',`data-divider="${i}"`);
    slab(`partition-finger${i}`,{x,y:32,w:3,d:1,r:.3},18,24,'mid','',`data-divider="${i}"`);
  }
  const rider={x:53.5,y:27,w:12,d:5,r:.8};
  slab('sequence-rider',rider,16,4,'hi',screw(59.5,29.5,20),'data-rider');
  const handleFrame=G.frameAlong([0,10,89],[1,0,0]);
  slab('handle-neck',{x:-6,y:6,w:12,d:8,r:1.5},76,6,'mid','', 'data-press');
  turned('grip-left',handleFrame,-39,-33,7,'mid','', 'data-press');
  turned('grip',handleFrame,-33,33,7,'mid',k.fadedSvg(G.ribsOf(handleFrame,-33,33,7,32,P,{fade:[.05,.45],seams:true}),{tone:'lo'}),'data-press');
  turned('grip-right',handleFrame,33,39,7,'mid','', 'data-press');
  for(const [i,x] of [-83,-21,41].entries()) {
    const cover={x,y:-3,w:42,d:6,r:1};
    slab(`bank-access${i}`,cover,76,1,'lo',L(k.planOutline(k.insetPlan(cover,1),77,P,6),{tone:'faint'})+screw(x+4,0,77)+screw(x+38,0,77),'data-press');
  }

  // Three clipped numeric windows are actual mechanical bit counters, not labels.
  const windows=[];
  for(const [i,x] of [-74,-17,40].entries()) {
    slab(`counter-bezel${i}`,{x,y:25,w:34,d:1.4,r:.5},69,5,'mid','', 'data-press');
    const glass=facePath([[x+2,26.4,70],[x+32,26.4,70],[x+32,26.4,73],[x+2,26.4,73]]);
    windows.push(`<g data-press><defs><clipPath id="c07-counter-${i}"><path d="${glass}"/></clipPath></defs>${L(glass,{tone:'lo'})}<g clip-path="url(#c07-counter-${i})"><text data-counter="${i}" transform="${k.sideMatrix([x+17,26.4],70.3,P,'left')}" class="iso-face-text" data-tone="hi" text-anchor="middle" font-size="3.6"></text></g></g>`);
  }
  panel('clock-seat',{x:59,y:47,w:50,d:41,r:3},0,6);
  const clock={x:84,y:68,r:18,z:6,h:6};
  turned('clock-case',G.frameAlong([clock.x,clock.y,0],[0,0,1]),6,10,18,'hi',L(k.sideArc(clock.x,clock.y,18,8,P,64),{tone:'faint'}));
  turned('clock-bezel',G.frameAlong([clock.x,clock.y,0],[0,0,1]),10,12,17,'hi');
  slab('clock-crown-seat',{x:109,y:65,w:8,d:8,r:1},0,6,'mid');
  const crownFrame=G.frameAlong([109,69,9],[1,0,0]);
  turned('clock-crown',crownFrame,0,8,3,'mid',k.fadedSvg(G.ribsOf(crownFrame,0,8,3,20,P,{fade:[.05,.4],seams:true}),{tone:'lo'}));
  const label={x:-100,y:63,w:91,d:17,r:2};
  slab('plate',label,0,1,'lo',groove(label,1)+screw(-94,71,1)+screw(-15,71,1)+[0,1,2].map(i=>L(k.lineOnTop([-84,67+i*3],[-30+i*8,67+i*3],1,P),{tone:'lo',free:true})).join(''));
  const clockTicks=k.radialTicks(clock.x,clock.y,15.5,12,3,12,[1.4,3],P);
  const clockArt=L(k.ring(clock.x,clock.y,15.5,12,P,64),{tone:'lo'})+L(clockTicks.minor,{tone:'lo'})+L(clockTicks.major,{tone:'mid'})+`<path data-clock class="iso-line" data-tone="hi" data-free="end"/>`+D(k.pointsAt([[clock.x,clock.y,12.2]],P),{size:1});
  A.settle(R,P);
  A.auditOrExit(R,P,{argv});
  const body=halo(base,-18,12)+R.items.sort((a,b)=>a.key-b.key).map(item=>item.svg).join('')+ruler+windows.join('')+`<path data-cursor class="iso-line" data-tone="lit"/>`+clockArt;
  return {markup:plate({id:7,body,role:'group',keys:[{mark:'raised',key:'key.0'},{mark:'edge',key:'key.1'},{mark:'lit',key:'key.2'}]}),data:{P,clock,parts:count}};
}
