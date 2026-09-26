// Background Service Worker for Auto Full Page Screenshot & Copy

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture_viewport') {
    (async () => {
      try {
        // Capture active tab's visible window area
        const targetWindowId = message.windowId || (sender.tab ? sender.tab.windowId : null);
        const dataUrl = await chrome.tabs.captureVisibleTab(targetWindowId, { format: 'png' });
        sendResponse({ success: true, dataUrl });
      } catch (err) {
        console.error('[Service Worker] Error capturing viewport:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (message.action === 'open_url') {
    chrome.tabs.create({ url: message.url || 'https://barman-it-solutions.vercel.app/' });
    sendResponse({ success: true });
    return true;
  }
});
