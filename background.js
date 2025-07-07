// background.js Made by Google Gemini and fixed by @CTXL1029

// Hàm để thực hiện sao chép trong ngữ cảnh của trang web (sẽ được inject)
// Hàm này sẽ được truyền vào chrome.scripting.executeScript
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
        const tabId = sender.tab.id; // Lấy ID của tab gửi thông điệp

        console.log(`[Get HydraX / Abyss vid_id - Background] Received request to auto-copy IDs from tab ${tabId}:`, idsToCopy);

        // Sử dụng chrome.scripting.executeScript để inject hàm sao chép vào tab đó
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: injectCopyScript, // Hàm sẽ được inject
            args: [idsToCopy] // Đối số truyền vào hàm
        })
        .then(() => {
            console.log(`[Get HydraX / Abyss vid_id - Background] Auto-copy script injected successfully for tab ${tabId}.`);
            // Có thể gửi phản hồi về content.js nếu muốn hiển thị alert
            chrome.tabs.sendMessage(tabId, {
                action: "autoCopyStatus",
                success: true,
                message: `Tự động sao chép vid_id thành công: ${idsToCopy}`
            });
            sendResponse({ status: "copy script injected" });
        })
        .catch(error => {
            console.error(`[Get HydraX / Abyss vid_id - Background] Failed to inject auto-copy script for tab ${tabId}:`, error);
            // Gửi thông báo lỗi về content.js nếu inject thất bại
            chrome.tabs.sendMessage(tabId, {
                action: "autoCopyStatus",
                success: false,
                message: `Không thể tự động sao chép VID_ID. (Lỗi: ${error.message})`
            });
            sendResponse({ status: "copy script injection failed" });
        });
    } else if (request.action === "getAutoCopySetting") {
        // Hữu ích nếu popup hoặc content script muốn lấy cài đặt trực tiếp
        chrome.storage.sync.get('autoCopyEnabled', (data) => {
            const isEnabled = data.autoCopyEnabled !== false;
            sendResponse({ autoCopyEnabled: isEnabled });
        });
        return true; // Để gửi phản hồi không đồng bộ
    }
    // Đối với các thông điệp khác (ví dụ: từ popup), có thể không cần sendResponse
    // nếu chúng không mong đợi một phản hồi cụ thể.
    // Nếu bạn muốn popup biết kết quả của updateAutoCopySetting, popup cần lắng nghe.
});

// Lifecycle listener
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Get HydraX / Abyss vid_id - Background] Extension installed/updated.');
});

chrome.runtime.onStartup.addListener(() => {
    console.log('[Get HydraX / Abyss vid_id - Background] Extension started up.');
});