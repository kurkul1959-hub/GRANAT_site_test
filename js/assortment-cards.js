// Presentation only: prices and product identifiers come from js/data.js.
const featuredCatalogCards={
 apples:{image:'apples-granat-new.png',description:'Румяные, хрустящие и сочные! Сладкий аромат и свежий вкус в каждом кусочке.'},
 citrus:{image:'mandarins-granat-new.png',description:'Солнечные, ароматные и невероятно сочные! Сладкие дольки с лёгкой цитрусовой кислинкой.'},
 grapes:{image:'vinograd-bely-new.png',description:'Нежные, налитые соком ягоды с приятной сладостью. Настоящее удовольствие!'},
 pink:{image:'vinograd-rozovy-new.png',description:'Крупные, сочные ягоды с насыщенным сладким вкусом и тонким ароматом.'},
 melon:{image:'arbuz-new.png',description:'Сочная алая мякоть, освежающая сладость и настоящий вкус лета!'}
};
window.renderFeaturedCatalogCard=(product,formatPrice,ordering=false)=>{

 const descriptions={potatoes:'Для гарниров и домашних блюд.',candy:'Сладости к чаю и кофе.',nuts:'Для перекуса и подачи к столу.',juice:'Напиток для подачи к столу.',tea:'Для чаепития дома.'};
 const card=product.imageUrl?{image:product.imageUrl,description:product.description}:featuredCatalogCards[product.id]||{image:product.image,description:descriptions[product.id]||product.category};
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const image=product.imageUrl||`images/${card.image}`;
 return `<article class="product product-featured"><img src="${escape(image)}" alt="${escape(product.name)}" loading="lazy"><div class="product-body"><span class="eyebrow">${escape(product.category)}</span><h2>${escape(product.name)}</h2><p class="product-description">${escape(card.description)}</p>${['nuts','juice','tea'].includes(product.id)?'<small>Фото ассортимента магазина</small>':''}<div class="product-purchase"><div class="product-price"><strong>${formatPrice(product.price)}</strong><span> / ${escape(product.unit)}</span></div>${ordering?`<button type="button" class="button add" data-add="${product.id}">Заказать</button>`:''}</div></div><div class="product-benefits"><span>Покупка по ${escape(product.unit)}</span><span>Доставка по городу</span></div></article>`;
};
