// Minimal deterministic DOM/event harness. This does not perform browser layout QA.
module.exports=function makeDOM(html){
 const elements=new Map(),all=new Set(),tools=[],events=new Map();
 const decode=s=>String(s).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 class Element{
  constructor(tag,attrs={}){this.tagName=tag;this.attrs=attrs;this.dataset={};this.events={};this.children=[];this.value=attrs.value||'';this.className=attrs.class||'';this.style={};this.textContent='';this.hidden=false;this.contentWindow={I18n:{setLocale:async code=>{this.childLocale=code}}};for(const [k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;this.classList={add:c=>{this.className+=' '+c},remove:c=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ')},toggle:(c,on)=>on?this.classList.add(c):this.classList.remove(c)};all.add(this);if(attrs.id)elements.set(attrs.id,this)}
  set innerHTML(html){for(const child of this.children)remove(child);this.children=[];this._html=html;for(const match of html.matchAll(/<([a-z][\w-]*)([^<>]*)>/gi)){const attrs={};for(const a of match[2].matchAll(/([\w-]+)="([^"]*)"/g))attrs[a[1]]=decode(a[2]);const e=new Element(match[1],attrs);this.children.push(e)}}get innerHTML(){return this._html||''}
  setAttribute(k,v){this.attrs[k]=v}addEventListener(k,fn){(this.events[k]??=[]).push(fn)}focus(){this.focused=true}
  async fire(type){const e={target:this,preventDefault(){}};for(const fn of this.events[type]||[])await fn(e);if(typeof this['on'+type]==='function')await this['on'+type](e)}
 }
 function remove(e){for(const c of e.children)remove(c);all.delete(e);if(e.attrs.id&&elements.get(e.attrs.id)===e)elements.delete(e.attrs.id)}
 function select(selector){if(selector.includes(' '))return [];return [...all].filter(e=>{if(selector.startsWith('.'))return e.className.split(' ').includes(selector.slice(1));const tag=selector.match(/^[a-z]+/i);if(tag&&e.tagName!==tag[0])return false;const matches=[...selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];if(!matches.length)return !!tag;return matches.every(m=>e.attrs[m[1]]!==undefined&&(m[2]===undefined||e.attrs[m[1]]===m[2]))})}
 const root=new Element('body');root.innerHTML=html;
 const document={baseURI:'https://example.test/',documentElement:{lang:'id',dir:'ltr'},getElementById:id=>elements.get(id)||null,querySelectorAll:select,querySelector:s=>select(s)[0]||null,modelContext:{registerTool:t=>tools.push(t)}};
 const window={addEventListener(name,fn){const handlers=events.get(name)||[];handlers.push(fn);events.set(name,handlers)},dispatchEvent(event){for(const fn of events.get(event.type)||[])fn(event)},scrollTo(){}};
 window.parent=window;
 return {document,window,elements,tools,events};
};
