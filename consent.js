/* PeuterPlannen — Cookie Consent v1 */
(function () {
  'use strict';

  var KEY = 'pp_consent';

  function applyConsent(state) {
    if (typeof gtag !== 'undefined') {
      gtag('consent', 'update', state);
    }
  }

  function showBanner() {
    var style = document.createElement('style');
    style.textContent = [
      '#pp-cb{position:fixed;bottom:80px;left:16px;right:16px;max-width:520px;',
      'background:rgba(250,247,242,0.97);backdrop-filter:blur(16px);',
      '-webkit-backdrop-filter:blur(16px);border:1px solid rgba(212,119,90,0.2);',
      'border-radius:16px;padding:16px 20px;',
      'box-shadow:0 8px 32px rgba(45,41,38,0.14);',
      'font-family:"DM Sans",-apple-system,sans-serif;font-size:14px;color:#2D2926;',
      'z-index:9999;opacity:0;transform:translateY(10px);',
      'transition:opacity .28s ease,transform .28s ease;}',
      '#pp-cb.pp-in{opacity:1;transform:translateY(0);}',
      '#pp-cb p{margin:0 0 12px;line-height:1.5;color:#5C4A48;}',
      '#pp-cb a{color:#D4775A;}',
      '#pp-cb-btns{display:flex;gap:8px;justify-content:flex-end;}',
      '#pp-cb-deny{background:transparent;border:1px solid rgba(45,41,38,0.2);',
      'color:#7A5E60;padding:8px 14px;border-radius:8px;font-size:13px;',
      'font-family:inherit;cursor:pointer;}',
      '#pp-cb-ok{background:#D4775A;border:none;color:#fff;padding:8px 16px;',
      'border-radius:8px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;}',
      '@media(min-width:680px){#pp-cb{bottom:24px;left:auto;right:24px;max-width:400px;margin:0;}}'
    ].join('');
    document.head.appendChild(style);

    var el = document.createElement('div');
    el.id = 'pp-cb';
    el.innerHTML =
      '<p>PeuterPlannen gebruikt Google Analytics om bezoekersaantallen bij te houden. ' +
      '<a href="/privacy/">Meer info</a></p>' +
      '<div id="pp-cb-btns">' +
      '<button id="pp-cb-deny" onclick="ppConsent(false)">Alleen noodzakelijk</button>' +
      '<button id="pp-cb-ok" onclick="ppConsent(true)">Akkoord</button>' +
      '</div>';
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('pp-in'); }, 40);
  }

  // Don't show if user already made a choice
  if (localStorage.getItem(KEY)) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showBanner);
  } else {
    showBanner();
  }
})();

function ppConsent(accepted) {
  var state = {
    analytics_storage:    accepted ? 'granted' : 'denied',
    ad_storage:           accepted ? 'granted' : 'denied',
    ad_user_data:         accepted ? 'granted' : 'denied',
    ad_personalization:   accepted ? 'granted' : 'denied'
  };
  try { localStorage.setItem('pp_consent', JSON.stringify(state)); } catch (e) {}
  if (typeof gtag !== 'undefined') gtag('consent', 'update', state);
  var el = document.getElementById('pp-cb');
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  }
}
