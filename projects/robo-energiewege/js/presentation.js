(function(){
  const PLAYER_NAME_KEY='roboPlayerNameV1';
  function cleanPlayerName(value){return String(value??'').trim().replace(/\s+/g,' ').slice(0,20)}
  function getPlayerName(){try{return cleanPlayerName(localStorage.getItem(PLAYER_NAME_KEY)||'')}catch{return ''}}
  function setPlayerName(value){const name=cleanPlayerName(value);try{name?localStorage.setItem(PLAYER_NAME_KEY,name):localStorage.removeItem(PLAYER_NAME_KEY)}catch{}return name}
  function firstVisitIntro(levelId,callback){
    const key=`roboIntroSeenV1:${levelId}`;
    try{if(localStorage.getItem(key))return false}catch{}
    let fired=false;
    const run=()=>{
      if(fired)return;fired=true;
      try{localStorage.setItem(key,'1')}catch{}
      setTimeout(()=>callback?.(),80);
    };
    window.addEventListener('pointerdown',run,{once:true});
    window.addEventListener('keydown',run,{once:true});
    return true;
  }
  function personalizeMessage(message,mood='neutral'){
    const name=getPlayerName(); const text=String(message??''); if(!name)return text;
    if(mood==='greeting' && !text.includes(name)) return `Hi, ${name}! ${text}`;
    if(mood==='success' && /(geschafft|gelöst|fertig|super|klasse|perfekt|ziel|nachricht lautet|alle .*energie|alle .*strom)/i.test(text) && !text.includes(name)) return `Super, ${name}! ${text}`;
    return text;
  }
  function escapeHtml(value){return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;")}
  function normalizeNotation(text){return String(text??"").replace(/\btJoin\b/g,"t_join").replace(/\btA\b/g,"t_A").replace(/\btB\b/g,"t_B").replace(/\btX\b/g,"t_X").replace(/\bp([1-9][0-9]*)\b/g,"p_$1")}
  function formatNotation(text){const safe=escapeHtml(normalizeNotation(text));return safe.replace(/\b([pt])_([A-Za-z0-9]+)\b/g,"$1<sub>$2</sub>").replace(/\n/g,"<br>")}
  function speechText(text){return normalizeNotation(text).replace(/\b([pt])_([A-Za-z0-9]+)\b/g,"$1 $2").replace(/[{}]/g,"").replace(/\s+/g," ").trim()}
  function smallTalkReply(question){
    const name=getPlayerName(); const suffix=name?`, ${name}`:'';
    const q=String(question??"").toLowerCase().trim().replace(/[!?.,;:]+/g," ").replace(/\s+/g," ");
    if(!q)return null;
    if(/^(hallo|hi|hey|guten morgen|guten tag|moin)\b/.test(q))return{message:`Hallo${suffix}! Ich bin Robo. Schön, dass du da bist. Wollen wir zusammen die Energiewege knacken?`,mood:"greeting"};
    if(/(wie heißt du|wie heisst du|dein name|wer bist du)/.test(q))return{message:`Ich heiße Robo${name?`, ${name}`:""}. Ich bin dein kleiner Spielbegleiter für die Energiewege.`,mood:"greeting"};
    if(/(was bist du|bist du ein roboter)/.test(q))return{message:"Ja – ich bin Robo, ein kleiner Roboter. Ich helfe dir beim Tüfteln, ohne dir jede Lösung sofort zu verraten.",mood:"greeting"};
    if(/(wie geht es dir|wie gehts dir|wie geht's dir|alles gut)/.test(q))return{message:`Mir geht's gut${suffix} – meine Antenne ist wach und meine Energie reicht noch. Und bei dir?`,mood:"greeting"};
    if(/(was kannst du|was machst du|wobei hilfst du|wofür bist du)/.test(q))return{message:"Ich kann dir Hinweise geben, Fragen zum Spiel beantworten und mit dir über die Energiewege nachdenken. Wenn die Cloud-KI eingeschaltet ist, kann ich auch freier mit dir sprechen.",mood:"explaining"};
    if(/(wie alt bist du|dein alter)/.test(q))return{message:"Ein genaues Roboteralter habe ich nicht. Sagen wir: jung genug zum Spielen und alt genug zum Tüfteln.",mood:"thinking"};
    if(/(danke|dankeschön|danke dir)/.test(q))return{message:"Gern! Weiter geht's, wenn du willst.",mood:"success"};
    if(/(tschüss|tschuess|bis später|bis spaeter)/.test(q))return{message:"Bis später! Ich passe solange auf die Energiezellen auf.",mood:"greeting"};
    return null;
  }
  class SpeechController{
    constructor({onSpeakingChange=()=>{},autoSpeak=true}={}){this.supported="speechSynthesis" in window&&"SpeechSynthesisUtterance" in window;this.onSpeakingChange=onSpeakingChange;this.autoSpeak=autoSpeak;this.currentText="";this.voices=[];this.selectEl=null;this.hasUserGesture=false;const mark=()=>this.hasUserGesture=true;window.addEventListener("pointerdown",mark,{once:true,capture:true});window.addEventListener("keydown",mark,{once:true,capture:true})}
    init(selectEl){this.selectEl=selectEl;if(!this.supported)return;const refresh=()=>this.populateVoices();speechSynthesis.addEventListener?.("voiceschanged",refresh);refresh()}
    populateVoices(){
      if(!this.supported||!this.selectEl)return;
      const all=speechSynthesis.getVoices();
      const german=all.filter(v=>/^de(-|_)/i.test(v.lang));
      this.voices=german.length?german:all;
      const previousName=localStorage.getItem("roboVoiceName")||"";
      this.selectEl.innerHTML="";
      this.voices.forEach((v,i)=>{
        const o=document.createElement("option");
        o.value=String(i);
        o.textContent=`${v.name} · ${v.lang}`;
        this.selectEl.appendChild(o);
      });
      let preferred=-1;
      if(previousName) preferred=this.voices.findIndex(v=>v.name===previousName);
      if(preferred<0) preferred=this.voices.findIndex(v=>/^Google Deutsch$/i.test(v.name));
      if(preferred<0) preferred=this.voices.findIndex(v=>/Google/i.test(v.name)&&/^de(-|_)/i.test(v.lang));
      if(preferred<0) preferred=this.voices.findIndex(v=>/Natural|Online|Microsoft|Katja|Conrad|Anna/i.test(v.name));
      this.selectEl.value=String(preferred>=0?preferred:0);
      this.selectEl.onchange=()=>{
        const v=this.voices[Number(this.selectEl.value||0)];
        if(v) localStorage.setItem("roboVoiceName",v.name);
      };
    }
    setAuto(v){this.autoSpeak=Boolean(v);if(!this.autoSpeak)this.stop()}
    setText(t){this.currentText=String(t??"")}
    stop(){if(!this.supported)return;speechSynthesis.cancel();this.onSpeakingChange(false)}
    speak(text=this.currentText,{force=false}={}){if(!this.supported||(!force&&!this.autoSpeak)||(!this.hasUserGesture&&!force))return false;const clean=speechText(text);if(!clean)return false;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(clean);const v=this.voices[Number(this.selectEl?.value||0)];if(v){u.voice=v;u.lang=v.lang}else u.lang="de-DE";u.rate=.92;u.pitch=1.05;u.volume=1;u.onstart=()=>this.onSpeakingChange(true);u.onend=()=>this.onSpeakingChange(false);u.onerror=()=>this.onSpeakingChange(false);speechSynthesis.speak(u);return true}
  }
  window.PetriPresentation={formatNotation,speechText,smallTalkReply,SpeechController,getPlayerName,setPlayerName,personalizeMessage,firstVisitIntro};
})();
