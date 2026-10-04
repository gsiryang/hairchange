import * as THREE from './vendor/three.module.js';
import { OBJLoader } from './vendor/OBJLoader.js';

const $ = selector => document.querySelector(selector);
const assetRoot = 'assets/salon3d/';
const styleData = {
  short: { obj: 'hair-short.obj', texture: 'hair-short.png', fitX: 1, fitY: .75, fitZ: 1, offsetZ: .5 },
  bob: { obj: 'hair-bob.obj', texture: 'hair-bob.png', fitX: .72, fitY: .9, fitZ: .72, offsetZ: .12 },
  long: { obj: 'hair-long.obj', texture: 'hair-long.png', fitX: .66, fitY: .82, fitZ: .7, offsetZ: .12 }
};
const state = { style: 'short', yaw: 0, pitch: 0, distance: 7.1, length: 50, volume: 50, color: '#171412' };
let renderer, camera, scene, modelRoot, hairRoot, scalpMaterial, frameHandle;
const hairObjects = new Map();

init().catch(error => {
  console.error(error);
  $('#loading').innerHTML = '<b>3D 头模加载失败</b><small>请刷新页面后重试</small>';
  $('#error').style.display = 'block';
  $('#error').textContent = '没有成功载入模型文件。请确认网络正常，并使用支持 WebGL 的浏览器。';
});

async function init() {
  setupScene();
  bindControls();
  const manager = new THREE.LoadingManager();
  const objLoader = new OBJLoader(manager);
  const textureLoader = new THREE.TextureLoader(manager);
  const [head, eyes, skinTexture, eyeTexture, ...hairAssets] = await Promise.all([
    objLoader.loadAsync(assetRoot + 'head.obj'),
    objLoader.loadAsync(assetRoot + 'eyes.obj'),
    textureLoader.loadAsync(assetRoot + 'skin.png'),
    textureLoader.loadAsync(assetRoot + 'brown_eye.png'),
    ...Object.entries(styleData).flatMap(([, item]) => [objLoader.loadAsync(assetRoot + item.obj), textureLoader.loadAsync(assetRoot + item.texture)])
  ]);

  [skinTexture, eyeTexture, ...hairAssets.filter((_, index) => index % 2 === 1)].forEach(texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  });

  const skinMaterial = new THREE.MeshPhysicalMaterial({map:skinTexture,roughness:.72,metalness:0,clearcoat:.08,clearcoatRoughness:.65});
  head.traverse(child => {
    if (!child.isMesh) return;
    child.visible = child.name === 'body';
    if (child.visible) {
      child.material = skinMaterial;
      child.castShadow = true;
      child.receiveShadow = true;
      smoothGeometry(child.geometry);
    }
  });
  modelRoot.add(head);
  const eyeMaterial = new THREE.MeshPhysicalMaterial({map:eyeTexture,roughness:.25,clearcoat:1,clearcoatRoughness:.12});
  eyes.position.set(0,-8.466,-.097);
  eyes.traverse(child => {
    if (!child.isMesh) return;
    child.material = eyeMaterial;
    child.castShadow = true;
    smoothGeometry(child.geometry);
  });
  modelRoot.add(eyes);
  addIrises();
  addBrows();
  addScalpCap();

  const entries = Object.keys(styleData);
  entries.forEach((name, index) => {
    const object = hairAssets[index * 2];
    const texture = hairAssets[index * 2 + 1];
    const material = new THREE.MeshPhysicalMaterial({
      map:texture,color:hairTint(),roughness:.78,metalness:0,transparent:true,alphaTest:.08,
      side:THREE.DoubleSide,depthWrite:true,sheen:.35,sheenColor:new THREE.Color('#8f7968')
    });
    const pivot = new THREE.Group();
    pivot.position.y = 7.15;
    object.position.y = -7.15;
    object.position.z = styleData[name].offsetZ;
    object.traverse(child => {
      if (!child.isMesh) return;
      child.material = material;
      child.castShadow = true;
      smoothGeometry(child.geometry);
    });
    pivot.add(object);
    pivot.visible = name === state.style;
    hairRoot.add(pivot);
    hairObjects.set(name, {pivot, material, fitX:styleData[name].fitX, fitY:styleData[name].fitY, fitZ:styleData[name].fitZ});
  });

  $('#loading').remove();
  updateHairShape();
  resize();
  animate();
  sendHeight();
}

function setupScene() {
  const host = $('#viewport');
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8e3da');
  camera = new THREE.PerspectiveCamera(27, 1, .1, 50);
  renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);

  modelRoot = new THREE.Group();
  modelRoot.position.y = -7.2;
  scene.add(modelRoot);
  hairRoot = new THREE.Group();
  modelRoot.add(hairRoot);

  scene.add(new THREE.HemisphereLight(0xfffaf2,0x6e756f,2.2));
  const key = new THREE.DirectionalLight(0xffe8d2,4.1); key.position.set(-3.5,8.5,5); key.castShadow=true; scene.add(key);
  const fill = new THREE.DirectionalLight(0xddeaff,2.1); fill.position.set(4,7,3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff,3.2); rim.position.set(2,8,-4); scene.add(rim);
  window.addEventListener('resize', resize);
}

function bindControls() {
  const host = $('.viewer-card');
  let pointerId = null, lastX = 0, lastY = 0, startDistance = 0, pinchDistance = 0;
  const pointers = new Map();
  host.addEventListener('pointerdown', event => {
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    host.setPointerCapture(event.pointerId);
    if (pointerId === null) { pointerId=event.pointerId; lastX=event.clientX; lastY=event.clientY; }
    if (pointers.size===2) { const p=[...pointers.values()]; pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y); startDistance=state.distance; }
  });
  host.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if (pointers.size===2) {
      const p=[...pointers.values()], distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
      state.distance=THREE.MathUtils.clamp(startDistance-(distance-pinchDistance)*.012,4.5,9);
    } else if (event.pointerId===pointerId) {
      state.yaw += (event.clientX-lastX)*.011;
      state.pitch = THREE.MathUtils.clamp(state.pitch+(event.clientY-lastY)*.004,-.16,.15);
      lastX=event.clientX; lastY=event.clientY; updateViewLabel();
    }
  });
  const release = event => {pointers.delete(event.pointerId); if(event.pointerId===pointerId){pointerId=null; const first=pointers.keys().next(); if(!first.done) pointerId=first.value;}};
  host.addEventListener('pointerup',release); host.addEventListener('pointercancel',release);
  host.addEventListener('wheel',event=>{event.preventDefault();state.distance=THREE.MathUtils.clamp(state.distance+event.deltaY*.004,4.5,9)},{passive:false});
  $('#reset').addEventListener('click',()=>{state.yaw=0;state.pitch=0;state.distance=7.1;updateViewLabel();});

  document.querySelectorAll('.style').forEach((button,index)=>button.addEventListener('click',()=>{
    state.style=button.dataset.style;
    document.querySelectorAll('.style').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-checked',String(active));});
    hairObjects.forEach((item,name)=>item.pivot.visible=name===state.style);
    $('#style-count').textContent=`${index+1} / 3`;
    updateHairShape();
  }));
  for(const id of ['length','volume']) $('#'+id).addEventListener('input',event=>{state[id]=Number(event.target.value);$('#'+id+'-value').value=state[id];updateHairShape();});
  $('#restore').addEventListener('click',()=>{state.length=state.volume=50;$('#length').value=$('#volume').value=50;$('#length-value').value=$('#volume-value').value=50;updateHairShape();});
  document.querySelectorAll('.color').forEach(button=>button.addEventListener('click',()=>{
    state.color=button.dataset.color;
    document.querySelectorAll('.color').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-checked',String(active));});
    hairObjects.forEach(item=>item.material.color.copy(hairTint()));
    scalpMaterial.color.set(state.color);
  }));
}

function updateHairShape() {
  const item=hairObjects.get(state.style); if(!item) return;
  const lengthScale=.88+state.length/100*.24;
  const volumeScale=.89+state.volume/100*.22;
  item.pivot.scale.set(volumeScale*item.fitX,lengthScale*item.fitY,volumeScale*item.fitZ);
}
function hairTint(){return new THREE.Color(state.color).lerp(new THREE.Color('#ffffff'),.58);}
function addScalpCap(){
  scalpMaterial=new THREE.MeshStandardMaterial({color:state.color,roughness:.94,side:THREE.DoubleSide});
  const cap=new THREE.Mesh(new THREE.SphereGeometry(1,64,28,0,Math.PI*2,0,Math.PI/2),scalpMaterial);
  cap.position.set(0,7.62,.56);
  cap.scale.set(.74,.9,.88);
  cap.castShadow=true;
  hairRoot.add(cap);
}
function addBrows(){
  const material=new THREE.MeshStandardMaterial({color:'#2b211d',roughness:.94});
  [-1,1].forEach(sign=>{
    const points=[
      new THREE.Vector3(sign*.16,7.455,1.305),
      new THREE.Vector3(sign*.29,7.515,1.335),
      new THREE.Vector3(sign*.44,7.47,1.265)
    ];
    if(sign<0)points.reverse();
    const curve=new THREE.CatmullRomCurve3(points);
    const brow=new THREE.Mesh(new THREE.TubeGeometry(curve,18,.022,7,false),material);
    modelRoot.add(brow);
  });
}
function addIrises(){
  const irisMaterial=new THREE.MeshPhysicalMaterial({color:'#4a2415',roughness:.35,clearcoat:.7,clearcoatRoughness:.2});
  const pupilMaterial=new THREE.MeshStandardMaterial({color:'#080604',roughness:.5});
  [-1,1].forEach(sign=>{
    const iris=new THREE.Mesh(new THREE.CircleGeometry(.052,36),irisMaterial);
    iris.position.set(sign*.3078,7.2841,1.393);
    modelRoot.add(iris);
    const pupil=new THREE.Mesh(new THREE.CircleGeometry(.022,30),pupilMaterial);
    pupil.position.set(sign*.3078,7.2841,1.394);
    modelRoot.add(pupil);
  });
}
function smoothGeometry(geometry){
  const position=geometry.getAttribute('position');
  if(!position||position.count%3!==0)return;
  const sums=new Map();
  const key=i=>`${position.getX(i).toFixed(5)},${position.getY(i).toFixed(5)},${position.getZ(i).toFixed(5)}`;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3(),normal=new THREE.Vector3();
  for(let i=0;i<position.count;i+=3){
    a.fromBufferAttribute(position,i);b.fromBufferAttribute(position,i+1);c.fromBufferAttribute(position,i+2);
    normal.crossVectors(ab.subVectors(b,a),ac.subVectors(c,a));
    for(let j=0;j<3;j++){const k=key(i+j),sum=sums.get(k)||new THREE.Vector3();sum.add(normal);sums.set(k,sum);}
  }
  const normals=new Float32Array(position.count*3);
  for(let i=0;i<position.count;i++){const n=sums.get(key(i)).normalize();normals[i*3]=n.x;normals[i*3+1]=n.y;normals[i*3+2]=n.z;}
  geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));
}
function updateViewLabel(){const angle=((state.yaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2);let text='正面';if(angle>.55&&angle<2.55)text='右侧';else if(angle>3.73&&angle<5.73)text='左侧';else if(angle>=2.55&&angle<=3.73)text='背面';$('#view-label').textContent=text;}
function resize(){if(!renderer)return;const host=$('#viewport'),width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
function animate(){frameHandle=requestAnimationFrame(animate);modelRoot.rotation.y=state.yaw;modelRoot.rotation.x=state.pitch;camera.position.set(0,.15,state.distance);camera.lookAt(0,.1,0);renderer.render(scene,camera);}
function sendHeight(){if(window.parent===window)return;window.parent.postMessage({type:'studio-height',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+10},location.origin);}
window.addEventListener('beforeunload',()=>cancelAnimationFrame(frameHandle));
