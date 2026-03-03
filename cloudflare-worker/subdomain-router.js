/**
 * Cloudflare Worker: Subdomain Router voor PeuterPlannen
 *
 * partner.peuterplannen.nl → peuterplannen.nl/partner/
 * admin.peuterplannen.nl   → peuterplannen.nl/admin/
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url  = new URL(request.url);
  const host = url.hostname;

  if (host === 'partner.peuterplannen.nl') {
    const newUrl = new URL(request.url);
    newUrl.hostname = 'peuterplannen.nl';
    if (newUrl.pathname === '/' || newUrl.pathname === '') {
      newUrl.pathname = '/partner/';
    } else if (!newUrl.pathname.startsWith('/partner')) {
      newUrl.pathname = '/partner' + newUrl.pathname;
    }
    return fetch(new Request(newUrl.toString(), request));
  }

  if (host === 'admin.peuterplannen.nl') {
    const newUrl = new URL(request.url);
    newUrl.hostname = 'peuterplannen.nl';
    if (newUrl.pathname === '/' || newUrl.pathname === '') {
      newUrl.pathname = '/admin/';
    } else if (!newUrl.pathname.startsWith('/admin')) {
      newUrl.pathname = '/admin' + newUrl.pathname;
    }
    return fetch(new Request(newUrl.toString(), request));
  }

  return fetch(request);
}
