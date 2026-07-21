// iOS Chinese IME safeguard: do not sync or re-render while Zhuyin is composing.
(() => {
  const editableSelector = '.note-input, .cloud-field input, .cloud-field textarea';
  let composing = false;
  let pendingPrepRender = false;
  let pendingItineraryRender = false;

  const isEditable = target => target instanceof Element && target.matches(editableSelector);
  const hasActiveEditor = () => composing || isEditable(document.activeElement);

  const originalRenderPrep = window.renderPrep;
  if (typeof originalRenderPrep === 'function') {
    window.renderPrep = function (...args) {
      if (hasActiveEditor()) {
        pendingPrepRender = true;
        return;
      }
      pendingPrepRender = false;
      return originalRenderPrep.apply(this, args);
    };
  }

  const originalRenderItinerary = window.renderItinerary;
  if (typeof originalRenderItinerary === 'function') {
    window.renderItinerary = function (...args) {
      if (hasActiveEditor()) {
        pendingItineraryRender = true;
        return;
      }
      pendingItineraryRender = false;
      return originalRenderItinerary.apply(this, args);
    };
  }

  function flushDeferredRenders() {
    if (hasActiveEditor()) return;
    if (pendingPrepRender && typeof originalRenderPrep === 'function') {
      pendingPrepRender = false;
      originalRenderPrep();
    }
    if (pendingItineraryRender && typeof originalRenderItinerary === 'function') {
      pendingItineraryRender = false;
      originalRenderItinerary();
    }
  }

  document.addEventListener('compositionstart', event => {
    if (!isEditable(event.target)) return;
    composing = true;
    event.target.dataset.imeComposing = 'true';
  }, true);

  // Inline oninput handlers trigger cloud writes. Block only unfinished
  // composition events; the visible text remains in the native input element.
  document.addEventListener('input', event => {
    if (!isEditable(event.target)) return;
    if (event.isComposing || event.target.dataset.imeComposing === 'true') {
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('compositionend', event => {
    if (!isEditable(event.target)) return;
    delete event.target.dataset.imeComposing;
    composing = false;

    // Safari does not consistently fire a final input event after
    // compositionend, so dispatch one after the selected text exists.
    const target = event.target;
    setTimeout(() => {
      if (!target.isConnected) return;
      target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }, 0);
  }, true);

  document.addEventListener('focusout', event => {
    if (!isEditable(event.target)) return;
    setTimeout(flushDeferredRenders, 180);
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flushDeferredRenders();
  });
})();
