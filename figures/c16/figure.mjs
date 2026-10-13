import { k, painter, plate, WIDTH, HEIGHT } from '../lib.mjs';
import * as A from '../kit/audit.mjs';

// Figure: a surveying table. The square is the lab's padded coverage,
// the compass is its radius, and the front sliding shutter is the cache.
// Base shoes, leveling feet, flanged rim screws and identification plate;
// a fitted cell deck in four clamping rails with twelve clamp pads;
// graduated beam compass with a carriage, a scribing pin and a locking wheel;
// cell-cache shutter with a graduated guide and three comparison gauges.
export async function build({ audit, argv }) {
  const base = { x:-120,y:-100,w:240,d:218,r:7 };
  const armOffset=9,armMargin=armOffset+6,carriageRest=41.5+armOffset;
  const P = k.fitProjection([
    ...k.boxCorners(base,-18,0),
    ...k.boxCorners({x:-94,y:-94,w:188,d:188,r:1},0,12),
    [0,0,59],
    ...[-Math.PI/2+0.1,0,Math.PI/2-0.1].flatMap(bearing=>
      k.circleRing((82+armOffset)*Math.sin(bearing),(82+armOffset)*Math.cos(bearing),6,24)
        .flatMap(([x,y])=>[[x,y,51],[x,y,64]])
    )
  ],WIDTH,HEIGHT,{pad:44,azimuth:44,elevation:38});
  const {S,L,D,at,halo} = painter(P);
  const R=A.recorder(P,{ground:shape=>shape.name==='stand.bed'});
  let count=0;
  const slab=(name,p,z,h,tone='mid',extra='')=>{
    const svg=S(k.slabOf(p,z,h,P,4,0.5),{tone,inner:extra});
    R.put({name,at:[p.x+p.w/2,p.y+p.d/2,z+h/2],piece:'stand',svg,shapes:[R.solid(A.slab(p,z,h,{name:'stand.'+name,owner:'stand'}))]});count++;
  };
  const screw=(x,y,z)=>L(k.ring(x,y,1.3,z,P,20),{tone:'lo'})+D([at([x,y,z])],{size:0.55,tone:'mid'});
  const round=(name,x,y,r,z,h,tone='mid',detail='')=>{
    const svg=S(k.cylinder(x,y,r,z,h,P,40,0.4),{tone,inner:detail});
    R.put({name,at:[x,y,z+h/2],piece:'stand',svg,shapes:[R.solid(A.cylinder(x,y,r,z,h,{name:'stand.'+name,owner:'stand'}))]});count++;
  };
  for(const [x,y] of k.corners(base,8)){
    slab('shoe'+count,{x:x-8,y:y-8,w:16,d:16,r:2},-18,3,'lo');
    slab('foot'+count,{x:x-6,y:y-6,w:12,d:12,r:1},-15,5,'lo');
  }
  slab('bed',base,-10,10,'lo',
    L(k.sideSeam(base,-5,P,4),{tone:'faint'})+
    L(k.planOutline(k.insetPlan(base,4),0,P,4),{tone:'lo'})+
    k.corners(base,10).map(([x,y])=>screw(x,y,0)).join('')
  );
  const label={x:-116,y:63,w:15,d:25,r:1};
  slab('identification',label,0,0.7,'lo',
    L(k.planOutline(k.insetPlan(label,1.8),0.7,P,4),{tone:'faint'})+
    [0,1,2].map(i=>L(k.lineOnTop([-112,68+i*5],[-104,68+i*5],0.7,P),{tone:'lo',free:true})).join('')+
    D([at([-108.5,66,0.7]),at([-108.5,84,0.7])],{size:0.45})
  );
  slab('coverage',{x:-83,y:-83,w:166,d:166,r:1},0,12,'hi');
  for(const p of [{x:-92,y:-92,w:184,d:7,r:1},{x:-92,y:85,w:184,d:7,r:1},{x:-92,y:-85,w:7,d:170,r:1},{x:85,y:-85,w:7,d:170,r:1}])slab('rail'+count,p,0,7);
  for(const y of [-89,89])for(const x of [-64,-24,24,64])slab('clamp'+count,{x:x-5,y:y-5,w:10,d:10,r:1},7,3,'mid',screw(x,y,10));
  for(const x of [-89,89])for(const y of [-44,44])slab('clamp'+count,{x:x-5,y:y-5,w:10,d:10,r:1},7,3,'mid',screw(x,y,10));
  for(const [x,y]of [[-89,-89],[89,-89],[-89,89],[89,89]]){
    slab('stop'+count,{x:x-4,y:y-4,w:8,d:8,r:1},7,3,'mid');
    round('levelingWheel'+count,x,y,3.8,10,4,'mid',
      L(k.knurl(x,y,3.8,10,14,24,P),{tone:'lo'})+screw(x,y,14)
    );
  }
  // A narrow centre needle preserves clearance even at the smallest model radius.
  round('pivotFoot',0,0,1.2,12,2,'mid');
  round('pivotStem',0,0,0.7,14,29,'mid');
  round('pivotBearing',0,0,1.2,43,4,'hi');
  const armPlan={x:-3,y:0,w:6,d:41.5+armMargin,r:1};
  const arm=k.slabOf(armPlan,47,4,P,4,0.4);
  const armSvg=`<g class="iso-solid" data-arm>
    <path class="iso-fill" d="${arm.fill}"/>
    ${arm.shades.map((d,i)=>`<path class="iso-shade" data-shade="${i}" d="${d}"/>`).join('')}
    <path class="iso-top" d="${arm.top}"/>
    <path class="iso-line iso-crease" data-tone="faint" d="${arm.crease}"/>
    <path class="iso-line iso-bevel" data-tone="faint" d="${arm.bevel}"/>
    <path class="iso-line iso-edge" data-tone="mid" d="${arm.outline}"/>
    <path class="iso-line" data-arm-ticks data-tone="lo" d=""/>
  </g>`;
  R.put({name:'radiusArm',at:[0,20,49],piece:'stand',svg:armSvg,shapes:[R.solid(A.slab(armPlan,47,4,{name:'stand.radiusArm',owner:'stand'}))]});count++;
  round('pivotNeck',0,0,3,51,3,'mid');
  round('pivotCrown',0,0,5,54,5,'mid',
    L(k.knurl(0,0,5,54,59,32,P),{tone:'lo'})+screw(0,0,59)
  );
  slab('cachePlinth',{x:-105,y:95,w:80,d:17,r:2},0,6,'mid',
    L(k.sideSeam({x:-105,y:95,w:80,d:17,r:2},3,P,4),{tone:'faint'})+
    screw(-101,98,6)+screw(-29,98,6)
  );
  for(const y of [97,108])slab('cacheGuide'+count,{x:-101,y,w:72,d:2,r:0},6,2);
  for(const x of [-104,-29])slab('cacheStop'+count,{x,y:96,w:3,d:15,r:0.5},6,6,'mid',screw(x+1.5,103,12));
  const cacheScale={x:-100,y:95.5,w:70,d:1.5,r:0};
  slab('cacheScale',cacheScale,6,0.5,'lo');
  const cacheTicks=k.topTicks(-99,-31,2,5,95.5,6.5,[0.7,1.3],P);
  R.items.find(i=>i.name==='cacheScale').svg+=L(cacheTicks.minor,{tone:'lo'})+L(cacheTicks.major,{tone:'mid'});
  for(let i=0;i<3;i++){
    const p={x:5+i*34,y:96,w:27,d:14,r:1};
    const scale=k.topTicks(p.x+3,p.x+24,1,5,p.y+2,3,[1,2],P);
    slab('meter'+i,p,0,3,'lo',
      L(k.planOutline(k.insetPlan(p,2),3,P,4),{tone:'faint'})+
      L(scale.minor,{tone:'lo'})+L(scale.major,{tone:'mid'})+
      D([at([p.x+1,p.y+7,3]),at([p.x+26,p.y+7,3])],{size:0.45})
    );
  }
  const dials=[
    {name:'precision',x:-108,y:-46,r:8,z:8},
    {name:'density',x:107,y:14,r:8,z:8},
    {name:'throughput',x:107,y:58,r:8,z:8}
  ];
  for(const dial of dials){
    const {name,x,y,r,z}=dial;
    round(name+'Foot',x,y,r+2,0,2,'lo');
    round(name+'Stand',x,y,r-1,2,z-2,'mid');
    const tick=k.radialTicks(x,y,r-1.3,40,5,z+5,[0.7,1.6],P);
    round(name+'Gauge',x,y,r,z,5,'hi',
      L(k.sideArc(x,y,r,z+2,P,32),{tone:'faint'})+
      L(k.ring(x,y,r-1.3,z+5,P,48),{tone:'lo'})+
      L(tick.minor,{tone:'lo'})+L(tick.major,{tone:'mid'})+
      L(k.ring(x,y,1,z+5,P,16),{tone:'mid'})
    );
    R.items.find(i=>i.name===name+'Gauge').svg+=
      `<path data-dial="${name}" class="iso-line" data-tone="hi" data-free="end" d="${k.lineOnTop([x,y],[x,y-r+2],z+5.2,P)}"/>`;
  }
  const moving=(name,attribute,parts,detail='',turned=[])=>{
    const svg=`<g ${attribute}>${parts.map(([p,z,h,tone])=>S(k.slabOf(p,z,h,P,4,0.4),{tone})).join('')}${turned.map(([x,y,r,z,h])=>S(k.cylinder(x,y,r,z,h,P,40,0.4),{tone:'mid'})).join('')}${detail}</g>`;
    const shapes=parts.map(([p,z,h])=>R.solid(A.slab(p,z,h,{name:'stand.'+name,owner:'stand'})));
    for(const [x,y,r,z,h]of turned)shapes.push(R.solid(A.cylinder(x,y,r,z,h,{name:'stand.'+name,owner:'stand'})));
    const atRest=parts.length?[parts[0][0].x,parts[0][0].y,parts[0][1]]:[turned[0][0],turned[0][1],turned[0][3]];
    R.put({name,at:atRest,piece:'stand',svg,shapes});
    count+=parts.length+turned.length;
  };
  moving('stylus','data-stylus',[[{x:-1,y:40.5,w:2,d:2,r:0},12,35,'mid']]);
  moving('slider','data-slider',[],
    L(k.knurl(0,carriageRest,5,59,64,36,P),{tone:'lo'})+
    L(k.ring(0,carriageRest,3.6,64,P,32),{tone:'faint'})+screw(0,carriageRest,64),
    [[0,carriageRest,6,51,4],[0,carriageRest,2,55,4],[0,carriageRest,5,59,5]]
  );
  moving('gate','data-gate',[
    [{x:-100,y:99,w:17,d:9,r:1},8,5,'hi'],
    [{x:-95,y:101,w:7,d:5,r:0.6},13,2,'mid']
  ],screw(-91.5,103.5,15));
  for(let i=0;i<3;i++)moving('rider'+i,`data-meter="${i}"`,[[{x:7+i*34,y:98,w:3,d:10,r:0.4},3,2,'hi']]);
  A.settle(R,P);
  const compassOrder={
    back:['stylus','pivotFoot','pivotStem','pivotBearing','radiusArm','slider','pivotNeck','pivotCrown'],
    front:['pivotFoot','pivotStem','pivotBearing','stylus','radiusArm','pivotNeck','pivotCrown','slider']
  };
  const compassNames=new Set(compassOrder.front);
  const orderAt=(items,bearing)=>{
    const back=k.depthOf([Math.sin(bearing),Math.cos(bearing),0],P)<k.depthOf([0,0,0],P);
    const ordered=items.filter(item=>!compassNames.has(item.name)).sort((a,b)=>a.key-b.key);
    for(const name of compassOrder[back?'back':'front'])ordered.push(items.find(item=>item.name===name));
    ordered.forEach((item,index)=>item.key=index);
  };
  orderAt(R.items,0);
  if(audit){
    A.auditOrExit(R,P,{argv});
    // Audit the same depth-side reorder used by the live SVG, never an
    // independently settled painter order for a convenient screenshot.
    const changing=new Set(['radiusArm','stylus','slider']);
    const fixedPairs=R.settled.overlaps.pairs.filter(pair=>
      !changing.has(R.items[pair.a].name)&&!changing.has(R.items[pair.b].name)
    );
    for(const radius of [166*0.1/(3*2),41.5,166*5/(102*0.1)]){
      for(const bearing of [-Math.PI/2+0.1,0,Math.PI/2-0.1]){
        const sin=Math.sin(bearing),cos=Math.cos(bearing);
        const rotate=([x,y])=>[x*cos+y*sin,-x*sin+y*cos];
        const ring=k.roundedPlan({x:-3,y:0,w:6,d:radius+armMargin,r:1},4).map(rotate);
        const pose=A.recorder(P,{ground:R.ground});
        for(const item of R.items){
          let svg=item.svg,shapes=item.shapes.map(shape=>({...shape}));
          if(item.name==='radiusArm'){
            svg=S(k.extrude(ring,47,4,P,{bevel:0.4}),{tone:'mid'});
            shapes=[A.extruded(ring,47,4,{name:'stand.radiusArm',owner:'stand'})];
          }
          if(item.name==='stylus'){
            const x=radius*sin,y=radius*cos;
            svg=`<g transform="${k.translateAlong(P,[x,y-41.5,0])}">${item.svg}</g>`;
            shapes=[A.slab({x:x-1,y:y-1,w:2,d:2,r:0},12,35,{name:'stand.stylus',owner:'stand'})];
          }
          if(item.name==='slider'){
            const x=(radius+armOffset)*sin,y=(radius+armOffset)*cos;
            svg=`<g transform="${k.translateAlong(P,[x,y-carriageRest,0])}">${item.svg}</g>`;
            shapes=[[6,51,4],[2,55,4],[5,59,5]].map(([r,z,h])=>A.cylinder(x,y,r,z,h,{name:'stand.slider',owner:'stand'}));
          }
          pose.put({...item,svg,shapes:shapes.map(shape=>pose.solid(shape))});
        }
        orderAt(pose.items,bearing);
        // Exact unchanged pairs reuse the baseline evidence at the same camera.
        // Every pair involving a moved/rebuilt body is ray-cast afresh.
        const overlaps=A.overlapsOf(pose.items,P,{
          states:[0],skip:(a,b)=>!changing.has(a.name)&&!changing.has(b.name)
        });
        overlaps.pairs.push(...fixedPairs);
        pose.settled={items:pose.items,overlaps,solved:A.orderKeys(pose.items,overlaps),states:[0]};
        console.log(`compass pose · radius ${radius.toFixed(3)} · bearing ${bearing.toFixed(3)}`);
        A.auditOrExit(pose,P,{argv});
      }
    }
  }
  R.items.sort((a,b)=>a.key-b.key);
  const circle=k.ring(0,0,41.5,12.2,P,128);
  const dynamic=[];
  const deckArt=`<defs><pattern id="c16-grid-pattern" data-grid-pattern patternUnits="userSpaceOnUse" width="41.5" height="41.5"><path data-grid-cell class="iso-line" data-tone="faint" d="M0 0H41.5V41.5H0Z"/><circle data-grid-socket class="iso-line" data-tone="faint" cx="20.75" cy="20.75" r="1.8"/></pattern></defs><g transform="${k.topMatrix([-83,-83],12.1,P)}"><rect data-grid x="0" y="0" width="166" height="166" fill="url(#c16-grid-pattern)"/></g><path data-circle class="iso-line" data-tone="lit" d="${circle}" style="stroke-width:1.2"/>`;
  return {markup:plate({id:16,body:[halo(base,-18,8),...R.items.map(i=>`<g data-item="${i.name}">${i.svg}${i.name==='coverage'?deckArt:''}</g>`),...dynamic],keys:[{mark:'raised',key:'key.0'},{mark:'lit',key:'key.1'},{mark:'edge',key:'key.2'}],stage:{'aria-valuemin':0.1,'aria-valuemax':5}}),data:{P,parts:count,dials,compassOrder,armOffset,armMargin,carriageRest}};
}
