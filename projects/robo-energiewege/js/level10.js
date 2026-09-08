const $=s=>document.querySelector(s); const Tutor=window.BinaryGame;

const rounds=[
  {
    lockers:['A','B','C'], ruleType:'lies', ruleCount:1, answer:'C',
    statements:[
      {robot:'Nova',color:'coral',html:'Der Chip steckt in <strong>Fach A</strong>.', spoken:'Der Chip steckt in Fach A.',test:l=>l==='A'},
      {robot:'Pixel',color:'teal',html:'Der Chip steckt <span class="logic-word">NICHT</span> in <strong>Fach B</strong>.', spoken:'Der Chip steckt nicht in Fach B.',test:l=>l!=='B'},
      {robot:'Bolt',color:'gold',html:'Der Chip steckt in <strong>Fach A</strong> <span class="logic-word">ODER</span> <strong>Fach C</strong>.', spoken:'Der Chip steckt in Fach A oder Fach C.',test:l=>l==='A'||l==='C'}
    ]
  },
  {
    lockers:['A','B','C','D'], ruleType:'lies', ruleCount:1, answer:'B',
    statements:[
      {robot:'Nova',color:'coral',html:'Der Chip steckt in <strong>Fach A</strong>.', spoken:'Der Chip steckt in Fach A.',test:l=>l==='A'},
      {robot:'Pixel',color:'teal',html:'Der Chip steckt in <strong>Fach A</strong> <span class="logic-word">ODER</span> <strong>Fach B</strong>.', spoken:'Der Chip steckt in Fach A oder Fach B.',test:l=>l==='A'||l==='B'},
      {robot:'Bolt',color:'gold',html:'Der Chip steckt <span class="logic-word">NICHT</span> in <strong>Fach C</strong> <span class="logic-word">UND</span> <span class="logic-word">NICHT</span> in <strong>Fach D</strong>.', spoken:'Der Chip steckt nicht in C und nicht in D.',test:l=>l!=='C'&&l!=='D'}
    ]
  },
  {
    lockers:['A','B','C','D'], ruleType:'truths', ruleCount:1, answer:'D',
    statements:[
      {robot:'Nova',color:'coral',html:'Der Chip steckt in <strong>Fach A</strong>.', spoken:'Der Chip steckt in Fach A.',test:l=>l==='A'},
      {robot:'Pixel',color:'teal',html:'Der Chip steckt in <strong>Fach A</strong> <span class="logic-word">ODER</span> <strong>Fach B</strong>.', spoken:'Der Chip steckt in Fach A oder Fach B.',test:l=>l==='A'||l==='B'},
      {robot:'Bolt',color:'gold',html:'Der Chip steckt <span class="logic-word">NICHT</span> in <strong>Fach A</strong> <span class="logic-word">UND</span> <span class="logic-word">NICHT</span> in <strong>Fach C</strong>.', spoken:'Der Chip steckt nicht in A und nicht in C.',test:l=>l!=='A'&&l!=='C'}
    ]
  }
];

const state={round:0,selected:null,tries:0,totalTries:0,hints:0,solved:0,complete:false,awaitingNext:false,history:[],lastEval:null};

let statementVoices=[];
function refreshStatementVoices(){
  if(!(window.speechSynthesis&&window.SpeechSynthesisUtterance)) return [];
  const all=window.speechSynthesis.getVoices();
  const german=all.filter(v=>/^de(-|_)/i.test(v.lang));
  const pool=(german.length?german:all).slice();
  const roboName=localStorage.getItem('roboVoiceName')||'';
  statementVoices=pool.filter(v=>v.name!==roboName);
  if(!statementVoices.length) statementVoices=pool;
  return statementVoices;
}
refreshStatementVoices();
window.speechSynthesis?.addEventListener?.('voiceschanged',refreshStatementVoices);
function speakStatement(index,text,card){
  if(!(window.speechSynthesis&&window.SpeechSynthesisUtterance)) return;
  const spoken=(text||'').replace(/\s+/g,' ').trim();
  if(!spoken) return;
  tutor.speech.stop();
  tutor.speech.hasUserGesture=true;
  window.speechSynthesis.cancel();
  document.querySelectorAll('.liar-robot-card.speaking').forEach(el=>el.classList.remove('speaking'));
  const voices=statementVoices.length?statementVoices:refreshStatementVoices();
  const utter=new SpeechSynthesisUtterance(spoken);
  const voice=voices[index % Math.max(voices.length,1)];
  if(voice){utter.voice=voice; utter.lang=voice.lang;} else utter.lang='de-DE';
  utter.rate=0.96; utter.pitch=1.02; utter.volume=1;
  utter.onstart=()=>card?.classList.add('speaking');
  const clear=()=>card?.classList.remove('speaking');
  utter.onend=clear; utter.onerror=clear;
  window.speechSynthesis.speak(utter);
}
function current(){return rounds[state.round]}
function evaluate(locker,r=current()){
  const values=r.statements.map(s=>!!s.test(locker));
  const truths=values.filter(Boolean).length, lies=values.length-truths;
  return{values,truths,lies,valid:r.ruleType==='lies'?lies===r.ruleCount:truths===r.ruleCount};
}
function ruleText(r=current()){
  return r.ruleType==='lies'?`Genau ${r.ruleCount} Robo ${r.ruleCount===1?'lügt':'lügen'}.`:`Genau ${r.ruleCount} Robo sagt die Wahrheit.`;
}

const tutor=Tutor.setupTutor({
  introKey:'level10',
  introMessage:'So geht das Spiel: Wähle ein Fach als Vermutung und prüfe danach jede Roboteraussage. Der Detektor zeigt Wahr und Falsch. Nur die Vermutung, deren Anzahl an Lügen oder Wahrheiten genau zur Regel passt, löst den Fall.',
  learningGoal:'Ein Kind nutzt Aussagenlogik, Wahrheit/Falschheit sowie UND, ODER und NICHT zum Lösen eines Logikrätsels.',
  getFacts:()=>({round:state.round+1,rule:ruleText(),selected:state.selected,lastEvaluation:state.lastEval,answer:current()?.answer}),
  history:state.history,
  offlineReply:q=>{
    const l=q.toLowerCase();
    if(l.includes('oder'))return{message:'ODER ist wahr, wenn mindestens eine der genannten Möglichkeiten stimmt. Es darf auch beides stimmen.',mood:'explaining'};
    if(l.includes('und'))return{message:'UND ist nur wahr, wenn beide Teile der Aussage gleichzeitig stimmen.',mood:'explaining'};
    if(l.includes('nicht'))return{message:'NICHT kehrt eine Aussage um. „Nicht in B“ ist wahr, wenn der Chip überall liegen kann – nur nicht in B.',mood:'explaining'};
    if(l.includes('lüg')||l.includes('wahr'))return{message:'Nimm probeweise ein Fach an. Prüfe dann jede Aussage einzeln. Am Ende muss die Anzahl wahrer und falscher Aussagen genau zur Regel oben passen.',mood:'questioning'};
    return{message:'Wähle eine Vermutung und prüfe jede Aussage so, als läge der Chip wirklich dort. Dann zählst du Wahrheiten und Lügen.',mood:'questioning'};
  }
});

function renderStatements(){
  const r=current();
  $('#robotStatements').innerHTML=r.statements.map((st,i)=>{
    const val=state.lastEval?.values?.[i];
    const truth=val===true?'truth':val===false?'lie':'';
    const truthText=val===true?'WAHR':val===false?'FALSCH':'';
    return `<article class="liar-robot-card ${st.color} ${truth}" data-statement="${i}">
      <div class="liar-witness-head">
        <div class="liar-robot-face"><span class="liar-antenna"></span><span class="liar-eye left"></span><span class="liar-eye right"></span><span class="liar-mouth"></span></div>
        <div class="liar-witness-meta"><small>AUSSAGE ${i+1}</small><strong>${st.robot}</strong></div>
        ${truthText?`<div class="truth-chip" data-truth="${i}">${truthText}</div>`:''}
      </div>
      <div class="liar-speech"><p>${st.html}</p></div>
      <button class="statement-speak" type="button" data-speak-statement="${i}">🔊 Aussage anhören</button>
    </article>`;
  }).join('');
  document.querySelectorAll('[data-speak-statement]').forEach(btn=>btn.addEventListener('click',()=>{
    const i=Number(btn.dataset.speakStatement), st=r.statements[i];
    if(!st)return;
    const card=document.querySelector(`.liar-robot-card[data-statement="${i}"]`);
    speakStatement(i, st.spoken||st.html.replace(/<[^>]+>/g,' '), card);
  }));
}
function renderLockers(){
  const r=current();
  $('#lockerGrid').style.setProperty('--locker-count',r.lockers.length);
  $('#lockerGrid').innerHTML=r.lockers.map(l=>`
    <button type="button" class="energy-locker ${state.selected===l?'selected':''} ${state.awaitingNext&&state.selected===l?'correct':''}" data-locker="${l}" aria-pressed="${state.selected===l}" ${state.awaitingNext?'disabled':''}>
      <span class="locker-door"><i></i><b>${l}</b><em>⚡</em></span><span>Fach ${l}</span>
    </button>`).join('');
  document.querySelectorAll('.energy-locker').forEach(btn=>btn.onclick=()=>selectLocker(btn.dataset.locker));
}
function renderDetector(){
  const r=current();
  const evalResult=state.lastEval;
  $('#detectorLights').innerHTML=r.statements.map((s,i)=>{
    const val=evalResult?.values?.[i];
    const cls=val===true?'truth':val===false?'lie':'';
    const txt=val===true?'WAHR':val===false?'FALSCH':'?';
    return `<span class="detector-light ${cls}"><i></i>${s.robot}: ${txt}</span>`;
  }).join('');
  if(!evalResult)$('#detectorSummary').textContent='Noch keine Vermutung geprüft.';
  else{
    const needed=ruleText(r);
    $('#detectorSummary').textContent=`Bei Fach ${state.selected}: ${evalResult.truths} wahr, ${evalResult.lies} falsch. Gesucht: ${needed}`;
  }
}
function render(){
  const r=current(); if(!r)return;
  $('#logicRound').textContent=`${state.round+1} von ${rounds.length}`;
  $('#sideLogicRound').textContent=`${state.round+1} von ${rounds.length}`;
  $('#solvedLogic').textContent=`${state.solved} / ${rounds.length}`;
  $('#logicHints').textContent=state.hints;
  $('#tryCount').textContent=state.tries;
  $('#progressBar').style.width=`${Math.round(state.solved/rounds.length*100)}%`;
  $('#liarRule').textContent=ruleText(r);
  $('#logicTask').textContent=state.round===0?'Wo steckt der verschwundene Energiechip?':state.round===1?'Nächster Fall: Welches Fach passt zu allen Aussagen?':'Letzter Fall: Diesmal sagt nur ein Robo die Wahrheit.';
  $('#caseHint').textContent=r.ruleType==='lies'?'Genau ein Roboter lügt. Nur ein Fach passt zu dieser Regel.':'Achtung: Diesmal sagt genau ein Roboter die Wahrheit – die anderen beiden lügen.';
  renderStatements(); renderLockers(); renderDetector();
  $('#checkLogicBtn').disabled=!state.selected||state.awaitingNext||state.complete;
  $('#nextLogicBtn').hidden=!state.awaitingNext;
  $('#nextLogicBtn').textContent=state.round===rounds.length-1?'Ergebnis ansehen →':'Nächster Fall →';
}
function selectLocker(locker){
  if(state.complete||state.awaitingNext)return;
  state.selected=locker; state.lastEval=null; window.RoboSound?.toggle(); render();
  tutor.say(`Fach ${locker} ist deine Vermutung. Jetzt lass den Logik-Detektor prüfen, wie viele Aussagen dann wahr oder falsch wären.`,'thinking',{auto:false});
}
function check(){
  if(state.complete||state.awaitingNext||!state.selected)return;
  const r=current(); state.tries++; state.totalTries++;
  const ev=evaluate(state.selected,r); state.lastEval=ev;
  state.history.push({type:'hypothesis',round:state.round+1,locker:state.selected,truths:ev.truths,lies:ev.lies,valid:ev.valid});
  render();
  if(ev.valid){
    window.RoboSound?.success();
    const chosen=state.selected;
    state.solved++;
    state.awaitingNext=true;
    render();
    tutor.say(`Genau! Bei Fach ${chosen} passt die Wahrheit-Lüge-Regel exakt. Der Energiechip steckt dort.`,'success');
  }else{
    window.RoboSound?.error();
    const mismatch=r.ruleType==='lies'?`Bei deiner Vermutung würden ${ev.lies} Roboter lügen.`:`Bei deiner Vermutung würden ${ev.truths} Roboter die Wahrheit sagen.`;
    tutor.say(`${mismatch} Das passt noch nicht zur Regel. Versuch ein anderes Fach und vergleiche die Aussagen.`,'questioning');
  }
}
function nextLogic(){
  if(!state.awaitingNext||state.complete)return;
  if(state.round===rounds.length-1){state.awaitingNext=false;finish();return}
  state.round++;state.selected=null;state.lastEval=null;state.tries=0;state.awaitingNext=false;
  render();
  tutor.say(state.round===2?'Letzter Fall: Jetzt dreht sich die Regel um. Genau ein Robo sagt die Wahrheit.':'Neuer Fall. Diesmal gibt es vier Fächer – prüfe wieder, welche Vermutung zur Regel passt.','greeting');
}
function finish(){
  state.complete=true;render(); $('#progressBar').style.width='100%'; $('#solvedLogic').textContent=`${rounds.length} / ${rounds.length}`;
  const optimal=rounds.length; const stars=state.hints===0&&state.totalTries===optimal?3:state.hints<=2&&state.totalTries<=optimal+3?2:1;
  $('#rewardStars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);
  $('#rewardText').textContent=stars===3?'Du hast jeden Fall beim ersten Versuch logisch gelöst.':'Du hast alle Fälle geknackt. Für „Optimal“: jeden Fall beim ersten Versuch und ohne Hinweis lösen.';
  $('#rewardPanel').hidden=false;
  window.RoboProgress?.mark('level10',{completed:true,perfect:stars===3,bestStars:stars,bestMoves:state.totalTries});
  tutor.say('Geschafft! Du hast Aussagen als wahr oder falsch geprüft und UND, ODER und NICHT zum Schlussfolgern benutzt. Das ist echte Aussagenlogik.','success');
}
function reset(){
  state.round=0;state.selected=null;state.tries=0;state.totalTries=0;state.hints=0;state.solved=0;state.complete=false;state.awaitingNext=false;state.history.length=0;state.lastEval=null;
  $('#rewardPanel').hidden=true;render();
  tutor.say('Ein Energiechip ist verschwunden. Wähle ein Fach als Vermutung. Der Detektor zeigt dir dann, welche Aussagen unter dieser Annahme wahr oder falsch wären.','greeting',{auto:false});
}
$('#checkLogicBtn').onclick=check; $('#nextLogicBtn').onclick=nextLogic; $('#resetBtn').onclick=reset; $('#replayBtn').onclick=reset;
$('#hintBtn').onclick=()=>{
  state.hints++;
  const r=current();
  if(!state.selected)tutor.say('Beginne mit einer Vermutung. Danach zählst du im Detektor Wahrheiten und Lügen und vergleichst die Zahl mit der Regel oben.','questioning');
  else{
    const ev=evaluate(state.selected,r);
    tutor.say(r.ruleType==='lies'?`Wenn der Chip in ${state.selected} läge, würden ${ev.lies} Roboter lügen. Gesucht ist genau ${r.ruleCount}.`:`Wenn der Chip in ${state.selected} läge, würden ${ev.truths} Roboter die Wahrheit sagen. Gesucht ist genau ${r.ruleCount}.`,'questioning');
  }
};
$('#explainBtn').onclick=()=>{state.hints++;tutor.say('Behandle deine Vermutung kurz so, als wäre sie wahr. Prüfe dann jede Roboteraussage einzeln. UND braucht beide Teile, ODER mindestens einen Teil und NICHT kehrt eine Aussage um.','explaining')};
reset();
