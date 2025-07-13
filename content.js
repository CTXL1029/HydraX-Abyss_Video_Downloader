// content.js Made by Google Gemini and fixed by @CTXL1029

(function() {
    'use strict';

    const collectedIds = new Set();
    let isAutoCopyEnabled = true; // Mặc định ban đầu, sẽ được ghi đè bởi giá trị từ storage

    // Hàm để trích xuất và lưu trữ ID từ URL
    function extractAndStoreId(url) {
        try {
            const urlObj = new URL(url);
            let path = urlObj.pathname;
            if (path.startsWith('/')) {
                path = path.substring(1);
            }
            if (path.length > 0) {
                if (!collectedIds.has(path)) {
                    collectedIds.add(path);
                    return path;
                }
            }
        } catch (e) {
            console.warn(`[Get HydraX / Abyss vid_id] Could not parse URL: ${url}`, e);
        }
        return null;
    }

    // Hàm sao chép cục bộ cho các thao tác có tương tác người dùng (từ nút thủ công)
    function copyToClipboardLocal(text) {
        if (!text || text.length === 0) {
            console.warn('[Get HydraX / Abyss vid_id] No ID to copy locally.');
            return;
        }
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                console.log(`[Get HydraX / Abyss vid_id] Copied to clipboard (local): ${text}`);
                alert(`[Get HydraX / Abyss vid_id]\nĐã sao chép vid_id vào bảng nhớ tạm: ${text}`); // Đã sửa
            } else {
                console.error('[Get HydraX / Abyss vid_id] Failed to copy to clipboard locally using execCommand.');
                alert(`[Get HydraX / Abyss vid_id]\nKhông thể sao chép ID thủ công (execCommand thất bại).`);
            }
        } catch (err) {
            console.error('[Get HydraX / Abyss vid_id] Failed to copy to clipboard locally:', err);
            alert(`[Get HydraX / Abyss vid_id]\nKhông thể sao chép ID thủ công. Vui lòng cho phép truy cập bảng nhớ tạm.`);
        } finally {
            document.body.removeChild(textArea);
        }
    }

    // Hàm sao chép ID hiện tại (được gọi từ popup - nút thủ công)
    function copyCurrentVideoIdManually() {
        collectedIds.clear();
        // Quét lại để lấy ID mới nhất, sau đó sao chép thủ công
        scanAndProcessShortIcuIds(true); // Truyền true để chỉ ra là manual copy, không quan tâm isAutoCopyEnabled
        if (collectedIds.size > 0) {
            copyToClipboardLocal(Array.from(collectedIds).join('\n'));
        } else {
            alert('Không tìm thấy vid_id nào để sao chép trên trang này.');
        }
    }

    // Hàm quét và xử lý các ID short.icu
    // Thêm đối số forceCopyManually để bỏ qua kiểm tra isAutoCopyEnabled
    function scanAndProcessShortIcuIds(forceCopyManually = false) {
        let newIdsFound = 0;
        const elements = document.querySelectorAll(
            'iframe[src*="short.icu"], ' +
            'a[href*="short.icu"], ' +
            'script[src*="short.icu"], ' +
            'img[src*="short.icu"]'
        );

        elements.forEach(element => {
            let url = '';
            if (element.hasAttribute('src')) {
                url = element.src;
            } else if (element.hasAttribute('href')) {
                url = element.href;
            }

            if (url && url.includes('short.icu')) {
                const newId = extractAndStoreId(url);
                if (newId) {
                    newIdsFound++;
                }
            }
        });

        if (newIdsFound > 0) {
            console.log(`[Get HydraX / Abyss vid_id] Found ${newIdsFound} new short.icu IDs. Total: ${collectedIds.size}`);
            
            // Logic cho chế độ tự động sao chép
            // Chỉ sao chép tự động nếu bật và không phải là yêu cầu thủ công
            if (isAutoCopyEnabled && !forceCopyManually) {
                // Gửi thông điệp đến background script để yêu cầu sao chép tự động
                chrome.runtime.sendMessage({
                    action: "autoCopyIds",
                    ids: Array.from(collectedIds)
                });
                // alert(`[Get HydraX / Abyss vid_id]\nĐã sao chép vid_id tự động thành công: ${text}`); // Đã bỏ alert ở đây vì background sẽ gửi lại status
                console.log('[Get HydraX / Abyss vid_id] Đã gửi ID đến background để yêu cầu sao chép tự động.');
            } else if (!isAutoCopyEnabled && !forceCopyManually) {
                console.log('[Get HydraX / Abyss vid_id] Chế độ tự động sao chép đang TẮT. Không sao chép tự động.');
            }
            // else if (forceCopyManually) thì đã được xử lý trong copyCurrentVideoIdManually
        }
    }

    // --- MutationObserver để phát hiện các phần tử được thêm động ---
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Chỉ gọi scanAndProcessShortIcuIds mà không ép buộc sao chép thủ công
                scanAndProcessShortIcuIds();
            }
        });
    });

    // --- Lắng nghe thông điệp từ Popup (và Background) ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "updateAutoCopySetting") {
            isAutoCopyEnabled = request.enabled; // Cập nhật biến trạng thái cục bộ
            console.log('[Get HydraX / Abyss vid_id] Cài đặt tự động sao chép đã cập nhật thành:', isAutoCopyEnabled);

            // Quan trọng: Gọi lại scanAndProcessShortIcuIds sau khi cập nhật trạng thái
            // để đảm bảo hành vi tự động ngay lập tức thay đổi nếu ID đã có trên trang.
            scanAndProcessShortIcuIds();

            sendResponse({ status: "setting updated" });
        } else if (request.action === "manualCopy") {
            console.log('[Get HydraX / Abyss vid_id] Yêu cầu sao chép thủ công từ popup.');
            copyCurrentVideoIdManually();
            sendResponse({ status: "manual copy done" });
        } else if (request.action === "autoCopyStatus") { // Xử lý thông báo trạng thái từ background
            if (request.success) {
                alert(`[Get HydraX / Abyss vid_id]\n${request.message}`);
                console.log(`[Get HydraX / Abyss vid_id] Thông báo sao chép tự động: ${request.message}`);
            } else {
                alert(`[Get HydraX / Abyss vid_id]\n${request.message}`);
                console.error(`[Get HydraX / Abyss vid_id] Lỗi sao chép tự động: ${request.message}`);
            }
        }
        return true;
    });

    // --- Tải trạng thái tự động sao chép từ storage khi content script được tải ---
    // Đây là phần QUAN TRỌNG NHẤT để đảm bảo trạng thái đúng đắn ngay khi content script được chèn.
    chrome.storage.sync.get('autoCopyEnabled', (data) => {
        // Nếu autoCopyEnabled chưa được định nghĩa (chưa từng được lưu), mặc định là true.
        // Ngược lại, sử dụng giá trị đã lưu.
        isAutoCopyEnabled = (data.autoCopyEnabled === undefined || data.autoCopyEnabled === null) ? true : data.autoCopyEnabled;
        console.log('[Get HydraX / Abyss vid_id] Cài đặt tự động sao chép ban đầu từ storage:', isAutoCopyEnabled);

        // Sau khi có được trạng thái ban đầu, thực hiện quét lần đầu tiên.
        // Thứ tự này là rất quan trọng để tránh sao chép khi tự động đang tắt.
        scanAndProcessShortIcuIds();

        // Bắt đầu quan sát DOM sau khi đã có trạng thái khởi tạo
        observer.observe(document.documentElement, { childList: true, subtree: true });
    });

    // --- Lắng nghe sự kiện tải trang hoàn tất để quét lại ---
    // Dòng này cần được gọi SAU KHI isAutoCopyEnabled đã được khởi tạo từ storage.
    // Nếu bạn muốn nó chạy sau khi tất cả tài nguyên đã tải, hãy đảm bảo nó không gây ra lỗi.
    window.addEventListener('load', () => {
        console.log('[Get HydraX / Abyss vid_id] Trang đã tải hoàn tất. Thực hiện quét cuối cùng.');
        scanAndProcessShortIcuIds();
    });

})();