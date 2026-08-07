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

// Remember which case detail is currently being viewed so contextual actions
// such as "+ Rok" can reuse that case instead of asking for it again.
var activeDetailCaseId=null;
if(typeof openDetail==='function'){
  var openDetailBase=openDetail;
  openDetail=function(id){
    activeDetailCaseId=id;
    return openDetailBase(id);
  };
}

// INIT
async function initApp(){
  initSW();
  checkBanner();
  try{
    await loadAppConfig();
    pVrsta();
    await loadSharedState();
  }catch(e){
    console.error('Application startup failed',e);
    alert('Aplikacija trenutno ne može da učita konfiguraciju ili zajedničku bazu.');
  }
  checkAlarms();
  scheduleAlarms();
  render();
}
initApp();
