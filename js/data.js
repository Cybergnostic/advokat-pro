// DATA
var D = JSON.parse(localStorage.getItem('ap12') || '{"p":[],"ra":[],"k":[],"pot":[],"arh":[]}');
if(!D.p) D.p = [];
if(!D.ra) D.ra = [];
if(!D.k) D.k = [];
if(!D.pot) D.pot = [];
if(!D.arh) D.arh = [];
D.ra.forEach(function(r){ if(!r.files) r.files=[]; });
function save(){ localStorage.setItem('ap12', JSON.stringify(D)); }
