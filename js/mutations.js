// DELETE / UPDATE
function delPredmet(id){if(!confirm('Obrisati predmet?'))return;var rr=D.ra.filter(function(x){return x.pid===id;});rr.forEach(function(r){deleteStoredFiles(r.files||[]);});D.p=D.p.filter(function(x){return x.id!==id;});D.ra=D.ra.filter(function(x){return x.pid!==id;});D.k=D.k.filter(function(x){return x.pid!==id;});save();closeM('detail');render();}
function delRadnja(id,pid){var r=D.ra.find(function(x){return x.id===id;});if(r)deleteStoredFiles(r.files||[]);D.ra=D.ra.filter(function(x){return x.id!==id;});save();scheduleAlarms();if(pid)openDetail(pid);else{render();if(calSel)renderCal();}}
function delRok(id,pid){D.k=D.k.filter(function(x){return x.id!==id;});save();scheduleAlarms();if(pid)openDetail(pid);else render();}
function addUplata(id){var iz=parseFloat(prompt('Iznos uplate (RSD):'));if(!iz||isNaN(iz))return;var p=D.p.find(function(x){return x.id===id;});if(p){p.plac=(p.plac||0)+iz;save();openDetail(id);}}
function openStUpdate(raId,pid){
  var ra=D.ra.find(function(x){return x.id===raId;}); if(!ra) return;
  document.getElementById('upd-id').value=raId;document.getElementById('upd-pid').value=pid;
  document.getElementById('st-info').textContent=ra.naziv+' · '+fmtD(ra.dat);
  var m={odrzano:'agr',odlozeno:'ar',buduci:'ab'};
  ['od','ol','bu'].forEach(function(x,i){var k=['odrzano','odlozeno','buduci'][i];document.getElementById('upd-'+x).className='tg'+(k===ra.status?' '+m[k]:'');});
  document.getElementById('mo-status').classList.add('open');
}
function updSt(s){
  var id=document.getElementById('upd-id').value;var pid=document.getElementById('upd-pid').value;
  var ra=D.ra.find(function(x){return x.id===id;});
  if(ra){ra.status=s;save();scheduleAlarms();closeM('status');openDetail(pid);}
}
