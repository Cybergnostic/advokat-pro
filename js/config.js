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

function populateDomainControls(){
  if(!APP_CONFIG)return;
  var caseSel=document.getElementById('p-vrsta');
  if(caseSel){
    caseSel.innerHTML=APP_CONFIG.caseTypes.map(function(x){return '<option value="'+x.code+'">'+x.name+'</option>';}).join('');
    if(SCFG.parnicni)caseSel.value='parnicni';
  }
  var np=APP_CONFIG.nonAssessable||[];
  ['p-npro','tc-npv'].forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    el.innerHTML=np.map(function(x){return '<option value="'+x.id+'">'+x.label+'</option>';}).join('');
  });
  var kb=APP_CONFIG.criminalBands||[];
  var kaz=document.getElementById('p-kazna');
  if(kaz)kaz.innerHTML=kb.map(function(x){return '<option value="'+x.id+'">'+x.label+'</option>';}).join('');
  var title=document.querySelector('#pg-tarifa .sh-t');
  if(title&&APP_CONFIG.tariff)title.textContent=APP_CONFIG.tariff.title||title.textContent;
  var sub=document.querySelector('#pg-tarifa .tc-sub');
  if(sub&&APP_CONFIG.tariff)sub.textContent='dinara · '+(APP_CONFIG.tariff.subtitle||'');
}

async function loadAppConfig(){
  var cfg=await apiRequest('/api/config',{method:'GET',headers:{}});
  APP_CONFIG=cfg;
  SCFG={};
  VL={};
  KL=[];
  (cfg.caseTypes||[]).forEach(function(x){
    SCFG[x.code]={
      name:x.name,shortName:x.shortName,s1:x.party1Label,s2:x.party2Label,
      uloge:(x.roles||[]).map(function(r){return{v:r.code,l:r.label};}),
      def:x.defaultRole,isCriminal:!!x.isCriminal,isProsecution:!!x.isProsecution,
      tariffFamily:x.tariffFamily||'none'
    };
    VL[x.code]=x.shortName||x.name;
  });
  KL=(cfg.criminalBands||[]).map(function(x){return x.label;});
  ACTION_CFG=cfg.actions||[];
  KD=(cfg.offenses||[]).map(function(x){return{
    n:x.name,cl:x.article,k:x.tariffBand,tariffLabel:x.tariffLabel,
    penaltyText:x.penaltyText,regularYears:x.regularYears,absoluteYears:x.absoluteYears
  };});
  populateDomainControls();
  return cfg;
}

function pKlUloga(u){
  _pKU=u;
  var v=document.getElementById('p-vrsta').value;
  var cfg=getCaseCfg(v);
  document.getElementById('tog-uloga').querySelectorAll('.tg').forEach(function(b,i){
    b.className='tg'+(cfg.uloge[i]&&cfg.uloge[i].v===u?' '+UBOJE[i%UBOJE.length]:'');
  });
}

function updateStranke(){
  var v=document.getElementById('p-vrsta').value;
  var cfg=getCaseCfg(v);
  document.getElementById('lbl-s1').textContent=cfg.s1;
  document.getElementById('lbl-s2').textContent=cfg.s2||'Protivna stranka';
  document.getElementById('fg-s2').style.display=(!cfg.s2&&cfg.isProsecution)?'none':'block';
  var tog=document.getElementById('tog-uloga');
  tog.innerHTML=cfg.uloge.map(function(u,i){
    return '<button type="button" class="tg'+(u.v===cfg.def?' '+UBOJE[i%UBOJE.length]:'')+'" onclick="pKlUloga(\''+u.v+'\')">'+u.l+'</button>';
  }).join('');
  _pKU=cfg.def;
}

function getRL(vrsta,tip,uloga){
  var rows=ACTION_CFG.filter(function(x){return x.caseType===vrsta&&x.kind===tip;});
  var exact=rows.filter(function(x){return x.clientRole===uloga;});
  var use=exact.length?exact:rows.filter(function(x){return x.clientRole==='default';});
  return use.map(function(x){return{n:x.name};});
}

// Fees are calculated authoritatively by the backend and attached to actions in /api/state.
function calcIz(ra,p){
  if(!ra||!p)return 0;
  return Number(ra.iznos||0);
}

function kdSearch(pfx){
  var q=document.getElementById(pfx+'-kd').value.toLowerCase().trim();
  var res=document.getElementById(pfx+'-kdr');
  if(q.length<1){res.classList.remove('open');return;}
  var m=KD.filter(function(k){return k.n.toLowerCase().indexOf(q)>=0||k.cl.toLowerCase().indexOf(q)>=0;}).slice(0,10);
  if(!m.length){res.classList.remove('open');return;}
  res.innerHTML=m.map(function(k){return '<div class="kdi" onclick="kdSel(\''+pfx+'\',\''+k.n.replace(/'/g,"\\'")+'\')">'+'<div class="kdin">'+k.n+'</div>'+'<div class="kdim">'+k.cl+' · '+k.penaltyText+'</div></div>';}).join('');
  res.classList.add('open');
}

function kdSel(pfx,naziv){
  var kd=KD.find(function(k){return k.n===naziv;});if(!kd)return;
  document.getElementById(pfx+'-kd').value=naziv;
  document.getElementById(pfx+'-kdr').classList.remove('open');
  document.getElementById(pfx+'-kazna').value=String(kd.k);
  var box=document.getElementById(pfx+'-kdi');
  box.innerHTML='<div class="kd-it">⚖ '+kd.n+'</div>'
    +'<div class="kd-ir"><span>Član KZ:</span><span>'+kd.cl+'</span></div>'
    +'<div class="kd-ir"><span>Zaprećena kazna:</span><span>'+kd.penaltyText+'</span></div>'
    +'<div class="kd-ir"><span>Tarifni razred:</span><span>'+kd.tariffLabel+'</span></div>'
    +'<div class="kd-ir"><span>Redovna zastarelost:</span><span>'+kd.regularYears+' god.</span></div>'
    +'<div class="kd-ir warn"><span>Apsolutna zastarelost (čl.103):</span><span>'+kd.absoluteYears+' god.</span></div>';
  box.classList.add('open');
  if(pfx==='p'){
    document.getElementById('p-zw').style.display='block';
    document.getElementById('p-zb').innerHTML='<div class="tt-h">Zastarelost — '+kd.n+'</div>'
      +'<div class="tt-r"><span class="tt-l">Zaprećena kazna</span><span class="tt-v">'+kd.penaltyText+'</span></div>'
      +'<div class="tt-r"><span class="tt-l">Redovna zastarelost</span><span class="tt-v">'+kd.regularYears+' god.</span></div>'
      +'<div class="tt-r"><span class="tt-l">Apsolutna zastarelost (čl.103 KZ)</span><span class="tt-v hi">'+kd.absoluteYears+' god.</span></div>';
  }
}

document.addEventListener('click',function(e){
  if(!e.target.closest('.kd-wrap'))document.querySelectorAll('.kd-res').forEach(function(r){r.classList.remove('open');});
  if(!e.target.closest('.ac-wrap'))document.querySelectorAll('.ac-res').forEach(function(r){r.classList.remove('open');});
});
