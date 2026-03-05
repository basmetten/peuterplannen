(function () {
  'use strict';

  var modalState = {
    active: null,
    previousFocus: null,
    cleanup: null,
  };

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setAlert(target, message, type, options) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return;

    var opts = options || {};
    var html = opts.html === true;
    var assertive = opts.assertive === true;

    el.innerHTML = '';
    if (!message) return;

    var box = document.createElement('div');
    box.className = 'portal-alert portal-alert-' + (type || 'info');
    box.setAttribute('role', assertive ? 'alert' : 'status');
    box.setAttribute('aria-live', assertive ? 'assertive' : 'polite');

    if (html) {
      box.innerHTML = String(message);
    } else {
      box.textContent = String(message);
    }

    el.appendChild(box);
  }

  function getFocusable(root) {
    var selectors = [
      'a[href]',
      'area[href]',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];

    return toArray(root.querySelectorAll(selectors.join(','))).filter(function (el) {
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    });
  }

  function closeModal(modal) {
    var target = typeof modal === 'string' ? document.getElementById(modal) : modal;
    if (!target) return;

    target.classList.remove('open');
    target.setAttribute('aria-hidden', 'true');
    target.dispatchEvent(new CustomEvent('portal-modal-closed'));

    if (modalState.cleanup) {
      modalState.cleanup();
      modalState.cleanup = null;
    }

    if (modalState.previousFocus && typeof modalState.previousFocus.focus === 'function') {
      modalState.previousFocus.focus();
    }

    modalState.active = null;
    modalState.previousFocus = null;
  }

  function openModal(modal, trigger) {
    var target = typeof modal === 'string' ? document.getElementById(modal) : modal;
    if (!target) return;

    if (modalState.active && modalState.active !== target) {
      closeModal(modalState.active);
    }

    modalState.active = target;
    modalState.previousFocus = trigger || document.activeElement;

    target.classList.add('open');
    target.setAttribute('aria-hidden', 'false');

    var dialog = target.querySelector('.portal-modal-dialog') || target;
    var focusables = getFocusable(dialog);
    var first = focusables[0] || dialog;

    if (!first.hasAttribute('tabindex')) {
      first.setAttribute('tabindex', '-1');
    }
    first.focus();

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal(target);
        return;
      }

      if (event.key !== 'Tab') return;
      focusables = getFocusable(dialog);
      if (!focusables.length) return;

      var firstEl = focusables[0];
      var lastEl = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    function onClick(event) {
      var closeEl = event.target.closest('[data-close-modal]');
      if (closeEl) {
        event.preventDefault();
        closeModal(target);
        return;
      }
      if (event.target.classList.contains('portal-modal-backdrop')) {
        event.preventDefault();
        closeModal(target);
      }
    }

    target.addEventListener('keydown', onKeydown);
    target.addEventListener('click', onClick);

    modalState.cleanup = function () {
      target.removeEventListener('keydown', onKeydown);
      target.removeEventListener('click', onClick);
    };
  }

  function showConfirm(options) {
    var opts = options || {};
    var modal = document.getElementById(opts.modalId || 'confirm-modal');

    if (!modal) {
      return Promise.resolve(false);
    }

    var titleEl = modal.querySelector('[data-confirm-title]');
    var textEl = modal.querySelector('[data-confirm-text]');
    var okBtn = modal.querySelector('[data-confirm-ok]');
    var cancelBtn = modal.querySelector('[data-confirm-cancel]');

    if (titleEl) titleEl.textContent = opts.title || 'Weet je het zeker?';
    if (textEl) textEl.textContent = opts.text || '';
    if (okBtn) okBtn.textContent = opts.confirmLabel || 'Bevestigen';
    if (cancelBtn) cancelBtn.textContent = opts.cancelLabel || 'Annuleren';

    return new Promise(function (resolve) {
      var resolved = false;

      function cleanup(result) {
        if (resolved) return;
        resolved = true;
        if (okBtn) okBtn.removeEventListener('click', onOk);
        if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
        modal.removeEventListener('close-confirm', onCloseConfirm);
        modal.removeEventListener('portal-modal-closed', onModalClosed);
        closeModal(modal);
        resolve(result);
      }

      function onOk(event) {
        event.preventDefault();
        cleanup(true);
      }

      function onCancel(event) {
        event.preventDefault();
        cleanup(false);
      }

      function onCloseConfirm() {
        cleanup(false);
      }

      function onModalClosed() {
        cleanup(false);
      }

      if (okBtn) okBtn.addEventListener('click', onOk);
      if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
      modal.addEventListener('close-confirm', onCloseConfirm);
      modal.addEventListener('portal-modal-closed', onModalClosed);
      openModal(modal, opts.trigger || document.activeElement);
    });
  }

  function dispatchCloseConfirm(modalId) {
    var modal = document.getElementById(modalId || 'confirm-modal');
    if (!modal) return;
    modal.dispatchEvent(new CustomEvent('close-confirm'));
  }

  function setButtonBusy(button, busy, busyLabel, idleLabel) {
    if (!button) return;
    if (busy) {
      if (!button.dataset.idleLabel) {
        button.dataset.idleLabel = idleLabel || button.textContent || '';
      }
      button.disabled = true;
      button.textContent = busyLabel || 'Bezig...';
      return;
    }

    button.disabled = false;
    button.textContent = idleLabel || button.dataset.idleLabel || button.textContent;
  }

  window.PortalShell = {
    escapeHtml: escapeHtml,
    setAlert: setAlert,
    openModal: openModal,
    closeModal: closeModal,
    showConfirm: showConfirm,
    dispatchCloseConfirm: dispatchCloseConfirm,
    setButtonBusy: setButtonBusy,
  };
})();
