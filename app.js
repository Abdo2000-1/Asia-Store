/* ============================================================
   ASIA STORE — Main App Script
   Supports: retail/wholesale modes, new categories
   ============================================================ */

let cart = [];
let allProducts = [];
let currentCategory = 'all';
let currentMode = 'retail'; // 'retail' | 'wholesale'
let isLoading = false;

// DOM refs
const productsGrid = document.getElementById('productsGrid');
const emptyState = document.getElementById('emptyState');
const cartIcon = document.getElementById('cartIcon');
const cartBadge = document.getElementById('cartBadge');
const cartSidebar = document.getElementById('cartSidebar');
const cartClose = document.getElementById('cartClose');
const overlay = document.getElementById('overlay');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const orderBtn = document.getElementById('orderBtn');
const themeToggle = document.getElementById('themeToggle');

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', async () => {
    loadTheme();
    await loadProducts();
    await loadOffers();
    setupEventListeners();
    loadCartFromLocalStorage();
    renderProducts();
    updateCartUI();
});

/* ===== THEME ===== */
function loadTheme() {
    const saved = localStorage.getItem('asia_theme') || 'light';
    if (saved === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    } else {
        themeToggle.textContent = '🌙';
    }
}
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('asia_theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
}

/* ===== SHOP MODE ===== */
function setShopMode(mode) {
    currentMode = mode;
    document.getElementById('modeRetail').classList.toggle('active', mode === 'retail');
    document.getElementById('modeWholesale').classList.toggle('active', mode === 'wholesale');
    renderProducts();
}

/* ===== FIREBASE LOAD ===== */
async function loadProducts() {
    try {
        isLoading = true;
        if (typeof db === 'undefined') { loadFallbackProducts(); return; }
        const snap = await db.collection('products').where('active', '==', true).get();
        allProducts = [];
        snap.forEach(doc => allProducts.push({ id: doc.id, ...doc.data() }));
        if (allProducts.length === 0) loadFallbackProducts();
    } catch (e) {
        console.error('Load products error:', e);
        loadFallbackProducts();
    } finally {
        isLoading = false;
        renderProducts();
    }
}

function loadFallbackProducts() {
    allProducts = [
        { id:'f1', name:'بلوزة بناتي كاجوال', name_en:'Girls Casual Top', price:120, wholesale_price:85, category:'girls', mode:'both', image_emoji:'👗', active:true },
        { id:'f2', name:'بنطلون أولادي', name_en:'Boys Pants', price:140, wholesale_price:95, category:'boys', mode:'both', image_emoji:'👖', active:true },
        { id:'f3', name:'عباية حريمي', name_en:'Ladies Abaya', price:250, wholesale_price:180, category:'women', mode:'both', image_emoji:'🧕', active:true },
        { id:'f4', name:'تيشيرت رجالي', name_en:'Men T-Shirt', price:95, wholesale_price:60, category:'men', mode:'both', image_emoji:'👕', active:true },
        { id:'f5', name:'بدلة أطفال', name_en:'Kids Outfit', price:175, wholesale_price:120, category:'kids', mode:'both', image_emoji:'🍼', active:true },
        { id:'f6', name:'حجاب إسلامي فاخر', name_en:'Premium Hijab', price:85, wholesale_price:55, category:'islamic', mode:'both', image_emoji:'🌙', active:true },
    ];
}

/* ===== RENDER PRODUCTS ===== */
const CATEGORY_NAMES = { all:'الكل', girls:'بناتي', boys:'أولادي', women:'حريمي', men:'رجالي', kids:'أطفالي', islamic:'إسلامي' };

function renderProducts() {
    if (!productsGrid) return;
    let products = allProducts.filter(p => {
        // category filter
        if (currentCategory !== 'all' && p.category !== currentCategory) return false;
        // mode filter — products can have mode:'retail','wholesale','both'
        if (p.mode && p.mode !== 'both' && p.mode !== currentMode) return false;
        return true;
    });

    if (products.length === 0) {
        productsGrid.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    emptyState.style.display = 'none';

    productsGrid.innerHTML = products.map(product => {
        const displayPrice = (currentMode === 'wholesale' && product.wholesale_price) ? product.wholesale_price : product.price;
        const priceLabel = currentMode === 'wholesale' ? 'سعر الجملة' : 'سعر القطعة';
        const modeTag = currentMode === 'wholesale'
            ? `<span class="mode-tag wholesale">جملة</span>`
            : `<span class="mode-tag retail">قطاعي</span>`;
        const imgHtml = product.image_url
            ? `<img src="${product.image_url}" alt="${product.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
               <span class="product-emoji-fallback" style="display:none">${product.image_emoji || '📦'}</span>`
            : `<span class="product-emoji-fallback">${product.image_emoji || '📦'}</span>`;

        return `
        <div class="product-card">
            ${modeTag}
            <div class="product-image-wrapper">${imgHtml}</div>
            <div class="product-body">
                ${product.category ? `<span class="product-category-tag">${CATEGORY_NAMES[product.category] || product.category}</span>` : ''}
                <div class="product-name">${product.name}</div>
                ${product.name_en ? `<div class="product-name-en">${product.name_en}</div>` : ''}
                ${product.description ? `<div class="product-desc">${product.description}</div>` : ''}
                <div class="product-footer">
                    <div>
                        <div class="product-price">EGP ${displayPrice}</div>
                        <div class="product-price-label">${priceLabel}</div>
                    </div>
                    <div class="qty-control">
                        <button class="qty-btn" onclick="changeQty('${product.id}', -1)">−</button>
                        <span class="qty-display" id="qty-${product.id}">0</span>
                        <button class="qty-btn" onclick="changeQty('${product.id}', 1)">+</button>
                    </div>
                </div>
                <button class="add-to-cart-btn" onclick="addToCart('${product.id}', ${displayPrice})">
                    <i class="fas fa-shopping-bag"></i> أضف للسلة
                </button>
            </div>
        </div>`;
    }).join('');
}

const quantities = {};
function changeQty(id, delta) {
    quantities[id] = Math.max(0, (quantities[id] || 0) + delta);
    const el = document.getElementById(`qty-${id}`);
    if (el) el.textContent = quantities[id];
}

/* ===== CART ===== */
function addToCart(productId, displayPrice) {
    const qty = quantities[productId] || 0;
    if (qty <= 0) { showNotification('من فضلك اختاري الكمية أولاً'); return; }
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const cartKey = `${productId}_${currentMode}`;
    const cartProduct = { ...product, price: displayPrice, cartKey, mode: currentMode };
    const existing = cart.find(i => i.cartKey === cartKey);
    if (existing) existing.quantity += qty;
    else cart.push({ ...cartProduct, quantity: qty });

    quantities[productId] = 0;
    const el = document.getElementById(`qty-${productId}`);
    if (el) el.textContent = 0;

    saveCartToLocalStorage();
    updateCartUI();
    showNotification(`تمت إضافة ${product.name} للسلة`);
}

function removeFromCart(cartKey) {
    cart = cart.filter(i => i.cartKey !== cartKey);
    saveCartToLocalStorage();
    updateCartUI();
}

function updateCartQuantity(cartKey, newQty) {
    const item = cart.find(i => i.cartKey === cartKey);
    if (!item) return;
    item.quantity = Math.max(0, newQty);
    if (item.quantity === 0) removeFromCart(cartKey);
    else { saveCartToLocalStorage(); updateCartUI(); }
}

function updateCartUI() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? 'flex' : 'none';
    cartCount.textContent = count;
    cartTotal.textContent = `EGP ${total.toFixed(2)}`;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-message">سلتك فارغة 🛍️</p>';
        return;
    }
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-header">
                <div class="cart-item-name">${item.name} ${item.mode === 'wholesale' ? '<small>(جملة)</small>' : ''}</div>
                <div class="cart-item-price">EGP ${item.price}</div>
            </div>
            <div class="cart-item-details">
                <span>الكمية: ${item.quantity}</span>
                <span>الإجمالي: EGP ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            <div class="cart-item-actions">
                <div class="cart-item-qty-control">
                    <button class="cart-item-qty-btn" onclick="updateCartQuantity('${item.cartKey}', ${item.quantity - 1})">−</button>
                    <div class="cart-item-qty-display">${item.quantity}</div>
                    <button class="cart-item-qty-btn" onclick="updateCartQuantity('${item.cartKey}', ${item.quantity + 1})">+</button>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.cartKey}')">🗑️ إزالة</button>
            </div>
        </div>`).join('');
}

function toggleCart() { cartSidebar.classList.toggle('open'); overlay.classList.toggle('active'); document.body.classList.toggle('no-scroll'); }
function closeCart() { cartSidebar.classList.remove('open'); overlay.classList.remove('active'); document.body.classList.remove('no-scroll'); }

/* ===== ORDER ===== */
function proceedToOrder() {
    if (cart.length === 0) { 
        showNotification('سلتك فارغة'); 
        return; 
    }

    const msg = generateWhatsAppMessage();
    const encodedMsg = encodeURIComponent(msg);

    // الأرقام الجديدة اللي طلبتها
    const number1 = "201115019259";
    const number2 = "201124949462";

    const url1 = `https://wa.me/${number1}?text=${encodedMsg}`;
    const url2 = `https://wa.me/${number2}?text=${encodedMsg}`;

    // تسجيل الطلب في قاعدة البيانات (مرة واحدة فقط)
    logOrder();

    // فتح الرقم الأول مباشرة
    window.open(url1, '_blank');

    // فتح الرقم الثاني بعد ثانية واحدة
    setTimeout(() => {
        window.open(url2, '_blank');
    }, 1000);
    
    showNotification('جاري تحويلك لواتساب لإرسال الفاتورة للرقمين...');
}

function generateWhatsAppMessage() {
    const header = `*📦 طلب جديد من Asia Store*\n\n`;
    const modeLabel = cart.some(i => i.mode === 'wholesale') ? '🏪 نوع الطلب: جملة + قطاعي\n\n' : '';
    const items = cart.map(i =>
        `• ${i.name}${i.mode === 'wholesale' ? ' (جملة)' : ''}\n  الكمية: ${i.quantity}\n  السعر: EGP ${i.price}\n  الإجمالي: EGP ${(i.price * i.quantity).toFixed(2)}`
    ).join('\n\n');
    const total = cart.reduce((s,i) => s + i.price * i.quantity, 0);
    return header + modeLabel + items + `\n\n━━━━━━━━━━━━━━━━\n*الإجمالي: EGP ${total.toFixed(2)}*\n━━━━━━━━━━━━━━━━`;
}

async function logOrder() {
    try {
        const total = cart.reduce((s,i) => s + i.price * i.quantity, 0);
        await db.collection('orders').add({ items: cart, total, mode: currentMode, status: 'pending', created_at: new Date() });
    } catch(e) { console.error(e); }
}

/* ===== OFFERS ===== */
let allOffers = [];
const offerQuantities = {};

async function loadOffers() {
    const grid = document.getElementById('offersGrid');
    const empty = document.getElementById('offersEmpty');
    const badge = document.getElementById('offersNavBadge');
    const section = document.getElementById('offersSection');
    if (!grid) return;
    try {
        if (typeof db === 'undefined') { grid.innerHTML = ''; empty.style.display = 'block'; return; }
        const snap = await db.collection('offers').where('active', '==', true).get();
        allOffers = [];
        snap.forEach(doc => allOffers.push({ id: doc.id, ...doc.data() }));
        if (allOffers.length === 0) { grid.innerHTML = ''; empty.style.display = 'block'; section.style.display = 'none'; return; }
        section.style.display = 'block';
        badge.textContent = allOffers.length;
        badge.style.display = 'flex';
        renderOffers();
    } catch(e) { console.error(e); grid.innerHTML = ''; empty.style.display = 'block'; }
}

function renderOffers() {
    const grid = document.getElementById('offersGrid');
    grid.innerHTML = allOffers.map(offer => {
        const disc = Math.round(((offer.original_price - offer.sale_price) / offer.original_price) * 100);
        const savings = offer.original_price - offer.sale_price;
        const qty = offerQuantities[offer.id] || 0;
        const imgHtml = offer.image_url
            ? `<img src="${offer.image_url}" alt="${offer.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="offer-emoji-fallback" style="display:none">${offer.image_emoji||'🏷️'}</span>`
            : `<span class="offer-emoji-fallback">${offer.image_emoji||'🏷️'}</span>`;
        return `
        <div class="offer-card">
            <div class="offer-discount-badge">🔥 خصم ${disc}%</div>
            <div class="offer-image-wrapper">${imgHtml}</div>
            <div class="offer-info">
                <div class="offer-name">${offer.name}</div>
                ${offer.description ? `<div class="offer-description">${offer.description}</div>` : ''}
                <div class="offer-pricing">
                    <span class="offer-original-price">EGP ${offer.original_price}</span>
                    <span class="offer-sale-price">EGP ${offer.sale_price}</span>
                    <span class="offer-savings">وفّر ${savings} EGP</span>
                </div>
                <div class="offer-actions">
                    <div class="offer-qty-control">
                        <button class="offer-qty-btn" onclick="changeOfferQty('${offer.id}',-1)">−</button>
                        <span class="offer-qty-display" id="offer-qty-${offer.id}">${qty}</span>
                        <button class="offer-qty-btn" onclick="changeOfferQty('${offer.id}',1)">+</button>
                    </div>
                    <button class="offer-add-btn" onclick="addOfferToCart('${offer.id}')"><i class="fas fa-shopping-bag"></i> أضف للسلة</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function changeOfferQty(id, delta) {
    offerQuantities[id] = Math.max(0, (offerQuantities[id]||0) + delta);
    const el = document.getElementById(`offer-qty-${id}`);
    if (el) el.textContent = offerQuantities[id];
}

function addOfferToCart(offerId) {
    const qty = offerQuantities[offerId] || 0;
    if (qty <= 0) { showNotification('من فضلك اختاري الكمية أولاً'); return; }
    const offer = allOffers.find(o => o.id === offerId);
    if (!offer) return;
    const cartKey = `offer_${offerId}`;
    const existing = cart.find(i => i.cartKey === cartKey);
    if (existing) existing.quantity += qty;
    else cart.push({ ...offer, price: offer.sale_price, cartKey, mode: 'offer', quantity: qty });
    offerQuantities[offerId] = 0;
    const el = document.getElementById(`offer-qty-${offerId}`);
    if (el) el.textContent = 0;
    saveCartToLocalStorage();
    updateCartUI();
    showNotification(`تمت إضافة ${offer.name} للسلة`);
}

/* ===== EVENT LISTENERS ===== */
function setupEventListeners() {
    cartIcon.addEventListener('click', toggleCart);
    cartClose.addEventListener('click', closeCart);
    overlay.addEventListener('click', closeCart);
    orderBtn.addEventListener('click', proceedToOrder);
    themeToggle.addEventListener('click', toggleTheme);
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            renderProducts();
        });
    });
}

/* ===== LOCAL STORAGE ===== */
function saveCartToLocalStorage() { localStorage.setItem('asia_cart', JSON.stringify(cart)); }
function loadCartFromLocalStorage() {
    try { cart = JSON.parse(localStorage.getItem('asia_cart')) || []; } catch(e) { cart = []; }
}

/* ===== NOTIFICATION ===== */
function showNotification(msg) {
    const n = document.createElement('div');
    n.className = 'notification';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity 0.3s'; setTimeout(() => n.remove(), 300); }, 2200);
}

/* ===== SECURITY ===== */
document.addEventListener('contextmenu', e => e.preventDefault());
document.onkeydown = function(e) {
    if (e.keyCode==123) return false;
    if (e.ctrlKey&&e.shiftKey&&['I','C','J'].includes(String.fromCharCode(e.keyCode))) return false;
    if (e.ctrlKey&&e.keyCode=='U'.charCodeAt(0)) return false;
};
