(function(){
  const levels=[
    {id:'level1',href:'level1.html'},
    {id:'level2',href:'level2.html'},
    {id:'level9',href:'level9.html'},
    {id:'level10',href:'level10.html'},
    {id:'level3',href:'level3.html'},
    {id:'level4',href:'level4.html'},
    {id:'level5',href:'level5.html'},
    {id:'level6',href:'level6.html'},
    {id:'level7',href:'level7.html'},
    {id:'level8',href:'level8.html'}
  ];
  const progress=window.RoboProgress;
  if(!progress)return;
  const states=levels.map(l=>({...l,...progress.get(l.id)}));
  const done=states.filter(s=>s.completed).length;
  const perfect=states.filter(s=>s.perfect).length;
  ['startDone'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=`${done} / ${levels.length}`;});
  ['startPerfect','gamesPerfect'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=String(perfect);});
  const gd=document.getElementById('gamesDone'); if(gd)gd.textContent=String(done);
  const next=states.find(s=>!s.completed)||states.find(s=>!s.perfect)||levels[0];
  const continueLink=document.getElementById('continueLink');
  if(continueLink){
    continueLink.href=next.href||'level1.html';
    continueLink.textContent=done===0?'↗ Erstes Level starten':done===levels.length&&perfect===levels.length?'↗ Nochmal spielen':'↗ Weiterspielen';
  }

  const NAME_KEY='roboPlayerNameV1';
  const cleanName=v=>String(v??'').trim().replace(/\s+/g,' ').slice(0,20);
  const nameInput=document.getElementById('playerName');
  const saveNameBtn=document.getElementById('saveNameBtn');
  const nameHint=document.getElementById('playerNameHint');
  const roboBubble=document.getElementById('startRoboBubble');
  function readName(){try{return cleanName(localStorage.getItem(NAME_KEY)||'')}catch{return ''}}
  function paintName(name){
    if(nameInput && document.activeElement!==nameInput) nameInput.value=name;
    if(roboBubble) roboBubble.innerHTML=name?`Hallo, <strong>${name.replace(/[<>&"']/g,'')}</strong>! Such dir ein Spiel aus. <span>↓</span>`:'Such dir eins aus! <span>↓</span>';
    if(nameHint) nameHint.textContent=name?`Robo kennt dich jetzt als ${name}. Du kannst den Namen jederzeit ändern.`:'Robo kann dich dann beim Namen ansprechen. Der Name bleibt nur auf diesem Gerät.';
    if(saveNameBtn) saveNameBtn.textContent=name?'Gespeichert ✓':'Merken';
  }
  function saveName(){
    const name=cleanName(nameInput?.value);
    try{name?localStorage.setItem(NAME_KEY,name):localStorage.removeItem(NAME_KEY)}catch{}
    paintName(name);
    if(saveNameBtn){saveNameBtn.classList.add('saved');setTimeout(()=>saveNameBtn.classList.remove('saved'),700)}
  }
  if(nameInput){nameInput.value=readName();nameInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveName();nameInput.blur();}});nameInput.addEventListener('input',()=>{if(saveNameBtn)saveNameBtn.textContent='Merken';});}
  saveNameBtn?.addEventListener('click',saveName);
  paintName(readName());

  progress.applyToCards(document);
})();
