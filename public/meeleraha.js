/* Meeleraha ühine käitusaeg: keel, ühine raam (nav, jalus), anonüümne mõõtmine ühe taksonoomia peal.
   Põhimõte: sisestatud numbrid ja tekst ei jõua kunagi siia; sündmus kannab ainult nime, komponendi ja lubatud valikud. */
(function(){
'use strict';
var TAX=window.MR_TAX||null,DICT=window.MR_I18N||{et:{},en:{}};
var MR=window.MR={tax:TAX,log:[],queue:[],rejected:[],config:{contact:'tere@meeleraha.ee',endpoint:'/api/e',debug:false},langHooks:[]};
var META=window.MR_LANGS||[{code:'et',name:'Eesti',status:'official'},{code:'en',name:'English',status:'draft'}];
var LANGS=META.map(function(m){return m.code;});
MR.langs=META;
function el(t,a,h){var e=document.createElement(t);if(a)Object.keys(a).forEach(function(k){e.setAttribute(k,a[k]);});if(h!==undefined)e.innerHTML=h;return e;}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function param(n){try{return new URLSearchParams(location.search).get(n);}catch(e){return null;}}

/* ---------- keel ---------- */
MR.lang=(function(){var q=param('lang');if(LANGS.indexOf(q)>=0)return q;var h=document.documentElement.getAttribute('lang');return LANGS.indexOf(h)>=0?h:'et';})();
MR.t=function(k,vars){var s=DICT[MR.lang]&&DICT[MR.lang][k];if(s===undefined&&DICT.en)s=DICT.en[k];if(s===undefined)s=DICT.et[k];if(s===undefined)return k;if(vars)Object.keys(vars).forEach(function(v){s=s.split('{'+v+'}').join(vars[v]);});return s;};
MR.tn=function(k,n){var cat='other';try{cat=new Intl.PluralRules(MR.lang).select(n);}catch(e){}var key=k+'.'+cat;if((DICT[MR.lang]&&DICT[MR.lang][key]===undefined)||(!DICT[MR.lang]))key=k+'.other';return MR.t(key,{n:n});};
MR.apply=function(root){
  root=root||document;
  Array.prototype.forEach.call(root.querySelectorAll('[data-i18n]'),function(e){e.textContent=MR.t(e.getAttribute('data-i18n'));});
  Array.prototype.forEach.call(root.querySelectorAll('[data-i18n-attr]'),function(e){e.getAttribute('data-i18n-attr').split(';').forEach(function(p){var kv=p.split(':');if(kv.length===2)e.setAttribute(kv[0].trim(),MR.t(kv[1].trim()));});});
  document.documentElement.setAttribute('lang',MR.lang);
};
MR.onLang=function(fn){MR.langHooks.push(fn);};
MR.fixLinks=function(root){
  Array.prototype.forEach.call((root||document).querySelectorAll('a[href]'),function(a){
    var h=a.getAttribute('href');
    if(!h||h.charAt(0)==='#'||/^[a-z][a-z0-9+.-]*:/i.test(h)||h.indexOf('//')===0)return;
    var hash='',i=h.indexOf('#');if(i>=0){hash=h.slice(i);h=h.slice(0,i);}
    var q='',j=h.indexOf('?');if(j>=0){q=h.slice(j+1);h=h.slice(0,j);}
    var params=q?q.split('&').filter(function(x){return x.indexOf('lang=')!==0;}):[];
    if(MR.lang!=='et')params.push('lang='+MR.lang);
    a.setAttribute('href',h+(params.length?'?'+params.join('&'):'')+hash);
  });
};
MR.setLang=function(l){
  if(LANGS.indexOf(l)<0||l===MR.lang)return;
  var from=MR.lang;MR.lang=l;
  try{var u=new URL(location.href);if(l==='et')u.searchParams.delete('lang');else u.searchParams.set('lang',l);history.replaceState(null,'',u.pathname+(u.search||'')+u.hash);}catch(e){}
  MR.apply();MR.mount();MR.fixLinks();
  MR.langHooks.forEach(function(f){try{f(l);}catch(e){}});
  MR.track('Language Changed',{from_lang:from,to_lang:l},'nav.lang.switch');
};

/* ---------- mõõtmine ---------- */
function validate(ev,props,comp){
  if(!TAX)return 'taxonomy missing';
  var spec=TAX.events[ev];if(!spec)return 'unknown event';
  if(comp&&!TAX.components[comp])return 'unknown component';
  var keys=Object.keys(props||{}),want=Object.keys(spec.props),i;
  for(i=0;i<keys.length;i++){if(!spec.props[keys[i]])return 'unknown property '+keys[i];}
  for(i=0;i<want.length;i++){
    var k=want[i];if(props[k]===undefined)return 'missing property '+k;
    var m=/^enum:(.+)$/.exec(spec.props[k]);if(!m||!TAX.enums[m[1]])return 'bad spec '+k;
    if(TAX.enums[m[1]].indexOf(String(props[k]))<0)return 'value not allowed for '+k;
  }
  return null;
}
MR.validate=validate;
MR.measureReason=function(){
  if(navigator.doNotTrack==='1'||window.doNotTrack==='1')return 'dnt';
  if(navigator.globalPrivacyControl)return 'gpc';
  try{if(localStorage.getItem('mr.optout')==='1')return 'user';}catch(e){}
  return null;
};
MR.measure=function(){return MR.measureReason()===null;};
MR.setMeasure=function(on){
  try{if(on)localStorage.removeItem('mr.optout');else localStorage.setItem('mr.optout','1');}catch(e){}
  MR.track('Measurement Toggled',{state:on?'on':'off'},'footer.measure.toggle');
  renderLog();
  document.querySelectorAll('[data-mr-measure-state]').forEach(function(b){b.textContent=MR.measure()?MR.t('log.turn_off'):MR.t('log.turn_on');});
};
function canSend(){return window.MR_FORCE===true||/^https?:$/.test(location.protocol);}
var timer=null;
function flush(){
  if(!MR.queue.length)return;
  var batch=MR.queue.splice(0,20),body=JSON.stringify({v:1,events:batch});
  try{
    if(navigator.sendBeacon){navigator.sendBeacon(MR.config.endpoint,new Blob([body],{type:'application/json'}));}
    else{fetch(MR.config.endpoint,{method:'POST',body:body,keepalive:true,headers:{'Content-Type':'application/json'}}).catch(function(){});}
  }catch(e){}
}
MR.flush=flush;
function schedule(){if(timer)return;timer=setTimeout(function(){timer=null;flush();},1000);}
MR.track=function(ev,props,comp,opt){
  opt=opt||{};props=props||{};
  var err=validate(ev,props,comp);
  if(err){MR.rejected.push({n:ev,err:err});if(MR.config.debug&&window.console)console.warn('MR.track rejected: '+ev+' ('+err+')');return false;}
  var send=!opt.dry&&MR.measure()&&canSend();
  var rec={n:ev,c:comp||null,p:props,l:MR.lang,pg:MR.page,sent:send,dry:!!opt.dry};
  MR.log.push(rec);if(MR.log.length>50)MR.log.shift();
  renderLog();
  if(send){MR.queue.push({n:ev,c:comp||null,p:props,l:MR.lang,pg:MR.page});schedule();}
  return true;
};
/* deklaratiivne: data-mr-e (sündmus), data-mr-c (komponent), data-mr-p-xxx (omadused) */
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest?e.target.closest('[data-mr-e]'):null;if(!t)return;
  var p={};Array.prototype.forEach.call(t.attributes,function(a){if(a.name.indexOf('data-mr-p-')===0)p[a.name.slice(10).replace(/-/g,'_')]=a.value;});
  MR.track(t.getAttribute('data-mr-e'),p,t.getAttribute('data-mr-c'));
},true);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')flush();});
window.addEventListener('pagehide',flush);
/* audit: kõik data-mr-c ja data-mr-e peavad olema registris */
MR.audit=function(){
  var bad=[];
  Array.prototype.forEach.call(document.querySelectorAll('[data-mr-c],[data-mr-e]'),function(n){
    var c=n.getAttribute('data-mr-c'),e=n.getAttribute('data-mr-e');
    if(c&&!(TAX&&TAX.components[c]))bad.push('component:'+c);
    if(e&&!(TAX&&TAX.events[e]))bad.push('event:'+e);
    if(e){var p={};Array.prototype.forEach.call(n.attributes,function(a){if(a.name.indexOf('data-mr-p-')===0)p[a.name.slice(10).replace(/-/g,'_')]=a.value;});var err=validate(e,p,c);if(err)bad.push('invalid:'+e+':'+err);}
  });
  return bad;
};

/* ---------- ühine raam ---------- */
var NAV=[['home','index.html','index'],['haruta','haruta.html','haruta'],['ots','ots.html','ots'],['ajatelg','ajatelg.html','ajatelg'],['kast','kast.html','kast']];
var FOOT=[['kell','kellakeeramine.html'],['privacy','privaatsus.html'],['contact','kontakt.html']];
MR.page=document.body?document.body.getAttribute('data-mr-page'):null;
MR.mount=function(){
  var nav=document.getElementById('mr-nav'),foot=document.getElementById('mr-foot'),ban=document.getElementById('mr-banner');
  if(nav){
    var h='<nav aria-label="'+esc(MR.t('nav.label'))+'"><a class="mr-brand" href="index.html">Raha Meeled</a><ul>';
    NAV.forEach(function(n){h+='<li><a href="'+n[1]+'"'+(MR.page===n[2]?' aria-current="page"':'')+' data-mr-c="nav.primary.link" data-mr-e="Nav Item Clicked" data-mr-p-item="'+n[0]+'">'+esc(MR.t('nav.'+n[0]))+'</a></li>';});
    h+='</ul><div class="mr-lang"><label class="mr-sr" for="mr-langsel">'+esc(MR.t('nav.lang'))+'</label><select id="mr-langsel" data-mr-c="nav.lang.switch">';
    META.forEach(function(m){h+='<option value="'+m.code+'"'+(MR.lang===m.code?' selected':'')+'>'+esc(m.name)+'</option>';});
    h+='</select></div></nav>';nav.className='mr-nav';nav.innerHTML=h;
    nav.querySelector('#mr-langsel').onchange=function(){MR.setLang(this.value);};
  }
  if(ban){
    var info=META.filter(function(m){return m.code===MR.lang;})[0]||{status:'official'},draft=info.status==='draft',partial=document.body.getAttribute('data-mr-partial')==='1'&&MR.lang!=='et';
    if(MR.lang==='et'||(!draft&&!partial)){ban.className='';ban.innerHTML='';}
    else{ban.className='mr-banner';ban.innerHTML=(draft?esc(MR.t('lang.draft'))+' ':'')+(partial?esc(MR.t('lang.partial'))+' ':'')+'<a href="kontakt.html?reason=general">'+esc(MR.t('lang.fix'))+'</a>';MR.fixLinks(ban);}
  }
  if(foot){
    var open=document.getElementById('mr-log')&&!document.getElementById('mr-log').hidden;
    var f='<footer class="mr-foot"><p>'+esc(MR.t('foot.tagline'))+'</p><ul>';
    FOOT.forEach(function(x){f+='<li><a href="'+x[1]+'" data-mr-c="footer.links.link" data-mr-e="Footer Link Clicked" data-mr-p-item="'+x[0]+'">'+esc(MR.t('foot.'+x[0]))+'</a></li>';});
    f+='<li><button type="button" class="linkish" id="mr-logbtn" aria-expanded="'+(open?'true':'false')+'" data-mr-c="footer.measure.log-link">'+esc(MR.t('foot.log'))+'</button></li></ul>';
    f+='<aside id="mr-log" data-mr-c="footer.measure.log-panel"'+(open?'':' hidden')+'></aside></footer>';
    foot.innerHTML=f;
    $b=document.getElementById('mr-logbtn');
    $b.onclick=function(){var a=document.getElementById('mr-log');a.hidden=!a.hidden;$b.setAttribute('aria-expanded',a.hidden?'false':'true');if(!a.hidden){MR.track('Measurement Log Opened',{},'footer.measure.log-link');renderLog();}};
    renderLog();
  }
};
var $b=null;
function renderLog(){
  var box=document.getElementById('mr-log');if(!box||box.hidden)return;
  var why=MR.measureReason(),state=why===null?(canSend()?MR.t('log.on'):MR.t('log.off.file')):MR.t('log.off.'+why);
  var h='<strong>'+esc(MR.t('log.title'))+'</strong><p>'+esc(MR.t('log.intro'))+'</p><p><b>'+esc(state)+'</b> ';
  if(why==='user'||why===null)h+='<button type="button" class="linkish" data-mr-measure-state="1" data-mr-c="footer.measure.toggle">'+esc(MR.measure()?MR.t('log.turn_off'):MR.t('log.turn_on'))+'</button>';
  h+='</p>';
  if(!MR.log.length)h+='<p class="small">'+esc(MR.t('log.empty'))+'</p>';
  MR.log.slice().reverse().forEach(function(r){h+='<div class="ev"><span class="small">'+esc(r.dry?MR.t('log.dry'):(r.sent?MR.t('log.sent'):MR.t('log.local')))+'</span><pre>'+esc(JSON.stringify({event:r.n,component:r.c,properties:r.p,lang:r.l,page:r.pg}))+'</pre></div>';});
  h+='<p class="small"><a href="privaatsus.html" data-mr-c="footer.links.link" data-mr-e="Footer Link Clicked" data-mr-p-item="privacy">'+esc(MR.t('log.registry'))+'</a></p>';
  box.innerHTML=h;
  var tb=box.querySelector('[data-mr-measure-state]');if(tb)tb.onclick=function(){MR.setMeasure(!MR.measure());};
  MR.fixLinks(box);
}

/* ---------- taevas (kui leht ise seda ei tee) ---------- */
function sky(){
  var d=document.getElementById('dawn');if(!d||window.__mrSky)return;window.__mrSky=true;
  var tick=false;function f(){tick=false;var h=document.documentElement,m=Math.max(1,h.scrollHeight-window.innerHeight);d.style.opacity=Math.max(0,Math.min(1,window.scrollY/m));}
  window.addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(f);}},{passive:true});f();
}
function entry(){var r=document.referrer;if(!r)return 'direct';try{return new URL(r).host===location.host?'internal':'external';}catch(e){return 'direct';}}
function init(){
  MR.apply();MR.mount();MR.fixLinks();sky();
  if(MR.page)MR.track('Page Viewed',{page:MR.page,lang:MR.lang,entry:entry()},null);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
