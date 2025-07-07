// popup.js Made by Google Gemini and fixed by @CTXL1029

document.addEventListener('DOMContentLoaded', () => {
    const autoCopyToggle = document.getElementById('autoCopyToggle');
    const manualCopyButton = document.getElementById('manualCopyButton');

    // ** DEBUGGING TIP: Kiểm tra xem các phần tử có được tìm thấy không **
    if (!autoCopyToggle) {
        console.error("Lỗi: Không tìm thấy phần tử 'autoCopyToggle'!");
        return; // Dừng script nếu không tìm thấy phần tử quan trọng
    }
    if (!manualCopyButton) {
        console.error("Lỗi: Không tìm thấy phần tử 'manualCopyButton'!");
        return; // Dừng script nếu không tìm thấy phần tử quan trọng
    }
    // *******************************************************************

    // Tải trạng thái công tắc từ Chrome Storage khi popup mở
    chrome.storage.sync.get('autoCopyEnabled', (data) => {
        const isEnabled = data.autoCopyEnabled !== false; // Mặc định là true nếu chưa có
        autoCopyToggle.checked = isEnabled;
        updateButtonVisibility(isEnabled);
    });

    // Lắng nghe sự kiện thay đổi của công tắc
    autoCopyToggle.addEventListener('change', () => {
        const isEnabled = autoCopyToggle.checked;
        chrome.storage.sync.set({ autoCopyEnabled: isEnabled }, () => {
            console.log('Auto-copy setting saved:', isEnabled);
            updateButtonVisibility(isEnabled);
            // Gửi thông điệp đến content script để cập nhật hành vi
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) { // Đảm bảo có tab hợp lệ
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "updateAutoCopySetting",
                        enabled: isEnabled
                    });
                }
            });
        });
    });

    // Lắng nghe sự kiện click của nút sao chép thủ công
    manualCopyButton.addEventListener('click', () => {
        // Gửi thông điệp đến content script để thực hiện sao chép thủ công
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) { // Đảm bảo có tab hợp lệ
                chrome.tabs.sendMessage(tabs[0].id, { action: "manualCopy" });
            }
        });
        // Tự động đóng popup sau khi nhấn nút sao chép
        window.close();
    });

    // Cập nhật hiển thị của nút sao chép dựa trên trạng thái công tắc
    function updateButtonVisibility(isAutoEnabled) {
        if (isAutoEnabled) {
            manualCopyButton.style.display = 'none'; // Ẩn nút khi tự động bật
        } else {
            manualCopyButton.style.display = 'block'; // Hiển thị nút khi tự động tắt
        }
    }
});