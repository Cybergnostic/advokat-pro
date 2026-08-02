// CALENDAR
var calY=new Date().getFullYear(), calM=new Date().getMonth(), calSel=null;
function calPrev(){calM--;if(calM<0){calM=11;calY--;}calSel=null;renderCal();}
function calNext(){calM++;if(calM>11){calM=0;calY++;}calSel=null;renderCal();}

function calAddHearing(){
  // Open radnja modal with selected date
  openM('radnja',null,calSel);
}

function renderCal(){
  var todayIso=new Date().toISOString().slice(0,10);
  document.getElementById('cal-title').textContent=MONTHS[calM]+' '+calY;
  var first=new Date(calY,calM,1);var off=first.getDay()-1;if(off<0)off=6;
  var dim=new Date(calY,calM+1,0).getDate();
  var evMap={};
  D.ra.forEach(function(r){var d=new Date(r.dat+'T00:00');if(d.getFullYear()===calY&&d.getMonth()===calM){if(!evMap[r.dat])evMap[r.dat]={ra:[],k:[]};evMap[r.dat].ra.push(r);}});
  D.k.forEach(function(k){var d=new Date(k.krajIso+'T00:00');if(d.getFullYear()===calY&&d.getMonth()===calM){if(!evMap[k.krajIso])evMap[k.krajIso]={ra:[],k:[]};evMap[k.krajIso].k.push(k);}});
  var cells='';
  for(var i=0;i<off;i++) cells+='<div class="cell empty"></div>';
  for(var d=1;d<=dim;d++){
    var iso=calY+'-'+String(calM+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var ev=evMap[iso];var isT=iso===todayIso;var isSel=iso===calSel;
    var dots='';if(ev){if(ev.ra.length)dots+='<div class="dot dot-b"></div>'.repeat(Math.min(ev.ra.length,3));if(ev.k.length)dots+='<div class="dot dot-r"></div>'.repeat(Math.min(ev.k.length,2));}
    cells+='<div class="cell'+(isT?' today':'')+(ev?' has-ev':'')+(isSel?' sel':'')+'" onclick="calClick(\''+iso+'\')">'
      +'<div class="cell-n">'+d+'</div>'
      +(dots?'<div class="cdots">'+dots+'</div>':'')
      +'<div class="cell-plus">+</div>'
      +'</div>';
  }
  document.getElementById('cal-cells').innerHTML=cells;
  // Render month events
  renderCalMonth(evMap);
  // Refresh selected day if any
  if(calSel) calShowDay(calSel,evMap);
  else document.getElementById('cal-day-panel').classList.remove('show');
}

function calClick(iso){
  calSel=iso;
  // Update selection highlight
  document.querySelectorAll('.cell:not(.empty)').forEach(function(c){
    c.classList.remove('sel');
    var n=parseInt(c.querySelector('.cell-n').textContent);
    var ci=calY+'-'+String(calM+1).padStart(2,'0')+'-'+String(n).padStart(2,'0');
    if(ci===iso) c.classList.add('sel');
  });
  // Build evMap for this day
  var evMap={};
  D.ra.forEach(function(r){if(r.dat===iso){if(!evMap[iso])evMap[iso]={ra:[],k:[]};evMap[iso].ra.push(r);}});
  D.k.forEach(function(k){if(k.krajIso===iso){if(!evMap[iso])evMap[iso]={ra:[],k:[]};evMap[iso].k.push(k);}});
  calShowDay(iso,evMap);
}

function calShowDay(iso,evMap){
  var panel=document.getElementById('cal-day-panel');
  var d=new Date(iso+'T00:00');
  document.getElementById('cal-day-title').textContent=d.toLocaleDateString('sr-RS',{weekday:'long',day:'numeric',month:'long'});
  var ev=evMap[iso]||{ra:[],k:[]};
  var html='';
  if(!ev.ra.length&&!ev.k.length){
    html='<div style="font-size:12px;color:var(--t3);padding:4px 0">Nema zakazanih događaja. Klikni + Ročište da dodaš.</div>';
  }
  ev.ra.forEach(function(r){
    var p=D.p.find(function(x){return x.id===r.pid;});
    html+='<div class="cev ev-b">'
      +'<div class="cev-t">'+(p?p.br:'?')+' — '+r.naziv+'</div>'
      +'<div class="cev-m">'+(r.vr?r.vr+' ':'')+( r.sala?'· '+r.sala:'')+' · '+(SL[r.status]||r.status)+'</div>'
      +'<div style="margin-top:6px;display:flex;gap:6px">'
      +'<button class="btn btn-bl" style="font-size:10px;padding:4px 8px" onclick="openStUpdate(\''+r.id+'\',\''+r.pid+'\')">Status</button>'
      +'<button class="btn btn-rd" style="font-size:10px;padding:4px 8px" onclick="delRadnja(\''+r.id+'\',null)">Obriši</button>'
      +'</div></div>';
  });
  ev.k.forEach(function(k){
    var p=D.p.find(function(x){return x.id===k.pid;});
    html+='<div class="cev ev-r"><div class="cev-t">'+(p?p.br:'?')+' — Rok za žalbu</div>'
      +'<div class="cev-m">'+k.tr+' dana · Poslednji dan: '+fmtD(k.krajIso)+(k.nap?' · '+k.nap:'')+'</div>'
      +'<button class="btn btn-rd" style="margin-top:6px;font-size:10px;padding:4px 8px" onclick="delRok(\''+k.id+'\',null)">Obriši</button>'
      +'</div>';
  });
  document.getElementById('cal-day-ev').innerHTML=html;
  panel.classList.add('show');
  // Scroll to panel
  setTimeout(function(){panel.scrollIntoView({behavior:'smooth',block:'nearest'});},100);
}

function renderCalMonth(evMap){
  var all=[];
  Object.keys(evMap).sort().forEach(function(iso){
    var ev=evMap[iso];
    ev.ra.forEach(function(r){var p=D.p.find(function(x){return x.id===r.pid;});all.push({iso:iso,t:(p?p.br:'?')+' — '+r.naziv,m:(r.vr?r.vr+' ':'')+( r.sala?'· '+r.sala:''),c:'ev-b',i:'⚖'});});
    ev.k.forEach(function(k){var p=D.p.find(function(x){return x.id===k.pid;});all.push({iso:iso,t:(p?p.br:'?')+' — Rok za žalbu',m:k.tr+' dana',c:'ev-r',i:'⏰'});});
  });
  var el=document.getElementById('cal-mev');
  if(!all.length){el.innerHTML='<div class="empty"><div class="ei">📅</div><div class="et">Nema događaja ovog meseca.</div></div>';return;}
  el.innerHTML=all.map(function(e){return'<div class="cev '+e.c+'"><div class="cev-t">'+fmtDs(e.iso)+' — '+e.t+'</div><div class="cev-m">'+e.i+' '+e.m+'</div></div>';}).join('');
}
