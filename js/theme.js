// THEME
var theme=localStorage.getItem('theme')||'dark';
function applyTheme(){
  document.documentElement.setAttribute('data-theme',theme==='light'?'light':'');
  document.getElementById('theme-btn').textContent=theme==='light'?'🌙 Tamna':'☀ Svetla';
}
function toggleTheme(){ theme=theme==='dark'?'light':'dark'; localStorage.setItem('theme',theme); applyTheme(); }
applyTheme();
