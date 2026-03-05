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

    function closeMobile() {
      mobile.classList.remove('open');
      mobile.setAttribute('aria-hidden', 'true');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }

    burger.addEventListener('click', function () {
      var open = !mobile.classList.contains('open');
      mobile.classList.toggle('open', open);
      mobile.setAttribute('aria-hidden', String(!open));
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    });

    mobile.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMobile);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMobile();
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('nav[aria-label="Hoofdnavigatie"]')) {
        closeMobile();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initNav(document.querySelector('nav.floating-nav[aria-label="Hoofdnavigatie"]') || document.querySelector('nav[aria-label="Hoofdnavigatie"]'));
    });
  } else {
    initNav(document.querySelector('nav.floating-nav[aria-label="Hoofdnavigatie"]') || document.querySelector('nav[aria-label="Hoofdnavigatie"]'));
  }
})();
