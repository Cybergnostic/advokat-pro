// PREDMET FORM
var _pUloga='okrivljeni',_pSld=false,_pSud='osnovni',_pTuz='osnovno',_pProcenjiv=true;
var _pTariffReq=0;

function pVrsta(){
  var v=document.getElementById('p-vrsta').value;
  var cfg=getCaseCfg(v);
  var isK=!!cfg.isCriminal;
  var isT=!!cfg.isProsecution;
  document.getElementById('p-vw').style.display=isK?'none':'block';
  document.getElementById('p-kw').style.display=isK?'block':'none';
  document.getElementById('p-tw').style.display=isT?'block':'none';
  document.getElementById('p-sud-w').style.display=isT?'none':'block';
  document.getElementById('pu-osu').style.display=isT?'block':'none';
  document.getElementById('p-proc-wrap').style.display=cfg.tariffFamily==='civil'?'block':'none';
  document.getElementById('p-itr').style.display='none';
  if(cfg.tariffFamily!=='civil'&&!_pProcenjiv)pProcenjiv(true);
  updateStranke();
  if(isT&&_pUloga!=='osteceni')pUloga(_pUloga==='osumnjiceni'?'osumnjiceni':'okrivljeni');
  if(!isT&&_pUloga==='osumnjiceni')pUloga('okrivljeni');
  if(!isK)pTariff();
}

function pProcenjiv(v){
  _pProcenjiv=!!v;
  document.getElementById('pp-proc').className='tg'+(_pProcenjiv?' ag':'');
  document.getElementById('pp-neproc').className='tg'+(!_pProcenjiv?' ag':'');
  document.getElementById('p-vred-wrap').style.display=_pProcenjiv?'block':'none';
  document.getElementById('p-npro-wrap').style.display=_pProcenjiv?'none':'block';
  pTariff();
}

function pUloga(u){
  _pUloga=u;
  ['okr','osu','ost'].forEach(function(x,i){var k=['okrivljeni','osumnjiceni','osteceni'][i];var el=document.getElementById('pu-'+x);if(el)el.className='tg'+(u===k?(k==='osteceni'?' agr':' ab'):'');});
  var sldWrap=document.getElementById('pu-sld').closest('.fg');
  if(sldWrap)sldWrap.style.display=u==='osteceni'?'none':'block';
  if(u==='osteceni')pSld(false);
}
function pSld(v){_pSld=v;document.getElementById('pu-ugo').className='tg'+(v?'':' ab');document.getElementById('pu-sld').className='tg'+(v?' ap':'');}
function pSud(s){_pSud=s;['os','vs','ps'].forEach(function(x,i){var k=['osnovni','visi','privredni'][i];document.getElementById('ps-'+x).className='tg'+(s===k?' ag':'');});}
function pSetTuz(t){_pTuz=t;['pt-os','pt-vs','pt-ok','pt-ko'].forEach(function(id,i){var k=['osnovno','vise','org_kriminal','korupcija'][i];document.getElementById(id).className='tg'+(t===k?' ag':'');});}

function pHideTariff(){var el=document.getElementById('p-itr');if(el)el.style.display='none';}
function pTariffBlur(){setTimeout(function(){var a=document.activeElement;if(a&&(a.id==='p-vred'||a.id==='p-npro'))return;pHideTariff();},100);}
function pPickTariff(value){var input=document.getElementById('p-vred');if(!input||!isFinite(value))return;input.value=String(Math.round(value));input.focus();pTariff();}
function pTariffPrice(value){return '<button type="button" class="itr-pick" title="Kliknite da unesete kao vrednost spora" onmousedown="event.preventDefault()" onclick="event.stopPropagation();pPickTariff('+Number(value)+')" style="background:none;border:0;padding:0 2px;color:var(--tx);font:inherit;font-weight:700;cursor:pointer;text-align:right">'+fmt(value)+'</button>';}

async function pTariff(){
  var vrsta=document.getElementById('p-vrsta').value;
  var cfg=getCaseCfg(vrsta);
  var el=document.getElementById('p-itr');
  if(!el)return;
  if(cfg.tariffFamily!=='civil'&&cfg.tariffFamily!=='enforcement'){el.style.display='none';return;}

  var req=++_pTariffReq;
  try{
    var data=await apiRequest('/api/tariff',{
      method:'POST',
      body:JSON.stringify({
        op:'preview',caseType:vrsta,
        disputeValue:parseFloat(document.getElementById('p-vred').value)||0,
        nonAssessable:cfg.tariffFamily==='civil'&&!_pProcenjiv,
        nonAssessableIndex:parseInt(document.getElementById('p-npro').value||0)
      })
    });
    if(req!==_pTariffReq)return;
    var result=data&&data.result;
    var t=result&&result.tariff;
    if(!t){el.style.display='none';return;}
    el.style.display='block';
    el.style.cursor='default';
    el.title='';
    el.onclick=function(ev){if(ev.target.closest&&ev.target.closest('.itr-pick'))return;pHideTariff();};
    el.innerHTML='<div style="font-size:10px;font-weight:700;color:var(--gd2);margin-bottom:6px">'+esc(result.title)+'</div>'
      +'<div class="itr-r"><span>Podnesak:</span>'+pTariffPrice(t.pod)+'</div>'
      +'<div class="itr-r"><span>Ročište:</span>'+pTariffPrice(t.roc)+'</div>'
      +'<div class="itr-r"><span>Neodržano:</span>'+pTariffPrice(t.neo)+'</div>'
      +'<div class="itr-r"><span>Žalba:</span>'+pTariffPrice(t.zal)+'</div>';
  }catch(e){
    if(req===_pTariffReq){console.warn('Tariff preview failed',e);el.style.display='none';}
  }
}

async function savePredmet(){
  var br=document.getElementById('p-br').value.trim();var tuz=document.getElementById('p-tuz').value.trim();
  if(!br||!tuz){alert('Unesite broj predmeta i klijenta.');return;}
  var vrsta=document.getElementById('p-vrsta').value;var cfg=getCaseCfg(vrsta);
  var assigned=document.getElementById('p-assigned');
  var obj={id:Date.now().toString(),br:br,tuz:tuz,tuz2:document.getElementById('p-tuz2').value.trim(),klijentUloga:_pKU,lbl1:cfg.s1,lbl2:cfg.s2||'',sud:document.getElementById('p-sud').value.trim(),tipSuda:_pSud,tel:document.getElementById('p-tel').value.trim().replace(/\s/g,''),vrsta:vrsta,plac:parseFloat(document.getElementById('p-plac').value)||0,uplate:[],bel:document.getElementById('p-bel').value.trim(),tipTuzilastva:cfg.isProsecution?_pTuz:'',ktn:document.getElementById('p-ktn').value.trim(),jtuz:document.getElementById('p-jtuz').value.trim(),faza:document.getElementById('p-faza').value,assignedUserId:assigned?assigned.value:(CURRENT_USER?CURRENT_USER.id:'')};
  var au=USERS.find(function(x){return x.id===obj.assignedUserId;});obj.assignedUserName=au?au.displayName:'';
  if(cfg.isCriminal){obj.uloga=_pUloga;obj.sld=_pUloga==='osteceni'?false:_pSld;obj.kazna=parseInt(document.getElementById('p-kazna').value)||0;obj.kdNaziv=document.getElementById('p-kd').value.trim();}
  else{obj.neprocenjiv=cfg.tariffFamily==='civil'&&!_pProcenjiv;obj.nproIdx=obj.neprocenjiv?parseInt(document.getElementById('p-npro').value||0):null;obj.vred=obj.neprocenjiv?0:(parseFloat(document.getElementById('p-vred').value)||0);}
  try{
    var result=await dbMutate({entity:'case',action:'create',record:obj});
    if(result&&result.initial_payment){
      var ip=result.initial_payment;obj.uplate=[{id:ip.id,amount:Number(ip.amount||0),date:ip.date,notes:ip.notes||'',createdByName:CURRENT_USER?CURRENT_USER.displayName:''}];
      obj.plac=obj.uplate.reduce(function(sum,x){return sum+Number(x.amount||0);},0);
    }
  }catch(e){dbError(e);return;}
  D.p.push(obj);closeM('predmet');render();
  ['p-br','p-tuz','p-tuz2','p-sud','p-tel','p-vred','p-plac','p-bel','p-kd','p-ktn','p-jtuz'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('p-itr').style.display='none';document.getElementById('p-kdi').classList.remove('open');document.getElementById('p-zw').style.display='none';document.getElementById('p-vrsta').value=SCFG.parnicni?'parnicni':Object.keys(SCFG)[0];if(assigned&&CURRENT_USER)assigned.value=CURRENT_USER.id;pProcenjiv(true);pVrsta();pUloga('okrivljeni');pSld(false);pSud('osnovni');pSetTuz('osnovno');
}

(function(){
  var vred=document.getElementById('p-vred');
  var npro=document.getElementById('p-npro');
  if(vred){vred.addEventListener('focus',pTariff);vred.addEventListener('blur',pTariffBlur);}
  if(npro){npro.addEventListener('focus',pTariff);npro.addEventListener('blur',pTariffBlur);}
})();
