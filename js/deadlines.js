// ROK FORM
function calcRok(){
  var od=document.getElementById('rk-dat').value;
  var tr=parseInt(document.getElementById('rk-tr').value);
  var out=document.getElementById('rk-kraj');
  if(!od){out.value='';delete out.dataset.iso;return;}
  var p=od.split('-').map(Number);
  if(p.length!==3||!Number.isInteger(tr)){out.value='';delete out.dataset.iso;return;}
  // Calculate on a UTC calendar. This avoids Serbia local midnight becoming the
  // previous UTC date when converted with toISOString().
  var d=new Date(Date.UTC(p[0],p[1]-1,p[2]));
  d.setUTCDate(d.getUTCDate()+tr);
  var iso=d.toISOString().slice(0,10);
  out.value=fmtD(iso);
  out.dataset.iso=iso;
}
async function saveRok(){
  var pid=document.getElementById('rk-pred').value;
  var dat=document.getElementById('rk-dat').value;
  var krajIso=document.getElementById('rk-kraj').dataset.iso;
  if(!pid){alert('Izaberite predmet.');return;}
  if(!dat||!krajIso){alert('Unesite datum odluke.');return;}
  var obj={id:newId(),pid:pid,dat:dat,tr:parseInt(document.getElementById('rk-tr').value),krajIso:krajIso,nap:document.getElementById('rk-nap').value.trim()};
  try{
    var result=await dbMutate({entity:'deadline',action:'create',record:obj});
    // Server independently calculates the due date and remains authoritative.
    obj.krajIso=result&&result.due_date?result.due_date:obj.krajIso;
  }catch(e){dbError(e);return;}
  D.k.push(obj);closeM('rok');scheduleAlarms();render();
}
