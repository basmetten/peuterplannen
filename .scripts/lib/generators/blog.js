const fs = require('fs');
const path = require('path');
const { ROOT, CF_ANALYTICS_TOKEN, analyticsHTML } = require('../config');
const { escapeHtml, isoDateInTimeZone, todayISOAmsterdam } = require('../helpers');
const { navHTML, footerHTML, headCommon, supportHTML, revealScript, newsletterHTML } = require('../html-shared');

// Blog dependencies (optional — blog build skipped if not installed)
let matter, marked;
try {
  matter = require('gray-matter');
  const m = require('marked');
  marked = m.marked || m;
} catch (e) {}

function formatDateNL(date) {
  const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function buildBlog(data) {
  if (!matter || !marked) {
    console.log('  Skipped (install gray-matter & marked first)');
    return [];
  }

  const postsDir = path.join(ROOT, 'content', 'posts');
  if (!fs.existsSync(postsDir)) {
    console.log('  No content/posts/ directory found, skipping blog build');
    return [];
  }

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  if (files.length === 0) {
    console.log('  No blog posts found');
    return [];
  }

  const blogDir = path.join(ROOT, 'blog');
  if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });

  // Generate TOC from HTML content — adds IDs to h2/h3 and returns TOC HTML
  function generateTOC(htmlContent) {
    const headings = [];
    const usedIds = new Set();
    const processed = htmlContent.replace(/<(h[23])>([\s\S]*?)<\/\1>/gi, (match, tag, text) => {
      const level = parseInt(tag[1]);
      const plainText = text.replace(/<[^>]+>/g, '').trim();
      let id = plainText.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
      // Deduplicate IDs
      if (usedIds.has(id)) { let i = 2; while (usedIds.has(id + '-' + i)) i++; id = id + '-' + i; }
      usedIds.add(id);
      headings.push({ level, text: plainText, id });
      return `<${tag} id="${id}">${text}</${tag}>`;
    });

    if (headings.length < 4) return { content: processed, toc: '' };

    const tocItems = headings.map(h => {
      const cls = h.level === 3 ? ' class="toc-sub"' : '';
      return `<li${cls}><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`;
    }).join('\n      ');

    const toc = `<nav class="blog-toc" aria-label="Inhoudsopgave">
    <button class="blog-toc-toggle" onclick="this.parentElement.classList.toggle('expanded')">
      Inhoudsopgave <span class="toc-count">${headings.length}</span>
    </button>
    <ol class="blog-toc-list">
      ${tocItems}
    </ol>
  </nav>`;

    return { content: processed, toc };
  }

  const posts = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const { data: fm, content } = matter(raw);
    const slug = file.replace(/\.md$/, '');
    const htmlContent = marked(content);
    const parsedDate = fm.date ? new Date(fm.date) : new Date();
    const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const dateStr = isoDateInTimeZone(safeDate, 'Europe/Amsterdam');
    const dateDisplay = formatDateNL(safeDate);

    posts.push({
      slug,
      title: fm.title || slug,
      description: fm.description || '',
      date: dateStr,
      dateDisplay,
      tags: fm.tags || [],
      related_regions: fm.related_regions || [],
      featured_image: fm.featured_image || '',
      content: htmlContent,
    });
  }

  // Sort posts by date descending
  posts.sort((a, b) => b.date.localeCompare(a.date));
  const todayAmsterdam = todayISOAmsterdam();
  const publishedPosts = posts.filter((p) => p.date <= todayAmsterdam);
  const unpublishedPosts = posts.filter((p) => p.date > todayAmsterdam);

  if (unpublishedPosts.length > 0) {
    console.log(`  Scheduled posts hidden (${unpublishedPosts.length}) — publish after local date in Europe/Amsterdam`);
  }

  // Remove stale generated blog pages that should not be live.
  const publishedSet = new Set(publishedPosts.map((p) => p.slug));
  for (const entry of fs.readdirSync(blogDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!publishedSet.has(entry.name)) {
      fs.rmSync(path.join(blogDir, entry.name), { recursive: true, force: true });
    }
  }

  // Generate individual post pages for published posts only.
  for (const p of publishedPosts) {
    const postDir = path.join(blogDir, p.slug);
    if (!fs.existsSync(postDir)) fs.mkdirSync(postDir, { recursive: true });
    const postTitle = `${p.title} | PeuterPlannen`;
    const postDescription = p.description || '';

    // Use generated OG image if available; otherwise fall back to featured_image or site default.
    const generatedOgPath = path.join(ROOT, 'images', 'og', `blog-${p.slug}.jpg`);
    const ogImageUrl = fs.existsSync(generatedOgPath)
      ? `https://peuterplannen.nl/images/og/blog-${p.slug}.jpg`
      : `https://peuterplannen.nl/${p.featured_image ? p.featured_image.replace(/^\//, '') : 'homepage_hero_ai.jpeg'}`;

    const postHTML = `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${escapeHtml(postTitle)}</title>
  <meta name="description" content="${escapeHtml(postDescription)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://peuterplannen.nl/blog/${p.slug}/">
  <meta property="og:title" content="${escapeHtml(postTitle)}">
  <meta property="og:description" content="${escapeHtml(postDescription)}">
  <meta property="og:url" content="https://peuterplannen.nl/blog/${p.slug}/">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(p.title)} | PeuterPlannen">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(postTitle)}">
  <meta name="twitter:description" content="${escapeHtml(postDescription)}">
  <meta name="twitter:image" content="${ogImageUrl}">
  <script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": p.title,
  "description": postDescription,
  "datePublished": p.date,
  "author": { "@type": "Person", "name": "Bas Metten" },
  "publisher": { "@type": "Organization", "name": "PeuterPlannen" },
  "url": `https://peuterplannen.nl/blog/${p.slug}/`,
  "mainEntityOfPage": `https://peuterplannen.nl/blog/${p.slug}/`
}, null, 2)}
  </script>
</head>
<body>

${navHTML()}

${p.featured_image ? `<div class="blog-hero-img"><picture><source type="image/webp" srcset="${p.featured_image.replace(/\.jpe?g$/, '.webp')}"><img src="${p.featured_image}" alt="${escapeHtml(p.title)}" loading="eager"></picture></div>` : ''}
<div class="hero" style="padding: ${p.featured_image ? '24px' : '100px'} 24px 40px;">
  <h1>${escapeHtml(p.title).replace(/\*([^*]+)\*/g, '<span class="accent">$1</span>')}</h1>
</div>

<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; <a href="/blog/">Inspiratie</a> &rsaquo; ${escapeHtml(p.title)}
</nav>

<main id="main-content">
  <p class="blog-meta">${p.dateDisplay}${p.tags?.length ? ' &middot; ' + p.tags.join(', ') : ''}</p>

  ${(() => { const { content: tocContent, toc } = generateTOC(p.content); p._tocContent = tocContent; return toc; })()}
  <div class="blog-content">
    ${p._tocContent || p.content}
  </div>

  <div class="blog-share pp-reveal">
    <a href="https://wa.me/?text=${encodeURIComponent(p.title)}%20${encodeURIComponent('https://peuterplannen.nl/blog/' + p.slug + '/')}" target="_blank" rel="noopener" class="share-btn share-whatsapp">Deel via WhatsApp</a>
    <button class="share-btn share-native" style="display:none" data-title="${escapeHtml(p.title)}" data-url="https://peuterplannen.nl/blog/${p.slug}/">Delen</button>
  </div>
  <script>
  (function(){
    document.querySelectorAll('.share-btn[data-url]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var title = this.dataset.title;
        var url = this.dataset.url;
        if(navigator.share){navigator.share({title:title,url:url}).catch(function(){});}
        else{navigator.clipboard.writeText(url);}
      });
    });
    if(navigator.share){var el=document.querySelector('.share-native');if(el)el.style.display='inline-flex';}
  })();
  </script>

  ${newsletterHTML()}

  <div class="cta-block pp-reveal">
    <h3>Op zoek naar meer uitjes?</h3>
    <p>Ontdek ${data.total}+ uitjes op PeuterPlannen.</p>
    <a href="/app.html">Open de app</a>
  </div>

  ${supportHTML('default', data.total, 'blog-article')}
</main>

${footerHTML()}

<script>
(function(){
  var bar=document.createElement('div');
  bar.style.cssText='position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,var(--pp-primary),var(--pp-accent));z-index:9999;transition:width 0.1s linear;border-radius:0 2px 2px 0;pointer-events:none;';
  document.body.prepend(bar);
  window.addEventListener('scroll',function(){var h=document.documentElement;var pct=h.scrollTop/(h.scrollHeight-h.clientHeight)*100;bar.style.width=Math.min(pct,100)+'%';},{passive:true});
})();
</script>
${analyticsHTML()}
</body>
</html>`;

    fs.writeFileSync(path.join(postDir, 'index.html'), postHTML);
    console.log(`  blog/${p.slug}/index.html`);
  }

  // Generate blog index
  const postCards = publishedPosts.map((p, idx) => `
    <article class="blog-card">
      ${p.featured_image ? `<a href="/blog/${p.slug}/"><div class="blog-card-thumb-container" style="background: linear-gradient(135deg, var(--pp-primary-50), var(--pp-primary-100));"><picture><source type="image/webp" srcset="${p.featured_image.replace(/\.jpe?g$/, '-400w.webp')} 400w, ${p.featured_image.replace(/\.jpe?g$/, '.webp')}" sizes="(max-width: 768px) 100vw, 400px"><img src="${p.featured_image}" alt="${escapeHtml(p.title)}" class="blog-card-thumb" loading="lazy" onerror="this.style.display='none'"></picture></div></a>` : `<a href="/blog/${p.slug}/"><div class="blog-card-thumb-container blog-card-thumb--fallback" style="background: linear-gradient(135deg, var(--pp-primary-50), var(--pp-primary-100));"></div></a>`}
      ${idx < 3 ? '<span class="blog-featured-badge">Uitgelicht</span>' : ''}
      <p class="blog-card-kicker">${escapeHtml((p.tags[0] || 'Gezinsgids')).toUpperCase()}</p>
      <h2><a href="/blog/${p.slug}/">${escapeHtml(p.title)}</a></h2>
      <p class="blog-date">${p.dateDisplay}</p>
      <p class="blog-excerpt">${escapeHtml(p.description)}</p>
      ${p.tags.length > 0 ? `<div class="blog-tags">${p.tags.map(t => `<span class="blog-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    </article>`).join('\n');

  const blogIndexLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "PeuterPlannen Blog",
    "description": "Tips, inspiratie en praktische gidsen voor uitjes met peuters en kleuters in Nederland.",
    "url": "https://peuterplannen.nl/blog/",
    "publisher": {
      "@type": "Organization",
      "name": "PeuterPlannen",
      "url": "https://peuterplannen.nl/"
    }
  }, null, 2);
  const featuredBlogTags = Array.from(new Set(publishedPosts.flatMap((p) => p.tags || []))).slice(0, 8);
  const cityGuidePosts = publishedPosts.filter((p) => /(met-peuters|met-peuters-en-kleuters)/.test(p.slug)).slice(0, 6);
  const practicalGuidePosts = publishedPosts.filter((p) => !cityGuidePosts.includes(p)).slice(0, 6);
  const blogIndexTitle = 'Blog — Tips voor uitjes met peuters | PeuterPlannen';
  const blogIndexDescription = 'Redactionele gidsen voor ouders met peuters en kleuters: regiokeuzes, regenroutes, horeca-tips en werkbare dagindelingen voor Nederland.';

  const indexHTML = `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${escapeHtml(blogIndexTitle)}</title>
  <meta name="description" content="${escapeHtml(blogIndexDescription)}">
  <link rel="canonical" href="https://peuterplannen.nl/blog/">
  <link rel="alternate" type="application/rss+xml" title="PeuterPlannen Blog" href="https://peuterplannen.nl/blog/feed.xml">
  <meta property="og:title" content="${escapeHtml(blogIndexTitle)}">
  <meta property="og:description" content="${escapeHtml(blogIndexDescription)}">
  <meta property="og:url" content="https://peuterplannen.nl/blog/">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="https://peuterplannen.nl/homepage_hero_ai.jpeg">
  <meta property="og:image:width" content="1408">
  <meta property="og:image:height" content="768">
  <meta property="og:image:alt" content="PeuterPlannen Blog — uitjes voor peuters in Nederland">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(blogIndexTitle)}">
  <meta name="twitter:description" content="${escapeHtml(blogIndexDescription)}">
  <meta name="twitter:image" content="https://peuterplannen.nl/homepage_hero_ai.jpeg">
  <script type="application/ld+json">
${blogIndexLd}
  </script>
</head>
<body>

${navHTML()}

<div class="hero hero-blog">
  <p class="hero-kicker">PeuterPlannen redactie</p>
  <h1 class="hero-blog-title">Inspiratie voor dagen die echt werken</h1>
  <p class="hero-blog-sub"><span class="accent">Praktische gidsen</span>, rustige tips en slimme routes voor ouders met peuters en kleuters. Minder generiek zoeken, sneller een dag die klopt.</p>
  <div class="hero-blog-meta">
    <span>${publishedPosts.length} gidsen</span>
    <span>Nederland breed</span>
    <span>Voor peuters en kleuters</span>
  </div>
</div>

<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; Inspiratie
</nav>

<main id="main-content">
  <section class="guide-section blog-guide pp-reveal">
    <div class="guide-card">
      <p class="guide-kicker">Wat je hier krijgt</p>
      <h2>Geen generieke lijstjes, wel gidsen waar je direct iets aan hebt</h2>
      <p>Deze blog is geschreven voor ouders die sneller een werkbare dag willen plannen. Daarom combineren we regiogidsen, regenopties, horeca-keuzes en leeftijdsspecifieke tips tot artikelen die logisch op elkaar aansluiten.</p>
      <div class="coverage-chip-row">
        ${featuredBlogTags.map((tag) => `<span class="coverage-chip">${escapeHtml(tag)}</span>`).join('')}
      </div>
    </div>
    <div class="guide-card">
      <p class="guide-kicker">Stadsgidsen</p>
      <h2>Begin met een regio die op jouw dag lijkt</h2>
      <div class="guide-links">
        ${cityGuidePosts.map((p) => `<a href="/blog/${p.slug}/" class="guide-link"><strong>${escapeHtml(p.title)}</strong><span>${escapeHtml(p.description)}</span></a>`).join('')}
      </div>
    </div>
    <div class="guide-card">
      <p class="guide-kicker">Praktische thema's</p>
      <h2>Of kies eerst op leeftijd, regen of budget</h2>
      <div class="guide-links">
        ${practicalGuidePosts.map((p) => `<a href="/blog/${p.slug}/" class="guide-link"><strong>${escapeHtml(p.title)}</strong><span>${escapeHtml(p.description)}</span></a>`).join('')}
      </div>
    </div>
  </section>

  <div class="blog-grid pp-reveal-stagger">
    ${postCards}
  </div>

  ${newsletterHTML()}
</main>

${footerHTML()}

${revealScript()}
${analyticsHTML()}
</body>
</html>`;

  fs.writeFileSync(path.join(blogDir, 'index.html'), indexHTML);
  console.log(`  blog/index.html (${publishedPosts.length} posts)`);

  // Generate RSS feed
  const rssItems = publishedPosts.map(p => `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>https://peuterplannen.nl/blog/${p.slug}/</link>
      <description>${escapeHtml(p.description)}</description>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <guid>https://peuterplannen.nl/blog/${p.slug}/</guid>
    </item>`).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PeuterPlannen Blog</title>
    <link>https://peuterplannen.nl/blog/</link>
    <description>Tips en inspiratie voor uitjes met peuters in Nederland</description>
    <language>nl</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://peuterplannen.nl/blog/feed.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(blogDir, 'feed.xml'), rss);
  console.log(`  blog/feed.xml`);

  return publishedPosts;
}

module.exports = { buildBlog, formatDateNL };
