# Photo & Image Strategy for PeuterPlannen.nl

**Date:** March 2026
**Scope:** 2138+ location pages, bootstrapped indie project
**Current state:** Emoji placeholders, no real photos

---

## Table of Contents

1. [Photo Sourcing Strategies](#1-photo-sourcing-strategies)
2. [Storage & Delivery](#2-storage--delivery)
3. [Photo UX Best Practices](#3-photo-ux-best-practices)
4. [Moderation & Quality Control](#4-moderation--quality-control)
5. [MVP Plan: Top 200 Locations](#5-mvp-plan-top-200-locations)
6. [Cost Analysis](#6-cost-analysis)
7. [Recommended Phased Approach](#7-recommended-phased-approach)

---

## 1. Photo Sourcing Strategies

### 1A. Google Places Photos API

**How it works:** Use the Place ID you already have (or look up via name/address) to fetch up to 10 photos per location via the Place Photos endpoint.

| Aspect | Details |
|--------|---------|
| **Cost** | $7.00 per 1,000 photo requests |
| **Quality** | Generally good — user-contributed via Google Maps |
| **Free tier** | ~5,000 free requests/month (Pro SKU) under the new March 2025 pricing |
| **Licensing** | Photos can be displayed in your app **only** if you also show the required Google attribution. You cannot cache/store them permanently — you must fetch via Google's URL. |
| **Limits** | Rate limits apply; photos expire after a few days and URLs must be refreshed |
| **Verdict** | **Good for enrichment, bad for primary storage.** The attribution requirement and no-caching restriction make this awkward as your sole photo source. However, for an MVP it's the fastest path to real photos. |

**Key gotcha:** Google's ToS prohibit pre-fetching and storing Place Photos. You must request them on-demand and display with attribution. This means every page load with a Google photo = an API call = cost.

**Workaround for static sites:** You could use a Cloudflare Worker to proxy and cache Google Place Photos with a short TTL (e.g., 24h), but this is a gray area in Google's ToS.

Sources: [Places API Billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing), [Place Photos docs](https://developers.google.com/maps/documentation/places/web-service/place-photos), [Google Maps Pricing 2026](https://nicolalazzari.ai/articles/understanding-google-maps-apis-a-comprehensive-guide-to-uses-and-costs)

### 1B. Unsplash / Pexels API (Generic Category Photos)

**Use case:** Fallback photos by category (e.g., "playground", "swimming pool", "zoo", "petting farm").

| Service | Free tier | Rate limit | Attribution |
|---------|-----------|------------|-------------|
| **Unsplash** | Free, 7M+ photos | 50 req/hr (demo), unlimited (production) | Required: link to photographer + Unsplash |
| **Pexels** | Free | 200 req/hr, 20K/month | Not required but appreciated |

**Approach:** Pre-fetch 5–10 high-quality photos per activity category (speeltuinen, kinderboerderij, zwembad, museum, etc.) and store locally. This gives you ~15–20 categories × 5 photos = 100 photos total.

**Pros:** Free, legal, high quality, no per-request cost after initial fetch.
**Cons:** Generic — every playground looks the same. Not location-specific.
**Verdict:** **Excellent as a fallback layer.** Use category photos when no location-specific photo exists.

Sources: [Unsplash License](https://unsplash.com/license), [Unsplash API](https://unsplash.com/documentation), [Pexels API](https://www.pexels.com/api/)

### 1C. User-Contributed Photos

**How it works:** Let parents upload photos of locations they visit.

| Aspect | Details |
|--------|---------|
| **Quality** | Variable — phone photos, often with children visible |
| **Cost** | Free to source, but moderation costs time/money |
| **GDPR risk** | HIGH — photos of children require parental consent from every child's parent, not just the uploader. In the Netherlands, the age threshold is 16. |
| **Moderation** | Need to check for: inappropriate content, identifiable children, image quality |
| **Verdict** | **Not recommended for MVP.** The GDPR liability around children's photos is significant. Defer until you have proper consent flows and moderation in place. |

### 1D. Partner-Uploaded Photos

**How it works:** Venues upload their own official photos via a partner portal (future feature from your growth plan).

**Pros:** Highest quality, legally clean (venue owns rights), great for SEO.
**Cons:** Requires building a partner portal; adoption takes time.
**Verdict:** **Best long-term strategy.** Plan for this in your partner portal phase. Venues are motivated to provide good photos because it drives visitors.

### 1E. Scraping from Venue Websites

**Legal assessment for EU/Netherlands:**
- Copyright law protects photos on websites. Scraping and republishing them is copyright infringement.
- The EU DSM Directive provides exceptions only for research institutions, not commercial use.
- Even "facts" are protected when collected into databases (EU Database Directive).
- GDPR adds another layer if photos contain identifiable people.

**Verdict:** **Do not do this.** The legal risk far outweighs the benefit for a small project.

Sources: [IAPP on EU web scraping](https://iapp.org/news/a/the-state-of-web-scraping-in-the-eu), [EU Copyright DSM Directive](https://www.mofo.com/resources/insights/241004-to-scrape-or-not-to-scrape-first-court-decision)

### 1F. Mapillary Street-Level Imagery

**How it works:** Free API providing crowdsourced street-level photos. Owned by Meta.

| Aspect | Details |
|--------|---------|
| **Cost** | 100% free for commercial use |
| **Quality** | Street-level only — often not useful for indoor venues or playgrounds behind fences |
| **License** | CC-BY-SA for open data |
| **Coverage** | Good in Dutch cities, patchy in suburbs |
| **Verdict** | **Niche use only.** Could work for showing the street entrance of a location, but not as a primary photo source. Worth exploring for a "street view" link on location pages. |

Sources: [Mapillary Developer](https://www.mapillary.com/developer), [Mapillary Open Data](https://www.mapillary.com/open-data)

### 1G. AI-Generated Placeholder Images

**Assessment:**
- Can generate attractive, consistent category illustrations (watercolor playground, cartoon zoo, etc.)
- No copyright issues if you generate them yourself
- Ethical concern: Users might think they're seeing the real location
- **Recommendation:** Use only if clearly labeled as illustrations, not photos. A watercolor/illustration style makes it obvious these aren't real.

**Verdict:** **Good for branded category illustrations** that are clearly not photos. Could replace emoji placeholders with something much more appealing.

---

## 2. Storage & Delivery

### GitHub Pages Limitations

| Limit | Value |
|-------|-------|
| Repository size | 1 GB recommended max |
| Published site size | 1 GB max |
| Bandwidth | 100 GB/month soft limit |
| Individual file | 100 MB max (via CLI) |

**Impact:** At 2138 locations with 1 photo each at ~100KB compressed = ~214MB. This fits within GitHub Pages limits but eats into your repo. At 3 photos per location = ~642MB — getting tight.

**Recommendation:** Store photos externally, not in the Git repo.

### Storage Options Compared

| Service | Free tier | Cost at scale (5,000 images) | Auto-optimization | CDN included |
|---------|-----------|------------------------------|-------------------|--------------|
| **Cloudflare R2** | 10 GB free, zero egress | ~$0.75/mo for 50GB | No (need Workers) | Yes (via Cloudflare) |
| **Cloudflare Images** | None | ~$2.50/mo storage + $0.50/1K transforms | Yes (resize, format) | Yes |
| **Supabase Storage** | 1 GB free (Free plan) | Included in Pro $25/mo (100GB) | Basic transforms | Via Supabase CDN |
| **Cloudinary** | 25 credits/mo free | ~$0/mo for small usage | Yes (excellent) | Yes |
| **imgix** | None | $100/mo minimum | Yes (excellent) | Yes |

### Recommendation: Cloudflare R2 + Cloudflare Worker

**Why this wins for PeuterPlannen:**

1. **You already use Cloudflare** — zero new vendor, same dashboard
2. **10 GB free storage** — enough for 50,000+ optimized images
3. **Zero egress fees** — no surprise bills when traffic spikes
4. **Cloudflare Worker** can handle on-the-fly image resizing and WebP/AVIF conversion (using the `cf.image` options or Cloudflare Image Resizing)
5. **Global CDN** — images served from edge, fast everywhere

**Architecture:**
```
[Browser] → [Cloudflare CDN/Cache] → [CF Worker (resize/format)] → [R2 Bucket]
```

**Alternative:** If you want zero custom code, **Cloudinary's free tier** (25 credits = ~25K transformations/month) is plug-and-play and handles everything automatically. Good for MVP, but you'd add a vendor dependency.

Sources: [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/), [Cloudflare Images Pricing](https://theimagecdn.com/docs/cloudflare-images-pricing), [Supabase Pricing](https://supabase.com/pricing), [Image CDN Comparison](https://www.visionfly.ai/blog/best-image-cdn-comparison)

### Responsive Image Delivery

**Format strategy (2025/2026 best practice):**
```html
<picture>
  <source srcset="photo.avif" type="image/avif">
  <source srcset="photo.webp" type="image/webp">
  <img src="photo.jpg" alt="Speeltuin Vondelpark" loading="lazy">
</picture>
```

**With a CDN/Worker, you don't need this.** Instead, serve a single URL and let the CDN auto-negotiate the format:
```html
<img src="https://img.peuterplannen.nl/locations/vondelpark.jpg"
     srcset="...300w, ...600w, ...900w"
     sizes="(max-width: 640px) 100vw, 400px"
     loading="lazy"
     alt="Speeltuin Vondelpark">
```

The Cloudflare Worker detects the `Accept` header and serves AVIF/WebP automatically.

**Size variants to generate:**
- 400w — mobile cards
- 800w — desktop cards / mobile hero
- 1200w — desktop hero / detail page

Sources: [Image Optimization 2025](https://www.frontendtools.tech/blog/modern-image-optimization-techniques-2025), [Responsive Images Guide](https://www.debugbear.com/blog/responsive-images)

---

## 3. Photo UX Best Practices

### Aspect Ratios

| Platform | Aspect ratio | Why |
|----------|-------------|-----|
| Airbnb | 3:2 (landscape) | Shows spaces well, feels inviting |
| Google Maps | 1:1 or 3:2 | Compact, works in info windows |
| Yelp | 1:1 (square) | Clean grid layout |

**Recommendation for PeuterPlannen:**
- **Location cards (list/grid):** 3:2 landscape (matches how parents photograph playgrounds)
- **Location detail hero:** 16:9 landscape (cinematic, immersive)
- **Category thumbnails:** 1:1 square (clean grid)

### Loading Patterns

**Recommended: CSS blur-up with color placeholder**

1. Store a dominant color per image in Supabase (1 extra column, e.g., `photo_color: "#4CAF50"`)
2. Show colored div immediately (zero load time)
3. Load actual image with `loading="lazy"`
4. Fade in with CSS transition

```css
.location-card__photo {
  background-color: var(--photo-color, #e8e8e8);
  transition: opacity 0.3s ease;
}
.location-card__photo img {
  opacity: 0;
  transition: opacity 0.3s ease;
}
.location-card__photo img.loaded {
  opacity: 1;
}
```

**Why not full LQIP/blur-up?** For a static site with 2000+ locations, generating and storing Base64 blur placeholders adds complexity. A dominant color placeholder achieves 90% of the perceived performance benefit with 10% of the effort.

### Gallery vs Single Hero

**For MVP:** Single hero photo per location. Reasons:
- Reduces sourcing effort by 5–10x
- Simpler UX — parents want info fast, not photo galleries
- One good photo > five mediocre ones

**Future:** Add gallery support when partner-uploaded photos become available.

Sources: [Airbnb Photo Guidelines](https://copilot.rentals/2025/02/26/photo-resolution-amp-aspect-ratio-guidelines-for-major-otas-2025/), [LQIP Technique](https://medium.com/@ravipatel.it/web-progressive-enhancement-with-lqip-blurred-image-loading-using-css-and-javascript-fc1043b0a9d5)

---

## 4. Moderation & Quality Control

### Photo Quality at Scale

**Automated checks (via Cloudflare Worker or upload script):**
- Minimum resolution: 800×600px
- File size: reject > 10MB, warn < 50KB
- Aspect ratio: reject extreme portraits/panoramas
- Format: accept JPEG, PNG, WebP

### AI Moderation Services

| Service | Price per image | Detects |
|---------|----------------|---------|
| **WebPurify AIM** | $0.0026/image | Minors, nudity, violence, drugs, weapons |
| **Amazon Rekognition** | $0.001/image (first 1M) | Nudity, violence, suggestive content |
| **Sightengine** | $0.001–0.005/image | Nudity, weapons, drugs, text, quality |

**For 200 images (MVP):** Manual review is cheaper and better. No AI moderation needed.
**For 2000+ images:** Budget ~$5–10 one-time for automated screening, then manual review of flagged items.

### GDPR Considerations (Critical for NL)

**The Netherlands uses the strict 16-year threshold** — photos of any identifiable child under 16 require consent from their legal guardian.

**Practical rules for PeuterPlannen:**
1. **Prefer photos without people** — focus on the location/facility itself
2. **If people are visible:** Must be unidentifiable (distance, back view, blur)
3. **Never accept user-uploaded photos of children** without robust consent flow
4. **Partner photos:** Include in partner agreement that they warrant no identifiable minors without consent
5. **Google Places photos:** Attribution to Google; Google handles consent for their platform, but you're displaying them — gray area

**Safest approach:** Use category illustrations + venue-provided exterior/facility photos with no identifiable people.

Sources: [GDPR Children NL](https://gdprhub.eu/index.php?title=Rb._Gelderland_-_C/05/368427), [EU Children's Data Privacy 2025](https://www.gdprregister.eu/gdpr/eu-childrens-data-privacy-2025-7-changes/), [WebPurify](https://www.webpurify.com/image-moderation/)

---

## 5. MVP Plan: Top 200 Locations

**Goal:** 1 quality photo per location for the top 200 most-visited pages.

### Step 1: Identify Top 200 (1 hour)
- Query Google Analytics / Cloudflare Analytics for most-visited location pages
- Or: rank by city population × category popularity

### Step 2: Source Photos — Layered Approach (1–2 days)

**Layer 1 — Google Places Photos (covers ~60–70%)**
- Use a one-time script to fetch Place IDs for top 200 locations
- Fetch 1 photo reference per location via Places API
- Display with proper Google attribution
- Cost: 200 requests = $1.40 (well within free tier)
- **Limitation:** Cannot permanently cache; must serve via API or proxy

**Layer 2 — Category Fallback Photos (covers remaining 30–40%)**
- Download 5 high-quality photos per category from Pexels (free, no attribution required)
- ~15 categories × 5 photos = 75 photos
- Store in R2, serve via Cloudflare
- Assign by category in Supabase: `photo_source: 'category_fallback'`

**Layer 3 — AI-Generated Category Illustrations (permanent fallback)**
- Generate 1 watercolor-style illustration per category
- Use as the default when nothing else is available
- Clearly styled as illustrations, not photos

### Step 3: Implementation (2–3 days)

1. Add columns to Supabase `locations` table:
   - `photo_url` (text) — direct URL or R2 path
   - `photo_source` (text) — 'google_places' | 'category' | 'illustration' | 'partner'
   - `photo_color` (text) — dominant color hex for placeholder
   - `photo_attribution` (text) — required credit line

2. Create R2 bucket `peuterplannen-images`

3. Upload category photos + illustrations to R2

4. Update location card HTML template to render photos

5. Add lazy loading + color placeholder

### Step 4: Rollout
- Deploy to top 200 pages first
- Monitor performance (Core Web Vitals)
- Expand to all 2138 locations with category fallbacks

---

## 6. Cost Analysis

### MVP Phase (Top 200 locations)

| Item | One-time | Monthly |
|------|----------|---------|
| Google Places API (200 requests) | $0 (within free tier) | $0 (static fetch) |
| Cloudflare R2 storage (< 1 GB) | $0 | $0 (free tier) |
| Pexels photos | $0 | $0 |
| AI illustration generation | $0–5 (if using paid API) | $0 |
| **Total MVP** | **~$5** | **~$0/mo** |

### Growth Phase (2138 locations, mixed sources)

| Item | Monthly cost |
|------|-------------|
| R2 storage (5 GB images) | $0 (within 10 GB free) |
| R2 operations (~100K reads/mo) | $0 (within free tier) |
| Cloudflare Worker (image resize) | $0 (within free 100K req/day) |
| Google Places API (if used live) | $7–15/mo (1K–2K daily requests) |
| AI moderation (one-time batch) | $5 one-time |
| **Total Growth** | **$0–15/mo** |

### Future Phase (partner photos, galleries)

| Item | Monthly cost |
|------|-------------|
| R2 storage (50 GB) | $0.60/mo |
| Cloudflare Worker | $5/mo (paid plan for more requests) |
| AI moderation (ongoing) | $5–10/mo |
| **Total Future** | **$10–16/mo** |

### Cost Comparison: If You Did Everything Wrong

| Bad choice | Monthly cost |
|------------|-------------|
| imgix for image CDN | $100/mo minimum |
| Google Places live on every page load | $50–100/mo at scale |
| Cloudinary Pro plan | $89/mo |
| Full human moderation service | $500+/mo |

---

## 7. Recommended Phased Approach

### Phase 1: Quick Wins (Week 1) — Cost: $0

1. **Generate AI category illustrations** — 1 per category (15–20 total), watercolor/sketch style
2. **Replace emoji placeholders** with category illustrations on all 2138 pages
3. **Add proper `<img>` tags** with `loading="lazy"`, alt text, dominant color placeholders
4. **Store illustrations in R2** or even in the Git repo (only ~2MB total)

**Impact:** Immediate visual upgrade across entire site. Pages look 10x more professional.

### Phase 2: Real Photos for Top 200 (Week 2–3) — Cost: ~$5

1. **Set up R2 bucket** with public access via custom domain (e.g., `img.peuterplannen.nl`)
2. **Fetch Pexels category photos** (5 per category, 75 total)
3. **Write one-time Google Places script** to get photo references for top 200
4. **Add Supabase columns** for photo metadata
5. **Update build script** to include photo URLs in generated pages
6. **Implement 3:2 aspect ratio cards** with lazy loading

**Impact:** Top pages get real, location-relevant photos. Other pages have attractive category photos.

### Phase 3: Scale to All Locations (Month 2) — Cost: $0–15/mo

1. **Expand Google Places lookups** to all 2138 locations
2. **Set up Cloudflare Worker** for on-the-fly image optimization (WebP/AVIF, resize)
3. **Implement srcset** for responsive delivery
4. **Monitor Cloudflare Analytics** for image performance

### Phase 4: Partner Photos (Month 3+) — Cost: $10–16/mo

1. **Add photo upload to partner portal** (when built)
2. **Implement basic moderation** (automated + manual review)
3. **Gallery support** for locations with multiple photos
4. **Photo quality guidelines** for partners

---

## Key Decision: Google Places vs Static Photos

The biggest strategic choice is whether to use Google Places Photos (live API) or to build your own photo collection.

| Factor | Google Places API | Own Photo Collection |
|--------|------------------|---------------------|
| Speed to launch | Fast (days) | Slow (weeks/months) |
| Cost at scale | $7–15/mo ongoing | ~$0/mo after setup |
| Photo quality | Variable | Curated |
| Legal simplicity | Must show attribution | Full control |
| Independence | Dependent on Google | Fully independent |
| Works on static site | Awkward (needs proxy) | Perfect |

**Recommendation:** Start with **category fallback photos** (Pexels + AI illustrations) for the entire site, then add Google Places for top locations via a Cloudflare Worker proxy. Long-term, build your own collection via partner uploads.

---

## Summary

The fastest, cheapest path to a visually appealing site:

1. **Now:** AI category illustrations replace emojis ($0)
2. **Week 2:** Pexels category photos + Google Places for top 200 ($5 one-time)
3. **Month 2:** Cloudflare R2 + Worker for all 2138 locations ($0–15/mo)
4. **Month 3+:** Partner-uploaded photos for premium content ($10–16/mo)

Total Year 1 cost estimate: **$0–180** (vs $1,200+ if using expensive services).

---

## Sources

- [Google Places API Billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [Google Place Photos Docs](https://developers.google.com/maps/documentation/places/web-service/place-photos)
- [Google Maps Pricing 2026](https://nicolalazzari.ai/articles/understanding-google-maps-apis-a-comprehensive-guide-to-uses-and-costs)
- [Unsplash License](https://unsplash.com/license)
- [Unsplash API Docs](https://unsplash.com/documentation)
- [Pexels API](https://www.pexels.com/api/)
- [Pexels License](https://www.pexels.com/license/)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare Images Pricing Explained](https://theimagecdn.com/docs/cloudflare-images-pricing)
- [Best Image CDN Comparison 2025](https://www.visionfly.ai/blog/best-image-cdn-comparison)
- [Supabase Pricing](https://supabase.com/pricing)
- [Image Optimization 2025](https://www.frontendtools.tech/blog/modern-image-optimization-techniques-2025)
- [Responsive Images Guide](https://www.debugbear.com/blog/responsive-images)
- [WebP vs JPEG vs AVIF 2026](https://blog.freeimages.com/post/webp-vs-jpeg-vs-avif-best-format-for-web-photos)
- [Airbnb Photo Guidelines](https://copilot.rentals/2025/02/26/photo-resolution-amp-aspect-ratio-guidelines-for-major-otas-2025/)
- [LQIP Progressive Loading](https://medium.com/@ravipatel.it/web-progressive-enhancement-with-lqip-blurred-image-loading-using-css-and-javascript-fc1043b0a9d5)
- [Mapillary Developer](https://www.mapillary.com/developer)
- [GitHub Pages Limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [GDPR Children NL Court Case](https://gdprhub.eu/index.php?title=Rb._Gelderland_-_C/05/368427)
- [EU Children's Data Privacy 2025](https://www.gdprregister.eu/gdpr/eu-childrens-data-privacy-2025-7-changes/)
- [EU Web Scraping Legal Status](https://iapp.org/news/a/the-state-of-web-scraping-in-the-eu)
- [WebPurify Image Moderation](https://www.webpurify.com/image-moderation/)
- [Best Image Moderation APIs 2025](https://www.edenai.co/post/best-image-moderation-apis)
- [Cloudflare Polish Docs](https://developers.cloudflare.com/images/polish/)
