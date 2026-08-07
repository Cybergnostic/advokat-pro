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

// INIT
async function initApp(){
  initSW();
  checkBanner();
  pVrsta();
  try{
    await loadSharedState();
  }catch(e){
    console.error('Shared database could not be loaded',e);
    alert('Zajednička baza trenutno nije dostupna. Podaci nisu učitani.');
  }
  checkAlarms();
  scheduleAlarms();
  render();
}
initApp();
