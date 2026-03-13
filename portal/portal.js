import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL     = 'https://piujsvgbfflrrvauzsxe.supabase.co';
const SB_ANON    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdWpzdmdiZmZscnJ2YXV6c3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDMxNzAsImV4cCI6MjA4NzYxOTE3MH0.5y3gqiPfVvpvfaDYA_PgqE-KTvuf6zgN6vGzqfUpeSo';
const EDGE_BASE  = `${SB_URL}/functions/v1`;

const supabase = createClient(SB_URL, SB_ANON);

// ---- State ----
let currentUser   = null;
let venueOwner    = null;
let claimedLoc    = null;

// ---- Routing ----
function showScreen(id) {
    ['landing','login','signup','verify','dashboard'].forEach(s => {
        document.getElementById('screen-' + s)?.classList.add('hidden');
    });
    document.getElementById('screen-' + id)?.classList.remove('hidden');
}

function switchTab(tabId) {
    ['tab-mijn-locatie','tab-billing'].forEach(t => {
        document.getElementById(t)?.classList.add('hidden');
        document.getElementById('tab-btn-' + t)?.classList.remove('active');
    });
    document.getElementById(tabId)?.classList.remove('hidden');
    document.getElementById('tab-btn-' + tabId)?.classList.add('active');
}

// ---- Auth ----
supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
        currentUser = session.user;
        document.getElementById('nav-user').textContent = session.user.email;
        document.getElementById('nav-user').classList.remove('hidden');
        document.getElementById('nav-logout').classList.remove('hidden');
        await loadOwnerData();
        showScreen('dashboard');
    } else {
        currentUser = null;
        venueOwner  = null;
        document.getElementById('nav-user').classList.add('hidden');
        document.getElementById('nav-logout').classList.add('hidden');
        const params = new URLSearchParams(location.search);
        if (params.get('billing') === 'success') {
            showScreen('landing');
        } else {
            showScreen('landing');
        }
    }
});

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;
    const btn   = document.getElementById('login-btn');
    setAlert('login-alert', '', '');
    btn.disabled = true; btn.textContent = 'Inloggen…';
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    btn.disabled = false; btn.textContent = 'Inloggen';
    if (error) setAlert('login-alert', error.message, 'error');
}

async function handleSignup() {
    const name  = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const pass  = document.getElementById('signup-password').value;
    const btn   = document.getElementById('signup-btn');
    setAlert('signup-alert', '', '');
    if (!name || !email || !pass) { setAlert('signup-alert', 'Vul alle velden in.', 'error'); return; }
    if (pass.length < 8) { setAlert('signup-alert', 'Wachtwoord moet minimaal 8 tekens zijn.', 'error'); return; }
    btn.disabled = true; btn.textContent = 'Account aanmaken…';
    const { error } = await supabase.auth.signUp({
        email, password: pass,
        options: { data: { full_name: name } }
    });
    btn.disabled = false; btn.textContent = 'Account aanmaken';
    if (error) {
        setAlert('signup-alert', error.message, 'error');
    } else {
        document.getElementById('verify-email-display').textContent = email;
        showScreen('verify');
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
}

// ---- Owner data ----
async function loadOwnerData() {
    const { data } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
    venueOwner = data;

    if (!venueOwner?.location_id) {
        const { data: claims } = await supabase
            .from('location_claim_requests')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        if (claims) {
            const msg = claims.status === 'pending'
                ? '⏳ Aanvraag ingediend — wacht op goedkeuring van PeuterPlannen.'
                : claims.status === 'approved'
                ? '✅ Aanvraag goedgekeurd!'
                : '❌ Aanvraag afgewezen. Stuur een bericht via contact.html als je denkt dat dit een fout is.';
            document.getElementById('claim-status-msg').textContent = msg;
            document.getElementById('claim-status-panel').classList.remove('hidden');
        }
        document.getElementById('no-location-panel').classList.remove('hidden');
        document.getElementById('has-location-panel').classList.add('hidden');
    } else {
        document.getElementById('no-location-panel').classList.add('hidden');
        document.getElementById('has-location-panel').classList.remove('hidden');
        await loadLocationData();
    }

    updateBillingUI();
}

async function loadLocationData() {
    if (!venueOwner?.location_id) return;
    const { data: loc } = await supabase
        .from('locations')
        .select('*')
        .eq('id', venueOwner.location_id)
        .single();
    if (!loc) return;
    claimedLoc = loc;

    document.getElementById('edit-loc-name').textContent = loc.name;
    document.getElementById('edit-description').value = loc.description || '';
    document.getElementById('edit-website').value     = loc.website     || '';
    document.getElementById('edit-hours').value       = loc.opening_hours || '';
    document.getElementById('edit-coffee').checked   = !!loc.coffee;
    document.getElementById('edit-diaper').checked   = !!loc.diaper;
    document.getElementById('edit-alcohol').checked  = !!loc.alcohol;
    document.getElementById('edit-min-age').value    = loc.min_age ?? '';
    document.getElementById('edit-max-age').value    = loc.max_age ?? '';
    document.getElementById('edit-weather').value    = loc.weather || 'indoor';

    const hasBasis = ['basis','featured','trial'].includes(venueOwner?.subscription_status);
    document.getElementById('photo-upload-section').style.display = hasBasis ? 'block' : 'none';
}

function updateBillingUI() {
    const status  = venueOwner?.subscription_status ?? 'none';
    const tier    = venueOwner?.plan_tier ?? 'none';
    const expires = venueOwner?.plan_expires_at;

    const badge = document.getElementById('edit-plan-badge');
    if (badge) {
        badge.className = 'status-badge status-' + status;
        badge.textContent = { none:'Gratis', trial:'Trial', basis:'Basis', featured:'Featured ★', past_due:'Betaling mislukt', canceled:'Opgezegd' }[status] ?? status;
    }

    const expiryStr = expires
        ? new Date(expires).toLocaleDateString('nl-NL', { day:'numeric', month:'long', year:'numeric' })
        : '';

    document.getElementById('billing-current-plan').innerHTML =
        `Huidig plan: <strong>${{ none:'Gratis', trial:'Trial (proefperiode)', basis:'Basis', featured:'Featured', past_due:'Basis (betaling mislukt)', canceled:'Geen actief abonnement' }[status] ?? status}</strong>` +
        (expiryStr ? ` · Geldig tot ${expiryStr}` : '');

    const hasActive = ['basis','featured','trial'].includes(status);
    document.getElementById('cancel-subscription-section').classList.toggle('hidden', !hasActive);

    ['none','basis','featured'].forEach(p => {
        document.getElementById('plan-card-' + p)?.classList.toggle('current', tier === p || (p === 'none' && tier === 'none'));
    });
}

// ---- Location search & claim ----
async function searchLocations() {
    const q = document.getElementById('loc-search-input').value.trim();
    if (!q) return;
    const resultsEl = document.getElementById('loc-search-results');
    resultsEl.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">Zoeken…</p>';

    const { data, error } = await supabase
        .from('locations')
        .select('id, name, region, type')
        .ilike('name', `%${q}%`)
        .limit(10);

    if (error || !data?.length) {
        resultsEl.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">Geen locaties gevonden. Staat je locatie nog niet in onze database? <a href="/contact.html" style="color:var(--primary);">Stuur een suggestie</a>.</p>';
        return;
    }

    resultsEl.innerHTML = data.map(loc => `
        <div class="loc-result">
            <div>
                <div class="loc-result-name">${escapeHtml(loc.name)}</div>
                <div class="loc-result-region">${escapeHtml(loc.region || '')} · ${escapeHtml(loc.type || '')}</div>
            </div>
            <button class="btn btn-secondary" data-claim-id="${loc.id}" data-claim-name="${escapeHtml(loc.name)}">Claimen</button>
        </div>
    `).join('');
}

// Event delegation for dynamically created claim buttons
document.getElementById('loc-search-results')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-claim-id]');
    if (btn) claimLocation(parseInt(btn.dataset.claimId), btn.dataset.claimName);
});

async function claimLocation(locationId, locationName) {
    if (!currentUser) return;

    const since = new Date(); since.setDate(since.getDate() - 1);
    const { count } = await supabase
        .from('location_claim_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .gte('created_at', since.toISOString());

    if ((count ?? 0) >= 3) {
        alert('Je hebt vandaag al 3 claim-aanvragen ingediend. Probeer het morgen opnieuw.');
        return;
    }

    const message = `Ik ben de eigenaar van ${locationName} en wil dit beheren via PeuterPlannen.`;
    const { error } = await supabase
        .from('location_claim_requests')
        .insert({ user_id: currentUser.id, location_id: locationId, message });

    if (!error) {
        document.getElementById('claim-status-msg').textContent =
            `⏳ Aanvraag voor "${locationName}" ingediend — wacht op goedkeuring van PeuterPlannen.`;
        document.getElementById('claim-status-panel').classList.remove('hidden');
        document.getElementById('loc-search-results').innerHTML = '';
    } else {
        alert('Er ging iets mis. Probeer het opnieuw.');
    }
}

// ---- Save location edits ----
async function saveLocationEdits() {
    if (!claimedLoc) return;
    const btn = document.getElementById('save-btn');
    setAlert('edit-alert', '', '');
    btn.disabled = true; btn.textContent = 'Opslaan…';

    const updates = {
        description:   document.getElementById('edit-description').value.trim() || null,
        website:       document.getElementById('edit-website').value.trim() || null,
        opening_hours: document.getElementById('edit-hours').value.trim() || null,
        coffee:        document.getElementById('edit-coffee').checked,
        diaper:        document.getElementById('edit-diaper').checked,
        alcohol:       document.getElementById('edit-alcohol').checked,
        min_age:       parseInt(document.getElementById('edit-min-age').value) || null,
        max_age:       parseInt(document.getElementById('edit-max-age').value) || null,
        weather:       document.getElementById('edit-weather').value,
        last_owner_update: new Date().toISOString(),
    };

    if (updates.website) {
        try { new URL(updates.website); } catch {
            setAlert('edit-alert', 'Website-URL is niet geldig. Gebruik https://...', 'error');
            btn.disabled = false; btn.textContent = 'Wijzigingen opslaan';
            return;
        }
    }

    const photoFile = document.getElementById('edit-photo')?.files?.[0];
    if (photoFile) {
        const err = await uploadPhoto(claimedLoc.id, photoFile);
        if (err) {
            setAlert('edit-alert', 'Foto upload mislukt: ' + err, 'error');
            btn.disabled = false; btn.textContent = 'Wijzigingen opslaan';
            return;
        }
    }

    const { error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', claimedLoc.id);

    btn.disabled = false; btn.textContent = 'Wijzigingen opslaan';

    if (error) {
        setAlert('edit-alert', 'Opslaan mislukt: ' + error.message, 'error');
    } else {
        setAlert('edit-alert', '✓ Wijzigingen opgeslagen!', 'success');
        claimedLoc = { ...claimedLoc, ...updates };
    }
}

async function uploadPhoto(locationId, file) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return 'Alleen JPG, PNG of WebP toegestaan.';
    if (file.size > 5 * 1024 * 1024) return 'Bestand te groot (max 5MB).';

    const ext  = file.name.split('.').pop();
    const path = `${locationId}/owner-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
        .from('location-images')
        .upload(path, file, { upsert: true, contentType: file.type });

    if (error) return error.message;

    const { data: { publicUrl } } = supabase.storage
        .from('location-images')
        .getPublicUrl(path);

    await supabase.from('locations').update({ owner_photo_url: publicUrl }).eq('id', locationId);
    return null;
}

// ---- Stripe checkout ----
async function startCheckout(planTier) {
    const btn = document.getElementById('upgrade-' + planTier + '-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Laden…'; }
    setAlert('billing-alert', '', '');

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${EDGE_BASE}/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ plan_tier: planTier }),
        });
        const json = await res.json();
        if (json.url) {
            window.location.href = json.url;
        } else {
            throw new Error(json.error ?? 'Onbekende fout');
        }
    } catch (err) {
        setAlert('billing-alert', 'Checkout mislukt: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = planTier === 'basis' ? 'Upgrade naar Basis' : 'Kies Featured'; }
    }
}

async function cancelSubscription() {
    if (!confirm('Weet je zeker dat je je abonnement wilt opzeggen? Je behoudt toegang tot het einde van de betaalperiode.')) return;
    setAlert('billing-alert', 'Om je abonnement op te zeggen, neem contact op via <a href="/contact.html">contact.html</a>.', 'info');
}

// ---- Util ----
function setAlert(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'alert' + (type ? ' alert-' + type : '');
    el.innerHTML = msg;
    el.style.display = msg ? 'block' : 'none';
}

function escapeHtml(s) {
    return (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Event listeners (replaces inline onclick handlers) ----
document.getElementById('nav-logout')?.addEventListener('click', handleLogout);
document.getElementById('login-btn')?.addEventListener('click', handleLogin);
document.getElementById('signup-btn')?.addEventListener('click', handleSignup);
document.getElementById('save-btn')?.addEventListener('click', saveLocationEdits);
document.getElementById('cancel-edit-btn')?.addEventListener('click', () => loadLocationData());
document.getElementById('search-btn')?.addEventListener('click', searchLocations);
document.getElementById('upgrade-basis-btn')?.addEventListener('click', () => startCheckout('basis'));
document.getElementById('upgrade-featured-btn')?.addEventListener('click', () => startCheckout('featured'));
document.getElementById('cancel-sub-btn')?.addEventListener('click', cancelSubscription);
document.getElementById('tab-btn-mijn-locatie')?.addEventListener('click', () => switchTab('tab-mijn-locatie'));
document.getElementById('tab-btn-billing')?.addEventListener('click', () => switchTab('tab-billing'));

document.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        const action = el.dataset.action;
        if (action === 'show-login') showScreen('login');
        else if (action === 'show-signup') showScreen('signup');
    });
});

// Handle billing return from Stripe
(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('billing') === 'success') {
        history.replaceState({}, '', location.pathname);
        setTimeout(() => setAlert('billing-alert', '🎉 Betaling geslaagd! Je abonnement wordt binnen enkele seconden geactiveerd.', 'success'), 800);
    } else if (params.get('billing') === 'canceled') {
        history.replaceState({}, '', location.pathname);
    }
})();
