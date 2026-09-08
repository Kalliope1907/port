(function(){
  const WEIGHTS=[128,64,32,16,8,4,2,1];
  function robotMarkup(index,on=false,locked=false){
    return `<div class="bit-unit ${on?'on':''}" data-bit-unit="${index}">
      <div><div class="bit-weight">${WEIGHTS[index]}</div><div class="bit-power">2<sup>${7-index}</sup></div></div>
      <button class="bit-robot ${on?'on':''} ${locked?'locked':''}" type="button" data-bit="${index}" aria-pressed="${on}" ${locked?'tabindex="-1"':''} aria-label="Bit ${index+1}, Wert ${WEIGHTS[index]}, ${on?'eingeschaltet':'ausgeschaltet'}">
        <span class="bit-robot-figure" aria-hidden="true"><span class="bit-antenna"></span><span class="bit-ear left"></span><span class="bit-ear right"></span><span class="bit-head"></span><span class="bit-eye left"></span><span class="bit-eye right"></span><span class="bit-mouth"></span><span class="bit-body"></span><span class="bit-chest"></span><span class="bit-arm left"></span><span class="bit-arm right"></span><span class="bit-leg left"></span><span class="bit-leg right"></span></span>
      </button>
      <div class="bit-value">${on?'1':'0'}</div>
    </div>`;
  }
  function renderRobots(container,bits,{locked=false}={}){container.innerHTML=bits.map((v,i)=>robotMarkup(i,Boolean(v),locked)).join('');}
  function bitsFromNumber(n){return WEIGHTS.map(w=>(n&w)?1:0)}
  function numberFromBits(bits){return bits.reduce((sum,v,i)=>sum+(v?WEIGHTS[i]:0),0)}
  function binaryString(bits){return bits.join(' ')}
  function sumText(bits){const parts=bits.map((v,i)=>v?WEIGHTS[i]:null).filter(v=>v!==null);return parts.length?`${parts.join(' + ')} = ${numberFromBits(bits)}`:'0'}
  function setReadout(bits,binaryEl,sumEl,decimalEl){if(binaryEl)binaryEl.textContent=binaryString(bits);if(sumEl)sumEl.textContent=sumText(bits);if(decimalEl)decimalEl.textContent=String(numberFromBits(bits));}
  function setupTutor({learningGoal,getFacts,history,offlineReply,introKey,introMessage}){
    const $=s=>document.querySelector(s); const avatarOrbit=$('#avatarOrbit'); const speechBubble=$('#speechBubble'); const aiStatus=$('#aiStatus'); const speakBtn=$('#speakBtn'); const autoSpeakToggle=$('#autoSpeakToggle'); const voiceSelect=$('#voiceSelect'); const voiceControls=$('#voiceControls'); const aiApi=new window.TutorAPI();
    const speech=new window.PetriPresentation.SpeechController({autoSpeak:true,onSpeakingChange:s=>{avatarOrbit?.classList.toggle('speaking',s);if(speakBtn)speakBtn.textContent=s?'■ Stopp':'🔊 Vorlesen';}}); speech.init(voiceSelect); if(!speech.supported&&voiceControls)voiceControls.hidden=true; let current='';
    function say(message,mood='neutral',{auto=true}={}){message=window.PetriPresentation.personalizeMessage(message,mood);current=message;speech.setText(message);speech.stop();if(speechBubble)speechBubble.innerHTML=window.PetriPresentation.formatNotation(message);if(avatarOrbit){avatarOrbit.dataset.mood=mood;avatarOrbit.classList.remove('react');void avatarOrbit.offsetWidth;avatarOrbit.classList.add('react');}if(auto)setTimeout(()=>speech.speak(message),150)}
    function blink(){if(document.hidden||!avatarOrbit)return;avatarOrbit.classList.remove('blink');void avatarOrbit.offsetWidth;avatarOrbit.classList.add('blink');setTimeout(()=>avatarOrbit.classList.remove('blink'),360)}
    (function schedule(){setTimeout(()=>{blink();if(Math.random()<.2)setTimeout(blink,320);schedule()},2300+Math.random()*4200)})();
    speakBtn?.addEventListener('click',()=>{if(avatarOrbit.classList.contains('speaking'))speech.stop();else{speech.hasUserGesture=true;speech.speak(current,{force:true})}});autoSpeakToggle?.addEventListener('change',()=>speech.setAuto(autoSpeakToggle.checked));voiceSelect?.addEventListener('change',()=>{if(avatarOrbit.classList.contains('speaking')){speech.stop();speech.speak(current,{force:true})}});
    $('#questionForm')?.addEventListener('submit',async e=>{e.preventDefault();const input=$('#questionInput');const q=input.value.trim();if(!q)return;input.value='';const small=window.PetriPresentation.smallTalkReply(q);if(small)return say(small.message,small.mood);if(aiApi.available){say('Ich denke kurz nach …','thinking',{auto:false});try{const r=await aiApi.intervene({learningGoal,verifiedFacts:getFacts(),learnerAction:{type:'question'},learnerMessage:q,interactionHistory:(history||[]).slice(-8)});return say(r.message,r.robotState||'explaining')}catch(e){console.warn(e)}}const r=offlineReply?.(q);say(r?.message||'Schau auf die leuchtenden Roboter und ihre Stellenwerte. Jeder eingeschaltete Roboter trägt seinen Wert zur Zahl bei.',r?.mood||'questioning')});
    $('#profiBtn')?.addEventListener('click',()=>{const box=$('#profiBox'),btn=$('#profiBtn');box.hidden=!box.hidden;btn.setAttribute('aria-expanded',String(!box.hidden))});
    if(introKey&&introMessage)window.PetriPresentation.firstVisitIntro(introKey,()=>say(introMessage,'explaining'));
    aiApi.checkStatus().then(s=>{if(aiStatus)aiStatus.textContent=s.available?`Cloud-Robo bereit · ${s.model}`:'Offline-Robo: Spielwissen + kleiner Smalltalk.'});
    return {say,speech,aiApi};
  }
  window.BinaryGame={WEIGHTS,renderRobots,bitsFromNumber,numberFromBits,binaryString,sumText,setReadout,setupTutor};
})();
