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
