/* Vaidle mudel: ühe lõnga tõde kahele lehele (tingi.html ja mangukast.html).
   Kõik hinnad, kordajad ja tugevused on selle tööriista OLETUSED, mitte andmed.
   Omanik, versioon ja ülevaatuse kuupäev on lehtedel nähtaval; muudatus käib siin, mitte lehtede sees. */
window.VM=(function(){
'use strict';
var VERSION='0.3',OWNER='Mirko',REVIEWED='2026-10-17';

/* 1. vaatus: väited, tõendid, vastupanu */
var BASE={firm:2,flex:3.5,busy:2.5};
var VAL={budget:2,band:2,market:3,performance:2,timing:1};
var STR={
  budget:{'job-ad':0,peer:0,survey:0,ai:0,results:2,offer:2},
  band:{'job-ad':1,peer:0,survey:1,ai:0,results:1,offer:2},
  market:{'job-ad':2,peer:1,survey:2,ai:1,results:0,offer:3},
  performance:{'job-ad':0,peer:0,survey:0,ai:0,results:3,offer:0},
  timing:{'job-ad':0,peer:0,survey:0,ai:0,results:2,offer:1}
};
var RES={firm:{budget:3,band:2,market:2,performance:2,timing:2},flex:{budget:1,band:1,market:1,performance:1,timing:1},busy:{budget:2,band:2,market:1,performance:1,timing:3}};
var RANK={open:0,held:1,weakened:2,broken:3};
function judge(style,claim,e,why){var s=STR[claim][e]+(why?1:0)-RES[style][claim];return s>=2?'broken':(s===1?'weakened':'held');}
function pointsFor(claim,o){return o==='broken'?VAL[claim]:(o==='weakened'?VAL[claim]/2:0);}

/* rahandus: kuu kaupa liitintress, sissemakse kuu lõpus; tootluse vahemik 0–4% nagu Elukaares */
function monthsToFire(target,assets,save,retPct){
  var rm=Math.pow(1+retPct/100,1/12)-1,w=assets;
  if(w>=target-1e-6)return 0;
  for(var m=1;m<=960;m++){w=w*(1+rm)+save;if(w>=target-1e-6)return m;}
  return Infinity;
}
function requiredSave(target,assets,retPct,years){
  var rm=Math.pow(1+retPct/100,1/12)-1,n=Math.round(years*12);
  if(rm===0)return Math.max(0,(target-assets)/n);
  var g=Math.pow(1+rm,n);
  return Math.max(0,(target-assets*g)*rm/(g-1));
}

/* 2. vaatus: hoovad, hinnad, kulukordajad */
var LEV=['salary','bonus','leave','remote','learn','title','review','hours'];
var LMAX={bonus:3,leave:3,remote:3,learn:3,title:2,review:3,hours:3};
var KAP={firm:{salary:1,bonus:.9,leave:1,remote:1.6,learn:.7,title:1.4,review:1.2,hours:1.2},flex:{salary:1,bonus:.8,leave:.9,remote:.3,learn:.5,title:.6,review:.4,hours:.9},busy:{salary:1,bonus:1,leave:1,remote:.6,learn:.8,title:1,review:2,hours:1.1}};
var POOL={firm:.5,flex:1.5,busy:1};
var DECK={firm:['cap','cut','gift','swap'],flex:['swap','cap','gift','cut'],busy:['gift','cut','cap','swap']};
function payOf(pay){return pay>0?pay:60000;}
function mkt(l,pay){return {salary:.5,bonus:.5,leave:.8,remote:.5,learn:500/payOf(pay)*100,title:1,review:.3,hours:2.5}[l];}
function rho(l,pr){var i=pr.indexOf(l);return i===0?3:(i===1?2:(i===2?1.5:1));}
function levMax(l,askU){return l==='salary'?Math.min(50,Math.round(askU*2)):LMAX[l];}
function costP(p,style,pay){var c=0;LEV.forEach(function(l){c+=(p[l]||0)*mkt(l,pay)*KAP[style][l];});return c;}
function valP(p,pr,pay){var v=0;LEV.forEach(function(l){v+=(p[l]||0)*mkt(l,pay)*rho(l,pr);});return v;}
function capSteps(offer){return Math.round(Math.max(1,Math.round(offer)/2)*2);}

/* o: {style,pr,pay,askU,B, minSalary,maxSalary, target}  (palga sammud 0,5% kaupa) */
function ranges(o){
  var mx=LEV.map(function(l){return l==='salary'?Math.min(levMax('salary',o.askU),o.maxSalary!=null?o.maxSalary:999):LMAX[l];});
  var mn=LEV.map(function(l){return l==='salary'?(o.minSalary||0):0;});
  return {mx:mx,mn:mn};
}
function arrays(o){
  return {cs:LEV.map(function(l){return mkt(l,o.pay)*KAP[o.style][l];}),vs:LEV.map(function(l){return mkt(l,o.pay)*rho(l,o.pr);})};
}
/* suurim väärtus sulle eelarve sees; viigis odavam */
function bestP(o){
  var r=ranges(o),a=arrays(o),best={v:-1,c:0,p:null},cur=LEV.map(function(){return 0;}),i0;
  for(i0=0;i0<LEV.length;i0++)if(r.mn[i0]>r.mx[i0])return best;
  (function rec(i,c,v){
    if(i===LEV.length){if(v>best.v+1e-9||(Math.abs(v-best.v)<1e-9&&c<best.c)){var p={};LEV.forEach(function(l,k){p[l]=cur[k];});best={v:v,c:c,p:p};}return;}
    for(var st=r.mn[i];st<=r.mx[i];st++){var c2=c+st*a.cs[i];if(c2>o.B+1e-9)break;cur[i]=st;rec(i+1,c2,v+st*a.vs[i]);}
    cur[i]=0;
  })(0,0,0);
  return best;
}
/* odavaim pakett juhile, mille väärtus sulle on vähemalt siht; viigis suurem väärtus */
function cheapestP(o){
  var r=ranges(o),a=arrays(o),best={v:-1,c:Infinity,p:null},cur=LEV.map(function(){return 0;}),i0;
  for(i0=0;i0<LEV.length;i0++)if(r.mn[i0]>r.mx[i0])return best;
  (function rec(i,c,v){
    if(i===LEV.length){if(v>=o.target-1e-9&&(c<best.c-1e-9||(Math.abs(c-best.c)<1e-9&&v>best.v))){var p={};LEV.forEach(function(l,k){p[l]=cur[k];});best={v:v,c:c,p:p};}return;}
    for(var st=r.mn[i];st<=r.mx[i];st++){var c2=c+st*a.cs[i];if(c2>o.B+1e-9||c2>best.c+1e-9)break;cur[i]=st;rec(i+1,c2,v+st*a.vs[i]);}
    cur[i]=0;
  })(0,0,0);
  return best;
}

/* tekstid hoobade jaoks (jagatud kahe lehe vahel) */
var TEXT={
et:{
 lvl_salary:'Põhipalk', lvl_bonus:'Ühekordne boonus', lvl_leave:'Lisapuhkus', lvl_remote:'Kaugtöö', lvl_learn:'Õppebüdžett', lvl_title:'Tiitel ja rolli maht', lvl_review:'Varasem läbivaatus', lvl_hours:'Lühem nädal',
 lvt_salary:'+{n}% palka', lvt_bonus:'boonus {n}', lvt_leave:'+{n} päeva puhkust', lvt_remote:'{n} päeva kaugtööd nädalas', lvt_learn:'õppebüdžett {n} aastas', lvt_title:'tiitli tase +{n}', lvt_review:'läbivaatus {n} kuud varem', lvt_hours:'{n} tundi lühem nädal',
 lvd_salary:'Kasvab iga aastaga kaasa.', lvd_bonus:'Ühekordne: ei kasva palgaga kaasa.', lvd_remote:'Aeg ja raha, mis kulus teele.', lvd_learn:'Oskused, mis tõstavad sinu hinda järgmisel vestlusel.', lvd_title:'Tase, mis avab uue vahemiku.', lvd_review:'Teine võimalus küsida varem.',
 dl_time:'= {h} tundi aastas sinu unistusele: „{d}“', dl_time0:'= {h} tundi aastas sinu enda aega'
},
en:{
 lvl_salary:'Base pay', lvl_bonus:'One-off bonus', lvl_leave:'Extra leave', lvl_remote:'Remote days', lvl_learn:'Learning budget', lvl_title:'Title and scope', lvl_review:'Earlier review', lvl_hours:'Shorter week',
 lvt_salary:'+{n}% base pay', lvt_bonus:'bonus {n}', lvt_leave:'+{n} days of leave', lvt_remote:'{n} remote days a week', lvt_learn:'learning budget {n} a year', lvt_title:'title level +{n}', lvt_review:'review {n} months earlier', lvt_hours:'{n} hours shorter week',
 lvd_salary:'Grows with every year.', lvd_bonus:'One-off: does not grow with your pay.', lvd_remote:'Time and money you spent on the commute.', lvd_learn:'Skills that raise your price in the next conversation.', lvd_title:'A level that opens a new range.', lvd_review:'A second chance to ask sooner.',
 dl_time:'= {h} hours a year for your dream: “{d}”', dl_time0:'= {h} hours a year of your own time'
}};

return {VERSION:VERSION,OWNER:OWNER,REVIEWED:REVIEWED,BASE:BASE,VAL:VAL,STR:STR,RES:RES,RANK:RANK,judge:judge,pointsFor:pointsFor,monthsToFire:monthsToFire,requiredSave:requiredSave,
  LEV:LEV,LMAX:LMAX,KAP:KAP,POOL:POOL,DECK:DECK,payOf:payOf,mkt:mkt,rho:rho,levMax:levMax,costP:costP,valP:valP,capSteps:capSteps,bestP:bestP,cheapestP:cheapestP,TEXT:TEXT};
})();
