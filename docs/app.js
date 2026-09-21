import * as THREE from './vendor/three.module.js';

const $ = s => document.querySelector(s);
const names = {crop:'利落短发',part:'自然侧分',bob:'经典波波'};
let selected = 'crop', savedCount = 0, toastTimer;
function toast(message){if($('#photo-dialog')?.open){$('#photo-status').textContent=message;return;}$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',3500);}
const photoUrls = new Map();
const photoDialog=$('#photo-dialog');
$('#open-photos').onclick=()=>photoDialog.showModal();
$('#close-photos').onclick=$('#done-photos').onclick=()=>photoDialog.close();
photoDialog.addEventListener('click',event=>{
  if(event.target!==photoDialog)return;
  const rect=photoDialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)photoDialog.close();
});
photoDialog.addEventListener('close',()=>$('#open-photos').focus());
if(window.parent!==window){
  const sendHeight=()=>window.parent.postMessage({type:'studio-height',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+12},location.origin);
  new ResizeObserver(sendHeight).observe(document.querySelector('main'));
  window.addEventListener('load',sendHeight);
}
['正面','左侧面','右侧面'].forEach((label,index)=>{
  const item=document.createElement('label');item.className='photo';
  item.innerHTML=`<b>＋</b><span>${label}</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-label="选择${label}照片">`;
  item.querySelector('input').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){toast('请选择 10 MB 以内的 JPG、PNG 或 WebP 图片');event.target.value='';return;}
    const url=URL.createObjectURL(file), img=new Image();img.alt=label+'照片';
    try{img.src=url;await img.decode();}catch{URL.revokeObjectURL(url);toast('这张图片无法读取，请重新选择');return;}
    if(photoUrls.has(index))URL.revokeObjectURL(photoUrls.get(index));photoUrls.set(index,url);
    item.querySelector('img')?.remove();item.querySelector('b').hidden=true;item.querySelector('span').hidden=true;item.prepend(img);
    $('#photo-status').textContent=`已选择 ${photoUrls.size}/3 张照片 · 仅本地预览，尚未生成个人头模。`;
  });$('#photos').append(item);
});
$('#clear').onclick=()=>{photoUrls.forEach(url=>URL.revokeObjectURL(url));photoUrls.clear();document.querySelectorAll('.photo').forEach(item=>{item.querySelector('img')?.remove();item.querySelector('input').value='';item.querySelector('b').hidden=false;item.querySelector('span').hidden=false;});$('#photo-status').textContent='照片已清除。照片仅保留在当前页面，刷新后清除。';};

try { initViewer(); } catch(error){$('#loading').textContent='三维显示启动失败，请使用支持 WebGL 的浏览器并开启硬件加速。';$('#save').disabled=true;console.error(error);}

function initViewer(){
 const host=$('#viewport'),scene=new THREE.Scene();scene.background=new THREE.Color('#e6ebe2');
 const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(0,.35,7.6);camera.lookAt(0,.05,0);
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(renderer.domElement);$('#loading').remove();
 scene.add(new THREE.HemisphereLight(0xffffff,0x7f8d76,2.3));const key=new THREE.DirectionalLight(0xffeddc,3);key.position.set(-3,5,5);scene.add(key);const rim=new THREE.DirectionalLight(0xffffff,2);rim.position.set(3,3,-3);scene.add(rim);
 const model=new THREE.Group();scene.add(model);
 const skin=new THREE.MeshStandardMaterial({color:0xd2ae92,roughness:.85});const dark=new THREE.MeshStandardMaterial({color:0x52483f,roughness:1});const eyes=new THREE.MeshStandardMaterial({color:0xeee6d9,roughness:.8});const hairMat=new THREE.MeshStandardMaterial({color:$('#color').value,roughness:.72});
 function ellipsoid(parent,mat,x,y,z,sx,sy,sz){const m=new THREE.Mesh(new THREE.SphereGeometry(1,40,32),mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 ellipsoid(model,skin,0,.22,0,.73,1.04,.68);
 ellipsoid(model,skin,0,-.35,.15,.57,.62,.54);
 ellipsoid(model,skin,0,-1.05,-.03,.32,.55,.33);
 ellipsoid(model,new THREE.MeshStandardMaterial({color:0x7d8a75,roughness:1}),0,-1.62,-.12,1.12,.43,.58);
 for(const sign of [-1,1]){
   ellipsoid(model,skin,sign*.73,.05,0,.14,.25,.12);
   ellipsoid(model,eyes,sign*.27,.29,.594,.16,.067,.048);
   ellipsoid(model,dark,sign*.27,.29,.636,.043,.046,.018);
   const brow=ellipsoid(model,dark,sign*.27,.425,.598,.175,.027,.038);brow.rotation.z=sign*-.08;
 }
 ellipsoid(model,skin,0,.09,.67,.095,.23,.11);ellipsoid(model,skin,0,-.045,.745,.12,.084,.09);
 ellipsoid(model,new THREE.MeshStandardMaterial({color:0xa77968,roughness:1}),0,-.29,.642,.19,.033,.026);
 const hair=new THREE.Group();model.add(hair);
 function clearHair(){while(hair.children.length){const child=hair.children[0];hair.remove(child);child.geometry.dispose();}}
 function buildHair(){
   clearHair();
   // A scalp cap with a lower hairline at the back; deliberately stylized, not reconstructed.
   const geometry=new THREE.SphereGeometry(1,64,32,0,Math.PI*2,0,Math.PI/2);
   const pos=geometry.attributes.position;
   for(let i=0;i<pos.count;i++){
     const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),theta=Math.acos(Math.max(-1,Math.min(1,y)));
     const phi=Math.atan2(z,x),front=(Math.sin(phi)+1)/2;
     const limit=selected==='bob'?2.16-front*.92:1.74-front*.76;
     const t=theta/(Math.PI/2)*limit;
     pos.setXYZ(i,.765*Math.sin(t)*Math.cos(phi),.22+1.09*Math.cos(t),.72*Math.sin(t)*Math.sin(phi));
   }geometry.computeVertexNormals();hair.add(new THREE.Mesh(geometry,hairMat));
   if(selected==='crop'){
     for(let i=0;i<11;i++){const x=(i-5)*.105;const tuft=ellipsoid(hair,hairMat,x,1.08-Math.abs(x)*.27,.12,.15,.19,.43);tuft.rotation.z=-.15;}
   }else if(selected==='part'){
     for(let i=0;i<9;i++){const x=(i-4)*.14;const tuft=ellipsoid(hair,hairMat,x,1.12-Math.abs(x)*.2,.15,.21,.24,.53);tuft.rotation.z=-.42;}
   }else{
     for(const s of [-1,1])for(let i=0;i<7;i++){const z=-.4+i*.13;ellipsoid(hair,hairMat,s*(.68+Math.sin(i/6*Math.PI)*.04),-.02,z,.18,.71,.19);}
     ellipsoid(hair,hairMat,0,-.1,-.53,.65,.73,.22);
     for(let i=0;i<9;i++)ellipsoid(hair,hairMat,(i-4)*.135,.72,.53,.115,.28,.17);
   }
   hair.children.forEach(mesh=>{
     mesh.userData.basePosition=mesh.position.clone();
     mesh.userData.baseScale=mesh.scale.clone();
   });
   updateHairShape();
 }
 function updateHairShape(){
   const length=Number($('#length').value)/100;
   const fullness=(Number($('#volume').value)-30)/100;
   hair.children.forEach((mesh,index)=>{
     const position=mesh.userData.basePosition,scale=mesh.userData.baseScale;
     mesh.position.copy(position);mesh.scale.copy(scale);
     if(index===0){
       // Preserve scalp coverage; length changes the locks rather than stretching the head.
       const expansion=1+Math.max(0,fullness)*.035;
       mesh.scale.multiplyScalar(expansion);
       return;
     }
     const width=1+fullness*.3;
     mesh.scale.x=scale.x*width;mesh.scale.z=scale.z*width;
     mesh.position.x=position.x*(1+fullness*.06);
     mesh.position.z=position.z*(1+fullness*.06);
     const isBobFringe=selected==='bob'&&position.y>.5;
     const effectiveLength=isBobFringe?1+(length-1)*.35:length;
     mesh.scale.y=scale.y*effectiveLength*(1+Math.max(0,fullness)*.12);
     // Bob locks hang from the crown; short styles grow upward from their roots.
     mesh.position.y=position.y+(selected==='bob'?-1:1)*scale.y*(effectiveLength-1);
     if(selected!=='bob')mesh.position.y+=fullness*.1;
   });
   $('#length-value').value=$('#length').value+'%';
   $('#volume-value').value=$('#volume').value+'%';
 }
 buildHair();
 document.querySelectorAll('[data-style]').forEach(button=>button.onclick=()=>{selected=button.dataset.style;document.querySelectorAll('[data-style]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});buildHair();});
 $('#color').oninput=()=>hairMat.color.set($('#color').value);
 $('#length').oninput=updateHairShape;
 $('#volume').oninput=updateHairShape;
 let drag=null;
 renderer.domElement.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);};
 renderer.domElement.onpointermove=e=>{if(!drag)return;model.rotation.y+=(e.clientX-drag.x)*.01;model.rotation.x=THREE.MathUtils.clamp(model.rotation.x+(e.clientY-drag.y)*.006,-.55,.55);drag={x:e.clientX,y:e.clientY};};
 renderer.domElement.onpointerup=renderer.domElement.onpointercancel=()=>drag=null;
 renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();camera.position.z=THREE.MathUtils.clamp(camera.position.z+e.deltaY*.004,5,10);},{passive:false});
 $('#front').onclick=()=>model.rotation.set(0,0,0);$('#side').onclick=()=>model.rotation.set(0,Math.PI/2,0);$('#back').onclick=()=>model.rotation.set(0,Math.PI,0);
 const resize=()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
 renderer.setAnimationLoop(()=>renderer.render(scene,camera));
 $('#save').onclick=()=>{
   if(savedCount>=6){toast('最多保留 6 个造型，请清空后再保存');return;}
   renderer.render(scene,camera);const canvas=document.createElement('canvas');canvas.width=600;canvas.height=660;const ctx=canvas.getContext('2d');ctx.fillStyle='#e6ebe2';ctx.fillRect(0,0,600,660);
   const source=renderer.domElement, scale=Math.min(600/source.width,590/source.height);ctx.drawImage(source,(600-source.width*scale)/2,(590-source.height*scale)/2,source.width*scale,source.height*scale);
   ctx.fillStyle='#334f3c';ctx.font='16px sans-serif';ctx.fillText(names[selected]+' · 长度 '+$('#length').value+'% · 蓬松度 '+$('#volume').value+'%',24,613);ctx.font='14px sans-serif';ctx.fillText('发型实验室 · 示例头模，非本人重建',24,640);
   const url=canvas.toDataURL('image/png');$('#saved .empty')?.remove();const card=document.createElement('article');const img=new Image();img.src=url;img.alt=names[selected]+'示例头模对比图';card.append(img);const bottom=document.createElement('div');const label=document.createElement('span');label.textContent=names[selected];const link=document.createElement('a');link.href=url;link.download=`发型实验室-${names[selected]}-${++savedCount}.png`;link.textContent='下载图片 ↓';bottom.append(label,link);card.append(bottom);$('#saved').append(card);toast('已加入下方对比，可下载图片');
 };
}
$('#clear-saved').onclick=()=>{$('#saved').innerHTML='<p class="empty">还没有保存的造型。试试从一个正面角度开始。</p>';savedCount=0;};
