import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';
import * as G from '../kit/lathe.mjs';
import * as T from '../kit/tube.mjs';

// Figure: plotting table, percentage sample, and three fanout meters.
// Scope and relay rack: every plate, socket, connector and cable has a real mount.
// Dots are a percentage sample, not invented friend coordinates.
export async function build({ argv }) {
  const base = { x: -130, y: -74, w: 260, d: 148, r: 8 };
  const rack = { x:24,y:-56,w:90,d:75,r:4 };
  const P = k.fitProjection([...k.boxCorners(base,-25,0),...k.boxCorners(rack,0,82)], WIDTH, HEIGHT, {pad:41,azimuth:43,elevation:44});
  const { S, L, D, halo } = painter(P);
  const R = A.recorder(P);
  let count = 0;
  function slab(name, plan, z, h, tone = 'mid', inner = '') {
    count++;
    R.put({ name, piece: 'table', at: [plan.x+plan.w/2,plan.y+plan.d/2,z+h/2], svg: S(k.slabOf(plan,z,h,P,6,0.5),{tone,inner}), shapes:[R.solid(A.slab(plan,z,h,{name,ground:name==='stand.deck'},6))] });
  }
  function cyl(name,x,y,r,z,h,tone='mid',inner='') {
    count++;
    R.put({name,piece:'table',at:[x,y,z+h/2],svg:S(k.cylinder(x,y,r,z,h,P,48,0.5),{tone,inner}),shapes:[R.solid(A.cylinder(x,y,r,z,h,{name}))]});
  }
  function turned(name,F,s0,s1,r,tone='mid',inner='') {
    count++;
    R.put({name,piece:'table',at:G.pointOf(F,(s0+s1)/2,0,0),svg:S(G.disc(s0,s1,r,F,P),{tone,inner}),shapes:[R.solid(A.disc(F,s0,s1,r,{name}))]});
  }
  function screwRings(points,z,r=1.4) {
    return L(points.map(([x,y])=>k.ring(x,y,r,z,P,24)).join(''),{tone:'lo'})+D(k.pointsAt(points.map(([x,y])=>[x,y,z]),P),{size:0.45});
  }
  function decor(at,svg) { R.items[R.items.length-1].svg += svg; }
  for (const [i,[x,y]] of k.corners(base,12).entries()) {
    cyl(`stand.foot${i}`,x,y,7,-25,3,'lo');
    cyl(`foot.pad${i}`,x,y,5.5,-22,12,'lo',L(k.sideArc(x,y,5.5,-18,P,32),{tone:'faint'}));
  }
  slab('stand.deck',base,-10,10,'lo',L(k.sideSeam(base,-4,P,6),{tone:'faint'}));
  decor([0,0,0],L(k.planOutline(k.insetPlan(base,5),0,P),{tone:'faint'})+screwRings(k.corners(base,9),0,1.6));
  const cx=-52,cy=0,top=28;
  cyl('radar.pedestal',cx,cy,52,0,18,'mid',L(k.sideArc(cx,cy,52,7,P,100),{tone:'faint'}));
  cyl('radar.bezel',cx,cy,59,18,8,'hi',L(k.sideArc(cx,cy,59,22,P,60),{tone:'faint'}));
  decor([cx,cy,26],screwRings(Array.from({length:8},(_,i)=>[cx+57*Math.cos(i*Math.PI/4),cy+57*Math.sin(i*Math.PI/4)]),26,0.9));
  cyl('radar.glass',cx,cy,55,26,2,'hi');
  let face=[12,24,36,48,54].map(r=>L(k.ring(cx,cy,r,top,P,120),{tone:r===54?'lo':'faint'})).join('');
  const ticks=k.radialTicks(cx,cy,54,120,10,top,[1.5,3.2],P);
  face+=L(ticks.minor,{tone:'lo'})+L(ticks.major,{tone:'mid'});
  face+=`<g transform="${k.topMatrix([cx,cy],top+0.1,P)}"><clipPath id="c17-radar"><circle r="50"/></clipPath><g clip-path="url(#c17-radar)"><g data-sweep>`;
  face+='<defs><linearGradient id="c17-trail" gradientUnits="userSpaceOnUse" x1="-29.4" y1="-40.5" x2="0" y2="-50"><stop offset="0" stop-color="var(--anatomy-mid)" stop-opacity="0"/><stop offset="0.55" stop-color="var(--anatomy-mid)" stop-opacity="0.08"/><stop offset="1" stop-color="var(--anatomy-mid)" stop-opacity="0.28"/></linearGradient></defs><path fill="url(#c17-trail)" d="M0 0L-29.4 -40.5A50 50 0 0 1 0 -50Z"/></g>';
  for(let i=0;i<100;i++) {
    const a=i*2.39996323,r=10+Math.sqrt((i+0.5)/100)*37;
    face+=`<circle data-blip="${i}" cx="${(Math.cos(a)*r).toFixed(2)}" cy="${(Math.sin(a)*r).toFixed(2)}" r="1.1" fill="var(--anatomy-mid)" opacity="0.15"/>`;
  }
  face+=`<path data-needle class="iso-line" data-tone="lit" data-free="end" d="M0 0L0 -50"/></g><circle r="2.1" fill="var(--anatomy-mid)"/></g>`;
  // Surface decoration is attached to the glass; no separate physical shape.
  R.items.find(x=>x.name==='radar.glass').svg+=face;
  slab('rack.plinth',{x:24,y:-56,w:90,d:75,r:4},0,6);
  for(const x of [24,108]) {
    slab(`rack.rail${x}`,{x,y:-56,w:6,d:75,r:1},6,74);
    if(x===108) {
      const wall=k.sideMatrix([114,0],0,P,'right');
      const side=`<g transform="${wall}"><rect class="iso-line" data-tone="faint" x="-11" y="-75" width="62" height="64" rx="3" fill="none"/><rect class="iso-line" data-tone="lo" x="-5" y="-27" width="49" height="11" rx="1.2" fill="var(--anatomy-paper)"/><clipPath id="c17-shards-window"><rect x="-4" y="-26" width="47" height="9"/></clipPath><text data-shards clip-path="url(#c17-shards-window)" x="-2" y="-20" font-size="5.3" font-family="monospace" fill="var(--anatomy-hi)"></text>${Array.from({length:12},(_,i)=>`<rect class="iso-line" data-tone="lo" x="${-2+i*3.7}" y="-65" width="1.5" height="30" rx="0.75" fill="none"/>`).join('')}${[-6,46].flatMap(x=>[-70,-15].map(y=>`<circle class="iso-line" data-tone="lo" cx="${x}" cy="${y}" r="0.9" fill="none"/><circle fill="var(--anatomy-mid)" cx="${x}" cy="${y}" r="0.28"/>`)).join('')}</g>`;
      decor([114,0,43],side);
    }
  }
  const roof={x:30,y:-56,w:78,d:75,r:2};
  slab('rack.header',roof,78,3,'mid',L(k.sideSeam(roof,79.5,P,6),{tone:'faint'}));
  decor([69,-18,81],screwRings(k.corners(roof,5),81,0.9));
  for(let n=0;n<6;n++) slab(`rack.roofvent${n}`,{x:40+n*10,y:-42,w:5,d:42,r:1},81,0.6,'lo');
  for(let j=0;j<3;j++) {
    const z=8+j*23;
    slab(`meter.${j}`,{x:30,y:-52,w:78,d:67,r:3},z,20,'mid',L(k.sideSeam({x:30,y:-52,w:78,d:67,r:3},z+17,P,6),{tone:'faint'}));
    // A recessed readout on the front, in its own face plane.
    const transform=k.sideMatrix([0,15],0,P,'left');
    const content=`<g transform="${transform}"><rect x="39" y="${-z-16}" width="48" height="11" rx="1" fill="var(--anatomy-paper)" stroke="var(--anatomy-lo)" stroke-width="0.6"/><clipPath id="c17-meter${j}"><rect x="40" y="${-z-15}" width="46" height="9"/></clipPath><g clip-path="url(#c17-meter${j})"><rect data-meter="${j}" x="41" y="${-z-7}" width="44" height="1.4" fill="var(--anatomy-lo)"/><text data-number="${j}" x="42" y="${-z-9}" font-size="5.4" fill="var(--anatomy-hi)" font-family="monospace"></text></g></g>`;
    R.items.find(x=>x.name===`meter.${j}`).svg+=content;
    for(const x of [33,103]) {
      slab(`meter.lug${j}.${x}`,{x,y:15,w:3,d:3,r:0.5},z+3,13);
      decor([x+1.5,18,z+9],D([k.iso([x+1.5,18,z+9],P)],{size:0.45}));
    }
    for(let n=0;n<4;n++) slab(`meter.vent${j}.${n}`,{x:45+n*12,y:-45,w:7,d:27,r:1},z+20,0.5,'lo');
  }
  // Socket panel and patched signal leads live entirely ahead of the scope/rack.
  const patch={x:27,y:44,w:65,d:17,r:2};
  slab('patch.panel',patch,0,3,'mid');
  decor([60,52,3],L(k.planOutline(k.insetPlan(patch,2),3,P),{tone:'faint'})+screwRings(k.corners(patch,3),3,0.8));
  for(let j=0;j<3;j++) {
    const z=22+j*23,dest=36+j*22;
    const source=G.frameAlong([114,12,z],[1,0,0]),sink=G.frameAlong([dest,52,3],[0,0,1]);
    turned(`patch.source${j}`,source,0,2,3,'mid');
    turned(`patch.plug${j}`,source,2,5,2.2,'hi',k.fadedSvg(G.ribsOf(source,2,5,2.2,18,P,{fade:[0.04,0.42],seams:true}),{tone:'lo'}));
    turned(`patch.socket${j}`,sink,0,3,3,'mid');
    turned(`patch.ferrule${j}`,sink,3,6,1.8,'hi',k.fadedSvg(G.ribsOf(sink,3,6,1.8,16,P,{fade:[0.04,0.42],seams:true}),{tone:'lo'}));
    const edge=124,lane=32+j*7;
    const route=G.fillet([[119,12,z],[edge,12,z],[edge,lane,z],[edge,lane,12],[dest,lane,12],[dest,52,12],[dest,52,9]],3,12,{P,tube:0.65});
    const name=`patch.cord${j}`;
    R.route(name,route,0.65,{piece:'table',limp:true});
    for(const [n,chunk] of T.tubePieces(route,0.65,P,{maxLength:8,spacing:1.3}).entries()) {
      R.put({name:`${name}.${n}`,piece:'table',at:chunk.mid,svg:T.tubeSvg(chunk,{tone:'mid'}),shapes:[A.tube(chunk.points,chunk.radii,{name:`${name}.${n}`,owner:name})],route:name,chunk});
    }
  }
  const plaqueFrame=G.frameOf([-72,74,-6],[0,1,0],[1,0,0],[0,0,-1]);
  const plaquePolygon=[[-30,-2.6],[30,-2.6],[30,2.6],[-30,2.6]];
  count++;
  R.put({name:'control.nameplate',piece:'table',at:[-72,74.3,-6],svg:S(G.prismOf(plaqueFrame,plaquePolygon,0,0.6,P),{tone:'lo'}),shapes:[R.solid(A.prism(plaqueFrame,plaquePolygon,0,0.6,{name:'control.nameplate'}))]});
  decor([-72,74.6,-6],`<g transform="${k.sideMatrix([0,74.6],0,P,'left')}"><rect class="iso-line" data-tone="faint" x="-100" y="4" width="56" height="4" rx="0.4" fill="none"/>${[4.8,6,7.2].map((y,i)=>`<path class="iso-line" data-tone="lo" data-free d="M-95 ${y}H${-49-i*9}"/>`).join('')}${[-98,-46].map(x=>`<circle class="iso-line" data-tone="lo" cx="${x}" cy="6" r="0.6" fill="none"/><circle cx="${x}" cy="6" r="0.2" fill="var(--anatomy-mid)"/>`).join('')}</g>`);
  for(const [i,x] of [-104,-76,-48,-20].entries()) {
    slab(`control.plinth${i}`,{x:x-7,y:59,w:14,d:12,r:2},0,2);
    const divisions=k.radialTicks(x,65,5.8,28,4,2,[0.65,1.1],P,-135*Math.PI/180,270*Math.PI/180);
    decor([x,65,2],L(k.ring(x,65,5.8,2,P,48),{tone:'faint'})+L(divisions.minor,{tone:'lo'})+L(divisions.major,{tone:'mid'}));
    cyl(`control.knob${i}`,x,65,4.5,2,5,'mid',L(k.knurl(x,65,4.5,2,7,24,P),{tone:'lo'}));
    decor([x,65,7],`<path data-knob="${i}" class="iso-line" data-tone="hi" data-free="end" d="${k.lineOnTop([x,65],[x,61],7,P)}"/>`+D([k.iso([x,65,7],P)],{size:0.55}));
  }
  for(const name of ['radar.glass','control.knob0']) {
    const item=R.items.find(item=>item.name===name);
    item.svg=`<g data-cadence>${item.svg}</g>`;
  }
  // Painted surface marks are attached to their host's painter slot.
  A.settle(R,P);
  A.auditOrExit(R,P,{argv});
  const body=halo(base,-25,10)+'<g data-machine>'+R.items.sort((a,b)=>a.key-b.key).map(x=>x.svg).join('')+'</g>';
  return { markup:plate({id:17,body,keys:[{mark:'lit',key:'key.0'},{mark:'dotted',key:'key.1'},{mark:'raised',key:'key.2'}],stage:{'aria-valuemin':5,'aria-valuemax':120}}),data:{P,parts:count+3} };
}
