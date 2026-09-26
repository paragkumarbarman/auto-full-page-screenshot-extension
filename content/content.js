// Content script for Auto Full Page Screenshot & Copy v1.0.1
// Author Signature Payload: ​​‌​​​‌​‌​​‌​​​​​‌​​‌​​‌‌​‌​​‌​‌​‌​​‌​​​​​‌​​‌​‌‌​​‌​​‌​‌​​‌​​​‌​‌​​‌​​​​​‌​​‌​‌‌​​‌​​‌​‌​​‌​​​‌‌​‌​​‌​​​​​‌​​‌​​​​

(() => {
  if (window.__fullPageScreenshotInjected) return;
  window.__fullPageScreenshotInjected = true;

  // Internal Steganographic Code Signature & Author Verification (v1.0.1)
  const _SIG_CODE = [80, 65, 82, 65, 71, 32, 75, 85, 77, 65, 82, 32, 66, 65, 82, 77, 65, 78];
  const _SIG_URL = [104, 116, 116, 112, 115, 58, 47, 47, 98, 97, 114, 109, 97, 110, 45, 105, 116, 45, 115, 111, 108, 117, 116, 105, 111, 110, 115, 46, 118, 101, 114, 99, 101, 108, 46, 97, 112, 112, 47];
  
  window.__verifyPKBSignature = function() {
    const author = String.fromCharCode(..._SIG_CODE);
    const url = String.fromCharCode(..._SIG_URL);
    return {
      author,
      url,
      version: '1.0.1',
      signature: 'ORIGINAL_AUTHOR_CONFIRMED_PARAG_KUMAR_BARMAN',
      timestamp: '2026-09-27'
    };
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'capture_full_page') {
      (async () => {
        try {
          const result = await executeFullPageScroll(message.options || {});
          sendResponse({ success: true, data: result });
        } catch (err) {
          console.error('[ContentScript] Full page scroll error:', err);
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    if (message.action === 'show_toast') {
      showCopiedToast(message.text || 'Copied to Clipboard!');
      sendResponse({ success: true });
      return true;
    }

    if (message.action === 'verify_signature') {
      sendResponse({ success: true, signature: window.__verifyPKBSignature() });
      return true;
    }
  });

  // Find the primary scrollable container on the page
  function findMainScrollContainer() {
    const docScrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0
    );
    const viewportH = window.innerHeight;

    // Standard window scrolling check
    if (docScrollHeight > viewportH + 30) {
      return {
        isWindow: true,
        getScrollTop: () => window.scrollY,
        setScrollTop: (y) => window.scrollTo(0, y),
        getScrollHeight: () => Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0),
        getClientHeight: () => window.innerHeight,
        rect: { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth, width: window.innerWidth, height: window.innerHeight }
      };
    }

    // Search DOM elements for the largest scrollable container (e.g., Gemini Apps, Gmail, YouTube)
    const candidates = Array.from(document.querySelectorAll('*'));
    let maxEl = null;
    let maxScrollDiff = 0;

    for (const el of candidates) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      const isScrollable = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay');
      const scrollDiff = el.scrollHeight - el.clientHeight;

      if (isScrollable && scrollDiff > 30) {
        if (scrollDiff > maxScrollDiff) {
          maxScrollDiff = scrollDiff;
          maxEl = el;
        }
      }
    }

    if (maxEl) {
      const r = maxEl.getBoundingClientRect();
      return {
        isWindow: false,
        element: maxEl,
        getScrollTop: () => maxEl.scrollTop,
        setScrollTop: (y) => { maxEl.scrollTop = y; },
        getScrollHeight: () => maxEl.scrollHeight,
        getClientHeight: () => maxEl.clientHeight,
        rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }
      };
    }

    // Fallback to window
    return {
      isWindow: true,
      getScrollTop: () => window.scrollY,
      setScrollTop: (y) => window.scrollTo(0, y),
      getScrollHeight: () => Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0),
      getClientHeight: () => window.innerHeight,
      rect: { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth, width: window.innerWidth, height: window.innerHeight }
    };
  }

  async function executeFullPageScroll(options) {
    const container = findMainScrollContainer();
    const origScrollY = container.getScrollTop();
    const origScrollX = window.scrollX;

    // Temporarily disable smooth scrolling CSS to avoid scroll lag during screenshotting
    const styleEl = document.createElement('style');
    styleEl.innerHTML = '* { scroll-behavior: auto !important; }';
    document.head.appendChild(styleEl);

    // Hide scrollbars temporarily
    const docOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body ? document.body.style.overflow : '';
    document.documentElement.style.overflow = 'hidden';
    if (document.body) document.body.style.overflow = 'hidden';

    // Collect fixed / sticky elements to hide on subsequent scroll slices
    const stickyEls = [];
    try {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const style = window.getComputedStyle(el);
        if ((style.position === 'fixed' || style.position === 'sticky') && style.display !== 'none' && style.visibility !== 'hidden') {
          stickyEls.push({ el, origVisibility: el.style.visibility });
        }
      }
    } catch (e) {
      console.warn('Error querying sticky elements:', e);
    }

    const slices = [];
    let targetY = 0;
    let step = 0;
    const maxSteps = 60; // Prevents infinite loops

    while (step < maxSteps) {
      container.setScrollTop(targetY);

      // Hide sticky elements after the first frame so headers don't duplicate
      if (step > 0) {
        stickyEls.forEach(item => { item.el.style.visibility = 'hidden'; });
      }

      // Wait for rendering and dynamic/lazy image loading
      await new Promise(r => setTimeout(r, 220));

      const actualY = container.getScrollTop();
      const currentScrollHeight = container.getScrollHeight();
      const currentClientHeight = container.getClientHeight();

      // Request background service worker to capture visible tab
      const captureResp = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'capture_viewport' }, response => {
          resolve(response || { success: false, error: 'No response from background worker' });
        });
      });

      if (!captureResp.success) {
        throw new Error(captureResp.error || 'Failed to capture slice frame');
      }

      slices.push({
        index: step,
        scrollTop: actualY,
        containerScrollHeight: currentScrollHeight,
        containerClientHeight: currentClientHeight,
        dataUrl: captureResp.dataUrl
      });

      // Send progress update to popup
      const estimatedTotal = Math.max(1, Math.ceil(currentScrollHeight / currentClientHeight));
      chrome.runtime.sendMessage({
        action: 'scroll_progress',
        current: step + 1,
        total: estimatedTotal,
        percent: Math.min(99, Math.round(((step + 1) / estimatedTotal) * 100))
      }).catch(() => {});

      // Stop if bottom of scroll container reached
      if (actualY + currentClientHeight >= currentScrollHeight - 5) {
        break;
      }

      // Compute next scroll position
      let nextY = actualY + currentClientHeight;
      if (nextY + currentClientHeight > currentScrollHeight) {
        nextY = currentScrollHeight - currentClientHeight;
      }

      if (nextY <= actualY) {
        break; // Can't scroll further
      }

      targetY = nextY;
      step++;
    }

    // Restore page state
    stickyEls.forEach(item => { item.el.style.visibility = item.origVisibility; });
    document.documentElement.style.overflow = docOverflow;
    if (document.body) document.body.style.overflow = bodyOverflow;
    styleEl.remove();
    container.setScrollTop(origScrollY);
    if (container.isWindow) window.scrollTo(origScrollX, origScrollY);

    return {
      isWindow: container.isWindow,
      rect: container.rect,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      slices
    };
  }

  function showCopiedToast(text) {
    const existing = document.getElementById('__auto_screenshot_toast__');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = '__auto_screenshot_toast__';
    toast.innerHTML = `
      <div style="
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        background: #0f172a;
        color: #ffffff;
        padding: 14px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        font-weight: 600;
        border: 1px solid rgba(255, 255, 255, 0.15);
        animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      ">
        <span style="font-size: 20px;">📋</span>
        <div>
          <div style="color: #38bdf8;">Screenshot Copied!</div>
          <div style="font-size: 12px; font-weight: 400; color: #94a3b8; margin-top: 2px;">
            ${text}
          </div>
        </div>
      </div>
      <style>
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(10px) scale(0.95); }
        }
      </style>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }
})();
