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
  if(t){el.style.display='block';el.innerHTML='<div style="font-size:10px;font-weight:700;color:var(--gd2);margin-bottom:6px">'+title+'</div><div class="itr-r"><span>Podnesak:</span><span>'+fmt(t.pod)+'</span></div><div class="itr-r"><span>Ročište:</span><span>'+fmt(t.roc)+'</span></div><div class="itr-r"><span>Neodržano:</span><span>'+fmt(t.neo)+'</span></div><div class="itr-r"><span>Žalba:</span><span>'+fmt(t.zal)+'</span></div>';}
  else el.style.display='none';
}
function savePredmet(){
  var br=document.getElementById('p-br').value.trim(); var tuz=document.getElementById('p-tuz').value.trim();
  if(!br||!tuz){alert('Unesite broj predmeta i klijenta.');return;}
  var vrsta=document.getElementById('p-vrsta').value; var cfg=SCFG[vrsta]||SCFG.parnicni;
  var obj={id:Date.now().toString(),br:br,tuz:tuz,tuz2:document.getElementById('p-tuz2').value.trim(),klijentUloga:_pKU,lbl1:cfg.s1,lbl2:cfg.s2||'',sud:document.getElementById('p-sud').value.trim(),tipSuda:_pSud,tel:document.getElementById('p-tel').value.trim().replace(/\s/g,''),vrsta:vrsta,plac:parseFloat(document.getElementById('p-plac').value)||0,bel:document.getElementById('p-bel').value.trim(),tipTuzilastva:vrsta==='tuzilastvo'?_pTuz:'',ktn:document.getElementById('p-ktn').value.trim(),jtuz:document.getElementById('p-jtuz').value.trim(),faza:document.getElementById('p-faza').value};
  if(vrsta==='krivicni'||vrsta==='tuzilastvo'){obj.uloga=_pUloga;obj.sld=_pUloga==='osteceni'?false:_pSld;obj.kazna=parseInt(document.getElementById('p-kazna').value)||0;obj.kdNaziv=document.getElementById('p-kd').value.trim();}
  else{obj.neprocenjiv=(vrsta==='parnicni'||vrsta==='vanparnicni')&&!_pProcenjiv;obj.nproIdx=obj.neprocenjiv?parseInt(document.getElementById('p-npro').value||0):null;obj.vred=obj.neprocenjiv?0:(parseFloat(document.getElementById('p-vred').value)||0);}
  D.p.push(obj);save();closeM('predmet');render();
  ['p-br','p-tuz','p-tuz2','p-sud','p-tel','p-vred','p-plac','p-bel','p-kd','p-ktn','p-jtuz'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('p-itr').style.display='none';document.getElementById('p-kdi').classList.remove('open');document.getElementById('p-zw').style.display='none';document.getElementById('p-vrsta').value='parnicni';pProcenjiv(true);pVrsta();pUloga('okrivljeni');pSld(false);pSud('osnovni');pSetTuz('osnovno');
}
