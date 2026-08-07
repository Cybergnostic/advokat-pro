// PREDMET FORM
var _pUloga='okrivljeni',_pSld=false,_pSud='osnovni',_pTuz='osnovno',_pProcenjiv=true;
function pVrsta(){
  var v=document.getElementById('p-vrsta').value;
  var isK=v==='krivicni'||v==='tuzilastvo';
  var isT=v==='tuzilastvo';
  document.getElementById('p-vw').style.display=isK?'none':'block';
  document.getElementById('p-kw').style.display=isK?'block':'none';
  document.getElementById('p-tw').style.display=isT?'block':'none';
  document.getElementById('p-sud-w').style.display=isT?'none':'block';
  document.getElementById('pu-osu').style.display=isT?'block':'none';
  document.getElementById('p-itr').style.display='none';
  pHideVredSuggestions();
  updateStranke();
  if(isT && _pUloga!=='osteceni') pUloga(_pUloga==='osumnjiceni'?'osumnjiceni':'okrivljeni');
  if(!isT && _pUloga==='osumnjiceni') pUloga('okrivljeni');
  if(!isK) pTariff();
}
function pProcenjiv(v){
  _pProcenjiv=!!v;
  document.getElementById('pp-proc').className='tg'+(_pProcenjiv?' ag':'');
  document.getElementById('pp-neproc').className='tg'+(!_pProcenjiv?' ag':'');
  document.getElementById('p-vred-wrap').style.display=_pProcenjiv?'block':'none';
  document.getElementById('p-npro-wrap').style.display=_pProcenjiv?'none':'block';
  if(!_pProcenjiv) pHideVredSuggestions();
  pTariff();
}
function pUloga(u){
  _pUloga=u;
  ['okr','osu','ost'].forEach(function(x,i){var k=['okrivljeni','osumnjiceni','osteceni'][i];var el=document.getElementById('pu-'+x);if(el)el.className='tg'+(u===k?(k==='osteceni'?' agr':' ab'):'');});
  var sldWrap=document.getElementById('pu-sld').closest('.fg');
  if(sldWrap) sldWrap.style.display=u==='osteceni'?'none':'block';
  if(u==='osteceni') pSld(false);
}
function pSld(v){_pSld=v;document.getElementById('pu-ugo').className='tg'+(v?'':' ab');document.getElementById('pu-sld').className='tg'+(v?' ap':'');}
function pSud(s){_pSud=s;['os','vs','ps'].forEach(function(x,i){var k=['osnovni','visi','privredni'][i];document.getElementById('ps-'+x).className='tg'+(s===k?' ag':'');});}
function pSetTuz(t){_pTuz=t;['pt-os','pt-vs','pt-ok','pt-ko'].forEach(function(id,i){var k=['osnovno','vise','org_kriminal','korupcija'][i];document.getElementById(id).className='tg'+(t===k?' ag':'');});}
function pHideTariff(){
  var el=document.getElementById('p-itr');
  if(el) el.style.display='none';
}
function pTariffBlur(){
  setTimeout(function(){
    var a=document.activeElement;
    if(a && (a.id==='p-vred'||a.id==='p-npro')) return;
    pHideTariff();
  },100);
}
function pTariff(){
  var vrsta=document.getElementById('p-vrsta').value;
  var el=document.getElementById('p-itr'); var t=null; var title='';
  if(!_pProcenjiv && (vrsta==='parnicni'||vrsta==='vanparnicni')){
    var idx=parseInt(document.getElementById('p-npro').value||0); t=TAR_N[idx]; title='Neprocenjivi · '+t.l;
  }else{
    var v=parseFloat(document.getElementById('p-vred').value);
    t=(vrsta==='parnicni'||vrsta==='vanparnicni')?getTarP(v):vrsta==='izvrsni'?getTarI(v):null;
    title='Vrednost spora';
  }
  if(t){
    el.style.display='block';
    el.style.cursor='pointer';
    el.title='Kliknite za zatvaranje';
    el.onmousedown=function(ev){ev.preventDefault();pHideTariff();};
    el.innerHTML='<div style="font-size:10px;font-weight:700;color:var(--gd2);margin-bottom:6px">'+title+'</div><div class="itr-r"><span>Podnesak:</span><span>'+fmt(t.pod)+'</span></div><div class="itr-r"><span>Ročište:</span><span>'+fmt(t.roc)+'</span></div><div class="itr-r"><span>Neodržano:</span><span>'+fmt(t.neo)+'</span></div><div class="itr-r"><span>Žalba:</span><span>'+fmt(t.zal)+'</span></div>';
  }
  else el.style.display='none';
}

function pVredBox(){
  var box=document.getElementById('p-vred-sug');
  if(box) return box;
  var wrap=document.getElementById('p-vred-wrap');
  if(!wrap) return null;
  wrap.style.position='relative';
  box=document.createElement('div');
  box.id='p-vred-sug';
  box.className='ac-res';
  box.style.top='calc(100% - 1px)';
  box.style.zIndex='80';
  wrap.appendChild(box);
  return box;
}
function pVredValues(){
  var seen={}; var vals=[];
  (D.p||[]).forEach(function(p){
    var v=Number(p.vred||0);
    if(v>0 && !seen[v]){seen[v]=true;vals.push(v);}
  });
  return vals.sort(function(a,b){return b-a;});
}
function pHideVredSuggestions(){
  var box=document.getElementById('p-vred-sug');
  if(box) box.classList.remove('open');
}
function pPickVred(value){
  var input=document.getElementById('p-vred');
  if(!input) return;
  input.value=String(value);
  pHideVredSuggestions();
  pTariff();
  input.focus();
}
function pVredSuggest(){
  var input=document.getElementById('p-vred');
  var box=pVredBox();
  if(!input||!box||!_pProcenjiv) return;
  var q=String(input.value||'').replace(/\D/g,'');
  var vals=pVredValues().filter(function(v){return !q || String(Math.trunc(v)).indexOf(q)===0;}).slice(0,8);
  box.innerHTML='';
  if(!vals.length){box.classList.remove('open');return;}
  vals.forEach(function(v){
    var item=document.createElement('div');
    item.className='ac-item';
    var br=document.createElement('div');
    br.className='ac-br';
    br.textContent=v.toLocaleString('sr-RS')+' din';
    var sub=document.createElement('div');
    sub.className='ac-sub';
    sub.textContent='Kliknite da unesete vrednost';
    item.appendChild(br);item.appendChild(sub);
    item.addEventListener('mousedown',function(ev){ev.preventDefault();pPickVred(v);});
    item.addEventListener('touchstart',function(ev){ev.preventDefault();pPickVred(v);},{passive:false});
    box.appendChild(item);
  });
  box.classList.add('open');
}
async function pRefreshVredSuggestions(){
  try{await loadSharedState();}catch(_){ }
  pVredSuggest();
}
function pVredBlur(){
  setTimeout(function(){pHideVredSuggestions();},150);
  pTariffBlur();
}

async function savePredmet(){
  var br=document.getElementById('p-br').value.trim(); var tuz=document.getElementById('p-tuz').value.trim();
  if(!br||!tuz){alert('Unesite broj predmeta i klijenta.');return;}
  var vrsta=document.getElementById('p-vrsta').value; var cfg=SCFG[vrsta]||SCFG.parnicni;
  var obj={id:Date.now().toString(),br:br,tuz:tuz,tuz2:document.getElementById('p-tuz2').value.trim(),klijentUloga:_pKU,lbl1:cfg.s1,lbl2:cfg.s2||'',sud:document.getElementById('p-sud').value.trim(),tipSuda:_pSud,tel:document.getElementById('p-tel').value.trim().replace(/\s/g,''),vrsta:vrsta,plac:parseFloat(document.getElementById('p-plac').value)||0,bel:document.getElementById('p-bel').value.trim(),tipTuzilastva:vrsta==='tuzilastvo'?_pTuz:'',ktn:document.getElementById('p-ktn').value.trim(),jtuz:document.getElementById('p-jtuz').value.trim(),faza:document.getElementById('p-faza').value};
  if(vrsta==='krivicni'||vrsta==='tuzilastvo'){obj.uloga=_pUloga;obj.sld=_pUloga==='osteceni'?false:_pSld;obj.kazna=parseInt(document.getElementById('p-kazna').value)||0;obj.kdNaziv=document.getElementById('p-kd').value.trim();}
  else{obj.neprocenjiv=(vrsta==='parnicni'||vrsta==='vanparnicni')&&!_pProcenjiv;obj.nproIdx=obj.neprocenjiv?parseInt(document.getElementById('p-npro').value||0):null;obj.vred=obj.neprocenjiv?0:(parseFloat(document.getElementById('p-vred').value)||0);}
  try{await dbMutate({entity:'case',action:'create',record:obj});}catch(e){dbError(e);return;}
  D.p.push(obj);closeM('predmet');render();
  ['p-br','p-tuz','p-tuz2','p-sud','p-tel','p-vred','p-plac','p-bel','p-kd','p-ktn','p-jtuz'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
  pHideVredSuggestions();document.getElementById('p-itr').style.display='none';document.getElementById('p-kdi').classList.remove('open');document.getElementById('p-zw').style.display='none';document.getElementById('p-vrsta').value='parnicni';pProcenjiv(true);pVrsta();pUloga('okrivljeni');pSld(false);pSud('osnovni');pSetTuz('osnovno');
}

(function(){
  var vred=document.getElementById('p-vred');
  var npro=document.getElementById('p-npro');
  if(vred){
    vred.addEventListener('focus',function(){pTariff();pRefreshVredSuggestions();});
    vred.addEventListener('input',function(){pTariff();pVredSuggest();});
    vred.addEventListener('blur',pVredBlur);
  }
  if(npro){npro.addEventListener('focus',pTariff);npro.addEventListener('blur',pTariffBlur);}
})();
