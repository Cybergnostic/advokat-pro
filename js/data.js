// DATA — authoritative state is loaded from Cloudflare D1
var D = {p:[],ra:[],k:[],pot:[],arh:[],activity:[],revision:0};
var CURRENT_USER=null, USERS=[], STATE_REVISION=0, REMOTE_PENDING=false, REFRESHING_STATE=false;
function save(){}

async function apiRequest(url, options) {
  var res = await fetch(url, Object.assign({
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  }, options || {}));
  var data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error((data && data.error) || ('HTTP ' + res.status));
  return data;
}

function chooseUserProfile(users){
  return new Promise(function(resolve,reject){
    if(!users.length){reject(new Error('Nema slobodnog korisničkog profila za ovaj Access nalog.'));return;}
    var overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(7,7,13,.96);display:flex;align-items:center;justify-content:center;padding:20px';
    var card=document.createElement('div');
    card.style.cssText='width:min(420px,100%);background:var(--bg2,#15151f);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.45)';
    var title=document.createElement('div');title.textContent='Ko koristi ovaj nalog?';title.style.cssText='font-size:22px;font-weight:700;margin-bottom:7px';
    var text=document.createElement('div');text.textContent='Izaberi svoj profil. Ovaj izbor će biti povezan sa tvojim Cloudflare Access nalogom.';text.style.cssText='font-size:13px;line-height:1.45;color:var(--t2);margin-bottom:16px';
    card.appendChild(title);card.appendChild(text);
    users.forEach(function(u){
      var b=document.createElement('button');
      b.type='button';b.className='btn btn-out';
      b.style.cssText='width:100%;justify-content:space-between;margin:7px 0;padding:12px 14px';
      var name=document.createElement('span');name.textContent=u.displayName;
      var role=document.createElement('span');role.textContent=u.role==='dev'?'Developer':'Advokat';role.style.opacity='.65';
      b.appendChild(name);b.appendChild(role);
      b.onclick=async function(){
        Array.from(card.querySelectorAll('button')).forEach(function(x){x.disabled=true;});
        try{
          var result=await apiRequest('/api/session',{method:'POST',body:JSON.stringify({userId:u.id})});
          overlay.remove();resolve(result.current);
        }catch(e){
          Array.from(card.querySelectorAll('button')).forEach(function(x){x.disabled=false;});
          alert('Profil nije povezan.\n\n'+e.message);
        }
      };
      card.appendChild(b);
    });
    overlay.appendChild(card);document.body.appendChild(overlay);
  });
}

function installUserUi(){
  if(!CURRENT_USER)return;
  var hdr=document.querySelector('.hdr-r');
  if(hdr&&!document.getElementById('current-user-badge')){
    var badge=document.createElement('div');badge.id='current-user-badge';
    badge.textContent=CURRENT_USER.displayName+(CURRENT_USER.role==='dev'?' · dev':'');
    badge.style.cssText='font-size:11px;padding:7px 9px;border:1px solid rgba(255,255,255,.15);border-radius:999px;white-space:nowrap;color:var(--t2)';
    hdr.insertBefore(badge,hdr.firstChild);
  }

  var vrsta=document.getElementById('p-vrsta');
  if(vrsta&&!document.getElementById('p-assigned')){
    var fg=document.createElement('div');fg.className='fg';
    var label=document.createElement('label');label.className='fl';label.textContent='Zaduženi korisnik';
    var select=document.createElement('select');select.className='fi';select.id='p-assigned';
    USERS.forEach(function(u){
      var opt=document.createElement('option');opt.value=u.id;opt.textContent=u.displayName+(u.role==='dev'?' (dev)':'');select.appendChild(opt);
    });
    select.value=CURRENT_USER.id;
    fg.appendChild(label);fg.appendChild(select);
    vrsta.closest('.fg').insertAdjacentElement('afterend',fg);
  }

  var storageNote=document.querySelector('#ra-file-wrap .tc-sub');
  if(storageNote)storageNote.textContent='PDF, Word ili slika. Datoteke se čuvaju u privatnom zajedničkom skladištu kancelarije.';
}

async function initSession(){
  var session=await apiRequest('/api/session',{method:'GET',headers:{}});
  USERS=session.users||[];
  CURRENT_USER=session.current;
  if(!CURRENT_USER)CURRENT_USER=await chooseUserProfile(session.claimableUsers||[]);
  installUserUi();
  return CURRENT_USER;
}

async function loadSharedState() {
  var state = await apiRequest('/api/state', { method: 'GET', headers: {} });
  D = state;
  if(!D.p) D.p=[];
  if(!D.ra) D.ra=[];
  if(!D.k) D.k=[];
  if(!D.pot) D.pot=[];
  if(!D.arh) D.arh=[];
  if(!D.activity) D.activity=[];
  D.ra.forEach(function(r){ if(!r.files) r.files=[]; });
  D.p.forEach(function(p){ if(!p.uplate)p.uplate=[]; });
  STATE_REVISION=Number(D.revision||0);
  REMOTE_PENDING=false;
  hideSyncNotice();
  return D;
}

function hasOpenModal(){return !!document.querySelector('.mo.open');}
function showSyncNotice(){
  if(document.getElementById('sync-notice'))return;
  var el=document.createElement('button');el.id='sync-notice';el.type='button';
  el.textContent='↻ Dostupne su nove izmene';
  el.style.cssText='position:fixed;right:14px;bottom:16px;z-index:9000;border:0;border-radius:999px;padding:10px 14px;font-weight:700;box-shadow:0 8px 30px rgba(0,0,0,.3);cursor:pointer';
  el.onclick=function(){refreshSharedState(true);};
  document.body.appendChild(el);
}
function hideSyncNotice(){var el=document.getElementById('sync-notice');if(el)el.remove();}

function renderAfterRefresh(){
  if(typeof render==='function')render();
  var active=document.querySelector('.pg.active');
  if(active&&active.id==='pg-kalendar'&&typeof renderCal==='function')renderCal();
  if(active&&active.id==='pg-potrazivanja'&&typeof renderPot==='function')renderPot();
  if(typeof renderActivity==='function')renderActivity();
}

async function refreshSharedState(force){
  if(REFRESHING_STATE||document.visibilityState==='hidden')return;
  REFRESHING_STATE=true;
  try{
    if(!force){
      var r=await apiRequest('/api/revision',{method:'GET',headers:{}});
      if(Number(r.revision||0)<=STATE_REVISION)return;
    }
    if(hasOpenModal()){
      REMOTE_PENDING=true;showSyncNotice();return;
    }
    await loadSharedState();renderAfterRefresh();
  }catch(e){console.warn('Background refresh failed',e);}
  finally{REFRESHING_STATE=false;}
}

function flushPendingRefresh(){if(REMOTE_PENDING&&!hasOpenModal())refreshSharedState(true);}

async function dbMutate(payload) {
  return apiRequest('/api/mutate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

function dbError(err) {
  console.error(err);
  var detail = err && err.message ? '\n\nDetalj: ' + err.message : '';
  alert('Promena nije sačuvana u zajedničkoj bazi.' + detail);
}
