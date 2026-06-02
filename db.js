const fs = require("fs");
const path = require("path");

// Zeabur 使用 /data 作为持久化存储目录，本地开发用项目下的 data
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");

const defaults = {
    users: [], categories: [], products: [], downloads: [],
    orders: [], daily_stats: [], weekly_reports: [], referrals: [], site_config: {}
};

const cache = {};

function getTable(name) {
    if (cache[name]) return cache[name];
    const filePath = path.join(DATA_DIR, name + ".json");
    if (fs.existsSync(filePath)) {
        try { cache[name] = JSON.parse(fs.readFileSync(filePath, "utf8")); }
        catch (e) { cache[name] = JSON.parse(JSON.stringify(defaults[name] || [])); }
    } else {
        cache[name] = JSON.parse(JSON.stringify(defaults[name] || []));
    }
    return cache[name];
}

function saveTable(name) {
    const data = cache[name];
    if (data !== undefined) {
        fs.writeFileSync(path.join(DATA_DIR, name + ".json"), JSON.stringify(data, null, 2), "utf8");
    }
}

function saveAll() {
    Object.keys(cache).forEach(name => saveTable(name));
}

function initDB() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    ["users","categories","products","downloads","orders","daily_stats","weekly_reports","referrals","site_config"].forEach(name => getTable(name));

    const bcrypt = require("bcryptjs");
    const users = getTable("users");
    if (!users.find(u => u.username === "admin")) {
        users.push({
            id: 1, username: "admin",
            password_hash: bcrypt.hashSync("admin123", 10),
            email: "admin@example.com", avatar: "",
            registered_date: new Date().toISOString().replace("T", " ").substring(0, 19),
            is_member: 1, member_expiry_date: null, is_admin: 1,
            membership_fee_paid: 1, referral_code: "admin001", balance: 0
        });
    }

    const cats = getTable("categories");
    const defaultCats = ["电子书", "模板素材", "设计资源", "课程教程", "软件工具", "其他"];
    defaultCats.forEach((name, i) => {
        if (!cats.find(c => c.name === name)) {
            cats.push({ id: cats.length + 1, name, description: "", sort_order: i, created_date: new Date().toISOString().replace("T", " ").substring(0, 19) });
        }
    });

    saveAll();
    console.log("✅ 数据库初始化完成! 默认管理员: admin / admin123");
    console.log("   数据存储目录:", DATA_DIR);
}

function nextId(table) {
    const data = getTable(table);
    if (data.length === 0) return 1;
    return Math.max(...data.map(item => item.id || 0)) + 1;
}

function now() { return new Date().toISOString().replace("T", " ").substring(0, 19); }
function today() { return new Date().toISOString().split("T")[0]; }

module.exports = { initDB, getTable, saveTable, saveAll, nextId, now, today };
