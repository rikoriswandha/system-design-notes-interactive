import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';

// Figure: a front-desk issuing rack. The gate serializes issuance, the version
// shutter checks optimistic writes, and the capacity rider exposes overselling.
// Parts: four feet, plinth, desk, groove, two rack uprights and shoes, backboard,
// crown, three shelves, six shelf braces, five counter bezels, two gate guides,
// two latch shoes, lock bar, version shutter, key bow/stem/teeth, receiving tray,
// three tray walls, ticket bed/end stops, capacity rail/rider and request tickets.
export async function build({ argv }) {
  const base = { x:-170, y:-55, w:340, d:135, r:7 };
  const P = k.fitProjection([...k.boxCorners(base,-16,0),[-148,-34,159],[148,-34,159]],WIDTH,HEIGHT,{pad:44,azimuth:52,elevation:22});
  const { S,L,D,at,halo } = painter(P);
  const R = A.recorder(P);
  let count=0;
  function slab(name,plan,z,h,tone='mid',extra='',attrs='') {
    count++;
    const svg=`<g ${attrs}>${S(k.slabOf(plan,z,h,P,5,Math.min(.7,h/3)),{tone,lit:name==='key.bow',inner:extra})}</g>`;
    R.put({name,at:[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2],piece:'stand.rack',svg,shapes:[R.solid(A.slab(plan,z,h,{name,owner:name,ground:name==='plinth'}))]});
  }
  const screws=(plan,z)=>{
    const points=k.corners(plan,3);
    return L(points.map(([x,y])=>k.ring(x,y,1.2,z,P,20)).join(''),{tone:'lo'})+D(points.map(([x,y])=>at([x,y,z])),{size:.48});
  };
  for(const [x,y] of k.corners(base,18)) slab('foot',{x:x-6,y:y-5,w:12,d:10,r:2},-16,6,'lo');
  slab('plinth',base,-10,10,'lo',L(k.sideSeam(base,-5,P,5),{tone:'faint'}));
  const desk={...base,x:-166,y:-51,w:332,d:127,r:5};
  slab('desk',desk,0,5,'lo',L(k.planOutline(k.insetPlan(desk,5),5,P),{tone:'faint'})+screws(desk,5));
  for(const x of [-150,142]) {
    slab('shoe',{x:x-3,y:-40,w:14,d:20,r:2},5,5,'mid');
    slab('upright',{x,y:-35,w:8,d:10,r:1},10,135,'mid');
    slab('cap',{x:x-1,y:-36,w:10,d:12,r:1},154,5,'hi');
  }
  const board={x:-142,y:-35,w:284,d:5,r:2};
  slab('backboard',board,10,135,'lo',L(k.sideSeam(board,24,P,5),{tone:'faint'})+L([-72,-5,62].map(x=>k.segment([x,-30,10],[x,-30,145],P)).join(''),{tone:'faint'}));
  const crown={x:-150,y:-30,w:300,d:10,r:2};
  slab('crown',crown,145,9,'mid',L(k.sideSeam(crown,149,P,5),{tone:'faint'})+screws(crown,154));
  for(const z of [38,87,132]) {
    const shelf={x:-142,y:-30,w:284,d:12,r:2};
    slab('shelf',shelf,z,4,'mid',screws(shelf,z+4)+L(k.planOutline(k.insetPlan(shelf,3),z+4,P),{tone:'faint'}));
    for(const x of [-141,137]) slab('bracket',{x,y:-25,w:5,d:7,r:1},z-12,12,'mid');
  }
  // Compact header register leaves the room keys as the dominant subject.
  const counters=[[-121,143,'cap'],[-73,143,'final'],[-25,143,'accepted'],[23,143,'over'],[71,143,'conflicts']];
  for(const [x,z,name] of counters) {
    const plan={x,y:-20,w:34,d:3,r:1};
    const window=k.pathOf([[x+3,-(z+2)],[x+31,-(z+2)],[x+31,-(z+8)],[x+3,-(z+8)]],true);
    const inner=`<g transform="${k.sideMatrix([0,-17],0,P,'left')}"><path d="${window}" fill="var(--anatomy-paper)" stroke="var(--anatomy-lo)" stroke-width=".5"/><clipPath id="c22-${name}"><path d="${window}"/></clipPath><text data-counter="${name}" clip-path="url(#c22-${name})" x="${x+17}" y="${-(z+2.7)}" text-anchor="middle" font-size="6.1" font-family="var(--anatomy-mono)" fill="var(--anatomy-hi)"></text></g>`;
    slab('counter.'+name,plan,z,10,'mid',inner);
  }
  // Twenty-one physical hooks; hanging tag weights sum to real inventory.
  // Lower central positions stay clear of the transaction guard mechanism.
  const hooks=[];
  for(const row of [0,1]) for(let col=0;col<12;col++) {
    if(row===1&&[5,6,7].includes(col))continue;
    const x=-133+col*23,top=row===0?120:79,index=hooks.length;
    hooks.push({x,top});
    slab('hook.'+index,{x:x+6,y:-30,w:4,d:21,r:.6},top+4,2,'mid');
    const pieces=[
      [{x:x+6,y:-12,w:4,d:3,r:.6},top,4],
      [{x,y:-12,w:16,d:3,r:2},top-16,16],
      [{x:x+6,y:-12,w:4,d:3,r:.4},top-30,14],
      [{x:x+10,y:-12,w:6,d:3,r:.4},top-30,3],
      [{x:x+10,y:-12,w:4,d:3,r:.4},top-24,3]
    ];
    const face=k.pathOf([[x+2,-(top-2)],[x+14,-(top-2)],[x+14,-(top-14)],[x+2,-(top-14)]],true);
    const engraving=`<g transform="${k.sideMatrix([0,-9],0,P,'left')}"><path d="${face}" fill="var(--anatomy-paper)" stroke="var(--anatomy-lo)" stroke-width=".5"/><clipPath id="c22-tag-${index}"><path d="${face}"/></clipPath><text data-key-weight="${index}" clip-path="url(#c22-tag-${index})" x="${x+8}" y="${-(top-12)}" text-anchor="middle" font-size="7.2" font-family="var(--anatomy-mono)" fill="var(--anatomy-hi)"></text></g>`;
    const drawings=pieces.map(([plan,z,h],i)=>S(k.slabOf(plan,z,h,P,5,.3),{tone:'hi',inner:i===1?engraving:''}));
    count+=pieces.length;
    R.put({name:'room-key.'+index,at:[x+8,-10.5,top-12],piece:'stand.rack',svg:`<g data-rack-key="${index}">${drawings.join('')}</g>`,shapes:pieces.map(([plan,z,h])=>R.solid(A.slab(plan,z,h,{name:'room-key.'+index,owner:'room-key.'+index})))});
  }
  // Paired gate rails physically carry a lock bar and the version-check shutter.
  for(const x of [-18,35]) {
    const shoe={x:x-2,y:-22,w:11,d:18,r:1};
    slab('gate.shoe',shoe,42,5,'mid',screws(shoe,47));
    const detents=[51,70,76].map(z=>k.pathOf([[x+1.5,-6,z],[x+5.5,-6,z],[x+5.5,-6,z+1],[x+1.5,-6,z+1]].map(at),true)).join('');
    slab('gate.guide',{x,y:-20,w:7,d:14,r:1},47,38,'mid',L(detents,{tone:'lo'}));
  }
  slab('gate.bar',{x:-11,y:-13,w:46,d:5,r:1},70,7,'hi','', 'data-lock');
  slab('version',{x:-11,y:-21,w:46,d:6,r:1},77,7,'hi','', 'data-version');
  slab('key.ledge',{x:-11,y:-18,w:46,d:16,r:1},38,4,'mid',screws({x:-11,y:-18,w:46,d:16,r:1},42));
  slab('key.socket',{x:7,y:-10,w:8,d:8,r:1},42,2,'mid');
  // A single key is the room bundle being issued, not a claim of one room.
  const keyWindow=k.pathOf([[4,-60],[18,-60],[18,-72],[4,-72]],true);
  const keyDigits=`<g transform="${k.sideMatrix([0,-4],0,P,'left')}"><path d="${keyWindow}" fill="var(--anatomy-paper)" stroke="var(--anatomy-hi)" stroke-width=".5"/><clipPath id="c22-rooms"><path d="${keyWindow}"/></clipPath><text data-counter="rooms" clip-path="url(#c22-rooms)" x="11" y="-62" text-anchor="middle" font-size="10" font-family="var(--anatomy-mono)" fill="var(--anatomy-hi)"></text></g>`;
  slab('key.bow',{x:-1,y:-7,w:24,d:3,r:2},54,22,'hi',keyDigits,'data-key');
  slab('key.stem',{x:9,y:-7,w:4,d:3,r:.4},44,10,'hi','','data-key');
  slab('key.tooth',{x:13,y:-7,w:7,d:3,r:.4},45,3,'hi','','data-key');
  slab('key.tooth',{x:13,y:-7,w:5,d:3,r:.4},50,3,'hi','','data-key');
  const tray={x:-32,y:6,w:95,d:41,r:2};
  slab('tray.floor',tray,5,3,'mid',L(k.planOutline(k.insetPlan(tray,4),8,P),{tone:'faint'})+screws(tray,8));
  slab('tray.left',{x:-32,y:6,w:3,d:41,r:1},8,6,'mid');
  slab('tray.right',{x:60,y:6,w:3,d:41,r:1},8,6,'mid');
  slab('tray.front',{x:-29,y:44,w:89,d:3,r:1},8,6,'mid');
  // One small key represents one accepted request, with its rooms bundled.
  for(let i=0;i<50;i++) {
    const x=-26+(i%10)*8,y=12+Math.floor(i/10)*6;
    const ring=[[0,0],[3,0],[4,1],[4,2],[6,2],[6,4],[5,4],[5,3],[4,3],[4,5],[3,5],[3,3],[1,3],[0,2]].map(([u,v])=>[x+u,y+v]);
    count++;
    const svg=`<g data-issued="${i}">${S(k.extrude(ring,8,.8,P,{convex:false,bevel:.15}),{tone:'mid',inner:L(k.ring(x+1.8,y+1.4,.6,8.8,P,12),{tone:'lo'})})}</g>`;
    R.put({name:'issued.'+i,at:[x+3,y+2.5,8.4],piece:'stand.rack',svg,shapes:[R.solid(A.extruded(ring,8,.8,{name:'issued.'+i,owner:'issued.'+i}))]});
  }
  const bed={x:106,y:6,w:44,d:37,r:2};
  slab('ticket.bed',bed,5,3,'lo',screws(bed,8));
  for(const x of [106,147]) slab('ticket.stop',{x,y:6,w:3,d:37,r:1},8,4,'mid');
  for(let i=0;i<50;i++) {
    const plan={x:110,y:10,w:34,d:26,r:1},top=8+(i+1)*1.3;
    const rules=[21,15,18].map((w,j)=>k.lineOnTop([114,17+j*4],[114+w,17+j*4],top,P)).join('');
    slab('ticket.'+i,plan,8+i*1.3,1.3,'faint',L(rules,{tone:'lo',free:true})+D([at([113,13,top]),at([114.5,13,top])],{size:.35,tone:'lo'}),`data-ticket="${i}"`);
  }
  const label={x:-133,y:17,w:57,d:24,r:2};
  slab('maker.plate',label,5,.8,'lo',L(k.planOutline(k.insetPlan(label,2),5.8,P),{tone:'faint'})+screws(label,5.8)+L([35,28,32].map((w,j)=>k.lineOnTop([-126,23+j*5],[-126+w,23+j*5],5.8,P)).join(''),{tone:'lo',free:true}));
  // The selector is a single machined stepped knob, seated on the desk.
  const selectorFrame=G.frameAlong([-55,23,0],[0,0,1]);
  const selectorProfile=[[5,9],[7,9],[7,7],[12,7]];
  const detentDots=[-Math.PI/3,0,Math.PI/3].map(a=>at([-55+Math.sin(a)*5.5,23-Math.cos(a)*5.5,12]));
  const selectorDetail=L(k.knurl(-55,23,7,7,12,32,P),{tone:'lo'})+L(k.ring(-55,23,6,12,P,48),{tone:'lo'})+D(detentDots,{size:.55,tone:'mid'})+'<path class="iso-line" data-tone="hi" data-free="" data-selector-needle/>';
  count++;
  R.put({name:'selector.knob',at:[-55,23,8.5],piece:'stand.rack',svg:`<g data-selector>${S(G.solidOf(selectorProfile,selectorFrame,P,{steps:48,bevel:.4}),{tone:'mid',inner:selectorDetail})}</g>`,shapes:[R.solid(A.solid(selectorFrame,selectorProfile,{name:'selector.knob',owner:'selector.knob'}))]});
  const rail={x:-100,y:55,w:198,d:8,r:1};
  const ticks=k.topTicks(-97,95,6,5,55,7,[2,4],P);
  slab('capacity.rail',rail,5,2,'mid',L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'}));
  slab('capacity.rider',{x:-99,y:53,w:5,d:12,r:1},7,4,'hi','','data-rider');
  slab('capacity.limit',{x:31.5,y:65,w:2,d:5,r:.4},5,7,'mid');
  A.settle(R,P);
  R.items.sort((a,b)=>a.key-b.key);
  A.auditOrExit(R,P,{argv});
  const body=halo(base,-16,10)+`<g data-machine>${R.items.map(i=>i.svg).join('')}</g>`;
  return {markup:plate({id:22,body,role:'group',keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'edge',key:'key.2'}],controls:'<div class="iso-controls"><button class="btn" data-mode="optimistic" data-fig-text="fig.c22.btn.optimistic"></button><button class="btn" data-mode="pessimistic" data-fig-text="fig.c22.btn.pessimistic"></button><button class="btn" data-mode="unsafe" data-fig-text="fig.c22.btn.unsafe"></button></div><p class="footnote" data-rack-scale style="text-align:center;margin:0 16px 38px"></p>'}),data:{P,parts:count,hooks}};
}
