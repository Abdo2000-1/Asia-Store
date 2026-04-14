/* ============================================================
   ASIA STORE — Admin Panel Script
   ============================================================ */

/* ===== AUTH STATE OBSERVER (الحفاظ على تسجيل الدخول) ===== */
// بيشيك أول ما الصفحة تفتح، لو أنت مسجل دخول قبل كدا بيدخلك على طول
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user && document.getElementById('loginPage').style.display !== 'none') {
                document.getElementById('loginPage').style.display = 'none';
                document.getElementById('adminPanel').style.display = 'flex';
                loadAdminProducts();
            }
        });
    }
});

/* ===== LOGIN WITH FIREBASE AUTH ===== */
async function handleLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const pass = document.getElementById('adminPassword').value.trim();
    const btn = document.querySelector('.login-btn');

    if (!email || !pass) {
        showToast("من فضلك أدخل الإيميل والباسورد", "error");
        return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
    btn.disabled = true;

    try {
        // تفعيل حفظ الجلسة محلياً في المتصفح
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        // تسجيل الدخول الفعلي ببيانات فايربيز
        await firebase.auth().signInWithEmailAndPassword(email, pass);
        
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'flex';
        loadAdminProducts();
        showToast("تم تسجيل الدخول بنجاح ✅");
        
    } catch (error) {
        console.error("Login Error:", error.code, error.message);
        
        // معالجة ذكية للأخطاء عشان تعرف المشكلة فين بالظبط
        let errorMsg = "بيانات الدخول غير صحيحة";
        if (error.code === 'auth/user-not-found') errorMsg = "هذا الإيميل غير مسجل في Firebase";
        if (error.code === 'auth/wrong-password') errorMsg = "كلمة المرور خاطئة، تأكد من الحروف";
        if (error.code === 'auth/invalid-email') errorMsg = "صيغة الإيميل مكتوبة بشكل خاطئ";
        if (error.code === 'auth/network-request-failed') errorMsg = "تأكد من اتصالك بالإنترنت";
        if (error.code === 'auth/operation-not-allowed') errorMsg = "عذراً، لم تقم بتفعيل (Email/Password) من لوحة Firebase";

        const errorDiv = document.getElementById('loginError');
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${errorMsg}`;
        errorDiv.style.display = 'flex';
        setTimeout(() => errorDiv.style.display = 'none', 4000);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

/* ===== TABS ===== */
function switchTab(tab) {
    ['Products','Offers'].forEach(t => {
        document.getElementById(`${t.toLowerCase()}Tab`).style.display = 'none';
        document.getElementById(`nav${t}`).classList.remove('active');
    });
    document.getElementById(`${tab}Tab`).style.display = 'block';
    document.getElementById(`nav${tab.charAt(0).toUpperCase()+tab.slice(1)}`).classList.add('active');
    if (tab === 'offers') loadAdminOffers();
    if (tab === 'products') loadAdminProducts();
}

/* ===== MOBILE NAV ACTIVE STATE ===== */
function setMobileActive(btn) {
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

/* ===== CLOUDINARY ===== */
const myWidget = cloudinary.createUploadWidget({
    cloudName: 'dcjzx63jq',
    uploadPreset: 'asia-shop-pre' // 
}, (error, result) => {
    if (!error && result && result.event === "success") {
        const url = result.info.secure_url;
        const isProducts = document.getElementById('productsTab').style.display !== 'none';
        const targetId = isProducts ? 'pImageUrl' : 'oImageUrl';
        const el = document.getElementById(targetId);
        el.value = url;
        el.style.borderColor = '#27ae60';
        showToast('تم رفع الصورة بنجاح ✅');
    }
});
document.addEventListener('click', e => {
    if (e.target && e.target.classList.contains('cloudinary-button-trigger')) myWidget.open();
});

/* ===== ADD PRODUCT ===== */
async function addProduct() {
    const name = document.getElementById('pName').value.trim();
    const price = parseFloat(document.getElementById('pPrice').value);
    const wholesalePrice = parseFloat(document.getElementById('pWholesalePrice').value) || null;
    const category = document.getElementById('pCategory').value;
    const mode = document.getElementById('pMode').value;
    const emoji = document.getElementById('pEmoji').value || '📦';
    const desc = document.getElementById('pDesc').value || '';
    const nameEn = document.getElementById('pNameEn').value || '';
    const imageUrl = document.getElementById('pImageUrl').value.trim();

    if (!name || !price) { showToast('لازم تكتب الاسم والسعر! ❌', 'error'); return; }

    const btn = document.getElementById('submitBtn');
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;"></div> جاري الحفظ...';
    btn.disabled = true;

    try {
        await db.collection("products").add({
            name, name_en: nameEn, price,
            wholesale_price: wholesalePrice,
            category, mode,
            image_url: imageUrl || '',
            image_emoji: emoji,
            description: desc,
            active: true,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('تم حفظ المنتج بنجاح ✅');
        clearForm(['pName','pPrice','pWholesalePrice','pEmoji','pDesc','pNameEn','pImageUrl']);
        loadAdminProducts();
    } catch(e) {
        showToast('خطأ في الحفظ: ' + e.message, 'error');
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> حفظ ونشر المنتج';
        btn.disabled = false;
    }
}

/* ===== LOAD PRODUCTS ===== */
const CATEGORY_NAMES = { girls:'👧 بناتي', boys:'👦 أولادي', women:'👩 حريمي', men:'👨 رجالي', kids:'🍼 أطفالي', islamic:'🌙 إسلامي' };

async function loadAdminProducts() {
    const list = document.getElementById('adminProductsList');
    list.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>جاري التحميل...</p></div>';
    try {
        const snap = await db.collection("products").orderBy("created_at", "desc").get();
        if (snap.empty) { list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:24px;">لا توجد منتجات بعد</p>'; return; }
        list.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <div class="item-img">
                    ${d.image_url ? `<img src="${d.image_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : d.image_emoji || '📦'}
                </div>
                <div class="item-info">
                    <div class="item-name">${d.name}</div>
                    <div class="item-meta">${CATEGORY_NAMES[d.category] || d.category} · ${d.mode === 'wholesale' ? 'جملة فقط' : d.mode === 'retail' ? 'قطاعي فقط' : 'الجميع'}</div>
                </div>
                <div class="item-price">EGP ${d.price}${d.wholesale_price ? `<br><small style="color:var(--gray);font-size:10px">جملة: ${d.wholesale_price}</small>` : ''}</div>
                <div class="item-actions">
                    <button class="btn-edit" onclick="updatePrice('${doc.id}', ${d.price})"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteProduct('${doc.id}')"><i class="fas fa-trash"></i></button>
                </div>`;
            list.appendChild(row);
        });
    } catch(e) { list.innerHTML = `<p style="color:var(--danger);padding:16px;">خطأ: ${e.message}</p>`; }
}

async function updatePrice(id, old) {
    const val = prompt("السعر الجديد:", old);
    if (val) {
        await db.collection("products").doc(id).update({ price: parseFloat(val) });
        showToast('تم تحديث السعر ✅');
        loadAdminProducts();
    }
}

async function deleteProduct(id) {
    if (confirm("حذف هذا المنتج نهائياً؟")) {
        await db.collection("products").doc(id).delete();
        showToast('تم الحذف');
        loadAdminProducts();
    }
}

/* ===== OFFERS ===== */
async function addOffer() {
    const name = document.getElementById('oName').value.trim();
    const orig = parseFloat(document.getElementById('oOriginalPrice').value);
    const sale = parseFloat(document.getElementById('oSalePrice').value);
    const emoji = document.getElementById('oEmoji').value || '🏷️';
    const desc = document.getElementById('oDesc').value || '';
    const imageUrl = document.getElementById('oImageUrl').value.trim();

    if (!name || !orig || !sale) { showToast('الاسم والأسعار إجبارية! ❌', 'error'); return; }

    try {
        await db.collection("offers").add({
            name, original_price: orig, sale_price: sale,
            image_url: imageUrl || '',
            image_emoji: emoji,
            description: desc,
            active: true,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('تم نشر العرض 🔥');
        clearForm(['oName','oOriginalPrice','oSalePrice','oEmoji','oDesc','oImageUrl']);
        loadAdminOffers();
    } catch(e) { showToast('خطأ: ' + e.message, 'error'); }
}

async function loadAdminOffers() {
    const list = document.getElementById('adminOffersList');
    list.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>جاري التحميل...</p></div>';
    try {
        const snap = await db.collection("offers").get();
        if (snap.empty) { list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:24px;">لا توجد عروض بعد</p>'; return; }
        list.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const disc = Math.round(((d.original_price - d.sale_price) / d.original_price) * 100);
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <div class="item-img">
                    ${d.image_url ? `<img src="${d.image_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : d.image_emoji || '🏷️'}
                </div>
                <div class="item-info">
                    <div class="item-name">${d.name}</div>
                    <div class="item-meta" style="color:#e74c3c">خصم ${disc}%</div>
                </div>
                <div class="item-price" style="color:#e74c3c">EGP ${d.sale_price}<br><small style="color:var(--gray);text-decoration:line-through;">${d.original_price}</small></div>
                <div class="item-actions">
                    <button class="btn-delete" onclick="deleteOffer('${doc.id}')"><i class="fas fa-trash"></i></button>
                </div>`;
            list.appendChild(row);
        });
    } catch(e) { list.innerHTML = `<p style="color:var(--danger);padding:16px;">خطأ: ${e.message}</p>`; }
}

async function deleteOffer(id) {
    if (confirm("حذف هذا العرض نهائياً؟")) {
        await db.collection("offers").doc(id).delete();
        showToast('تم الحذف');
        loadAdminOffers();
    }
}

/* ===== HELPERS ===== */
function clearForm(ids) {
    ids.forEach(id => { const el = document.getElementById(id); if(el){ el.value=''; el.style.borderColor=''; } });
}

function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.style.cssText = `
        position:fixed; bottom:24px; left:24px; z-index:9999;
        background:${type === 'error' ? '#e74c3c' : '#27ae60'};
        color:white; padding:14px 20px; border-radius:12px;
        font-family:'Tajawal',sans-serif; font-size:13px; font-weight:600;
        box-shadow:0 8px 24px rgba(0,0,0,0.3);
        animation:slideUp 0.3s ease;
    `;
    const style = document.createElement('style');
    style.textContent = '@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}';
    document.head.appendChild(style);
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2500);
}


async function logout() { 
    try {
        await firebase.auth().signOut();
        location.reload(); 
    } catch (error) {
        console.error("Logout Error:", error);
    }
}

/* ===== ENTER KEY ===== */
document.addEventListener('keypress', e => {
    if (e.key === 'Enter' && document.getElementById('loginPage').style.display !== 'none') handleLogin();
});

/* ===== SECURITY ===== */
document.addEventListener('contextmenu', e => e.preventDefault());
document.onkeydown = function(e) {
    if(e.keyCode==123) return false;
    if(e.ctrlKey&&e.shiftKey&&['I','C','J'].includes(String.fromCharCode(e.keyCode))) return false;
    if(e.ctrlKey&&e.keyCode=='U'.charCodeAt(0)) return false;
};