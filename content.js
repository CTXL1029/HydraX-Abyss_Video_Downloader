// content.js Made by Google Gemini with GitHub Copilot and fixed by @CTXL1029

(function() {
    'use strict';

    const collectedIds = new Set();
    let isAutoCopyEnabled = true;

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
            console.warn(chrome.i18n.getMessage("consoleCouldNotParseUrl", [url]), e);
        }
        return null;
    }

    function showAlertWithPrefix(message, vid) {
        if (vid !== undefined && vid !== null && vid !== "") {
            alert(`[HydraX / Abyss Video Downloader]\n${message} ${vid}`);
        } else {
            alert(`[HydraX / Abyss Video Downloader]\n${message}`);
        }
    }

    function copyToClipboardLocal(text) {
        if (!text || text.length === 0) {
            console.warn(chrome.i18n.getMessage("consoleNoIdToCopyLocal"));
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
                console.log(chrome.i18n.getMessage("consoleCopiedToClipboardExecCommand", [text]));
                showAlertWithPrefix(chrome.i18n.getMessage("copySuccessAlert"), text);
            } else {
                console.error(chrome.i18n.getMessage("consoleFailedToCopyExecCommand"));
                showAlertWithPrefix(chrome.i18n.getMessage("copyFailedExecCommand"));
            }
        } catch (err) {
            console.error(chrome.i18n.getMessage("consoleErrorDuringExecCommand"), err);
            showAlertWithPrefix(chrome.i18n.getMessage("copyFailedPermission"));
        } finally {
            document.body.removeChild(textArea);
        }
    }

    function copyCurrentVideoIdManually() {
        collectedIds.clear();
        scanAndProcessShortIcuIds(true);
        if (collectedIds.size > 0) {
            copyToClipboardLocal(Array.from(collectedIds).join('\n'));
        } else {
            showAlertWithPrefix(chrome.i18n.getMessage("noIdFound"));
        }
    }

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
            console.log(chrome.i18n.getMessage("consoleFoundNewIds", [newIdsFound, collectedIds.size]));

            if (isAutoCopyEnabled && !forceCopyManually) {
                chrome.runtime.sendMessage({
                    action: "autoCopyIds",
                    ids: Array.from(collectedIds)
                });
                console.log(chrome.i18n.getMessage("consoleIdsSentToBackground"));
            } else if (!isAutoCopyEnabled && !forceCopyManually) {
                console.log(chrome.i18n.getMessage("consoleAutoCopyOffMessage"));
            }
        }
    }

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                scanAndProcessShortIcuIds();
            }
        });
    });

    chrome.runtime.onMessage.addListener((request, text, sendResponse) => {
        if (request.action === "updateAutoCopySetting") {
            isAutoCopyEnabled = request.enabled;
            console.log(chrome.i18n.getMessage("autoCopySettingUpdated"), isAutoCopyEnabled);

            scanAndProcessShortIcuIds();

            sendResponse({ status: "setting updated" });
        } else if (request.action === "manualCopy") {
            console.log(chrome.i18n.getMessage("manualCopyRequest"));
            copyCurrentVideoIdManually();
            sendResponse({ status: chrome.i18n.getMessage("manualCopyDone") });
        } else if (request.action === "autoCopyStatus") {
            if (request.success) {
                showAlertWithPrefix(chrome.i18n.getMessage("autoCopySuccess"), request.message);
                console.log(chrome.i18n.getMessage("autoCopyStatusSuccess"), request.message);
            } else {
                showAlertWithPrefix(chrome.i18n.getMessage("autoCopyFailed", [request.message]));
                console.error(chrome.i18n.getMessage("autoCopyStatusError"), request.message);
            }
        }
        return true;
    });

    chrome.storage.sync.get('autoCopyEnabled', (data) => {
        isAutoCopyEnabled = (data.autoCopyEnabled === undefined || data.autoCopyEnabled === null) ? true : data.autoCopyEnabled;
        /*console.log(chrome.i18n.getMessage("consoleAutoCopySettingInitial"), isAutoCopyEnabled);*/

        scanAndProcessShortIcuIds();

        observer.observe(document.documentElement, { childList: true, subtree: true });
    });

    window.addEventListener('load', () => {
        /*console.log(chrome.i18n.getMessage("consolePageLoaded"));*/
        scanAndProcessShortIcuIds();
    });

})();