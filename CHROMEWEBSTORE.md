# Chrome Web Store Metadata & Publishing Details

## General Information

- **Extension Name**: Auto Full Page Screenshot & Copy
- **Short Name**: Full Screenshot Copy
- **Version**: 1.0.1
- **Primary Language**: English
- **Category**: Productivity / Developer Tools
- **Developer / Author**: PARAG KUMAR BARMAN
- **Developer Website**: [https://barman-it-solutions.vercel.app/](https://barman-it-solutions.vercel.app/)
- **Last Updated**: 2026-09-27

---

## Detailed Description

**Auto Full Page Screenshot & Copy** is a powerful Chrome Extension designed to take full scrollable webpage screenshots in 1-click and automatically copy them directly to your clipboard for instant pasting (`Ctrl + V`).

### Key Features:
- **1-Click Full Page Capture**: Automatically scrolls through the entire webpage (including nested scroll containers like Gemini Apps, Gmail, YouTube) and stitches all viewports together seamlessly.
- **Auto-Copy to Clipboard**: Images are saved directly to your clipboard so you can paste them instantly into Chat, Word, Photoshop, Slack, WhatsApp, or any document.
- **Smart Inner Scroll Container Detection**: Works on both standard pages and complex single-page apps with inner scroll containers.
- **Smart Sticky Header Handling**: Automatically hides sticky navigation headers during scroll steps to prevent annoying duplicate headers down your screenshot.
- **High Resolution Capture**: Preserves full Device Pixel Ratio (Retina/4K) display sharpness.
- **Instant Preview & Download**: View the full screenshot right inside the extension popup and download as PNG anytime.
- **Privacy First**: 100% offline local processing. No images or page content are ever sent to external servers.

---

## Permissions Justifications

| Permission | Reason / Justification for Review Team |
|---|---|
| `activeTab` | Required to query current page height, scroll viewport slices, and capture screen content. |
| `scripting` | Required to inject the scrolling content script into the active tab to execute auto-scroll. |
| `clipboardWrite` | Required to automatically copy the final stitched screenshot image blob directly to the user's system clipboard. |
| `storage` | Required to remember user preferences (such as auto-copy toggle setting). |
| `<all_urls>` | Required for `chrome.tabs.captureVisibleTab` and script injection across any public webpage the user wishes to capture. |

---

## Privacy & Data Use Disclosure

- **Data Collection**: No personal data, browsing history, or user images are collected, stored remotely, or transmitted.
- **Third-Party Services**: None. All image canvas stitching and clipboard operations execute locally within the user's browser.

---

## Version History

### Version 1.0.1 (2026-09-27)
- Added automatic detection for inner scroll containers (Gemini Apps, Gmail, YouTube, etc.).
- Embedded developer steganographic signature payload and code verification.

### Version 1.0.0 (2026-09-26)
- Initial release with 1-click auto-scroll full page screenshot capture.
- Automatic clipboard copy support.
- Smart fixed/sticky header hiding.
- High-res Canvas stitching engine.
- Developer branding and portfolio integration.
