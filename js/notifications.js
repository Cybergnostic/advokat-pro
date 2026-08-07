// SERVICE WORKER + NOTIFICATIONS
var swReg = null;
var VAPID_PUBLIC_KEY = 'BC8zQ_raNZBn5HL1-pd9l_ClLL0t7VNlAVrxgJBr2v7XDLNmJTcxRjIddbacBXi0sZqY7TraT-RMMmMuGVaDgb8';

function urlBase64ToUint8Array(base64String){
  var padding='='.repeat((4-base64String.length%4)%4);
  var base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  var raw=atob(base64), out=new Uint8Array(raw.length);
  for(var i=0;i<raw.length;i++) out[i]=raw.charCodeAt(i);
  return out;
}

async function readySW(){
  if(!('serviceWorker' in navigator)) return null;
  if(swReg && swReg.active) return swReg;
  swReg = await navigator.serviceWorker.ready;
  return swReg;
}

async function subscribeToPush(){
  try{
    if(!('PushManager' in window) || permN()!=='granted') return false;
    var reg=await readySW();
    if(!reg) return false;
    var sub=await reg.pushManager.getSubscription();
    if(!sub){
      sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }
    var raw=sub.toJSON ? sub.toJSON() : {};
    var res=await fetch('/api/push/subscribe',{
      method:'POST',
      credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({endpoint:sub.endpoint,keys:(raw&&raw.keys)||{}})
    });
    if(!res.ok) throw new Error('Push registration HTTP '+res.status);
    return true;
  }catch(e){ console.warn('Push subscription failed',e); return false; }
}

function initSW(){
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then(async function(r){
    swReg=r;
    swReg=await navigator.serviceWorker.ready;
    if(permN()==='granted') await subscribeToPush();
  }).catch(function(e){ console.warn('Service worker registration failed',e); });
}
function hasN(){ try{ return typeof Notification !== 'undefined'; }catch(e){ return false; } }
function permN(){ try{ return hasN() ? Notification.permission : 'denied'; }catch(e){ return 'denied'; } }
function checkBanner(){ try{ if(hasN() && permN()==='default') document.getElementById('npb').classList.add('show'); }catch(e){} }
function reqPerm(){
  try{
    if(!hasN()){ document.getElementById('npb').classList.remove('show'); return; }
    Notification.requestPermission().then(async function(p){
      document.getElementById('npb').classList.remove('show');
      if(p==='granted'){
        await subscribeToPush();
        sendN('Advokat Pro','Notifikacije aktivirane!');
      }
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

// Timed hearing/deadline reminders are now sent server-side by the reminder Worker.
// Keep this function for existing callers in actions/deadlines/mutations.
function scheduleAlarms(){
  try{ localStorage.removeItem('ap_alarms'); }catch(e){}
}
function checkAlarms(){}
