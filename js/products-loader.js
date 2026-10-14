(() => {
 const legacyIds={'1':'apples','2':'citrus','3':'grapes','4':'pink','5':'melon'};
 window.loadGranatProducts=async()=>{
  const config=window.granatSupabase;
  const url=new URL('/rest/v1/products',config.url);
  url.search=new URLSearchParams({select:'id,name,price,description,image_url,category,is_available',is_available:'eq.true',order:'id.asc'});
  const response=await fetch(url,{headers:{apikey:config.publishableKey,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Catalog request failed');
  const rows=await response.json();
  if(!Array.isArray(rows))throw new Error('Invalid catalog');
  const ids=new Set();
  return rows.filter(row=>row.is_available===true).map(row=>{
   if(!Number.isSafeInteger(row.id)||row.id<=0||ids.has(row.id)||typeof row.price!=='number'||!Number.isFinite(row.price)||row.price<0||typeof row.name!=='string'||!row.name.trim()||typeof row.description!=='string'||typeof row.category!=='string'||typeof row.image_url!=='string')throw new Error('Invalid product');
   ids.add(row.id);
   const imageUrl=new URL(row.image_url,new URL('../',document.currentScript?.src||new URL('js/products-loader.js',document.baseURI)));
   if(imageUrl.protocol!=='https:'&&imageUrl.origin!==location.origin)throw new Error('Invalid product image');
   return {id:legacyIds[String(row.id)]||`supabase:${row.id}`,supabaseId:row.id,name:row.name,price:row.price,description:row.description,imageUrl:imageUrl.href,category:row.category,unit:'кг'};
  });
 };
})();
