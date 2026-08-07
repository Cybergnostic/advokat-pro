// DETAIL MODAL
async function loadDetailTariff(p){
  var el=document.getElementById('detail-tariff');if(!el||!p)return;
  var cfg=getCaseCfg(p.vrsta);
  try{
    var html='';
    if(cfg.isCriminal){
      var data=await apiRequest('/api/tariff',{method:'POST',body:JSON.stringify({op:'calculator',mode:'krivicni',clientRole:p.uloga||'okrivljeni',courtAppointed:!!p.sld})});
      var bands=data&&data.result&&data.result.bands||[];
      var row=bands.find(function(x){return Number(x.id)===Number(p.kazna||0);});
      if(row){
        html='<div class="ds">Tarifa 2025 — T.br.1</div><div class="tt"><div class="tt-h">'
          +esc(p.uloga==='osteceni'?'Punomoćnik oštećenog':p.uloga==='osumnjiceni'?'Branilac osumnjičenog':'Branilac okrivljenog')
          +(p.sld?' · Po sl. dužnosti':'')+' · '+esc(row.label)+'</div>'
          +'<div class="tt-r"><span class="tt-l">Odbrana na pretresu</span><span class="tt-v">'+fmt(row.od)+'</span></div>'
          +'<div class="tt-r"><span class="tt-l">Zastupl. oštećenog / neodržan</span><span class="tt-v">'+fmt(row.zo)+'</span></div>'
          +'<div class="tt-r"><span class="tt-l">Inicijalni akti</span><span class="tt-v">'+fmt(row.ini)+'</span></div>'
          +'<div class="tt-r"><span class="tt-l">Ostali podnesci</span><span class="tt-v">'+fmt(row.ost)+'</span></div>'
          +'<div class="tt-r"><span class="tt-l">Žalba na presudu</span><span class="tt-v hi">'+fmt(row.zal)+'</span></div></div>';
      }
    }else if(cfg.tariffFamily==='civil'||cfg.tariffFamily==='enforcement'){
      var preview=await apiRequest('/api/tariff',{method:'POST',body:JSON.stringify({op:'preview',caseType:p.vrsta,disputeValue:p.vred||0,nonAssessable:!!p.neprocenjiv,nonAssessableIndex:p.nproIdx||0})});
      var pr=preview&&preview.result,t=pr&&pr.tariff;
      if(t){
        html='<div class="ds">Tarifa 2025</div><div class="tt"><div class="tt-h">'+esc(VL[p.vrsta]||p.vrsta)+' · '
          +(p.neprocenjiv?esc(pr.title):((p.vred||0).toLocaleString('sr-RS')+' din'))+'</div>'
          +'<div class="tt-r"><span class="tt-l">Podnesak</span><span class="tt-v">'+fmt(t.pod)+'</span></div><div class="tt-r"><span class="tt-l">Ročište</span><span class="tt-v">'+fmt(t.roc)+'</span></div><div class="tt-r"><span class="tt-l">Neodržano</span><span class="tt-v">'+fmt(t.neo)+'</span></div><div class="tt-r"><span class="tt-l">Žalba</span><span class="tt-v hi">'+fmt(t.zal)+'</span></div></div>';
      }
      if(p.vred&&p.tipSuda&&(p.vrsta==='parnicni'||p.vrsta==='izvrsni')){
        var calc=await apiRequest('/api/tariff',{method:'POST',body:JSON.stringify({op:'calculator',mode:p.vrsta,value:p.vred,courtType:p.tipSuda})});
        var st=calc&&calc.result&&calc.result.courtFee;
        if(st)html+='<div class="ds">Sudska taksa — '+esc(SUDL[p.tipSuda]||p.tipSuda)+'</div><div class="tt"><div class="tt-r"><span class="tt-l">Taksa za tužbu</span><span class="tt-v">'+fmt(st.tuzba)+'</span></div><div class="tt-r"><span class="tt-l">Taksa za presudu</span><span class="tt-v">'+fmt(st.presuda)+'</span></div><div class="tt-r"><span class="tt-l">Žalba</span><span class="tt-v hi">'+fmt(st.zalba)+'</span></div></div>';
      }
    }
    if(document.getElementById('detail-tariff'))document.getElementById('detail-tariff').innerHTML=html;
  }catch(e){console.warn('Detail tariff failed',e);}
}

function openDetail(id){
  var p=D.p.find(function(x){return x.id===id;});if(!p)return;
  var cfg=getCaseCfg(p.vrsta);
  var radnje=D.ra.filter(function(r){return r.pid===id;}).sort(function(a,b){return (a.dat+(a.vr||'')).localeCompare(b.dat+(b.vr||''));});
  var podnesci=radnje.filter(function(r){return r.tip==='podnesak';});
  var rokovi=D.k.filter(function(k){return k.pid===id;});
  var today=todayIso();
  var buducaR=radnje.filter(function(r){return r.tip==='rociste'&&r.status==='buduci'&&r.dat>=today;});
  var evidR=radnje.filter(function(r){return r.status!=='buduci';});
  var ukupno=0;evidR.forEach(function(r){ukupno+=calcIz(r,p);});
  var pct=ukupno?Math.min(100,Math.round(((p.plac||0)/ukupno)*100)):0;
  var isK=!!cfg.isCriminal,tel=safeTel(p.tel);

  var krivInfo='';
  if(isK){
    krivInfo='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px"><span class="bdg bb2">'+esc(p.uloga==='osteceni'?'Punomoćnik oštećenog':p.uloga==='osumnjiceni'?'Branilac osumnjičenog':'Branilac okrivljenog')+'</span><span class="bdg bg">'+esc(KL[p.kazna||0]||'')+'</span>'+(p.sld?'<span class="bdg bp2">Po sl. dužnosti · −50%</span>':'')+(p.kdNaziv?'<span class="bdg bg">'+esc(p.kdNaziv)+'</span>':'')+'</div>';
  }

  var lbl1=p.lbl1||'Klijent',lbl2=p.lbl2||'Protivna stranka';
  var tHTML=evidR.length
    ?evidR.map(function(r){var iz=calcIz(r,p),isNeo=r.tip==='rociste'&&r.status==='odlozeno',isSld=isK&&p.sld&&iz>0;return'<div class="tri"><div class="tri-l"><div class="tri-n">'+esc(r.naziv)+'</div><div class="tri-m">'+esc(fmtD(r.dat))+(r.vr?' u '+esc(r.vr):'')+(r.tip==='rociste'?' · '+esc(SL[r.status]||''):'')+(isNeo?' → neodržano':'')+(isSld?' · po sl. dužnosti':'')+(r.nap?'<br>'+esc(r.nap):'')+'</div></div><div class="tri-i'+(isNeo?' neo':isSld?' sld':'')+'">'+fmt(iz)+'</div></div>';}).join('')
    +'<div class="tri" style="background:var(--gf)"><div class="tri-l"><div class="tri-n" style="font-weight:700;color:var(--gd2)">Ukupno</div></div><div class="tri-i" style="color:var(--gd);font-size:17px;font-family:\'Cormorant Garamond\',serif;font-weight:700">'+fmt(ukupno)+'</div></div>'
    :'<div class="tri"><span style="font-size:12px;color:var(--t3)">Nema evidentiranih radnji.</span></div>';

  var podHTML=podnesci.length?podnesci.map(function(r,i){
    var fs=(r.files||[]).map(function(f){return '<button class="btn btn-out" style="font-size:10px;padding:5px 8px" onclick="openStoredFile(\''+f.id+'\')">📎 '+esc(f.name)+' · '+esc(fmtFileSize(f.size))+'</button>';}).join('');
    return '<div class="submission-row"><div class="submission-no">'+(i+1)+'</div><div class="submission-main"><div class="tri-n">'+esc(r.naziv)+'</div><div class="tri-m">Podneto: '+esc(fmtD(r.dat))+(r.vr?' u '+esc(r.vr):'')+(r.nap?'<br>'+esc(r.nap):'')+'</div>'+(fs?'<div class="submission-files">'+fs+'</div>':'<div class="tri-m" style="margin-top:5px">Nema priložene datoteke.</div>')+'</div><button class="btn btn-rd" style="font-size:10px;padding:5px 8px" onclick="delRadnja(\''+r.id+'\',\''+p.id+'\')">Obriši</button></div>';
  }).join(''):'<div class="tri"><span style="font-size:12px;color:var(--t3)">Nema evidentiranih podnesaka.</span></div>';

  var paymentHTML=(p.uplate||[]).length?(p.uplate||[]).slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date));}).map(function(pay){return '<div class="tt-r"><div class="tt-l"><b>'+fmt(Number(pay.amount||0))+'</b><br><span style="font-size:10px;color:var(--t3)">'+esc(fmtD(pay.date))+(pay.createdByName?' · '+esc(pay.createdByName):'')+(pay.notes?' · '+esc(pay.notes):'')+'</span></div><button class="btn btn-rd" style="font-size:10px;padding:4px 7px" onclick="delUplata(\''+pay.id+'\',\''+p.id+'\')">Obriši</button></div>';}).join(''):'<div class="tt-r"><span class="tt-l">Nema evidentiranih uplata.</span></div>';

  document.getElementById('mo-dc').innerHTML=
    '<button class="mc" onclick="closeM(\'detail\')">✕</button>'
    +'<div style="padding-right:36px;margin-bottom:13px"><div style="font-family:\'Cormorant Garamond\',serif;font-size:25px;font-weight:700;color:var(--gd2);letter-spacing:.3px">'+esc(p.br)+'</div><div style="font-size:11px;color:var(--t3);margin-top:2px">'+esc(VL[p.vrsta]||p.vrsta)+(p.sud?' · '+esc(p.sud):'')+(p.tipSuda?' · '+esc(SUDL[p.tipSuda]||p.tipSuda):'')+(p.tipTuzilastva?' · '+esc(TUZL[p.tipTuzilastva]||''):'')+'</div>'+(p.assignedUserName?'<div style="margin-top:6px"><span class="bdg bb2">👤 '+esc(p.assignedUserName)+'</span></div>':'')+'</div>'
    +krivInfo
    +'<div class="tt" style="margin-bottom:12px"><div class="tt-r"><span class="tt-l">'+esc(lbl1)+'</span><span class="tt-v">'+esc(p.tuz)+'</span></div>'
    +(p.tuz2&&!cfg.isProsecution?'<div class="tt-r"><span class="tt-l">'+esc(lbl2)+'</span><span class="tt-v">'+esc(p.tuz2)+'</span></div>':'')
    +(p.ktn?'<div class="tt-r"><span class="tt-l">Broj KTN/KT</span><span class="tt-v">'+esc(p.ktn)+'</span></div>':'')
    +(p.jtuz?'<div class="tt-r"><span class="tt-l">Javni tužilac</span><span class="tt-v">'+esc(p.jtuz)+'</span></div>':'')
    +(p.bel?'<div class="tt-r"><span class="tt-l">Beleška</span><span class="tt-v" style="font-size:12px">'+esc(p.bel)+'</span></div>':'')+'</div>'
    +(tel?'<a href="tel:'+esc(tel)+'" class="cbtn" style="margin-bottom:13px;display:flex;width:fit-content">📞 Pozovi klijenta · '+esc(p.tel)+'</a>':'')
    +'<div class="ds">Podnesci ('+podnesci.length+')</div><div class="tt" style="margin-bottom:9px">'+podHTML+'</div>'
    +'<div class="ds">Evidentirane radnje i troškovi</div><div class="tt" style="margin-bottom:9px">'+tHTML+'</div>'
    +'<div class="ds">Naplata</div><div class="tt" style="margin-bottom:9px"><div class="tt-r"><span class="tt-l">Ukupni troškovi</span><span class="tt-v">'+fmt(ukupno)+'</span></div><div class="tt-r"><span class="tt-l">Plaćeno do sada</span><span class="tt-v" style="color:var(--gr)">'+(p.plac||0).toLocaleString('sr-RS')+' din</span></div><div class="tt-r"><span class="tt-l">Razlika</span><span class="tt-v" style="color:'+(Math.max(0,ukupno-(p.plac||0))>0?'var(--rd)':'var(--gr)')+'">'+fmt(Math.max(0,ukupno-(p.plac||0)))+'</span></div>'+(ukupno?'<div class="tt-r" style="flex-direction:column;align-items:stretch;gap:5px;padding-bottom:12px"><div class="pl"><span>Naplata</span><span>'+pct+'%</span></div><div class="pb"><div class="pf" style="width:'+pct+'%"></div></div></div>':'')+'</div>'
    +'<button class="btn btn-gr" style="margin-bottom:9px;width:100%;justify-content:center;padding:12px;font-size:14px" onclick="addUplata(\''+p.id+'\')">+ Dodaj uplatu</button><div class="tt" style="margin-bottom:13px">'+paymentHTML+'</div>'
    +(buducaR.length?'<div class="ds">Nadolazeća ročišta ('+buducaR.length+')</div>'+buducaR.map(function(r){return'<div class="card cb" style="cursor:default"><div class="cm">📅 <b>'+esc(fmtDT(r.dat,r.vr))+'</b>'+(r.sala?' · '+esc(r.sala):'')+(r.naziv?' · '+esc(r.naziv):'')+(r.nap?'<br>'+esc(r.nap):'')+'</div><div style="margin-top:8px;display:flex;gap:7px"><button class="btn btn-bl" style="font-size:11px;padding:5px 9px" onclick="closeM(\'detail\');openStUpdate(\''+r.id+'\',\''+p.id+'\')">Ažuriraj status</button><button class="btn btn-rd" style="font-size:11px;padding:5px 9px" onclick="delRadnja(\''+r.id+'\',\''+p.id+'\')">Obriši</button></div></div>';}).join(''):'')
    +rokovi.map(function(k){return'<div class="ds">Rok za žalbu</div><div class="card '+(dL(k.krajIso)<=1?'cr':'')+'" style="cursor:default"><div class="ch">'+dpill(dL(k.krajIso))+'</div><div class="cm">⏰ '+Number(k.tr)+' dana od '+esc(fmtD(k.dat))+'<br>Poslednji dan: <b>'+esc(fmtD(k.krajIso))+'</b>'+(k.nap?'<br>'+esc(k.nap):'')+'</div><button class="btn btn-rd" style="margin-top:8px;font-size:11px;padding:5px 9px" onclick="delRok(\''+k.id+'\',\''+p.id+'\')">Obriši</button></div>';}).join('')
    +'<div id="detail-tariff"></div><div class="gd-line"></div><div style="display:flex;gap:8px"><button class="btn btn-gd" style="flex:1;justify-content:center;padding:11px;font-size:13px" onclick="closeM(\'detail\');openM(\'radnja\',\''+p.id+'\',null)">+ Radnja</button><button class="btn btn-out" style="flex:1;justify-content:center;padding:11px;font-size:13px" onclick="closeM(\'detail\');openM(\'rok\',\''+p.id+'\')">+ Rok</button></div>'
    +'<button class="btn btn-rd" style="margin-top:9px;width:100%;justify-content:center;padding:11px;font-size:13px" onclick="delPredmet(\''+p.id+'\')">🗑 Obriši predmet</button>';
  document.getElementById('mo-detail').classList.add('open');loadDetailTariff(p);
}
