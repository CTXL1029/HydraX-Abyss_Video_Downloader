// popup.js Made by Google Gemini with GitHub Copilot and fixed by @CTXL1029

function showAlertWithPrefix(message) {
    alert(`[HydraX / Abyss Video Downloader]\n${message}`);
}

function getLocaleMessage(msg, fallback = "") {
    try {
        const t = chrome.i18n.getMessage(msg);
        return t || fallback;
    } catch {
        return fallback;
    }
}

function getLocale() {
    return chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : "en";
}

function getVidIdFromTab(tabId, callback) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
            // Copied from content.js extraction logic for short.icu
            function extractAndStoreId(url) {
                try {
                    const urlObj = new URL(url);
                    let path = urlObj.pathname;
                    if (path.startsWith('/')) path = path.substring(1);
                    if (path.length > 0) return path;
                } catch { }
                return null;
            }
            const collectedIds = [];
            const elements = document.querySelectorAll(
                'iframe[src*="short.icu"], ' +
                'a[href*="short.icu"], ' +
                'script[src*="short.icu"], ' +
                'img[src*="short.icu"]'
            );
            elements.forEach(element => {
                let url = '';
                if (element.hasAttribute('src')) url = element.src;
                else if (element.hasAttribute('href')) url = element.href;
                if (url && url.includes('short.icu')) {
                    const id = extractAndStoreId(url);
                    if (id && !collectedIds.includes(id)) collectedIds.push(id);
                }
            });
            return collectedIds.length > 0 ? collectedIds[0] : null;
        },
    }, (results) => {
        if (chrome.runtime.lastError || !results || !results.length) {
            callback(null);
        } else {
            callback(results[0].result);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('popupTitle').textContent = chrome.i18n.getMessage("popupTitle");
    document.getElementById('autoCopyLabel').textContent = chrome.i18n.getMessage("autoCopyLabel");
    document.getElementById('manualCopyButton').textContent = chrome.i18n.getMessage("manualCopyButton");
    document.getElementById('openKeywordLinkButton').textContent = chrome.i18n.getMessage("openKeywordLinkButton");

    // Advanced options label
    const locale = getLocale();
    const advancedLabel = locale.startsWith("vi")
        ? "Tùy chọn nâng cao"
        : "Advanced Options";
    document.getElementById("advancedToggleLabel").textContent = advancedLabel;

    // New download site button
    const downloadText = locale.startsWith("vi")
        ? "Mở Trang Tải Xuống"
        : "Open Download Site";
    const notFoundText = locale.startsWith("vi")
        ? "Không Tìm Thấy vid_id"
        : "Vid_id Not Found";
    const openDownloadSiteButton = document.getElementById('openDownloadSiteButton');
    openDownloadSiteButton.textContent = downloadText;
    openDownloadSiteButton.disabled = true; // Default to disabled

    // Get vid_id for current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const tabId = tabs[0].id;
            getVidIdFromTab(tabId, (vidId) => {
                if (vidId) {
                    openDownloadSiteButton.textContent = downloadText;
                    openDownloadSiteButton.disabled = false;
                    openDownloadSiteButton.onclick = () => {
                        const url = "https://dl.openx.xyz/?v=" + encodeURIComponent(vidId);
                        chrome.tabs.create({ url: url, active: true });
                        window.close();
                    };
                } else {
                    openDownloadSiteButton.textContent = notFoundText;
                    openDownloadSiteButton.disabled = false;
                    openDownloadSiteButton.onclick = () => { /* do nothing */ };
                }
            });
        } else {
            openDownloadSiteButton.textContent = notFoundText;
            openDownloadSiteButton.disabled = false;
            openDownloadSiteButton.onclick = () => { /* do nothing */ };
        }
    });

    // Advanced toggle: show/hide
    const advancedToggleBtn = document.getElementById("advancedToggleBtn");
    const advancedContent = document.getElementById("advancedContent");
    const advancedArrow = document.getElementById("advancedArrow");
    let advOpen = false;
    advancedToggleBtn.addEventListener("click", function () {
        advOpen = !advOpen;
        if (advOpen) {
            advancedContent.classList.add("show");
            advancedToggleBtn.classList.add("expanded");
        } else {
            advancedContent.classList.remove("show");
            advancedToggleBtn.classList.remove("expanded");
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const autoCopyToggle = document.getElementById('autoCopyToggle');
    const manualCopyButton = document.getElementById('manualCopyButton');
    const openKeywordLinkButton = document.getElementById('openKeywordLinkButton');

    chrome.storage.sync.get('autoCopyEnabled', (data) => {
        const isEnabled = data.autoCopyEnabled !== false;
        autoCopyToggle.checked = isEnabled;
        updateButtonVisibility(isEnabled);
    });

    autoCopyToggle.addEventListener('change', () => {
        const isEnabled = autoCopyToggle.checked;
        chrome.storage.sync.set({ autoCopyEnabled: isEnabled }, () => {
            console.log(chrome.i18n.getMessage("autoCopySettingSaved"), isEnabled);
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

    manualCopyButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: "manualCopy" },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            showAlertWithPrefix(chrome.i18n.getMessage("noIdFoundOrPageUnsupported"));
                            window.close();
                        } else {
                            window.close();
                        }
                    }
                );
            } else {
                showAlertWithPrefix(chrome.i18n.getMessage("noIdFoundOrPageUnsupported"));
                window.close();
            }
        });
    });

    let matchedUrlToOpen = null;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const currentTabUrl = tabs[0].url;
            chrome.runtime.sendMessage({ action: "getKeywordCopyText", url: currentTabUrl }, (response) => {
                if (response && response.urlToOpen) {
                    matchedUrlToOpen = response.urlToOpen;
                    openKeywordLinkButton.style.display = 'block';
                } else {
                    openKeywordLinkButton.style.display = 'none';
                }
            });
        }
    });

    openKeywordLinkButton.addEventListener('click', () => {
        if (matchedUrlToOpen) {
            chrome.runtime.sendMessage({ action: "openKeywordLink", url: matchedUrlToOpen }, (response) => {
                if (response && response.success) {
                    console.log(chrome.i18n.getMessage("consoleOpenedKeywordLink"));
                } else {
                    console.error(chrome.i18n.getMessage("consoleFailedOpenKeywordLink"), response.message);
                    showAlertWithPrefix(chrome.i18n.getMessage("failedOpenKeywordLink"));
                }
            });
        }
        window.close();
    });

    function updateButtonVisibility(isAutoEnabled) {
        if (isAutoEnabled) {
            manualCopyButton.style.display = 'none';
        } else {
            manualCopyButton.style.display = 'block';
        }
    }
});