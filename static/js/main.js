// Main JavaScript
document.addEventListener("DOMContentLoaded", function() {
    // Auto-hide alerts after 5 seconds
    document.querySelectorAll(".alert-dismissible").forEach(function(el) {
        setTimeout(function() { el.style.display = "none"; }, 5000);
    });

    // Toast notification for paid success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("paid") === "1") {
        alert("🎉 支付成功! 欢迎成为会员，现在可以免费下载所有资料了!");
    }
});
