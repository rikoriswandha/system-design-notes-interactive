'use strict';
(() => {
  const config=window.SDL_LOCALE_CONFIG;
  if(!config?.languages?.length)throw new Error('Missing locale registry');
  const registry=new Map(config.languages.map(item=>[item.code,item]));
  if(!registry.has(config.defaultLocale))throw new Error('Invalid default locale');
  const catalogs=new Map(),pending=new Map();
  let active=config.defaultLocale,revision=0;
  function metadata(code=active){return registry.get(code)||registry.get(config.defaultLocale)}
  function resolve(code){if(typeof code!=='string')return config.defaultLocale;return registry.has(code)?code:registry.has(code.split('-')[0])?code.split('-')[0]:config.defaultLocale}
  function format(value,options={}){return new Intl.NumberFormat(metadata().intl,{maximumFractionDigits:3,...options}).format(value)}
  function t(key,params={}){
    const base=catalogs.get(config.defaultLocale)||{};
    const localized=catalogs.get(active)||{};
    const category=typeof params.count==='number'?new Intl.PluralRules(metadata().intl).select(params.count):null;
    const variant=category?key+'.'+category:key;
    const translated=localized[variant]||localized[key];
    const template=typeof translated==='string'&&translated.length?translated:typeof base[variant]==='string'?base[variant]:typeof base[key]==='string'?base[key]:`[${key}]`;
    return template.replace(/\{([a-zA-Z][\w]*)\}/g,(match,name)=>Object.hasOwn(params,name)?typeof params[name]==='number'?format(params[name]):String(params[name]):match);
  }
  async function load(code){
    if(catalogs.has(code))return catalogs.get(code);
    if(pending.has(code))return pending.get(code);
    const task=(async()=>{
      const response=await fetch(new URL(metadata(code).file,document.baseURI),{credentials:'same-origin'});
      if(!response.ok)throw new Error(`Locale ${code}: HTTP ${response.status}`);
      const data=await response.json();
      if(!data||Array.isArray(data)||typeof data!=='object'||Object.values(data).some(v=>typeof v!=='string'))throw new Error('Invalid locale catalog '+code);
      catalogs.set(code,Object.freeze(data));return data;
    })();pending.set(code,task);
    try{return await task}finally{pending.delete(code)}
  }
  function applyDocument(){document.documentElement.lang=active;document.documentElement.dir=metadata().dir||'ltr';document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n)});document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>el.setAttribute('placeholder',t(el.dataset.i18nPlaceholder)));document.querySelectorAll('[data-i18n-title]').forEach(el=>el.setAttribute('title',t(el.dataset.i18nTitle)));const description=document.querySelector('meta[name="description"][data-i18n-content]');if(description)description.setAttribute('content',t(description.dataset.i18nContent))}
  function writePreference(){try{localStorage.setItem(config.storageKey,active)}catch{}const url=new URL(location.href);url.searchParams.set('lang',active);history.replaceState(history.state,'',url.pathname+url.search+url.hash)}
  async function setLocale(code,{persist=true,notify=true}={}){
    if(!registry.has(code))throw new Error('Unsupported locale: '+code);
    const request=++revision;await load(config.defaultLocale);await load(code);
    if(request!==revision)return false;
    active=code;applyDocument();if(persist)writePreference();if(notify)window.dispatchEvent(new CustomEvent('languagechange',{detail:{locale:active}}));return true;
  }
  function initialLocale(){const query=new URL(location.href).searchParams.get('lang');if(query)return resolve(query);try{const saved=localStorage.getItem(config.storageKey);if(saved)return resolve(saved)}catch{}return config.defaultLocale}
  const api={t,format,setLocale,applyDocument,resolve,get locale(){return active},get languages(){return config.languages.map(x=>({...x}))},get direction(){return metadata().dir||'ltr'},get dir(){return metadata().dir||'ltr'},get intl(){return metadata().intl},ready:null};
  window.I18n=api;
  api.ready=(async()=>{await load(config.defaultLocale);const requested=initialLocale();try{await setLocale(requested,{persist:false,notify:false})}catch(error){if(requested===config.defaultLocale)throw error;await setLocale(config.defaultLocale,{persist:false,notify:false})}return api})();
})();
