/* Render a single full-width subscription tile inside the EXISTING web dashboard.
   No JS bridge, wallet access, receipt grant, payment call, or native secret. */
(function () {
  'use strict';
  const hub = document.getElementById('sahambanModulesV87');
  if (!hub) return;
  if (!document.getElementById('subscriptionSectionSahmino') &&
      !document.getElementById('sahminoNativeSubscriptionCard')) {
    const card = document.createElement('div');
    card.id = 'sahminoNativeSubscriptionCard';
    card.className = 'sahamban-module-v87 sahmino-subscription-featured';
    card.style.gridColumn = '1 / -1';
    card.style.border = '1px solid #6acdb8';
    card.style.borderRadius = '14px';
    card.style.background = 'linear-gradient(110deg,#133d46,#193252)';
    const link = document.createElement('a');
    link.href = 'https://raminhashemi1.github.io/sahamban/__native_subscription_preview';
    link.className = 'sahamban-module-link-v87';
    link.style.minHeight = '84px';
    link.style.padding = '14px';
    link.style.display = 'flex';
    link.style.flexDirection = 'column';
    link.style.gap = '7px';
    const title = document.createElement('strong');
    title.textContent = '◇ طرح اشتراک';
    title.style.fontSize = '17px';
    const description = document.createElement('small');
    description.textContent = 'انتخاب دوره اشتراک سهمینو';
    description.style.fontSize = '13px';
    link.append(title, description);
    card.append(link);
    hub.prepend(card);
  }

  // Rename only human-facing labels. Never rewrite identifiers, storage keys,
  // user-entered fields, or programmatic code.
  function renameVisible(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,textarea,input,select,option,[contenteditable]')) continue;
      if (/سهام[‌ ]?بان/.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue.replace(/سهام[‌ ]?بان/g, 'سهمینو');
      }
    }
    if (document.title.includes('سهام‌بان')) {
      document.title = document.title.replace(/سهام[‌ ]?بان/g, 'سهمینو');
    }
    if (root.querySelectorAll) {
      for (const element of root.querySelectorAll('[aria-label],[alt],[title],[placeholder]')) {
        for (const attr of ['aria-label', 'alt', 'title', 'placeholder']) {
          const value = element.getAttribute(attr);
          if (value && /سهام[‌ ]?بان/.test(value)) {
            element.setAttribute(attr, value.replace(/سهام[‌ ]?بان/g, 'سهمینو'));
          }
        }
      }
    }
  }
  renameVisible(document.body);
  if (!window.__sahminoBrandObserverInstalled) {
    window.__sahminoBrandObserverInstalled = true;
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') {
          const target = record.target;
          if (target.parentElement && !target.parentElement.closest('script,style,textarea,input,select,option,[contenteditable]') &&
              /سهام[‌ ]?بان/.test(target.nodeValue)) {
            target.nodeValue = target.nodeValue.replace(/سهام[‌ ]?بان/g, 'سهمینو');
          }
        }
        if (record.type === 'childList') {
          for (const node of record.addedNodes) {
            if (node.nodeType === 1) renameVisible(node);
          }
        }
      }
    });
    observer.observe(document.body, {subtree:true, childList:true, characterData:true});
  }
})();
