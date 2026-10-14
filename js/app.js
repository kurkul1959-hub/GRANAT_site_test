(async()=>{
const page=document.body.dataset.page;
const links=[['index.html','Главная','home'],['assortment.html','Ассортимент и цены','catalog'],['contacts.html','Контакты','contacts'],['delivery.html','Доставка','delivery']];
const nav=()=>links.map(([url,text,key])=>`<a href="${url}" ${page===key?'aria-current="page"':''}>${text}</a>`).join('');
document.querySelector('header').innerHTML=`<div class="wrap header-row"><a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">✿</span> ГРАНАТ<span class="brand-note">ПРОДУКТЫ РЯДОМ С ДОМОМ</span></a><nav aria-label="Основная навигация">${nav()}</nav><a class="header-cart" href="delivery.html">Корзина <span id="cart-badge">0</span></a></div>`;
document.querySelector('footer').innerHTML=`<div class="wrap footer-grid"><div><a class="brand" href="index.html">ГРАНАТ</a><p>Свежие продукты рядом с домом.</p></div><div><strong>Заходите каждый день</strong><p>${shop.hours}</p><p>Барнаул, ул. Попова, 121А</p></div><nav aria-label="Навигация в подвале">${nav()}</nav></div><div class="wrap footer-bottom">Демонстрационный сайт торгового павильона. Заказы не отправляются.</div>`;
document.querySelectorAll('[data-info]').forEach(el=>el.textContent=shop[el.dataset.info]);
const catalogPage=['catalog','delivery'].includes(page);
let availableProducts=products;
if(catalogPage){
 const box=document.querySelector('#catalog');box.textContent='Загружаем товары…';
 const submit=document.querySelector('#order-form button[type="submit"]');if(submit)submit.disabled=true;
 try{availableProducts=await window.loadGranatProducts();box.textContent='';if(submit)submit.disabled=false;}
 catch{box.textContent='Не удалось загрузить каталог. Обновите страницу, чтобы повторить попытку.';const form=document.querySelector('#order-form');form?.addEventListener('submit',e=>e.preventDefault());return;}
}
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(n);
let cart={};try {const saved=JSON.parse(localStorage.getItem('granat-cart-test')||'{}'); for(const p of availableProducts)if(Number.isSafeInteger(saved[p.id])&&saved[p.id]>0&&saved[p.id]<=999)cart[p.id]=saved[p.id];}catch{}
const notice='Цены на сайте представлены для демонстрации и могут отличаться. Актуальную стоимость уточняйте в магазине.';
let renderProductsForRefresh=()=>{};
const catalog=document.querySelector('#catalog');
if(catalog){
 const categories=['Все товары',...new Set(availableProducts.map(p=>p.category))];
 document.querySelector('#filters').innerHTML=categories.map((c,i)=>`<button type="button" class="filter ${i===0?'active':''}" aria-pressed="${i===0}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
 const renderProducts=category=>{catalog.innerHTML=availableProducts.filter(p=>category==='Все товары'||p.category===category).map(p=>(['catalog','delivery'].includes(page)?window.renderFeaturedCatalogCard?.(p,money,page==='delivery'):null)||`<article class="product"><img src="images/${encodeURIComponent(p.image)}" alt="${['nuts','juice','tea'].includes(p.id)?'Общий вид ассортимента павильона':p.name}" loading="lazy"><div class="product-body"><span class="eyebrow">${p.category}</span><h2>${p.name}</h2>${['nuts','juice','tea'].includes(p.id)?'<small>Фото ассортимента магазина</small>':''}<div class="product-price"><strong>${money(p.price)}</strong><span> / ${escapeHtml(p.unit)}</span></div>${page==='delivery'?`<button class="button add" data-add="${p.id}">Добавить в корзину</button>`:''}</div></article>`).join('');};
 renderProductsForRefresh=()=>renderProducts(document.querySelector('.filter.active')?.dataset.category||'Все товары');
 renderProducts('Все товары');
 document.querySelector('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;document.querySelectorAll('.filter').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b)});renderProducts(b.dataset.category)});
 catalog.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;const id=b.dataset.add;if(!availableProducts.some(p=>p.id===id))return;cart[id]=Math.min(999,(cart[id]||0)+1);updateCart();document.querySelector('#cart-status').textContent=`${availableProducts.find(p=>p.id===id).name}: добавлено в корзину.`});
}
function updateCart(){
 if(catalogPage)try{localStorage.setItem('granat-cart-test',JSON.stringify(cart))}catch{}
 const selected=availableProducts.filter(p=>cart[p.id]);let total=0;
 document.querySelector('#cart-badge').textContent=selected.length;
 const box=document.querySelector('#cart-items');if(!box)return;
 box.innerHTML=selected.length?selected.map(p=>{total+=p.price*cart[p.id];return `<div class="cart-item"><div><strong>${escapeHtml(p.name)}</strong><small>${money(p.price)} / ${escapeHtml(p.unit)}</small></div><div class="quantity"><button type="button" data-id="${p.id}" data-action="minus" aria-label="Уменьшить количество: ${escapeHtml(p.name)}">−</button><span>${cart[p.id]}</span><button type="button" data-id="${p.id}" data-action="plus" aria-label="Увеличить количество: ${escapeHtml(p.name)}">+</button></div><strong>${money(p.price*cart[p.id])}</strong><button type="button" class="remove" data-id="${p.id}" data-action="remove" aria-label="Удалить: ${escapeHtml(p.name)}">Удалить</button></div>`}).join(''):'<p class="empty-cart">В корзине пока пусто.<br>Выберите продукты в каталоге.</p>';
 document.querySelector('#positions').textContent=`Позиций: ${selected.length}`;
 document.querySelector('#total').textContent=money(total);
}
updateCart();
document.querySelector('#cart-items')?.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const id=b.dataset.id;if(b.dataset.action==='remove')delete cart[id];else if(b.dataset.action==='plus')cart[id]=Math.min(999,cart[id]+1);else if(--cart[id]<=0)delete cart[id];updateCart()});
const form=document.querySelector('#order-form');
if(form){form.addEventListener('submit',async e=>{e.preventDefault();const message=document.querySelector('#order-message');message.className='form-message';
const submit=form.querySelector('button[type="submit"]');if(submit.disabled)return;submit.disabled=true;
try{const refreshed=await window.loadGranatProducts();const changed=Object.keys(cart).some(id=>{const old=availableProducts.find(p=>p.id===id),fresh=refreshed.find(p=>p.id===id);return !fresh||old?.price!==fresh.price;});availableProducts=refreshed;for(const id of Object.keys(cart))if(!availableProducts.some(p=>p.id===id))delete cart[id];updateCart();renderProductsForRefresh();if(changed){message.textContent='Цены или наличие изменились. Проверьте корзину и подтвердите заказ ещё раз.';return;}}
catch{message.textContent='Не удалось проверить цены и наличие. Попробуйте оформить заказ ещё раз.';return;}
finally{submit.disabled=false;}
if(!Object.keys(cart).length){message.textContent='Добавьте хотя бы один товар в корзину.';return}if(!form.reportValidity())return;const digits=form.elements.phone.value.replace(/\D/g,'');if(digits.length<10||digits.length>15){message.textContent='Укажите корректный телефон: от 10 до 15 цифр.';form.elements.phone.focus();return}for(const name of ['name','address'])if(!form.elements[name].value.trim()){message.textContent='Заполните имя и адрес доставки.';form.elements[name].focus();return}message.classList.add('success');message.textContent='Спасибо! Заказ сформирован. Это демонстрационная версия сайта.'});form.addEventListener('input',()=>{document.querySelector('#order-message').textContent=''})}

})();
