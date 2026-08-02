// SERVICE WORKER + NOTIFICATIONS
var swReg = null;
function initSW(){
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(function(r){ swReg = r; }).catch(function(){});
}
function hasN(){ try{ return typeof Notification !== 'undefined'; }catch(e){ return false; } }
function permN(){ try{ return hasN() ? Notification.permission : 'denied'; }catch(e){ return 'denied'; } }
function checkBanner(){ try{ if(hasN() && permN()==='default') document.getElementById('npb').classList.add('show'); }catch(e){} }
function reqPerm(){
  try{
    if(!hasN()){ document.getElementById('npb').classList.remove('show'); return; }
    Notification.requestPermission().then(function(p){
      document.getElementById('npb').classList.remove('show');
      if(p==='granted'){ scheduleAlarms(); sendN('Advokat Pro','Notifikacije aktivirane!'); }
    });
  }catch(e){ document.getElementById('npb').classList.remove('show'); }
}
function sendN(title,body,tag){
  try{
    if(!hasN()||permN()!=='granted') return;
    if(swReg&&swReg.active){ swReg.active.postMessage({type:'SHOW_NOTIFICATION',title:title,body:body,tag:tag||'ap'}); }
    else { try{ new Notification(title,{body:body}); }catch(e2){} }
  }catch(e){}
}
function scheduleAlarms(){
  var alarms=[]; var now=Date.now();
  D.ra.forEach(function(r){
    if(r.tip!=='rociste'||r.status!=='buduci'||!r.vr) return;
    var p=D.p.find(function(x){return x.id===r.pid;});
    var dt=new Date(r.dat+'T'+r.vr).getTime();
    var a1=dt-3600000;
    if(a1>now) alarms.push({id:'r1h_'+r.id,time:a1,title:'⚖ Ročište za 1 sat',body:(p?p.br+' — ':'')+r.naziv+' u '+r.vr+(r.sala?', '+r.sala:'')});
    var a8=new Date(r.dat+'T08:00').getTime();
    if(a8>now) alarms.push({id:'r8_'+r.id,time:a8,title:'📅 Ročište danas',body:(p?p.br+' — ':'')+r.naziv+' u '+r.vr});
  });
  D.k.forEach(function(k){
    var p=D.p.find(function(x){return x.id===k.pid;});
    var db=new Date(k.krajIso+'T00:00'); db.setDate(db.getDate()-1); db.setHours(8,0,0,0);
    if(db.getTime()>now) alarms.push({id:'kpre_'+k.id,time:db.getTime(),title:'⏰ Sutra ističe rok!',body:(p?p.br+' — ':'')+'Poslednji dan: '+fmtD(k.krajIso)});
    var dd=new Date(k.krajIso+'T08:00').getTime();
    if(dd>now) alarms.push({id:'kdan_'+k.id,time:dd,title:'🔴 DANAS ističe rok!',body:(p?p.br+' — ':'')+'Poslednji dan je DANAS'});
  });
  localStorage.setItem('ap_alarms',JSON.stringify(alarms));
}
function checkAlarms(){
  try{
    if(!hasN()||permN()!=='granted') return;
    var now=Date.now();
    var alarms=JSON.parse(localStorage.getItem('ap_alarms')||'[]');
    var fired=JSON.parse(localStorage.getItem('ap_fired')||'[]');
    alarms.forEach(function(a){
      if(a.time<=now&&a.time>now-3600000&&fired.indexOf(a.id)===-1){ sendN(a.title,a.body,a.id); fired.push(a.id); }
    });
    localStorage.setItem('ap_fired',JSON.stringify(fired));
  }catch(e){}
}
setInterval(checkAlarms, 60000);
