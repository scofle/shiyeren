/* ============================================================
   破薪阁 — 主脚本
   功能：今日回声随机语句 / 汉堡菜单 / 分类筛选
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initHamburger();
  initEcho();
  initCategoryFilter();
  initResourceTabs();
});

/* --- 100 条温暖语句库 --- */
const QUOTES = [
  "你愿意把这句话说出来，已经是在照顾自己了。",
  "现在的不确定，不是你做错了什么。",
  "允许自己暂时停下来。",
  "这不是空白，这是休整期。",
  "你不需要立刻好起来。",
  "能被你察觉到的情绪，都在慢慢松动。",
  "今天能打开这里，就已经很不容易了。",
  "你可以不安，也可以同时往前走一小步。",
  "你没有被落在后面，你只是在走自己的节奏。",
  "这里记住了，你可以去休息了。",
  "此刻的存在本身，就已经足够。",
  "你的感受是真实的，也是被允许的。",
  "不需要解决任何问题，你只要在这里就好。",
  "暂时看不清方向，不代表没有路。",
  "你已经做得很好了，只是还没看到结果而已。",
  "失落和希望可以同时存在。",
  "允许自己做一个还没想清楚的人。",
  "你今天撑过来了，这件事本身就值得被肯定。",
  "不用急着变好，先活着就好。",
  "你的节奏不需要和任何人同步。",
  "有些日子就是用来缓慢度过的。",
  "你不需要对任何人证明自己的价值。",
  "累了就是累了，不需要理由。",
  "没有人有资格评判你现在的状态。",
  "你可以什么都不做，这完全没问题。",
  "今天没有进步也没关系。",
  "你的存在本身就有意义，不需要附加条件。",
  "这不是终点，只是一个需要休息的拐角。",
  "你有权利感到焦虑，也有权利慢慢来。",
  "这里不会评判你，也不会催你。",
  "你不是一个人在面对这一切。",
  "把你压垮的不是脆弱，是你撑了太久。",
  "你已经很努力了，暂时松一口气吧。",
  "有些路走着走着就亮了。",
  "不是所有的成长都看得见。",
  "你的价值从来不等于你的工作状态。",
  "现在的一切都在流动，不会永远这样。",
  "你已经挺过了之前的所有难关，这次也一样。",
  "不必规划太远，只关心接下来的一小时就好。",
  "你值得被温柔对待，包括来自你自己的。",
  "停滞期也是在积蓄力量。",
  "你不需要马上找到答案。",
  "有些日子是用来掉头的，不是用来赶路的。",
  "你已经做得够多了。",
  "今天能有这样的觉察，就是很好的信号。",
  "你不是在倒退，你是在重新选择。",
  "允许自己还没有准备好。",
  "这条路上的风景，并不是只有目的地才值得看。",
  "你的存在不是任务，不需要时刻高效。",
  "遇到低谷不代表你做错了选择。",
  "空窗期不是空白期，你在为你自己腾出空间。",
  "你不需要立刻变强，现在这样也很好。",
  "有些答案需要时间才能走到你面前。",
  "这里听完了，你可以轻一点呼吸了。",
  "不必感谢痛苦，但你可以感谢坚持到现在的自己。",
  "你不是负担，你只是需要一个暂停键。",
  "沉默和停顿都是旅程的一部分。",
  "你不需要对任何人解释你的现状。",
  "给自己一点时间，像对待一个好朋友那样。",
  "你已经很勇敢了，因为你还愿意来面对自己。",
  "休息不是浪费，是必要的修复。",
  "你的感受不会永远这么重。",
  "有些人正在走你走过的路，你并不孤独。",
  "允许自己不完美地度过这一天。",
  "你不需要马上去解决所有问题。",
  "这里不会催你，也不会离开。",
  "你的存在本身就是一种价值。",
  "有些伤口只是需要时间，而不是解决方案。",
  "你已经走过了很远的路，只是暂时累了。",
  "不必要求自己立刻有方向。",
  "今天什么都不想做，就是今天该做的事。",
  "你不是不够好，你只是还没遇到适合你的节奏。",
  "允许自己在迷雾中站着。",
  "有些力量是在静止中长出来的。",
  "你不需要成为一个永远积极的人。",
  "现在的你，已经是最好的你。",
  "这里听到你，也相信你。",
  "有些答案会在你不寻找的时候到来。",
  "不必为低落而感到抱歉。",
  "你的沉默和不安都被允许。",
  "你不是一个人在面对这些。",
  "有些日子是用来迷路的，不是用来赶路的。",
  "你的感受很重要，这里认真听着。",
  "不需要急着摆脱现在的状态，慢慢来。",
  "你能意识到自己的情绪，这已经是很大的进步。",
  "这里不会忘记你，也不会催促你。",
  "有些力量是从停顿中重新积蓄的。",
  "你不需要成为任何人。",
  "现在的停顿，是你未来某一天会感谢的休息。",
  "你已经足够好了，不需要再证明什么。",
  "有些门关上了，是因为有更适合的还没打开。",
  "你可以害怕，也可以同时往前走。",
  "这里不会要求你变好，只希望你轻松一点。",
  "你的存在不是一种等待，而是一种正在发生。",
  "有些日子，只要呼吸就已经足够。",
  "你不是走得太慢，你只是走了一条属于自己的路。",
  "你的感受不需要和别人比较。",
  "这里会一直在这里，不需要你表现得好才回来。",
  "你不必一个人扛着所有事情。",
];

/* --- 汉堡菜单 --- */
function initHamburger() {
  const btn = document.querySelector(".hamburger");
  const nav = document.querySelector(".nav-links");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    btn.classList.toggle("active");
    nav.classList.toggle("open");
    document.body.style.overflow = nav.classList.contains("open") ? "hidden" : "";
  });

  // 点击菜单项自动关闭
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      btn.classList.remove("active");
      nav.classList.remove("open");
      document.body.style.overflow = "";
    });
  });
}

/* --- 今日回声 --- */
function initEcho() {
  const el = document.getElementById("echo-text");
  if (!el) return;
  const idx = Math.floor(Math.random() * QUOTES.length);
  el.textContent = QUOTES[idx];
}

/* --- 搞钱案例分类筛选 --- */
function initCategoryFilter() {
  const buttons = document.querySelectorAll(".category-filter button");
  const cards = document.querySelectorAll(".case-card[data-category]");
  if (!buttons.length || !cards.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const cat = btn.dataset.category;
      cards.forEach((card) => {
        card.style.display = cat === "all" || card.dataset.category === cat ? "" : "none";
      });
    });
  });
}

/* --- 资料分类标签切换 --- */
function initResourceTabs() {
  const buttons = document.querySelectorAll(".resource-tabs button");
  const cards = document.querySelectorAll(".resource-card[data-category]");
  if (!buttons.length || !cards.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const cat = btn.dataset.category;
      cards.forEach((card) => {
        card.style.display = cat === "all" || card.dataset.category === cat ? "" : "none";
      });
    });
  });
}
