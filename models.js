const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { getTable, saveTable, nextId, now, today } = require("./db");

function createUser(username, password, email, referrerCode) {
    const users = getTable("users");
    if (users.find(u => u.username === username || u.email === email)) return null;
    const hash = bcrypt.hashSync(password, 10);
    const user = {
        id: nextId("users"),
        username, password_hash: hash, email,
        avatar: "", registered_date: now(),
        is_member: 0, member_expiry_date: null, is_admin: 0,
        membership_fee_paid: 0, referral_code: uuidv4().substring(0, 8),
        balance: 0
    };
    users.push(user);
    saveTable("users");

    if (referrerCode) {
        const referrer = users.find(u => u.referral_code === referrerCode);
        if (referrer && referrer.id !== user.id) {
            const refs = getTable("referrals");
            refs.push({ id: nextId("referrals"), referrer_id: referrer.id, referred_user_id: user.id, created_date: now(), is_rewarded: 0 });
            saveTable("referrals");
        }
    }

    // Update daily stats
    const ds = getTable("daily_stats");
    let d = ds.find(s => s.stat_date === today());
    if (d) d.new_users = (d.new_users || 0) + 1;
    else ds.push({ id: nextId("daily_stats"), stat_date: today(), total_downloads: 0, new_users: 1, new_orders: 0, revenue: 0 });
    saveTable("daily_stats");

    return user;
}

function verifyUser(username, password) {
    const user = getTable("users").find(u => u.username === username);
    if (user && bcrypt.compareSync(password, user.password_hash)) return JSON.parse(JSON.stringify(user));
    return null;
}

function getUser(id) {
    const u = getTable("users").find(u => u.id === Number(id));
    return u ? JSON.parse(JSON.stringify(u)) : null;
}

function getUserByRefCode(code) {
    const u = getTable("users").find(u => u.referral_code === code);
    return u ? JSON.parse(JSON.stringify(u)) : null;
}

function getProducts(categoryId, search, activeOnly) {
    const cats = getTable("categories");
    let products = getTable("products").filter(p => {
        if (activeOnly !== false && !p.is_active) return false;
        if (categoryId && p.category_id !== Number(categoryId)) return false;
        if (search) {
            const s = search.toLowerCase();
            if (!p.title.toLowerCase().includes(s) && !((p.tags||"").toLowerCase().includes(s))) return false;
        }
        return true;
    });
    return products.map(p => {
        const cat = cats.find(c => c.id === p.category_id);
        return { ...p, category_name: cat ? cat.name : "未分类" };
    }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
}

function getProduct(id) {
    const p = getTable("products").find(p => p.id === Number(id));
    if (!p) return null;
    const cat = getTable("categories").find(c => c.id === p.category_id);
    return { ...p, category_name: cat ? cat.name : "未分类" };
}

function getCategories() {
    return getTable("categories").sort((a, b) => a.sort_order - b.sort_order);
}

function recordDownload(userId, productId) {
    const downloads = getTable("downloads");
    downloads.push({ id: nextId("downloads"), user_id: Number(userId), product_id: Number(productId), downloaded_at: now() });
    saveTable("downloads");

    const products = getTable("products");
    const p = products.find(p => p.id === Number(productId));
    if (p) { p.download_count = (p.download_count || 0) + 1; saveTable("products"); }

    const ds = getTable("daily_stats");
    let d = ds.find(s => s.stat_date === today());
    if (d) d.total_downloads = (d.total_downloads || 0) + 1;
    else ds.push({ id: nextId("daily_stats"), stat_date: today(), total_downloads: 1, new_users: 0, new_orders: 0, revenue: 0 });
    saveTable("daily_stats");
}

function getUserDownloads(userId, limit) {
    const downloads = getTable("downloads")
        .filter(d => d.user_id === Number(userId))
        .sort((a, b) => new Date(b.downloaded_at) - new Date(a.downloaded_at))
        .slice(0, limit || 50);
    const products = getTable("products");
    return downloads.map(d => {
        const p = products.find(p => p.id === d.product_id);
        return { ...d, product_title: p ? p.title : "未知", category_id: p ? p.category_id : null };
    });
}

function createOrder(userId, type, amount) {
    const orders = getTable("orders");
    const order = { id: nextId("orders"), user_id: Number(userId), order_type: type, amount, status: "pending", created_date: now(), paid_date: null };
    orders.push(order);
    saveTable("orders");
    return JSON.parse(JSON.stringify(order));
}

function completeOrder(orderId) {
    const orders = getTable("orders");
    const order = orders.find(o => o.id === Number(orderId));
    if (!order) return null;
    order.status = "completed";
    order.paid_date = now();
    saveTable("orders");

    if (order.order_type === "membership") {
        const users = getTable("users");
        const user = users.find(u => u.id === order.user_id);
        if (user) {
            const expiry = new Date(Date.now() + 30*24*60*60*1000).toISOString().replace("T", " ").substring(0, 19);
            user.is_member = 1;
            user.member_expiry_date = expiry;
            user.membership_fee_paid = 1;
            saveTable("users");
        }

        const ds = getTable("daily_stats");
        let d = ds.find(s => s.stat_date === today());
        if (d) { d.new_orders = (d.new_orders || 0) + 1; d.revenue = (d.revenue || 0) + order.amount; }
        else ds.push({ id: nextId("daily_stats"), stat_date: today(), total_downloads: 0, new_users: 0, new_orders: 1, revenue: order.amount });
        saveTable("daily_stats");
    }
    return JSON.parse(JSON.stringify(order));
}

function getValidReferralCount(userId) {
    const refs = getTable("referrals");
    const users = getTable("users");
    return refs.filter(r => {
        if (r.referrer_id !== Number(userId) || r.is_rewarded) return false;
        const referred = users.find(u => u.id === r.referred_user_id);
        return referred && referred.membership_fee_paid;
    }).length;
}

function checkReferralReward(userId) {
    const user = getUser(userId);
    if (!user || !user.membership_fee_paid) return false;
    const registered = new Date(user.registered_date.replace(" ", "T"));
    const deadline = new Date(registered.getTime() + 10*24*60*60*1000);
    if (new Date() > deadline) return false;

    if (getValidReferralCount(userId) >= 3) {
        const orders = getTable("orders");
        orders.push({ id: nextId("orders"), user_id: Number(userId), order_type: "referral_refund", amount: 10, status: "completed", paid_date: now(), created_date: now() });
        saveTable("orders");

        const refs = getTable("referrals");
        refs.filter(r => r.referrer_id === Number(userId) && !r.is_rewarded).forEach(r => r.is_rewarded = 1);
        saveTable("referrals");

        const users = getTable("users");
        const u = users.find(u => u.id === Number(userId));
        if (u) u.balance = (u.balance || 0) + 10;
        saveTable("users");
        return true;
    }
    return false;
}

function getWeeklyStats() {
    const today_date = new Date();
    const diff = (today_date.getDay() + 6) % 7;
    const ws = new Date(today_date.getTime() - diff*86400000).toISOString().split("T")[0];
    const lws = new Date(today_date.getTime() - (diff+7)*86400000).toISOString().split("T")[0];
    const lwe = new Date(today_date.getTime() - (diff+1)*86400000).toISOString().split("T")[0];

    const downloads = getTable("downloads");
    const users = getTable("users");
    const products = getTable("products");
    const orders = getTable("orders");

    const weekDownloads = downloads.filter(d => d.downloaded_at >= ws).length;
    const lastWeekDownloads = downloads.filter(d => d.downloaded_at >= lws && d.downloaded_at <= lwe).length;
    const weekNewMembers = users.filter(u => u.is_member && u.registered_date >= ws).length;
    const weekNewProducts = products.filter(p => p.created_date >= ws).length;
    const weekRevenue = orders.filter(o => o.status === "completed" && o.paid_date >= ws && o.order_type === "membership").reduce((s, o) => s + o.amount, 0);

    // Top products this week
    const downloadCounts = {};
    downloads.filter(d => d.downloaded_at >= ws).forEach(d => {
        downloadCounts[d.product_id] = (downloadCounts[d.product_id] || 0) + 1;
    });
    const topProducts = Object.entries(downloadCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([pid, cnt]) => {
            const p = products.find(p => p.id === Number(pid));
            return { title: p ? p.title : "未知", id: Number(pid), cnt };
        });

    return { week_downloads: weekDownloads, last_week_downloads: lastWeekDownloads, week_new_members: weekNewMembers, week_new_products: weekNewProducts, week_revenue: weekRevenue, top_products: topProducts };
}

function getDailyStats(days) {
    const start = new Date(Date.now() - (days||7)*86400000).toISOString().split("T")[0];
    return getTable("daily_stats").filter(d => d.stat_date >= start).sort((a, b) => a.stat_date.localeCompare(b.stat_date));
}

function getProductStats() {
    const products = getTable("products").filter(p => p.is_active);
    const downloads = getTable("downloads");
    const ws = new Date(Date.now() - 7*86400000).toISOString().split("T")[0];
    return products.map(p => ({
        id: p.id, title: p.title, download_count: p.download_count || 0,
        week_downloads: downloads.filter(d => d.product_id === p.id && d.downloaded_at >= ws).length
    })).sort((a, b) => b.download_count - a.download_count);
}

function generateWeeklyReport() {
    const today_date = new Date();
    const diff = (today_date.getDay() + 6) % 7;
    const ws = new Date(today_date.getTime() - diff*86400000).toISOString().split("T")[0];
    const we = today_date.toISOString().split("T")[0];
    const stats = getWeeklyStats();
    const suggestions = [];

    if (stats.top_products.length > 0) {
        suggestions.push("热门资料: " + stats.top_products.map(p => p.title).join(", ") + "，建议继续上传同类资料。");
    }

    // Category analysis
    const downloads = getTable("downloads");
    const products = getTable("products");
    const cats = getTable("categories");
    cats.forEach(cat => {
        const catProducts = products.filter(p => p.category_id === cat.id && p.is_active);
        const catDownloads = downloads.filter(d => {
            const p = products.find(p => p.id === d.product_id);
            return p && p.category_id === cat.id && p.is_active && d.downloaded_at >= ws;
        }).length;
        if (catDownloads > 10 && catProducts.length < 5) {
            suggestions.push("分类「" + cat.name + "」下载量高(" + catDownloads + "次)但仅" + catProducts.length + "个资料，建议补充。");
        }
    });

    if (stats.last_week_downloads > 0) {
        const ratio = stats.week_downloads / stats.last_week_downloads;
        if (ratio > 1.2) suggestions.push("本周下载增长" + Math.round((ratio-1)*100) + "%，用户活跃度高。");
        else if (ratio < 0.8) suggestions.push("本周下载下降" + Math.round((1-ratio)*100) + "%，建议上新或推广。");
    }
    if (suggestions.length === 0) suggestions.push("数据平稳，建议持续关注热门分类补充优质资料。");

    const reports = getTable("weekly_reports");
    reports.push({
        id: nextId("weekly_reports"),
        week_start: ws, week_end: we,
        total_downloads: stats.week_downloads,
        new_members: stats.week_new_members,
        total_revenue: stats.week_revenue,
        top_products: JSON.stringify(stats.top_products.map(p => ({title: p.title, count: p.cnt}))),
        suggestions: suggestions.join("; "),
        created_date: now()
    });
    saveTable("weekly_reports");

    return { week_start: ws, week_end: we, ...stats, suggestions };
}

function getLatestReport() {
    const reports = getTable("weekly_reports").sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    if (reports.length > 0) {
        const r = JSON.parse(JSON.stringify(reports[0]));
        try { r.top_products = JSON.parse(r.top_products); } catch(e) { r.top_products = []; }
        return r;
    }
    return null;
}

// Admin helpers
function adminAddProduct(title, desc, catId, link, cover, size, ftype, tags) {
    const products = getTable("products");
    const p = { id: nextId("products"), title, description: desc||"", category_id: Number(catId), download_link: link, cover_image_url: cover||"", file_size: size||"", file_type: ftype||"", tags: tags||"", is_active: 1, download_count: 0, created_date: now(), updated_date: now() };
    products.push(p);
    saveTable("products");
    return p;
}

function adminUpdateProduct(pid, title, desc, catId, link, cover, size, ftype, tags, active) {
    const products = getTable("products");
    const p = products.find(p => p.id === Number(pid));
    if (!p) return;
    p.title = title; p.description = desc||""; p.category_id = Number(catId);
    p.download_link = link; p.cover_image_url = cover||""; p.file_size = size||"";
    p.file_type = ftype||""; p.tags = tags||""; p.is_active = active === true || active === "on" ? 1 : 0;
    p.updated_date = now();
    saveTable("products");
}

function adminDeleteProduct(pid) {
    const products = getTable("products");
    const idx = products.findIndex(p => p.id === Number(pid));
    if (idx >= 0) { products.splice(idx, 1); saveTable("products"); }
}

function adminAddCategory(name, desc, order) {
    const cats = getTable("categories");
    if (cats.find(c => c.name === name)) return null;
    const c = { id: nextId("categories"), name, description: desc||"", sort_order: order||0, created_date: now() };
    cats.push(c);
    saveTable("categories");
    return c;
}

function adminDeleteCategory(cid) {
    const cats = getTable("categories");
    const idx = cats.findIndex(c => c.id === Number(cid));
    if (idx >= 0) { cats.splice(idx, 1); saveTable("categories"); }
}

function getAllOrders() {
    const orders = getTable("orders").sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    const users = getTable("users");
    return orders.map(o => {
        const u = users.find(u => u.id === o.user_id);
        return { ...o, username: u ? u.username : "未知" };
    });
}

function getAllUsers() {
    const refs = getTable("referrals");
    const downloads = getTable("downloads");
    return getTable("users").map(u => ({
        ...u,
        referral_count: refs.filter(r => r.referrer_id === u.id).length,
        download_count: downloads.filter(d => d.user_id === u.id).length
    })).sort((a, b) => new Date(b.registered_date) - new Date(a.registered_date));
}

module.exports = {
    createUser, verifyUser, getUser, getUserByRefCode,
    getProducts, getProduct, getCategories, recordDownload, getUserDownloads,
    createOrder, completeOrder, getValidReferralCount, checkReferralReward,
    getWeeklyStats, getDailyStats, getProductStats, generateWeeklyReport, getLatestReport,
    adminAddProduct, adminUpdateProduct, adminDeleteProduct,
    adminAddCategory, adminDeleteCategory, getAllOrders, getAllUsers
};
