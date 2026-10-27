// ==============================================================
// ATΛL — STOREFRONT LOGIC
// Leather boots store. Depends on store.js (loaded first).
// ==============================================================

let products = [];
const CURRENCY = 'PKR';

// --------------------------------------------------------------
// SMALL HELPERS
// --------------------------------------------------------------
function qs(selector, scope) { return (scope || document).querySelector(selector); }
function qsa(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }
function money(amount) { return Store.formatPKR(amount); }

function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ==============================================================
// BOOTSTRAP
// ==============================================================
document.addEventListener('DOMContentLoaded', async function () {
    await Store.ready();
    products = Store.getProducts();

    initNavbarScroll();
    initMobileNav();
    initCartDrawer();
    initSearchOverlay();
    initModals();
    initNewsletter();
    initContactForm();
    updateSharedUI();
    initMobileBottomNav();

    if (document.getElementById('heroSlider')) initHeroSlider();
    if (document.getElementById('homeNewArrivalsGrid')) renderHomeArrivals();
    if (document.getElementById('shopLayoutContainer')) initShopPage();
    if (document.getElementById('productDetailsContainer')) initDetailsPage();
    if (document.getElementById('categoryGrid')) renderCategoryCards();
});

// ==============================================================
// NAVBAR
// ==============================================================
function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    const onScroll = function () {
        navbar.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

function initMobileNav() {
    const hamburger = document.getElementById('hamburgerBtn');
    const drawer = document.getElementById('mobileNavDrawer');
    const closeBtn = document.getElementById('closeMobileNavBtn');
    const overlay = document.getElementById('drawerOverlay');
    if (!hamburger || !drawer) return;

    function open() {
        drawer.classList.add('open');
        if (overlay) overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function close() {
        drawer.classList.remove('open');
        const cartOpen = document.getElementById('cartDrawer') && document.getElementById('cartDrawer').classList.contains('open');
        if (!cartOpen && overlay) {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    hamburger.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    qsa('.mobile-nav-link').forEach(function (link) { link.addEventListener('click', close); });
    if (overlay) overlay.addEventListener('click', close);
}

// Mobile bottom navigation active state
function initMobileBottomNav() {
    const nav = document.getElementById('mobileBottomNav');
    if (!nav) return;
    const page = window.location.pathname.split('/').pop() || 'index.html';
    qsa('.mbn-item', nav).forEach(function (item) {
        const href = item.getAttribute('href') || '';
        if (href === page || (page === '' && href === 'index.html')) {
            item.classList.add('active');
        }
    });
}

// ==============================================================
// CART DRAWER
// ==============================================================
function initCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const closeBtn = document.getElementById('closeCartBtn');
    if (!drawer) return;

    qsa('.cart-toggle-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const mobileDrawer = document.getElementById('mobileNavDrawer');
            if (mobileDrawer) mobileDrawer.classList.remove('open');
            drawer.classList.add('open');
            if (overlay) overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            renderCartItems();
        });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);
    if (overlay) overlay.addEventListener('click', closeCartDrawer);

    const cartBody = document.getElementById('cartDrawerBody');
    if (cartBody) {
        cartBody.addEventListener('click', function (e) {
            const inc = e.target.closest('.increase-qty');
            const dec = e.target.closest('.decrease-qty');
            const remove = e.target.closest('.remove-from-cart');
            if (!inc && !dec && !remove) return;
            const el = inc || dec || remove;
            const index = Number(el.getAttribute('data-index'));
            const cart = Store.getCart();
            if (!cart[index]) return;
            if (inc) Store.updateCartQty(index, cart[index].qty + 1);
            else if (dec) Store.updateCartQty(index, cart[index].qty - 1);
            else {
                Store.removeCartItem(index);
                showToast('Item removed from bag');
            }
            renderCartItems();
            updateSharedUI();
        });
    }
}

function openCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (!drawer) return;
    drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderCartItems();
}

function closeCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const mobileDrawer = document.getElementById('mobileNavDrawer');
    if (drawer) drawer.classList.remove('open');
    const mobileOpen = mobileDrawer && mobileDrawer.classList.contains('open');
    if (!mobileOpen && overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function renderCartItems() {
    const body = document.getElementById('cartDrawerBody');
    const subtotalEl = document.getElementById('cartSubtotal');
    const shippingEl = document.getElementById('cartShipping');
    const totalEl = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (!body) return;

    const cart = Store.getCart();

    if (!cart.length) {
        body.innerHTML = [
            '<div class="cart-empty-message">',
            '<i class="fas fa-shopping-bag"></i>',
            '<p class="text-uppercase" style="letter-spacing:0.1em; font-size:0.85rem; font-weight:600; margin-bottom:8px;">Your bag is empty</p>',
            '<p style="font-size:0.8rem; margin-bottom:14px;">Your next pair of boots is one click away.</p>',
            '<a href="shop.html" class="btn-link" style="font-size:0.75rem;">Shop the collection</a>',
            '</div>'
        ].join('');
        if (subtotalEl) subtotalEl.textContent = money(0);
        if (shippingEl) shippingEl.textContent = money(0);
        if (totalEl) totalEl.textContent = money(0);
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }

    if (checkoutBtn) checkoutBtn.style.display = 'block';

    body.innerHTML = cart.map(function (item, index) {
        return [
            '<div class="cart-item">',
            '<img src="' + item.image + '" alt="' + escapeHtml(item.name) + '" class="cart-item-img" />',
            '<div class="cart-item-info">',
            '<span class="cart-item-name">' + escapeHtml(item.name) + '</span>',
            '<span class="cart-item-meta">Size UK ' + escapeHtml(item.size) + ' &middot; ' + escapeHtml(item.color) + '</span>',
            '<div class="cart-item-quantity">',
            '<button class="cart-qty-btn decrease-qty" data-index="' + index + '" aria-label="Decrease quantity">-</button>',
            '<span class="cart-qty-val">' + item.qty + '</span>',
            '<button class="cart-qty-btn increase-qty" data-index="' + index + '" aria-label="Increase quantity">+</button>',
            '</div>',
            '</div>',
            '<div class="cart-item-price-block">',
            '<button class="cart-item-remove-btn remove-from-cart" data-index="' + index + '" aria-label="Remove item"><i class="far fa-trash-alt"></i></button>',
            '<span class="cart-item-price">' + money(item.price * item.qty) + '</span>',
            '</div>',
            '</div>'
        ].join('');
    }).join('');

    const totals = Store.cartTotals();
    if (subtotalEl) subtotalEl.textContent = money(totals.subtotal);
    if (shippingEl) shippingEl.textContent = totals.shipping === 0 ? 'FREE' : money(totals.shipping);
    if (totalEl) totalEl.textContent = money(totals.total);
}

// ==============================================================
// SEARCH OVERLAY
// ==============================================================
function initSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    const closeBtn = document.getElementById('closeSearchBtn');
    const input = document.getElementById('headerSearchInput');
    if (!overlay) return;

    qsa('.search-toggle-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            overlay.classList.add('open');
            setTimeout(function () { if (input) input.focus(); }, 200);
        });
    });

    function close() {
        overlay.classList.remove('open');
        if (input) input.value = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) close();
    });
    if (input) {
        input.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            const query = input.value.trim();
            if (!query) return;
            close();
            window.location.href = 'shop.html?search=' + encodeURIComponent(query);
        });
    }
}

// ==============================================================
// MODALS
// ==============================================================
function initModals() {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay) return;
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay || e.target.closest('.modal-close-btn')) closeModal();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
    });
}

function openModal(contentHtml, sizeClass) {
    const overlay = document.getElementById('modalOverlay');
    const container = document.getElementById('modalContentContainer');
    if (!overlay || !container) return;
    container.className = 'modal-content-container' + (sizeClass ? ' ' + sizeClass : '');
    container.innerHTML = contentHtml;

    // Bind close controls directly so they always dismiss the modal
    qsa('.modal-close-btn, [data-close-modal]', container).forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            closeModal();
        });
    });

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    const cartDrawer = document.getElementById('cartDrawer');
    if (!cartDrawer || !cartDrawer.classList.contains('open')) {
        document.body.style.overflow = '';
    }
}

// ==============================================================
// TOASTS
// ==============================================================
function showToast(message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = '<i class="fas fa-check"></i> <span>' + escapeHtml(message) + '</span>';
    container.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('show'); });
    setTimeout(function () {
        toast.classList.remove('show');
        setTimeout(function () { toast.remove(); }, 350);
    }, 3000);
}

// ==============================================================
// SHARED UI SYNC
// ==============================================================
function updateSharedUI() {
    const cartQty = Store.cartCount();
    qsa('.cart-count-badge').forEach(function (el) {
        el.textContent = cartQty;
        el.style.display = cartQty > 0 ? 'flex' : 'none';
    });

    const wishlistQty = Store.getWishlist().length;
    qsa('.wishlist-count-badge').forEach(function (el) {
        el.textContent = wishlistQty;
        el.style.display = wishlistQty > 0 ? 'flex' : 'none';
    });

    qsa('.product-card-wishlist').forEach(function (btn) {
        const id = Number(btn.getAttribute('data-id'));
        const active = Store.isWishlisted(id);
        btn.classList.toggle('active', active);
        btn.innerHTML = '<i class="' + (active ? 'fas' : 'far') + ' fa-heart"></i>';
    });
}

// ==============================================================
// CART + WISHLIST ACTIONS
// ==============================================================
function addToCart(productId, quantity, size, colorHex) {
    const product = Store.getProduct(productId);
    if (!product) return false;
    const color = (product.colors || []).find(function (c) { return c.hex === colorHex; }) || product.colors[0];

    Store.addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0],
        size: size,
        color: color ? color.name : '',
        qty: quantity
    });

    updateSharedUI();
    showToast(product.name + ' (UK ' + size + ') added to bag');
    return true;
}

async function toggleWishlist(productId) {
    const product = Store.getProduct(productId);
    if (!product) return;

    if (!Store.getSession()) {
        showToast('Sign in to save boots to your wishlist');
        setTimeout(function () { window.location.href = 'account.html'; }, 900);
        return;
    }

    const result = await Store.toggleWishlist(productId);
    updateSharedUI();
    if (!result.ok) {
        showToast(result.error || 'Could not update your wishlist');
        return;
    }
    showToast(result.added ? product.name + ' saved to wishlist' : product.name + ' removed from wishlist');
}

// ==============================================================
// PRODUCT CARD
// ==============================================================
function ratingStars(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    let html = '';
    for (let i = 0; i < 5; i++) {
        if (i < full) html += '<i class="fas fa-star"></i>';
        else if (i === full && half) html += '<i class="fas fa-star-half-alt"></i>';
        else html += '<i class="far fa-star"></i>';
    }
    return html;
}

function createProductCardHTML(p) {
    const wishlisted = Store.isWishlisted(p.id);
    const badge = p.badge ? '<span class="product-card-badge">' + escapeHtml(p.badge) + '</span>' : '';
    const oldPrice = p.oldPrice && p.oldPrice > p.price
        ? '<span class="product-card-old-price">' + money(p.oldPrice) + '</span>'
        : '';
    const stockTag = Number(p.stock) <= 10 && Number(p.stock) > 0
        ? '<span class="product-card-stock">Only ' + p.stock + ' left</span>'
        : '';

    return [
        '<article class="product-card" data-id="' + p.id + '">',
        '<div class="product-card-image-box">',
        '<a href="product.html?id=' + p.id + '" class="product-card-image-link" aria-label="' + escapeHtml(p.name) + '">',
        '<img src="' + p.images[0] + '" alt="' + escapeHtml(p.name) + '" class="product-card-img" loading="lazy" />',
        '</a>',
        badge,
        '<button class="product-card-wishlist ' + (wishlisted ? 'active' : '') + '" data-id="' + p.id + '" aria-label="Save to wishlist">',
        '<i class="' + (wishlisted ? 'fas' : 'far') + ' fa-heart"></i>',
        '</button>',
        '<button class="product-card-quickview quick-view-trigger" data-id="' + p.id + '">Quick View</button>',
        '</div>',
        '<div class="product-card-info">',
        '<span class="product-card-category">' + escapeHtml(p.category) + ' Boots</span>',
        '<a href="product.html?id=' + p.id + '" class="product-card-title">' + escapeHtml(p.name) + '</a>',
        '<div class="product-card-price-row">',
        '<span class="product-card-price">' + money(p.price) + '</span>',
        oldPrice,
        '</div>',
        '<div class="product-card-meta-row">',
        '<span class="product-card-rating">' + ratingStars(p.rating) + ' <em>' + Number(p.rating).toFixed(1) + '</em></span>',
        stockTag,
        '</div>',
        '</div>',
        '</article>'
    ].join('');
}

// ==============================================================
// QUICK VIEW
// ==============================================================
function openQuickViewModal(productId) {
    const p = Store.getProduct(productId);
    if (!p) return;

    const sizeOptionsHtml = p.sizes.map(function (s) {
        return '<button class="size-option-btn modal-size-btn" data-size="' + s + '">' + s + '</button>';
    }).join('');

    const colorOptionsHtml = p.colors.map(function (c, idx) {
        return [
            '<button class="color-option-btn modal-color-btn ' + (idx === 0 ? 'active' : '') + '" data-color="' + c.hex + '" title="' + escapeHtml(c.name) + '" aria-label="' + escapeHtml(c.name) + '">',
            '<span class="color-option-inner" style="background-color:' + c.hex + ';"></span>',
            '</button>'
        ].join('');
    }).join('');

    const oldPrice = p.oldPrice && p.oldPrice > p.price
        ? '<span class="product-old-price">' + money(p.oldPrice) + '</span>'
        : '';

    const content = [
        '<button class="modal-close-btn" aria-label="Close"><i class="fas fa-times"></i></button>',
        '<div class="quickview-grid">',
        '<div class="quickview-img-side"><img src="' + p.images[0] + '" alt="' + escapeHtml(p.name) + '" /></div>',
        '<div class="quickview-info-side">',
        '<span class="product-card-category">' + escapeHtml(p.category) + ' Boots</span>',
        '<h2 class="product-title" style="font-size:1.7rem;">' + escapeHtml(p.name) + '</h2>',
        '<div class="product-price-row"><span class="product-price-editorial">' + money(p.price) + '</span>' + oldPrice + '</div>',
        '<p class="product-desc" style="font-size:0.88rem;">' + escapeHtml(p.description) + '</p>',
        '<div class="product-size-section">',
        '<div class="option-title-row"><span class="option-title">Size (UK)</span><button type="button" class="size-guide-link" data-size-guide>Size guide</button></div>',
        '<div class="size-selector-grid">' + sizeOptionsHtml + '</div>',
        '<div id="modalSizeError" class="validation-error-msg" style="display:none;">Please select a size</div>',
        '</div>',
        '<div class="product-color-section">',
        '<span class="option-title">Colour</span>',
        '<div class="color-selector-grid">' + colorOptionsHtml + '</div>',
        '</div>',
        '<div class="quantity-control-block">',
        '<span class="option-title">Quantity</span>',
        '<div class="quantity-selector">',
        '<button class="qty-adjust-btn" id="modalDecQty" aria-label="Decrease">-</button>',
        '<span class="qty-val-display" id="modalQtyVal">1</span>',
        '<button class="qty-adjust-btn" id="modalIncQty" aria-label="Increase">+</button>',
        '</div>',
        '</div>',
        '<div class="product-action-row" style="margin-top:0;">',
        '<button class="btn-primary product-add-to-cart" id="modalAddToCartBtn">Add to Bag</button>',
        '<button class="product-add-wishlist" id="modalWishlistBtn" aria-label="Save to wishlist"><i class="' + (Store.isWishlisted(p.id) ? 'fas' : 'far') + ' fa-heart"></i></button>',
        '</div>',
        '<a href="product.html?id=' + p.id + '" class="modal-details-link">View full details <i class="fas fa-arrow-right"></i></a>',
        '</div>',
        '</div>'
    ].join('');

    openModal(content);

    let selectedSize = '';
    let selectedColor = p.colors[0].hex;
    let quantity = 1;

    const sizeBtns = qsa('.modal-size-btn');
    const colorBtns = qsa('.modal-color-btn');
    const qtyVal = document.getElementById('modalQtyVal');
    const decBtn = document.getElementById('modalDecQty');
    const incBtn = document.getElementById('modalIncQty');
    const addBtn = document.getElementById('modalAddToCartBtn');
    const wishBtn = document.getElementById('modalWishlistBtn');

    sizeBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            sizeBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            selectedSize = btn.getAttribute('data-size');
            document.getElementById('modalSizeError').style.display = 'none';
        });
    });

    colorBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            colorBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            selectedColor = btn.getAttribute('data-color');
        });
    });

    if (decBtn) decBtn.addEventListener('click', function () {
        if (quantity > 1) { quantity--; qtyVal.textContent = quantity; }
    });
    if (incBtn) incBtn.addEventListener('click', function () {
        quantity++;
        qtyVal.textContent = quantity;
    });
    if (addBtn) addBtn.addEventListener('click', function () {
        if (!selectedSize) {
            document.getElementById('modalSizeError').style.display = 'block';
            return;
        }
        addToCart(p.id, quantity, selectedSize, selectedColor);
        closeModal();
        openCartDrawer();
    });
    if (wishBtn) wishBtn.addEventListener('click', function () {
        toggleWishlist(p.id);
        const active = Store.isWishlisted(p.id);
        wishBtn.classList.toggle('active', active);
        wishBtn.querySelector('i').className = (active ? 'fas' : 'far') + ' fa-heart';
    });
}

// ==============================================================
// NEWSLETTER
// ==============================================================
function initNewsletter() {
    qsa('.newsletter-form').forEach(function (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const input = form.querySelector('.newsletter-input');
            if (input && input.value.trim()) {
                showToast('Subscribed — welcome to the ATΛL community');
                input.value = '';
            }
        });
    });
}

// ==============================================================
// CONTACT FORM (about page)
// ==============================================================
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const success = document.getElementById('contactSuccess');

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = form.querySelector('#contactName');
        const email = form.querySelector('#contactEmail');
        const message = form.querySelector('#contactMessage');
        const fields = [name, email, message].filter(Boolean);

        let valid = true;
        fields.forEach(function (field) {
            const ok = field.value.trim().length > 0 &&
                (field.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim()));
            field.classList.toggle('input-error', !ok);
            if (!ok) valid = false;
        });

        if (!valid) {
            showToast('Please complete all fields with a valid email');
            return;
        }

        form.reset();
        fields.forEach(function (field) { field.classList.remove('input-error'); });
        if (success) {
            success.style.display = 'block';
            setTimeout(function () { success.style.display = 'none'; }, 6000);
        }
        showToast('Message sent — we will reply within one business day');
    });
}

// ==============================================================
// HOME PAGE
// ==============================================================
function initHeroSlider() {
    const slides = qsa('.hero-slide');
    const prevBtn = document.getElementById('heroPrevSlide');
    const nextBtn = document.getElementById('heroNextSlide');
    const indicator = document.getElementById('heroCurrentIndex');
    const progress = document.querySelector('.hero-page-progress');
    if (!slides.length) return;

    let current = 0;
    let timer = null;

    function show(index) {
        slides.forEach(function (s) { s.classList.remove('active'); });
        slides[index].classList.add('active');
        if (indicator) indicator.textContent = '0' + (index + 1);
        if (progress) progress.style.width = ((index + 1) / slides.length) * 100 + '%';
    }

    function go(step) {
        current = (current + step + slides.length) % slides.length;
        show(current);
        restart();
    }

    function restart() {
        if (timer) clearInterval(timer);
        timer = setInterval(function () {
            current = (current + 1) % slides.length;
            show(current);
        }, 6000);
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(1); });
    restart();
}

function renderHomeArrivals() {
    const grid = document.getElementById('homeNewArrivalsGrid');
    if (!grid) return;
    grid.innerHTML = products.slice(0, 8).map(createProductCardHTML).join('');
}

function renderCategoryCards() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;

    const meta = {
        Chelsea: { img: 'assets/img/cat-chelsea.png', tagline: 'The everyday icon' },
        Chukka: { img: 'assets/img/cat-chukka.png', tagline: 'Weekend ease' },
        Combat: { img: 'assets/img/cat-combat.png', tagline: 'Built to take a hit' },
        Formal: { img: 'assets/img/cat-formal.png', tagline: 'Dress sharp' },
        Hiking: { img: 'assets/img/cat-hiking.png', tagline: 'Off the grid' }
    };

    grid.innerHTML = Store.CATEGORIES.map(function (name) {
        const info = meta[name] || { img: 'assets/img/cat-chelsea.png', tagline: '' };
        const count = products.filter(function (p) { return p.category === name; }).length;
        return [
            '<a href="shop.html?category=' + name + '" class="category-card">',
            '<img src="' + info.img + '" alt="' + name + ' leather boots" class="category-card-img" />',
            '<div class="category-card-overlay">',
            '<span class="category-card-count">' + count + ' styles</span>',
            '<span class="category-card-name">' + name + '</span>',
            '<span class="category-card-link">' + escapeHtml(info.tagline) + ' &rarr;</span>',
            '</div>',
            '</a>'
        ].join('');
    }).join('');
}

// ==============================================================
// SHOP / CATALOG PAGE
// ==============================================================
function initShopPage() {
    const grid = document.getElementById('shopProductGrid');
    if (!grid) return;

    const searchInput = document.getElementById('shopSearchInput');
    const categoryBtns = qsa('.category-filter-btn');
    const sizeBtns = qsa('.size-filter-btn');
    const priceSlider = document.getElementById('shopPriceSlider');
    const priceVal = document.getElementById('shopPriceValue');
    const sortSelect = document.getElementById('shopSortSelect');
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const shopLayout = document.getElementById('shopLayoutContainer');
    const resultsCount = document.getElementById('shopResultsCount');
    const activeFiltersBox = document.getElementById('activeFilters');

    let filterCategory = 'All';
    let filterSizes = [];
    let filterPriceMax = priceSlider ? Number(priceSlider.value) : 20000;
    let searchQuery = '';
    let sortBy = 'featured';

    const params = new URLSearchParams(window.location.search);
    if (params.get('search')) {
        searchQuery = params.get('search');
        if (searchInput) searchInput.value = searchQuery;
    }
    if (params.get('category')) {
        filterCategory = params.get('category');
    }

    function syncCategoryButtons() {
        categoryBtns.forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-category') === filterCategory);
        });
    }

    function syncChips() {
        if (!activeFiltersBox) return;
        const chips = [];
        if (filterCategory !== 'All') chips.push({ type: 'category', label: filterCategory });
        filterSizes.forEach(function (s) { chips.push({ type: 'size', label: 'UK ' + s, value: s }); });
        if (searchQuery) chips.push({ type: 'search', label: '"' + searchQuery + '"' });
        if (filterPriceMax < 20000) chips.push({ type: 'price', label: 'Under ' + money(filterPriceMax) });

        if (!chips.length) {
            activeFiltersBox.innerHTML = '';
            activeFiltersBox.classList.remove('has-filters');
            return;
        }

        activeFiltersBox.classList.add('has-filters');
        activeFiltersBox.innerHTML = chips.map(function (chip) {
            return '<button class="filter-chip" data-chip="' + chip.type + '" data-value="' + escapeHtml(chip.value || '') + '">' +
                escapeHtml(chip.label) + ' <i class="fas fa-times"></i></button>';
        }).join('') + '<button class="filter-chip filter-chip-clear" data-chip="clear">Clear all</button>';
    }

    function render() {
        let list = products.filter(function (p) {
            const matchCategory = filterCategory === 'All' || p.category.toLowerCase() === filterCategory.toLowerCase();
            const matchPrice = Number(p.price) <= filterPriceMax;
            const matchSize = !filterSizes.length || filterSizes.some(function (s) {
                return (p.sizes || []).indexOf(s) > -1;
            });
            const haystack = (p.name + ' ' + p.category + ' ' + p.description + ' ' + p.material).toLowerCase();
            const matchSearch = !searchQuery || haystack.indexOf(searchQuery.toLowerCase()) > -1;
            return matchCategory && matchPrice && matchSize && matchSearch;
        });

        if (sortBy === 'price-low') list.sort(function (a, b) { return a.price - b.price; });
        else if (sortBy === 'price-high') list.sort(function (a, b) { return b.price - a.price; });
        else if (sortBy === 'rating') list.sort(function (a, b) { return b.rating - a.rating; });
        else if (sortBy === 'newest') list.sort(function (a, b) { return b.id - a.id; });

        if (resultsCount) {
            resultsCount.textContent = list.length + (list.length === 1 ? ' boot' : ' boots');
        }

        if (!list.length) {
            grid.innerHTML = [
                '<div class="shop-empty-state">',
                '<i class="fas fa-shoe-prints"></i>',
                '<p class="shop-empty-title">No boots match these filters</p>',
                '<p class="shop-empty-text">Try widening your price range or clearing a filter.</p>',
                '<button class="btn-secondary" data-chip="clear">Clear all filters</button>',
                '</div>'
            ].join('');
        } else {
            grid.innerHTML = list.map(createProductCardHTML).join('');
        }

        syncCategoryButtons();
        syncChips();
    }

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            searchQuery = searchInput.value.trim();
            render();
        });
    }

    categoryBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            filterCategory = btn.getAttribute('data-category');
            render();
        });
    });

    sizeBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            const size = btn.getAttribute('data-size');
            const index = filterSizes.indexOf(size);
            if (index > -1) filterSizes.splice(index, 1);
            else filterSizes.push(size);
            btn.classList.toggle('active', index === -1);
            render();
        });
    });

    if (priceSlider) {
        priceSlider.addEventListener('input', function () {
            filterPriceMax = Number(priceSlider.value);
            if (priceVal) priceVal.textContent = money(filterPriceMax);
            render();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', function () {
            sortBy = sortSelect.value;
            render();
        });
    }

    if (filterToggleBtn && shopLayout) {
        filterToggleBtn.addEventListener('click', function () {
            shopLayout.classList.toggle('filters-hidden');
            const hidden = shopLayout.classList.contains('filters-hidden');
            filterToggleBtn.innerHTML = hidden
                ? '<i class="fas fa-sliders-h"></i> Show Filters'
                : '<i class="fas fa-times"></i> Hide Filters';
        });

        // Phones start with the filter panel collapsed so the boots show first
        if (window.innerWidth <= 768) {
            shopLayout.classList.add('filters-hidden');
            filterToggleBtn.innerHTML = '<i class="fas fa-sliders-h"></i> Show Filters';
        }
    }

    // Clear filters via chips or empty state
    document.addEventListener('click', function (e) {
        const chip = e.target.closest('[data-chip]');
        if (!chip || !chip.closest('#activeFilters, #shopProductGrid, .shop-page-wrapper')) return;
        const type = chip.getAttribute('data-chip');
        const value = chip.getAttribute('data-value');

        if (type === 'clear') {
            filterCategory = 'All';
            filterSizes = [];
            searchQuery = '';
            filterPriceMax = 20000;
            if (searchInput) searchInput.value = '';
            if (priceSlider) priceSlider.value = 20000;
            if (priceVal) priceVal.textContent = money(20000);
            sizeBtns.forEach(function (b) { b.classList.remove('active'); });
        } else if (type === 'category') {
            filterCategory = 'All';
        } else if (type === 'size') {
            filterSizes = filterSizes.filter(function (s) { return s !== value; });
            sizeBtns.forEach(function (b) {
                if (b.getAttribute('data-size') === value) b.classList.remove('active');
            });
        } else if (type === 'search') {
            searchQuery = '';
            if (searchInput) searchInput.value = '';
        } else if (type === 'price') {
            filterPriceMax = 20000;
            if (priceSlider) priceSlider.value = 20000;
            if (priceVal) priceVal.textContent = money(20000);
        }
        render();
    });

    render();
}

// ==============================================================
// PRODUCT DETAIL PAGE
// ==============================================================
function initDetailsPage() {
    const container = document.getElementById('productDetailsContainer');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const productId = Number(params.get('id'));
    const p = Store.getProduct(productId);

    if (!p) {
        container.innerHTML = [
            '<div class="shop-empty-state">',
            '<i class="fas fa-shoe-prints"></i>',
            '<p class="shop-empty-title">We could not find that boot</p>',
            '<p class="shop-empty-text">It may have been removed from the collection.</p>',
            '<a class="btn-secondary" href="shop.html">Back to shop</a>',
            '</div>'
        ].join('');
        return;
    }

    document.title = p.name + ' — ATΛL Leather Boots';

    const sizeHtml = p.sizes.map(function (s) {
        return '<button class="size-option-btn detail-size-btn" data-size="' + s + '">' + s + '</button>';
    }).join('');

    const colorHtml = p.colors.map(function (c, idx) {
        return [
            '<button class="color-option-btn detail-color-btn ' + (idx === 0 ? 'active' : '') + '" data-color="' + c.hex + '" title="' + escapeHtml(c.name) + '" aria-label="' + escapeHtml(c.name) + '">',
            '<span class="color-option-inner" style="background-color:' + c.hex + ';"></span>',
            '</button>'
        ].join('');
    }).join('');

    const thumbsHtml = p.images.map(function (img, idx) {
        return '<div class="product-thumb ' + (idx === 0 ? 'active' : '') + '" data-index="' + idx + '"><img src="' + img + '" alt="' + escapeHtml(p.name) + ' view ' + (idx + 1) + '" /></div>';
    }).join('');

    const oldPriceHtml = p.oldPrice && p.oldPrice > p.price
        ? '<span class="product-old-price">' + money(p.oldPrice) + '</span><span class="product-save-tag">Save ' + money(p.oldPrice - p.price) + '</span>'
        : '';

    const related = products.filter(function (item) { return item.id !== p.id; }).slice(0, 4);

    container.innerHTML = [
        '<nav class="product-breadcrumbs" aria-label="Breadcrumb">',
        '<a href="index.html">Home</a> <span>/</span> <a href="shop.html">Shop</a> <span>/</span> <a href="shop.html?category=' + p.category + '">' + p.category + '</a> <span>/</span> <span class="text-muted">' + escapeHtml(p.name) + '</span>',
        '</nav>',
        '<div class="product-detail-grid">',
        '<div class="product-gallery-side">',
        '<div class="main-product-img-box"><img src="' + p.images[0] + '" alt="' + escapeHtml(p.name) + '" class="main-product-img" id="detailMainImg" /></div>',
        '<div class="product-thumbs-grid">' + thumbsHtml + '</div>',
        '</div>',
        '<div class="product-info-side">',
        '<span class="product-card-category">' + escapeHtml(p.category) + ' Boots</span>',
        '<h1 class="product-title">' + escapeHtml(p.name) + '</h1>',
        '<div class="product-rating-row">',
        '<span class="product-card-rating">' + ratingStars(p.rating) + '</span>',
        '<span class="product-rating-text">' + Number(p.rating).toFixed(1) + ' &middot; ' + p.reviews + ' reviews</span>',
        '<span class="product-stock-pill">' + (Number(p.stock) > 0 ? 'In stock' : 'Sold out') + '</span>',
        '</div>',
        '<div class="product-price-row"><span class="product-price-editorial">' + money(p.price) + '</span>' + oldPriceHtml + '</div>',
        '<p class="product-desc">' + escapeHtml(p.description) + '</p>',
        '<div class="product-spec-strip">',
        '<div><span>Material</span><strong>' + escapeHtml(p.material) + '</strong></div>',
        '<div><span>Sole</span><strong>' + escapeHtml(p.sole) + '</strong></div>',
        '</div>',
        '<div class="product-size-section">',
        '<div class="option-title-row"><span class="option-title">Select size (UK)</span><button type="button" class="size-guide-link" data-size-guide>Size guide</button></div>',
        '<div class="size-selector-grid">' + sizeHtml + '</div>',
        '<div id="detailSizeError" class="validation-error-msg" style="display:none;">Please select a size before adding to bag.</div>',
        '</div>',
        '<div class="product-color-section">',
        '<span class="option-title">Colour</span>',
        '<div class="color-selector-grid">' + colorHtml + '</div>',
        '</div>',
        '<div class="quantity-control-block">',
        '<span class="option-title">Quantity</span>',
        '<div class="quantity-selector">',
        '<button class="qty-adjust-btn" id="detailDecQty">-</button>',
        '<span class="qty-val-display" id="detailQtyVal">1</span>',
        '<button class="qty-adjust-btn" id="detailIncQty">+</button>',
        '</div>',
        '</div>',
        '<div class="product-action-row">',
        '<button class="btn-primary product-add-to-cart" id="detailAddToCartBtn">Add to Bag</button>',
        '<button class="product-add-wishlist ' + (Store.isWishlisted(p.id) ? 'active' : '') + '" id="detailWishlistBtn" aria-label="Save to wishlist"><i class="' + (Store.isWishlisted(p.id) ? 'fas' : 'far') + ' fa-heart"></i></button>',
        '</div>',
        '<ul class="product-trust-list">',
        '<li><i class="fas fa-truck-fast"></i> Free delivery on orders over ' + money(Store.FREE_SHIPPING) + '</li>',
        '<li><i class="fas fa-arrows-rotate"></i> 14-day easy exchange &amp; return</li>',
        '<li><i class="fas fa-money-bill-wave"></i> Cash on delivery available across Pakistan</li>',
        '</ul>',
        '<div class="product-accordion">',
        '<details open><summary>Fit &amp; sizing</summary><p>Runs true to size. If you wear a half size, we recommend sizing up. All boots are built on a UK last with a regular (G) fit.</p></details>',
        '<details><summary>Materials &amp; care</summary><p>' + escapeHtml(p.material) + '. Wipe with a soft dry cloth after wear, condition every 6-8 weeks and store with shoe trees away from direct heat.</p></details>',
        '<details><summary>Delivery &amp; returns</summary><p>Dispatched within 24 hours from our Karachi atelier. Delivery takes 2-4 working days nationwide. Unworn pairs can be exchanged within 14 days.</p></details>',
        '</div>',
        '</div>',
        '</div>',
        '<section class="related-products-section">',
        '<h2 class="section-title-editorial" style="font-size:1.5rem; margin-bottom:32px;">You may also like</h2>',
        '<div class="product-grid">' + related.map(createProductCardHTML).join('') + '</div>',
        '</section>'
    ].join('');

    let selectedSize = '';
    let selectedColor = p.colors[0].hex;
    let quantity = 1;

    const mainImg = document.getElementById('detailMainImg');
    const thumbs = qsa('.product-thumb');
    const sizeBtns = qsa('.detail-size-btn');
    const colorBtns = qsa('.detail-color-btn');
    const qtyVal = document.getElementById('detailQtyVal');

    thumbs.forEach(function (thumb) {
        thumb.addEventListener('click', function () {
            thumbs.forEach(function (t) { t.classList.remove('active'); });
            thumb.classList.add('active');
            mainImg.src = p.images[Number(thumb.getAttribute('data-index'))];
        });
    });

    sizeBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            sizeBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            selectedSize = btn.getAttribute('data-size');
            document.getElementById('detailSizeError').style.display = 'none';
        });
    });

    colorBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            colorBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            selectedColor = btn.getAttribute('data-color');
            const idx = p.colors.findIndex(function (c) { return c.hex === selectedColor; });
            if (idx > -1 && p.images[idx + 1]) {
                mainImg.src = p.images[idx + 1];
            }
        });
    });

    document.getElementById('detailDecQty').addEventListener('click', function () {
        if (quantity > 1) { quantity--; qtyVal.textContent = quantity; }
    });
    document.getElementById('detailIncQty').addEventListener('click', function () {
        if (quantity < 10) { quantity++; qtyVal.textContent = quantity; }
    });

    document.getElementById('detailAddToCartBtn').addEventListener('click', function () {
        if (!selectedSize) {
            document.getElementById('detailSizeError').style.display = 'block';
            return;
        }
        addToCart(p.id, quantity, selectedSize, selectedColor);
        openCartDrawer();
    });

    const wishBtn = document.getElementById('detailWishlistBtn');
    wishBtn.addEventListener('click', function () {
        toggleWishlist(p.id);
        const active = Store.isWishlisted(p.id);
        wishBtn.classList.toggle('active', active);
        wishBtn.querySelector('i').className = (active ? 'fas' : 'far') + ' fa-heart';
    });
}

// ==============================================================
// SIZE GUIDE
// ==============================================================
function openSizeGuideModal() {
    const rows = [
        ['6', '39', '24.5'],
        ['7', '40.5', '25.5'],
        ['8', '42', '26.5'],
        ['9', '43', '27.5'],
        ['10', '44.5', '28.5'],
        ['11', '46', '29.5'],
        ['12', '47', '30.5']
    ];
    const content = [
        '<button class="modal-close-btn" aria-label="Close"><i class="fas fa-times"></i></button>',
        '<div class="modal-sheet">',
        '<h2 class="checkout-title">Size guide</h2>',
        '<p class="checkout-subtitle">Measure your foot from heel to toe while standing. If you are between sizes, go up.</p>',
        '<table class="size-guide-table">',
        '<thead><tr><th>UK</th><th>EU</th><th>Foot length (cm)</th></tr></thead>',
        '<tbody>', rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join(''), '</tbody>',
        '</table>',
        '<p class="size-guide-note"><i class="fas fa-circle-info"></i> Need help? Email care@atal.com and our team will advise on fit.</p>',
        '</div>'
    ].join('');
    openModal(content, 'modal-content--compact');
}

// ==============================================================
// CHECKOUT
// ==============================================================
function openCheckoutModal() {
    const cart = Store.getCart();
    if (!cart.length) {
        showToast('Your bag is empty');
        return;
    }

    const totals = Store.cartTotals();
    const session = Store.getSession();
    const addresses = session ? Store.getAddresses(session.email) : [];

    const addressPicker = addresses.length ? [
        '<div class="form-field-wrapper">',
        '<label class="form-label" for="checkoutSavedAddress">Saved address</label>',
        '<select id="checkoutSavedAddress" class="form-input">',
        '<option value="">Enter a new address</option>',
        addresses.map(function (a) {
            return '<option value="' + a.id + '">' + escapeHtml(a.label) + ' — ' + escapeHtml(a.address) + ', ' + escapeHtml(a.city) + '</option>';
        }).join(''),
        '</select>',
        '</div>'
    ].join('') : '';

    const content = [
        '<button class="modal-close-btn" aria-label="Close"><i class="fas fa-times"></i></button>',
        '<div class="checkout-modal-content">',
        '<h2 class="checkout-title">Secure checkout</h2>',
        '<p class="checkout-subtitle">' + Store.cartCount() + ' item(s) &middot; Total ' + money(totals.total) + '</p>',
        '<form class="checkout-form" id="checkoutForm" novalidate>',
        addressPicker,
        '<div class="form-field-wrapper">',
        '<label class="form-label" for="checkoutName">Full name</label>',
        '<input type="text" id="checkoutName" class="form-input" value="' + escapeHtml(session ? session.name : '') + '" placeholder="e.g. Daniyal Khan" />',
        '<span id="nameError" class="form-error" style="display:none;"></span>',
        '</div>',
        '<div class="form-group-row">',
        '<div class="form-field-wrapper">',
        '<label class="form-label" for="checkoutEmail">Email address</label>',
        '<input type="email" id="checkoutEmail" class="form-input" value="' + escapeHtml(session ? session.email : '') + '" placeholder="name@domain.com" />',
        '<span id="emailError" class="form-error" style="display:none;"></span>',
        '</div>',
        '<div class="form-field-wrapper">',
        '<label class="form-label" for="checkoutPhone">Phone number</label>',
        '<input type="tel" id="checkoutPhone" class="form-input" value="' + escapeHtml(session ? (session.phone || '') : '') + '" placeholder="03001234567" />',
        '<span id="phoneError" class="form-error" style="display:none;"></span>',
        '</div>',
        '</div>',
        '<div class="form-field-wrapper">',
        '<label class="form-label" for="checkoutAddress">Delivery address</label>',
        '<input type="text" id="checkoutAddress" class="form-input" placeholder="House / street / area" />',
        '<span id="addressError" class="form-error" style="display:none;"></span>',
        '</div>',
        '<div class="form-group-row">',
        '<div class="form-field-wrapper">',
        '<label class="form-label" for="checkoutCity">City</label>',
        '<input type="text" id="checkoutCity" class="form-input" placeholder="Karachi / Lahore / Islamabad" />',
        '<span id="cityError" class="form-error" style="display:none;"></span>',
        '</div>',
        '<div class="form-field-wrapper">',
        '<label class="form-label" for="checkoutPostal">Postal code</label>',
        '<input type="text" id="checkoutPostal" class="form-input" placeholder="75500" />',
        '<span id="postalError" class="form-error" style="display:none;"></span>',
        '</div>',
        '</div>',
        '<div class="form-field-wrapper">',
        '<label class="form-label" for="checkoutNote">Order note (optional)</label>',
        '<input type="text" id="checkoutNote" class="form-input" placeholder="Delivery instructions, gift note..." />',
        '</div>',
        '<div>',
        '<span class="form-label">Payment method</span>',
        '<div class="payment-options-grid">',
        '<label class="payment-option-card active" id="payCOD"><input type="radio" name="paymentMethod" value="COD" class="payment-option-radio" checked /><span class="payment-option-label">Cash on delivery</span></label>',
        '<label class="payment-option-card" id="payCard"><input type="radio" name="paymentMethod" value="Card" class="payment-option-radio" /><span class="payment-option-label">Card payment</span></label>',
        '</div>',
        '</div>',
        '<div class="checkout-summary">',
        '<div class="cart-summary-row"><span>Subtotal</span><span>' + money(totals.subtotal) + '</span></div>',
        '<div class="cart-summary-row"><span>Shipping</span><span>' + (totals.shipping === 0 ? 'FREE' : money(totals.shipping)) + '</span></div>',
        '<div class="cart-summary-row total"><span>Total</span><span>' + money(totals.total) + '</span></div>',
        '</div>',
        '<button type="submit" class="btn-primary checkout-place-order-btn">Place order &bull; ' + money(totals.total) + '</button>',
        '<p class="checkout-note"><i class="fas fa-lock"></i> Your details are only used to deliver this order.</p>',
        '</form>',
        '</div>'
    ].join('');

    openModal(content);
    closeCartDrawer();

    const form = document.getElementById('checkoutForm');
    const savedSelect = document.getElementById('checkoutSavedAddress');

    if (savedSelect) {
        savedSelect.addEventListener('change', function () {
            const chosen = addresses.find(function (a) { return a.id === savedSelect.value; });
            if (!chosen) return;
            document.getElementById('checkoutName').value = chosen.name || '';
            document.getElementById('checkoutPhone').value = chosen.phone || '';
            document.getElementById('checkoutAddress').value = chosen.address || '';
            document.getElementById('checkoutCity').value = chosen.city || '';
            document.getElementById('checkoutPostal').value = chosen.postal || '';
        });
    }

    qsa('.payment-option-card').forEach(function (card) {
        card.addEventListener('click', function () {
            qsa('.payment-option-card').forEach(function (c) { c.classList.remove('active'); });
            card.classList.add('active');
        });
    });

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        let valid = true;

        function fail(fieldId, errorId, message, condition) {
            const field = document.getElementById(fieldId);
            const error = document.getElementById(errorId);
            if (!field || !error) return;
            if (condition) {
                error.textContent = message;
                error.style.display = 'block';
                valid = false;
            } else {
                error.style.display = 'none';
            }
        }

        const name = document.getElementById('checkoutName').value.trim();
        const email = document.getElementById('checkoutEmail').value.trim();
        const phone = document.getElementById('checkoutPhone').value.trim();
        const address = document.getElementById('checkoutAddress').value.trim();
        const city = document.getElementById('checkoutCity').value.trim();
        const postal = document.getElementById('checkoutPostal').value.trim();
        const note = document.getElementById('checkoutNote').value.trim();
        const payment = (document.querySelector('input[name="paymentMethod"]:checked') || {}).value || 'COD';

        fail('checkoutName', 'nameError', 'Please enter your full name.', name.length < 3);
        fail('checkoutEmail', 'emailError', 'Enter a valid email address.', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
        fail('checkoutPhone', 'phoneError', 'Enter a valid phone number.', phone.replace(/\D/g, '').length < 10);
        fail('checkoutAddress', 'addressError', 'Please enter a complete delivery address.', address.length < 8);
        fail('checkoutCity', 'cityError', 'Enter your city.', city.length < 3);
        fail('checkoutPostal', 'postalError', 'Enter a valid postal code.', postal.length < 4);

        if (!valid) return;

        const order = await Store.createOrder({
            userEmail: email,
            userName: name,
            phone: phone,
            address: address,
            city: city,
            postal: postal,
            note: note,
            items: cart,
            subtotal: totals.subtotal,
            shipping: totals.shipping,
            total: totals.total,
            payment: payment
        });

        if (!order) {
            showToast('We could not place your order. Please check your connection and try again.');
            return;
        }

        Store.clearCart();
        updateSharedUI();

        const accountLink = Store.getSession()
            ? '<a href="account.html" class="btn-secondary" style="margin-top:8px;">View my orders</a>'
            : '<a href="account.html" class="btn-link" style="margin-top:8px; font-size:0.75rem;">Create an account to track this order</a>';

        openModal([
            '<button class="modal-close-btn" aria-label="Close"><i class="fas fa-times"></i></button>',
            '<div class="success-modal-content">',
            '<i class="fas fa-check-circle success-icon"></i>',
            '<h2 class="success-title">Order confirmed</h2>',
            '<p class="success-text">Thank you, <strong>' + escapeHtml(name) + '</strong>. Your order <strong>' + order.id + '</strong> is placed. We will call you on ' + escapeHtml(phone) + ' to confirm delivery.</p>',
            '<div class="success-order-box">',
            '<div><span>Order</span><strong>' + order.id + '</strong></div>',
            '<div><span>Payment</span><strong>' + (payment === 'COD' ? 'Cash on delivery' : 'Card') + '</strong></div>',
            '<div><span>Total</span><strong>' + money(order.total) + '</strong></div>',
            '</div>',
            '<a href="shop.html" class="btn-primary">Continue shopping</a>',
            accountLink,
            '</div>'
        ].join(''));
    });
}

// ==============================================================
// GLOBAL CLICK DELEGATION
// ==============================================================
document.addEventListener('click', function (e) {
    const quickView = e.target.closest('.quick-view-trigger');
    if (quickView) {
        openQuickViewModal(Number(quickView.getAttribute('data-id')));
        return;
    }

    const wishlistBtn = e.target.closest('.product-card-wishlist');
    if (wishlistBtn) {
        e.preventDefault();
        toggleWishlist(Number(wishlistBtn.getAttribute('data-id')));
        return;
    }

    const sizeGuide = e.target.closest('[data-size-guide]');
    if (sizeGuide) {
        e.preventDefault();
        openSizeGuideModal();
        return;
    }

    if (e.target.id === 'cartCheckoutBtn' || e.target.closest('#cartCheckoutBtn')) {
        openCheckoutModal();
    }
});

