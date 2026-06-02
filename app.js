const express = require("express");
const session = require("express-session");
const path = require("path");
const { initDB, getTable } = require("./db");
const models = require("./models");

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "digital-market-secret-key-2024";

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "static")));
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7*24*60*60*1000 }
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));

// Global locals
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.path = req.path;
    try { res.locals.categories = models.getCategories(); } catch(e) { res.locals.categories = []; }
    next();
});

// ========== PUBLIC ROUTES ==========

app.get("/", (req, res) => {
    try {
        const products = models.getProducts(null, null, true).slice(0, 12);
        const stats = models.getWeeklyStats();
        res.render("index", { products, stats, title: "首页" });
    } catch (e) {
        console.error("Home error:", e);
        res.status(500).render("error", { message: "服务器内部错误" });
    }
});

app.get("/products", (req, res) => {
    try {
        const catId = req.query.category || null;
        const search = req.query.search || null;
        const products = models.getProducts(catId, search, true);
        res.render("products", { products, currentCat: catId, search, title: search ? "搜索: " + search : "全部资料" });
    } catch (e) {
        console.error("Products error:", e);
        res.status(500).render("error", { message: "服务器内部错误" });
    }
});

app.get("/products/:id", (req, res) => {
    try {
        const product = models.getProduct(req.params.id);
        if (!product) return res.status(404).render("error", { message: "资料不存在" });
        const related = models.getProducts(product.category_id, null, true).filter(p => p.id != product.id).slice(0, 4);
        res.render("product_detail", { product, related, title: product.title });
    } catch (e) {
        console.error("Product detail error:", e);
        res.status(500).render("error", { message: "服务器内部错误" });
    }
});

app.get("/download/:id", (req, res) => {
    try {
        if (!req.session.user) return res.redirect("/login?redirect=/download/" + req.params.id);
        const user = models.getUser(req.session.user.id);
        if (!user || !user.is_member) return res.redirect("/membership");
        const product = models.getProduct(req.params.id);
        if (!product) return res.status(404).render("error", { message: "资料不存在" });
        models.recordDownload(user.id, product.id);
        res.redirect(product.download_link);
    } catch (e) {
        console.error("Download error:", e);
        res.status(500).render("error", { message: "下载失败" });
    }
});

// ========== AUTH ROUTES ==========

app.get("/login", (req, res) => {
    if (req.session.user) return res.redirect("/");
    res.render("login", { error: null, redirect: req.query.redirect || "/", title: "登录" });
});

app.post("/login", (req, res) => {
    try {
        const user = models.verifyUser(req.body.username, req.body.password);
        if (!user) return res.render("login", { error: "用户名或密码错误", redirect: req.body.redirect || "/", title: "登录" });
        req.session.user = { id: user.id, username: user.username, is_admin: user.is_admin, is_member: user.is_member };
        models.checkReferralReward(user.id);
        res.redirect(req.body.redirect || "/");
    } catch (e) {
        console.error("Login error:", e);
        res.render("login", { error: "登录失败，请重试", redirect: "/", title: "登录" });
    }
});

app.get("/register", (req, res) => {
    if (req.session.user) return res.redirect("/");
    res.render("register", { error: null, ref: req.query.ref || "", title: "注册" });
});

app.post("/register", (req, res) => {
    try {
        const { username, password, confirmPassword, email, ref } = req.body;
        if (password !== confirmPassword) return res.render("register", { error: "两次密码不一致", ref: ref||"", title: "注册" });
        if (password.length < 4) return res.render("register", { error: "密码至少4位", ref: ref||"", title: "注册" });
        const user = models.createUser(username, password, email, ref || null);
        if (!user) return res.render("register", { error: "用户名或邮箱已被使用", ref: ref||"", title: "注册" });
        req.session.user = { id: user.id, username: user.username, is_admin: user.is_admin, is_member: user.is_member };
        res.redirect("/");
    } catch (e) {
        console.error("Register error:", e);
        res.render("register", { error: "注册失败，请重试", ref: "", title: "注册" });
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
});

// ========== USER ROUTES ==========

app.get("/profile", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    try {
        const user = models.getUser(req.session.user.id);
        const downloads = models.getUserDownloads(user.id, 20);
        const refCount = models.getValidReferralCount(user.id);
        res.render("profile", { user, downloads, refCount, title: "个人中心" });
    } catch (e) {
        console.error("Profile error:", e);
        res.status(500).render("error", { message: "服务器内部错误" });
    }
});

app.get("/membership", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    try {
        const user = models.getUser(req.session.user.id);
        const refCount = models.getValidReferralCount(user.id);
        res.render("membership", { user, refCount, alreadyMember: !!user.is_member, title: "会员中心" });
    } catch (e) {
        console.error("Membership error:", e);
        res.status(500).render("error", { message: "服务器内部错误" });
    }
});

app.post("/membership/pay", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    try {
        const user = models.getUser(req.session.user.id);
        if (user.is_member) return res.redirect("/membership");
        const order = models.createOrder(user.id, "membership", 10);
        models.completeOrder(order.id);
        req.session.user.is_member = 1;
        res.redirect("/membership?paid=1");
    } catch (e) {
        console.error("Payment error:", e);
        res.status(500).render("error", { message: "支付处理失败" });
    }
});

app.get("/referral", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    try {
        const user = models.getUser(req.session.user.id);
        const refCount = models.getValidReferralCount(user.id);
        const refUrl = req.protocol + "://" + req.get("host") + "/register?ref=" + user.referral_code;
        const referrals = getTable("referrals")
            .filter(r => r.referrer_id === user.id)
            .map(r => {
                const u = getTable("users").find(u => u.id === r.referred_user_id);
                return { username: u ? u.username : "未知", registered_date: r.created_date, membership_fee_paid: u ? u.membership_fee_paid : 0 };
            })
            .sort((a, b) => new Date(b.registered_date) - new Date(a.registered_date));
        res.render("referral", { user, refUrl, refCount, referrals, title: "推广中心" });
    } catch (e) {
        console.error("Referral error:", e);
        res.status(500).render("error", { message: "服务器内部错误" });
    }
});

// ========== ADMIN ROUTES ==========

function requireAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.is_admin) return res.status(403).render("error", { message: "需要管理员权限" });
    next();
}

app.get("/admin", requireAdmin, (req, res) => {
    try {
        const stats = models.getWeeklyStats();
        const dailyStats = models.getDailyStats(14);
        const productStats = models.getProductStats();
        const report = models.getLatestReport();
        res.render("admin_dashboard", { stats, dailyStats, productStats, report, title: "管理后台" });
    } catch (e) {
        console.error("Admin dashboard error:", e);
        res.status(500).render("error", { message: "服务器内部错误" });
    }
});

app.get("/admin/products", requireAdmin, (req, res) => {
    try {
        const products = models.getProducts(null, null, false);
        res.render("admin_products", { products, title: "商品管理" });
    } catch (e) {
        console.error("Admin products error:", e);
        res.status(500).render("error", { message: "服务器内部错误" });
    }
});

app.get("/admin/products/new", requireAdmin, (req, res) => {
    res.render("admin_product_form", { product: null, error: null, title: "新增商品" });
});

app.post("/admin/products/new", requireAdmin, (req, res) => {
    try {
        const { title, description, category_id, download_link, cover_image_url, file_size, file_type, tags } = req.body;
        if (!title || !download_link) return res.render("admin_product_form", { product: null, error: "标题和下载链接为必填", title: "新增商品" });
        models.adminAddProduct(title, description||"", category_id, download_link, cover_image_url||"", file_size||"", file_type||"", tags||"");
        res.redirect("/admin/products");
    } catch (e) {
        console.error("Admin add product error:", e);
        res.render("admin_product_form", { product: null, error: "添加失败", title: "新增商品" });
    }
});

app.get("/admin/products/edit/:id", requireAdmin, (req, res) => {
    try {
        const product = models.getProduct(req.params.id);
        if (!product) return res.redirect("/admin/products");
        res.render("admin_product_form", { product, error: null, title: "编辑商品" });
    } catch (e) { res.redirect("/admin/products"); }
});

app.post("/admin/products/edit/:id", requireAdmin, (req, res) => {
    try {
        const { title, description, category_id, download_link, cover_image_url, file_size, file_type, tags, is_active } = req.body;
        models.adminUpdateProduct(req.params.id, title, description, category_id, download_link, cover_image_url, file_size, file_type, tags, is_active === "on");
        res.redirect("/admin/products");
    } catch (e) { res.redirect("/admin/products"); }
});

app.post("/admin/products/delete/:id", requireAdmin, (req, res) => {
    try { models.adminDeleteProduct(req.params.id); } catch(e) {}
    res.redirect("/admin/products");
});

app.get("/admin/categories", requireAdmin, (req, res) => {
    res.render("admin_categories", { title: "分类管理" });
});

app.post("/admin/categories/new", requireAdmin, (req, res) => {
    try {
        const { name, description } = req.body;
        if (name) models.adminAddCategory(name, description||"");
    } catch(e) {}
    res.redirect("/admin/categories");
});

app.post("/admin/categories/delete/:id", requireAdmin, (req, res) => {
    try { models.adminDeleteCategory(req.params.id); } catch(e) {}
    res.redirect("/admin/categories");
});

app.get("/admin/orders", requireAdmin, (req, res) => {
    try {
        const orders = models.getAllOrders();
        res.render("admin_orders", { orders, title: "订单管理" });
    } catch (e) {
        console.error("Admin orders error:", e);
        res.status(500).render("error", { message: "服务器内部错误" });
    }
});

app.get("/admin/users", requireAdmin, (req, res) => {
    try {
        const users = models.getAllUsers();
        res.render("admin_users", { users, title: "用户管理" });
    } catch (e) {
        console.error("Admin users error:", e);
        res.status(500).render("error", { message: "服务器内部错误" });
    }
});

app.get("/admin/report", requireAdmin, (req, res) => {
    try {
        const report = models.generateWeeklyReport();
        res.render("admin_report", { report, title: "运营周报" });
    } catch (e) {
        console.error("Admin report error:", e);
        res.status(500).render("error", { message: "生成周报失败" });
    }
});

app.get("/admin/report/latest", requireAdmin, (req, res) => {
    try {
        const report = models.getLatestReport();
        res.render("admin_report", { report, title: "最新周报" });
    } catch (e) {
        console.error("Admin report latest error:", e);
        res.status(500).render("error", { message: "获取周报失败" });
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).send("服务器内部错误");
});

process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err);
});

// ========== START ==========
try {
    initDB();
    app.listen(PORT, "0.0.0.0", () => {
        console.log("=".repeat(50));
        console.log("  ✅ 虚拟资料商城已启动!");
        console.log("  🌐 http://localhost:" + PORT);
        console.log("  👤 管理员账号: admin / admin123");
        console.log("=".repeat(50));
    });
} catch (e) {
    console.error("启动失败:", e);
    process.exit(1);
}
