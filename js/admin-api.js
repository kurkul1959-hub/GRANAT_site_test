(() => {
  'use strict';
  const OWNER_ID='b0aa7109-bc50-4fd4-8ac2-68d4ce73eb7a';
  const BUCKET='product-images';
  const SESSION_KEY='granat-admin-test-session';
  const config=window.granatSupabase;
  let session=null;
  let refreshing=null;
  function forget(){session=null;try{sessionStorage.removeItem(SESSION_KEY);}catch{}}
  function retain(data){
    if(!data.access_token||!data.refresh_token)throw new Error('Не удалось получить сессию. Повторите вход.');
    session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)};
    try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));}catch{}
  }
  async function request(path,{method='GET',body,token,headers={}}={}){
    let response;
    try{
      response=await fetch(config.url+path,{method,headers:{apikey:config.publishableKey,...(token?{Authorization:`Bearer ${token}`} : {}),...headers},...(body!==undefined?{body}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
    }catch{
      throw new Error(method==='GET'?'Нет связи с Supabase. Проверьте интернет и повторите попытку.':'Ответ Supabase не получен. Изменение могло сохраниться — обновите список перед повторной записью.');
    }
    const text=await response.text();let data=null;try{data=text?JSON.parse(text):null;}catch{}
    if(!response.ok){
      if(response.status===401&&token){forget();const e=new Error('Сессия завершилась. Войдите снова.');e.auth=true;throw e;}
      if(path.startsWith('/auth/v1/token')&&[400,401,422].includes(response.status))throw new Error('Не удалось войти. Проверьте email и пароль.');
      if(path.startsWith('/storage/'))throw new Error('Фотография не загружена. Проверьте хранилище product-images и права владельца.');
      throw new Error('Supabase отклонил запрос. Проверьте политики RLS и права владельца.');
    }
    return data;
  }
  async function ensureSession(){
    if(!session){const e=new Error('Войдите в панель.');e.auth=true;throw e;}
    if(session.expires_at<=Date.now()/1000+60){
      if(!refreshing)refreshing=(async()=>{
        try{retain(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token}),headers:{'Content-Type':'application/json'}}));}
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
  window.granatAdminApi=Object.freeze({login,restore,logout,list,save,upload,checkPhoto});
})();
