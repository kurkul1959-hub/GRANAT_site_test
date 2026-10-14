(() => {
  'use strict';
  const api=window.granatAdminApi;
  const $=id=>document.getElementById(id);
  let products=[];
  let editingId=null;
  let busy=false;
  let objectUrl=null;
  let loaded=false;
  function message(text,kind=''){ $('message').textContent=text;$('message').className=`message ${kind}`; }
  function setBusy(value){
    busy=value;
    $('login-fields').disabled=value;$('product-fields').disabled=value;
    for(const button of $('workspace').querySelectorAll('button'))button.disabled=value;
    $('new-product').disabled=value||!loaded;
  }
  function signedOut(){
    products=[];loaded=false;editingId=null;
    $('workspace').hidden=true;$('editor').hidden=true;$('login-section').hidden=false;
    $('product-list').replaceChildren();$('product-form').reset();$('password').value='';clearPreview();
  }
  function handleError(e){if(e.auth)signedOut();message(e.message||'Не удалось выполнить действие.','error');}
  async function run(action){
    if(busy)return;setBusy(true);
    try{await action();}catch(e){handleError(e);}finally{setBusy(false);}
  }
  function clearPreview(){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;$('photo-preview').hidden=true;$('photo-preview').removeAttribute('src');}
  function imageUrl(value){
    const text=value.trim();if(!text)throw new Error('Добавьте фотографию или ссылку на неё.');
    const url=new URL(text,document.baseURI);
    if(url.protocol!=='https:'&&url.origin!==location.origin)throw new Error('Используйте HTTPS-ссылку или путь images/имя-файла.');
    return url.href;
  }
  function previewExisting(value){
    clearPreview();if(!value)return;
    try{$('photo-preview').src=imageUrl(value);$('photo-preview').hidden=false;}catch{}
  }
  $('photo-preview').addEventListener('error',()=>{ $('photo-preview').hidden=true; });
  function render(){
    $('product-list').replaceChildren();
    $('list-summary').textContent=products.length?`Всего товаров: ${products.length}. Скрытых: ${products.filter(p=>!p.is_available).length}.`:'Товаров пока нет.';
    $('categories').replaceChildren();
    for(const category of new Set(products.map(p=>p.category))){const option=document.createElement('option');option.value=category;$('categories').append(option);}
    for(const product of products){
      const article=document.createElement('article');article.className='admin-product';article.dataset.id=String(product.id);
      const img=document.createElement('img');img.alt=product.name;img.loading='lazy';try{img.src=imageUrl(product.image_url||'');}catch{img.hidden=true;}img.addEventListener('error',()=>{img.hidden=true;});article.append(img);
      const body=document.createElement('div');body.className='admin-product-body';
      const title=document.createElement('h2');title.textContent=product.name;body.append(title);
      const price=document.createElement('p');price.textContent=`${product.price} ₽ / кг`;body.append(price);
      const state=document.createElement('p');state.className=`product-state ${product.is_available?'':'state-hidden'}`;state.textContent=product.is_available?'На витрине':'Скрыт с витрины';body.append(state);
      const actions=document.createElement('div');actions.className='toolbar actions';
      const edit=document.createElement('button');edit.type='button';edit.textContent='Изменить';edit.addEventListener('click',()=>{if(!busy)openEditor(product);});
      const toggle=document.createElement('button');toggle.type='button';toggle.className='secondary';toggle.textContent=product.is_available?'Скрыть':'Вернуть';
      toggle.addEventListener('click',()=>run(async()=>{
        await api.save(product.id,{is_available:!product.is_available});
        if(editingId===product.id)closeEditor();
        try{await reload();message(product.is_available?'Товар скрыт с витрины.':'Товар возвращён на витрину.','success');}
        catch(e){render();throw new Error('Изменение сохранено, но список не обновился. Нажмите «Обновить список».');}
      }));
      actions.append(edit,toggle);body.append(actions);article.append(body);$('product-list').append(article);
    }
  }
  async function reload(){products=await api.list();loaded=true;render();}
  function closeEditor(){ $('editor').hidden=true;editingId=null;clearPreview();$('product-form').reset();$('photo-name').textContent=''; }
  function openEditor(product=null){
    editingId=product?.id??null;$('product-form').reset();$('photo-name').textContent='';
    $('editor-title').textContent=product?'Изменить товар':'Добавить товар';
    $('product-name').value=product?.name||'';$('product-price').value=product?.price??'';
    $('product-description').value=product?.description||'';$('product-category').value=product?.category||'Фрукты';
    $('product-available').checked=product?.is_available??true;$('product-image').value=product?.image_url||'';
    previewExisting(product?.image_url);$('editor').hidden=false;$('editor').scrollIntoView({behavior:'smooth',block:'start'});$('product-name').focus({preventScroll:true});
  }
  $('login-form').addEventListener('submit',e=>{e.preventDefault();run(async()=>{
    const email=$('email').value.trim(),password=$('password').value;
    try{await api.login(email,password);}finally{$('password').value='';}
    $('login-section').hidden=true;$('workspace').hidden=false;
    await reload();message('Вы вошли. Можно редактировать товары.','success');
  });});
  $('logout').addEventListener('click',()=>run(async()=>{await api.logout();signedOut();message('Вы вышли из панели.');}));
  $('new-product').addEventListener('click',()=>{if(!busy&&loaded)openEditor();});
  $('cancel').addEventListener('click',closeEditor);
  $('reload').addEventListener('click',()=>run(async()=>{await reload();message('Список обновлён.','success');}));
  $('product-image').addEventListener('input',()=>{if(!$('product-photo').files.length)previewExisting($('product-image').value);});
  $('choose-photo').addEventListener('click',()=>{if(!busy)$('product-photo').click();});
  $('product-photo').addEventListener('change',()=>{
    clearPreview();const file=$('product-photo').files[0];$('photo-name').textContent='';if(!file){previewExisting($('product-image').value);return;}
    try{api.checkPhoto(file);$('photo-name').textContent=file.name;objectUrl=URL.createObjectURL(file);$('photo-preview').src=objectUrl;$('photo-preview').hidden=false;}
    catch(e){$('product-photo').value='';handleError(e);}
  });
  $('product-form').addEventListener('submit',e=>{e.preventDefault();run(async()=>{
    const price=Number($('product-price').value),name=$('product-name').value.trim(),description=$('product-description').value.trim(),category=$('product-category').value.trim();
    if(!name||!description||!category||!Number.isSafeInteger(price)||price<0||price>1000000)throw new Error('Заполните название, описание и категорию. Цена — целое число от 0 до 1 000 000 ₽.');
    const file=$('product-photo').files[0];
    let photo=file?'':imageUrl($('product-image').value);
    if(file){photo=await api.upload(file);$('product-image').value=photo;$('product-photo').value='';$('photo-name').textContent='';previewExisting(photo);}
    await api.save(editingId,{name,price,description,category,image_url:photo,is_available:$('product-available').checked});
    closeEditor();
    try{await reload();message('Товар сохранён. Изменения доступны покупателям после обновления каталога.','success');}
    catch(e){throw new Error('Товар сохранён, но список не обновился. Нажмите «Обновить список».');}
  });});
  run(async()=>{const user=await api.restore();if(!user)return;$('login-section').hidden=true;$('workspace').hidden=false;await reload();message('Вход восстановлен.','success');});
})();
