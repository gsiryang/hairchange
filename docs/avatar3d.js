import * as THREE from './vendor/three.module.js';
const $=s=>document.querySelector(s);
const host=$('#stage');
try {await start();}catch(error){$('#status').textContent='三维加载失败：'+error.message;console.error(error);}
async function start(){
 const response=await fetch('assets/reference-face.json');if(!response.ok)throw new Error('头模文件不可用');const data=await response.json();
 const texture=await new THREE.TextureLoader().loadAsync('assets/avatar-reference-v1.png');texture.colorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#eee5d8');
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 host.append(renderer.domElement);$('#status').hidden=true;
 const camera=new THREE.PerspectiveCamera(34,1,.1,50);camera.position.set(0,.02,6.9);camera.lookAt(0,-.08,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0xa3917c,2));const key=new THREE.DirectionalLight(0xffeddb,1.8);key.position.set(-3,4,5);scene.add(key);const fill=new THREE.DirectionalLight(0xffffff,1.1);fill.position.set(3,2,-3);scene.add(fill);
 const head=new THREE.Group();scene.add(head);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions.flat(),3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv.flat(),2));geo.setIndex(data.indices);geo.computeVertexNormals();
 const faceMat=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});const face=new THREE.Mesh(geo,faceMat);head.add(face);
 const skin=new THREE.MeshStandardMaterial({color:0xc79880,roughness:.92,side:THREE.DoubleSide});
 // Complete the unseen head behind the detected facial contour, rather than a flat image plane.
 const outline=data.oval.map(i=>new THREE.Vector3(...data.positions[i]));const pos=[],indices=[];const n=outline.length;
 for(let ring=0;ring<=10;ring++)for(let i=0;i<n;i++){
   const p=outline[i],t=ring/10,a=t*Math.PI/2,scale=Math.cos(a);
   const top=Math.max(0,p.y);
   pos.push(p.x*scale*(1+.08*Math.sin(a)),p.y*scale+top*.22*Math.sin(a)+.08*t,p.z*(1-t)-.98*Math.sin(a));
 }
 for(let r=0;r<10;r++)for(let i=0;i<n;i++){const a=r*n+i,b=r*n+(i+1)%n,c=a+n,d=b+n;indices.push(a,c,b,b,c,d);}
 const skullGeo=new THREE.BufferGeometry();skullGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));skullGeo.setIndex(indices);skullGeo.computeVertexNormals();head.add(new THREE.Mesh(skullGeo,skin));
 function oval(x,y,z,sx,sy,sz,mat=skin){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);head.add(mesh);return mesh;}
 const minY=Math.min(...data.positions.map(p=>p[1])),maxY=Math.max(...data.positions.map(p=>p[1]));
 oval(0,minY-.25,-.21,.31,.52,.32);oval(0,minY-.65,-.24,.95,.31,.47,new THREE.MeshStandardMaterial({color:0x292929,roughness:1}));
 for(const sign of [-1,1]){oval(sign*.77,-.13,-.04,.12,.23,.09);oval(sign*.80,-.13,.026,.063,.14,.035,new THREE.MeshStandardMaterial({color:0xb6846b,roughness:1}));}
 const hair=new THREE.Group();head.add(hair);let style='crop';
 const hairMat=new THREE.MeshStandardMaterial({color:$('#hair-color').value,roughness:.73,side:THREE.DoubleSide});
 const lineMat=new THREE.LineBasicMaterial({color:0x3a3029,transparent:true,opacity:.65});
 // Parametric scalp and individual 3D strand curves: every style has its own volume and silhouette.
 function hairPoint(t,phi,offset=0){
   const front=(Math.cos(phi)+1)/2;
   let limit=1.95-.95*front;
   if(style==='curtain')limit+=.48*Math.pow(front,5)*(.3+.7*Math.abs(Math.sin(phi)));
   const angle=t*limit, wave=Math.sin(phi*19+t*24)*.009+Math.sin(phi*37-t*31)*.006;
   const lift=style==='part'?.19:style==='curtain'?.09:.07;
   let x=(.80+offset+wave)*Math.sin(angle)*Math.sin(phi);
   let y=.12+(maxY+.28+lift+offset+wave-.12)*Math.cos(angle);
   let z=-.24+(.82+offset+wave)*Math.sin(angle)*Math.cos(phi);
   if(style==='part'){x+=.15*Math.pow(1-t,1.4);y+=.065*Math.sin(phi)*Math.sin(angle);}
   if(style==='curtain'){
     const parting=Math.exp(-Math.pow(Math.sin(phi)/.09,2))*Math.pow(front,3);
     y-=.07*parting*Math.sin(angle);
     x+=Math.sign(Math.sin(phi))*.025*Math.pow(front,4)*Math.sin(angle);
   }
   if(style==='crop')y+=.045*Math.sin(phi*11+t*12)*Math.sin(angle);
   return new THREE.Vector3(x,y,z);
 }
 function buildHair(){
   while(hair.children.length){const child=hair.children[0];hair.remove(child);child.geometry.dispose();}
   const verts=[],idx=[],rows=45,cols=100;
   for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++)verts.push(...hairPoint(i/rows,j/cols*Math.PI*2).toArray());
   for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+cols+1;idx.push(a,b,a+1,a+1,b,b+1);}
   const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));cap.setIndex(idx);cap.computeVertexNormals();hair.add(new THREE.Mesh(cap,hairMat));
   let seed=173;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const strands=[];
   for(let i=0;i<4300;i++){
     const phi=random()*Math.PI*2,start=random()*.87,length=.12+random()*.19;
     let previous=null;for(let j=0;j<=12;j++){
       const t=Math.min(1.025,start+j/12*length);
       const sweep=style==='part'?.42:style==='curtain'?(Math.sin(phi)>0?.18:-.18):.08*Math.sin(phi*8);
       const p=hairPoint(t,phi+sweep*j/12,.007+Math.sin(j/12*Math.PI)*(.01+length*.07));
       if(previous)strands.push(...previous.toArray(),...p.toArray());previous=p;
     }
   }
   const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(strands,3));hair.add(new THREE.LineSegments(sg,lineMat));
 }
 buildHair();
 document.querySelectorAll('[data-hair]').forEach(b=>b.onclick=()=>{style=b.dataset.hair;buildHair();document.querySelectorAll('[data-hair]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});});
 $('#hair-color').oninput=()=>{hairMat.color.set($('#hair-color').value);lineMat.color.set($('#hair-color').value).lerp(new THREE.Color('#a18b77'),.2);};
 $('#wire').onchange=()=>{faceMat.wireframe=$('#wire').checked;skin.wireframe=$('#wire').checked;};
 document.querySelectorAll('[data-angle]').forEach(b=>b.onclick=()=>head.rotation.set(0,Number(b.dataset.angle),0));
 const pointers=new Map();let pinch=0;
 renderer.domElement.onpointerdown=e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});renderer.domElement.setPointerCapture(e.pointerId);};
 renderer.domElement.onpointermove=e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){head.rotation.y+=(e.clientX-old.x)*.009;head.rotation.x=THREE.MathUtils.clamp(head.rotation.x+(e.clientY-old.y)*.006,-.5,.5);}else{const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)camera.position.z=THREE.MathUtils.clamp(camera.position.z+(pinch-distance)*.012,4.8,9);pinch=distance;}};
 const end=e=>{pointers.delete(e.pointerId);pinch=0;};renderer.domElement.onpointerup=end;renderer.domElement.onpointercancel=end;
 renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();camera.position.z=THREE.MathUtils.clamp(camera.position.z+e.deltaY*.004,4.8,9);},{passive:false});
 const resize=()=>{renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
 renderer.setAnimationLoop(()=>renderer.render(scene,camera));
 $('#download').onclick=()=>{renderer.render(scene,camera);const link=document.createElement('a');link.download=`参考头像-近似三维-${style}.png`;link.href=renderer.domElement.toDataURL('image/png');link.click();};
}
