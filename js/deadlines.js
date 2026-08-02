// ROK FORM
function calcRok(){
  var od=document.getElementById('rk-dat').value;
  var tr=parseInt(document.getElementById('rk-tr').value);
  if(!od){document.getElementById('rk-kraj').value='';return;}
  var d=new Date(od+'T00:00');d.setDate(d.getDate()+tr);
  var iso=d.toISOString().slice(0,10);
  document.getElementById('rk-kraj').value=fmtD(iso);
  document.getElementById('rk-kraj').dataset.iso=iso;
}
function saveRok(){
  var pid=document.getElementById('rk-pred').value;
  var dat=document.getElementById('rk-dat').value;
  var krajIso=document.getElementById('rk-kraj').dataset.iso;
  if(!pid){alert('Izaberite predmet.');return;}
  if(!dat||!krajIso){alert('Unesite datum odluke.');return;}
  D.k.push({id:Date.now().toString(),pid:pid,dat:dat,tr:parseInt(document.getElementById('rk-tr').value),krajIso:krajIso,nap:document.getElementById('rk-nap').value.trim()});
  save();closeM('rok');scheduleAlarms();render();
}
