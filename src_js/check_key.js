document.getElementById('activate-btn').addEventListener('click', async function() {
    const key = document.getElementById('license-key').value.trim();
    const status = document.getElementById('activation-status');

    if (!key) {
        status.textContent = "Vui lòng nhập key trước khi kích hoạt.";
        status.className = "activation-status error";
        return;
    }

    try {
        const result = await eel.main_check_key(key)(); // <-- nhớ có () sau cùng
        console.log("Kết quả check:", result);

        if (result.data === true) {
            status.textContent = "✅ Kích hoạt thành công!";
            status.className = "activation-status success";
            // eel.start("index.html", size=(1200, 800))
        } else {
            status.textContent = "❌ " + (result.status || "Key không hợp lệ hoặc đã hết hạn.");
            status.className = "activation-status error";
        }
    } catch (error) {
        console.error("Lỗi:", error);
        status.textContent = "⚠️ Lỗi kết nối đến server.";
        status.className = "activation-status error";
    }
    // // Giả lập kiểm tra key (sau này có thể kết nối Eel hoặc API Python)
    // if (key === "DEMO-1234-5678-ABCD") {
    //     status.textContent = "✅ Kích hoạt thành công!";
    //     status.className = "activation-status success";
    //     // Chuyển sang trang chính
    //     setTimeout(() => window.location.href = "index.html", 1500);
    // } else {
    //     status.textContent = "❌ Key không hợp lệ hoặc đã hết hạn.";
    //     status.className = "activation-status error";
    // }
});