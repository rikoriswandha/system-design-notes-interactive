import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';

// Figure: a slatted inspection conveyor, two sliding reject checks and a window-bin rack.
// Bolted bed and gearmotor, slat inspection lane, a two-detent clock selector,
// guided ID stamp and tolerance shutter, and removable window/reject trays.
export async function build() {
  const base = {x:-145,y:-65,w:290,d:150,r:7};
  const P = k.fitProjection([...k.boxCorners(base,-15,0),[-66,-46,86],[-4,8,86]], WIDTH, HEIGHT,{pad:42,azimuth:38,elevation:38});
  const {S,L,D,at,halo,byDepth} = painter(P);
  const out=[halo(base,-15,9)]; let parts=0;
  function slab(plan,z,h,tone='mid',extra='') {parts++;return S(k.slabOf(plan,z,h,P,5,0.6),{tone,inner:extra});}
  const screw=(x,y,z)=>L(k.ring(x,y,1.25,z,P,20),{tone:'lo'})+D([at([x,y,z])],{size:.42});
  const slot=(x,y,z,w,d)=>L(k.planOutline({x,y,w,d,r:Math.min(w,d)/2},z,P,5),{tone:'faint'});
  const faceSlot=(x,y,z,w,h)=>L(k.pathOf(k.roundedPlan({x:y,y:z,w,d:h,r:Math.min(w,h)/2},5).map(([u,v])=>at([x,u,v])),true),{tone:'faint'});
  for(const [x,y] of byDepth(k.corners(base,7))){out.push(slab({x:x-6,y:y-6,w:12,d:12,r:2},-15,3,'lo'),slab({x:x-4,y:y-4,w:8,d:8,r:1},-12,3,'lo'));}
  out.push(slab(base,-9,9,'lo',L(k.sideSeam(base,-4.5,P,5),{tone:'faint'})),L(k.planOutline(k.insetPlan(base,4),0,P),{tone:'faint'}));
  for(const [x,y] of k.corners(base,9)) out.push(L(k.planOutline({x:x-2,y:y-2,w:4,d:4,r:1},0,P),{tone:'lo'}),D([at([x,y,0])],{size:.5}));
  const nameplate={x:-133,y:72,w:44,d:8,r:1};
  out.push(slab(nameplate,0,.8,'lo'),L(k.planOutline(k.insetPlan(nameplate,1),.8,P),{tone:'faint'}));
  for(let i=0;i<3;i++)out.push(L(k.lineOnTop([-128,74+i*1.6],[-103-i*5,74+i*1.6],.8,P),{tone:'lo',free:true}));
  out.push(screw(-130,76,.8),screw(-92,76,.8));
  // Enclosed gearmotor: seam, a bolted inspection lid, cooling slots and mounting ears.
  const motor={x:-129,y:-63,w:40,d:15,r:2};
  for(const x of [-127,-98])out.push(slab({x,y:-63,w:7,d:15,r:1},0,3,'lo'));
  out.push(slab(motor,3,17,'mid',L(k.sideSeam(motor,7,P,5),{tone:'faint'})));
  out.push(slab({x:-127,y:-61,w:36,d:11,r:1},20,1,'mid'));
  for(const x of [-124,-94])for(const y of [-59,-52])out.push(screw(x,y,21));
  for(let i=0;i<6;i++)out.push(slot(-119+i*4,-58,21,1.5,5));
  out.push(slab({x:-125,y:-48,w:8,d:5,r:1},7,7),slab({x:-123,y:-43,w:4,d:4,r:.5},9,3));
  // A two-detent clock selector is on the clear front edge, where both choices stay visible.
  const selector={x:-83,y:76,w:48,d:8,r:1.5},selectorArt=[];
  selectorArt.push(slab(selector,0,10.5,'mid',L(k.sideSeam(selector,4,P,5),{tone:'faint'})),L(k.planOutline(k.insetPlan(selector,1),10.5,P),{tone:'lo'}));
  for(const x of [-80,-38])for(const y of [78,82])selectorArt.push(screw(x,y,10.5));
  selectorArt.push(slot(-76,78,10.5,32,4));
  for(const x of [-72,-51])selectorArt.push(L(k.ring(x,80,1.5,10.5,P,24),{tone:'lo'}));
  selectorArt.push(`<g data-part="clock">${slab({x:-76,y:78.5,w:8,d:3,r:.6},10.5,4,'hi')}${L(k.planOutline({x:-74.5,y:79,w:5,d:2,r:.5},14.5,P),{tone:'faint'})}</g>`);
  // Clock hands are instrument pointers, not floating labels.
  for(const x of [-72,-51])selectorArt.push(L(k.lineOnTop([x,80],[x,78.8],10.5,P)+k.lineOnTop([x,80],[x+1.1,80],10.5,P),{tone:'lo',free:true}));
  const bed={x:-134,y:-46,w:194,d:56,r:3};
  out.push(slab(bed,0,12,'mid',L(k.sideSeam(bed,5,P,5),{tone:'faint'})),slab({x:-128,y:-40,w:188,d:44,r:2},12,3,'lo'));
  for(let i=0;i<17;i++){
    const x=-126+i*11,slat={x,y:-38,w:9.5,d:40,r:1};
    out.push(slab(slat,15,1.5,'lo'),slot(x+2,-33,16.5,5.5,30));
    out.push(screw(x+4.75,-35,16.5),screw(x+4.75,-1,16.5));
  }
  for(const y of [-46,8]) {
    // The near rail has two real reject ports, so a rejected card never crosses a solid rail.
    for(const [x,w] of (y===8?[[-134,46],[-68,44],[-4,64]]:[[-134,194]])){
      const rail={x,y,w,d:3,r:1};
      out.push(slab(rail,12,10,'mid',L(k.sideSeam(rail,17,P,5),{tone:'faint'})));
      for(let sx=x+5;sx<x+w-3;sx+=11)out.push(screw(sx,y+1.5,22));
    }
    for(const x of [-130,50]){
      const bearing={x,y:y-1,w:9,d:5,r:1};
      out.push(slab(bearing,0,12),slab({x:x+1,y,w:7,d:3,r:.6},22,1,'hi'),screw(x+4.5,y+1.5,23));
    }
  }
  const lip={x:60,y:-40,w:15,d:44,r:1};
  out.push(slab({x:66,y:-37,w:6,d:38,r:1},0,12,'lo'),slab(lip,12,4.5,'mid'));
  for(const y of [-35,-1])out.push(screw(67.5,y,16.5));
  for(let i=0;i<3;i++)out.push(slot(63+i*3,-31,16.5,1,26));
  const strip={x:-128,y:12,w:179,d:6,r:1};out.push(slab(strip,0,1,'lo'));
  const ticks=k.topTicks(-124,47,5,6,12.3,1,[2,4.5],P);out.push(L(ticks.minor,{tone:'lo'}),L(ticks.major,{tone:'mid'}));
  // The headers and posts are behind the moving shutters; their guides remain visible.
  for(const x of [-66,-4]) {
    for(const y of [-46,8]){
      out.push(slab({x:x-5,y:y-2,w:10,d:7,r:1},22,2),screw(x-3,y+1.5,24),screw(x+3,y+1.5,24));
      out.push(slab({x:x-2,y:y,w:4,d:3,r:.5},24,47));
      out.push(slab({x:x-3,y:y-.5,w:6,d:4,r:.6},71,2,'hi'),screw(x,y+1.5,73));
    }
    const beam={x:x-5,y:-46,w:10,d:57,r:1};
    out.push(slab(beam,73,5,'mid',L(k.sideSeam(beam,75,P,5),{tone:'faint'})),L(k.planOutline(k.insetPlan(beam,2),78,P),{tone:'faint'}));
    for(const y of [-42,6])out.push(screw(x,y,78));
    out.push(slab({x:x-4,y:-23,w:8,d:13,r:1},78,5),screw(x,-16.5,83));
  }
  const stampFace=faceSlot(-64,-39,42,43,9)+D(k.pointsAt([[-64,-30,46],[-64,-23,46],[-64,-16,46],[-64,-9,46]],P),{size:.5,tone:'lo'});
  out.push(`<g data-part="stamp">${slab({x:-68,y:-43,w:4,d:51,r:1},39,15,'mid',stampFace)}${slab({x:-70,y:-43,w:8,d:5,r:1},40,11,'mid')}${slab({x:-70,y:3,w:8,d:5,r:1},40,11,'mid')}</g>`);
  const gateFace=faceSlot(-2,-39,28,43,18)+faceSlot(-2,-36,34,37,2);
  parts++;out.push(`<g data-part="gate">${S(k.slabOf({x:-6,y:-43,w:4,d:51,r:1},16.5,34.5,P,5,.6),{tone:'hi',lit:true,inner:gateFace})}${slab({x:-8,y:-43,w:8,d:5,r:1},25,23,'mid')}${slab({x:-8,y:3,w:8,d:5,r:1},25,23,'mid')}</g>`);
  const bins=[[75,-46],[75,-4],[75,38],[-100,39],[-35,39]];
  const destinations=[];
  bins.forEach(([x,y],b)=>{
    const tray={x,y,w:46,d:32,r:2};
    out.push(slab(tray,0,3,'lo',L(k.sideSeam(tray,1.5,P,5),{tone:'faint'})),L(k.planOutline(k.insetPlan(tray,4),3,P),{tone:'faint'}));
    for(let i=0;i<4;i++)out.push(slot(x+7+i*9,y+5,3,1.5,20));
    for(const dx of [4,42])for(const dy of [4,28])out.push(screw(x+dx,y+dy,3));
    out.push(slab({x,y,w:46,d:2,r:.5},3,12));
    out.push(slab({x,y:y+2,w:2,d:28,r:.5},3,12));
    destinations.push(Array.from({length:8},(_,i)=>[x+8+(i%4)*9,y+8+Math.floor(i/4)*11,3]));
    const side={x:x+44,y:y+2,w:2,d:28,r:.5},front={x:x+2,y:y+30,w:42,d:2,r:.5};
    out.push(slab(side,3,12,'mid',L(k.sideSeam(side,10,P,5),{tone:'faint'})));
    out.push(slab(front,3,6,'mid',L(k.sideSeam(front,6,P,5),{tone:'faint'})));
    for(const dx of [7,38])out.push(screw(x+dx,y+31,9));
    // A removable tray's pull, on two mounting ears, not a floating handle.
    for(const dx of [13,31])out.push(slab({x:x+dx,y:y+32,w:2,d:2,r:.5},5,3,'hi'));
    out.push(slab({x:x+13,y:y+34,w:20,d:2,r:.6},5,3,'hi'));
    const [sx,sy]=at([x+23,y+20,3.1]);
    out.push(`<text data-bin="${b}" x="${sx}" y="${sy}" text-anchor="middle" font-family="var(--anatomy-mono)" font-size="9" fill="var(--anatomy-hi)"></text>`);
  });
  out.push(selectorArt.join(''));
  const token=slab({x:-4,y:-4,w:8,d:8,r:1},0,3,'hi')+L(k.planOutline({x:-2.8,y:-2.8,w:5.6,d:5.6,r:.6},3,P),{tone:'faint'});
  out.push('<defs><clipPath id="c21-event-visibility"><path data-event-mask clip-rule="evenodd" d="M0 0H600V380H0Z"/></clipPath></defs><g clip-path="url(#c21-event-visibility)">');
  for(let i=0;i<8;i++)out.push(`<g data-token="${i}" opacity="0">${token}<g transform="${k.topMatrix([0,0],3.1,P)}"><text data-token-id text-anchor="middle" y="1" font-size="3" font-family="var(--anatomy-mono)" fill="var(--anatomy-hi)"></text></g></g>`);
  out.push('</g>');
  return {markup:plate({id:21,body:out,role:'group',keys:[{mark:'lit',key:'key.0'},{mark:'raised',key:'key.1'},{mark:'dim',key:'key.2'},{mark:'edge',key:'key.3'}]}),data:{P,destinations,parts:parts+7}};
}
