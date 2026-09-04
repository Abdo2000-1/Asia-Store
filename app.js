let cart = [];
let allProducts = [];
let allOffers = [];
let currentCategory = "all";
let currentMode = "retail";
let currentSearch = "";
let currentPage = 1;

const PRODUCTS_PER_PAGE = 12;
const selectedSizes = {};
const quantities = {};
const offerQuantities = {};

const CATEGORY_NAMES = {
  all: "الكل",
  girls: "بناتي",
  boys: "أولادي",
  women: "حريمي",
  men: "رجالي",
  kids: "أطفالي",
  islamic: "إسلامي",
  accessories: "اكسسوارات",
  shoes: "أحذية",
  bags: "حقائب",
};

const CATEGORY_ICONS = {
  all: "fa-border-all",
  girls: "fa-child-dress",
  boys: "fa-child",
  women: "fa-person-dress",
  men: "fa-person",
  kids: "fa-baby",
  islamic: "fa-moon",
  accessories: "fa-gem",
  shoes: "fa-shoe-prints",
  bags: "fa-bag-shopping",
};

const ADULT_SIZES = ["M", "XL", "2X", "3X", "4X", "5X"];
const ALL_KIDS_AGES = ["من 2 لـ 10", "من 10 لـ 20"];
const SHOE_SIZES = ["30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];

const productsGrid = document.getElementById("productsGrid");
const categoryFilters = document.getElementById("categoryFilters");
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
const searchInfo = document.getElementById("searchInfo");
const emptyState = document.getElementById("emptyState");
const cartIcon = document.getElementById("cartIcon");
const cartBadge = document.getElementById("cartBadge");
const cartPanel = document.getElementById("cartPanel");
const cartClose = document.getElementById("cartClose");
const overlay = document.getElementById("overlay");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const themeToggle = document.getElementById("themeToggle");

document.addEventListener("DOMContentLoaded", async () => {
  loadTheme();
  renderCategoryFilters();
  setupEventListeners();
  setupSmoothScroll();
  setupRevealAnimations();
  loadCartFromLocalStorage();
  updateCartUI();
  await loadProducts();
  await loadOffers();
});

async function loadProducts() {
  try {
    if (typeof db === "undefined") {
      loadFallbackProducts();
      return;
    }
    const snap = await db.collection("products").where("active", "==", true).get();
    allProducts = [];
    snap.forEach((doc) => allProducts.push({ id: doc.id, ...doc.data() }));
    if (allProducts.length === 0) loadFallbackProducts();
  } catch (error) {
    console.error("Load products error:", error);
    loadFallbackProducts();
  } finally {
    renderProducts();
  }
}

function loadFallbackProducts() {
  allProducts = [
    { id: "f1", name: "بلوزة بناتي كاجوال", name_en: "Girls Casual Top", price: 120, wholesale_price: 85, category: "girls", mode: "both", image_emoji: "👗", active: true },
    { id: "f2", name: "بنطلون أولادي", name_en: "Boys Pants", price: 140, wholesale_price: 95, category: "boys", mode: "both", image_emoji: "👖", active: true },
    { id: "f3", name: "عباية حريمي", name_en: "Ladies Abaya", price: 250, wholesale_price: 180, category: "women", mode: "both", image_emoji: "🧕", active: true },
    { id: "f4", name: "تيشيرت رجالي", name_en: "Men T-Shirt", price: 95, wholesale_price: 60, category: "men", mode: "both", image_emoji: "👕", active: true },
    { id: "f5", name: "بدلة أطفال", name_en: "Kids Outfit", price: 175, wholesale_price: 120, category: "kids", mode: "both", image_emoji: "🧸", active: true },
    { id: "f6", name: "حجاب إسلامي فاخر", name_en: "Premium Hijab", price: 85, wholesale_price: 55, category: "islamic", mode: "both", image_emoji: "🌙", active: true },
    { id: "f7", name: "حذاء حريمي كاجوال", name_en: "Women Casual Shoes", price: 220, wholesale_price: 150, category: "shoes", sub_type: "women", mode: "both", image_emoji: "👠", active: true },
    { id: "f8", name: "حقيبة يد حريمي", name_en: "Women Handbag", price: 350, wholesale_price: 240, category: "bags", sub_type: "women", mode: "both", image_emoji: "👜", active: true },
    { id: "f9", name: "إكسسوار ذهبي", name_en: "Gold Accessory", price: 95, category: "accessories", mode: "both", image_emoji: "💍", active: true },
  ];
}

function renderCategoryFilters() {
  categoryFilters.innerHTML = Object.entries(CATEGORY_NAMES).map(([id, label]) => `
    <button class="filter-btn ${currentCategory === id ? "active" : ""}" type="button" data-category="${id}">
      <i class="fa-solid ${CATEGORY_ICONS[id]}"></i>
      <span>${label}</span>
    </button>
  `).join("");
}

function setShopMode(mode) {
  currentMode = mode;
  document.getElementById("modeRetail").classList.toggle("active", mode === "retail");
  document.getElementById("modeWholesale").classList.toggle("active", mode === "wholesale");
  currentPage = 1;
  renderProducts();
}

function getSizeType(category) {
  if (["men", "women", "islamic"].includes(category)) return "adult";
  if (["girls", "boys", "kids"].includes(category)) return "kids";
  if (category === "shoes") return "shoes";
  if (category === "bags") return "bags";
  return null;
}

function getSizes(product) {
  if (Array.isArray(product.available_sizes) && product.available_sizes.length) return product.available_sizes;
  const type = getSizeType(product.category);
  if (type === "adult") return ADULT_SIZES;
  if (type === "kids") return ALL_KIDS_AGES;
  if (type === "shoes") return SHOE_SIZES;
  return [];
}

function getFilteredProducts() {
  return allProducts.filter((product) => {
    if (currentCategory !== "all" && product.category !== currentCategory) return false;
    if (product.mode && product.mode !== "both" && product.mode !== currentMode) return false;
    if (!currentSearch) return true;
    const q = currentSearch.toLowerCase();
    return [product.name, product.name_en, product.description, CATEGORY_NAMES[product.category]].some((value) => String(value || "").toLowerCase().includes(q));
  }).sort((a, b) => {
    const ta = a.created_at ? (a.created_at.seconds || new Date(a.created_at).getTime() / 1000) : 0;
    const tb = b.created_at ? (b.created_at.seconds || new Date(b.created_at).getTime() / 1000) : 0;
    return tb - ta || String(b.id).localeCompare(String(a.id));
  });
}

function renderProducts() {
  const filtered = getFilteredProducts();

  searchInfo.hidden = !currentSearch;
  searchInfo.textContent = currentSearch ? `نتائج البحث عن "${currentSearch}": ${filtered.length} منتج` : "";

  if (!filtered.length) {
    productsGrid.innerHTML = "";
    emptyState.hidden = false;
    renderPagination(0, 0);
    return;
  }

  emptyState.hidden = true;
  const totalPages = Math.ceil(filtered.length / PRODUCTS_PER_PAGE);
  if (currentPage > totalPages) currentPage = 1;
  const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const pageProducts = filtered.slice(start, start + PRODUCTS_PER_PAGE);

  productsGrid.innerHTML = pageProducts.map((product, index) => {
    const displayPrice = (currentMode === "wholesale" && product.wholesale_price) ? product.wholesale_price : product.price;
    const modeLabel = currentMode === "wholesale" ? "جملة" : "قطاعي";
    const sizes = getSizes(product);
    const selected = selectedSizes[product.id] || "";
    const sizeHtml = sizes.length ? `
      <div class="sizes">
        ${sizes.map((size) => `<button class="size ${selected === size ? "selected" : ""}" type="button" data-product="${product.id}" data-size="${size}">${size}</button>`).join("")}
      </div>
    ` : "";
    const subType = product.sub_type ? ` · ${translateSubType(product.sub_type)}` : "";
    const imageHtml = product.image_url
      ? `<img src="${product.image_url}" alt="${product.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="product-emoji-fallback" style="display:none">${product.image_emoji || "👕"}</span>`
      : `<span class="product-emoji-fallback">${product.image_emoji || "👕"}</span>`;

    return `
      <article class="product-card" style="animation-delay:${index * 45}ms">
        <div class="product-image">
          ${imageHtml}
          <span class="product-tag">${modeLabel}</span>
        </div>
        <div class="product-body">
          <h3>${product.name || "منتج من Asia Store"}</h3>
          <p class="product-meta">${CATEGORY_NAMES[product.category] || product.category || "ملابس"}${subType}${product.name_en ? ` · ${product.name_en}` : ""}</p>
          ${product.description ? `<p class="product-desc">${product.description}</p>` : ""}
          ${sizeHtml}
          <div class="product-bottom">
            <div>
              <strong class="price">EGP ${displayPrice || 0}</strong>
              <small class="price-label">${currentMode === "wholesale" ? "سعر الجملة" : "سعر القطعة"}</small>
            </div>
            <div class="qty-control">
              <button class="qty-btn" type="button" data-qty="${product.id}" data-delta="-1">-</button>
              <span class="qty-display" id="qty-${product.id}">${quantities[product.id] || 0}</span>
              <button class="qty-btn" type="button" data-qty="${product.id}" data-delta="1">+</button>
            </div>
          </div>
          <button class="add-to-cart-btn" type="button" data-add="${product.id}" data-price="${displayPrice || 0}">
            <i class="fa-solid fa-bag-shopping"></i> أضف للسلة
          </button>
        </div>
      </article>
    `;
  }).join("");

  renderPagination(totalPages, filtered.length);
}

function translateSubType(type) {
  return { men: "رجالي", women: "حريمي", kids: "أطفالي", girls: "بناتي", boys: "أولادي" }[type] || type;
}

function renderPagination(totalPages, totalCount) {
  const existing = document.getElementById("paginationContainer");
  if (existing) existing.remove();
  if (totalPages <= 1) return;

  const container = document.createElement("div");
  container.id = "paginationContainer";
  container.className = "pagination-container";
  const pages = getPaginationPages(totalPages, currentPage);
  const buttons = [
    `<button class="page-btn page-nav" type="button" data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""} aria-label="الصفحة السابقة"><i class="fa-solid fa-chevron-right"></i></button>`,
    ...pages.map((page) => page === "..."
      ? `<span class="page-ellipsis">...</span>`
      : `<button class="page-btn ${page === currentPage ? "active" : ""}" type="button" data-page="${page}">${page}</button>`
    ),
    `<button class="page-btn page-nav" type="button" data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""} aria-label="الصفحة التالية"><i class="fa-solid fa-chevron-left"></i></button>`,
  ].join("");
  const from = (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const to = Math.min(currentPage * PRODUCTS_PER_PAGE, totalCount);
  container.innerHTML = `<div class="pagination-info">عرض ${from}-${to} من ${totalCount} منتج</div><div class="pagination-buttons">${buttons}</div>`;
  productsGrid.insertAdjacentElement("afterend", container);
}

function getPaginationPages(totalPages, activePage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, activePage - 1);
  const end = Math.min(totalPages - 1, activePage + 1);

  if (start > 2) pages.push("...");
  for (let page = start; page <= end; page++) pages.push(page);
  if (end < totalPages - 1) pages.push("...");
  pages.push(totalPages);
  return pages;
}

async function loadOffers() {
  const section = document.getElementById("offersSection");
  const grid = document.getElementById("offersGrid");
  const empty = document.getElementById("offersEmpty");
  const badge = document.getElementById("offersNavBadge");
  if (!grid || typeof db === "undefined") return;
  try {
    const snap = await db.collection("offers").where("active", "==", true).get();
    allOffers = [];
    snap.forEach((doc) => allOffers.push({ id: doc.id, ...doc.data() }));
    section.hidden = allOffers.length === 0;
    empty.hidden = allOffers.length > 0;
    badge.hidden = allOffers.length === 0;
    badge.textContent = allOffers.length;
    renderOffers();
  } catch (error) {
    console.error("Load offers error:", error);
  }
}

function renderOffers() {
  const grid = document.getElementById("offersGrid");
  if (!grid) return;
  grid.innerHTML = allOffers.map((offer, index) => {
    const qty = offerQuantities[offer.id] || 0;
    const discount = offer.original_price ? Math.round(((offer.original_price - offer.sale_price) / offer.original_price) * 100) : 0;
    const imageHtml = offer.image_url
      ? `<img src="${offer.image_url}" alt="${offer.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="product-emoji-fallback" style="display:none">${offer.image_emoji || "🏷️"}</span>`
      : `<span class="product-emoji-fallback">${offer.image_emoji || "🏷️"}</span>`;
    return `
      <article class="product-card offer-card" style="animation-delay:${index * 45}ms">
        <div class="product-image">${imageHtml}<span class="product-tag">خصم ${discount}%</span></div>
        <div class="product-body">
          <h3>${offer.name}</h3>
          ${offer.description ? `<p class="product-desc">${offer.description}</p>` : ""}
          <div class="offer-prices"><del>EGP ${offer.original_price || 0}</del><strong>EGP ${offer.sale_price || 0}</strong></div>
          <div class="product-bottom">
            <div class="qty-control">
              <button class="qty-btn" type="button" data-offer-qty="${offer.id}" data-delta="-1">-</button>
              <span class="qty-display" id="offer-qty-${offer.id}">${qty}</span>
              <button class="qty-btn" type="button" data-offer-qty="${offer.id}" data-delta="1">+</button>
            </div>
            <button class="add-btn" type="button" data-offer-add="${offer.id}" aria-label="إضافة العرض"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function changeQty(id, delta) {
  quantities[id] = Math.max(0, (quantities[id] || 0) + Number(delta));
  const element = document.getElementById(`qty-${id}`);
  if (element) element.textContent = quantities[id];
}

function addToCart(productId, displayPrice) {
  const product = allProducts.find((item) => item.id === productId);
  if (!product) return;
  const qty = quantities[productId] || 0;
  if (qty <= 0) {
    showNotification("من فضلك اختار الكمية أولاً");
    return;
  }
  const sizes = getSizes(product);
  const selectedSize = selectedSizes[productId] || "";
  if (sizes.length && !selectedSize) {
    showNotification("من فضلك اختار المقاس أولاً");
    return;
  }
  const cartKey = `${productId}_${currentMode}_${selectedSize}`;
  const existing = cart.find((item) => item.cartKey === cartKey);
  const item = { ...product, cartKey, mode: currentMode, selected_size: selectedSize, price: Number(displayPrice), quantity: qty };
  if (existing) existing.quantity += qty;
  else cart.push(item);
  quantities[productId] = 0;
  saveCartToLocalStorage();
  updateCartUI();
  renderProducts();
  showNotification("تمت الإضافة للسلة");
}

function addOfferToCart(offerId) {
  const offer = allOffers.find((item) => item.id === offerId);
  const qty = offerQuantities[offerId] || 0;
  if (!offer || qty <= 0) {
    showNotification("من فضلك اختار الكمية أولاً");
    return;
  }
  const cartKey = `offer_${offerId}`;
  const existing = cart.find((item) => item.cartKey === cartKey);
  if (existing) existing.quantity += qty;
  else cart.push({ ...offer, cartKey, mode: "offer", selected_size: "", price: Number(offer.sale_price), quantity: qty });
  offerQuantities[offerId] = 0;
  saveCartToLocalStorage();
  updateCartUI();
  renderOffers();
  showNotification("تمت إضافة العرض للسلة");
}

function updateCartUI() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  cartBadge.hidden = count === 0;
  cartBadge.textContent = count;
  cartCount.textContent = count;
  cartTotal.textContent = `EGP ${total.toFixed(2)}`;

  if (!cart.length) {
    cartItems.innerHTML = '<div class="cart-empty"><div><i class="fa-solid fa-bag-shopping"></i><p>سلتك فارغة الآن</p></div></div>';
    return;
  }
  cartItems.innerHTML = cart.map((item) => {
    const image = item.image_url || "";
    return `
      <div class="cart-item">
        ${image ? `<img src="${image}" alt="${item.name}">` : `<div class="cart-emoji">${item.image_emoji || "👕"}</div>`}
        <div>
          <h3>${item.name}${item.selected_size ? ` - ${item.selected_size}` : ""}</h3>
          <small>${item.mode === "wholesale" ? "جملة" : item.mode === "offer" ? "عرض" : "قطاعي"} · الكمية ${item.quantity}</small>
          <strong>EGP ${(Number(item.price) * item.quantity).toFixed(2)}</strong>
        </div>
        <button class="remove-btn" type="button" data-remove="${item.cartKey}" aria-label="إزالة"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
  }).join("");
}

function removeFromCart(cartKey) {
  cart = cart.filter((item) => item.cartKey !== cartKey);
  saveCartToLocalStorage();
  updateCartUI();
}

function openCart() {
  cartPanel.classList.add("open");
  overlay.classList.add("active");
  document.body.classList.add("no-scroll");
}

function closeCart() {
  cartPanel.classList.remove("open");
  overlay.classList.remove("active");
  document.body.classList.remove("no-scroll");
}

function proceedToOrder() {
  if (!cart.length) {
    showNotification("سلتك فارغة");
    return;
  }
  const items = cart.map((item) =>
    `• ${item.name}${item.selected_size ? ` - مقاس: ${item.selected_size}` : ""}${item.mode === "wholesale" ? " (جملة)" : item.mode === "offer" ? " (عرض)" : ""}\n  الكمية: ${item.quantity}\n  السعر: EGP ${item.price}\n  الإجمالي: EGP ${(Number(item.price) * item.quantity).toFixed(2)}`
  ).join("\n\n");
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const message = `*طلب جديد من Asia Store*\n\n${items}\n\n*الإجمالي: EGP ${total.toFixed(2)}*`;
  logOrder(total);
  window.open(`https://wa.me/${typeof WHATSAPP_NUMBER !== "undefined" ? WHATSAPP_NUMBER : "201115019259"}?text=${encodeURIComponent(message)}`, "_blank");
}

async function logOrder(total) {
  try {
    if (typeof db !== "undefined") {
      await db.collection("orders").add({ items: cart, total, mode: currentMode, status: "pending", created_at: new Date() });
    }
  } catch (error) {
    console.error("Log order error:", error);
  }
}

function loadTheme() {
  const isDark = localStorage.getItem("asia_global_theme") === "dark";
  document.body.classList.toggle("dark", isDark);
  themeToggle.innerHTML = isDark ? '<i class="fa-regular fa-sun"></i>' : '<i class="fa-regular fa-moon"></i>';
}

function setupEventListeners() {
  searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value.trim();
    searchClear.hidden = !currentSearch;
    currentPage = 1;
    renderProducts();
  });
  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    currentSearch = "";
    searchClear.hidden = true;
    currentPage = 1;
    renderProducts();
  });
  cartIcon.addEventListener("click", openCart);
  cartClose.addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);
  checkoutBtn.addEventListener("click", proceedToOrder);
  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("asia_global_theme", isDark ? "dark" : "light");
    loadTheme();
  });

  document.addEventListener("click", (event) => {
    const categoryButton = event.target.closest("[data-category]");
    if (categoryButton) {
      currentCategory = categoryButton.dataset.category;
      currentPage = 1;
      renderCategoryFilters();
      renderProducts();
    }

    const jumpCard = event.target.closest("[data-category-jump]");
    if (jumpCard) {
      currentCategory = jumpCard.dataset.categoryJump;
      currentPage = 1;
      renderCategoryFilters();
      renderProducts();
    }

    const sizeButton = event.target.closest("[data-size]");
    if (sizeButton) {
      selectedSizes[sizeButton.dataset.product] = sizeButton.dataset.size;
      renderProducts();
    }

    const qtyButton = event.target.closest("[data-qty]");
    if (qtyButton) changeQty(qtyButton.dataset.qty, qtyButton.dataset.delta);

    const offerQtyButton = event.target.closest("[data-offer-qty]");
    if (offerQtyButton) {
      const id = offerQtyButton.dataset.offerQty;
      offerQuantities[id] = Math.max(0, (offerQuantities[id] || 0) + Number(offerQtyButton.dataset.delta));
      const element = document.getElementById(`offer-qty-${id}`);
      if (element) element.textContent = offerQuantities[id];
    }

    const addButton = event.target.closest("[data-add]");
    if (addButton) addToCart(addButton.dataset.add, addButton.dataset.price);

    const offerAddButton = event.target.closest("[data-offer-add]");
    if (offerAddButton) addOfferToCart(offerAddButton.dataset.offerAdd);

    const removeButton = event.target.closest("[data-remove]");
    if (removeButton) removeFromCart(removeButton.dataset.remove);

    const pageButton = event.target.closest("[data-page]");
    if (pageButton && !pageButton.disabled) {
      const nextPage = Number(pageButton.dataset.page);
      const totalPages = Math.ceil(getFilteredProducts().length / PRODUCTS_PER_PAGE);
      if (nextPage >= 1 && nextPage <= totalPages) {
        currentPage = nextPage;
        renderProducts();
        document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
}

function saveCartToLocalStorage() {
  localStorage.setItem("asia_cart", JSON.stringify(cart));
}

function loadCartFromLocalStorage() {
  try {
    cart = JSON.parse(localStorage.getItem("asia_cart")) || [];
  } catch {
    cart = [];
  }
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 2200);
}

function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function setupRevealAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  }, { threshold: 0.16 });
  document.querySelectorAll(".section-observe").forEach((section) => observer.observe(section));
}
