import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';

// A bench embosser: selectable dies set code length; two shutters meter
// client bypass and server cache hits before the database drawer.
export async function build({ argv }) {
  const base = { x: -150, y: -76, w: 300, d: 152, r: 7 };
  const P = k.fitProjection([...k.boxCorners(base, -15, 0), [-138, -52, 78], [43, -25, 96]], WIDTH, HEIGHT, { pad: 44, azimuth: 48 });
  const { S, L, D, halo } = painter(P);
  const R = A.recorder(P);
  let count = 0;
  function box(name, x, y, w, d, z, h, tone = 'mid', extra = '', attrs = '') {
    const plan = { x, y, w, d, r: Math.min(1.5, w / 5, d / 5) };
    const inner = h > 8 ? L(k.sideSeam(plan, z + h - 3, P, 4), { tone: 'faint' }) : '';
    const svg = S(k.slabOf(plan, z, h, P, 4, .5), { tone, inner, lit: name === 'capacity.jaw' }) + extra;
    R.put({ name, piece: 'stand', at: [x+w/2,y+d/2,z+h/2], svg: `<g ${attrs}>${svg}</g>`, shapes: [R.solid(A.slab(plan,z,h,{ name, ground: name.startsWith('stand.') },4))] });
    count++;
  }
  function turned(name,F,s0,s1,r,tone='mid',extra='',attrs='') {
    const bored=name.startsWith('die.type.');
    const paths=bored?G.ringBand(s0,s1,2.3,r,F,P,{bevel:.5}):G.disc(s0,s1,r,F,P,{bevel:.5});
    const shape=bored?A.ring(F,s0,s1,2.3,r,{name}):A.disc(F,s0,s1,r,{name});
    const index=bored?Number(name.split('.').at(-1)):null;
    const core=bored?{index,shape:A.disc(F,s0,s1,2.3,{name:`shaft.core.${index}`}),svg:S(G.disc(s0,s1,2.3,F,P),{tone:'mid'})}:null;
    const svg=`<g ${attrs}>${S(paths,{tone})}${extra}</g>`+(core?`<g data-core="${index}" opacity="0">${core.svg}</g>`:'');
    R.put({name,piece:'stand',at:G.pointOf(F,(s0+s1)/2,0,0),svg,core,shapes:[R.solid(shape)]});
    count++;
  }
  function faceMatrix(o,ex,ey) {
    const at=k.iso(o,P),a=k.iso(G.add3(o,ex),P),b=k.iso(G.add3(o,ey),P);
    return `matrix(${a[0]-at[0]} ${a[1]-at[1]} ${b[0]-at[0]} ${b[1]-at[1]} ${at[0]} ${at[1]})`;
  }
  function screws(x,y,w,d,z) {
    const points=k.corners({x,y,w,d,r:1},Math.min(2.5,w/3,d/3));
    return L(points.map(([a,b])=>k.ring(a,b,.85,z,P,12)).join(''),{tone:'lo'})+D(k.pointsAt(points.map(([a,b])=>[a,b,z]),P),{size:.45});
  }
  for (const [x,y] of k.corners(base,20)) box('stand.foot',x-6,y-6,12,12,-15,5,'lo');
  box('stand.base',base.x,base.y,base.w,base.d,-10,10,'lo', L(k.planOutline(k.insetPlan(base,5),0,P),{tone:'faint'})+screws(-148,-74,296,148,0));
  // The nine available sockets are machine hardware, not nine active digits.
  box('die.bed',-132,-57,163,43,0,7,'mid',screws(-132,-57,163,43,7));
  for(let i=0;i<9;i++) {
    const x=-124+i*17;
    box(`die.socket.${i}`,x,-50,14,29,7,7,'lo',screws(x,-50,14,29,14),`data-length-slot="${i}"`);
    const F=G.frameOf([x+1,-35,27],[1,0,0],[0,1,0],[0,0,1]);
    // The visible spindle is gapped under each fitted wheel, not drawn through it.
    if(i<8)turned(`shaft.between.${i}`,F,12,17,2.3,'mid','',`data-spindle="${i}"`);
    const rib=k.fadedSvg(G.ribsOf(F,0,12,13,32,P,{fade:[.08,.5],seams:true}),{tone:'lo'});
    const glyphs=`<g transform="${faceMatrix([x+13.05,-35,27],[0,1,0],[0,0,-1])}"><g data-wheel-face="${i}"><text x="0" y="-6" text-anchor="middle" font-family="monospace" font-size="5" fill="var(--anatomy-mid)">A</text><text x="0" y="10" text-anchor="middle" font-family="monospace" font-size="5" fill="var(--anatomy-mid)">z</text></g></g>`;
    turned(`die.type.${i}`,F,0,12,13,'hi',rib+L(G.circleOf(F,12,10,P)+G.circleOf(F,12,2.3,P),{tone:'lo'})+glyphs,`data-die="${i}"`);
    box(`die.catch.${i}`,x+4,-21,6,5,7,4,'mid');
  }
  const shaftF=G.frameOf([-123,-35,27],[1,0,0],[0,1,0],[0,0,1]);
  turned('shaft.left',shaftF,-13,0,2.3,'mid');
  turned('shaft.right',shaftF,148,163,2.3,'mid');
  box('shaft.bearing.left',-132,-40,6,10,7,17.7,'mid',screws(-132,-40,6,10,24.7));
  box('shaft.bearing.right',32,-40,6,10,5,19.7,'mid',screws(32,-40,6,10,24.7));
  for(const x of [-147,32]) {
    box('press.foot',x,-59,12,45,0,5,'lo',screws(x,-59,12,45,5));
    box('press.post',x+3,-56,6,8,5,65);
    box('press.cap',x,-59,12,14,70,5,'hi');
  }
  box('press.bridge',-138,-56,173,8,62,8,'mid',screws(-138,-56,173,8,70));
  box('press.head',-120,-48,146,6,58,8,'hi');
  // The operating lever is carried by the right post through a flush pivot.
  const leverF=G.frameOf([41,-52,48],[1,0,0],[0,1,0],[0,0,1]);
  turned('lever.pivot',leverF,0,6,5,'hi',L(G.circleOf(leverF,6,3.5,P),{tone:'lo'}));
  const arm=[[-1.5,5],[1.5,5],[27,40],[24,40]];
  const grip=[[23,40],[29,40],[29,47],[23,47]];
  const armRange=[3,6],gripRange=[2,7];
  const rotate=(poly,angle)=>poly.map(([u,v])=>[u*Math.cos(angle)-v*Math.sin(angle),u*Math.sin(angle)+v*Math.cos(angle)]);
  function leverPart(name,poly,s0,s1,tone,angle=0) {
    const polygon=rotate(poly,angle),paths=G.prismOf(leverF,polygon,s0,s1,P);
    const mid=polygon.reduce((v,p)=>[v[0]+p[0]/polygon.length,v[1]+p[1]/polygon.length],[0,0]);
    const dot=`M${k.iso([41+(s0+s1)/2,-52+mid[0],48+mid[1]],P).join(' ')}`;
    paths.shades=paths.shades.map(d=>d||dot);
    paths.crease ||= dot;
    return {name,piece:'stand',at:[41+(s0+s1)/2,-52+mid[0],48+mid[1]],svg:`<g data-lever="${name.split('.')[1]}">${S(paths,{tone})}</g>`,shape:A.prism(leverF,polygon,s0,s1,{name})};
  }
  for(const part of [leverPart('lever.arm',arm,...armRange,'mid'),leverPart('lever.grip',grip,...gripRange,'hi')]) {
    const {shape,...item}=part;R.put({...item,shapes:[R.solid(shape)]});count++;
  }
  turned('lever.pin',leverF,6,7,2,'mid');
  // Frame bolt seats and engraved index strips resolve on real edges.
  for(const x of [-147,32]) {
    box('frame.boltplate',x,-58,12,12,75,.8,'lo',screws(x,-58,12,12,75.8));
  }
  box('frame.index',-120,-56,146,8,70,.8,'lo',L(k.topTicks(-115,21,4,5,-56,70.8,[2,4],P).minor,{tone:'lo'}));
  // Slot gauge: one lit sliding jaw tracks actual capacity utilization.
  box('capacity.strip',-128,63,151,11,0,2,'lo');
  const ticks=k.topTicks(-124,19,5,5,63,2,[2,4],P);
  box('capacity.guide',-128,63,151,2,2,2,'mid',L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'}));
  box('capacity.jaw',-125,65,10,9,2,7,'hi','', 'data-capacity');
  // Continuous tracks are actual chutes, with end gates mounted on them.
  box('bypass.track',47,-57,84,19,0,4,'mid');
  box('bypass.far',47,-57,84,2,4,6,'mid');
  const bypassTicks=k.sideTicks(51,127,4,5,-38,10,[1.5,3],P,'x');
  box('bypass.near',47,-40,84,2,4,6,'mid',L(bypassTicks.minor,{tone:'lo'})+L(bypassTicks.major,{tone:'mid'}));
  box('bypass.stop',127,-55,4,15,4,10,'hi');
  box('bypass.shutter',48,-55,5,15,4,10,'hi','', 'data-bypass');
  box('service.bed',45,-24,86,64,0,6,'mid',screws(45,-24,86,64,6));
  box('cache.track',50,-17,75,20,6,3,'lo');
  box('cache.back',50,-17,75,2,9,8,'mid');
  const cacheTicks=k.sideTicks(54,121,4,5,3,17,[1.5,3],P,'x');
  box('cache.front',50,1,75,2,9,8,'mid',L(cacheTicks.minor,{tone:'lo'})+L(cacheTicks.major,{tone:'mid'}));
  box('cache.shutter',51,-15,5,16,9,8,'hi','', 'data-cache');
  for(const x of [51,118]) {
    box('counter.post',x,16,7,8,6,38,'mid');
    box('counter.cap',x-1,14,9,12,44,3,'hi');
  }
  box('counter.case',59,16,58,8,35,12,'hi',screws(59,16,58,8,47));
  // Meter window on the front face; true database rate appears in its plane.
  const screen = k.sideMatrix([60,24.05],45,P,'left');
  const window = `<g transform="${screen}"><rect x="0" y="0" width="55" height="8" rx="1" fill="var(--anatomy-paper)" stroke="var(--anatomy-lo)" stroke-width=".6"/><clipPath id="c08-meter"><rect x="1" y="1" width="53" height="6"/></clipPath><text data-db x="27.5" y="5.8" text-anchor="middle" font-family="monospace" font-size="5.2" fill="var(--anatomy-hi)" clip-path="url(#c08-meter)"></text></g>`;
  box('database.drawer',54,27,68,10,6,21,'mid',screws(54,27,68,10,27));
  box('database.pull.left',75,37,3,4,16,3,'hi');
  box('database.pull.right',99,37,3,4,16,3,'hi');
  box('database.pull',75,41,27,3,16,3,'hi');
  const labelRules=L([20.5,22,23.5].map(z=>k.segment([61,37.8,z],[68,37.8,z],P)).join(''),{tone:'lo',free:true});
  box('database.label',58,37,13,.8,19,6,'lo',labelRules+D(k.pointsAt([[59.5,37.8,24],[69.5,37.8,20]],P),{size:.4}));
  const lockF=G.frameOf([112,37,18],[0,1,0],[1,0,0],[0,0,1]);
  const lockSlot=k.pathOf([[111.6,38.2,16.7],[112.4,38.2,16.7],[112.4,38.2,19.3],[111.6,38.2,19.3]].map(p=>k.iso(p,P)),true);
  turned('database.lock',lockF,0,1.2,2.5,'hi',L(lockSlot,{tone:'lo'}));
  // Card exits beneath the dies, with mechanically held guide strips.
  box('output.floor',-114,17,141,39,0,3,'lo');
  box('output.left',-114,17,3,39,3,6,'mid');
  box('output.right',24,17,3,39,3,6,'mid');
  const codeText=`<g transform="${k.topMatrix([-46,35],4.05,P,'x')}"><text data-code x="0" y="1.8" text-anchor="middle" font-family="monospace" font-size="8" letter-spacing="2" fill="var(--anatomy-mid)"></text></g>`;
  box('output.card',-104,22,117,27,3,1,'hi',L(k.planOutline({x:-99,y:26,w:107,d:19,r:1},4,P),{tone:'faint'})+codeText, 'data-card');
  for(const x of [-108,19]) box('output.clamp',x,17,4,9,3,7,'mid');
  for(const y of [14,56]) {
    box('output.rail',-116,y,145,3,0,6,'mid',L(k.planOutline({x:-113,y:y+.7,w:139,d:1.6,r:.4},6,P),{tone:'faint'}));
    for(const x of [-110,17]) box('output.bushing',x,y,9,3,6,3,'hi',D(k.pointsAt([[x+2,y+1.5,9],[x+7,y+1.5,9]],P),{size:.45}));
  }
  const labelPlan={x:-135,y:34,w:15,d:26,r:1};
  box('stand.label',-135,34,15,26,0,.8,'lo',L(k.planOutline(k.insetPlan(labelPlan,1.5),.8,P),{tone:'faint'})+L([0,1,2].map(i=>k.lineOnTop([-131,40+i*5],[-124,40+i*5],.8,P)).join(''),{tone:'lo',free:true})+D(k.pointsAt([[-132,37,.8],[-122,57,.8]],P),{size:.45}));
  for(const x of [-143,137])for(const y of [-58,-24,10,44]) {
    if(x === -143 && y < 0) continue;
    box('stand.mount',x,y,4,7,0,.6,'lo',D(k.pointsAt([[x+2,y+3.5,.6]],P),{size:.55}));
  }
  A.settle(R,P);
  // Solve one painter order against both lever choices and the intervening
  // geometry, so the runtime never has to reorder the static machine.
  const poses=[];
  const choices=[...Array.from({length:4},(_,i)=>[9,.23*(i+1)/4]),...Array.from({length:5},(_,i)=>[i+4,0])];
  for(const [length,angle] of choices) {
    const posed=A.recorder(P);
    for(const item of R.items) {
      let replacement=null;
      if(item.core && item.core.index>=length) {
        const {shapes,svg,...rest}=item;
        posed.put({...rest,svg:`<g data-core="${item.core.index}">${item.core.svg}</g>`,shapes:[posed.solid({...item.core.shape})]});
        continue;
      }
      if(item.name==='lever.arm')replacement=leverPart(item.name,arm,...armRange,'mid',angle);
      if(item.name==='lever.grip')replacement=leverPart(item.name,grip,...gripRange,'hi',angle);
      if(replacement){const {shape,...drawn}=replacement;posed.put({...drawn,shapes:[posed.solid(shape)]});}
      else posed.put({...item,shapes:item.shapes.map(shape=>posed.solid({...shape}))});
    }
    A.settle(posed,P);poses.push(posed);
  }
  const common={...R.settled.overlaps,pairs:[...R.settled.overlaps.pairs,...poses.flatMap(pose=>pose.settled.overlaps.pairs)]};
  const solved=A.orderKeys(R.items,common);
  for(const pose of [R,...poses]) {
    pose.items.forEach((item,index)=>{item.key=solved.keys[index];});
    pose.settled.solved=solved;
  }
  A.auditOrExit(R,P,{argv});
  if(argv.includes('--audit')) {
    let problems=0;
    for(const [frame,posed] of poses.entries()) {
      const proof=A.audit(posed,P),failures=A.failures(proof);
      if(failures){console.error(`machine pose ${frame+1}: ${A.report(proof)}`);problems+=failures;}
    }
    console.log(`machine sweep · 10 true-geometry poses · ${problems} problems`);
    if(problems)process.exitCode=1;
  }
  R.items.sort((a,b)=>a.key-b.key);
  const body=halo(base,-15,10)+R.items.map(item=>item.svg).join('')+window;
  return {markup:plate({id:8,body,role:'slider',stage:{'aria-valuemin':4,'aria-valuemax':9,'aria-valuenow':7},keys:[{mark:'raised',key:'key.0'},{mark:'lit',key:'key.1'},{mark:'dim',key:'key.2'}]}),data:{P,parts:count,leverF,arm,grip,armRange,gripRange,jawTravel:138}};
}
