const products = [
  {
    id: "w1",
    name: "ترنش كوت نسائي كلاسيك",
    category: "women",
    label: "Paris Edit",
    price: 129,
    sizes: ["XS", "S", "M", "L", "XL"],
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=85",
  },
  {
    id: "w2",
    name: "فستان سهرة ساتان",
    category: "women",
    label: "Evening",
    price: 169,
    sizes: ["S", "M", "L"],
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=85",
  },
  {
    id: "m1",
    name: "بدلة رجالية بقصة عصرية",
    category: "men",
    label: "Milan Fit",
    price: 219,
    sizes: ["M", "L", "XL", "XXL"],
    image: "https://images.unsplash.com/photo-1506629905607-d405d7d3b0d2?auto=format&fit=crop&w=800&q=85",
  },
  {
    id: "m2",
    name: "جاكيت دنيم عالمي",
    category: "men",
    label: "Denim",
    price: 98,
    sizes: ["S", "M", "L", "XL"],
    image: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=800&q=85",
  },
  {
    id: "k1",
    name: "هودي أطفال مريح",
    category: "kids",
    label: "Kids",
    price: 54,
    sizes: ["4Y", "6Y", "8Y", "10Y"],
    image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=85",
  },
  {
    id: "k2",
    name: "طقم أطفال للسفر",
    category: "kids",
    label: "Travel",
    price: 72,
    sizes: ["3Y", "5Y", "7Y", "9Y"],
    image: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?auto=format&fit=crop&w=800&q=85",
  },
  {
    id: "a1",
    name: "سنيكرز أبيض فاخر",
    category: "accessories",
    label: "Sneakers",
    price: 116,
    sizes: ["38", "39", "40", "41", "42", "43"],
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=85",
  },
  {
    id: "a2",
    name: "حقيبة جلد يومية",
    category: "accessories",
    label: "Leather",
    price: 145,
    sizes: ["One Size"],
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=85",
  },
];

const categories = [
  ["all", "الكل"],
  ["women", "نساء"],
  ["men", "رجال"],
  ["kids", "أطفال"],
  ["accessories", "أحذية وإكسسوارات"],
];

const state = {
  category: "all",
  search: "",
  cart: JSON.parse(localStorage.getItem("asia_global_cart") || "[]"),
  selectedSizes: {},
};

const productsGrid = document.getElementById("productsGrid");
const categoryFilters = document.getElementById("categoryFilters");
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");
const cartIcon = document.getElementById("cartIcon");
const cartPanel = document.getElementById("cartPanel");
const cartClose = document.getElementById("cartClose");
const overlay = document.getElementById("overlay");
const cartItems = document.getElementById("cartItems");
const cartBadge = document.getElementById("cartBadge");
const cartTotal = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const themeToggle = document.getElementById("themeToggle");

function money(value) {
  return `$${value}`;
}

function persistCart() {
  localStorage.setItem("asia_global_cart", JSON.stringify(state.cart));
}

function renderFilters() {
  categoryFilters.innerHTML = categories.map(([id, label]) => (
    `<button class="filter-btn ${state.category === id ? "active" : ""}" type="button" data-category="${id}">${label}</button>`
  )).join("");
}

function filteredProducts() {
  const q = state.search.trim().toLowerCase();
  return products.filter((product) => {
    const matchesCategory = state.category === "all" || product.category === state.category;
    const matchesSearch = !q || product.name.toLowerCase().includes(q) || product.label.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });
}

function renderProducts() {
  const list = filteredProducts();
  emptyState.hidden = list.length > 0;
  productsGrid.innerHTML = list.map((product, index) => {
    const selectedSize = state.selectedSizes[product.id] || product.sizes[0];
    state.selectedSizes[product.id] = selectedSize;
    const sizes = product.sizes.map((size) => (
      `<button class="size ${selectedSize === size ? "selected" : ""}" type="button" data-product="${product.id}" data-size="${size}">${size}</button>`
    )).join("");
    return `
      <article class="product-card" style="animation-delay:${index * 45}ms">
        <div class="product-image">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
          <span class="product-tag">${product.label}</span>
        </div>
        <div class="product-body">
          <h3>${product.name}</h3>
          <p class="product-meta">${categories.find(([id]) => id === product.category)?.[1] || product.category} · Global fit</p>
          <div class="sizes">${sizes}</div>
          <div class="product-bottom">
            <strong class="price">${money(product.price)}</strong>
            <button class="add-btn" type="button" data-add="${product.id}" aria-label="إضافة ${product.name} للسلة"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function updateCart() {
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const total = state.cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  cartBadge.hidden = count === 0;
  cartBadge.textContent = count;
  cartTotal.textContent = money(total);

  if (state.cart.length === 0) {
    cartItems.innerHTML = '<div class="cart-empty"><div><i class="fa-solid fa-bag-shopping"></i><p>سلتك فارغة الآن</p></div></div>';
    return;
  }

  cartItems.innerHTML = state.cart.map((item) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}">
      <div>
        <h3>${item.name}</h3>
        <small>مقاس ${item.size} · الكمية ${item.qty}</small>
        <strong>${money(item.price * item.qty)}</strong>
      </div>
      <button class="remove-btn" type="button" data-remove="${item.key}" aria-label="إزالة"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join("");
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  const size = state.selectedSizes[product.id] || product.sizes[0];
  const key = `${product.id}-${size}`;
  const existing = state.cart.find((item) => item.key === key);
  if (existing) existing.qty += 1;
  else state.cart.push({ key, id: product.id, name: product.name, size, price: product.price, image: product.image, qty: 1 });
  persistCart();
  updateCart();
  openCart();
}

function removeFromCart(key) {
  state.cart = state.cart.filter((item) => item.key !== key);
  persistCart();
  updateCart();
}

function openCart() {
  cartPanel.classList.add("open");
  overlay.classList.add("active");
  document.body.classList.add("no-scroll");
  cartPanel.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartPanel.classList.remove("open");
  overlay.classList.remove("active");
  document.body.classList.remove("no-scroll");
  cartPanel.setAttribute("aria-hidden", "true");
}

function checkout() {
  if (!state.cart.length) return;
  const lines = state.cart.map((item) => `- ${item.name} | Size: ${item.size} | Qty: ${item.qty} | ${money(item.price * item.qty)}`);
  const total = state.cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const message = `Asia Store Global Fashion Order%0A%0A${encodeURIComponent(lines.join("\n"))}%0A%0ATotal: ${money(total)}`;
  window.open(`https://wa.me/201115019259?text=${message}`, "_blank", "noopener");
}

function setCategory(category) {
  state.category = category;
  renderFilters();
  renderProducts();
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

document.addEventListener("click", (event) => {
  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) setCategory(categoryButton.dataset.category);

  const sizeButton = event.target.closest("[data-size]");
  if (sizeButton) {
    state.selectedSizes[sizeButton.dataset.product] = sizeButton.dataset.size;
    renderProducts();
  }

  const addButton = event.target.closest("[data-add]");
  if (addButton) addToCart(addButton.dataset.add);

  const removeButton = event.target.closest("[data-remove]");
  if (removeButton) removeFromCart(removeButton.dataset.remove);

  const jumpCard = event.target.closest("[data-category-jump]");
  if (jumpCard) setCategory(jumpCard.dataset.categoryJump);
});

searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  renderProducts();
});

cartIcon.addEventListener("click", openCart);
cartClose.addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
checkoutBtn.addEventListener("click", checkout);
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeToggle.innerHTML = isDark ? '<i class="fa-regular fa-sun"></i>' : '<i class="fa-regular fa-moon"></i>';
  localStorage.setItem("asia_global_theme", isDark ? "dark" : "light");
});

if (localStorage.getItem("asia_global_theme") === "dark") {
  document.body.classList.add("dark");
  themeToggle.innerHTML = '<i class="fa-regular fa-sun"></i>';
}

renderFilters();
renderProducts();
updateCart();
setupSmoothScroll();
setupRevealAnimations();
