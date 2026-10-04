(()=>{
 const styles={crop:'自然短卷',part:'侧分短发',curls:'蓬松卷发'};
 let selected='crop',original=false;
 const image=document.querySelector('#result');
 function update(){
   image.src=original?'assets/public-test/portrait.jpg':`assets/ai-tryon/${selected}.png`;
   image.alt=original?'公开素材原照':`AI 生成的${styles[selected]}示例`;
   document.querySelector('#image-label').textContent=original?'原照 · 未修改':`AI 效果 · ${styles[selected]}`;
   document.querySelector('#original').textContent=original?'返回试戴效果':'对照原照';
   document.querySelector('#original').setAttribute('aria-pressed',String(original));
   document.querySelector('#chosen').textContent=styles[selected];
   const link=document.querySelector('#download');link.href=`assets/ai-tryon/${selected}.png`;link.download=`AI示例-${styles[selected]}.png`;
   document.querySelectorAll('[data-style]').forEach(b=>{const active=b.dataset.style===selected;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
   document.querySelector('#error').textContent='';
 }
 document.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{selected=b.dataset.style;original=false;update();});
 document.querySelector('#original').onclick=()=>{original=!original;update();};
 document.querySelector('#zoom').onclick=()=>{const full=document.querySelector('#preview').classList.toggle('full');document.querySelector('#zoom').textContent=full?'查看头部细节':'查看完整照片';document.querySelector('#zoom').setAttribute('aria-pressed',String(!full));};
 image.onerror=()=>document.querySelector('#error').textContent='图片未能加载，请刷新重试。';
 update();
})();
