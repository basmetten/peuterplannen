(function () {
  function initNav(nav) {
    if (!nav) return;

    var pathname = window.location.pathname;
    nav.querySelectorAll('.nav-link,.nav-mobile-link').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href === pathname || (href.length > 1 && pathname.startsWith(href))) {
        a.classList.add('active');
      }
    });

    function syncScrolled() {
      nav.classList.toggle('scrolled', window.scrollY > 10);
    }
    syncScrolled();
    window.addEventListener('scroll', syncScrolled, { passive: true });

    var burger = nav.querySelector('.nav-burger');
    var mobile = nav.querySelector('.nav-mobile');
    if (!burger || !mobile) return;

    if (!mobile.id) {
      mobile.id = 'nav-mobile-menu';
    }
    burger.setAttribute('aria-controls', mobile.id);

    // Create separate backdrop overlay on body (not inside nav, so it doesn't bleed through the glass)
    var backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    function closeMobile() {
      mobile.classList.remove('open');
      mobile.setAttribute('aria-hidden', 'true');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }

    burger.addEventListener('click', function () {
      var open = !mobile.classList.contains('open');
      mobile.classList.toggle('open', open);
      mobile.setAttribute('aria-hidden', String(!open));
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      backdrop.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });

    mobile.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMobile);
    });

    backdrop.addEventListener('click', closeMobile);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMobile();
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('nav[aria-label="Hoofdnavigatie"]')) {
        closeMobile();
      }
    });
  }

  // Fix: always close mobile menu on page restore from bfcache
  // (body overflow:hidden + backdrop can persist after back-navigation)
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      document.body.style.overflow = '';
      var bd = document.querySelector('.nav-backdrop');
      if (bd) bd.classList.remove('open');
      var mob = document.querySelector('.nav-mobile');
      if (mob) { mob.classList.remove('open'); mob.setAttribute('aria-hidden', 'true'); }
      var bur = document.querySelector('.nav-burger');
      if (bur) { bur.classList.remove('open'); bur.setAttribute('aria-expanded', 'false'); }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initNav(document.querySelector('nav.floating-nav[aria-label="Hoofdnavigatie"]') || document.querySelector('nav[aria-label="Hoofdnavigatie"]'));
    });
  } else {
    initNav(document.querySelector('nav.floating-nav[aria-label="Hoofdnavigatie"]') || document.querySelector('nav[aria-label="Hoofdnavigatie"]'));
  }
})();
