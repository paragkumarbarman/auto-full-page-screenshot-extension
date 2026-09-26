// Popup Logic for Auto Full Page Screenshot & Copy

document.addEventListener('DOMContentLoaded', () => {
  const idleState = document.getElementById('idleState');
  const loadingState = document.getElementById('loadingState');
  const successState = document.getElementById('successState');
  const errorState = document.getElementById('errorState');

  const captureBtn = document.getElementById('captureBtn');
  const autoCopyCheck = document.getElementById('autoCopyCheck');
  const statusText = document.getElementById('statusText');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');

  const previewImage = document.getElementById('previewImage');
  const reCopyBtn = document.getElementById('reCopyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const newCaptureBtn = document.getElementById('newCaptureBtn');

  const errorMsg = document.getElementById('errorMsg');
  const retryBtn = document.getElementById('retryBtn');
  const devLink = document.getElementById('devLink');

  let currentBlob = null;
  let currentDataUrl = '';

  devLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({
      action: 'open_url',
      url: 'https://barman-it-solutions.vercel.app/'
    });
  });

  function showState(stateName) {
    idleState.classList.remove('active');
    loadingState.classList.remove('active');
    successState.classList.remove('active');
    errorState.classList.remove('active');

    if (stateName === 'idle') idleState.classList.add('active');
    else if (stateName === 'loading') loadingState.classList.add('active');
    else if (stateName === 'success') successState.classList.add('active');
    else if (stateName === 'error') errorState.classList.add('active');
  }

  function updateProgress(current, total, percent) {
    statusText.textContent = `Scrolling & Capturing frame ${current} of ${total}...`;
    progressBar.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'scroll_progress') {
      updateProgress(message.current, message.total, message.percent);
    }
  });

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = dataUrl;
    });
  }

  async function startCapture() {
    showState('loading');
    statusText.textContent = 'Detecting scroll area...';
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('No active tab found.');
      }

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        throw new Error('Chrome protected pages (chrome://) cannot be screenshot.');
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });

      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { action: 'capture_full_page' }, (resp) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(resp);
          }
        });
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to capture full page.');
      }

      statusText.textContent = 'Stitching screenshot canvas...';
      progressBar.style.width = '95%';
      progressPercent.textContent = '95%';

      const { isWindow, rect, viewportWidth, viewportHeight, dpr, slices } = response.data;

      if (!slices || slices.length === 0) {
        throw new Error('No image slices captured.');
      }

      const topOffset = Math.max(0, rect.top || 0);
      const bottomOffset = Math.max(0, viewportHeight - (rect.bottom || viewportHeight));
      const containerRectHeight = rect.height || viewportHeight;

      let maxScrollHeight = 0;
      slices.forEach(s => {
        if (s.containerScrollHeight > maxScrollHeight) {
          maxScrollHeight = s.containerScrollHeight;
        }
      });

      const totalCanvasHeight = Math.round((topOffset + maxScrollHeight + bottomOffset) * dpr);
      const totalCanvasWidth = Math.round(viewportWidth * dpr);

      const canvas = document.createElement('canvas');
      canvas.width = totalCanvasWidth;
      canvas.height = totalCanvasHeight;
      const ctx = canvas.getContext('2d');

      for (let i = 0; i < slices.length; i++) {
        const slice = slices[i];
        const img = await loadImage(slice.dataUrl);

        if (isWindow) {
          let destY = Math.round(slice.scrollTop * dpr);
          if (slice.scrollTop + slice.containerClientHeight >= slice.containerScrollHeight - 5) {
            destY = Math.round((slice.containerScrollHeight - slice.containerClientHeight) * dpr);
          }
          ctx.drawImage(img, 0, destY);
        } else {
          // Inner scroll container (Gemini Apps, Gmail, YouTube, etc.)
          if (i === 0) {
            ctx.drawImage(img, 0, 0);
          }

          const srcY = Math.round(topOffset * dpr);
          const srcH = Math.round(containerRectHeight * dpr);
          let destY = Math.round((topOffset + slice.scrollTop) * dpr);

          if (slice.scrollTop + slice.containerClientHeight >= slice.containerScrollHeight - 5) {
            destY = Math.round((topOffset + slice.containerScrollHeight - slice.containerClientHeight) * dpr);
          }

          ctx.drawImage(
            img,
            0, srcY, img.width, srcH,
            0, destY, img.width, srcH
          );

          if (i === slices.length - 1 && bottomOffset > 0) {
            const bottomSrcY = Math.round((rect.bottom || viewportHeight) * dpr);
            const bottomSrcH = Math.round(bottomOffset * dpr);
            const bottomDestY = totalCanvasHeight - bottomSrcH;

            ctx.drawImage(
              img,
              0, bottomSrcY, img.width, bottomSrcH,
              0, bottomDestY, img.width, bottomSrcH
            );
          }
        }
      }

      currentBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      currentDataUrl = canvas.toDataURL('image/png');

      if (autoCopyCheck.checked && currentBlob) {
        try {
          const item = new ClipboardItem({ 'image/png': currentBlob });
          await navigator.clipboard.write([item]);

          chrome.tabs.sendMessage(tab.id, {
            action: 'show_toast',
            text: 'Full page screenshot copied to clipboard! (Ctrl + V to paste)'
          }).catch(() => {});
        } catch (clipErr) {
          console.warn('Clipboard write warning:', clipErr);
        }
      }

      previewImage.src = currentDataUrl;
      progressBar.style.width = '100%';
      progressPercent.textContent = '100%';

      showState('success');
    } catch (err) {
      console.error('Capture failed:', err);
      errorMsg.textContent = err.message || 'Error executing capture.';
      showState('error');
    }
  }

  captureBtn.addEventListener('click', startCapture);
  retryBtn.addEventListener('click', startCapture);
  newCaptureBtn.addEventListener('click', startCapture);

  reCopyBtn.addEventListener('click', async () => {
    if (!currentBlob) return;
    try {
      const item = new ClipboardItem({ 'image/png': currentBlob });
      await navigator.clipboard.write([item]);
      
      const originalText = reCopyBtn.innerHTML;
      reCopyBtn.innerHTML = '<span>✅</span> Copied!';
      setTimeout(() => { reCopyBtn.innerHTML = originalText; }, 2000);
    } catch (err) {
      alert('Failed to copy to clipboard: ' + err.message);
    }
  });

  downloadBtn.addEventListener('click', () => {
    if (!currentDataUrl) return;
    const a = document.createElement('a');
    a.href = currentDataUrl;
    a.download = `full_page_screenshot_${Date.now()}.png`;
    a.click();
  });

  setTimeout(() => {
    startCapture();
  }, 100);
});
