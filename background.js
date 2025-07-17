// background.js Made by Google Gemini and fixed by @CTXL1029

function injectCopyScript(textToCopy) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => console.log(chrome.i18n.getMessage("consoleCopiedToClipboardNavigator", [textToCopy])))
                .catch(err => {
                    console.error(chrome.i18n.getMessage("consoleFailedToCopyNavigator"), err);
                    fallbackCopyToClipboard(textToCopy);
                });
        } else {
            console.warn(chrome.i18n.getMessage("consoleNavigatorNotAvailable"));
            fallbackCopyToClipboard(textToCopy);
        }
    } catch (err) {
        console.error(chrome.i18n.getMessage("consoleErrorWithNavigator"), err);
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
                console.log(chrome.i18n.getMessage("consoleCopiedToClipboardExecCommand", [text]));
            } else {
                console.error(chrome.i18n.getMessage("consoleFailedToCopyExecCommand"));
            }
        } catch (err) {
            console.error(chrome.i18n.getMessage("consoleErrorDuringExecCommand"), err);
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "autoCopyIds") {
        const idsToCopy = request.ids.join('\n');
        const tabId = sender.tab.id;

        console.log(chrome.i18n.getMessage("consoleReceivedAutoCopyRequest", [tabId]), idsToCopy);

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: injectCopyScript,
            args: [idsToCopy]
        })
        .then(() => {
            console.log(chrome.i18n.getMessage("consoleAutoCopyScriptInjected", [tabId]));
            chrome.tabs.sendMessage(tabId, {
                action: "autoCopyStatus",
                success: true,
                message: chrome.i18n.getMessage("autoCopySuccess", [idsToCopy])
            });
            sendResponse({ status: "copy script injected" });
        })
        .catch(error => {
            console.error(chrome.i18n.getMessage("consoleFailedToInjectAutoCopyScript", [tabId]), error);
            chrome.tabs.sendMessage(tabId, {
                action: "autoCopyStatus",
                success: false,
                message: chrome.i18n.getMessage("autoCopyFailed", [error.message])
            });
            sendResponse({ status: "copy script injection failed" });
        });
    } else if (request.action === "getAutoCopySetting") {
        chrome.storage.sync.get('autoCopyEnabled', (data) => {
            const isEnabled = data.autoCopyEnabled !== false;
            sendResponse({ autoCopyEnabled: isEnabled });
        });
        return true;
    } else if (request.action === "getKeywordCopyText") {
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
    } else if (request.action === "openKeywordLink") {
        const url = request.url;
        if (url) {
            chrome.tabs.create({ url: url, active: true });
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, message: chrome.i18n.getMessage("invalidUrl") });
        }
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log(chrome.i18n.getMessage("consoleExtensionInstalled"));
    fetch(chrome.runtime.getURL('keyword_data.json'))
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            chrome.storage.sync.set({ keywordCopyData: data }, () => {
                console.log(chrome.i18n.getMessage("consoleKeywordDataLoaded"));
            });
        })
        .catch(e => console.error(chrome.i18n.getMessage("consoleFailedToLoadKeywordData"), e));
});

chrome.runtime.onStartup.addListener(() => {
    console.log(chrome.i18n.getMessage("consoleExtensionStartedUp"));
    fetch(chrome.runtime.getURL('keyword_data.json'))
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            chrome.storage.sync.set({ keywordCopyData: data }, () => {
                console.log(chrome.i18n.getMessage("consoleKeywordDataReloaded"));
            });
        })
        .catch(e => console.error(chrome.i18n.getMessage("consoleFailedToLoadKeywordData"), e));
});