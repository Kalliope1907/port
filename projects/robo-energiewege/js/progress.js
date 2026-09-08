(function(){
  const KEY = 'roboEnergyProgressV12';
  function load(){
    try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return {}}
  }
  function save(data){try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}}
  function mark(level,{completed=true,perfect=false,bestStars=null,bestMoves=null}={}){
    const data=load();
    const prev=data[level]||{};
    data[level]={
      completed:Boolean(prev.completed||completed),
      perfect:Boolean(prev.perfect||perfect),
      bestStars:bestStars==null?prev.bestStars:Math.max(prev.bestStars||0,bestStars),
      bestMoves:bestMoves==null?prev.bestMoves:(prev.bestMoves==null?bestMoves:Math.min(prev.bestMoves,bestMoves))
    };
    save(data); return data[level];
  }
  function get(level){return load()[level]||{completed:false,perfect:false,bestStars:0,bestMoves:null}}
  function applyToCards(root=document){
    root.querySelectorAll('[data-progress-level]').forEach(card=>{
      const p=get(card.dataset.progressLevel);
      card.classList.toggle('is-complete',!!p.completed);
      card.classList.toggle('is-perfect',!!p.perfect);
      const done=card.querySelector('[data-status-done]');
      const perfect=card.querySelector('[data-status-perfect]');
      if(done){done.classList.toggle('on',!!p.completed);done.textContent=p.completed?'✓ Geschafft':'○ Noch offen';}
      if(perfect){perfect.classList.toggle('on',!!p.perfect);perfect.textContent=p.perfect?'★ Optimal':'☆ Optimal';}
    });
  }
  window.RoboProgress={mark,get,applyToCards,resetAll(){try{localStorage.removeItem(KEY)}catch{}}};
})();
