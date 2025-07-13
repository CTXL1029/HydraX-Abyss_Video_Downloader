// background.js Made by Google Gemini and fixed by @CTXL1029

// Hàm để thực hiện sao chép trong ngữ cảnh của trang web (sẽ được inject)
function injectCopyScript(textToCopy) {
    // alert(`[Get HydraX / Abyss vid_id - Inject] Đang sao chép: ${textToCopy}`); // Dùng để debug
    try {
        // Cố gắng sử dụng navigator.clipboard.writeText() trước
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => console.log(`[Get HydraX / Abyss vid_id - Inject] Successfully copied to clipboard (navigator): ${textToCopy}`))
                .catch(err => {
                    console.error(`[Get HydraX / Abyss vid_id - Inject] Failed to copy using navigator.clipboard:`, err);
                    // Fallback sang execCommand nếu navigator.clipboard không được phép
                    fallbackCopyToClipboard(textToCopy);
                });
        } else {
            // Fallback ngay lập tức nếu navigator.clipboard không có
            console.warn('[Get HydraX / Abyss vid_id - Inject] navigator.clipboard.writeText not available, falling back to execCommand.');
            fallbackCopyToClipboard(textToCopy);
        }
    } catch (err) {
        // Fallback cho bất kỳ lỗi nào khác
        console.error('[Get HydraX / Abyss vid_id - Inject] Error with navigator.clipboard, falling back:', err);
        fallbackCopyToClipboard(textToCopy);
    }

    function fallbackCopyToClipboard(text) {
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
                console.log(`[Get HydraX / Abyss vid_id - Inject] Successfully copied to clipboard (execCommand): ${text}`);
            } else {
                console.error('[Get HydraX / Abyss vid_id - Inject] Failed to copy using execCommand (returned false).');
            }
        } catch (err) {
            console.error('[Get HydraX / Abyss vid_id - Inject] Error during execCommand copy:', err);
        } finally {
            document.body.removeChild(textArea);
        }
    }
}


// Lắng nghe thông điệp từ content scripts (và popup)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "autoCopyIds") {
        const idsToCopy = request.ids.join('\n');
        const tabId = sender.tab.id;

        console.log(`[Get HydraX / Abyss vid_id - Background] Received request to auto-copy IDs from tab ${tabId}:`, idsToCopy);

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: injectCopyScript,
            args: [idsToCopy]
        })
        .then(() => {
            console.log(`[Get HydraX / Abyss vid_id - Background] Auto-copy script injected successfully for tab ${tabId}.`);
            chrome.tabs.sendMessage(tabId, {
                action: "autoCopyStatus",
                success: true,
                message: `Tự động sao chép vid_id thành công: ${idsToCopy}`
            });
            sendResponse({ status: "copy script injected" });
        })
        .catch(error => {
            console.error(`[Get HydraX / Abyss vid_id - Background] Failed to inject auto-copy script for tab ${tabId}:`, error);
            chrome.tabs.sendMessage(tabId, {
                action: "autoCopyStatus",
                success: false,
                message: `Không thể tự động sao chép vid_id. (Lỗi: ${error.message})`
            });
            sendResponse({ status: "copy script injection failed" });
        });
    } else if (request.action === "getAutoCopySetting") {
        chrome.storage.sync.get('autoCopyEnabled', (data) => {
            const isEnabled = data.autoCopyEnabled !== false;
            sendResponse({ autoCopyEnabled: isEnabled });
        });
        return true;
    } else if (request.action === "getKeywordCopyText") { // <-- Đã thêm lại
        const currentUrl = request.url;
        chrome.storage.sync.get('keywordCopyData', (data) => {
            const keywordData = data.keywordCopyData || [];
            let urlToOpen = null;

            for (const item of keywordData) {
                if (currentUrl.includes(item.keyword)) {
                    urlToOpen = item.urlToOpen;
                    break;
                }
            }
            sendResponse({ urlToOpen: urlToOpen });
        });
        return true;
    } else if (request.action === "openKeywordLink") { // <-- Đã thêm lại
        const url = request.url;
        if (url) {
            chrome.tabs.create({ url: url, active: true });
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, message: "URL không hợp lệ." });
        }
    }
});

// Lifecycle listener
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Get HydraX / Abyss vid_id - Background] Extension installed/updated.');
    // Tải dữ liệu từ keyword_data.json vào storage khi cài đặt/cập nhật
    fetch(chrome.runtime.getURL('keyword_data.json'))
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            chrome.storage.sync.set({ keywordCopyData: data }, () => {
                console.log('[Get HydraX / Abyss vid_id - Background] Keyword data loaded and saved to storage.');
            });
        })
        .catch(e => console.error('[Get HydraX / Abyss vid_id - Background] Failed to load keyword_data.json:', e));
});

chrome.runtime.onStartup.addListener(() => {
    console.log('[Get HydraX / Abyss vid_id - Background] Extension started up.');
    // Đảm bảo dữ liệu được tải lại vào storage khi startup
    fetch(chrome.runtime.getURL('keyword_data.json'))
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            chrome.storage.sync.set({ keywordCopyData: data }, () => {
                console.log('[Get HydraX / Abyss vid_id - Background] Keyword data reloaded on startup.');
            });
        })
        .catch(e => console.error('[Get HydraX / Abyss vid_id - Background] Failed to load keyword_data.json on startup:', e));
});