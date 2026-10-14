(() => {
  'use strict';
  const OWNER_ID='b0aa7109-bc50-4fd4-8ac2-68d4ce73eb7a';
  const BUCKET='product-images';
  const SESSION_KEY='granat-admin-test-session';
  const config=window.granatSupabase;
  // Capture and remove recovery credentials before displaying any UI.
  let recoveryLink=readRecoveryLink();
  let session=null;
  let refreshing=null;
  function forget(){session=null;try{sessionStorage.removeItem(SESSION_KEY);}catch{}}
  function retain(data,recovery=false){
    if(!data.access_token||!data.refresh_token)throw new Error('Не удалось получить сессию. Повторите вход.');
    session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600),recovery};
    try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));}catch{}
  }
  async function request(path,{method='GET',body,token,headers={}}={}){
    let response;
    try{
      response=await fetch(config.url+path,{method,headers:{apikey:config.publishableKey,...(token?{Authorization:`Bearer ${token}`} : {}),...headers},...(body!==undefined?{body}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
    }catch{
      if(path==='/auth/v1/user'&&method==='PUT')throw new Error('Ответ Supabase не получен. Пароль мог измениться. Попробуйте войти с новым паролем; если вход не удастся, запросите новое письмо восстановления.');
      throw new Error(method==='GET'?'Нет связи с Supabase. Проверьте интернет и повторите попытку.':'Ответ Supabase не получен. Изменение могло сохраниться — обновите список перед повторной записью.');
    }
    const text=await response.text();let data=null;try{data=text?JSON.parse(text):null;}catch{}
    if(!response.ok){
      if(path==='/auth/v1/verify'&&[400,401,403,422].includes(response.status))throw expiredRecovery();
      if(response.status===401&&token){forget();const e=new Error('Сессия завершилась. Войдите снова.');e.auth=true;throw e;}
      if(path.startsWith('/auth/v1/token')&&[400,401,422].includes(response.status))throw new Error('Не удалось войти. Проверьте email и пароль.');
      if(path==='/auth/v1/user'&&method==='PUT'&&[400,422].includes(response.status))throw new Error(data?.code==='same_password'?'Новый пароль должен отличаться от прежнего.':'Supabase отклонил пароль. Выберите более надёжный пароль согласно настройкам проекта.');
      if(path.startsWith('/storage/'))throw new Error('Фотография не загружена. Проверьте хранилище product-images и права владельца.');
      throw new Error('Supabase отклонил запрос. Проверьте политики RLS и права владельца.');
    }
    return data;
  }
  async function ensureSession(){
    if(!session){const e=new Error('Войдите в панель.');e.auth=true;throw e;}
    if(session.expires_at<=Date.now()/1000+60){
      if(!refreshing)refreshing=(async()=>{
        try{const recovery=session.recovery;retain(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token}),headers:{'Content-Type':'application/json'}}),recovery);}
        catch(e){forget();e.auth=true;throw e;}
        finally{refreshing=null;}
      })();
      await refreshing;
    }
    return session.access_token;
  }
  async function verifyOwner(){
    const user=await request('/auth/v1/user',{token:await ensureSession()});
    if(user?.id!==OWNER_ID){forget();const e=new Error('Эта учётная запись не является владельцем магазина.');e.auth=true;throw e;}
    return user;
  }
  async function login(email,password){
    forget();retain(await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password}),headers:{'Content-Type':'application/json'}}));
    try{return await verifyOwner();}catch(e){forget();throw e;}
  }
  async function restore(){
    try{const saved=sessionStorage.getItem(SESSION_KEY);if(!saved)return null;session=JSON.parse(saved);return await verifyOwner();}
    catch(e){forget();throw e;}
  }
  function readRecoveryLink(){
    const url=new URL(location.href),hash=new URLSearchParams(url.hash.slice(1));
    const keys=['access_token','refresh_token','expires_in','expires_at','token_hash','type','code','error','error_code','error_description','token_type'];
    if(!keys.some(key=>hash.has(key)||url.searchParams.has(key)))return null;
    const link={};for(const key of keys){link[key]=hash.get(key)??url.searchParams.get(key);url.searchParams.delete(key);}
    url.hash='';history.replaceState(null,'',url.pathname+url.search);
    return link;
  }
  function expiredRecovery(){const e=new Error('Ссылка восстановления недействительна или просрочена. Запросите новое письмо в Supabase и откройте последнюю ссылку.');e.auth=true;return e;}
  async function beginRecovery(){
    const link=recoveryLink;recoveryLink=null;
    if(!link){
      let saved;try{saved=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');}catch{}
      if(!saved?.recovery)return false;
      session=saved;
      try{await verifyOwner();return true;}catch(e){forget();if(e.auth)throw expiredRecovery();throw e;}
    }
    forget();
    if(link.error||link.error_code)throw expiredRecovery();
    if(link.code)throw new Error('Ссылка требует PKCE-код, которого нет в этой вкладке. Запросите новое письмо через Authentication → Users → Send password recovery с адресом тестовой admin.html.');
    if(link.type!=='recovery')throw expiredRecovery();
    try{
      if(link.token_hash){
        retain(await request('/auth/v1/verify',{method:'POST',body:JSON.stringify({token_hash:link.token_hash,type:'recovery'}),headers:{'Content-Type':'application/json'}}),true);
      }else{
        if(!link.access_token||!link.refresh_token)throw expiredRecovery();
        const expiresAt=Number(link.expires_at);
        if(link.expires_at&&(!Number.isFinite(expiresAt)||expiresAt<=Date.now()/1000))throw expiredRecovery();
        const expiresIn=Number(link.expires_in||3600);
        if(!Number.isFinite(expiresIn)||expiresIn<=0)throw expiredRecovery();
        retain({access_token:link.access_token,refresh_token:link.refresh_token,expires_in:Math.min(expiresIn,3600)},true);
      }
      await verifyOwner();return true;
    }catch(e){forget();if(e.auth)throw expiredRecovery();throw e;}
  }
  async function resetPassword(password){
    if(!session?.recovery)throw expiredRecovery();
    if(typeof password!=='string'||password.length<8)throw new Error('Пароль должен содержать не менее 8 символов.');
    await verifyOwner();
    const user=await request('/auth/v1/user',{method:'PUT',token:await ensureSession(),body:JSON.stringify({password}),headers:{'Content-Type':'application/json'}});
    if(user?.id!==OWNER_ID){forget();throw expiredRecovery();}
    await logout();
  }
  async function logout(){
    const token=session?.access_token;forget();
    if(token)try{await request('/auth/v1/logout?scope=local',{method:'POST',token});}catch{}
  }
  async function list(){
    const data=await request('/rest/v1/products?select=id,name,price,description,image_url,category,is_available&order=id.asc',{token:await ensureSession()});
    if(!Array.isArray(data))throw new Error('Supabase вернул неверный список товаров.');
    for(const row of data)if(!Number.isSafeInteger(row.id)||row.id<=0)throw new Error('Неподдерживаемый ID товара. Запись отключена.');
    return data;
  }
  async function save(id,values){
    if(id!==null&&(!Number.isSafeInteger(id)||id<=0))throw new Error('Неверный ID товара.');
    const data=await request('/rest/v1/products'+(id===null?'':`?id=eq.${id}`),{method:id===null?'POST':'PATCH',token:await ensureSession(),body:JSON.stringify(values),headers:{'Content-Type':'application/json',Prefer:'return=representation'}});
    if(!Array.isArray(data)||data.length!==1)throw new Error('Сохранение не подтверждено. Проверьте SELECT-политику владельца и обновите список.');
    return data[0];
  }
  function checkPhoto(file){
    if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Выберите фотографию JPG, PNG или WebP.');
    if(file.size===0||file.size>5*1024*1024)throw new Error('Размер фотографии должен быть не больше 5 МБ.');
  }
  async function upload(file){
    checkPhoto(file);
    const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
    const path=`${OWNER_ID}/${crypto.randomUUID()}.${ext}`;
    await request(`/storage/v1/object/${BUCKET}/${path}`,{method:'POST',token:await ensureSession(),body:file,headers:{'Content-Type':file.type,'x-upsert':'false'}});
    return `${config.url}/storage/v1/object/public/${BUCKET}/${path}`;
  }
  window.granatAdminApi=Object.freeze({login,restore,logout,list,save,upload,checkPhoto,beginRecovery,resetPassword});
})();
