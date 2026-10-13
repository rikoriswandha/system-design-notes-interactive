// Checks the generated chapter figures (dist/figures, built by `npm run build:figures`) without a browser:
// every chapter registers a figure, every key its card or live code uses exists in every catalog, and the
// catalogs hold exactly the strings in figures/cNN/strings.json (i.e. the build was re-run after edits).
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),pad=id=>String(id).padStart(2,'0');
const read=p=>fs.readFileSync(path.join(dist,p),'utf8');
const catalogs={id:JSON.parse(read('locales/id.json')),en:JSON.parse(read('locales/en.json'))};
const context={window:{}};vm.createContext(context);
vm.runInContext(read('figures/kit.js'),context,{filename:'figures/kit.js'});
assert(context.window.IsoKit?.k?.iso&&context.window.IsoKit.G&&context.window.IsoKit.tube&&context.window.IsoKit.gl,'Kit runtime incomplete');
let keys=0;
for(let id=1;id<=28;id++){
 const file=`figures/c${pad(id)}.js`;assert(fs.existsSync(path.join(dist,file)),'Missing figure '+file);
 const source=read(file);vm.runInContext(source,context,{filename:file});
 const figure=context.window.COURSE_FIGURES?.[id];
 assert(figure&&typeof figure.markup==='string'&&typeof figure.mount==='function','Figure not registered: '+id);
 assert.match(figure.markup,new RegExp(`^<figure class="iso-figure" data-figure="${id}">`),'Figure markup root '+id);
 const used=new Set([...figure.markup.matchAll(/data-fig-(?:text|aria)="([^"]+)"/g)].map(m=>m[1]));
 // Literal keys only; prefixes completed at runtime ('…options.' + i + '.label') are skipped.
 for(const m of source.matchAll(/\bt\(\s*(["'`])([\w.-]+)\1/g))if(!m[2].endsWith('.'))used.add(/^(fig|c\d\d|ui|legacy)\./.test(m[2])?m[2]:`fig.c${pad(id)}.${m[2]}`);
 for(const key of used)for(const [code,catalog] of Object.entries(catalogs))assert(typeof catalog[key]==='string'&&catalog[key].length,`Figure ${id} uses ${key}, missing in ${code}`);
 const strings=JSON.parse(fs.readFileSync(path.join(root,'figures',`c${pad(id)}`,'strings.json'),'utf8'));
 for(const [code,catalog] of Object.entries(catalogs)){
  const prefix=`fig.c${pad(id)}.`,inCatalog=Object.keys(catalog).filter(k=>k.startsWith(prefix)).sort();
  assert.deepEqual(inCatalog,Object.keys(strings[code]).map(k=>prefix+k).sort(),`Catalog ${code} out of date for figure ${id}: run npm run build:figures`);
  for(const [name,text] of Object.entries(strings[code]))assert.equal(catalog[prefix+name],text,`Catalog ${code} out of date for ${prefix+name}: run npm run build:figures`);
 }
 keys+=used.size;
}
console.log(JSON.stringify({figures:28,figureKeysChecked:keys},null,2));
