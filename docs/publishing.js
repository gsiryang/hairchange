// Local prototype persistence. A server/account is required for public sharing.
const POST_KEY = 'fajian.posts.v1';
const POST_CATEGORIES = ['发型', '妆容', 'cosplay'];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validPostImage = value => typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length <= 1400000;
let postLoadError = '';
let ownPosts = loadOwnPosts();
const editorBuffers = new Map();
let editingKey = 'new';

function loadOwnPosts() {
  try {
    const raw = localStorage.getItem(POST_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || !list.every(p => p && Number.isSafeInteger(p.id) && p.id > 1000 && typeof p.title === 'string' && p.title.length <= 60 && typeof p.body === 'string' && p.body.length <= 2000 && POST_CATEGORIES.includes(p.cat) && ['published','draft'].includes(p.status) && Array.isArray(p.images) && p.images.length <= 4 && p.images.every(validPostImage))) throw new Error('invalid data');
    return list;
  } catch {
    postLoadError = '本地帖子暂时无法读取，请检查浏览器存储设置；原数据未被覆盖。';
    return [];
  }
}

function commitPosts(next) {
  if (postLoadError) throw new Error(postLoadError);
  try { localStorage.setItem(POST_KEY, JSON.stringify(next)); }
  catch { throw new Error('未能保存：浏览器空间不足或禁止存储，请减少图片或检查浏览器设置。'); }
  ownPosts = next;
}

function storePost(data, status, id = null) {
  const title = data.title.trim(), body = data.body.trim();
  if (!POST_CATEGORIES.includes(data.cat)) throw new Error('请选择分享分类');
  if (!title || title.length > 60) throw new Error('请填写 1–60 字的标题');
  if (body.length > 2000) throw new Error('正文最多 2000 字');
  if (status === 'published' && !body) throw new Error('写一点你的造型心得再发布吧');
  if (!Array.isArray(data.images) || data.images.length > 4 || !data.images.every(validPostImage)) throw new Error('图片无法保存，请重新选择');
  if (status === 'published' && !data.images.length) throw new Error('请添加至少一张分享图片');
  const existing = id === null ? null : ownPosts.find(p => p.id === id);
  if (id !== null && !existing) throw new Error('帖子不存在或已删除');
  if (!['published','draft'].includes(status)) throw new Error('无效帖子状态');
  const now = Date.now();
  const post = {id: existing?.id ?? Math.max(now, ...ownPosts.map(p=>p.id + 1)), title, body, cat:data.cat, images:[...data.images], status, createdAt:existing?.createdAt ?? now, updatedAt:now};
  commitPosts([post, ...ownPosts.filter(p=>p.id!==post.id)]);
  return post;
}

function removeOwnPost(id) {
  if (!ownPosts.some(p=>p.id===id)) throw new Error('帖子不存在或已删除');
  commitPosts(ownPosts.filter(p=>p.id!==id));
  editorBuffers.delete(String(id));
}

function presentOwnPost(p) { return {...p, own:true, author:'风格探索家', img:p.images[0] || pics.girl, likes:0}; }
function allPosts() { return [...ownPosts.filter(p=>p.status==='published').map(presentOwnPost), ...posts]; }
function findPost(id) { const own=ownPosts.find(p=>p.id===Number(id)); return own?presentOwnPost(own):posts.find(p=>p.id===Number(id)); }

function currentEditor() { return editorBuffers.get(editingKey); }
function publishPage(id) {
  editingKey = id ? String(id) : 'new';
  const existing = id ? ownPosts.find(p=>p.id===Number(id)) : null;
  if (id && !existing) return `${back('编辑分享','manage')}<p class="empty">这篇帖子不存在或已经删除。</p>`;
  if (!editorBuffers.has(editingKey)) editorBuffers.set(editingKey, existing ? {...existing, images:[...existing.images], busy:false} : {title:'', body:'', cat:'发型', images:[], busy:false});
  const draft = currentEditor();
  return `${back(existing?'编辑分享':'记录你的风格','me')}
    <div class="compose-heading"><span class="eyebrow">SHARE YOUR LOOK</span><h1>让你的灵感，<br>成为别人的心动。</h1><p>分享一次新发型、一个妆容，或你的角色时刻。</p></div>
    <form id="post-form" class="composer">
      <div class="section-label"><b>添加照片</b><span id="image-count">${draft.images.length}/4 · 第一张为封面</span></div>
      <div id="editor-images" class="editor-images">${editorImages(draft)}</div>
      <label class="upload-post">＋ 选择照片<input id="post-images" type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="添加分享照片"></label>
      <p class="muted" id="image-progress" role="status">${draft.busy?'正在处理图片…':'最多 4 张，每张不超过 10 MB，自动压缩保存。'}</p>
      <label class="field-label" for="post-title">标题 <span id="title-count">${draft.title.length}/60</span></label>
      <input id="post-title" class="post-input" maxlength="60" placeholder="给这次风格起个名字" value="${escapeHTML(draft.title)}" required>
      <label class="field-label" for="post-body">分享心得 <span id="body-count">${draft.body.length}/2000</span></label>
      <textarea id="post-body" class="post-input" maxlength="2000" rows="7" placeholder="这次做了什么改变？有哪些值得分享的小心得？">${escapeHTML(draft.body)}</textarea>
      <label class="field-label" for="post-category">分享分类</label>
      <select id="post-category" class="post-input">${POST_CATEGORIES.map(c=>`<option ${draft.cat===c?'selected':''}>${c}</option>`).join('')}</select>
      <p class="local-note">当前为本地体验：帖子仅保存在此浏览器，暂不会公开给其他用户。清除浏览器数据会丢失帖子。</p>
      <p id="publish-error" class="form-error" role="alert">${escapeHTML(postLoadError)}</p>
      <div class="publish-actions"><button type="button" class="secondary" data-draft="true">存草稿</button><button type="submit" class="primary">${existing?.status==='published'?'保存修改':'发布分享'}</button></div>
    </form>`;
}

function editorImages(draft) {
  return draft.images.map((src,i)=>`<div class="editor-photo"><img src="${src}" alt="第 ${i+1} 张分享照片">${i===0?'<span>封面</span>':''}<button type="button" data-remove-image="${i}" aria-label="移除第 ${i+1} 张照片">×</button></div>`).join('');
}

let manageFilter = 'published';
function managePage() {
  const shown=ownPosts.filter(p=>p.status===manageFilter);
  return `${back('我的帖子','me')}<div class="manage-heading"><div><span class="eyebrow">MY STORIES</span><h1>每一次改变，都值得记录。</h1></div><button class="chip" data-go="publish">＋ 发分享</button></div>
    <div class="tabs">${[['published','已发布'],['draft','草稿箱']].map(([key,label])=>`<button data-manage-filter="${key}" class="${manageFilter===key?'active':''}">${label} ${ownPosts.filter(p=>p.status===key).length}</button>`).join('')}</div>
    ${postLoadError?`<p class="form-error">${escapeHTML(postLoadError)}</p>`:''}
    ${shown.length?shown.map(p=>`<article class="manage-post"><button class="manage-preview" data-go="post/${p.id}">${p.images.length?`<img src="${p.images[0]}" alt="帖子封面">`:'<span class="no-cover">暂无封面</span>'}<div><span class="muted">${p.cat} · ${p.status==='draft'?'草稿':'本地发布'}</span><h3>${escapeHTML(p.title)}</h3><small>${new Date(p.updatedAt).toLocaleDateString('zh-CN')} 更新</small></div></button><div class="manage-actions"><button data-go="post/${p.id}">查看</button><button data-go="publish/${p.id}">编辑</button><button class="danger" data-delete-post="${p.id}">删除</button></div></article>`).join(''):`<div class="empty manage-empty"><span>✧</span><p>${manageFilter==='draft'?'草稿箱还是空的':'还没有发布的分享'}<br>从一张照片开始，记录你的风格。</p><button class="chip" data-go="publish">写第一篇分享</button></div>`}
    <p class="sample">本地帖子 · 刷新后保留 · 不同浏览器之间不会同步</p>`;
}

function updateImagePreview(buffer) {
  if (currentEditor() !== buffer || !document.querySelector('#editor-images')) return;
  $('#editor-images').innerHTML=editorImages(buffer);
  $('#image-count').textContent=`${buffer.images.length}/4 · 第一张为封面`;
}

async function compressPostImage(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>10*1024*1024) throw new Error('请选择 10 MB 以内的 JPG、PNG 或 WebP 图片');
  const url=URL.createObjectURL(file), img=new Image();
  try {
    img.src=url; await img.decode();
    const scale=Math.min(1,1000/Math.max(img.width,img.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const result=canvas.toDataURL('image/jpeg',.75);
    if (!validPostImage(result)) throw new Error('图片过大，请换一张图片');
    return result;
  } catch(error) { throw new Error(error.message==='图片过大，请换一张图片'?error.message:'无法读取图片，请选择有效的 JPG、PNG 或 WebP 图片'); }
  finally { URL.revokeObjectURL(url); }
}

function submitEditor(status) {
  const buffer=currentEditor();
  if (!buffer) return;
  const error=$('#publish-error');
  if (buffer.busy) {error.textContent='图片还在处理中，请稍等。';return;}
  try {
    const post=storePost(buffer,status,editingKey==='new'?null:Number(editingKey));
    editorBuffers.delete(editingKey);manageFilter=post.status;
    category='推荐';query='';
    location.hash='manage';toast(status==='draft'?'草稿已保存到此浏览器':'分享已保存，可在首页与我的帖子查看');
  } catch(err) { error.textContent=err.message; }
}

document.addEventListener('input',e=>{
  const buffer=currentEditor();if(!buffer)return;
  if(e.target.id==='post-title'){buffer.title=e.target.value;$('#title-count').textContent=`${buffer.title.length}/60`;}
  if(e.target.id==='post-body'){buffer.body=e.target.value;$('#body-count').textContent=`${buffer.body.length}/2000`;}
});
document.addEventListener('change',async e=>{
  const buffer=currentEditor();if(!buffer)return;
  if(e.target.id==='post-category')buffer.cat=e.target.value;
  if(e.target.id!=='post-images')return;
  const input=e.target,files=Array.from(input.files);if(!files.length)return;
  if(buffer.busy){toast('图片正在处理中');return;}
  if(files.length+buffer.images.length>4){toast('最多添加 4 张照片');input.value='';return;}
  buffer.busy=true;$('#image-progress').textContent='正在处理图片…';
  try {const images=[];for(const file of files)images.push(await compressPostImage(file));buffer.images.push(...images);updateImagePreview(buffer);}
  catch(error){toast(error.message);}
  finally {buffer.busy=false;input.value='';if(currentEditor()===buffer&&document.querySelector('#image-progress'))$('#image-progress').textContent='最多 4 张，每张不超过 10 MB，自动压缩保存。';}
});
document.addEventListener('submit',e=>{if(e.target.id==='post-form'){e.preventDefault();submitEditor('published');}});
document.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.draft)submitEditor('draft');
  if(button.dataset.removeImage!==undefined){const buffer=currentEditor();if(buffer.busy){toast('图片正在处理中');return;}buffer.images.splice(Number(button.dataset.removeImage),1);updateImagePreview(buffer);}
  if(button.dataset.manageFilter){manageFilter=button.dataset.manageFilter;render();}
  if(button.dataset.deletePost){const id=Number(button.dataset.deletePost);if(!window.confirm('删除这篇帖子？删除后无法恢复。'))return;try{removeOwnPost(id);liked.delete(id);saved.delete(id);render();toast('帖子已删除');}catch(error){toast(error.message);}}
});
