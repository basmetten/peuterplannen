import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdWpzdmdiZmZscnJ2YXV6c3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDMxNzAsImV4cCI6MjA4NzYxOTE3MH0.5y3gqiPfVvpvfaDYA_PgqE-KTvuf6zgN6vGzqfUpeSo';
const EDGE_BASE = `${SB_URL}/functions/v1`;
const ADMIN_EMAIL = 'basmetten@gmail.com';
const TABS = [
  'tab-overview',
  'tab-claims',
  'tab-owners',
  'tab-locations',
  'tab-location-detail',
  'tab-trust',
  'tab-seo',
  'tab-editorial',
  'tab-duplicates',
  'tab-publishing',
  'tab-insights',
  'tab-editlog',
];
const PRICE_BANDS = ['', 'free', 'low', 'mid', 'high'];
const TIME_OF_DAY_OPTIONS = ['', 'ochtend', 'middag', 'hele dag', 'flexibel'];
const VERIFICATION_MODES = ['', 'editorial', 'partner', 'parent_signal', 'web_verified', 'phone_verified', 'visit_verified'];
const SEO_TIERS = ['auto', 'index', 'support', 'alias'];
const WEATHER_OPTIONS = ['', 'indoor', 'outdoor', 'hybrid', 'both'];

const supabase = createClient(SB_URL, SB_ANON);

const state = {
  currentUser: null,
  accessToken: null,
  otpEmail: '',
  claimsFilter: 'pending',
  observationFilter: 'pending',
  locPage: 0,
  locSearch: '',
  locSearchTimer: null,
  ownerModal: null,
  bootstrapNonce: 0,
  selectedLocationId: null,
  selectedLocation: null,
  editorialPageId: null,
};

const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => PortalShell.escapeHtml(value);

function escapeAttr(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function setSignedInChrome(email) {
  $('nav-user').textContent = email;
  $('nav-user').classList.remove('hidden');
  $('nav-logout').classList.remove('hidden');
}

function setSignedOutChrome() {
  $('nav-user').classList.add('hidden');
  $('nav-logout').classList.add('hidden');
}

function showScreen(screen) {
  ['login', 'otp', 'dashboard'].forEach((name) => {
    $(`screen-${name}`).classList.toggle('hidden', name !== screen);
  });
}

function normalizeOtpField(fieldId) {
  const input = $(fieldId);
  const value = (input?.value || '').replace(/\D/g, '').slice(0, 6);
  if (input) input.value = value;
  return value;
}

function setSelectOptions(selectId, options) {
  const select = $(selectId);
  if (!select) return;
  select.innerHTML = options.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value || '—')}</option>`).join('');
}

function markStatsLoading() {
  ['stat-pending', 'stat-subs', 'stat-edits', 'stat-owners', 'stat-observations', 'stat-tasks'].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.textContent = '...';
    el.classList.add('is-loading');
  });
}

async function api(action, params = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || state.accessToken;
  if (!accessToken) throw new Error('Sessie verlopen. Log opnieuw in.');
  state.accessToken = accessToken;

  const response = await fetch(`${EDGE_BASE}/admin-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SB_ANON,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action, params }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || (response.status === 401 ? 'Sessie niet geaccepteerd' : 'Onbekende API-fout');
    const code = payload?.code || 'API_ERROR';
    throw new Error(`${message} (${code})`);
  }

  return payload?.data;
}

async function sendOtp() {
  const email = $('admin-email').value.trim().toLowerCase();
  const btn = $('send-otp-btn');
  PortalShell.setAlert('login-alert', '', 'info');

  if (!email) {
    PortalShell.setAlert('login-alert', 'Vul je e-mailadres in.', 'error', { assertive: true });
    return;
  }
  if (email !== ADMIN_EMAIL) {
    PortalShell.setAlert('login-alert', 'Dit dashboard is alleen toegankelijk voor het vaste admin-account.', 'error', { assertive: true });
    return;
  }

  PortalShell.setButtonBusy(btn, true, 'Versturen...', 'Inlogcode sturen');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${location.origin}${location.pathname}`,
    },
  });
  if (error) {
    PortalShell.setButtonBusy(btn, false, null, 'Inlogcode sturen');
    PortalShell.setAlert('login-alert', `Inloggen mislukt: ${error.message}`, 'error', { assertive: true });
    return;
  }

  state.otpEmail = email;
  $('otp-email-display').textContent = email;
  $('otp-code').value = '';
  showScreen('otp');
  startOtpCooldown(btn, 60);
  setTimeout(() => $('otp-code').focus(), 60);
}

async function maybeHandleAuthCallback() {
  const params = new URLSearchParams(location.search);
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  const errorDescription = params.get('error_description');
  if (errorDescription) PortalShell.setAlert('login-alert', errorDescription, 'error', { assertive: true });
  if (!tokenHash || !type) return;
  try {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      PortalShell.setAlert('login-alert', 'De inloglink is ongeldig of verlopen. Vraag een nieuwe login aan.', 'error', { assertive: true });
    }
  } finally {
    history.replaceState({}, '', location.pathname);
  }
}

function startOtpCooldown(button, seconds) {
  let remaining = seconds;
  button.disabled = true;
  button.textContent = `Opnieuw sturen (${remaining}s)`;
  const timer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(timer);
      button.disabled = false;
      button.textContent = 'Inlogcode sturen';
    } else {
      button.textContent = `Opnieuw sturen (${remaining}s)`;
    }
  }, 1000);
}

async function verifyOtp() {
  const token = normalizeOtpField('otp-code');
  const btn = $('verify-otp-btn');
  PortalShell.setAlert('otp-alert', '', 'info');
  if (token.length !== 6) {
    PortalShell.setAlert('otp-alert', 'Vul de 6-cijferige code in.', 'error', { assertive: true });
    return;
  }
  PortalShell.setButtonBusy(btn, true, 'Controleren...', 'Inloggen');
  const { error } = await supabase.auth.verifyOtp({
    email: state.otpEmail,
    token,
    type: 'email',
  });
  PortalShell.setButtonBusy(btn, false, null, 'Inloggen');
  if (error) PortalShell.setAlert('otp-alert', 'Ongeldige of verlopen code. Vraag een nieuwe code aan.', 'error', { assertive: true });
}

async function bootstrapDashboard() {
  const nonce = ++state.bootstrapNonce;
  markStatsLoading();
  showScreen('dashboard');
  setSelectOptions('field-location-price-band', PRICE_BANDS);
  setSelectOptions('field-location-time-of-day-fit', TIME_OF_DAY_OPTIONS);
  setSelectOptions('field-location-verification-mode', VERIFICATION_MODES);
  setSelectOptions('field-location-weather', WEATHER_OPTIONS);
  setSelectOptions('field-seo-tier', SEO_TIERS);
  setSelectOptions('editorial-page-type', ['', 'discover_hub', 'methodology_page', 'region_hub', 'type_hub', 'cluster_hub', 'blog_index', 'blog_article', 'location_detail_override']);
  setSelectOptions('editorial-status', ['draft', 'published', 'archived']);
  setSelectOptions('observation-status-filter', ['pending', 'approved', 'rejected', 'applied']);
  await loadStats();
  if (nonce !== state.bootstrapNonce || !state.currentUser) return;
  await switchTab('tab-overview');
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    if (session.user.email !== ADMIN_EMAIL) {
      PortalShell.setAlert('otp-alert', 'Geen toegang: dit dashboard is alleen voor Bas Metten.', 'error', { assertive: true });
      supabase.auth.signOut().catch((error) => console.error('signOut failed', error));
      showScreen('otp');
      return;
    }
    state.currentUser = session.user;
    state.accessToken = session.access_token;
    setSignedInChrome(session.user.email);
    Promise.resolve().then(() => bootstrapDashboard()).catch((error) => {
      console.error('bootstrapDashboard failed', error);
      PortalShell.setAlert('overview-alert', 'Dashboard laden mislukt. Vernieuw de pagina of log opnieuw in.', 'error', { assertive: true });
    });
  } else {
    state.bootstrapNonce += 1;
    state.currentUser = null;
    state.accessToken = null;
    setSignedOutChrome();
    showScreen('login');
  }
});

async function handleLogout() {
  await supabase.auth.signOut();
}

async function switchTab(tabId) {
  TABS.forEach((id) => {
    const tabSection = $(id);
    const button = document.querySelector(`[data-tab-target="${id}"]`);
    const active = id === tabId;
    if (tabSection) tabSection.classList.toggle('hidden', !active);
    if (button) {
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    }
  });

  if (tabId === 'tab-claims') await loadClaims();
  if (tabId === 'tab-owners') await loadOwners();
  if (tabId === 'tab-locations') await loadLocations();
  if (tabId === 'tab-location-detail' && state.selectedLocationId) await loadLocationDetail(state.selectedLocationId);
  if (tabId === 'tab-trust') await loadObservations();
  if (tabId === 'tab-seo' && state.selectedLocationId) await loadLocationDetail(state.selectedLocationId);
  if (tabId === 'tab-editorial') await loadEditorialPages();
  if (tabId === 'tab-duplicates') await loadDuplicates();
  if (tabId === 'tab-publishing') await loadPublishing();
  if (tabId === 'tab-insights') await loadInsights();
  if (tabId === 'tab-editlog') await loadEditLog();
}

async function loadStats() {
  try {
    const stats = await api('get_stats');
    $('stat-pending').textContent = stats.pending_claims ?? 0;
    $('stat-subs').textContent = stats.active_subs ?? 0;
    $('stat-edits').textContent = stats.edits_last_7days ?? 0;
    $('stat-owners').textContent = stats.total_owners ?? 0;
    $('stat-observations').textContent = stats.pending_observations ?? 0;
    $('stat-tasks').textContent = stats.open_quality_tasks ?? 0;
    ['stat-pending', 'stat-subs', 'stat-edits', 'stat-owners', 'stat-observations', 'stat-tasks'].forEach((id) => $(id).classList.remove('is-loading'));
  } catch (error) {
    console.error('loadStats failed', error);
    ['stat-pending', 'stat-subs', 'stat-edits', 'stat-owners', 'stat-observations', 'stat-tasks'].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.textContent = '—';
      el.classList.remove('is-loading');
    });
    PortalShell.setAlert('overview-alert', 'Dashboard laden mislukt. Vernieuw de pagina of log opnieuw in.', 'error', { assertive: true });
  }
}

function setClaimsFilter(status, triggerButton) {
  state.claimsFilter = status;
  document.querySelectorAll('[data-claims-filter]').forEach((btn) => btn.classList.toggle('active', btn === triggerButton));
  loadClaims();
}

async function loadClaims() {
  const tbody = $('claims-tbody');
  tbody.innerHTML = '<tr class="portal-loading-row"><td colspan="6"><span class="portal-spinner"></span></td></tr>';
  PortalShell.setAlert('claims-alert', '', 'info');
  try {
    const claims = await api('list_claims', { status: state.claimsFilter });
    if (!claims?.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="portal-empty-state"><strong>Geen claim-aanvragen</strong>Er staan nu geen aanvragen in deze status.</div></td></tr>';
      return;
    }
    tbody.innerHTML = claims.map((claim) => {
      const status = safeClaimStatus(claim.status);
      const actionHtml = status === 'pending'
        ? `<div class="portal-btn-row"><button class="portal-btn portal-btn-success portal-btn-sm" type="button" data-claim-action="approve" data-claim-id="${escapeAttr(claim.id)}">Goedkeuren</button><button class="portal-btn portal-btn-danger portal-btn-sm" type="button" data-claim-action="reject" data-claim-id="${escapeAttr(claim.id)}">Afwijzen</button></div>`
        : '<span class="portal-muted">-</span>';
      return `<tr>
        <td class="portal-muted">${fmtDate(claim.created_at)}</td>
        <td>${escapeHtml(claim.requester_email || 'onbekend')}</td>
        <td><strong>${escapeHtml(claim.locations?.name || '-')}</strong><br><span class="portal-muted">${escapeHtml(claim.locations?.region || '')}</span></td>
        <td class="portal-truncate">${escapeHtml(claim.message || '')}</td>
        <td><span class="portal-badge portal-badge-${status}">${status}</span></td>
        <td class="actions">${actionHtml}</td>
      </tr>`;
    }).join('');
  } catch (error) {
    PortalShell.setAlert('claims-alert', `Claims laden mislukt: ${error.message}`, 'error', { assertive: true });
  }
}

async function onClaimsTableClick(event) {
  const button = event.target.closest('[data-claim-action]');
  if (!button) return;
  const claimId = button.dataset.claimId;
  const action = button.dataset.claimAction;
  if (!claimId) return;

  if (action === 'approve') {
    const confirmed = await PortalShell.showConfirm({
      title: 'Claim goedkeuren?',
      text: 'Deze claim wordt goedgekeurd en andere open claims op dezelfde locatie worden automatisch afgewezen.',
      confirmLabel: 'Goedkeuren',
      trigger: button,
    });
    if (!confirmed) return;
    PortalShell.setButtonBusy(button, true, 'Bezig...', 'Goedkeuren');
    try {
      const result = await api('approve_claim', { claim_id: claimId });
      const autoRejectedCount = Array.isArray(result?.auto_rejected_claim_ids) ? result.auto_rejected_claim_ids.length : 0;
      PortalShell.setAlert('claims-alert', `Claim goedgekeurd. Auto-afgewezen duplicate claims: ${autoRejectedCount}.`, 'success');
      await loadClaims();
      await loadStats();
    } catch (error) {
      PortalShell.setAlert('claims-alert', `Goedkeuren mislukt: ${error.message}`, 'error', { assertive: true });
    } finally {
      PortalShell.setButtonBusy(button, false, null, 'Goedkeuren');
    }
  }

  if (action === 'reject') {
    const confirmed = await PortalShell.showConfirm({
      title: 'Claim afwijzen?',
      text: 'Deze claim krijgt status afgewezen.',
      confirmLabel: 'Afwijzen',
      trigger: button,
    });
    if (!confirmed) return;
    PortalShell.setButtonBusy(button, true, 'Bezig...', 'Afwijzen');
    try {
      await api('reject_claim', { claim_id: claimId });
      PortalShell.setAlert('claims-alert', 'Claim afgewezen.', 'success');
      await loadClaims();
      await loadStats();
    } catch (error) {
      PortalShell.setAlert('claims-alert', `Afwijzen mislukt: ${error.message}`, 'error', { assertive: true });
    } finally {
      PortalShell.setButtonBusy(button, false, null, 'Afwijzen');
    }
  }
}

async function loadOwners() {
  const tbody = $('owners-tbody');
  tbody.innerHTML = '<tr class="portal-loading-row"><td colspan="6"><span class="portal-spinner"></span></td></tr>';
  PortalShell.setAlert('owners-alert', '', 'info');
  try {
    const owners = await api('list_owners');
    if (!owners?.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="portal-empty-state"><strong>Geen owners gevonden</strong>Er zijn nog geen gekoppelde eigenaar-accounts om te beheren.</div></td></tr>';
      return;
    }
    tbody.innerHTML = owners.map((owner) => {
      const status = safeOwnerStatus(owner.subscription_status);
      const tier = safePlanTier(owner.plan_tier);
      return `<tr>
        <td>${escapeHtml(owner.email || 'onbekend')}</td>
        <td>${escapeHtml(owner.locations?.name || '-')}</td>
        <td>${escapeHtml(tier)}</td>
        <td><span class="portal-badge portal-badge-${status}">${status}</span></td>
        <td class="portal-muted">${owner.plan_expires_at ? fmtDate(owner.plan_expires_at) : '-'}</td>
        <td><button class="portal-btn portal-btn-secondary portal-btn-sm" type="button" data-owner-edit="true" data-owner-id="${escapeAttr(owner.id)}" data-owner-status="${escapeAttr(status)}" data-owner-tier="${escapeAttr(tier)}">Bewerk</button></td>
      </tr>`;
    }).join('');
  } catch (error) {
    PortalShell.setAlert('owners-alert', `Owners laden mislukt: ${error.message}`, 'error', { assertive: true });
  }
}

function onOwnersTableClick(event) {
  const button = event.target.closest('[data-owner-edit]');
  if (!button) return;
  openEditOwner(button.dataset.ownerId, button.dataset.ownerStatus, button.dataset.ownerTier, button);
}

function openEditOwner(ownerId, status, tier, trigger) {
  $('modal-owner-id').value = ownerId;
  $('modal-status').value = safeOwnerStatus(status);
  $('modal-tier').value = safePlanTier(tier);
  PortalShell.setAlert('modal-alert', '', 'info');
  PortalShell.openModal('edit-owner-modal', trigger);
}

async function saveOwnerEdit() {
  const ownerId = $('modal-owner-id').value;
  const status = safeOwnerStatus($('modal-status').value);
  const tier = safePlanTier($('modal-tier').value);
  const saveBtn = $('modal-save-btn');
  PortalShell.setButtonBusy(saveBtn, true, 'Opslaan...', 'Opslaan');
  try {
    await api('update_owner', { owner_id: ownerId, subscription_status: status, plan_tier: tier });
    PortalShell.closeModal('edit-owner-modal');
    PortalShell.setAlert('owners-alert', 'Abonnement bijgewerkt.', 'success');
    await loadOwners();
    await loadStats();
  } catch (error) {
    PortalShell.setAlert('modal-alert', `Opslaan mislukt: ${error.message}`, 'error', { assertive: true });
  } finally {
    PortalShell.setButtonBusy(saveBtn, false, null, 'Opslaan');
  }
}

function debounceLocSearch() {
  clearTimeout(state.locSearchTimer);
  state.locSearchTimer = setTimeout(() => {
    state.locSearch = $('loc-search').value.trim();
    state.locPage = 0;
    loadLocations();
  }, 280);
}

function changeLocPage(direction) {
  state.locPage = Math.max(0, state.locPage + direction);
  loadLocations();
}

async function loadLocations() {
  const tbody = $('locations-tbody');
  tbody.innerHTML = '<tr class="portal-loading-row"><td colspan="7"><span class="portal-spinner"></span></td></tr>';
  $('loc-page-label').textContent = `Pagina ${state.locPage + 1}`;
  $('loc-prev-btn').disabled = state.locPage === 0;
  PortalShell.setAlert('locations-alert', '', 'info');
  try {
    const locations = await api('list_locations', { search: state.locSearch, page: state.locPage });
    $('loc-next-btn').disabled = (locations?.length || 0) < 50;
    if (!locations?.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="portal-muted">Geen locaties gevonden.</td></tr>';
      return;
    }
    tbody.innerHTML = locations.map((location) => `
      <tr>
        <td><strong>${escapeHtml(location.name)}</strong></td>
        <td class="portal-muted">${escapeHtml(location.region || '')}</td>
        <td class="portal-muted">${escapeHtml(location.seo_primary_locality || '—')}</td>
        <td><span class="portal-badge portal-badge-${escapeAttr(location.seo_tier || 'auto')}">${escapeHtml(location.seo_tier || 'auto')}</span></td>
        <td><label class="portal-toggle"><input type="checkbox" ${location.is_featured ? 'checked' : ''} data-toggle-type="featured" data-location-id="${location.id}"><span class="portal-toggle-track"></span></label></td>
        <td><label class="portal-toggle"><input type="checkbox" ${location.owner_verified ? 'checked' : ''} data-toggle-type="verified" data-location-id="${location.id}"><span class="portal-toggle-track"></span></label></td>
        <td class="actions"><div class="portal-btn-row"><button class="portal-btn portal-btn-secondary portal-btn-sm" type="button" data-open-location="content" data-location-id="${location.id}">Inhoud</button><button class="portal-btn portal-btn-secondary portal-btn-sm" type="button" data-open-location="seo" data-location-id="${location.id}">SEO</button></div></td>
      </tr>
    `).join('');
  } catch (error) {
    PortalShell.setAlert('locations-alert', `Locaties laden mislukt: ${error.message}`, 'error', { assertive: true });
  }
}

async function onLocationsTableClick(event) {
  const button = event.target.closest('[data-open-location]');
  if (!button) return;
  const locationId = Number(button.dataset.locationId);
  if (!locationId) return;
  state.selectedLocationId = locationId;
  await loadLocationDetail(locationId);
  await switchTab(button.dataset.openLocation === 'seo' ? 'tab-seo' : 'tab-location-detail');
}

async function onLocationsTableChange(event) {
  const input = event.target.closest('[data-toggle-type]');
  if (!input) return;
  const locationId = Number(input.dataset.locationId);
  const action = input.dataset.toggleType;
  if (!locationId || !action) return;
  input.disabled = true;
  try {
    if (action === 'featured') {
      const result = await api('toggle_featured', { location_id: locationId });
      input.checked = !!result.is_featured;
    }
    if (action === 'verified') {
      const result = await api('toggle_verified', { location_id: locationId });
      input.checked = !!result.owner_verified;
    }
  } catch (error) {
    input.checked = !input.checked;
    PortalShell.setAlert('locations-alert', `Wijzigen mislukt: ${error.message}`, 'error', { assertive: true });
  } finally {
    input.disabled = false;
  }
}

function renderLocationSummaries(location) {
  const summaryHtml = location
    ? `<strong>${escapeHtml(location.name)}</strong><br><span class="portal-muted">${escapeHtml(location.region || '')}${location.seo_primary_locality ? ` · ${escapeHtml(location.seo_primary_locality)}` : ''}</span><br><span class="portal-muted">Tier: ${escapeHtml(location.seo_tier || 'auto')} · Verificatie: ${escapeHtml(location.verification_mode || 'onbekend')}</span>`
    : '<div class="portal-empty-state"><strong>Nog geen locatie gekozen</strong>Open eerst een locatie vanuit de tab Locaties.</div>';
  $('location-detail-summary').innerHTML = summaryHtml;
  $('seo-location-summary').innerHTML = summaryHtml;
}

function fillLocationForms(payload) {
  const location = payload?.location || null;
  state.selectedLocation = location;
  renderLocationSummaries(location);
  if (!location) return;
  $('field-location-description').value = location.description || '';
  $('field-location-toddler-highlight').value = location.toddler_highlight || '';
  $('field-location-website').value = location.website || '';
  $('field-location-opening-hours').value = location.opening_hours || '';
  $('field-location-owner-photo-url').value = location.owner_photo_url || '';
  $('field-location-weather').value = location.weather || '';
  $('field-location-min-age').value = location.min_age ?? '';
  $('field-location-max-age').value = location.max_age ?? '';
  $('field-location-coffee').checked = !!location.coffee;
  $('field-location-diaper').checked = !!location.diaper;
  $('field-location-alcohol').checked = !!location.alcohol;
  $('field-location-price-band').value = location.price_band || '';
  $('field-location-time-of-day-fit').value = location.time_of_day_fit || '';
  $('field-location-verification-mode').value = location.verification_mode || '';
  $('field-location-verification-confidence').value = location.verification_confidence ?? '';
  $('field-location-rain-backup-quality').value = location.rain_backup_quality || '';
  $('field-location-shade-or-shelter').value = location.shade_or_shelter || '';
  $('field-location-parking-ease').value = location.parking_ease || '';
  $('field-location-buggy-friendliness').value = location.buggy_friendliness || '';
  $('field-location-toilet-confidence').value = location.toilet_confidence || '';
  $('field-location-noise-level').value = location.noise_level || '';
  $('field-location-food-fit').value = location.food_fit || '';
  $('field-location-play-corner-quality').value = location.play_corner_quality || '';
  $('field-location-crowd-pattern').value = location.crowd_pattern || '';

  $('field-seo-primary-locality').value = location.seo_primary_locality || '';
  $('field-seo-tier').value = location.seo_tier || 'auto';
  $('field-seo-title-override').value = location.seo_title_override || '';
  $('field-seo-description-override').value = location.seo_description_override || '';
  $('field-seo-intro-override').value = location.seo_intro_override || '';
  $('field-seo-exclude-from-sitemap').checked = !!location.seo_exclude_from_sitemap;
  $('field-seo-canonical-target').value = location.seo_canonical_target ?? '';

  const history = payload?.recent_edits || [];
  $('location-history-tbody').innerHTML = history.length
    ? history.map((entry) => `<tr><td class="portal-muted">${fmtDateTime(entry.created_at)}</td><td>${escapeHtml(entry.field_name || '-')}</td><td class="portal-truncate">${escapeHtml(valueOrDash(entry.old_value))}</td><td class="portal-truncate">${escapeHtml(valueOrDash(entry.new_value))}</td><td class="portal-muted">${escapeHtml(entry.owner_email || 'onbekend')}</td></tr>`).join('')
    : '<tr><td colspan="5" class="portal-muted">Nog geen recente wijzigingen.</td></tr>';

  const tasks = payload?.quality_tasks || [];
  $('location-tasks-list').innerHTML = tasks.length
    ? tasks.map((task) => `
      <li>
        <strong>${escapeHtml(task.task_type)}</strong>
        <span class="portal-muted">· ${escapeHtml(task.status)} · prioriteit ${escapeHtml(String(task.priority))}</span>
        <br><span class="portal-muted">${escapeHtml(summarizeQualityTask(task))}</span>
        <div class="portal-btn-row" style="margin-top:8px;">
          <button class="portal-btn portal-btn-secondary portal-btn-sm" type="button" data-open-location="content" data-location-id="${escapeAttr(state.selectedLocationId)}">Open locatie</button>
          <button class="portal-btn portal-btn-success portal-btn-sm" type="button" data-quality-task-action="resolved" data-task-id="${escapeAttr(task.id)}">Resolved</button>
          <button class="portal-btn portal-btn-secondary portal-btn-sm" type="button" data-quality-task-action="dismissed" data-task-id="${escapeAttr(task.id)}">Dismiss</button>
        </div>
      </li>`).join('')
    : '<li class="portal-muted">Geen open quality tasks voor deze locatie.</li>';
}

async function loadLocationDetail(locationId) {
  PortalShell.setAlert('location-detail-alert', '', 'info');
  PortalShell.setAlert('seo-alert', '', 'info');
  try {
    const payload = await api('get_location_detail', { location_id: locationId });
    fillLocationForms(payload);
  } catch (error) {
    PortalShell.setAlert('location-detail-alert', `Locatie laden mislukt: ${error.message}`, 'error', { assertive: true });
    PortalShell.setAlert('seo-alert', `SEO-data laden mislukt: ${error.message}`, 'error', { assertive: true });
  }
}

async function saveLocationDetail() {
  if (!state.selectedLocationId) {
    PortalShell.setAlert('location-detail-alert', 'Open eerst een locatie vanuit de tab Locaties.', 'error', { assertive: true });
    return;
  }
  const btn = $('save-location-detail-btn');
  PortalShell.setButtonBusy(btn, true, 'Opslaan...', 'Opslaan');
  try {
    await api('update_location_detail', {
      location_id: state.selectedLocationId,
      description: $('field-location-description').value,
      toddler_highlight: $('field-location-toddler-highlight').value,
      website: $('field-location-website').value,
      opening_hours: $('field-location-opening-hours').value,
      owner_photo_url: $('field-location-owner-photo-url').value,
      weather: $('field-location-weather').value,
      min_age: $('field-location-min-age').value === '' ? null : Number($('field-location-min-age').value),
      max_age: $('field-location-max-age').value === '' ? null : Number($('field-location-max-age').value),
      coffee: $('field-location-coffee').checked,
      diaper: $('field-location-diaper').checked,
      alcohol: $('field-location-alcohol').checked,
      price_band: $('field-location-price-band').value,
      time_of_day_fit: $('field-location-time-of-day-fit').value,
      verification_mode: $('field-location-verification-mode').value,
      verification_confidence: $('field-location-verification-confidence').value === '' ? null : Number($('field-location-verification-confidence').value),
      rain_backup_quality: $('field-location-rain-backup-quality').value,
      shade_or_shelter: $('field-location-shade-or-shelter').value,
      parking_ease: $('field-location-parking-ease').value,
      buggy_friendliness: $('field-location-buggy-friendliness').value,
      toilet_confidence: $('field-location-toilet-confidence').value,
      noise_level: $('field-location-noise-level').value,
      food_fit: $('field-location-food-fit').value,
      play_corner_quality: $('field-location-play-corner-quality').value,
      crowd_pattern: $('field-location-crowd-pattern').value,
    });
    PortalShell.setAlert('location-detail-alert', 'Locatie-inhoud opgeslagen.', 'success');
    await loadLocationDetail(state.selectedLocationId);
    await loadLocations();
    await loadInsights();
    await loadStats();
  } catch (error) {
    PortalShell.setAlert('location-detail-alert', `Opslaan mislukt: ${error.message}`, 'error', { assertive: true });
  } finally {
    PortalShell.setButtonBusy(btn, false, null, 'Opslaan');
  }
}

async function ensureLocationEditorialDraft() {
  if (!state.selectedLocationId) {
    PortalShell.setAlert('location-detail-alert', 'Open eerst een locatie vanuit de tab Locaties.', 'error', { assertive: true });
    return;
  }
  const btn = $('create-location-draft-btn');
  PortalShell.setButtonBusy(btn, true, 'Aanmaken...', 'Maak redactioneel draft');
  try {
    const result = await api('ensure_location_editorial_draft', { location_id: state.selectedLocationId });
    fillEditorialForm(result.page);
    await loadEditorialPages();
    await switchTab('tab-editorial');
    PortalShell.setAlert(
      'editorial-alert',
      result.created ? 'Nieuw redactioneel draft aangemaakt vanuit deze locatie.' : 'Bestaand redactioneel draft geopend.',
      'success',
    );
  } catch (error) {
    PortalShell.setAlert('location-detail-alert', `Draft aanmaken mislukt: ${error.message}`, 'error', { assertive: true });
  } finally {
    PortalShell.setButtonBusy(btn, false, null, 'Maak redactioneel draft');
  }
}

async function saveLocationSeo() {
  if (!state.selectedLocationId) {
    PortalShell.setAlert('seo-alert', 'Open eerst een locatie vanuit de tab Locaties.', 'error', { assertive: true });
    return;
  }
  const btn = $('save-location-seo-btn');
  PortalShell.setButtonBusy(btn, true, 'Opslaan...', 'Opslaan');
  try {
    await api('update_location_detail', {
      location_id: state.selectedLocationId,
      seo_primary_locality: $('field-seo-primary-locality').value,
      seo_tier: $('field-seo-tier').value,
      seo_title_override: $('field-seo-title-override').value,
      seo_description_override: $('field-seo-description-override').value,
      seo_intro_override: $('field-seo-intro-override').value,
      seo_exclude_from_sitemap: $('field-seo-exclude-from-sitemap').checked,
      seo_canonical_target: $('field-seo-canonical-target').value === '' ? null : Number($('field-seo-canonical-target').value),
    });
    PortalShell.setAlert('seo-alert', 'SEO-instellingen opgeslagen.', 'success');
    await loadLocationDetail(state.selectedLocationId);
    await loadLocations();
    await loadInsights();
    await loadStats();
  } catch (error) {
    PortalShell.setAlert('seo-alert', `SEO opslaan mislukt: ${error.message}`, 'error', { assertive: true });
  } finally {
    PortalShell.setButtonBusy(btn, false, null, 'Opslaan');
  }
}

async function loadObservations() {
  const tbody = $('observations-tbody');
  tbody.innerHTML = '<tr class="portal-loading-row"><td colspan="8"><span class="portal-spinner"></span></td></tr>';
  PortalShell.setAlert('trust-alert', '', 'info');
  try {
    const rows = await api('list_observations', { status: $('observation-status-filter').value || state.observationFilter });
    if (!rows?.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="portal-empty-state"><strong>Geen observaties</strong>Er zijn geen observaties in deze status.</div></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map((row) => {
      const actions = row.status === 'pending'
        ? `<div class="portal-btn-row"><button class="portal-btn portal-btn-success portal-btn-sm" type="button" data-observation-action="approve" data-observation-id="${escapeAttr(row.id)}">Goedkeuren</button><button class="portal-btn portal-btn-danger portal-btn-sm" type="button" data-observation-action="reject" data-observation-id="${escapeAttr(row.id)}">Afwijzen</button></div>`
        : row.status === 'approved'
          ? `<button class="portal-btn portal-btn-primary portal-btn-sm" type="button" data-observation-action="apply" data-observation-id="${escapeAttr(row.id)}">Toepassen</button>`
          : '<span class="portal-muted">-</span>';
      return `<tr>
        <td class="portal-muted">${fmtDateTime(row.created_at)}</td>
        <td><strong>${escapeHtml(row.locations?.name || '-')}</strong><br><span class="portal-muted">${escapeHtml(row.locations?.region || '')}</span></td>
        <td>${escapeHtml(row.source_type)}</td>
        <td><code>${escapeHtml(row.field_name)}</code></td>
        <td class="portal-truncate">${escapeHtml(JSON.stringify(row.value_json))}</td>
        <td class="portal-muted">${row.confidence ?? '-'}</td>
        <td class="portal-truncate">${escapeHtml(row.evidence_url || row.notes || '')}</td>
        <td class="actions">${actions}</td>
      </tr>`;
    }).join('');
  } catch (error) {
    PortalShell.setAlert('trust-alert', `Observaties laden mislukt: ${error.message}`, 'error', { assertive: true });
  }
}

async function onObservationsTableClick(event) {
  const button = event.target.closest('[data-observation-action]');
  if (!button) return;
  const observationId = button.dataset.observationId;
  const action = button.dataset.observationAction;
  if (!observationId) return;
  PortalShell.setButtonBusy(button, true, 'Bezig...', button.textContent || 'Actie');
  try {
    if (action === 'approve') await api('review_observation', { observation_id: observationId, status: 'approved' });
    if (action === 'reject') await api('review_observation', { observation_id: observationId, status: 'rejected' });
    if (action === 'apply') await api('apply_observation', { observation_id: observationId });
    PortalShell.setAlert('trust-alert', `Observation ${action === 'apply' ? 'toegepast' : action === 'approve' ? 'goedgekeurd' : 'afgewezen'}.`, 'success');
    await loadObservations();
    await loadStats();
    if (state.selectedLocationId) await loadLocationDetail(state.selectedLocationId);
  } catch (error) {
    PortalShell.setAlert('trust-alert', `Observationactie mislukt: ${error.message}`, 'error', { assertive: true });
  } finally {
    PortalShell.setButtonBusy(button, false, null, button.textContent || 'Actie');
  }
}

async function loadEditorialPages() {
  const tbody = $('editorial-tbody');
  tbody.innerHTML = '<tr class="portal-loading-row"><td colspan="5"><span class="portal-spinner"></span></td></tr>';
  PortalShell.setAlert('editorial-alert', '', 'info');
  try {
    const rows = await api('list_editorial_pages', { status: $('editorial-status-filter').value || '' });
    if (!rows?.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="portal-empty-state"><strong>Nog geen editorial pages</strong>Gebruik Nieuw om een redactionele pagina toe te voegen.</div></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map((row) => `<tr>
      <td>${escapeHtml(row.page_type)}</td>
      <td>${escapeHtml(row.slug)}</td>
      <td>${escapeHtml(row.status)}</td>
      <td class="portal-muted">${fmtDateTime(row.updated_at)}</td>
      <td><button class="portal-btn portal-btn-secondary portal-btn-sm" type="button" data-editorial-open="${escapeAttr(row.id)}">Open</button></td>
    </tr>`).join('');
  } catch (error) {
    PortalShell.setAlert('editorial-alert', `Editorial pages laden mislukt: ${error.message}`, 'error', { assertive: true });
  }
}

function fillEditorialForm(page) {
  state.editorialPageId = page?.id || null;
  $('editorial-page-id').value = page?.id || '';
  $('editorial-page-type').value = page?.page_type || '';
  $('editorial-slug').value = page?.slug || '';
  $('editorial-region-slug').value = page?.region_slug || '';
  $('editorial-type-slug').value = page?.type_slug || '';
  $('editorial-cluster-slug').value = page?.cluster_slug || '';
  $('editorial-location-id').value = page?.location_id ?? '';
  $('editorial-status').value = page?.status || 'draft';
  $('editorial-title').value = page?.title || '';
  $('editorial-meta-title').value = page?.meta_title || '';
  $('editorial-meta-description').value = page?.meta_description || '';
  $('editorial-hero-kicker').value = page?.hero_kicker || '';
  $('editorial-hero-body').value = page?.hero_body_md || '';
  $('editorial-body').value = page?.body_md || '';
  $('editorial-faq-json').value = page?.faq_json ? JSON.stringify(page.faq_json, null, 2) : '[]';
  $('editorial-curated-location-ids').value = Array.isArray(page?.curated_location_ids) ? page.curated_location_ids.join(', ') : '';
  $('editorial-related-blog-slugs').value = Array.isArray(page?.related_blog_slugs) ? page.related_blog_slugs.join(', ') : '';
  $('editorial-label').value = page?.editorial_label || 'PeuterPlannen redactie';
  $('editorial-summary').innerHTML = page
    ? `<strong>${escapeHtml(page.title)}</strong><br><span class="portal-muted">${escapeHtml(page.page_type)} · ${escapeHtml(page.status)}</span>`
    : '<div class="portal-empty-state"><strong>Nieuwe redactionele pagina</strong>Vul de velden in en sla op als draft of published.</div>';
}

async function loadEditorialPage(pageId) {
  try {
    const page = await api('get_editorial_page', { page_id: pageId });
    fillEditorialForm(page);
  } catch (error) {
    PortalShell.setAlert('editorial-alert', `Editorial page laden mislukt: ${error.message}`, 'error', { assertive: true });
  }
}

function resetEditorialForm() {
  fillEditorialForm(null);
}

async function saveEditorialPage() {
  const btn = $('save-editorial-page-btn');
  PortalShell.setButtonBusy(btn, true, 'Opslaan...', 'Opslaan');
  PortalShell.setAlert('editorial-alert', '', 'info');
  try {
    const faqRaw = $('editorial-faq-json').value.trim() || '[]';
    let faqJson;
    try {
      faqJson = JSON.parse(faqRaw);
    } catch {
      throw new Error('FAQ JSON is ongeldig. Gebruik een JSON-array.');
    }
    const result = await api('save_editorial_page', {
      page_id: $('editorial-page-id').value || null,
      page_type: $('editorial-page-type').value,
      slug: $('editorial-slug').value,
      region_slug: $('editorial-region-slug').value,
      type_slug: $('editorial-type-slug').value,
      cluster_slug: $('editorial-cluster-slug').value,
      location_id: $('editorial-location-id').value === '' ? null : Number($('editorial-location-id').value),
      status: $('editorial-status').value,
      title: $('editorial-title').value,
      meta_title: $('editorial-meta-title').value,
      meta_description: $('editorial-meta-description').value,
      hero_kicker: $('editorial-hero-kicker').value,
      hero_body_md: $('editorial-hero-body').value,
      body_md: $('editorial-body').value,
      faq_json: faqJson,
      curated_location_ids: $('editorial-curated-location-ids').value,
      related_blog_slugs: $('editorial-related-blog-slugs').value,
      editorial_label: $('editorial-label').value,
    });
    PortalShell.setAlert('editorial-alert', 'Editorial page opgeslagen.', 'success');
    fillEditorialForm(result.page);
    await loadEditorialPages();
  } catch (error) {
    PortalShell.setAlert('editorial-alert', `Editorial opslaan mislukt: ${error.message}`, 'error', { assertive: true });
  } finally {
    PortalShell.setButtonBusy(btn, false, null, 'Opslaan');
  }
}

async function onEditorialTableClick(event) {
  const button = event.target.closest('[data-editorial-open]');
  if (!button) return;
  await loadEditorialPage(button.dataset.editorialOpen);
}

async function loadDuplicates() {
  const tbody = $('duplicates-tbody');
  tbody.innerHTML = '<tr class="portal-loading-row"><td colspan="4"><span class="portal-spinner"></span></td></tr>';
  PortalShell.setAlert('duplicates-alert', '', 'info');
  try {
    const groups = await api('list_duplicate_candidates');
    if (!groups?.length) {
      tbody.innerHTML = '<tr><td colspan="4"><div class="portal-empty-state"><strong>Geen duplicate candidates</strong>De huidige dataset toont geen duidelijke canonical candidates.</div></td></tr>';
      return;
    }
    tbody.innerHTML = groups.map((group) => {
      const items = group.items.map((item) => `${item.id}: ${escapeHtml(item.name)}${item.seo_primary_locality ? ` (${escapeHtml(item.seo_primary_locality)})` : ''}${Number(item.id) === Number(group.canonical_suggestion_id) ? ' <span class="portal-muted">· canonical</span>' : ''}`).join('<br>');
      const aliasIds = group.items
        .map((item) => Number(item.id))
        .filter((id) => id && id !== Number(group.canonical_suggestion_id))
        .join(',');
      return `<tr>
        <td><strong>${escapeHtml(group.group_label)}</strong></td>
        <td class="portal-inline-code">${escapeHtml(String(group.canonical_suggestion_id))}</td>
        <td>${items}</td>
        <td>
          <div class="portal-btn-row">
            <button class="portal-btn portal-btn-secondary portal-btn-sm" type="button" data-open-location="seo" data-location-id="${escapeAttr(group.canonical_suggestion_id)}">Open in SEO</button>
            <button class="portal-btn portal-btn-primary portal-btn-sm" type="button" data-duplicate-merge="true" data-canonical-id="${escapeAttr(group.canonical_suggestion_id)}" data-alias-ids="${escapeAttr(aliasIds)}">Canonical toepassen</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  } catch (error) {
    PortalShell.setAlert('duplicates-alert', `Duplicate candidates laden mislukt: ${error.message}`, 'error', { assertive: true });
  }
}

async function onDuplicatesTableClick(event) {
  const mergeBtn = event.target.closest('[data-duplicate-merge]');
  if (!mergeBtn) {
    await onLocationsTableClick(event);
    return;
  }
  const canonicalId = Number(mergeBtn.dataset.canonicalId);
  const aliasIds = (mergeBtn.dataset.aliasIds || '').split(',').map((value) => Number(value)).filter(Boolean);
  if (!canonicalId || !aliasIds.length) return;
  PortalShell.setButtonBusy(mergeBtn, true, 'Toepassen...', 'Canonical toepassen');
  try {
    await api('apply_duplicate_merge', {
      canonical_location_id: canonicalId,
      alias_location_ids: aliasIds,
    });
    PortalShell.setAlert('duplicates-alert', 'Canonical merge toegepast.', 'success');
    await loadDuplicates();
    await loadInsights();
    if (state.selectedLocationId && [canonicalId, ...aliasIds].includes(Number(state.selectedLocationId))) {
      await loadLocationDetail(canonicalId);
    }
  } catch (error) {
    PortalShell.setAlert('duplicates-alert', `Canonical merge mislukt: ${error.message}`, 'error', { assertive: true });
  } finally {
    PortalShell.setButtonBusy(mergeBtn, false, null, 'Canonical toepassen');
  }
}

async function loadPublishing() {
  PortalShell.setAlert('publishing-alert', '', 'info');
  try {
    const stateData = await api('get_publish_state');
    $('publish-dirty').textContent = stateData?.dirty ? 'Ja' : 'Nee';
    $('publish-pending-count').textContent = stateData?.pending_count ?? 0;
    $('publish-last-change').textContent = stateData?.last_change_reason || '-';
    $('publish-last-published').textContent = stateData?.last_published_at ? fmtDateTime(stateData.last_published_at) : '-';
    $('publish-last-ref').textContent = stateData?.last_publish_ref || '-';
  } catch (error) {
    PortalShell.setAlert('publishing-alert', `Publish-state laden mislukt: ${error.message}`, 'error', { assertive: true });
  }
}

async function triggerPublish() {
  const btn = $('publish-trigger-btn');
  PortalShell.setButtonBusy(btn, true, 'Aanmaken...', 'Site opnieuw klaarzetten');
  try {
    await api('trigger_publish', { reason: 'admin-manual-trigger' });
    PortalShell.setAlert('publishing-alert', 'Dirty-flag gezet. De sync-keten kan nu opnieuw publiceren.', 'success');
    await loadPublishing();
  } catch (error) {
    PortalShell.setAlert('publishing-alert', `Herpubliceren klaarzetten mislukt: ${error.message}`, 'error', { assertive: true });
  } finally {
    PortalShell.setButtonBusy(btn, false, null, 'Site opnieuw klaarzetten');
  }
}

async function loadInsights() {
  PortalShell.setAlert('insights-alert', '', 'info');
  try {
    const insights = await api('get_insights');
    const gsc = insights.latest_gsc_snapshot || null;
    const gscSummary = gsc?.summary || null;
    $('insight-summary').innerHTML = `
      <div class="portal-grid portal-grid-two">
        <div class="portal-card portal-card-soft"><strong>Pending observations</strong><div>${escapeHtml(String(insights.pending_observations ?? 0))}</div></div>
        <div class="portal-card portal-card-soft"><strong>Open quality tasks</strong><div>${escapeHtml(String(insights.open_quality_tasks ?? 0))}</div></div>
        <div class="portal-card portal-card-soft"><strong>GSC klikken (7d)</strong><div>${gscSummary ? escapeHtml(String(Math.round(Number(gscSummary.clicks ?? 0)))) : '-'}</div></div>
        <div class="portal-card portal-card-soft"><strong>GSC vertoningen (7d)</strong><div>${gscSummary ? escapeHtml(String(Math.round(Number(gscSummary.impressions ?? 0)))) : '-'}</div></div>
      </div>`;

    $('insight-context-gaps').innerHTML = (insights.top_context_gaps || []).length
      ? insights.top_context_gaps.map((row) => `<li><button class="portal-link-btn" type="button" data-open-location="content" data-location-id="${escapeAttr(row.location_id)}">${escapeHtml(row.name)}</button> <span class="portal-muted">(${escapeHtml(row.region)} · tier ${escapeHtml(row.seo_tier)})</span><br><span class="portal-muted">Ontbreekt: ${escapeHtml((row.missing_fields || []).join(', '))}</span></li>`).join('')
      : '<li class="portal-muted">Geen context gaps gevonden.</li>';

    $('insight-gsc-summary').innerHTML = gsc
      ? `<strong>Laatste GSC snapshot</strong><br><span class="portal-muted">${fmtDateTime(gsc.latest_snapshot_at)} · CTR ${(Number(gsc.summary?.ctr || 0) * 100).toFixed(1)}% · positie ${Number(gsc.summary?.position || 0).toFixed(1)}</span>`
      : '<span class="portal-muted">Nog geen GSC snapshots in de database.</span>';

    $('insight-top-pages').innerHTML = (gsc?.top_pages || []).length
      ? gsc.top_pages.map((row) => `
        <li>
          <a class="portal-link-btn" href="${escapeAttr(row.page)}" target="_blank" rel="noreferrer">${escapeHtml(row.path || row.page)}</a>
          <span class="portal-muted">· ${escapeHtml(row.page_type || 'page')} · ${escapeHtml(String(row.clicks || 0))} kliks · ${escapeHtml(String(row.impressions || 0))} vertoningen · positie ${escapeHtml(Number(row.position || 0).toFixed(1))}</span>
        </li>`).join('')
      : '<li class="portal-muted">Nog geen top pages beschikbaar.</li>';

    $('insight-top-queries').innerHTML = (gsc?.top_queries || []).length
      ? gsc.top_queries.map((row) => `
        <li>
          <strong>${escapeHtml(row.query || '-')}</strong>
          <span class="portal-muted">· ${escapeHtml(String(row.clicks || 0))} kliks · ${escapeHtml(String(row.impressions || 0))} vertoningen · CTR ${(Number(row.ctr || 0) * 100).toFixed(1)}% · positie ${escapeHtml(Number(row.position || 0).toFixed(1))}</span>
        </li>`).join('')
      : '<li class="portal-muted">Nog geen top queries beschikbaar.</li>';

    $('insight-low-ctr').innerHTML = (gsc?.low_ctr_pages || []).length
      ? gsc.low_ctr_pages.map((row) => `
        <li>
          <a class="portal-link-btn" href="${escapeAttr(row.page)}" target="_blank" rel="noreferrer">${escapeHtml(row.path || row.page)}</a>
          <span class="portal-muted">· ${escapeHtml(String(row.impressions || 0))} vertoningen · CTR ${(Number(row.ctr || 0) * 100).toFixed(1)}% · positie ${escapeHtml(Number(row.position || 0).toFixed(1))}</span>
        </li>`).join('')
      : '<li class="portal-muted">Nog geen low-CTR pagina’s gevonden.</li>';

    $('insight-near-win').innerHTML = (gsc?.near_win_pages || []).length
      ? gsc.near_win_pages.map((row) => `
        <li>
          <a class="portal-link-btn" href="${escapeAttr(row.page)}" target="_blank" rel="noreferrer">${escapeHtml(row.path || row.page)}</a>
          <span class="portal-muted">· ${escapeHtml(String(row.impressions || 0))} vertoningen · positie ${escapeHtml(Number(row.position || 0).toFixed(1))}</span>
        </li>`).join('')
      : '<li class="portal-muted">Nog geen near-win pagina’s in deze snapshot.</li>';

    $('insight-quality-backlog').innerHTML = (insights.top_quality_tasks || []).length
      ? insights.top_quality_tasks.map((row) => `
        <li>
          <span class="portal-inline-code">${escapeHtml(row.task_type || '-')}</span>
          <span class="portal-muted">· prioriteit ${escapeHtml(String(row.priority ?? '-'))}</span>
          ${row.location_id ? `<button class="portal-link-btn" type="button" data-open-location="content" data-location-id="${escapeAttr(row.location_id)}">open locatie ${escapeHtml(String(row.location_id))}</button>` : ''}
          ${row.notes ? `<br><span class="portal-muted">${escapeHtml(row.notes)}</span>` : ''}
          <div class="portal-btn-row" style="margin-top:8px;">
            <button class="portal-btn portal-btn-success portal-btn-sm" type="button" data-quality-task-action="resolved" data-task-id="${escapeAttr(row.id)}">Resolved</button>
            <button class="portal-btn portal-btn-secondary portal-btn-sm" type="button" data-quality-task-action="dismissed" data-task-id="${escapeAttr(row.id)}">Dismiss</button>
          </div>
        </li>`).join('')
      : '<li class="portal-muted">Geen open quality tasks.</li>';

    $('insight-ops-briefs').innerHTML = (insights.ops_briefs || []).length
      ? insights.ops_briefs.map((brief) => `
        <article class="portal-card portal-card-soft">
          <div class="portal-heading-row" style="align-items:flex-start;">
            <div>
              <strong>${escapeHtml(brief.title || brief.brief_type || 'Ops brief')}</strong>
              <div class="portal-muted">${escapeHtml(brief.summary || brief.brief_type || '-')}</div>
            </div>
            <span class="portal-inline-code">${escapeHtml(brief.brief_type || '-')}</span>
          </div>
          <div class="portal-muted" style="margin-top:8px;">Bijgewerkt ${fmtDateTime(brief.updated_at || brief.created_at)}</div>
          ${brief.body_md ? `<div class="portal-muted" style="margin-top:8px;">${escapeHtml(String(brief.body_md).split('\n').slice(0, 4).join(' ').slice(0, 260))}</div>` : ''}
        </article>`).join('')
      : '<div class="portal-muted">Nog geen ops briefs beschikbaar.</div>';
  } catch (error) {
    PortalShell.setAlert('insights-alert', `Insights laden mislukt: ${error.message}`, 'error', { assertive: true });
  }
}

async function refreshQualityTasks() {
  const btn = $('refresh-quality-tasks-btn');
  PortalShell.setButtonBusy(btn, true, 'Verversen...', 'Quality backlog verversen');
  PortalShell.setAlert('insights-alert', '', 'info');
  try {
    const result = await api('refresh_quality_tasks');
    const inserted = Number(result?.inserted ?? 0);
    PortalShell.setAlert('insights-alert', `Quality backlog ververst. ${inserted} open taken opnieuw opgebouwd.`, 'success');
    await loadInsights();
    await loadStats();
    if (state.selectedLocationId) await loadLocationDetail(state.selectedLocationId);
  } catch (error) {
    PortalShell.setAlert('insights-alert', `Quality backlog verversen mislukt: ${error.message}`, 'error', { assertive: true });
  } finally {
    PortalShell.setButtonBusy(btn, false, null, 'Quality backlog verversen');
  }
}

async function onQualityTaskClick(event) {
  const actionBtn = event.target.closest('[data-quality-task-action]');
  if (!actionBtn) {
    await onLocationsTableClick(event);
    return;
  }
  const taskId = actionBtn.dataset.taskId;
  const status = actionBtn.dataset.qualityTaskAction;
  if (!taskId || !status) return;
  const originalLabel = actionBtn.textContent || 'Actie';
  PortalShell.setButtonBusy(actionBtn, true, 'Bezig...', originalLabel);
  try {
    await api('resolve_quality_task', { task_id: taskId, status });
    PortalShell.setAlert('insights-alert', `Quality task op ${status} gezet.`, 'success');
    if (state.selectedLocationId) await loadLocationDetail(state.selectedLocationId);
    await loadInsights();
    await loadStats();
  } catch (error) {
    PortalShell.setAlert('insights-alert', `Quality task bijwerken mislukt: ${error.message}`, 'error', { assertive: true });
  } finally {
    PortalShell.setButtonBusy(actionBtn, false, null, originalLabel);
  }
}

async function loadEditLog() {
  const tbody = $('editlog-tbody');
  tbody.innerHTML = '<tr class="portal-loading-row"><td colspan="6"><span class="portal-spinner"></span></td></tr>';
  try {
    const logs = await api('list_edit_log');
    if (!logs?.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="portal-muted">Geen edits gevonden.</td></tr>';
      return;
    }
    tbody.innerHTML = logs.map((entry) => `
      <tr>
        <td class="portal-muted">${fmtDateTime(entry.created_at)}</td>
        <td>${escapeHtml(entry.locations?.name || '-')}</td>
        <td class="portal-muted">${escapeHtml(entry.owner_email || 'onbekend')}</td>
        <td><span class="portal-inline-code">${escapeHtml(entry.field_name || '-')}</span></td>
        <td class="portal-truncate portal-muted">${escapeHtml(valueOrDash(entry.old_value))}</td>
        <td class="portal-truncate">${escapeHtml(valueOrDash(entry.new_value))}</td>
      </tr>`).join('');
  } catch (error) {
    PortalShell.setAlert('editlog-alert', `Editlog laden mislukt: ${error.message}`, 'error', { assertive: true });
  }
}

function safeClaimStatus(status) {
  const allowed = ['pending', 'approved', 'rejected', 'auto_rejected_duplicate'];
  return allowed.includes(status) ? status : 'pending';
}

function safeOwnerStatus(status) {
  const allowed = ['none', 'trial', 'featured', 'past_due', 'canceled'];
  return allowed.includes(status) ? status : 'none';
}

function safePlanTier(tier) {
  return tier === 'featured' ? 'featured' : 'none';
}

function valueOrDash(value) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function summarizeQualityTask(task) {
  const details = task?.details_json && typeof task.details_json === 'object' ? task.details_json : null;
  if (task?.notes) return String(task.notes);
  if (details?.summary) return String(details.summary);
  if (Array.isArray(details?.missing_fields) && details.missing_fields.length) {
    return `Ontbreekt: ${details.missing_fields.join(', ')}`;
  }
  if (details?.reason) return String(details.reason);
  if (details?.target_url) return `Doel: ${details.target_url}`;
  return task?.task_type || '-';
}

function bindUI() {
  $('send-otp-btn').addEventListener('click', sendOtp);
  $('verify-otp-btn').addEventListener('click', verifyOtp);
  $('otp-back-btn').addEventListener('click', () => showScreen('login'));
  $('nav-logout').addEventListener('click', handleLogout);
  $('otp-code').addEventListener('input', () => normalizeOtpField('otp-code'));

  document.querySelectorAll('[data-tab-target]').forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tabTarget)));
  document.querySelectorAll('[data-claims-filter]').forEach((btn) => btn.addEventListener('click', () => setClaimsFilter(btn.dataset.claimsFilter, btn)));

  $('loc-search').addEventListener('input', debounceLocSearch);
  $('loc-prev-btn').addEventListener('click', () => changeLocPage(-1));
  $('loc-next-btn').addEventListener('click', () => changeLocPage(1));
  $('claims-tbody').addEventListener('click', onClaimsTableClick);
  $('owners-tbody').addEventListener('click', onOwnersTableClick);
  $('locations-tbody').addEventListener('click', onLocationsTableClick);
  $('locations-tbody').addEventListener('change', onLocationsTableChange);
  $('observations-tbody').addEventListener('click', onObservationsTableClick);
  $('editorial-tbody').addEventListener('click', onEditorialTableClick);
  $('duplicates-tbody').addEventListener('click', onDuplicatesTableClick);
  $('insight-context-gaps').addEventListener('click', onLocationsTableClick);
  $('location-tasks-list').addEventListener('click', onQualityTaskClick);
  $('insight-quality-backlog').addEventListener('click', onQualityTaskClick);

  $('modal-save-btn').addEventListener('click', saveOwnerEdit);
  $('save-location-detail-btn').addEventListener('click', saveLocationDetail);
  $('create-location-draft-btn').addEventListener('click', ensureLocationEditorialDraft);
  $('save-location-seo-btn').addEventListener('click', saveLocationSeo);
  $('save-editorial-page-btn').addEventListener('click', saveEditorialPage);
  $('new-editorial-page-btn').addEventListener('click', resetEditorialForm);
  $('publish-trigger-btn').addEventListener('click', triggerPublish);
  $('refresh-quality-tasks-btn').addEventListener('click', refreshQualityTasks);
  $('observation-status-filter').addEventListener('change', loadObservations);
  $('editorial-status-filter').addEventListener('change', loadEditorialPages);
}

document.addEventListener('DOMContentLoaded', () => {
  bindUI();
  maybeHandleAuthCallback();
  showScreen('login');
});
