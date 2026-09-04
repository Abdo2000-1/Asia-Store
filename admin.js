/* ============================================================
   ASIA STORE — Admin Panel Script (FIXED v2)
   ============================================================ */

/* ===== CLOUDINARY LAZY LOAD (أهم إصلاح) ===== */
// بدل ما نحمل الـ SDK في الـ head ونعلق الصفحة،
// بنحمله بس لما المستخدم يضغط زر الرفع أول مرة
let cloudinaryWidget = null;
let cloudinaryLoading = false;

function loadCloudinarySDK(callback) {
    // لو الـ SDK محمل خلاص، استخدمه على طول
    if (typeof cloudinary !== 'undefined') {
        callback();
        return;
    }
    // لو بيتحمل حالياً، استنى
    if (cloudinaryLoading) {
        const check = setInterval(() => {
            if (typeof cloudinary !== 'undefined') {
                clearInterval(check);
                callback();
            }
        }, 100);
        return;
    }
    cloudinaryLoading = true;
    const script = document.createElement('script');
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    script.onload = () => { cloudinaryLoading = false; callback(); };
    script.onerror = () => { cloudinaryLoading = false; showToast('فشل تحميل أداة الرفع، تحقق من اتصالك', 'error'); };
    document.head.appendChild(script);
}

function openCloudinaryWidget(targetInputId) {
    const btn = event.currentTarget;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
    btn.disabled = true;

    loadCloudinarySDK(() => {
        btn.innerHTML = originalHtml;
        btn.disabled = false;

        // أنشئ الـ widget مرة واحدة بس وأعد استخدامه
        if (!cloudinaryWidget) {
            cloudinaryWidget = cloudinary.createUploadWidget({
                cloudName: 'dcjzx63jq',
                uploadPreset: 'asia-shop-pre',
                sources: ['local', 'url', 'camera'],
                multiple: false,
                language: 'ar',
                text: {
                    ar: {
                        or: 'أو',
                        back: 'رجوع',
                        close: 'إغلاق',
                        upload_more: 'رفع المزيد',
                    }
                }
            }, (error, result) => {
                if (error) {
                    showToast('خطأ في رفع الصورة: ' + (error.message || error), 'error');
                    return;
                }
                if (result && result.event === 'success') {
                    const url = result.info.secure_url;
                    const el = document.getElementById(cloudinaryWidget._targetInputId);
                    if (el) {
                        el.value = url;
                        el.style.borderColor = 'var(--success)';
                        setTimeout(() => el.style.borderColor = '', 3000);
                    }
                    showToast('تم رفع الصورة بنجاح ✅');
                }
            });
        }

        // احفظ الـ target قبل ما تفتح الـ widget
        cloudinaryWidget._targetInputId = targetInputId;
        cloudinaryWidget.open();
    });
}

/* ===== SIZE DEFINITIONS ===== */
const SIZE_MAP = {
    // ملابس بالغين
    adult:  ['M','XL','2X','3X','4X','5X'],
    // ملابس أطفال
    kids:   ['2','4','6','8','10','12','14','16','18','20'],
    // أحذية
    shoes:  ['30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46'],
    // حقائب واكسسوارات
    bags:        ['S','M','L','XL'],
    accessories: ['مقاس موحد','S','M','L'],
    // أطفال → خيارين فقط
    kids_range:  ['من 2 لـ 10', 'من 10 لـ 20'],
};

function getCategorySizeType(cat) {
    if (['men','women','islamic'].includes(cat)) return 'adult';
    if (['girls','boys','kids'].includes(cat))   return 'kids_range';
    if (cat === 'shoes')                         return 'shoes';
    if (cat === 'bags')                          return 'bags';
    if (cat === 'accessories')                   return 'accessories';
    return null;
}

/* يُستدعى كل ما تغيّر القسم */
function onCategoryChange() {
    const cat = document.getElementById('pCategory').value;
    const needsSub  = ['shoes','bags','accessories'].includes(cat);
    const subField  = document.getElementById('subCategoryField');
    const sizesField = document.getElementById('sizesField');
    const grid      = document.getElementById('adminSizeGrid');

    // إظهار/إخفاء حقل النوع الفرعي
    subField.style.display = needsSub ? 'block' : 'none';

    // بناء chips المقاسات
    const sizeType = getCategorySizeType(cat);
    if (!sizeType) {
        sizesField.style.display = 'none';
        grid.innerHTML = '';
        return;
    }

    sizesField.style.display = 'block';
    const sizes = SIZE_MAP[sizeType] || [];
    grid.innerHTML = sizes.map(s => `
        <label class="admin-size-chip">
            <input type="checkbox" name="pSizes" value="${s}">
            <span>${s}</span>
        </label>
    `).join('');
}

/* جمع المقاسات المختارة */
function getSelectedSizes() {
    return Array.from(document.querySelectorAll('#adminSizeGrid input[name="pSizes"]:checked'))
                .map(cb => cb.value);
}

/* ===== AUTH STATE OBSERVER ===== */
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                document.getElementById('loginPage').style.display = 'none';
                document.getElementById('adminPanel').style.display = 'flex';
                loadAdminProducts();
            }
        });
    }

    // تشغيل onCategoryChange عشان يبني الـ chips للقسم الافتراضي (girls)
    onCategoryChange();

    // ربط أزرار الرفع بعد تحميل الـ DOM
    document.querySelectorAll('.upload-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const wrapper = this.closest('.image-upload-area');
            const input   = wrapper ? wrapper.querySelector('input[type="text"]') : null;
            const inputId = input ? input.id : (
                document.getElementById('productsTab').style.display !== 'none' ? 'pImageUrl' : 'oImageUrl'
            );
            openCloudinaryWidget(inputId);
        });
    });
});

/* ===== LOGIN WITH FIREBASE AUTH ===== */
async function handleLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const pass = document.getElementById('adminPassword').value.trim();
    const btn = document.querySelector('.login-btn');

    if (!email || !pass) {
        showToast('من فضلك أدخل الإيميل والباسورد', 'error');
        return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
    btn.disabled = true;

    try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        await firebase.auth().signInWithEmailAndPassword(email, pass);

        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'flex';
        loadAdminProducts();
        showToast('تم تسجيل الدخول بنجاح ✅');

    } catch (error) {
        console.error('Login Error:', error.code, error.message);
        let errorMsg = 'بيانات الدخول غير صحيحة';
        if (error.code === 'auth/user-not-found')         errorMsg = 'هذا الإيميل غير مسجل في Firebase';
        if (error.code === 'auth/wrong-password')         errorMsg = 'كلمة المرور خاطئة، تأكد من الحروف';
        if (error.code === 'auth/invalid-email')          errorMsg = 'صيغة الإيميل مكتوبة بشكل خاطئ';
        if (error.code === 'auth/network-request-failed') errorMsg = 'تأكد من اتصالك بالإنترنت';
        if (error.code === 'auth/operation-not-allowed')  errorMsg = 'فعّل Email/Password من لوحة Firebase';
        if (error.code === 'auth/invalid-credential')     errorMsg = 'الإيميل أو الباسورد غلط';
        if (error.code === 'auth/too-many-requests')      errorMsg = 'محاولات كثيرة، انتظر قليلاً ثم حاول مجدداً';

        const errorDiv = document.getElementById('loginError');
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${errorMsg}`;
        errorDiv.style.display = 'flex';
        setTimeout(() => { errorDiv.style.display = 'none'; }, 4000);

    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

/* ===== TABS ===== */
function switchTab(tab) {
    ['products', 'offers'].forEach(t => {
        const tabEl = document.getElementById(`${t}Tab`);
        const navEl = document.getElementById(`nav${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (tabEl) tabEl.style.display = 'none';
        if (navEl) navEl.classList.remove('active');
    });

    const active = document.getElementById(`${tab}Tab`);
    const activeNav = document.getElementById(`nav${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (active) active.style.display = 'block';
    if (activeNav) activeNav.classList.add('active');

    if (tab === 'offers')   loadAdminOffers();
    if (tab === 'products') loadAdminProducts();
}

/* ===== MOBILE NAV ACTIVE STATE ===== */
function setMobileActive(btn) {
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

/* ===== ADD PRODUCT ===== */
async function addProduct() {
    const name           = document.getElementById('pName').value.trim();
    const price          = parseFloat(document.getElementById('pPrice').value);
    const wholesalePrice = parseFloat(document.getElementById('pWholesalePrice').value) || null;
    const category       = document.getElementById('pCategory').value;
    const mode           = document.getElementById('pMode').value;
    const emoji          = document.getElementById('pEmoji').value || '📦';
    const desc           = document.getElementById('pDesc').value.trim() || '';
    const nameEn         = document.getElementById('pNameEn').value.trim() || '';
    const imageUrl       = document.getElementById('pImageUrl').value.trim();
    const subTypeEl      = document.getElementById('pSubType');
    const subType        = ['shoes','bags','accessories'].includes(category) && subTypeEl ? subTypeEl.value : null;
    const availableSizes = getSelectedSizes();

    if (!name)                { showToast('لازم تكتب اسم المنتج! ❌', 'error'); return; }
    if (!price || price <= 0) { showToast('لازم تكتب سعر صحيح! ❌', 'error'); return; }
    if (wholesalePrice && wholesalePrice >= price) { showToast('سعر الجملة لازم يكون أقل من القطاعي ⚠️', 'error'); return; }

    const btn = document.getElementById('submitBtn');
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-left:8px;"></div> جاري الحفظ...';
    btn.disabled = true;

    try {
        const productData = {
            name,
            name_en: nameEn,
            price,
            wholesale_price: wholesalePrice,
            category,
            mode,
            image_url: imageUrl || '',
            image_emoji: emoji,
            description: desc,
            active: true,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (availableSizes.length > 0) productData.available_sizes = availableSizes;
        if (subType) productData.sub_type = subType;

        await db.collection('products').add(productData);
        showToast('تم حفظ المنتج بنجاح ✅');
        clearForm(['pName','pPrice','pWholesalePrice','pEmoji','pDesc','pNameEn','pImageUrl']);
        document.querySelectorAll('#adminSizeGrid input[name="pSizes"]').forEach(cb => cb.checked = false);
        loadAdminProducts();
    } catch (e) {
        showToast('خطأ في الحفظ: ' + e.message, 'error');
        console.error('Add product error:', e);
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> حفظ ونشر المنتج';
        btn.disabled = false;
    }
}

/* ===== LOAD PRODUCTS ===== */
const CATEGORY_NAMES = {
    girls:       '👧 بناتي',
    boys:        '👦 أولادي',
    women:       '👩 حريمي',
    men:         '👨 رجالي',
    kids:        '🍼 أطفالي',
    islamic:     '🌙 إسلامي',
    shoes:       '👟 أحذية',
    bags:        '👜 حقائب',
    accessories: '💍 اكسسوارات'
};

async function loadAdminProducts() {
    const list = document.getElementById('adminProductsList');
    list.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>جاري التحميل...</p></div>';
    try {
        const snap = await db.collection('products').orderBy('created_at', 'desc').get();
        if (snap.empty) {
            list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:24px;">لا توجد منتجات بعد</p>';
            return;
        }
        list.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <div class="item-img">
                    ${d.image_url
                        ? `<img src="${d.image_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                        : ''}
                    <span style="${d.image_url ? 'display:none' : 'display:flex'};width:100%;height:100%;align-items:center;justify-content:center;font-size:22px">${d.image_emoji || '📦'}</span>
                </div>
                <div class="item-info">
                    <div class="item-name">${escapeHtml(d.name)}</div>
                    <div class="item-meta">${CATEGORY_NAMES[d.category] || d.category}${d.sub_type ? ' · ' + (CATEGORY_NAMES[d.sub_type] || d.sub_type) : ''} · ${
                        d.mode === 'wholesale' ? 'جملة فقط' :
                        d.mode === 'retail'    ? 'قطاعي فقط' : 'الجميع'
                    }</div>
                    ${d.available_sizes && d.available_sizes.length ? `<div class="item-meta" style="color:var(--gold);font-size:10px;margin-top:2px">📐 ${d.available_sizes.join(' · ')}</div>` : ''}
                </div>
                <div class="item-price">
                    EGP ${d.price}
                    ${d.wholesale_price ? `<br><small style="color:var(--gray);font-size:10px">جملة: ${d.wholesale_price}</small>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn-edit" onclick="editProduct('${doc.id}', ${JSON.stringify(d).replace(/"/g,"'")})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteProduct('${doc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>`;
            list.appendChild(row);
        });
    } catch (e) {
        list.innerHTML = `<p style="color:var(--danger);padding:16px;">خطأ: ${e.message}</p>`;
        console.error('Load products error:', e);
    }
}

async function editProduct(id, data) {
    const val = prompt('السعر الجديد (قطاعي):', data.price);
    if (val === null) return;
    const newPrice = parseFloat(val);
    if (isNaN(newPrice) || newPrice <= 0) { showToast('سعر غير صحيح ❌', 'error'); return; }

    try {
        await db.collection('products').doc(id).update({ price: newPrice });
        showToast('تم تحديث السعر ✅');
        loadAdminProducts();
    } catch (e) {
        showToast('خطأ في التحديث: ' + e.message, 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('حذف هذا المنتج نهائياً؟')) return;
    try {
        await db.collection('products').doc(id).delete();
        showToast('تم الحذف ✅');
        loadAdminProducts();
    } catch (e) {
        showToast('خطأ في الحذف: ' + e.message, 'error');
    }
}

/* ===== OFFERS ===== */
async function addOffer() {
    const name     = document.getElementById('oName').value.trim();
    const orig     = parseFloat(document.getElementById('oOriginalPrice').value);
    const sale     = parseFloat(document.getElementById('oSalePrice').value);
    const emoji    = document.getElementById('oEmoji').value || '🏷️';
    const desc     = document.getElementById('oDesc').value.trim() || '';
    const imageUrl = document.getElementById('oImageUrl').value.trim();

    if (!name)              { showToast('الاسم إجباري! ❌', 'error'); return; }
    if (!orig || orig <= 0) { showToast('السعر الأصلي إجباري! ❌', 'error'); return; }
    if (!sale || sale <= 0) { showToast('سعر العرض إجباري! ❌', 'error'); return; }
    if (sale >= orig)       { showToast('سعر العرض لازم يكون أقل من الأصلي ⚠️', 'error'); return; }

    const offerBtn = document.querySelector('.offers-submit');
    if (offerBtn) { offerBtn.disabled = true; offerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري النشر...'; }

    try {
        await db.collection('offers').add({
            name,
            original_price: orig,
            sale_price: sale,
            image_url: imageUrl || '',
            image_emoji: emoji,
            description: desc,
            active: true,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('تم نشر العرض 🔥');
        clearForm(['oName','oOriginalPrice','oSalePrice','oEmoji','oDesc','oImageUrl']);
        loadAdminOffers();
    } catch (e) {
        showToast('خطأ: ' + e.message, 'error');
        console.error('Add offer error:', e);
    } finally {
        if (offerBtn) { offerBtn.disabled = false; offerBtn.innerHTML = '<i class="fas fa-fire"></i> نشر العرض'; }
    }
}

async function loadAdminOffers() {
    const list = document.getElementById('adminOffersList');
    list.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>جاري التحميل...</p></div>';
    try {
        const snap = await db.collection('offers').orderBy('created_at', 'desc').get();
        if (snap.empty) {
            list.innerHTML = '<p style="text-align:center;color:var(--gray);padding:24px;">لا توجد عروض بعد</p>';
            return;
        }
        list.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const disc = d.original_price > 0
                ? Math.round(((d.original_price - d.sale_price) / d.original_price) * 100)
                : 0;
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <div class="item-img">
                    ${d.image_url
                        ? `<img src="${d.image_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                        : ''}
                    <span style="${d.image_url ? 'display:none' : 'display:flex'};width:100%;height:100%;align-items:center;justify-content:center;font-size:22px">${d.image_emoji || '🏷️'}</span>
                </div>
                <div class="item-info">
                    <div class="item-name">${escapeHtml(d.name)}</div>
                    <div class="item-meta" style="color:#e74c3c">خصم ${disc}%</div>
                </div>
                <div class="item-price" style="color:#e74c3c">
                    EGP ${d.sale_price}
                    <br><small style="color:var(--gray);text-decoration:line-through;">${d.original_price}</small>
                </div>
                <div class="item-actions">
                    <button class="btn-delete" onclick="deleteOffer('${doc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>`;
            list.appendChild(row);
        });
    } catch (e) {
        list.innerHTML = `<p style="color:var(--danger);padding:16px;">خطأ: ${e.message}</p>`;
        console.error('Load offers error:', e);
    }
}

async function deleteOffer(id) {
    if (!confirm('حذف هذا العرض نهائياً؟')) return;
    try {
        await db.collection('offers').doc(id).delete();
        showToast('تم الحذف ✅');
        loadAdminOffers();
    } catch (e) {
        showToast('خطأ في الحذف: ' + e.message, 'error');
    }
}

/* ===== HELPERS ===== */
function clearForm(ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.style.borderColor = ''; }
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type = 'success') {
    // أزل أي toast موجود
    document.querySelectorAll('.admin-toast').forEach(t => t.remove());

    const t = document.createElement('div');
    t.className = 'admin-toast';
    t.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        z-index: 9999;
        background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
        color: white;
        padding: 14px 24px;
        border-radius: 12px;
        font-family: 'Tajawal', sans-serif;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        opacity: 0;
        transition: all 0.3s ease;
        white-space: nowrap;
        max-width: 90vw;
        text-align: center;
    `;
    t.textContent = msg;
    document.body.appendChild(t);

    requestAnimationFrame(() => {
        t.style.opacity = '1';
        t.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => t.remove(), 300);
    }, 2800);
}

async function logout() {
    try {
        await firebase.auth().signOut();
        location.reload();
    } catch (error) {
        console.error('Logout Error:', error);
        location.reload();
    }
}

/* ===== ENTER KEY ===== */
document.addEventListener('keypress', e => {
    if (e.key === 'Enter' && document.getElementById('loginPage').style.display !== 'none') {
        handleLogin();
    }
});

/* ===== SECURITY ===== */
document.addEventListener('contextmenu', e => e.preventDefault());
document.onkeydown = function(e) {
    if (e.keyCode === 123) return false;
    if (e.ctrlKey && e.shiftKey && ['I','C','J'].includes(String.fromCharCode(e.keyCode))) return false;
    if (e.ctrlKey && e.keyCode === 'U'.charCodeAt(0)) return false;
};
