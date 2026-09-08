(function(){
  const KEY='roboSoundFxV1';
  let ctx=null;
  let enabled=true;
  try{enabled=localStorage.getItem(KEY)!=='off'}catch{}

  function context(){
    if(ctx)return ctx;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return null;
    try{ctx=new AC();return ctx}catch{return null}
  }
  function tone(freq=520,duration=.035,volume=.018,type='sine',delay=0){
    if(!enabled)return;
    const c=context();if(!c)return;
    if(c.state==='suspended')c.resume().catch(()=>{});
    const t=c.currentTime+delay;
    const o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.006);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+duration+.015);
  }
  function click(){tone(620,.028,.012,'sine')}
  function toggle(){tone(470,.03,.012,'triangle');tone(690,.026,.009,'sine',.025)}
  function success(){tone(523,.055,.014,'sine');tone(659,.055,.012,'sine',.055);tone(784,.08,.011,'sine',.11)}
  function error(){tone(210,.06,.014,'triangle');tone(175,.07,.010,'triangle',.055)}
  function setEnabled(v){enabled=!!v;try{localStorage.setItem(KEY,enabled?'on':'off')}catch{}return enabled}
  function isInteractive(el){return el?.closest?.('button,a,[role="button"],select,input[type="checkbox"],input[type="radio"],.start-level-card,.city-node,.energy-locker,.bit-robot')}
  document.addEventListener('pointerdown',e=>{
    const el=isInteractive(e.target);if(!el)return;
    if(el.matches?.('input[type="checkbox"],input[type="radio"],select,.logic-switch,.bit-robot')||el.closest?.('.logic-switch,.bit-robot'))toggle();else click();
  },{capture:true});
  window.RoboSound={click,toggle,success,error,setEnabled,get enabled(){return enabled}};
})();
