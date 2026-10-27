/* ==============================================================
   ATΛL — USER DASHBOARD LOGIC
   Depends on store.js and script.js
   ============================================================== */
(function () {
    let session = null;
    let panel = 'overview';

    const PANEL_TITLES = {
        overview: 'Overview',
        orders: 'My Orders',
        wishlist: 'Wishlist',
        addresses: 'Saved Addresses',
        profile: 'Profile & Security'
    };

    document.addEventListener('DOMContentLoaded', boot);

    async function boot() {
        await Store.ready();
        session = Store.getSession();
        init();
    }

    function init() {
        bindAuth();
        bindNavigation();
        bindLogout();

        if (session) {
            showDashboard();
        } else {
            showAuth();
        }
    }

    // ----------------------------------------------------------
    // AUTH SCREEN
    // ----------------------------------------------------------
    function showAuth() {
        const auth = document.getElementById('authScreen');
        const shell = document.getElementById('dashShell');
        if (auth) auth.hidden = false;
        if (shell) shell.hidden = true;
        document.title = 'Sign in — ATΛL';
    }

    function showDashboard() {
        const auth = document.getElementById('authScreen');
        const shell = document.getElementById('dashShell');
        if (auth) auth.hidden = true;
        if (shell) shell.hidden = false;

        const name = session.name || 'Customer';
        document.getElementById('dashUserName').textContent = name;
        document.getElementById('dashUserEmail').textContent = session.email;
        document.getElementById('dashAvatar').textContent = name.charAt(0).toUpperCase();

        const since = session.createdAt
            ? new Date(session.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
            : '—';
        document.getElementById('memberSince').textContent = 'Member since ' + since;

        renderAll();

        const hash = (window.location.hash || '').replace('#', '');
        if (hash && PANEL_TITLES[hash]) activatePanel(hash);
    }

    function bindAuth() {
        const tabs = qsa('.auth-tab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const errorBox = document.getElementById('authError');

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                const target = tab.getAttribute('data-auth-tab');
                tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
                if (loginForm) loginForm.hidden = target !== 'login';
                if (registerForm) registerForm.hidden = target !== 'register';
                if (errorBox) errorBox.hidden = true;
            });
        });

        if (loginForm) {
            loginForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                const result = await Store.login(email, password);
                if (!result.ok) {
                    showAuthError(result.error);
                    return;
                }
                session = result.user;
                showToast('Welcome back, ' + session.name.split(' ')[0]);
                showDashboard();
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const result = await Store.register({
                    name: document.getElementById('regName').value,
                    email: document.getElementById('regEmail').value,
                    phone: document.getElementById('regPhone').value,
                    password: document.getElementById('regPassword').value
                });
                if (!result.ok) {
                    showAuthError(result.error);
                    return;
                }
                session = result.user;
                showToast('Account created — welcome to ATΛL');
                showDashboard();
            });
        }
    }

    function showAuthError(message) {
        const box = document.getElementById('authError');
        if (!box) return;
        box.textContent = message;
        box.hidden = false;
    }

    function bindLogout() {
        const btn = document.getElementById('logoutBtn');
        if (!btn) return;
        btn.addEventListener('click', async function () {
            await Store.logout();
            session = null;
            showToast('You have been signed out');
            showAuth();
        });
    }

    // ----------------------------------------------------------
    // NAVIGATION
    // ----------------------------------------------------------
    function bindNavigation() {
        qsa('.dash-nav-item').forEach(function (item) {
            item.addEventListener('click', function () {
                activatePanel(item.getAttribute('data-panel'));
            });
        });
    }

    function activatePanel(name) {
        if (!PANEL_TITLES[name]) return;
        panel = name;

        qsa('.dash-nav-item').forEach(function (item) {
            item.classList.toggle('active', item.getAttribute('data-panel') === name);
        });
        qsa('.dash-panel').forEach(function (el) {
            el.classList.toggle('active', el.id === 'panel-' + name);
        });
        const title = document.getElementById('dashTitle');
        if (title) title.textContent = PANEL_TITLES[name];

        if (window.location.hash !== '#' + name) {
            history.replaceState(null, '', '#' + name);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderAll() {
        if (!session) return;
        const orders = Store.getUserOrders(session.email);
        const wishlist = Store.getWishlist();

        const ordersBadge = document.getElementById('ordersNavBadge');
        const wishBadge = document.getElementById('wishlistNavBadge');
        if (ordersBadge) ordersBadge.textContent = orders.length;
        if (wishBadge) wishBadge.textContent = wishlist.length;

        renderOverview(orders);
        renderOrders(orders);
        renderWishlist();
        renderAddresses();
        renderProfile();
    }

    // ----------------------------------------------------------
    // HELPERS
    // ----------------------------------------------------------
    function formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function statusClass(status) {
        return 'status-' + String(status || '').toLowerCase();
    }

    function orderStats(orders) {
        const active = orders.filter(function (o) { return o.status === 'Processing' || o.status === 'Shipped'; });
        const spent = orders.filter(function (o) { return o.status !== 'Cancelled'; })
            .reduce(function (total, o) { return total + Number(o.total || 0); }, 0);
        return { active: active.length, spent: spent };
    }

    function emptyState(icon, title, text, actionHtml) {
        return [
            '<div class="dash-empty">',
            '<i class="fas ' + icon + '"></i>',
            '<h3>' + escapeHtml(title) + '</h3>',
            '<p>' + escapeHtml(text) + '</p>',
            actionHtml || '',
            '</div>'
        ].join('');
    }

    // ----------------------------------------------------------
    // OVERVIEW
    // ----------------------------------------------------------
    function renderOverview(orders) {
        const target = document.getElementById('panel-overview');
        if (!target) return;

        const stats = orderStats(orders);
        const wishlistCount = Store.getWishlist().length;
        const addressCount = Store.getAddresses(session.email).length;
        const recent = orders.slice(0, 2);

        target.innerHTML = [
            '<div class="stat-grid">',
            '<div class="stat-card"><span class="stat-icon"><i class="fas fa-box"></i></span><div><strong>' + orders.length + '</strong><span>Total orders</span></div></div>',
            '<div class="stat-card"><span class="stat-icon"><i class="fas fa-truck-fast"></i></span><div><strong>' + stats.active + '</strong><span>In progress</span></div></div>',
            '<div class="stat-card"><span class="stat-icon"><i class="fas fa-heart"></i></span><div><strong>' + wishlistCount + '</strong><span>Saved pairs</span></div></div>',
            '<div class="stat-card"><span class="stat-icon"><i class="fas fa-wallet"></i></span><div><strong>' + money(stats.spent) + '</strong><span>Lifetime spend</span></div></div>',
            '</div>',

            '<div class="dash-section-head">',
            '<h2>Recent orders</h2>',
            '<button class="btn-link" data-goto="orders" type="button">View all &rarr;</button>',
            '</div>',

            recent.length ? recent.map(function (order) {
                const items = (order.items || []).map(function (item) { return item.name; }).join(', ');
                return [
                    '<div class="mini-order">',
                    '<div class="mini-order-main">',
                    '<span class="order-id">' + order.id + '</span>',
                    '<span class="mini-order-items">' + escapeHtml(items) + '</span>',
                    '<span class="mini-order-date">' + formatDate(order.createdAt) + '</span>',
                    '</div>',
                    '<div class="mini-order-side">',
                    '<span class="status-badge ' + statusClass(order.status) + '">' + order.status + '</span>',
                    '<strong>' + money(order.total) + '</strong>',
                    '</div>',
                    '</div>'
                ].join('');
            }).join('') : '<p class="dash-muted">No orders yet — your first pair is waiting.</p>',

            '<div class="quick-actions">',
            '<a href="shop.html" class="quick-action"><i class="fas fa-store"></i><span>Shop all boots</span></a>',
            '<button class="quick-action" data-goto="wishlist" type="button"><i class="fas fa-heart"></i><span>View wishlist</span></button>',
            '<button class="quick-action" data-goto="addresses" type="button"><i class="fas fa-location-dot"></i><span>Manage addresses (' + addressCount + ')</span></button>',
            '<a href="about.html#size-guide" class="quick-action"><i class="fas fa-ruler-combined"></i><span>Size guide</span></a>',
            '</div>'
        ].join('');

        qsa('[data-goto]', target).forEach(function (btn) {
            btn.addEventListener('click', function () { activatePanel(btn.getAttribute('data-goto')); });
        });
    }

    // ----------------------------------------------------------
    // ORDERS
    // ----------------------------------------------------------
    function renderOrders(orders) {
        const target = document.getElementById('panel-orders');
        if (!target) return;

        if (!orders.length) {
            target.innerHTML = emptyState('fa-box-open', 'No orders yet', 'Once you place an order it will appear here with live status updates.', '<a href="shop.html" class="btn-primary" style="margin-top:20px;">Shop leather boots</a>');
            return;
        }

        const steps = ['Processing', 'Shipped', 'Delivered'];

        target.innerHTML = orders.map(function (order) {
            const itemsHtml = (order.items || []).map(function (item) {
                return [
                    '<div class="order-line">',
                    '<img src="' + item.image + '" alt="' + escapeHtml(item.name) + '" />',
                    '<div class="order-line-info">',
                    '<span class="order-line-name">' + escapeHtml(item.name) + '</span>',
                    '<span class="order-line-meta">UK ' + escapeHtml(item.size) + ' &middot; ' + escapeHtml(item.color) + ' &middot; Qty ' + item.qty + '</span>',
                    '</div>',
                    '<span class="order-line-price">' + money(item.price * item.qty) + '</span>',
                    '</div>'
                ].join('');
            }).join('');

            const currentStep = steps.indexOf(order.status);
            const timeline = order.status === 'Cancelled'
                ? '<span class="order-cancelled"><i class="fas fa-circle-xmark"></i> Order cancelled</span>'
                : steps.map(function (step, index) {
                    const state = index < currentStep ? 'done' : (index === currentStep ? 'current' : '');
                    return '<span class="timeline-step ' + state + '"><i class="fas ' + (index < currentStep ? 'fa-circle-check' : 'fa-circle') + '"></i> ' + step + '</span>';
                }).join('<span class="timeline-sep"></span>');

            const canCancel = order.status === 'Processing';
            const canReorder = order.status !== 'Processing';

            return [
                '<article class="order-card">',
                '<header class="order-card-head">',
                '<div>',
                '<span class="order-id">' + order.id + '</span>',
                '<span class="order-date">Placed ' + formatDate(order.createdAt) + '</span>',
                '</div>',
                '<div class="order-card-side">',
                '<span class="status-badge ' + statusClass(order.status) + '">' + order.status + '</span>',
                '<strong class="order-total">' + money(order.total) + '</strong>',
                '</div>',
                '</header>',
                '<div class="order-lines">' + itemsHtml + '</div>',
                '<div class="order-timeline">' + timeline + '</div>',
                '<footer class="order-card-foot">',
                '<div class="order-foot-meta">',
                '<span><i class="fas fa-credit-card"></i> ' + (order.payment === 'COD' ? 'Cash on delivery' : 'Card payment') + '</span>',
                '<span><i class="fas fa-location-dot"></i> ' + escapeHtml(order.city || '—') + '</span>',
                '</div>',
                '<div class="order-actions">',
                canCancel ? '<button class="btn-ghost-sm" data-cancel="' + order.id + '" type="button">Cancel order</button>' : '',
                canReorder ? '<button class="btn-ghost-sm" data-reorder="' + order.id + '" type="button">Reorder</button>' : '',
                '<a class="btn-ghost-sm btn-ghost-sm--primary" href="shop.html">Buy again</a>',
                '</div>',
                '</footer>',
                '</article>'
            ].join('');
        }).join('');

        qsa('[data-cancel]', target).forEach(function (btn) {
            btn.addEventListener('click', async function () {
                const result = await Store.updateOrderStatus(btn.getAttribute('data-cancel'), 'Cancelled');
                showToast(result.ok ? 'Order cancelled' : (result.error || 'Could not cancel this order'));
                renderAll();
            });
        });

        qsa('[data-reorder]', target).forEach(function (btn) {
            btn.addEventListener('click', function () {
                const order = Store.getOrders().find(function (o) { return o.id === btn.getAttribute('data-reorder'); });
                if (!order) return;
                (order.items || []).forEach(function (item) {
                    const product = Store.getProduct(item.id);
                    if (!product) return;
                    Store.addToCart({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        image: product.images[0],
                        size: item.size,
                        color: item.color,
                        qty: item.qty
                    });
                });
                updateSharedUI();
                showToast('Items added back to your bag');
                openCartDrawer();
            });
        });
    }

    // ----------------------------------------------------------
    // WISHLIST
    // ----------------------------------------------------------
    function renderWishlist() {
        const target = document.getElementById('panel-wishlist');
        if (!target) return;

        const ids = Store.getWishlist();
        const items = ids.map(function (id) { return Store.getProduct(id); }).filter(Boolean);

        if (!items.length) {
            target.innerHTML = emptyState('fa-heart', 'Your wishlist is empty', 'Tap the heart on any boot to save it here for later.', '<a href="shop.html" class="btn-primary" style="margin-top:20px;">Browse the collection</a>');
            return;
        }

        target.innerHTML = [
            '<div class="wishlist-grid">',
            items.map(function (p) {
                const sizes = (p.sizes || []).map(function (s) { return '<option value="' + s + '">UK ' + s + '</option>'; }).join('');
                return [
                    '<article class="wishlist-card">',
                    '<a href="product.html?id=' + p.id + '" class="wishlist-img"><img src="' + p.images[0] + '" alt="' + escapeHtml(p.name) + '" /></a>',
                    '<div class="wishlist-body">',
                    '<span class="product-card-category">' + escapeHtml(p.category) + ' Boots</span>',
                    '<a href="product.html?id=' + p.id + '" class="wishlist-name">' + escapeHtml(p.name) + '</a>',
                    '<span class="wishlist-price">' + money(p.price) + '</span>',
                    '<div class="wishlist-actions">',
                    '<select class="form-input wishlist-size" data-size-for="' + p.id + '" aria-label="Select size">' + sizes + '</select>',
                    '<button class="btn-primary wishlist-add" data-add="' + p.id + '" type="button">Add</button>',
                    '</div>',
                    '<button class="wishlist-remove" data-remove="' + p.id + '" type="button"><i class="fas fa-trash-alt"></i> Remove</button>',
                    '</div>',
                    '</article>'
                ].join('');
            }).join(''),
            '</div>'
        ].join('');

        qsa('[data-add]', target).forEach(function (btn) {
            btn.addEventListener('click', function () {
                const id = Number(btn.getAttribute('data-add'));
                const select = target.querySelector('[data-size-for="' + id + '"]');
                const product = Store.getProduct(id);
                if (!product) return;
                addToCart(id, 1, select.value, product.colors[0].hex);
                renderAll();
            });
        });

        qsa('[data-remove]', target).forEach(function (btn) {
            btn.addEventListener('click', async function () {
                const result = await Store.toggleWishlist(Number(btn.getAttribute('data-remove')));
                updateSharedUI();
                renderAll();
                showToast(result.ok ? 'Removed from wishlist' : (result.error || 'Could not update wishlist'));
            });
        });
    }

    // ----------------------------------------------------------
    // ADDRESSES
    // ----------------------------------------------------------
    function renderAddresses() {
        const target = document.getElementById('panel-addresses');
        if (!target) return;

        const addresses = Store.getAddresses(session.email);

        target.innerHTML = [
            '<div class="dash-section-head">',
            '<h2>Delivery addresses</h2>',
            '<button class="btn-secondary btn-sm" id="addAddressBtn" type="button"><i class="fas fa-plus"></i> Add address</button>',
            '</div>',
            addresses.length ? [
                '<div class="address-grid">',
                addresses.map(function (a) {
                    return [
                        '<article class="address-card ' + (a.isDefault ? 'is-default' : '') + '">',
                        '<div class="address-head">',
                        '<span class="address-label">' + escapeHtml(a.label || 'Address') + '</span>',
                        a.isDefault ? '<span class="address-default-tag">Default</span>' : '',
                        '</div>',
                        '<p class="address-name">' + escapeHtml(a.name) + '</p>',
                        '<p class="address-text">' + escapeHtml(a.address) + '<br>' + escapeHtml(a.city) + ' ' + escapeHtml(a.postal) + '</p>',
                        '<p class="address-phone"><i class="fas fa-phone"></i> ' + escapeHtml(a.phone) + '</p>',
                        '<div class="address-actions">',
                        '<button class="btn-ghost-sm" data-edit-address="' + a.id + '" type="button">Edit</button>',
                        a.isDefault ? '' : '<button class="btn-ghost-sm" data-default-address="' + a.id + '" type="button">Set default</button>',
                        '<button class="btn-ghost-sm btn-ghost-sm--danger" data-delete-address="' + a.id + '" type="button">Delete</button>',
                        '</div>',
                        '</article>'
                    ].join('');
                }).join(''),
                '</div>'
            ].join('') : emptyState('fa-location-dot', 'No saved addresses', 'Add an address to check out faster next time.')
        ].join('');

        const addBtn = document.getElementById('addAddressBtn');
        if (addBtn) addBtn.addEventListener('click', function () { openAddressForm(); });

        qsa('[data-edit-address]', target).forEach(function (btn) {
            btn.addEventListener('click', function () {
                const address = addresses.find(function (a) { return a.id === btn.getAttribute('data-edit-address'); });
                openAddressForm(address);
            });
        });

        qsa('[data-default-address]', target).forEach(function (btn) {
            btn.addEventListener('click', async function () {
                const address = addresses.find(function (a) { return a.id === btn.getAttribute('data-default-address'); });
                if (!address) return;
                const result = await Store.saveAddress(session.email, Object.assign({}, address, { isDefault: true }));
                renderAddresses();
                showToast(result.ok ? 'Default address updated' : (result.error || 'Could not update address'));
            });
        });

        qsa('[data-delete-address]', target).forEach(function (btn) {
            btn.addEventListener('click', async function () {
                const result = await Store.deleteAddress(session.email, btn.getAttribute('data-delete-address'));
                renderAddresses();
                showToast(result.ok ? 'Address removed' : (result.error || 'Could not remove address'));
            });
        });
    }

    function openAddressForm(address) {
        const editing = !!address;
        const data = address || { label: 'Home', name: session.name, phone: session.phone || '', address: '', city: '', postal: '', isDefault: false };

        openModal([
            '<button class="modal-close-btn" aria-label="Close"><i class="fas fa-times"></i></button>',
            '<div class="modal-sheet">',
            '<h2 class="checkout-title">' + (editing ? 'Edit address' : 'New address') + '</h2>',
            '<p class="checkout-subtitle">Where should we deliver your boots?</p>',
            '<form class="checkout-form" id="addressForm" novalidate>',
            '<div class="form-group-row">',
            '<div class="form-field-wrapper"><label class="form-label" for="addrLabel">Label</label><input type="text" id="addrLabel" class="form-input" value="' + escapeHtml(data.label) + '" placeholder="Home / Office" /></div>',
            '<div class="form-field-wrapper"><label class="form-label" for="addrName">Recipient</label><input type="text" id="addrName" class="form-input" value="' + escapeHtml(data.name) + '" /></div>',
            '</div>',
            '<div class="form-field-wrapper"><label class="form-label" for="addrPhone">Phone</label><input type="tel" id="addrPhone" class="form-input" value="' + escapeHtml(data.phone) + '" placeholder="03001234567" /></div>',
            '<div class="form-field-wrapper"><label class="form-label" for="addrLine">Street address</label><input type="text" id="addrLine" class="form-input" value="' + escapeHtml(data.address) + '" placeholder="House / street / area" /></div>',
            '<div class="form-group-row">',
            '<div class="form-field-wrapper"><label class="form-label" for="addrCity">City</label><input type="text" id="addrCity" class="form-input" value="' + escapeHtml(data.city) + '" /></div>',
            '<div class="form-field-wrapper"><label class="form-label" for="addrPostal">Postal code</label><input type="text" id="addrPostal" class="form-input" value="' + escapeHtml(data.postal) + '" /></div>',
            '</div>',
            '<label class="checkbox-row"><input type="checkbox" id="addrDefault" ' + (data.isDefault ? 'checked' : '') + ' /> Set as default delivery address</label>',
            '<button type="submit" class="btn-primary" style="width:100%;">' + (editing ? 'Save changes' : 'Add address') + '</button>',
            '</form>',
            '</div>'
        ].join(''), 'modal-content--compact');

        document.getElementById('addressForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const payload = {
                id: address ? address.id : '',
                label: document.getElementById('addrLabel').value.trim() || 'Address',
                name: document.getElementById('addrName').value.trim(),
                phone: document.getElementById('addrPhone').value.trim(),
                address: document.getElementById('addrLine').value.trim(),
                city: document.getElementById('addrCity').value.trim(),
                postal: document.getElementById('addrPostal').value.trim(),
                isDefault: document.getElementById('addrDefault').checked
            };
            if (!payload.name || !payload.phone || !payload.address || !payload.city) {
                showToast('Please fill in name, phone, address and city');
                return;
            }
            const result = await Store.saveAddress(session.email, payload);
            closeModal();
            renderAddresses();
            showToast(result.ok ? (editing ? 'Address updated' : 'Address added') : (result.error || 'Could not save address'));
        });
    }

    // ----------------------------------------------------------
    // PROFILE
    // ----------------------------------------------------------
    function renderProfile() {
        const target = document.getElementById('panel-profile');
        if (!target) return;

        target.innerHTML = [
            '<div class="profile-grid">',
            '<form class="dash-form" id="profileForm">',
            '<h2>Account details</h2>',
            '<p class="dash-muted">Used on invoices and delivery updates.</p>',
            '<div class="form-field-wrapper"><label class="form-label" for="profileName">Full name</label><input type="text" id="profileName" class="form-input" value="' + escapeHtml(session.name) + '" /></div>',
            '<div class="form-field-wrapper"><label class="form-label" for="profileEmail">Email</label><input type="email" id="profileEmail" class="form-input" value="' + escapeHtml(session.email) + '" readonly /></div>',
            '<div class="form-field-wrapper"><label class="form-label" for="profilePhone">Phone</label><input type="tel" id="profilePhone" class="form-input" value="' + escapeHtml(session.phone || '') + '" /></div>',
            '<button type="submit" class="btn-primary" style="width:100%;">Save changes</button>',
            '</form>',

            '<form class="dash-form" id="passwordForm">',
            '<h2>Password</h2>',
            '<p class="dash-muted">Use at least 6 characters.</p>',
            '<div class="form-field-wrapper"><label class="form-label" for="currentPassword">Current password</label><input type="password" id="currentPassword" class="form-input" placeholder="••••••" /></div>',
            '<div class="form-field-wrapper"><label class="form-label" for="newPassword">New password</label><input type="password" id="newPassword" class="form-input" placeholder="••••••" /></div>',
            '<button type="submit" class="btn-secondary" style="width:100%;">Update password</button>',
            '</form>',
            '</div>'
        ].join('');

        document.getElementById('profileForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const result = await Store.updateProfile({
                name: document.getElementById('profileName').value,
                email: document.getElementById('profileEmail').value,
                phone: document.getElementById('profilePhone').value
            });
            if (!result.ok) {
                showToast(result.error);
                return;
            }
            session = result.user;
            showDashboard();
            showToast('Profile updated');
        });

        document.getElementById('passwordForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const result = await Store.changePassword(
                document.getElementById('currentPassword').value,
                document.getElementById('newPassword').value
            );
            showToast(result.ok ? 'Password updated' : result.error);
            if (result.ok) e.target.reset();
        });
    }
})();
