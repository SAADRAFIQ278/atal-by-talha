/* ==============================================================
   ATΛL — ADMIN DASHBOARD LOGIC
   Depends on store.js
   ============================================================== */
(function () {
    let panel = 'dashboard';
    let productQuery = '';
    let productCategory = 'All';
    let orderStatusFilter = 'All';
    let orderQuery = '';

    const TITLES = {
        dashboard: 'Dashboard',
        products: 'Products',
        orders: 'Orders',
        customers: 'Customers'
    };

    document.addEventListener('DOMContentLoaded', boot);

    async function boot() {
        await Store.ready();
        init();
    }

    function init() {
        const dateEl = document.getElementById('adminDate');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        }

        bindLogin();
        bindNav();
        bindLogout();
        bindAddProduct();

        if (Store.adminSession()) {
            showShell();
        } else {
            showGate();
        }
    }

    // ----------------------------------------------------------
    // AUTH
    // ----------------------------------------------------------
    function showGate() {
        document.getElementById('adminGate').hidden = false;
        document.getElementById('adminShell').hidden = true;
    }

    function showShell() {
        document.getElementById('adminGate').hidden = true;
        document.getElementById('adminShell').hidden = false;
        refresh();
    }

    function bindLogin() {
        const form = document.getElementById('adminLoginForm');
        if (!form) return;
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const result = await Store.adminLogin(
                document.getElementById('adminEmail').value,
                document.getElementById('adminPassword').value
            );
            const error = document.getElementById('adminLoginError');
            if (!result.ok) {
                error.textContent = result.error;
                error.hidden = false;
                return;
            }
            error.hidden = true;
            toast('Signed in as admin');
            showShell();
        });
    }

    function bindLogout() {
        const btn = document.getElementById('adminLogoutBtn');
        if (!btn) return;
        btn.addEventListener('click', async function () {
            await Store.adminLogout();
            showGate();
            toast('Signed out');
        });
    }

    function bindNav() {
        qsa('.admin-nav-item').forEach(function (item) {
            item.addEventListener('click', function () { activatePanel(item.getAttribute('data-apanel')); });
        });
    }

    function activatePanel(name) {
        if (!TITLES[name]) return;
        panel = name;
        qsa('.admin-nav-item').forEach(function (item) {
            item.classList.toggle('active', item.getAttribute('data-apanel') === name);
        });
        qsa('.admin-panel').forEach(function (el) {
            el.classList.toggle('active', el.id === 'apanel-' + name);
        });
        document.getElementById('adminTitle').textContent = TITLES[name];
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function bindAddProduct() {
        const btn = document.getElementById('adminAddProductBtn');
        if (btn) btn.addEventListener('click', function () { openProductForm(null); });
    }

    // ----------------------------------------------------------
    // SHARED HELPERS
    // ----------------------------------------------------------
    function qs(selector, scope) { return (scope || document).querySelector(selector); }
    function qsa(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }

    function money(value) { return Store.formatPKR(value); }

    function escapeHtml(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function toast(message) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'toast-msg';
        el.innerHTML = '<i class="fas fa-check"></i> <span>' + escapeHtml(message) + '</span>';
        container.appendChild(el);
        requestAnimationFrame(function () { el.classList.add('show'); });
        setTimeout(function () {
            el.classList.remove('show');
            setTimeout(function () { el.remove(); }, 350);
        }, 2800);
    }

    function openAdminModal(html, wide) {
        const modal = document.getElementById('adminModal');
        const box = document.getElementById('adminModalBox');
        box.className = 'admin-modal-box' + (wide ? ' admin-modal-box--wide' : '');
        box.innerHTML = html;
        modal.classList.add('open');
    }

    function closeAdminModal() {
        document.getElementById('adminModal').classList.remove('open');
    }

    function confirmDialog(title, text, onConfirm) {
        openAdminModal([
            '<div class="admin-modal-body">',
            '<h2 class="checkout-title">' + escapeHtml(title) + '</h2>',
            '<p class="checkout-subtitle">' + escapeHtml(text) + '</p>',
            '<div class="admin-modal-actions">',
            '<button class="btn-secondary" data-cancel-modal type="button">Cancel</button>',
            '<button class="btn-primary btn-danger" data-confirm-modal type="button">Confirm</button>',
            '</div>',
            '</div>'
        ].join(''));

        document.querySelector('[data-cancel-modal]').addEventListener('click', closeAdminModal);
        document.querySelector('[data-confirm-modal]').addEventListener('click', function () {
            closeAdminModal();
            onConfirm();
        });
    }

    // ----------------------------------------------------------
    // REFRESH ALL
    // ----------------------------------------------------------
    function refresh() {
        const products = Store.getProducts();
        const orders = Store.getOrders();

        document.getElementById('adminProductsBadge').textContent = products.length;
        document.getElementById('adminOrdersBadge').textContent = orders.length;

        renderDashboard(products, orders);
        renderProducts(products);
        renderOrders(orders, products);
        renderCustomers();
    }

    // ----------------------------------------------------------
    // DASHBOARD
    // ----------------------------------------------------------
    function renderDashboard(products, orders) {
        const target = document.getElementById('apanel-dashboard');
        if (!target) return;

        const live = orders.filter(function (o) { return o.status !== 'Cancelled'; });
        const revenue = live.reduce(function (total, o) { return total + Number(o.total || 0); }, 0);
        const avg = live.length ? Math.round(revenue / live.length) : 0;
        const users = Store.getUsers();
        const lowStock = products.filter(function (p) { return Number(p.stock) <= 10; });

        const statusCounts = Store.STATUSES.map(function (status) {
            return { status: status, count: orders.filter(function (o) { return o.status === status; }).length };
        });
        const maxStatus = Math.max.apply(null, statusCounts.map(function (s) { return s.count; }).concat([1]));

        const categoryTotals = {};
        orders.forEach(function (order) {
            if (order.status === 'Cancelled') return;
            (order.items || []).forEach(function (item) {
                const product = products.find(function (p) { return Number(p.id) === Number(item.id); });
                const category = product ? product.category : 'Other';
                categoryTotals[category] = (categoryTotals[category] || 0) + Number(item.price) * Number(item.qty);
            });
        });
        const categoryRows = Object.keys(categoryTotals).map(function (key) {
            return { category: key, value: categoryTotals[key] };
        }).sort(function (a, b) { return b.value - a.value; });
        const maxCategory = Math.max.apply(null, categoryRows.map(function (r) { return r.value; }).concat([1]));

        const recent = orders.slice(0, 5);

        target.innerHTML = [
            '<div class="stat-grid stat-grid--admin">',
            '<div class="stat-card"><span class="stat-icon"><i class="fas fa-sack-dollar"></i></span><div><strong>' + money(revenue) + '</strong><span>Revenue</span></div></div>',
            '<div class="stat-card"><span class="stat-icon"><i class="fas fa-receipt"></i></span><div><strong>' + orders.length + '</strong><span>Orders</span></div></div>',
            '<div class="stat-card"><span class="stat-icon"><i class="fas fa-chart-line"></i></span><div><strong>' + money(avg) + '</strong><span>Avg. order</span></div></div>',
            '<div class="stat-card"><span class="stat-icon"><i class="fas fa-shoe-prints"></i></span><div><strong>' + products.length + '</strong><span>Products</span></div></div>',
            '<div class="stat-card"><span class="stat-icon"><i class="fas fa-users"></i></span><div><strong>' + users.length + '</strong><span>Customers</span></div></div>',
            '</div>',

            '<div class="admin-two-col">',

            '<div class="admin-card">',
            '<div class="admin-card-head"><h2>Orders by status</h2><span class="admin-card-hint">All time</span></div>',
            statusCounts.map(function (row) {
                return [
                    '<div class="bar-row">',
                    '<span class="bar-label">' + row.status + '</span>',
                    '<div class="bar-track"><div class="bar-fill bar-fill--' + row.status.toLowerCase() + '" style="width:' + Math.max(4, (row.count / maxStatus) * 100) + '%"></div></div>',
                    '<span class="bar-value">' + row.count + '</span>',
                    '</div>'
                ].join('');
            }).join(''),
            '</div>',

            '<div class="admin-card">',
            '<div class="admin-card-head"><h2>Revenue by category</h2><span class="admin-card-hint">PKR</span></div>',
            categoryRows.length ? categoryRows.map(function (row) {
                return [
                    '<div class="bar-row">',
                    '<span class="bar-label">' + escapeHtml(row.category) + '</span>',
                    '<div class="bar-track"><div class="bar-fill" style="width:' + Math.max(4, (row.value / maxCategory) * 100) + '%"></div></div>',
                    '<span class="bar-value">' + money(row.value) + '</span>',
                    '</div>'
                ].join('');
            }).join('') : '<p class="dash-muted">No sales recorded yet.</p>',
            '</div>',

            '</div>',

            '<div class="admin-two-col">',

            '<div class="admin-card">',
            '<div class="admin-card-head"><h2>Recent orders</h2><button class="btn-link" data-goto-panel="orders" type="button">View all &rarr;</button></div>',
            recent.length ? recent.map(function (order) {
                return [
                    '<div class="mini-order">',
                    '<div class="mini-order-main">',
                    '<span class="order-id">' + order.id + '</span>',
                    '<span class="mini-order-items">' + escapeHtml(order.userName) + ' &middot; ' + formatDate(order.createdAt) + '</span>',
                    '</div>',
                    '<div class="mini-order-side">',
                    '<span class="status-badge status-' + order.status.toLowerCase() + '">' + order.status + '</span>',
                    '<strong>' + money(order.total) + '</strong>',
                    '</div>',
                    '</div>'
                ].join('');
            }).join('') : '<p class="dash-muted">No orders yet.</p>',
            '</div>',

            '<div class="admin-card">',
            '<div class="admin-card-head"><h2>Low stock</h2><button class="btn-link" data-goto-panel="products" type="button">Manage &rarr;</button></div>',
            lowStock.length ? lowStock.map(function (p) {
                return [
                    '<div class="low-stock-row">',
                    '<img src="' + p.images[0] + '" alt="' + escapeHtml(p.name) + '" />',
                    '<div class="low-stock-info"><strong>' + escapeHtml(p.name) + '</strong><span>' + escapeHtml(p.category) + '</span></div>',
                    '<span class="stock-pill ' + (Number(p.stock) === 0 ? 'stock-out' : '') + '">' + p.stock + ' left</span>',
                    '</div>'
                ].join('');
            }).join('') : '<p class="dash-muted">All products are well stocked.</p>',
            '</div>',

            '</div>'
        ].join('');

        qsa('[data-goto-panel]', target).forEach(function (btn) {
            btn.addEventListener('click', function () { activatePanel(btn.getAttribute('data-goto-panel')); });
        });
    }

    // ----------------------------------------------------------
    // PRODUCTS
    // ----------------------------------------------------------
    function renderProducts(products) {
        const target = document.getElementById('apanel-products');
        if (!target) return;

        const categories = ['All'].concat(Store.CATEGORIES);
        let list = products.filter(function (p) {
            const matchQuery = !productQuery || (p.name + ' ' + p.category).toLowerCase().indexOf(productQuery.toLowerCase()) > -1;
            const matchCategory = productCategory === 'All' || p.category === productCategory;
            return matchQuery && matchCategory;
        });

        target.innerHTML = [
            '<div class="admin-toolbar">',
            '<div class="admin-toolbar-left">',
            '<input type="search" id="adminProductSearch" class="form-input admin-search" placeholder="Search products..." value="' + escapeHtml(productQuery) + '" />',
            '<select id="adminProductCategory" class="form-input admin-select">',
            categories.map(function (c) { return '<option value="' + c + '"' + (productCategory === c ? ' selected' : '') + '>' + c + '</option>'; }).join(''),
            '</select>',
            '</div>',
            '<div class="admin-toolbar-right">',
            '<button class="btn-ghost-sm" id="resetCatalogueBtn" type="button"><i class="fas fa-rotate-left"></i> Reset catalogue</button>',
            '<button class="btn-primary btn-sm" id="adminProductAdd" type="button"><i class="fas fa-plus"></i> Add product</button>',
            '</div>',
            '</div>',
            '<div class="admin-card">',
            '<div class="table-scroll">',
            '<table class="admin-table">',
            '<thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th class="align-right">Actions</th></tr></thead>',
            '<tbody>',
            list.length ? list.map(function (p) {
                const status = Number(p.stock) === 0 ? 'Out of stock' : (Number(p.stock) <= 10 ? 'Low stock' : 'Active');
                const statusClass = Number(p.stock) === 0 ? 'status-cancelled' : (Number(p.stock) <= 10 ? 'status-processing' : 'status-delivered');
                return [
                    '<tr>',
                    '<td>',
                    '<div class="admin-product-cell">',
                    '<img src="' + p.images[0] + '" alt="' + escapeHtml(p.name) + '" />',
                    '<div><strong>' + escapeHtml(p.name) + '</strong><span>#' + p.id + ' &middot; ' + p.reviews + ' reviews</span></div>',
                    '</div>',
                    '</td>',
                    '<td>' + escapeHtml(p.category) + '</td>',
                    '<td>' + money(p.price) + '</td>',
                    '<td>' + p.stock + '</td>',
                    '<td><span class="status-badge ' + statusClass + '">' + status + '</span></td>',
                    '<td class="align-right">',
                    '<div class="row-actions">',
                    '<button class="icon-btn" data-edit-product="' + p.id + '" type="button" aria-label="Edit"><i class="fas fa-pen"></i></button>',
                    '<button class="icon-btn icon-btn--danger" data-delete-product="' + p.id + '" type="button" aria-label="Delete"><i class="fas fa-trash"></i></button>',
                    '</div>',
                    '</td>',
                    '</tr>'
                ].join('');
            }).join('') : '<tr><td colspan="6" class="admin-empty">No products match this filter.</td></tr>',
            '</tbody>',
            '</table>',
            '</div>',
            '</div>'
        ].join('');

        const search = document.getElementById('adminProductSearch');
        if (search) {
            search.addEventListener('input', function () {
                productQuery = search.value;
                renderProducts(Store.getProducts());
                const next = document.getElementById('adminProductSearch');
                if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
            });
        }

        const catSelect = document.getElementById('adminProductCategory');
        if (catSelect) {
            catSelect.addEventListener('change', function () {
                productCategory = catSelect.value;
                renderProducts(Store.getProducts());
            });
        }

        const addBtn = document.getElementById('adminProductAdd');
        if (addBtn) addBtn.addEventListener('click', function () { openProductForm(null); });

        const resetBtn = document.getElementById('resetCatalogueBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                confirmDialog('Reset catalogue?', 'This restores the original 12 leather boots and discards your product edits.', async function () {
                    const result = await Store.resetProducts();
                    toast(result.ok ? 'Catalogue restored' : (result.error || 'Could not reset catalogue'));
                    refresh();
                });
            });
        }

        qsa('[data-edit-product]', target).forEach(function (btn) {
            btn.addEventListener('click', function () {
                const product = Store.getProduct(Number(btn.getAttribute('data-edit-product')));
                openProductForm(product);
            });
        });

        qsa('[data-delete-product]', target).forEach(function (btn) {
            btn.addEventListener('click', function () {
                const id = Number(btn.getAttribute('data-delete-product'));
                const product = Store.getProduct(id);
                confirmDialog('Delete "' + product.name + '"?', 'This removes the boot from the storefront immediately.', async function () {
                    const result = await Store.deleteProduct(id);
                    toast(result.ok ? 'Product deleted' : (result.error || 'Could not delete product'));
                    refresh();
                });
            });
        });
    }

    function openProductForm(product) {
        const editing = !!product;
        const p = product || {
            name: '', category: 'Chelsea', price: '', oldPrice: '', stock: 10, badge: '', rating: 4.5,
            description: '', material: '', sole: '', sizes: ['6', '7', '8', '9', '10', '11', '12'],
            colors: [{ hex: '#6B4226', name: 'Brown' }], images: ['assets/img/cat-chelsea.png']
        };

        openAdminModal([
            '<div class="admin-modal-body">',
            '<div class="admin-modal-head">',
            '<h2 class="checkout-title">' + (editing ? 'Edit product' : 'New product') + '</h2>',
            '<button class="icon-btn" data-close-modal type="button" aria-label="Close"><i class="fas fa-times"></i></button>',
            '</div>',
            '<form class="checkout-form" id="productForm" novalidate>',
            '<div class="form-field-wrapper"><label class="form-label" for="pfName">Name</label><input type="text" id="pfName" class="form-input" value="' + escapeHtml(p.name) + '" placeholder="Ashford Chelsea" /></div>',
            '<div class="form-group-row">',
            '<div class="form-field-wrapper"><label class="form-label" for="pfCategory">Category</label><select id="pfCategory" class="form-input">' +
                Store.CATEGORIES.map(function (c) { return '<option value="' + c + '"' + (p.category === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
                '</select></div>',
            '<div class="form-field-wrapper"><label class="form-label" for="pfStock">Stock</label><input type="number" id="pfStock" class="form-input" value="' + escapeHtml(p.stock) + '" min="0" /></div>',
            '</div>',
            '<div class="form-group-row">',
            '<div class="form-field-wrapper"><label class="form-label" for="pfPrice">Price (PKR)</label><input type="number" id="pfPrice" class="form-input" value="' + escapeHtml(p.price) + '" min="0" placeholder="12499" /></div>',
            '<div class="form-field-wrapper"><label class="form-label" for="pfOldPrice">Compare-at price (optional)</label><input type="number" id="pfOldPrice" class="form-input" value="' + escapeHtml(p.oldPrice || '') + '" min="0" placeholder="14999" /></div>',
            '</div>',
            '<div class="form-group-row">',
            '<div class="form-field-wrapper"><label class="form-label" for="pfBadge">Badge (optional)</label><input type="text" id="pfBadge" class="form-input" value="' + escapeHtml(p.badge || '') + '" placeholder="New / Bestseller" /></div>',
            '<div class="form-field-wrapper"><label class="form-label" for="pfRating">Rating</label><input type="number" id="pfRating" class="form-input" value="' + escapeHtml(p.rating || 4.5) + '" min="0" max="5" step="0.1" /></div>',
            '</div>',
            '<div class="form-field-wrapper"><label class="form-label" for="pfImage">Main image path</label><input type="text" id="pfImage" class="form-input" value="' + escapeHtml(p.images[0]) + '" list="imageOptions" placeholder="assets/img/ashford-chelsea.png" /></div>',
            '<div class="form-field-wrapper"><label class="form-label" for="pfSizes">Sizes (comma separated)</label><input type="text" id="pfSizes" class="form-input" value="' + escapeHtml(p.sizes.join(', ')) + '" /></div>',
            '<div class="form-group-row">',
            '<div class="form-field-wrapper"><label class="form-label" for="pfMaterial">Material</label><input type="text" id="pfMaterial" class="form-input" value="' + escapeHtml(p.material || '') + '" placeholder="Full-grain leather" /></div>',
            '<div class="form-field-wrapper"><label class="form-label" for="pfSole">Sole</label><input type="text" id="pfSole" class="form-input" value="' + escapeHtml(p.sole || '') + '" placeholder="Rubber lug sole" /></div>',
            '</div>',
            '<div class="form-field-wrapper"><label class="form-label" for="pfDescription">Description</label><textarea id="pfDescription" class="form-input" rows="4">' + escapeHtml(p.description) + '</textarea></div>',
            '<div class="admin-modal-actions">',
            '<button class="btn-secondary" data-close-modal type="button">Cancel</button>',
            '<button class="btn-primary" type="submit">' + (editing ? 'Save changes' : 'Create product') + '</button>',
            '</div>',
            '</form>',
            '</div>'
        ].join(''), true);

        qsa('[data-close-modal]').forEach(function (btn) { btn.addEventListener('click', closeAdminModal); });

        document.getElementById('productForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const name = document.getElementById('pfName').value.trim();
            const price = Number(document.getElementById('pfPrice').value);
            const image = document.getElementById('pfImage').value.trim();
            const sizes = document.getElementById('pfSizes').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

            if (name.length < 3) { toast('Product name is too short'); return; }
            if (!price || price < 500) { toast('Enter a valid price in PKR'); return; }

            const payload = {
                id: editing ? p.id : undefined,
                name: name,
                category: document.getElementById('pfCategory').value,
                price: price,
                oldPrice: Number(document.getElementById('pfOldPrice').value) || 0,
                stock: Number(document.getElementById('pfStock').value) || 0,
                badge: document.getElementById('pfBadge').value.trim(),
                rating: Number(document.getElementById('pfRating').value) || 4.5,
                reviews: p.reviews || 0,
                description: document.getElementById('pfDescription').value.trim(),
                material: document.getElementById('pfMaterial').value.trim(),
                sole: document.getElementById('pfSole').value.trim(),
                sizes: sizes.length ? sizes : ['6', '7', '8', '9', '10', '11', '12'],
                colors: p.colors || [{ hex: '#6B4226', name: 'Chestnut Brown' }],
                images: [
                    image || 'assets/img/cat-chelsea.png',
                    'assets/img/detail-sole.png',
                    'assets/img/atelier-craft.png'
                ]
            };

            const result = await Store.upsertProduct(payload);
            if (!result.ok) {
                toast(result.error || 'Could not save product');
                return;
            }
            closeAdminModal();
            toast(editing ? 'Product updated' : 'Product created');
            refresh();
        });
    }

    // ----------------------------------------------------------
    // ORDERS
    // ----------------------------------------------------------
    function renderOrders(orders, products) {
        const target = document.getElementById('apanel-orders');
        if (!target) return;

        let list = orders.filter(function (o) {
            const matchStatus = orderStatusFilter === 'All' || o.status === orderStatusFilter;
            const haystack = (o.id + ' ' + o.userName + ' ' + o.userEmail + ' ' + o.city).toLowerCase();
            const matchQuery = !orderQuery || haystack.indexOf(orderQuery.toLowerCase()) > -1;
            return matchStatus && matchQuery;
        });

        target.innerHTML = [
            '<div class="admin-toolbar">',
            '<div class="admin-toolbar-left">',
            '<input type="search" id="adminOrderSearch" class="form-input admin-search" placeholder="Search order, customer, city..." value="' + escapeHtml(orderQuery) + '" />',
            '<select id="adminOrderStatus" class="form-input admin-select">',
            ['All'].concat(Store.STATUSES).map(function (s) { return '<option value="' + s + '"' + (orderStatusFilter === s ? ' selected' : '') + '>' + (s === 'All' ? 'All statuses' : s) + '</option>'; }).join(''),
            '</select>',
            '</div>',
            '<div class="admin-toolbar-right"><span class="admin-card-hint">' + list.length + ' orders</span></div>',
            '</div>',
            '<div class="admin-card">',
            '<div class="table-scroll">',
            '<table class="admin-table">',
            '<thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th class="align-right">View</th></tr></thead>',
            '<tbody>',
            list.length ? list.map(function (o) {
                const itemCount = (o.items || []).reduce(function (total, item) { return total + Number(item.qty || 0); }, 0);
                return [
                    '<tr>',
                    '<td><strong>' + o.id + '</strong></td>',
                    '<td><div class="admin-customer-cell"><strong>' + escapeHtml(o.userName) + '</strong><span>' + escapeHtml(o.userEmail) + '</span></div></td>',
                    '<td>' + formatDate(o.createdAt) + '</td>',
                    '<td>' + itemCount + '</td>',
                    '<td><strong>' + money(o.total) + '</strong></td>',
                    '<td>' + (o.payment === 'COD' ? 'COD' : 'Card') + '</td>',
                    '<td>',
                    '<select class="status-select status-select--' + o.status.toLowerCase() + '" data-order-status="' + o.id + '">',
                    Store.STATUSES.map(function (s) { return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join(''),
                    '</select>',
                    '</td>',
                    '<td class="align-right"><button class="icon-btn" data-view-order="' + o.id + '" type="button" aria-label="View order"><i class="fas fa-eye"></i></button></td>',
                    '</tr>'
                ].join('');
            }).join('') : '<tr><td colspan="8" class="admin-empty">No orders match this filter.</td></tr>',
            '</tbody>',
            '</table>',
            '</div>',
            '</div>'
        ].join('');

        const search = document.getElementById('adminOrderSearch');
        if (search) {
            search.addEventListener('input', function () {
                orderQuery = search.value;
                renderOrders(Store.getOrders(), Store.getProducts());
                const next = document.getElementById('adminOrderSearch');
                if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
            });
        }

        const statusSelect = document.getElementById('adminOrderStatus');
        if (statusSelect) {
            statusSelect.addEventListener('change', function () {
                orderStatusFilter = statusSelect.value;
                renderOrders(Store.getOrders(), Store.getProducts());
            });
        }

        qsa('[data-order-status]', target).forEach(function (select) {
            select.addEventListener('change', async function () {
                const id = select.getAttribute('data-order-status');
                const result = await Store.updateOrderStatus(id, select.value);
                toast(result.ok ? 'Order ' + id + ' marked ' + select.value : (result.error || 'Could not update order'));
                refresh();
            });
        });

        qsa('[data-view-order]', target).forEach(function (btn) {
            btn.addEventListener('click', function () {
                const order = Store.getOrders().find(function (o) { return o.id === btn.getAttribute('data-view-order'); });
                if (order) openOrderModal(order);
            });
        });
    }

    function openOrderModal(order) {
        openAdminModal([
            '<div class="admin-modal-body">',
            '<div class="admin-modal-head">',
            '<div><span class="section-eyebrow">Order</span><h2 class="checkout-title">' + order.id + '</h2></div>',
            '<button class="icon-btn" data-close-modal type="button" aria-label="Close"><i class="fas fa-times"></i></button>',
            '</div>',
            '<div class="order-detail-grid">',
            '<div><span class="detail-label">Customer</span><strong>' + escapeHtml(order.userName) + '</strong><span>' + escapeHtml(order.userEmail) + '</span></div>',
            '<div><span class="detail-label">Phone</span><strong>' + escapeHtml(order.phone) + '</strong></div>',
            '<div><span class="detail-label">Address</span><strong>' + escapeHtml(order.address) + '</strong><span>' + escapeHtml(order.city) + ' ' + escapeHtml(order.postal) + '</span></div>',
            '<div><span class="detail-label">Placed</span><strong>' + formatDate(order.createdAt) + '</strong></div>',
            '<div><span class="detail-label">Payment</span><strong>' + (order.payment === 'COD' ? 'Cash on delivery' : 'Card') + '</strong></div>',
            '<div><span class="detail-label">Status</span><span class="status-badge status-' + order.status.toLowerCase() + '">' + order.status + '</span></div>',
            '</div>',
            (order.note ? '<p class="order-note"><i class="fas fa-note-sticky"></i> ' + escapeHtml(order.note) + '</p>' : ''),
            '<div class="order-detail-items">',
            (order.items || []).map(function (item) {
                return [
                    '<div class="order-line">',
                    '<img src="' + item.image + '" alt="' + escapeHtml(item.name) + '" />',
                    '<div class="order-line-info"><span class="order-line-name">' + escapeHtml(item.name) + '</span><span class="order-line-meta">UK ' + escapeHtml(item.size) + ' &middot; ' + escapeHtml(item.color) + ' &middot; Qty ' + item.qty + '</span></div>',
                    '<span class="order-line-price">' + money(item.price * item.qty) + '</span>',
                    '</div>'
                ].join('');
            }).join(''),
            '</div>',
            '<div class="order-detail-totals">',
            '<div class="cart-summary-row"><span>Subtotal</span><span>' + money(order.subtotal) + '</span></div>',
            '<div class="cart-summary-row"><span>Shipping</span><span>' + (Number(order.shipping) === 0 ? 'FREE' : money(order.shipping)) + '</span></div>',
            '<div class="cart-summary-row total"><span>Total</span><span>' + money(order.total) + '</span></div>',
            '</div>',
            '<div class="admin-modal-actions">',
            '<button class="btn-secondary" data-close-modal type="button">Close</button>',
            '</div>',
            '</div>'
        ].join(''), true);

        qsa('[data-close-modal]').forEach(function (btn) { btn.addEventListener('click', closeAdminModal); });
    }

    // ----------------------------------------------------------
    // CUSTOMERS
    // ----------------------------------------------------------
    function renderCustomers() {
        const target = document.getElementById('apanel-customers');
        if (!target) return;

        const users = Store.getUsers();
        const orders = Store.getOrders();

        const rows = users.map(function (user) {
            const own = orders.filter(function (o) { return String(o.userEmail).toLowerCase() === user.email.toLowerCase(); });
            const spend = own.filter(function (o) { return o.status !== 'Cancelled'; })
                .reduce(function (total, o) { return total + Number(o.total || 0); }, 0);
            return { user: user, orders: own.length, spend: spend };
        }).sort(function (a, b) { return b.spend - a.spend; });

        target.innerHTML = [
            '<div class="admin-card">',
            '<div class="admin-card-head"><h2>Customers</h2><span class="admin-card-hint">' + users.length + ' registered</span></div>',
            '<div class="table-scroll">',
            '<table class="admin-table">',
            '<thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Lifetime spend</th><th>Joined</th></tr></thead>',
            '<tbody>',
            rows.length ? rows.map(function (row) {
                return [
                    '<tr>',
                    '<td><div class="admin-customer-cell"><strong>' + escapeHtml(row.user.name) + '</strong><span>' + escapeHtml(row.user.email) + '</span></div></td>',
                    '<td>' + escapeHtml(row.user.phone || '—') + '</td>',
                    '<td>' + row.orders + '</td>',
                    '<td><strong>' + money(row.spend) + '</strong></td>',
                    '<td>' + formatDate(row.user.createdAt) + '</td>',
                    '</tr>'
                ].join('');
            }).join('') : '<tr><td colspan="5" class="admin-empty">No customers yet.</td></tr>',
            '</tbody>',
            '</table>',
            '</div>',
            '</div>'
        ].join('');
    }

    // Close modal on backdrop click / Escape
    document.addEventListener('click', function (e) {
        const modal = document.getElementById('adminModal');
        if (!modal) return;
        if (e.target === modal) closeAdminModal();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAdminModal();
    });
})();
