import { k, painter, plate, WIDTH, HEIGHT } from "../lib.mjs";
import * as A from "../kit/audit.mjs";
import { EASE, settleRack } from "./geometry-audit.mjs";

// Figure: a three-level service rack. Slots are physical fragment/copy carriers;
// the model selects twelve narrow carriers or three full-width replica drawers.
export async function build({ argv }) {
  const base = { x: -109, y: -58, w: 218, d: 151, r: 5 };
  const P = k.fitProjection([...k.boxCorners(base, -12, 0), ...k.boxCorners({x:-97,y:-46,w:194,d:86,r:3},117,123)], WIDTH, HEIGHT, {pad:42, azimuth:55, elevation:18});
  P.origin[1]+=3;
  const {S,L,D,at,halo,byDepth} = painter(P);
  const assemblies=[];
  let recording=null;
  const slab = (p,z,h,tone="mid",extra={}) => {
    recording.shapes.push(A.slab(p,z,h,{},4));
    return S(k.slabOf(p,z,h,P,4,0.5),{tone,...extra});
  };
  const screws = (p,z,inset=3) => {
    const points=k.corners(p,Math.min(inset,p.w/4,p.d/4));
    return L(points.map(([x,y])=>k.ring(x,y,0.9,z,P,16)).join(""),{tone:"lo"})+D(points.map(([x,y])=>at([x,y,z])),{size:0.45,tone:"mid"});
  };
  const frontOutline = (x,z,w,h,y,r=0.6) => k.pathOf(k.roundedPlan({x,y:z,w,d:h,r},4).map(([u,v])=>at([u,y,v])),true);
  const sideOutline = (y,z,w,h,x,r=0.6) => k.pathOf(k.roundedPlan({x:y,y:z,w,d:h,r},4).map(([u,v])=>at([x,u,v])),true);
  const runner = (x,w,z) => {
    const ring=[[x-1,-33],[x+w+1,-33],[x+w+1,33],[x+w-1,33],[x+w-1,-31],[x+1,-31],[x+1,33],[x-1,33]];
    recording.shapes.push(A.extruded(ring,z,1));
    return S(k.extrude(ring,z,1,P,{convex:false,bevel:0.2}),{tone:"lo"});
  };
  const track = (x,w,z) => {
    const strips=[x-1,x+w-1].map(s=>({x:s,y:-35,w:2,d:73,r:0.5}));
    const ticks=k.topTicks(-30,35,5,5,x+w-1,z,[0.7,1.3],P,"y");
    return L(strips.map(s=>k.planOutline(s,z,P,4)).join(""),{tone:"faint"})+L(ticks.minor,{tone:"faint"})+L(ticks.major,{tone:"lo"});
  };
  const out = [halo(base,-12,6)];
  const start=(name,move=[0,0,0],scheme=null)=>{recording={name,move,scheme,shapes:[],offset:out.length};};
  const finish=()=>{
    const svg=out.splice(recording.offset).join("");
    assemblies.push({...recording,svg});
    out.push(`<g data-item="${recording.name}">${svg}</g>`);
    recording=null;
  };
  start("stand.base");
  for(const [x,y] of byDepth(k.corners(base,15))) {
    out.push(slab({x:x-5,y:y-5,w:10,d:10,r:1.5},-12,4,"lo"));
    out.push(slab({x:x-7,y:y-7,w:14,d:14,r:1.5},-8,1,"lo"));
  }
  out.push(slab(base,-7,7,"lo",{inner:L(k.sideSeam(base,-3.5,P,4),{tone:"faint"})}),L(k.planOutline(k.insetPlan(base,4),0,P),{tone:"faint"}),screws(base,0));
  finish();
  start("stand.back");
  // Rear corner uprights and the rear panel carry the shelves without enclosing
  // the mechanism in an opaque box. Closed slot outlines are ventilation holes.
  out.push(slab({x:-91,y:-43,w:182,d:3,r:1},0,112));
  finish();
  for(const x of [-97,91]) {
    start(`stand.rear-post.${x}`);
    out.push(slab({x,y:-46,w:6,d:9,r:1},0,117),screws({x,y:-46,w:6,d:9,r:1},117));
    if(x===91)out.push(L(sideOutline(-44.5,9,4,99,97,0.7),{tone:"faint"}));
    finish();
  }
  start("stand.far-post");
  const farPost={x:-97,y:33,w:6,d:7,r:0.7};
  out.push(slab(farPost,0,117),D([12,45,78,110].map(z=>at([-94,40,z])),{size:0.55,tone:"lo"}));
  out.push(L(frontOutline(-95.5,9,3,99,40,0.7),{tone:"faint"}));
  finish();
  const positions=[];
  for(let row=0;row<3;row++) {
    const z=8+row*33;
    start(`stand.shelf.${row}`);
    out.push(slab({x:-91,y:-40,w:182,d:79,r:1},z,3,"lo"));
    out.push(`<g data-channel-scheme="ec">${Array.from({length:4},(_,i)=>track(-86+i*44,38,z+3)).join("")}</g>`);
    out.push(`<g data-channel-scheme="replica" style="display:none">${track(-86,170,z+3)}</g>`);
    finish();
    const ec=[];
    for(let col=0;col<4;col++) {
      const index=row*4+col,x=-86+col*44;
      start(`ec.${index}`,[0,30,0],"ec");
      positions.push([x+19,37,z+14]);
      ec.push(`<g data-tray="${index}" data-scheme="ec">`);
      ec.push(runner(x,38,z+3));
      const carrier={x,y:-31,w:38,d:64,r:2};
      ec.push(slab(carrier,z+4,18,"hi",{inner:L(k.sideSeam(carrier,z+13,P,4),{tone:"faint"})}));
      ec.push(L(k.planOutline({x:x+3,y:-27,w:32,d:47,r:1.5},z+22,P),{tone:"faint"}));
      // Parity carriers have a double closed inset; eight data + four parity.
      if(index>=8) ec.push(L(k.planOutline({x:x+6,y:-24,w:26,d:41,r:1},z+22,P),{tone:"lo"}));
      ec.push(screws({x:x+1,y:-30,w:36,d:61,r:1},z+22));
      ec.push(slab({x:x-1,y:33,w:40,d:4,r:1},z+4,20,"mid"));
      ec.push(slab({x:x+7,y:37,w:24,d:3,r:1},z+10,6,"hi"));
      ec.push(L(frontOutline(x+2,z+6,34,16,37,1),{tone:"faint"}));
      if(index>=8)ec.push(L(frontOutline(x+4,z+8,30,12,37,0.8),{tone:"lo"}));
      ec.push(L([frontOutline(x+2,z+7,3,3,37),frontOutline(x+33,z+7,3,3,37)].join(""),{tone:"lo"}));
      ec.push(D([at([x+3,37,z+21]),at([x+35,37,z+21])],{size:0.45,tone:"mid"}));
      ec.push(L(Array.from({length:7},(_,i)=>sideOutline(-22+i*6,z+9,2,9,x+38,0.7)).join(""),{tone:"faint"}));
      ec.push(D([at([x+5,37,z+8.5])],{size:0.8,tone:"lo"}));
      // Closed ventilation slots on the carrier cover.
      ec.push(L(Array.from({length:5},(_,i)=>k.planOutline({x:x+6+i*5,y:7,w:2,d:14,r:0.8},z+22,P)).join(""),{tone:"faint"}));
      ec.push(`</g>`);
      out.push(ec.join(""));
      ec.length=0;
      finish();
    }
    start(`replica.${row}`,[0,30,0],"replica");
    out.push(`<g data-tray="${row}" data-scheme="replica" style="display:none">`);
    out.push(runner(-86,170,z+3));
    const copy={x:-86,y:-31,w:170,d:64,r:2};
    out.push(slab(copy,z+4,18,"hi",{inner:L(k.sideSeam(copy,z+13,P,4),{tone:"faint"})}));
    out.push(L(k.planOutline({x:-81,y:-26,w:160,d:49,r:1.5},z+22,P),{tone:"faint"}),screws({x:-85,y:-30,w:168,d:61,r:1},z+22));
    out.push(L(Array.from({length:19},(_,i)=>k.planOutline({x:-73+i*8,y:7,w:3,d:14,r:1},z+22,P)).join(""),{tone:"faint"}));
    out.push(slab({x:-87,y:33,w:172,d:4,r:1},z+4,20,"mid"));
    for(const x of [-64,40]) out.push(slab({x,y:37,w:24,d:3,r:1},z+10,6,"hi"));
    out.push(L(frontOutline(-82,z+6,162,16,37,1),{tone:"faint"}));
    out.push(L([-79,-4,73].map(x=>frontOutline(x,z+9,6,6,37,1)).join(""),{tone:"lo"}));
    out.push(D([-80,-30,28,78].map(x=>at([x,37,z+21])),{size:0.45,tone:"mid"}));
    out.push(L(Array.from({length:7},(_,i)=>sideOutline(-22+i*6,z+9,2,9,84,0.7)).join(""),{tone:"faint"}));
    out.push(`</g>`);
    finish();
  }
  for(const x of [91]) {
    start("stand.near-post");
    const post={x,y:33,w:6,d:7,r:0.7};
    out.push(slab(post,0,117),D([12,45,78,110].map(z=>at([x+3,40,z])),{size:0.55,tone:"lo"}));
    out.push(L(frontOutline(92.5,9,3,99,40,0.7),{tone:"faint"}),L(sideOutline(34.5,9,4,99,97,0.7),{tone:"faint"}));
    finish();
  }
  // Upper console: flush readout windows, screw heads, lid seam, and vents.
  const roof={x:-97,y:-46,w:194,d:86,r:3};
  start("stand.console");
  out.push(slab(roof,117,6,"mid",{inner:L(k.sideSeam(roof,120,P,4),{tone:"faint"})}),screws(roof,123));
  out.push(L(k.planOutline(k.insetPlan(roof,3),123,P),{tone:"faint"}));
  out.push(L(Array.from({length:12},(_,i)=>k.planOutline({x:-78+i*12,y:-37,w:7,d:1.5,r:0.6},123,P)).join(""),{tone:"lo"}));
  out.push(L(Array.from({length:24},(_,i)=>k.planOutline({x:-78+i*6.5,y:22,w:2,d:10,r:0.8},123,P)).join(""),{tone:"faint"}));
  const lcd={x:-79,y:-25,w:105,d:37,r:2}, tol={x:34,y:-25,w:47,d:37,r:2};
  for(const p of [lcd,tol]) out.push(slab(p,123,0.5,"lo"),L(k.planOutline(k.insetPlan(p,2),123.5,P),{tone:"lo"}));
  out.push(`<g transform="${k.topMatrix([lcd.x+7,lcd.y+13],123.6,P)}" fill="var(--anatomy-hi)" font-family="var(--anatomy-mono)" font-size="6"><clipPath id="c24-capacity-clip"><rect x="-3" y="-8" width="97" height="28"/></clipPath><g clip-path="url(#c24-capacity-clip)"><text data-capacity></text><text data-overhead y="10"></text><text data-input x="54" y="10" font-size="4.5"></text></g></g>`);
  out.push(`<g transform="${k.topMatrix([tol.x+6,tol.y+13],123.6,P)}" fill="var(--anatomy-hi)" font-family="var(--anatomy-mono)" font-size="5"><clipPath id="c24-tolerance-clip"><rect x="-2" y="-8" width="40" height="28"/></clipPath><g clip-path="url(#c24-tolerance-clip)"><text data-tolerance></text><text data-survivors y="12"></text></g></g>`);
  const capacityStrip={x:lcd.x+6,y:4,w:90,d:4,r:0.3};
  const capacityTicks=k.topTicks(capacityStrip.x,capacityStrip.x+90,2.5,4,4,123.6,[1.2,2.8],P);
  out.push(L(k.planOutline(capacityStrip,123.6,P),{tone:"lo"}),L(capacityTicks.minor,{tone:"faint"}),L(capacityTicks.major,{tone:"lo"}));
  out.push(`<g data-capacity-marker>${L(k.lineOnTop([capacityStrip.x,4],[capacityStrip.x,8],123.6,P),{tone:"hi"})}</g>`);
  finish();
  // Repair bandwidth is a linear service regulator. Its single lit carriage is
  // scaled by the control, not an invented throughput or recovery simulation.
  const rail={x:-83,y:64,w:154,d:8,r:1};
  start("stand.regulator-rail");
  out.push(slab({x:-92,y:54,w:184,d:28,r:2},0,3,"mid"));
  out.push(slab(rail,3,1,"lo"));
  const ticks=k.topTicks(-79,67,5,5,64,4,[2,4],P);
  out.push(L(ticks.minor,{tone:"lo"}),L(ticks.major,{tone:"mid"}));
  for(const x of [-88,84]) out.push(slab({x,y:60,w:4,d:17,r:0.7},3,5),screws({x,y:60,w:4,d:17,r:0.7},8));
  finish();
  start("regulator",[147,0,0]);
  out.push(`<g data-regulator>${slab({x:-83,y:62,w:7,d:3,r:0.5},4,2,"mid")}${slab({x:-83,y:71,w:7,d:3,r:0.5},4,2,"mid")}${slab({x:-83,y:62,w:7,d:12,r:1},6,4,"hi",{lit:true})}${D([at([-79.5,68,10])],{size:0.6,tone:"hi"})}${L(k.planOutline({x:-81,y:65,w:3,d:6,r:0.6},10,P),{tone:"lo"})}</g>`);
  finish();
  start("stand.label");
  const label={x:-70,y:84,w:96,d:8,r:0.7};
  out.push(slab(label,0,0.5,"lo"),L(k.planOutline(k.insetPlan(label,1.4),0.5,P),{tone:"faint"}));
  out.push(L([64,52,70].map((w,i)=>k.lineOnTop([-65,86+i*2],[-65+w,86+i*2],0.5,P)).join(""),{tone:"lo",free:true}),screws(label,0.5));
  finish();
  const {orders,counts}=settleRack(assemblies,P,argv);
  return {markup:plate({id:24,body:[out[0],`<g data-machine>${out.slice(1).join("")}</g>`],role:"group",keys:[{mark:"raised",key:"key.0"},{mark:"edge",key:"key.1"},{mark:"lit",key:"key.2"}]}),data:{P,positions,orders,EASE,parts:counts}};
}
