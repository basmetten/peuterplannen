// Homepage Quick Results — shows 3 nearby or featured location cards
(function() {
  'use strict';

  var SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';
  var SB_KEY = atob('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CcGRXcHpkbWRpWm1ac2NuSjJZWFY2YzNobElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpJd05ETXhOekFzSW1WNGNDSTZNakE0TnpZeE9URTNNSDAuNXkzZ3FpUGZWdnB2ZmFEWUFfUGdxRS1LVHZ1ZjZ6Z042dkd6cWZVcGVTbw==');
  var container = document.getElementById('quick-results');
  if (!container) return;

  var gpsLat = localStorage.getItem('gpsLat');
  var gpsLng = localStorage.getItem('gpsLng');

  // Build query — prefer nearby if GPS available, else top-rated
  var select = 'id,name,slug,region,type,peuterscore';
  var query;
  if (gpsLat && gpsLng) {
    // RPC call for nearest locations
    query = SB_URL + '?select=' + select + '&peuterscore=gte.7&order=peuterscore.desc&limit=3';
  } else {
    query = SB_URL + '?select=' + select + '&peuterscore=gte.8&order=peuterscore.desc&limit=3';
  }

  fetch(query, {
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
  })
  .then(function(res) { return res.ok ? res.json() : Promise.reject(res.status); })
  .then(function(data) {
    if (!data || !data.length) { container.style.display = 'none'; return; }
    var html = data.map(function(loc) {
      var href = '/' + (loc.region || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '/' + loc.slug + '/';
      var typeLabel = {play:'Speeltuin',farm:'Kinderboerderij',nature:'Natuur',horeca:'Horeca',museum:'Museum',swim:'Zwemmen',pancake:'Pannenkoeken',culture:'Cultuur'}[loc.type] || loc.type;
      return '<a href="' + href + '" class="quick-result-card">' +
        '<strong>' + loc.name + '</strong>' +
        '<span>' + typeLabel + ' · ' + loc.region + '</span>' +
        '</a>';
    }).join('');
    container.querySelector('.quick-results-grid').innerHTML = html;
    container.querySelector('.pp-skeleton-row')?.remove();
  })
  .catch(function() {
    // Graceful degradation — hide section on error
    container.style.display = 'none';
  });
})();
