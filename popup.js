// popup.js Made by Google Gemini and fixed by @CTXL1029

document.addEventListener('DOMContentLoaded', () => {
    const autoCopyToggle = document.getElementById('autoCopyToggle');
    const manualCopyButton = document.getElementById('manualCopyButton');
    const keywordCopyButton = document.getElementById('keywordCopyButton'); // Đã thêm: Lấy phần tử nút mới

    // ** DEBUGGING TIP: Kiểm tra xem các phần tử có được tìm thấy không **
    if (!autoCopyToggle) {
        console.error("Lỗi: Không tìm thấy phần tử 'autoCopyToggle'!");
        return;
    }
    if (!manualCopyButton) {
        console.error("Lỗi: Không tìm thấy phần tử 'manualCopyButton'!");
        return;
    }
    if (!keywordCopyButton) { // Đã thêm: Kiểm tra nút mới
        console.error("Lỗi: Không tìm thấy phần tử 'keywordCopyButton'!");
        return;
    }
    // *******************************************************************

    // Tải trạng thái công tắc từ Chrome Storage khi popup mở
    chrome.storage.sync.get('autoCopyEnabled', (data) => {
        const isEnabled = data.autoCopyEnabled !== false;
        autoCopyToggle.checked = isEnabled;
        updateButtonVisibility(isEnabled);
    });

    // Lắng nghe sự kiện thay đổi của công tắc
    autoCopyToggle.addEventListener('change', () => {
        const isEnabled = autoCopyToggle.checked;
        chrome.storage.sync.set({ autoCopyEnabled: isEnabled }, () => {
            console.log('Auto-copy setting saved:', isEnabled);
            updateButtonVisibility(isEnabled);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
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
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "manualCopy" });
            }
        });
        window.close();
    });

    // --- Logic cho nút mở liên kết từ khóa MỚI ---
    let matchedUrlToOpen = null; // Thay đổi từ matchedTextToCopy

    // Khi popup mở, kiểm tra URL hiện tại và hiển thị/ẩn nút
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const currentTabUrl = tabs[0].url;
            chrome.runtime.sendMessage({ action: "getKeywordCopyText", url: currentTabUrl }, (response) => {
                if (response && response.urlToOpen) { // Kiểm tra urlToOpen thay vì textToCopy
                    matchedUrlToOpen = response.urlToOpen;
                    keywordCopyButton.style.display = 'block'; // Hiển thị nút
                } else {
                    keywordCopyButton.style.display = 'none'; // Ẩn nút nếu không tìm thấy
                }
            });
        }
    });

    // Lắng nghe sự kiện click cho nút mở liên kết từ khóa
    keywordCopyButton.addEventListener('click', () => {
        if (matchedUrlToOpen) {
            // Gửi thông điệp đến background script để mở URL
            chrome.runtime.sendMessage({ action: "openKeywordLink", url: matchedUrlToOpen }, (response) => {
                if (response && response.success) {
                    console.log('[Get HydraX / Abyss vid_id - Popup] Opened keyword link successfully.');
                } else {
                    console.error('[Get HydraX / Abyss vid_id - Popup] Failed to open keyword link:', response.message);
                    alert('Không thể mở liên kết từ khóa.');
                }
            });
        }
        window.close(); // Đóng popup sau khi mở liên kết
    });

    // Cập nhật hiển thị của nút sao chép thủ công dựa trên trạng thái công tắc
    function updateButtonVisibility(isAutoEnabled) {
        if (isAutoEnabled) {
            manualCopyButton.style.display = 'none';
        } else {
            manualCopyButton.style.display = 'block';
        }
    }
});