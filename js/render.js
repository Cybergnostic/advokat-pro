// RENDER
function render(){
  var today=new Date().toISOString().slice(0,10);
  document.getElementById('sn-p').textContent=D.p.length;
  document.getElementById('sn-r').textContent=D.ra.filter(function(r){return r.tip==='rociste'&&r.status==='buduci'&&r.dat>=today;}).length;
  document.getElementById('sn-k').textContent=D.k.filter(function(k){return k.krajIso>=today;}).length;
  document.getElementById('sn-pot').textContent=D.pot.filter(function(x){return x.status!=='placeno';}).length;

  // Notifications
  var notifs=[];
  D.k.forEach(function(k){var days=dL(k.krajIso);var p=D.p.find(function(x){return x.id===k.pid;});if(days===0)notifs.push('⚠️ DANAS ističe rok — '+(p?p.br:'')+' '+(k.nap||''));if(days===1)notifs.push('Sutra ističe rok — '+(p?p.br:'')+' '+(k.nap||''));});
  D.ra.forEach(function(r){if(r.dat===today&&r.tip==='rociste'&&r.status==='buduci'){var p=D.p.find(function(x){return x.id===r.pid;});notifs.push('📅 Ročište danas'+(r.vr?' u '+r.vr:'')+' — '+(p?p.br:'?')+' '+(r.sala||''));}});
  document.getElementById('ncc').innerHTML=notifs.map(function(n){return'<div class="alr"><div style="font-size:17px;flex-shrink:0">🔔</div><div><div class="alr-t">Podsetnik</div><div class="alr-x">'+n+'</div></div></div>';}).join('');

  // Predmeti
  var pl=document.getElementById('lp');
  if(!D.p.length){pl.innerHTML='<div class="empty"><div class="ei">⚖</div><div class="et">Nema predmeta.<br>Dodajte prvi predmet.</div></div>';}
  else pl.innerHTML=D.p.map(function(p){
    var urgent=D.k.some(function(k){return k.pid===p.id&&dL(k.krajIso)>=0&&dL(k.krajIso)<=1;});
    var nextR=D.ra.filter(function(r){return r.pid===p.id&&r.tip==='rociste'&&r.status==='buduci'&&r.dat>=today;}).sort(function(a,b){return a.dat.localeCompare(b.dat);})[0];
    var evidR=D.ra.filter(function(r){return r.pid===p.id&&r.status!=='buduci';});
    var ukupno=0;evidR.forEach(function(r){ukupno+=calcIz(r,p);});
    var pct=ukupno?Math.min(100,Math.round(((p.plac||0)/ukupno)*100)):0;
    var cfg=getCaseCfg(p.vrsta);
    var isK=!!cfg.isCriminal;
    return '<div class="card '+(urgent?'cr':'cg')+'" onclick="openDetail(\''+p.id+'\')">'
      +'<div class="ch"><div class="cn">'+p.br+'</div><div style="display:flex;align-items:center;gap:7px"><span class="bdg bg">'+(VL[p.vrsta]||p.vrsta)+'</span><button class="btn btn-rd" style="font-size:11px;padding:4px 8px" title="Obriši predmet" onclick="event.stopPropagation();delPredmet(\''+p.id+'\')">🗑 Obriši</button></div></div>'
      +'<div class="cm">'+(p.lbl1||'Klijent')+': <b>'+p.tuz+'</b>'
      +(p.tuz2&&!cfg.isProsecution?'<br>'+(p.lbl2||'Protivnik')+': '+p.tuz2:'')
      +(p.sud?'<br>🏛 '+p.sud:'')
      +(isK&&p.kdNaziv?'<br>⚖ '+p.kdNaziv+(p.sld?' · sl. dužnost':''):'')
      +(!isK&&p.vred?'<br>💰 <b>'+p.vred.toLocaleString('sr-RS')+' din</b>':'')
      +(nextR?'<br>📅 <b>'+fmtDT(nextR.dat,nextR.vr)+'</b>':'')
      +(ukupno?'<br>📋 <b>'+ukupno.toLocaleString('sr-RS')+' din</b>':'')+'</div>'
      +(p.tel?'<div style="margin-top:9px"><a href="tel:'+p.tel+'" class="cbtn" onclick="event.stopPropagation()">📞 '+p.tel+'</a></div>':'')
      +(ukupno?'<div class="pw"><div class="pl"><span>Plaćeno</span><span>'+(p.plac||0).toLocaleString('sr-RS')+' din · '+pct+'%</span></div><div class="pb"><div class="pf" style="width:'+pct+'%"></div></div></div>':'')
      +'</div>';
  }).join('');

  // Ročišta
  var rl=document.getElementById('lr');
  var fR=D.ra.filter(function(r){return r.tip==='rociste'&&r.status==='buduci'&&r.dat>=today;}).sort(function(a,b){return a.dat.localeCompare(b.dat);});
  if(!fR.length){rl.innerHTML='<div class="empty"><div class="ei">📅</div><div class="et">Nema zakazanih ročišta.</div></div>';}
  else rl.innerHTML=fR.map(function(r){
    var p=D.p.find(function(x){return x.id===r.pid;});
    return'<div class="card '+(r.dat===today?'cr':'cb')+'">'
      +'<div class="ch"><div class="cn">'+(p?p.br:'?')+'</div>'+(r.dat===today?'<span class="bdg br2">🔴 Danas</span>':'')+'</div>'
      +'<div class="cm">📅 <b>'+fmtDT(r.dat,r.vr)+'</b>'+(r.sala?'<br>🏛 '+r.sala:'')+(r.naziv?'<br>⚖ '+r.naziv:'')+(p?'<br>'+(p.lbl1||'Klijent')+': '+p.tuz:'')+(r.nap?'<br>'+r.nap:'')+'</div>'
      +(p&&p.tel?'<div style="margin-top:9px"><a href="tel:'+p.tel+'" class="cbtn">📞 Pozovi klijenta</a></div>':'')
      +'<div style="margin-top:9px;display:flex;gap:7px">'
      +'<button class="btn btn-bl" style="font-size:11px;padding:5px 9px" onclick="openStUpdate(\''+r.id+'\',\''+r.pid+'\')">Ažuriraj status</button>'
      +'<button class="btn btn-rd" style="font-size:11px;padding:5px 9px" onclick="delRadnja(\''+r.id+'\',null)">Obriši</button>'
      +'</div></div>';
  }).join('');

  // Rokovi
  var kl=document.getElementById('lk');
  var fK=D.k.filter(function(k){return k.krajIso>=today;}).sort(function(a,b){return a.krajIso.localeCompare(b.krajIso);});
  if(!fK.length){kl.innerHTML='<div class="empty"><div class="ei">⏰</div><div class="et">Nema unetih rokova.</div></div>';}
  else kl.innerHTML=fK.map(function(k){
    var p=D.p.find(function(x){return x.id===k.pid;});var days=dL(k.krajIso);
    return'<div class="card '+(days<=1?'cr':'')+'">'
      +'<div class="ch"><div class="cn">'+(p?p.br:'?')+'</div>'+dpill(days)+'</div>'
      +'<div class="cm">⏰ Rok: <b>'+k.tr+' dana</b><br>Odluka: '+fmtD(k.dat)+'<br>Poslednji dan: <b>'+fmtD(k.krajIso)+'</b>'+(p?'<br>'+(p.lbl1||'Klijent')+': '+p.tuz:'')+(k.nap?'<br>'+k.nap:'')+'</div>'
      +(p&&p.tel?'<div style="margin-top:9px"><a href="tel:'+p.tel+'" class="cbtn">📞 Pozovi klijenta</a></div>':'')
      +'<div style="margin-top:9px"><button class="btn btn-rd" style="font-size:11px;padding:5px 9px" onclick="delRok(\''+k.id+'\',null)">Obriši</button></div>'
      +'</div>';
  }).join('');
}
