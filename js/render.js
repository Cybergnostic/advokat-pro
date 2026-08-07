// RENDER
function activityText(a){
  var d=a.details||{};
  var verbs={create:'dodao',update:'izmenio',delete:'obrisao',claim:'povezao'};
  var entity={case:'predmet',action:'radnju',deadline:'rok',claim:'potraživanje',payment:'uplatu',attachment:'datoteku',user:'profil'};
  var label=d.caseNumber||d.name||d.fileName||'';
  if(a.entity==='payment'&&d.amount)label=(label?label+' · ':'')+Number(d.amount).toLocaleString('sr-RS')+' din';
  if(a.action==='update'&&d.field==='status')label=(label?label+' · ':'')+String(d.from||'')+' → '+String(d.to||'');
  if(a.action==='claim')return 'povezao korisnički profil';
  return (verbs[a.action]||a.action)+' '+(entity[a.entity]||a.entity)+(label?' · '+label:'');
}

function renderActivity(){
  var wrap=document.getElementById('activity-wrap');
  if(!wrap){
    wrap=document.createElement('div');wrap.id='activity-wrap';
    var ncc=document.getElementById('ncc');if(ncc)ncc.insertAdjacentElement('afterend',wrap);
  }
  var items=(D.activity||[]).slice(0,8);
  if(!items.length){wrap.innerHTML='';return;}
  wrap.innerHTML='<div class="ds" style="margin-top:10px">Nedavna aktivnost</div><div class="tt" style="margin-bottom:13px">'
    +items.map(function(a){return '<div class="tt-r"><div class="tt-l"><b>'+esc(a.userName)+'</b><br><span style="font-size:10px;color:var(--t3)">'+esc(activityText(a))+'</span></div><div style="font-size:10px;color:var(--t3);white-space:nowrap">'+esc(new Date(String(a.createdAt).replace(' ','T')+'Z').toLocaleString('sr-RS',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}))+'</div></div>';}).join('')
    +'</div>';
}

function render(){
  var today=todayIso();
  document.getElementById('sn-p').textContent=D.p.length;
  document.getElementById('sn-r').textContent=D.ra.filter(function(r){return r.tip==='rociste'&&r.status==='buduci'&&r.dat>=today;}).length;
  document.getElementById('sn-k').textContent=D.k.filter(function(k){return k.krajIso>=today;}).length;
  document.getElementById('sn-pot').textContent=D.pot.filter(function(x){return x.status!=='placeno';}).length;

  var notifs=[];
  D.k.forEach(function(k){var days=dL(k.krajIso);var p=D.p.find(function(x){return x.id===k.pid;});if(days===0)notifs.push('⚠️ DANAS ističe rok — '+(p?p.br:'')+' '+(k.nap||''));if(days===1)notifs.push('Sutra ističe rok — '+(p?p.br:'')+' '+(k.nap||''));});
  D.ra.forEach(function(r){if(r.dat===today&&r.tip==='rociste'&&r.status==='buduci'){var p=D.p.find(function(x){return x.id===r.pid;});notifs.push('📅 Ročište danas'+(r.vr?' u '+r.vr:'')+' — '+(p?p.br:'?')+' '+(r.sala||''));}});
  document.getElementById('ncc').innerHTML=notifs.map(function(n){return'<div class="alr"><div style="font-size:17px;flex-shrink:0">🔔</div><div><div class="alr-t">Podsetnik</div><div class="alr-x">'+esc(n)+'</div></div></div>';}).join('');
  renderActivity();

  var pl=document.getElementById('lp');
  if(!D.p.length){pl.innerHTML='<div class="empty"><div class="ei">⚖</div><div class="et">Nema predmeta.<br>Dodajte prvi predmet.</div></div>';}
  else pl.innerHTML=D.p.map(function(p){
    var urgent=D.k.some(function(k){return k.pid===p.id&&dL(k.krajIso)>=0&&dL(k.krajIso)<=1;});
    var nextR=D.ra.filter(function(r){return r.pid===p.id&&r.tip==='rociste'&&r.status==='buduci'&&r.dat>=today;}).sort(function(a,b){return a.dat.localeCompare(b.dat);})[0];
    var evidR=D.ra.filter(function(r){return r.pid===p.id&&r.status!=='buduci';});
    var ukupno=0;evidR.forEach(function(r){ukupno+=calcIz(r,p);});
    var pct=ukupno?Math.min(100,Math.round(((p.plac||0)/ukupno)*100)):0;
    var cfg=getCaseCfg(p.vrsta);var isK=!!cfg.isCriminal;var tel=safeTel(p.tel);
    return '<div class="card '+(urgent?'cr':'cg')+'" onclick="openDetail(\''+p.id+'\')">'
      +'<div class="ch"><div class="cn">'+esc(p.br)+'</div><div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">'
      +(p.assignedUserName?'<span class="bdg bb2">👤 '+esc(p.assignedUserName)+'</span>':'<span class="bdg bo">Nedodeljen</span>')
      +'<span class="bdg bg">'+esc(VL[p.vrsta]||p.vrsta)+'</span><button class="btn btn-rd" style="font-size:11px;padding:4px 8px" title="Obriši predmet" onclick="event.stopPropagation();delPredmet(\''+p.id+'\')">🗑 Obriši</button></div></div>'
      +'<div class="cm">'+esc(p.lbl1||'Klijent')+': <b>'+esc(p.tuz)+'</b>'
      +(p.tuz2&&!cfg.isProsecution?'<br>'+esc(p.lbl2||'Protivnik')+': '+esc(p.tuz2):'')
      +(p.sud?'<br>🏛 '+esc(p.sud):'')
      +(isK&&p.kdNaziv?'<br>⚖ '+esc(p.kdNaziv)+(p.sld?' · sl. dužnost':''):'')
      +(!isK&&p.vred?'<br>💰 <b>'+p.vred.toLocaleString('sr-RS')+' din</b>':'')
      +(nextR?'<br>📅 <b>'+esc(fmtDT(nextR.dat,nextR.vr))+'</b>':'')
      +(ukupno?'<br>📋 <b>'+ukupno.toLocaleString('sr-RS')+' din</b>':'')+'</div>'
      +(tel?'<div style="margin-top:9px"><a href="tel:'+esc(tel)+'" class="cbtn" onclick="event.stopPropagation()">📞 '+esc(p.tel)+'</a></div>':'')
      +(ukupno?'<div class="pw"><div class="pl"><span>Plaćeno</span><span>'+(p.plac||0).toLocaleString('sr-RS')+' din · '+pct+'%</span></div><div class="pb"><div class="pf" style="width:'+pct+'%"></div></div></div>':'')
      +'</div>';
  }).join('');

  var rl=document.getElementById('lr');
  var fR=D.ra.filter(function(r){return r.tip==='rociste'&&r.status==='buduci'&&r.dat>=today;}).sort(function(a,b){return a.dat.localeCompare(b.dat);});
  if(!fR.length){rl.innerHTML='<div class="empty"><div class="ei">📅</div><div class="et">Nema zakazanih ročišta.</div></div>';}
  else rl.innerHTML=fR.map(function(r){
    var p=D.p.find(function(x){return x.id===r.pid;});var tel=p?safeTel(p.tel):'';
    return'<div class="card '+(r.dat===today?'cr':'cb')+'">'
      +'<div class="ch"><div class="cn">'+esc(p?p.br:'?')+'</div>'+(r.dat===today?'<span class="bdg br2">🔴 Danas</span>':'')+'</div>'
      +'<div class="cm">📅 <b>'+esc(fmtDT(r.dat,r.vr))+'</b>'+(r.sala?'<br>🏛 '+esc(r.sala):'')+(r.naziv?'<br>⚖ '+esc(r.naziv):'')+(p?'<br>'+esc(p.lbl1||'Klijent')+': '+esc(p.tuz):'')+(r.nap?'<br>'+esc(r.nap):'')+'</div>'
      +(p&&tel?'<div style="margin-top:9px"><a href="tel:'+esc(tel)+'" class="cbtn">📞 Pozovi klijenta</a></div>':'')
      +'<div style="margin-top:9px;display:flex;gap:7px"><button class="btn btn-bl" style="font-size:11px;padding:5px 9px" onclick="openStUpdate(\''+r.id+'\',\''+r.pid+'\')">Ažuriraj status</button><button class="btn btn-rd" style="font-size:11px;padding:5px 9px" onclick="delRadnja(\''+r.id+'\',null)">Obriši</button></div></div>';
  }).join('');

  var kl=document.getElementById('lk');
  var fK=D.k.filter(function(k){return k.krajIso>=today;}).sort(function(a,b){return a.krajIso.localeCompare(b.krajIso);});
  if(!fK.length){kl.innerHTML='<div class="empty"><div class="ei">⏰</div><div class="et">Nema unetih rokova.</div></div>';}
  else kl.innerHTML=fK.map(function(k){
    var p=D.p.find(function(x){return x.id===k.pid;});var days=dL(k.krajIso);var tel=p?safeTel(p.tel):'';
    return'<div class="card '+(days<=1?'cr':'')+'"><div class="ch"><div class="cn">'+esc(p?p.br:'?')+'</div>'+dpill(days)+'</div>'
      +'<div class="cm">⏰ Rok: <b>'+Number(k.tr)+' dana</b><br>Odluka: '+esc(fmtD(k.dat))+'<br>Poslednji dan: <b>'+esc(fmtD(k.krajIso))+'</b>'+(p?'<br>'+esc(p.lbl1||'Klijent')+': '+esc(p.tuz):'')+(k.nap?'<br>'+esc(k.nap):'')+'</div>'
      +(p&&tel?'<div style="margin-top:9px"><a href="tel:'+esc(tel)+'" class="cbtn">📞 Pozovi klijenta</a></div>':'')
      +'<div style="margin-top:9px"><button class="btn btn-rd" style="font-size:11px;padding:5px 9px" onclick="delRok(\''+k.id+'\',null)">Obriši</button></div></div>';
  }).join('');
}
