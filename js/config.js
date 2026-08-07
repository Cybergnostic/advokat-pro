// DOMAIN CONFIG — authoritative legal configuration is loaded from D1 via /api/config
var APP_CONFIG=null;
var SCFG={};
var ACTION_CFG=[];
var KD=[];
var UBOJE=['ab','ap','agr','ao'];
var _pKU='tuzilac';

function getCaseCfg(code){
  return SCFG[code]||SCFG.parnicni||{s1:'Klijent',s2:'Protivna stranka',uloge:[],def:'',isCriminal:false,isProsecution:false,tariffFamily:'none'};
}

function fillSelect(el,items,valueKey,labelKey){
  if(!el)return;el.replaceChildren();
  items.forEach(function(x){var o=document.createElement('option');o.value=String(x[valueKey]);o.textContent=String(x[labelKey]);el.appendChild(o);});
}

function populateDomainControls(){
  if(!APP_CONFIG)return;
  var caseSel=document.getElementById('p-vrsta');
  fillSelect(caseSel,APP_CONFIG.caseTypes||[],'code','name');
  if(caseSel&&SCFG.parnicni)caseSel.value='parnicni';
  var np=APP_CONFIG.nonAssessable||[];
  ['p-npro','tc-npv'].forEach(function(id){fillSelect(document.getElementById(id),np,'id','label');});
  fillSelect(document.getElementById('p-kazna'),APP_CONFIG.criminalBands||[],'id','label');
  var title=document.querySelector('#pg-tarifa .sh-t');
  if(title&&APP_CONFIG.tariff)title.textContent=APP_CONFIG.tariff.title||title.textContent;
  var sub=document.querySelector('#pg-tarifa .tc-sub');
  if(sub&&APP_CONFIG.tariff)sub.textContent='dinara · '+(APP_CONFIG.tariff.subtitle||'');
}

async function loadAppConfig(){
  var cfg=await apiRequest('/api/config',{method:'GET',headers:{}});
  APP_CONFIG=cfg;SCFG={};VL={};KL=[];
  (cfg.caseTypes||[]).forEach(function(x){
    SCFG[x.code]={name:x.name,shortName:x.shortName,s1:x.party1Label,s2:x.party2Label,uloge:(x.roles||[]).map(function(r){return{v:r.code,l:r.label};}),def:x.defaultRole,isCriminal:!!x.isCriminal,isProsecution:!!x.isProsecution,tariffFamily:x.tariffFamily||'none'};
    VL[x.code]=x.shortName||x.name;
  });
  KL=(cfg.criminalBands||[]).map(function(x){return x.label;});
  ACTION_CFG=cfg.actions||[];
  KD=(cfg.offenses||[]).map(function(x){return{n:x.name,cl:x.article,k:x.tariffBand,tariffLabel:x.tariffLabel,penaltyText:x.penaltyText,regularYears:x.regularYears,absoluteYears:x.absoluteYears};});
  populateDomainControls();return cfg;
}

function pKlUloga(u){
  _pKU=u;var v=document.getElementById('p-vrsta').value,cfg=getCaseCfg(v);
  document.getElementById('tog-uloga').querySelectorAll('.tg').forEach(function(b,i){b.className='tg'+(cfg.uloge[i]&&cfg.uloge[i].v===u?' '+UBOJE[i%UBOJE.length]:'');});
}

function updateStranke(){
  var v=document.getElementById('p-vrsta').value,cfg=getCaseCfg(v);
  document.getElementById('lbl-s1').textContent=cfg.s1;
  document.getElementById('lbl-s2').textContent=cfg.s2||'Protivna stranka';
  document.getElementById('fg-s2').style.display=(!cfg.s2&&cfg.isProsecution)?'none':'block';
  var tog=document.getElementById('tog-uloga');tog.replaceChildren();
  cfg.uloge.forEach(function(u,i){var b=document.createElement('button');b.type='button';b.className='tg'+(u.v===cfg.def?' '+UBOJE[i%UBOJE.length]:'');b.textContent=u.l;b.onclick=function(){pKlUloga(u.v);};tog.appendChild(b);});
  _pKU=cfg.def;
}

function getRL(vrsta,tip,uloga){
  var rows=ACTION_CFG.filter(function(x){return x.caseType===vrsta&&x.kind===tip;});
  var exact=rows.filter(function(x){return x.clientRole===uloga;});
  var use=exact.length?exact:rows.filter(function(x){return x.clientRole==='default';});
  return use.map(function(x){return{n:x.name};});
}

function calcIz(ra,p){if(!ra||!p)return 0;return Number(ra.iznos||0);}

function kdSearch(pfx){
  var q=document.getElementById(pfx+'-kd').value.toLowerCase().trim(),res=document.getElementById(pfx+'-kdr');
  if(q.length<1){res.classList.remove('open');return;}
  var m=KD.filter(function(k){return k.n.toLowerCase().indexOf(q)>=0||k.cl.toLowerCase().indexOf(q)>=0;}).slice(0,10);
  if(!m.length){res.classList.remove('open');return;}
  res.replaceChildren();
  m.forEach(function(k){var item=document.createElement('div');item.className='kdi';var name=document.createElement('div');name.className='kdin';name.textContent=k.n;var meta=document.createElement('div');meta.className='kdim';meta.textContent=k.cl+' · '+k.penaltyText;item.appendChild(name);item.appendChild(meta);item.onclick=function(){kdSel(pfx,k.n);};res.appendChild(item);});
  res.classList.add('open');
}

function kdSel(pfx,naziv){
  var kd=KD.find(function(k){return k.n===naziv;});if(!kd)return;
  document.getElementById(pfx+'-kd').value=naziv;document.getElementById(pfx+'-kdr').classList.remove('open');document.getElementById(pfx+'-kazna').value=String(kd.k);
  var box=document.getElementById(pfx+'-kdi');
  box.innerHTML='<div class="kd-it">⚖ '+esc(kd.n)+'</div><div class="kd-ir"><span>Član KZ:</span><span>'+esc(kd.cl)+'</span></div><div class="kd-ir"><span>Zaprećena kazna:</span><span>'+esc(kd.penaltyText)+'</span></div><div class="kd-ir"><span>Tarifni razred:</span><span>'+esc(kd.tariffLabel)+'</span></div><div class="kd-ir"><span>Redovna zastarelost:</span><span>'+Number(kd.regularYears)+' god.</span></div><div class="kd-ir warn"><span>Apsolutna zastarelost (čl.103):</span><span>'+Number(kd.absoluteYears)+' god.</span></div>';
  box.classList.add('open');
  if(pfx==='p'){
    document.getElementById('p-zw').style.display='block';
    document.getElementById('p-zb').innerHTML='<div class="tt-h">Zastarelost — '+esc(kd.n)+'</div><div class="tt-r"><span class="tt-l">Zaprećena kazna</span><span class="tt-v">'+esc(kd.penaltyText)+'</span></div><div class="tt-r"><span class="tt-l">Redovna zastarelost</span><span class="tt-v">'+Number(kd.regularYears)+' god.</span></div><div class="tt-r"><span class="tt-l">Apsolutna zastarelost (čl.103 KZ)</span><span class="tt-v hi">'+Number(kd.absoluteYears)+' god.</span></div>';
  }
}

document.addEventListener('click',function(e){
  if(!e.target.closest('.kd-wrap'))document.querySelectorAll('.kd-res').forEach(function(r){r.classList.remove('open');});
  if(!e.target.closest('.ac-wrap'))document.querySelectorAll('.ac-res').forEach(function(r){r.classList.remove('open');});
});
