// PWA metadata for iPhone/iPad
(function(){
  if(!document.querySelector('link[rel="apple-touch-icon"]')){
    var icon=document.createElement('link');
    icon.rel='apple-touch-icon';
    icon.href='assets/icons/apple-touch-icon.png';
    document.head.appendChild(icon);
  }
  if(!document.querySelector('meta[name="apple-mobile-web-app-title"]')){
    var title=document.createElement('meta');
    title.name='apple-mobile-web-app-title';
    title.content='Advokat Pro';
    document.head.appendChild(title);
  }
  if(!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')){
    var status=document.createElement('meta');
    status.name='apple-mobile-web-app-status-bar-style';
    status.content='black-translucent';
    document.head.appendChild(status);
  }
})();

function showStartupError(e){
  console.error('Application startup failed',e);
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:9998;background:var(--bg,#07070d);display:flex;align-items:center;justify-content:center;padding:24px';
  var card=document.createElement('div');card.style.cssText='max-width:460px;text-align:center';
  var h=document.createElement('div');h.textContent='Zajednička baza nije učitana';h.style.cssText='font-size:22px;font-weight:700;margin-bottom:10px';
  var p=document.createElement('div');p.textContent='Aplikacija neće prikazati praznu listu kao da nema predmeta. Proverite vezu i pokušajte ponovo.';p.style.cssText='font-size:13px;line-height:1.5;color:var(--t2);margin-bottom:16px';
  var detail=document.createElement('div');detail.textContent=e&&e.message?e.message:'';detail.style.cssText='font-size:11px;color:var(--t3);margin-bottom:16px';
  var b=document.createElement('button');b.className='btn btn-gd';b.textContent='Pokušaj ponovo';b.onclick=function(){location.reload();};
  card.appendChild(h);card.appendChild(p);card.appendChild(detail);card.appendChild(b);overlay.appendChild(card);document.body.appendChild(overlay);
}

// INIT
async function initApp(){
  try{
    await initSession();
    initSW();
    checkBanner();
    await loadAppConfig();
    pVrsta();
    await loadSharedState();
  }catch(e){
    showStartupError(e);
    return;
  }
  checkAlarms();
  scheduleAlarms();
  renderAfterRefresh();

  // Multi-user freshness: cheap revision checks while the app is open, plus an
  // immediate check whenever the tab/window becomes active again.
  setInterval(function(){refreshSharedState(false);},30000);
  window.addEventListener('focus',function(){refreshSharedState(false);});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')refreshSharedState(false);});
}
initApp();
