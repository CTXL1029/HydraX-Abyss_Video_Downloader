// popup.js Made by Google Gemini with GitHub Copilot and fixed by @CTXL1029

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('popupTitle').textContent = chrome.i18n.getMessage("popupTitle");
    document.getElementById('autoCopyLabel').textContent = chrome.i18n.getMessage("autoCopyLabel");
    document.getElementById('manualCopyButton').textContent = chrome.i18n.getMessage("manualCopyButton");
    document.getElementById('openKeywordLinkButton').textContent = chrome.i18n.getMessage("openKeywordLinkButton");
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
                            alert(chrome.i18n.getMessage("noIdFoundOrPageUnsupported"));
                            window.close();
                        } else {
                            window.close();
                        }
                    }
                );
            } else {
                alert(chrome.i18n.getMessage("noIdFoundOrPageUnsupported"));
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
                    alert(chrome.i18n.getMessage("failedOpenKeywordLink"));
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