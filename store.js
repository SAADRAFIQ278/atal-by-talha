/* ==============================================================
   ATΛL — STORE LAYER (SUPABASE BACKED)
   Products, accounts, orders, wishlist and addresses live in
   Supabase Postgres. The cart stays on the device so guests can
   shop before signing in.

   Reads are synchronous (served from an in-memory cache filled by
   Store.ready()). Writes are async and return { ok, error }.
   ============================================================== */

// --------------------------------------------------------------
// FALLBACK CATALOGUE — used only when Supabase is unreachable
// so the storefront is never empty.
// --------------------------------------------------------------
const ATAL_DEFAULT_PRODUCTS = [
    { id: 1, name: 'Ashford Chelsea', category: 'Chelsea', price: 12499, oldPrice: 14999, badge: 'Bestseller', rating: 4.9, reviews: 128, stock: 24, material: 'Full-grain oiled leather', sole: 'Natural rubber sole', description: 'Our signature Chelsea silhouette, cut from full-grain oiled leather that softens and darkens beautifully with wear.', sizes: ['6', '7', '8', '9', '10', '11', '12'], colors: [{ hex: '#6B4226', name: 'Chestnut Brown' }, { hex: '#1C1A19', name: 'Core Black' }], images: ['assets/img/ashford-chelsea.png', 'assets/img/cat-chelsea.png', 'assets/img/detail-sole.png', 'assets/img/atelier-craft.png'] },
    { id: 2, name: 'Vantage Chelsea', category: 'Chelsea', price: 13299, oldPrice: 0, badge: '', rating: 4.8, reviews: 96, stock: 18, material: 'Polished calf leather', sole: 'Leather stacked sole', description: 'A sharper take on the Chelsea boot with polished calf leather, a slim almond toe and a stacked leather sole.', sizes: ['6', '7', '8', '9', '10', '11', '12'], colors: [{ hex: '#141414', name: 'Polished Black' }, { hex: '#3B2A1E', name: 'Espresso' }], images: ['assets/img/vantage-chelsea.png', 'assets/img/cat-chelsea.png', 'assets/img/detail-sole.png', 'assets/img/atelier-craft.png'] },
    { id: 3, name: 'Metro Zip Boot', category: 'Chelsea', price: 11299, oldPrice: 12999, badge: 'Popular', rating: 4.6, reviews: 61, stock: 30, material: 'Soft tumbled leather', sole: 'Lightweight blown rubber', description: 'Built for long days on your feet. A hidden side zip, padded collar and featherweight sole.', sizes: ['6', '7', '8', '9', '10', '11', '12'], colors: [{ hex: '#4A3323', name: 'Dark Brown' }, { hex: '#1C1A19', name: 'Core Black' }], images: ['assets/img/metro-zip.png', 'assets/img/cat-chelsea.png', 'assets/img/detail-sole.png', 'assets/img/atelier-craft.png'] },
    { id: 4, name: 'Ridgeway Chukka', category: 'Chukka', price: 11899, oldPrice: 0, badge: '', rating: 4.7, reviews: 74, stock: 22, material: 'Water-resistant suede', sole: 'Crepe rubber sole', description: 'Two eyelets, one clean line. Water-resistant Italian suede over a cushioning crepe sole.', sizes: ['6', '7', '8', '9', '10', '11', '12'], colors: [{ hex: '#A9744B', name: 'Tan Suede' }, { hex: '#5A4632', name: 'Bitter Chocolate' }], images: ['assets/img/ridgeway-chukka.png', 'assets/img/cat-chukka.png', 'assets/img/detail-sole.png', 'assets/img/atelier-craft.png'] },
    { id: 5, name: 'Sandstone Chukka', category: 'Chukka', price: 12199, oldPrice: 0, badge: '', rating: 4.5, reviews: 42, stock: 15, material: 'Brushed sand suede', sole: 'Stitched leather sole', description: 'A warm-weather chukka with a full leather lining and an unlined suede upper that breathes.', sizes: ['6', '7', '8', '9', '10', '11', '12'], colors: [{ hex: '#C2B29F', name: 'Sand' }, { hex: '#8A6E52', name: 'Camel' }], images: ['assets/img/sandstone-chukka.png', 'assets/img/cat-chukka.png', 'assets/img/detail-sole.png', 'assets/img/atelier-craft.png'] },
    { id: 6, name: 'Ironclad Combat', category: 'Combat', price: 15999, oldPrice: 18499, badge: 'New', rating: 4.9, reviews: 87, stock: 20, material: 'Heavy waxed leather', sole: 'Vibram lug outsole', description: 'Serious hardware, refined shape. Heavy waxed leather, antique metal eyelets and a deep lug outsole.', sizes: ['6', '7', '8', '9', '10', '11', '12'], colors: [{ hex: '#141414', name: 'Waxed Black' }, { hex: '#4A3A2C', name: 'Black Coffee' }], images: ['assets/img/ironclad-combat.png', 'assets/img/cat-combat.png', 'assets/img/detail-sole.png', 'assets/img/atelier-craft.png'] },
    { id: 7, name: 'Sierra Tactical', category: 'Combat', price: 14499, oldPrice: 0, badge: '', rating: 4.6, reviews: 53, stock: 12, material: 'Oiled nubuck leather', sole: 'Grippy lug outsole', description: 'A field-ready boot with speed-lace hooks, a reinforced toe bumper and an oiled nubuck upper.', sizes: ['6', '7', '8', '9', '10', '11', '12'], colors: [{ hex: '#5B5A43', name: 'Olive Drab' }, { hex: '#3B2F26', name: 'Mud Brown' }], images: ['assets/img/sierra-tactical.png', 'assets/img/cat-combat.png', 'assets/img/detail-sole.png', 'assets/img/atelier-craft.png'] },
    { id: 8, name: 'Heritage Logger', category: 'Combat', price: 19499, oldPrice: 21999, badge: 'Limited', rating: 4.8, reviews: 39, stock: 8, material: 'Vegetable-tanned leather', sole: 'Commando leather sole', description: 'Our most honest boot. Vegetable-tanned leather, a hand-set commando sole and visible brass hardware.', sizes: ['6', '7', '8', '9', '10', '11', '12'], colors: [{ hex: '#4A2F1E', name: 'Saddle Brown' }], images: ['assets/img/heritage-logger.png', 'assets/img/cat-combat.png', 'assets/img/detail-sole.png', 'assets/img/atelier-craft.png'] },
    { id: 9, name: 'Marlowe Brogue Boot', category: 'Formal', price: 17999, oldPrice: 0, badge: 'Premium', rating: 4.9, reviews: 65, stock: 14, material: 'Hand-burnished calf leather', sole: 'Leather sole with rubber inserts', description: 'Brogue detailing done quietly. Hand-burnished calf leather and a shape that reads sharp under a tapered trouser.', sizes: ['6', '7', '8', '9', '10', '11', '12'], colors: [{ hex: '#4A2E1E', name: 'Dark Mahogany' }, { hex: '#141414', name: 'Core Black' }], images: ['assets/img/marlowe-oxford.png', 'assets/img/cat-formal.png', 'assets/img/detail-sole.png', 'assets/img/atelier-craft.png'] },
    { id: 10, name: 'Windsor Wingtip', category: 'Formal', price: 18999, oldPrice: 20999, badge: '', rating: 4.7, reviews: 48, stock: 10, material: 'French calf leather', sole: 'Stacked leather sole', description: 'The wingtip boot for occasions. French calf leather with a cognac patina and a slim waist.', sizes: ['6', '7', '8', '9', '10', '11', '12'], colors: [{ hex: '#8B5A2B', name: 'Cognac Tan' }, { hex: '#3A2418', name: 'Deep Brown' }], images: ['assets/img/windsor-wingtip.png', 'assets/img/cat-formal.png', 'assets/img/detail-sole.png', 'assets/img/atelier-craft.png'] },
    { id: 11, name: 'Summit Trail Hiker', category: 'Hiking', price: 16499, oldPrice: 0, badge: '', rating: 4.8, reviews: 71, stock: 16, material: 'Full-grain waterproof leather', sole: 'Multi-directional lug outsole', description: 'A hiking boot you can wear in the city. Waterproof full-grain leather and a padded collar.', sizes: ['6', '7', '8', '9', '10', '11', '12'], colors: [{ hex: '#5A3B24', name: 'Trail Brown' }, { hex: '#2F3327', name: 'Forest' }], images: ['assets/img/summit-trail.png', 'assets/img/cat-hiking.png', 'assets/img/detail-sole.png', 'assets/img/atelier-craft.png'] },
    { id: 12, name: 'Glacier Winter', category: 'Hiking', price: 17299, oldPrice: 0, badge: 'New', rating: 4.7, reviews: 33, stock: 9, material: 'Shearling-lined leather', sole: 'Thermal rubber lug sole', description: 'Winter without compromise. A genuine shearling lining keeps warmth in, a waxed upper keeps the wet out.', sizes: ['6', '7', '8', '9', '10', '11', '12'], colors: [{ hex: '#3B2A1E', name: 'Dark Chestnut' }, { hex: '#141414', name: 'Core Black' }], images: ['assets/img/glacier-winter.png', 'assets/img/cat-hiking.png', 'assets/img/detail-sole.png', 'assets/img/atelier-craft.png'] }
];

// --------------------------------------------------------------
// STORE API
// --------------------------------------------------------------
const Store = (function () {
    const FREE_SHIPPING = 15000;
    const SHIPPING_FEE = 350;
    const STATUSES = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
    const CATEGORIES = ['Chelsea', 'Chukka', 'Combat', 'Formal', 'Hiking'];
    const CART_KEY = 'atal_cart';

    const state = {
        products: [],
        profile: null,
        wishlist: [],
        addresses: [],
        orders: [],
        users: [],
        isAdmin: false,
        connected: false,
        lastError: ''
    };

    let client = null;
    let initPromise = null;
    let authBound = false;

    // ----------------------------------------------------------
    // LOW LEVEL
    // ----------------------------------------------------------
    function config() {
        return window.ATAL_SUPABASE || {};
    }

    function sb() {
        if (client) return client;
        const cfg = config();
        if (!cfg.url || !cfg.anonKey || typeof window.supabase === 'undefined') return null;
        client = window.supabase.createClient(cfg.url, cfg.anonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        return client;
    }

    function readCart() {
        try {
            const raw = localStorage.getItem(CART_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function writeCart(items) {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(items));
        } catch (err) {
            /* storage full or blocked — cart simply will not persist */
        }
        return items;
    }

    function formatPKR(amount) {
        return 'PKR ' + Number(amount || 0).toLocaleString('en-PK');
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    // Supabase error messages are technical; keep the ones we care about readable.
    function friendly(message) {
        const text = String(message || 'Something went wrong. Please try again.');
        if (/Invalid login credentials/i.test(text)) return 'Incorrect email or password.';
        if (/Email not confirmed/i.test(text)) return 'Please confirm your email address, then sign in.';
        if (/already registered/i.test(text)) return 'An account with this email already exists.';
        if (/Password should be at least/i.test(text)) return 'Password must be at least 6 characters.';
        if (/rate limit/i.test(text)) return 'Too many attempts. Please wait a moment and try again.';
        return text;
    }

    // ----------------------------------------------------------
    // MAPPERS (snake_case rows <-> camelCase objects)
    // ----------------------------------------------------------
    function mapProduct(row) {
        return {
            id: Number(row.id),
            name: row.name || '',
            category: row.category || 'Chelsea',
            price: Number(row.price || 0),
            oldPrice: Number(row.old_price || 0),
            badge: row.badge || '',
            rating: Number(row.rating || 0),
            reviews: Number(row.reviews || 0),
            stock: Number(row.stock || 0),
            material: row.material || '',
            sole: row.sole || '',
            description: row.description || '',
            sizes: Array.isArray(row.sizes) ? row.sizes : [],
            colors: Array.isArray(row.colors) ? row.colors : [],
            images: Array.isArray(row.images) ? row.images : [],
            active: row.is_active !== false,
            createdAt: row.created_at
        };
    }

    function productRow(p) {
        return {
            name: p.name,
            category: p.category,
            price: Number(p.price) || 0,
            old_price: Number(p.oldPrice) || 0,
            badge: p.badge || '',
            rating: Number(p.rating) || 0,
            reviews: Number(p.reviews) || 0,
            stock: Number(p.stock) || 0,
            material: p.material || '',
            sole: p.sole || '',
            description: p.description || '',
            sizes: p.sizes && p.sizes.length ? p.sizes : ['6', '7', '8', '9', '10', '11', '12'],
            colors: p.colors || [],
            images: p.images && p.images.length ? p.images : ['assets/img/cat-chelsea.png'],
            is_active: p.active !== false
        };
    }

    function mapAddress(row) {
        return {
            id: String(row.id),
            label: row.label || 'Home',
            name: row.name || '',
            phone: row.phone || '',
            address: row.address || '',
            city: row.city || '',
            postal: row.postal || '',
            isDefault: row.is_default === true
        };
    }

    function mapOrder(row) {
        return {
            id: row.id,
            userEmail: row.user_email || '',
            userName: row.user_name || 'Guest Customer',
            phone: row.phone || '',
            address: row.address || '',
            city: row.city || '',
            postal: row.postal || '',
            note: row.note || '',
            subtotal: Number(row.subtotal || 0),
            shipping: Number(row.shipping || 0),
            total: Number(row.total || 0),
            payment: row.payment || 'COD',
            status: row.status || 'Processing',
            createdAt: row.created_at,
            items: (row.order_items || []).map(function (item) {
                return {
                    id: Number(item.product_id),
                    name: item.name,
                    image: item.image || '',
                    price: Number(item.price || 0),
                    qty: Number(item.qty || 1),
                    size: item.size || '',
                    color: item.color || ''
                };
            })
        };
    }

    // ----------------------------------------------------------
    // PRODUCTS
    // ----------------------------------------------------------
    function getProducts() {
        const list = state.products.length ? state.products : clone(ATAL_DEFAULT_PRODUCTS);
        return state.isAdmin ? list : list.filter(function (p) { return p.active !== false; });
    }

    function getProduct(id) {
        return getProducts().find(function (p) { return Number(p.id) === Number(id); }) || null;
    }

    async function refreshProducts() {
        const c = sb();
        if (!c) return { ok: false, error: 'Supabase is not configured.' };
        const { data, error } = await c.from('products').select('*').order('id');
        if (error) {
            state.lastError = error.message;
            return { ok: false, error: error.message };
        }
        state.products = (data || []).map(mapProduct);
        state.connected = true;
        return { ok: true, products: state.products };
    }

    async function upsertProduct(product) {
        const c = sb();
        if (!c) return { ok: false, error: 'Supabase is not configured.' };
        const row = productRow(product);
        let error = null;
        if (product.id) {
            const res = await c.from('products').update(row).eq('id', product.id);
            error = res.error;
        } else {
            const res = await c.from('products').insert(row);
            error = res.error;
        }
        if (error) return { ok: false, error: error.message };
        await refreshProducts();
        return { ok: true };
    }

    async function deleteProduct(id) {
        const c = sb();
        if (!c) return { ok: false, error: 'Supabase is not configured.' };
        const { error } = await c.from('products').delete().eq('id', id);
        if (error) return { ok: false, error: error.message };
        await refreshProducts();
        return { ok: true };
    }

    // Restores the 12 original boots without touching boots the admin added.
    async function resetProducts() {
        const c = sb();
        if (!c) return { ok: false, error: 'Supabase is not configured.' };
        const rows = ATAL_DEFAULT_PRODUCTS.map(function (p) {
            return Object.assign(productRow(p), { id: p.id });
        });
        const { error } = await c.from('products').upsert(rows, { onConflict: 'id' });
        if (error) return { ok: false, error: error.message };
        await refreshProducts();
        return { ok: true };
    }

    // ----------------------------------------------------------
    // CART (stays on the device so guests can shop)
    // ----------------------------------------------------------
    function getCart() {
        const cart = readCart();
        return Array.isArray(cart) ? cart : [];
    }

    function saveCart(items) {
        writeCart(items);
        return items;
    }

    function addToCart(line) {
        const cart = getCart();
        const existing = cart.find(function (item) {
            return Number(item.id) === Number(line.id) && item.size === line.size && item.color === line.color;
        });
        if (existing) {
            existing.qty += line.qty;
        } else {
            cart.push(line);
        }
        return saveCart(cart);
    }

    function updateCartQty(index, qty) {
        const cart = getCart();
        if (!cart[index]) return cart;
        if (qty <= 0) {
            cart.splice(index, 1);
        } else {
            cart[index].qty = qty;
        }
        return saveCart(cart);
    }

    function removeCartItem(index) {
        const cart = getCart();
        cart.splice(index, 1);
        return saveCart(cart);
    }

    function clearCart() {
        return saveCart([]);
    }

    function cartCount() {
        return getCart().reduce(function (total, item) { return total + Number(item.qty || 0); }, 0);
    }

    function cartTotals() {
        const subtotal = getCart().reduce(function (total, item) {
            return total + Number(item.price || 0) * Number(item.qty || 0);
        }, 0);
        const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
        return { subtotal: subtotal, shipping: shipping, total: subtotal + shipping, freeShipping: FREE_SHIPPING };
    }

    // ----------------------------------------------------------
    // WISHLIST
    // ----------------------------------------------------------
    function getWishlist() {
        return state.wishlist.slice();
    }

    function isWishlisted(id) {
        return state.wishlist.some(function (item) { return Number(item) === Number(id); });
    }

    async function toggleWishlist(id) {
        const productId = Number(id);
        if (!state.profile) {
            return { ok: false, error: 'Please sign in to save boots.', needsAuth: true };
        }
        const c = sb();
        if (!c) return { ok: false, error: 'Supabase is not configured.' };

        const wasSaved = isWishlisted(productId);
        state.wishlist = wasSaved
            ? state.wishlist.filter(function (item) { return item !== productId; })
            : state.wishlist.concat([productId]);

        const query = wasSaved
            ? c.from('wishlist').delete().eq('user_id', state.profile.id).eq('product_id', productId)
            : c.from('wishlist').insert({ user_id: state.profile.id, product_id: productId });

        const { error } = await query;
        if (error) {
            // roll the optimistic update back so the UI never lies
            state.wishlist = wasSaved
                ? state.wishlist.concat([productId])
                : state.wishlist.filter(function (item) { return item !== productId; });
            return { ok: false, error: error.message };
        }
        return { ok: true, added: !wasSaved };
    }

    // ----------------------------------------------------------
    // ACCOUNT
    // ----------------------------------------------------------
    function getSession() {
        return state.profile;
    }

    async function loadProfile(user) {
        const c = sb();
        const meta = (user && user.user_metadata) || {};
        const fallback = {
            id: user.id,
            name: meta.name || (user.email || '').split('@')[0],
            email: user.email || '',
            phone: meta.phone || '',
            role: 'customer',
            createdAt: user.created_at
        };
        if (!c) {
            state.profile = fallback;
            state.isAdmin = false;
            return state.profile;
        }

        const { data, error } = await c.from('profiles').select('*').eq('id', user.id).maybeSingle();

        if (error || !data) {
            // The signup trigger creates the row; if it is missing, create it now.
            await c.from('profiles').upsert({
                id: user.id,
                name: fallback.name,
                email: fallback.email,
                phone: fallback.phone
            });
            state.profile = fallback;
            state.isAdmin = false;
            return state.profile;
        }

        state.profile = {
            id: data.id,
            name: data.name || fallback.name,
            email: data.email || fallback.email,
            phone: data.phone || '',
            role: data.role || 'customer',
            createdAt: data.created_at || user.created_at
        };
        state.isAdmin = state.profile.role === 'admin';
        return state.profile;
    }

    async function loadAddresses() {
        if (!state.profile) return;
        const c = sb();
        if (!c) return;
        const { data, error } = await c.from('addresses')
            .select('*').eq('user_id', state.profile.id).order('created_at');
        if (!error) state.addresses = (data || []).map(mapAddress);
    }

    async function loadOrders() {
        if (!state.profile) return;
        const c = sb();
        if (!c) return;
        let query = c.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
        if (!state.isAdmin) query = query.eq('user_id', state.profile.id);
        const { data, error } = await query;
        if (!error) state.orders = (data || []).map(mapOrder);
    }

    async function loadWishlist() {
        if (!state.profile) return;
        const c = sb();
        if (!c) return;
        const { data, error } = await c.from('wishlist').select('product_id').eq('user_id', state.profile.id);
        if (!error) state.wishlist = (data || []).map(function (row) { return Number(row.product_id); });
    }

    async function loadUsers() {
        const c = sb();
        if (!c || !state.isAdmin) return;
        const { data, error } = await c.from('profiles').select('*').order('created_at', { ascending: false });
        if (!error) {
            state.users = (data || []).map(function (row) {
                return {
                    id: row.id,
                    name: row.name || '',
                    email: row.email || '',
                    phone: row.phone || '',
                    role: row.role || 'customer',
                    createdAt: row.created_at
                };
            });
        }
    }

    async function loadUserData() {
        await Promise.all([loadWishlist(), loadAddresses(), loadOrders()]);
        if (state.isAdmin) await loadUsers();
    }

    async function register(data) {
        const name = String(data.name || '').trim();
        const email = String(data.email || '').trim().toLowerCase();
        const phone = String(data.phone || '').trim();
        const password = String(data.password || '');

        if (name.length < 3) return { ok: false, error: 'Please enter your full name.' };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
        if (phone.length < 10) return { ok: false, error: 'Please enter a valid phone number.' };
        if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

        const c = sb();
        if (!c) return { ok: false, error: 'Supabase is not configured.' };
        if (!state.connected) {
            return { ok: false, error: 'Database not ready — run supabase/schema.sql in your Supabase project first.' };
        }

        const { data: res, error } = await c.auth.signUp({
            email: email,
            password: password,
            options: { data: { name: name, phone: phone } }
        });
        if (error) return { ok: false, error: friendly(error.message) };

        if (!res.session) {
            return {
                ok: false,
                needsConfirm: true,
                error: 'Account created. Please confirm your email address, then sign in.'
            };
        }

        await loadProfile(res.user);
        await loadUserData();
        return { ok: true, user: state.profile };
    }

    async function login(email, password) {
        const clean = String(email || '').trim().toLowerCase();
        const c = sb();
        if (!c) return { ok: false, error: 'Supabase is not configured.' };
        if (!state.connected) {
            return { ok: false, error: 'Database not ready — run supabase/schema.sql in your Supabase project first.' };
        }

        const { data, error } = await c.auth.signInWithPassword({ email: clean, password: String(password || '') });
        if (error) return { ok: false, error: friendly(error.message) };

        await loadProfile(data.user);
        await loadUserData();
        return { ok: true, user: state.profile };
    }

    async function logout() {
        const c = sb();
        if (c) await c.auth.signOut();
        state.profile = null;
        state.isAdmin = false;
        state.wishlist = [];
        state.addresses = [];
        state.orders = [];
        state.users = [];
        return { ok: true };
    }

    async function updateProfile(patch) {
        if (!state.profile) return { ok: false, error: 'Not signed in.' };
        const c = sb();
        if (!c) return { ok: false, error: 'Supabase is not configured.' };

        const name = String(patch.name || '').trim();
        const phone = String(patch.phone || '').trim();
        if (name.length < 3) return { ok: false, error: 'Please enter your full name.' };

        const { error } = await c.from('profiles')
            .update({ name: name, phone: phone })
            .eq('id', state.profile.id);
        if (error) return { ok: false, error: friendly(error.message) };

        state.profile = Object.assign({}, state.profile, { name: name, phone: phone });
        return { ok: true, user: state.profile };
    }

    async function changePassword(current, next) {
        if (!state.profile) return { ok: false, error: 'Not signed in.' };
        if (String(next || '').length < 6) return { ok: false, error: 'New password must be at least 6 characters.' };
        const c = sb();
        if (!c) return { ok: false, error: 'Supabase is not configured.' };

        // Re-authenticate first so a wrong current password is caught here.
        const check = await c.auth.signInWithPassword({
            email: state.profile.email,
            password: String(current || '')
        });
        if (check.error) return { ok: false, error: 'Current password is incorrect.' };

        const { error } = await c.auth.updateUser({ password: String(next) });
        if (error) return { ok: false, error: friendly(error.message) };
        return { ok: true };
    }

    // ----------------------------------------------------------
    // ADDRESSES
    // ----------------------------------------------------------
    function getAddresses() {
        return state.addresses.slice();
    }

    async function saveAddress(emailOrAddress, maybeAddress) {
        const address = maybeAddress || emailOrAddress || {};
        if (!state.profile) return { ok: false, error: 'Not signed in.' };
        const c = sb();
        if (!c) return { ok: false, error: 'Supabase is not configured.' };

        const row = {
            user_id: state.profile.id,
            label: address.label || 'Home',
            name: address.name || '',
            phone: address.phone || '',
            address: address.address || '',
            city: address.city || '',
            postal: address.postal || '',
            is_default: !!address.isDefault
        };

        if (row.is_default) {
            await c.from('addresses').update({ is_default: false }).eq('user_id', state.profile.id);
        }

        let error = null;
        if (address.id) {
            const res = await c.from('addresses').update(row).eq('id', address.id);
            error = res.error;
        } else {
            if (!state.addresses.length) row.is_default = true;
            const res = await c.from('addresses').insert(row);
            error = res.error;
        }
        if (error) return { ok: false, error: error.message };

        await loadAddresses();
        return { ok: true, addresses: getAddresses() };
    }

    async function deleteAddress(emailOrId, maybeId) {
        const id = maybeId !== undefined ? maybeId : emailOrId;
        const c = sb();
        if (!c) return { ok: false, error: 'Supabase is not configured.' };
        const { error } = await c.from('addresses').delete().eq('id', id);
        if (error) return { ok: false, error: error.message };
        await loadAddresses();
        return { ok: true };
    }

    // ----------------------------------------------------------
    // ORDERS
    // ----------------------------------------------------------
    function getOrders() {
        return state.orders.slice();
    }

    function getUserOrders(email) {
        const clean = String(email || '').toLowerCase();
        return state.orders.filter(function (o) { return String(o.userEmail).toLowerCase() === clean; });
    }

    function orderNumber() {
        return 'ATL-' + String(Math.floor(10000 + Math.random() * 89999));
    }

    async function createOrder(payload) {
        const c = sb();
        if (!c) return null;

        const items = payload.items || [];
        const row = {
            user_id: state.profile ? state.profile.id : null,
            user_email: payload.userEmail || (state.profile ? state.profile.email : ''),
            user_name: payload.userName || 'Guest Customer',
            phone: payload.phone || '',
            address: payload.address || '',
            city: payload.city || '',
            postal: payload.postal || '',
            note: payload.note || '',
            subtotal: Number(payload.subtotal) || 0,
            shipping: Number(payload.shipping) || 0,
            total: Number(payload.total) || 0,
            payment: payload.payment || 'COD',
            status: 'Processing'
        };

        // The id is generated here so guest checkouts never need to read the row
        // back (RLS only lets a signed-in customer read their own orders).
        let data = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            const attemptRow = Object.assign({}, row, { id: orderNumber() });
            const res = await c.from('orders').insert(attemptRow);
            if (!res.error) {
                data = attemptRow;
                break;
            }
            // 23505 = duplicate id, just try another number
            if (res.error.code !== '23505') {
                state.lastError = res.error.message;
                return null;
            }
        }
        if (!data) {
            state.lastError = 'Could not reserve an order number.';
            return null;
        }

        if (items.length) {
            const { error: itemsError } = await c.from('order_items').insert(items.map(function (item) {
                return {
                    order_id: data.id,
                    product_id: item.id || null,
                    name: item.name,
                    image: item.image || '',
                    price: Number(item.price) || 0,
                    qty: Number(item.qty) || 1,
                    size: item.size || '',
                    color: item.color || ''
                };
            }));
            if (itemsError) state.lastError = itemsError.message;
        }

        const order = mapOrder(Object.assign({}, data, {
            created_at: new Date().toISOString(),
            order_items: items.map(function (item) {
                return {
                    product_id: item.id,
                    name: item.name,
                    image: item.image,
                    price: item.price,
                    qty: item.qty,
                    size: item.size,
                    color: item.color
                };
            })
        }));

        state.orders.unshift(order);
        return order;
    }

    async function updateOrderStatus(id, status) {
        const c = sb();
        if (!c) return { ok: false, error: 'Supabase is not configured.' };
        const { error } = await c.from('orders').update({ status: status }).eq('id', id);
        if (error) return { ok: false, error: error.message };
        const order = state.orders.find(function (o) { return o.id === id; });
        if (order) order.status = status;
        return { ok: true };
    }

    // ----------------------------------------------------------
    // ADMIN
    // ----------------------------------------------------------
    function adminSession() {
        return state.isAdmin ? state.profile : null;
    }

    async function adminLogin(email, password) {
        const result = await login(email, password);
        if (!result.ok) return result;
        if (!state.isAdmin) {
            await logout();
            return { ok: false, error: 'This account does not have admin access.' };
        }
        return { ok: true, user: state.profile };
    }

    async function adminLogout() {
        return logout();
    }

    function getUsers() {
        return state.users.slice();
    }

    // ----------------------------------------------------------
    // BOOTSTRAP
    // ----------------------------------------------------------
    async function doInit() {
        const c = sb();
        if (!c) {
            state.products = clone(ATAL_DEFAULT_PRODUCTS);
            state.connected = false;
            return state;
        }

        try {
            const prodRes = await c.from('products').select('*').order('id');
            if (prodRes.error) {
                state.lastError = prodRes.error.message;
                state.products = clone(ATAL_DEFAULT_PRODUCTS);
            } else {
                state.products = (prodRes.data || []).map(mapProduct);
                state.connected = true;
            }

            const { data: sessionData } = await c.auth.getSession();
            if (sessionData && sessionData.session) {
                await loadProfile(sessionData.session.user);
                await loadUserData();
            }

            if (!authBound) {
                authBound = true;
                c.auth.onAuthStateChange(function (event, session) {
                    if (event === 'SIGNED_OUT') {
                        state.profile = null;
                        state.isAdmin = false;
                        state.wishlist = [];
                        state.addresses = [];
                        state.orders = [];
                    } else if (session) {
                        loadProfile(session.user).then(function () {
                            return loadUserData();
                        }).then(function () {
                            if (typeof window.onAtalAuthChange === 'function') window.onAtalAuthChange();
                        });
                    }
                });
            }
        } catch (err) {
            state.lastError = err.message;
            state.products = clone(ATAL_DEFAULT_PRODUCTS);
        }

        return state;
    }

    function ready() {
        if (!initPromise) initPromise = doInit();
        return initPromise;
    }

    return {
        ready: ready,
        // constants
        FREE_SHIPPING: FREE_SHIPPING,
        SHIPPING_FEE: SHIPPING_FEE,
        STATUSES: STATUSES,
        CATEGORIES: CATEGORIES,
        formatPKR: formatPKR,
        // products
        getProducts: getProducts,
        getProduct: getProduct,
        refreshProducts: refreshProducts,
        upsertProduct: upsertProduct,
        deleteProduct: deleteProduct,
        resetProducts: resetProducts,
        // cart
        getCart: getCart,
        saveCart: saveCart,
        addToCart: addToCart,
        updateCartQty: updateCartQty,
        removeCartItem: removeCartItem,
        clearCart: clearCart,
        cartCount: cartCount,
        cartTotals: cartTotals,
        // wishlist
        getWishlist: getWishlist,
        isWishlisted: isWishlisted,
        toggleWishlist: toggleWishlist,
        // account
        getSession: getSession,
        register: register,
        login: login,
        logout: logout,
        updateProfile: updateProfile,
        changePassword: changePassword,
        // addresses
        getAddresses: getAddresses,
        saveAddress: saveAddress,
        deleteAddress: deleteAddress,
        // orders
        getOrders: getOrders,
        getUserOrders: getUserOrders,
        createOrder: createOrder,
        updateOrderStatus: updateOrderStatus,
        // admin
        adminSession: adminSession,
        adminLogin: adminLogin,
        adminLogout: adminLogout,
        getUsers: getUsers,
        // diagnostics
        state: state
    };
})();
