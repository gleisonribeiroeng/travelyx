#!/usr/bin/env node
/**
 * build-blog.js
 *
 * Reads markdown posts from content/blog/posts/*.md, renders them to
 * static HTML files into frontend/dist/triply/browser/blog/.
 * Also regenerates sitemap.xml (merging existing static URLs with blog posts)
 * and creates an RSS feed at /blog/feed.xml.
 *
 * Run AFTER `ng build` so the frontend dist folder exists.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://travelyx.com.br';
const CONTENT_DIR = path.join(ROOT, 'content', 'blog', 'posts');
const DIST_DIR = path.join(ROOT, 'frontend', 'dist', 'triply', 'browser');
const BLOG_OUT = path.join(DIST_DIR, 'blog');
const SITEMAP_OUT = path.join(DIST_DIR, 'sitemap.xml');
const STATIC_URLS = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/planejar', priority: '0.7', changefreq: 'weekly' },
  { loc: '/blog', priority: '0.9', changefreq: 'daily' },
  { loc: '/termos', priority: '0.3', changefreq: 'monthly' },
  { loc: '/privacidade', priority: '0.3', changefreq: 'monthly' },
];

marked.setOptions({ gfm: true, breaks: false });

// Collect headings while rendering so we can build a TOC
const headingRenderer = new marked.Renderer();
let currentHeadings = [];
headingRenderer.heading = function (tokenOrText, level, raw) {
  const text = typeof tokenOrText === 'object' && tokenOrText !== null
    ? (tokenOrText.text || '')
    : String(tokenOrText);
  const lvl = typeof tokenOrText === 'object' ? tokenOrText.depth : level;
  const slug = slugify(text);
  if (lvl === 2 || lvl === 3) {
    currentHeadings.push({ level: lvl, text, slug });
  }
  return `<h${lvl} id="${slug}">${text}</h${lvl}>\n`;
};

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function readingTime(text) {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

function readPosts() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.warn(`[blog] No content dir at ${CONTENT_DIR}, skipping.`);
    return [];
  }
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  const posts = files.map(file => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    const slug = data.slug || slugify(path.basename(file, '.md'));
    if (!data.title) throw new Error(`[blog] Missing "title" in ${file}`);
    if (!data.description) throw new Error(`[blog] Missing "description" in ${file}`);
    if (!data.publishedAt) throw new Error(`[blog] Missing "publishedAt" in ${file}`);

    currentHeadings = [];
    const html = marked.parse(content, { renderer: headingRenderer });
    return {
      slug,
      title: data.title,
      description: data.description,
      publishedAt: data.publishedAt,
      updatedAt: data.updatedAt || data.publishedAt,
      author: data.author || 'Equipe Travelyx',
      coverImage: data.coverImage || '',
      coverAlt: data.coverAlt || data.title,
      tags: Array.isArray(data.tags) ? data.tags : [],
      category: data.category || 'Viagem',
      html,
      headings: currentHeadings.slice(),
      readingTime: readingTime(content),
      ctaDestination: data.ctaDestination || '',
    };
  });
  return posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function findRelated(post, allPosts, n = 3) {
  const related = allPosts
    .filter(p => p.slug !== post.slug)
    .map(p => {
      const shared = p.tags.filter(t => post.tags.includes(t)).length;
      const sameCategory = p.category === post.category ? 1 : 0;
      return { post: p, score: shared * 2 + sameCategory };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(x => x.post);

  // Fallback: fill with most recent if not enough related
  if (related.length < n) {
    const used = new Set([post.slug, ...related.map(p => p.slug)]);
    for (const p of allPosts) {
      if (used.has(p.slug)) continue;
      related.push(p);
      if (related.length >= n) break;
    }
  }
  return related;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ──────────────────────────────────────────────────────────────
// Shared CSS (inlined into every page)
// ──────────────────────────────────────────────────────────────
const SHARED_CSS = `
:root {
  --navy: #0D1B2A;
  --navy-2: #12253b;
  --orange: #FF6B35;
  --orange-hover: #ff8554;
  --teal: #00D4FF;
  --green: #10B981;
  --text: #e8eef5;
  --text-muted: rgba(232,238,245,0.65);
  --text-dim: rgba(232,238,245,0.45);
  --border: rgba(255,255,255,0.08);
  --card: rgba(255,255,255,0.04);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: var(--navy);
  color: var(--text);
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.65;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--orange); text-decoration: none; }
a:hover { color: var(--orange-hover); text-decoration: underline; }

/* ─── Header ─── */
.tl-header {
  position: sticky; top: 0; z-index: 50;
  background: rgba(13,27,42,0.92);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
}
.tl-header-inner {
  max-width: 1100px; margin: 0 auto;
  padding: 18px 28px;
  display: flex; align-items: center; justify-content: space-between;
}
.tl-logo {
  display: flex; align-items: center; gap: 10px;
  text-decoration: none;
}
.tl-logo:hover { text-decoration: none; }
.tl-logo-img {
  height: 38px; width: auto; display: block;
}
.tl-nav { display: flex; gap: 28px; align-items: center; }
.tl-nav a {
  color: var(--text-muted); font-size: 15px; font-weight: 500;
  text-decoration: none;
}
.tl-nav a:hover { color: #fff; text-decoration: none; }
.tl-nav a.active { color: var(--orange); }
.tl-cta {
  background: var(--orange); color: #fff !important;
  padding: 10px 22px; border-radius: 10px; font-weight: 700; font-size: 14px;
  text-decoration: none !important;
  transition: transform 0.15s, background 0.15s;
}
.tl-cta:hover { background: var(--orange-hover); transform: translateY(-1px); }

/* ─── Container ─── */
.tl-container { max-width: 820px; margin: 0 auto; padding: 0 28px; }
.tl-container-wide { max-width: 1100px; margin: 0 auto; padding: 0 28px; }

/* ─── Hero (post) ─── */
.tl-hero {
  padding: 60px 0 40px; text-align: center;
}
.tl-breadcrumb {
  font-size: 13px; color: var(--text-dim); letter-spacing: 1px;
  text-transform: uppercase; margin-bottom: 20px;
}
.tl-breadcrumb a { color: var(--text-muted); }
.tl-breadcrumb a:hover { color: var(--orange); text-decoration: none; }
.tl-category {
  display: inline-block;
  background: rgba(255,107,53,0.12); color: var(--orange);
  border: 1px solid rgba(255,107,53,0.3);
  padding: 6px 14px; border-radius: 20px;
  font-size: 12px; font-weight: 600; letter-spacing: 1px;
  text-transform: uppercase; margin-bottom: 18px;
}
h1.tl-title {
  font-family: 'Sora', sans-serif; font-weight: 800;
  font-size: clamp(32px, 5vw, 52px); line-height: 1.12;
  color: #fff; letter-spacing: -0.5px; margin-bottom: 18px;
}
.tl-meta {
  display: flex; align-items: center; gap: 18px; justify-content: center;
  color: var(--text-dim); font-size: 14px; flex-wrap: wrap;
}
.tl-meta-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--text-dim); }
.tl-cover {
  width: 100%; aspect-ratio: 16/9;
  background: var(--card);
  border-radius: 16px; overflow: hidden; margin: 40px 0;
  border: 1px solid var(--border);
}
.tl-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* ─── Article body ─── */
article.tl-article {
  padding: 10px 0 80px;
  font-size: 18px; line-height: 1.75;
  color: var(--text);
}
article.tl-article > * + * { margin-top: 24px; }
article.tl-article h2 {
  font-family: 'Sora', sans-serif; font-weight: 700;
  font-size: 30px; line-height: 1.25; color: #fff;
  margin-top: 56px !important; margin-bottom: 14px !important;
  letter-spacing: -0.3px;
}
article.tl-article h3 {
  font-family: 'Sora', sans-serif; font-weight: 700;
  font-size: 22px; line-height: 1.3; color: #fff;
  margin-top: 40px !important; margin-bottom: 10px !important;
}
article.tl-article p { color: var(--text); }
article.tl-article a {
  color: var(--orange); text-decoration: underline;
  text-decoration-thickness: 1.5px; text-underline-offset: 3px;
}
article.tl-article ul, article.tl-article ol {
  padding-left: 28px; color: var(--text);
}
article.tl-article li { margin: 8px 0; }
article.tl-article li::marker { color: var(--orange); }
article.tl-article blockquote {
  border-left: 4px solid var(--orange);
  padding: 4px 0 4px 24px;
  background: rgba(255,107,53,0.05);
  border-radius: 0 8px 8px 0;
  color: var(--text-muted); font-style: italic;
  margin: 32px 0;
}
article.tl-article code {
  background: rgba(255,255,255,0.08);
  padding: 2px 7px; border-radius: 4px;
  font-family: 'JetBrains Mono', Consolas, monospace; font-size: 15px;
  color: var(--teal);
}
article.tl-article pre {
  background: rgba(0,0,0,0.4); border: 1px solid var(--border);
  padding: 20px; border-radius: 10px; overflow-x: auto;
  margin: 28px 0;
}
article.tl-article pre code { background: none; padding: 0; }
article.tl-article img {
  width: 100%; border-radius: 12px;
  margin: 32px 0; border: 1px solid var(--border);
}
article.tl-article hr {
  border: none; height: 1px; background: var(--border);
  margin: 48px 0;
}
article.tl-article table {
  width: 100%; border-collapse: collapse;
  margin: 28px 0; border: 1px solid var(--border);
  border-radius: 10px; overflow: hidden;
}
article.tl-article th {
  background: rgba(255,107,53,0.12); color: #fff;
  padding: 14px 16px; text-align: left; font-weight: 600;
  border-bottom: 1px solid var(--border);
}
article.tl-article td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
article.tl-article tr:last-child td { border-bottom: none; }

/* ─── CTA card ─── */
.tl-cta-card {
  background: linear-gradient(135deg, rgba(255,107,53,0.14) 0%, rgba(0,212,255,0.08) 100%);
  border: 1px solid rgba(255,107,53,0.3);
  border-radius: 18px; padding: 36px 32px;
  text-align: center; margin: 50px 0;
}
.tl-cta-card h3 {
  font-family: 'Sora', sans-serif; font-weight: 800;
  font-size: 26px; color: #fff; margin-bottom: 12px !important;
  margin-top: 0 !important;
}
.tl-cta-card p {
  color: var(--text-muted); margin-bottom: 22px;
}
.tl-cta-card .tl-cta-btn {
  display: inline-flex; align-items: center; gap: 10px;
  background: var(--orange); color: #fff;
  padding: 14px 28px; border-radius: 12px;
  font-weight: 700; font-size: 16px; text-decoration: none;
  box-shadow: 0 14px 30px rgba(255,107,53,0.35);
  transition: transform 0.15s, background 0.15s;
}
.tl-cta-card .tl-cta-btn:hover {
  background: var(--orange-hover); transform: translateY(-2px);
  text-decoration: none;
}

/* ─── TOC ─── */
.tl-toc {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 12px; padding: 20px 24px; margin: 32px 0;
}
.tl-toc-label {
  font-family: 'Sora', sans-serif; font-weight: 700;
  font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--orange); margin-bottom: 12px;
}
.tl-toc ol { list-style: none; padding: 0; margin: 0; }
.tl-toc li { padding: 4px 0; font-size: 15px; }
.tl-toc li.tl-toc-h3 { padding-left: 18px; font-size: 14px; }
.tl-toc a { color: var(--text-muted); text-decoration: none; }
.tl-toc a:hover { color: var(--orange); text-decoration: underline; }

/* ─── Related posts ─── */
.tl-related {
  border-top: 1px solid var(--border);
  padding: 50px 0 20px; margin-top: 30px;
}
.tl-related-label {
  font-family: 'Sora', sans-serif; font-weight: 700;
  font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--orange); margin-bottom: 20px; text-align: center;
}
.tl-related h2 {
  font-family: 'Sora', sans-serif; font-weight: 800;
  font-size: 32px; color: #fff; text-align: center;
  margin: 0 0 36px !important; letter-spacing: -0.3px;
}
.tl-related-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}
.tl-related-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden;
  text-decoration: none; color: var(--text);
  display: flex; flex-direction: column;
  transition: transform 0.2s, border-color 0.2s;
}
.tl-related-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255,107,53,0.4);
  text-decoration: none; color: var(--text);
}
.tl-related-cover { aspect-ratio: 16/9; overflow: hidden; }
.tl-related-cover img { width: 100%; height: 100%; object-fit: cover; }
.tl-related-body { padding: 16px; }
.tl-related-cat {
  color: var(--orange); font-size: 11px; font-weight: 700;
  letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;
}
.tl-related-card h3 {
  font-family: 'Sora', sans-serif; font-weight: 700;
  font-size: 17px; color: #fff; line-height: 1.3;
  margin: 0 !important;
}

/* ─── Blog listing ─── */
.tl-list-hero {
  padding: 80px 0 50px; text-align: center;
}
.tl-list-hero h1 {
  font-family: 'Sora', sans-serif; font-weight: 800;
  font-size: clamp(36px, 5vw, 56px); line-height: 1.1;
  color: #fff; letter-spacing: -0.5px; margin-bottom: 16px;
}
.tl-list-hero p {
  color: var(--text-muted); font-size: 20px; max-width: 620px; margin: 0 auto;
}
.tl-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 28px; padding: 20px 0 80px;
}
.tl-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 14px; overflow: hidden;
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  text-decoration: none; color: var(--text);
  display: flex; flex-direction: column;
}
.tl-card:hover {
  transform: translateY(-3px); text-decoration: none; color: var(--text);
  border-color: rgba(255,107,53,0.4);
  box-shadow: 0 20px 40px rgba(0,0,0,0.35);
}
.tl-card-cover {
  aspect-ratio: 16/9; background: var(--navy-2); position: relative;
  overflow: hidden;
}
.tl-card-cover img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  transition: transform 0.4s;
}
.tl-card:hover .tl-card-cover img { transform: scale(1.04); }
.tl-card-body { padding: 22px; flex: 1; display: flex; flex-direction: column; }
.tl-card-cat {
  color: var(--orange); font-size: 11px; font-weight: 700;
  letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px;
}
.tl-card h2 {
  font-family: 'Sora', sans-serif; font-weight: 700;
  font-size: 20px; line-height: 1.3; color: #fff; margin-bottom: 10px;
  letter-spacing: -0.2px;
}
.tl-card p {
  color: var(--text-muted); font-size: 15px; line-height: 1.55;
  flex: 1;
}
.tl-card-meta {
  color: var(--text-dim); font-size: 12px; margin-top: 16px;
  display: flex; gap: 14px; align-items: center;
}

/* ─── Footer ─── */
.tl-footer {
  border-top: 1px solid var(--border);
  padding: 40px 0; margin-top: 60px;
  color: var(--text-dim); font-size: 14px;
}
.tl-footer-inner {
  max-width: 1100px; margin: 0 auto; padding: 0 28px;
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 16px;
}
.tl-footer a { color: var(--text-muted); margin-left: 20px; }
.tl-footer a:hover { color: var(--orange); text-decoration: none; }

@media (max-width: 640px) {
  .tl-header-inner { padding: 14px 20px; }
  .tl-nav { gap: 16px; }
  .tl-nav a:not(.tl-cta) { display: none; }
  .tl-container, .tl-container-wide { padding: 0 20px; }
  article.tl-article { font-size: 16.5px; }
  article.tl-article h2 { font-size: 24px; }
  article.tl-article h3 { font-size: 19px; }
  .tl-footer-inner { flex-direction: column; text-align: center; }
  .tl-footer a { margin: 0 10px; }
}
`;

// ──────────────────────────────────────────────────────────────
// HTML templates
// ──────────────────────────────────────────────────────────────
function headerHtml(activePath = '/blog') {
  const isBlogActive = activePath.startsWith('/blog');
  return `<header class="tl-header">
    <div class="tl-header-inner">
      <a href="/" class="tl-logo" aria-label="Travelyx — Início">
        <img src="/assets/Tra-removebg-preview.png" alt="Travelyx" class="tl-logo-img">
      </a>
      <nav class="tl-nav">
        <a href="/blog/"${isBlogActive ? ' class="active"' : ''}>Blog</a>
        <a href="/planejar" class="tl-cta">Planejar viagem</a>
      </nav>
    </div>
  </header>`;
}

function footerHtml() {
  const year = new Date().getFullYear();
  return `<footer class="tl-footer">
    <div class="tl-footer-inner">
      <div>&copy; ${year} Travelyx — Da ideia ao embarque.</div>
      <div>
        <a href="/">Início</a>
        <a href="/blog/">Blog</a>
        <a href="/planejar">Planejar viagem</a>
        <a href="/termos">Termos</a>
        <a href="/privacidade">Privacidade</a>
      </div>
    </div>
  </footer>`;
}

const COMMON_HEAD = `
  <meta name="theme-color" content="#FF6B35">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/assets/icons/icon-192x192.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
`;

const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Travelyx',
      alternateName: ['Travelyx Oficial', 'travelyx.com.br'],
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/assets/icons/icon-512x512.png`,
        width: 512,
        height: 512,
      },
      description: 'Travelyx é uma plataforma brasileira de planejamento de viagens: voos, hotéis, aluguel de carros, passeios e roteiros personalizados em um só lugar.',
      areaServed: 'BR',
      sameAs: [
        'https://www.instagram.com/travelyx_oficial',
        'https://www.tiktok.com/@travelyx_oficial',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Travelyx',
      description: 'Planeje sua viagem completa: voos, hotéis, aluguel de carros e roteiros personalizados.',
      inLanguage: 'pt-BR',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
};

const ANALYTICS_SCRIPTS = `
  <!-- Microsoft Clarity -->
  <script type="text/javascript">
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "w34xdmf22p");
  </script>
  <!-- Google Analytics (GA4) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-Y8313DCJYY"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-Y8313DCJYY');
  </script>
`;

function ctaCardHtml(destination) {
  const dest = destination ? `?destino=${encodeURIComponent(destination)}` : '';
  return `<div class="tl-cta-card">
    <h3>Pronto para planejar sua viagem?</h3>
    <p>Organize voos, hotéis e roteiro em um só lugar. Grátis pra começar.</p>
    <a href="/planejar${dest}" class="tl-cta-btn">
      Planejar no Travelyx &rarr;
    </a>
  </div>`;
}

function tocHtml(headings) {
  if (!headings || headings.length < 3) return '';
  const items = headings.map(h =>
    `<li class="tl-toc-h${h.level}"><a href="#${h.slug}">${escapeHtml(h.text)}</a></li>`
  ).join('\n      ');
  return `<nav class="tl-toc" aria-label="Índice">
    <div class="tl-toc-label">Neste post</div>
    <ol>
      ${items}
    </ol>
  </nav>`;
}

function relatedHtml(related) {
  if (!related.length) return '';
  const cards = related.map(p => `<a class="tl-related-card" href="/blog/${p.slug}/">
    ${p.coverImage ? `<div class="tl-related-cover"><img src="${escapeHtml(p.coverImage)}" alt="${escapeHtml(p.coverAlt)}" loading="lazy"></div>` : ''}
    <div class="tl-related-body">
      <div class="tl-related-cat">${escapeHtml(p.category)}</div>
      <h3>${escapeHtml(p.title)}</h3>
    </div>
  </a>`).join('\n');
  return `<aside class="tl-related">
    <div class="tl-related-label">Continue lendo</div>
    <h2>Posts relacionados</h2>
    <div class="tl-related-grid">${cards}</div>
  </aside>`;
}

function postHtml(post, related = []) {
  const url = `${SITE_URL}/blog/${post.slug}/`;
  const ogImage = post.coverImage || `${SITE_URL}/assets/dashboard.png`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: ogImage,
    datePublished: new Date(post.publishedAt).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    author: { '@type': 'Organization', name: post.author, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Travelyx',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE_URL + '/blog/' },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(post.title)} — Travelyx</title>
  <meta name="description" content="${escapeHtml(post.description)}">
  <meta name="keywords" content="${post.tags.map(escapeHtml).join(', ')}">
  <meta name="author" content="${escapeHtml(post.author)}">
  <link rel="canonical" href="${url}">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="Travelyx">
  <meta property="og:title" content="${escapeHtml(post.title)}">
  <meta property="og:description" content="${escapeHtml(post.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="article:published_time" content="${new Date(post.publishedAt).toISOString()}">
  <meta property="article:modified_time" content="${new Date(post.updatedAt).toISOString()}">
  <meta property="article:author" content="${escapeHtml(post.author)}">
  ${post.tags.map(t => `<meta property="article:tag" content="${escapeHtml(t)}">`).join('\n  ')}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(post.title)}">
  <meta name="twitter:description" content="${escapeHtml(post.description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">

  <!-- RSS -->
  <link rel="alternate" type="application/rss+xml" title="Travelyx Blog" href="/blog/feed.xml">
${COMMON_HEAD}
  <style>${SHARED_CSS}</style>

  <script type="application/ld+json">${JSON.stringify(ORG_JSONLD)}</script>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbs)}</script>
${ANALYTICS_SCRIPTS}
</head>
<body>
  ${headerHtml(`/blog/${post.slug}/`)}

  <main class="tl-container">
    <section class="tl-hero">
      <nav class="tl-breadcrumb">
        <a href="/">Travelyx</a> &rsaquo; <a href="/blog/">Blog</a>
      </nav>
      <div class="tl-category">${escapeHtml(post.category)}</div>
      <h1 class="tl-title">${escapeHtml(post.title)}</h1>
      <div class="tl-meta">
        <span>${escapeHtml(post.author)}</span>
        <span class="tl-meta-dot"></span>
        <time datetime="${new Date(post.publishedAt).toISOString()}">${formatDate(post.publishedAt)}</time>
        <span class="tl-meta-dot"></span>
        <span>${post.readingTime} min de leitura</span>
      </div>
    </section>

    ${post.coverImage ? `<figure class="tl-cover"><img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.coverAlt)}" loading="eager"></figure>` : ''}

    <article class="tl-article">
      ${tocHtml(post.headings)}
      ${post.html}
      ${ctaCardHtml(post.ctaDestination)}
    </article>

    ${relatedHtml(related)}
  </main>

  ${footerHtml()}
</body>
</html>`;
}

function listHtml(posts) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Travelyx Blog',
    description: 'Guias, roteiros e dicas de viagem para planejar sua próxima aventura.',
    url: `${SITE_URL}/blog/`,
    publisher: {
      '@type': 'Organization',
      name: 'Travelyx',
      url: SITE_URL,
    },
    blogPost: posts.map(p => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      url: `${SITE_URL}/blog/${p.slug}/`,
      datePublished: new Date(p.publishedAt).toISOString(),
      author: { '@type': 'Organization', name: p.author },
    })),
  };

  const cards = posts.map(p => `<a class="tl-card" href="/blog/${p.slug}/">
    ${p.coverImage ? `<div class="tl-card-cover"><img src="${escapeHtml(p.coverImage)}" alt="${escapeHtml(p.coverAlt)}" loading="lazy"></div>` : ''}
    <div class="tl-card-body">
      <div class="tl-card-cat">${escapeHtml(p.category)}</div>
      <h2>${escapeHtml(p.title)}</h2>
      <p>${escapeHtml(p.description)}</p>
      <div class="tl-card-meta">
        <time datetime="${new Date(p.publishedAt).toISOString()}">${formatDate(p.publishedAt)}</time>
        <span>&middot;</span>
        <span>${p.readingTime} min</span>
      </div>
    </div>
  </a>`).join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Blog — Travelyx | Guias e roteiros de viagem</title>
  <meta name="description" content="Roteiros prontos, dicas de orçamento e guias práticos pra você planejar sua próxima viagem. Sem enrolação.">
  <link rel="canonical" href="${SITE_URL}/blog/">

  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="Travelyx">
  <meta property="og:title" content="Blog Travelyx — Guias e roteiros de viagem">
  <meta property="og:description" content="Roteiros prontos, dicas de orçamento e guias práticos pra você planejar sua próxima viagem.">
  <meta property="og:url" content="${SITE_URL}/blog/">
  <meta property="og:image" content="${SITE_URL}/assets/dashboard.png">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Blog Travelyx">
  <meta name="twitter:description" content="Roteiros prontos, dicas de orçamento e guias práticos.">

  <link rel="alternate" type="application/rss+xml" title="Travelyx Blog" href="/blog/feed.xml">
${COMMON_HEAD}
  <style>${SHARED_CSS}</style>

  <script type="application/ld+json">${JSON.stringify(ORG_JSONLD)}</script>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
${ANALYTICS_SCRIPTS}
</head>
<body>
  ${headerHtml('/blog/')}

  <main class="tl-container-wide">
    <section class="tl-list-hero">
      <h1>Blog Travelyx</h1>
      <p>Guias, roteiros prontos e dicas práticas pra tirar sua viagem do papel.</p>
    </section>

    <section class="tl-grid">
      ${cards || '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:60px 0;">Em breve, novos posts.</p>'}
    </section>
  </main>

  ${footerHtml()}
</body>
</html>`;
}

function sitemapXml(posts) {
  const urls = [
    ...STATIC_URLS.map(u => `<url><loc>${SITE_URL}${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`),
    ...posts.map(p => `<url>
    <loc>${SITE_URL}/blog/${p.slug}/</loc>
    <lastmod>${new Date(p.updatedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('\n  ')}
</urlset>`;
}

function rssXml(posts) {
  const items = posts.slice(0, 20).map(p => `<item>
      <title>${escapeXml(p.title)}</title>
      <description>${escapeXml(p.description)}</description>
      <link>${SITE_URL}/blog/${p.slug}/</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}/</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <author>${escapeXml(p.author)}</author>
      ${p.tags.map(t => `<category>${escapeXml(t)}</category>`).join('')}
    </item>`).join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Travelyx Blog</title>
    <link>${SITE_URL}/blog/</link>
    <description>Guias, roteiros e dicas para planejar sua próxima viagem.</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
}

// ──────────────────────────────────────────────────────────────
// Build
// ──────────────────────────────────────────────────────────────
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`[blog] Dist dir not found: ${DIST_DIR}`);
    console.error(`[blog] Run "ng build" first.`);
    process.exit(1);
  }

  const posts = readPosts();
  console.log(`[blog] Found ${posts.length} post(s).`);

  ensureDir(BLOG_OUT);

  // Per-post pages
  for (const post of posts) {
    const postDir = path.join(BLOG_OUT, post.slug);
    ensureDir(postDir);
    const related = findRelated(post, posts, 3);
    fs.writeFileSync(path.join(postDir, 'index.html'), postHtml(post, related), 'utf8');
    console.log(`[blog] ✓ /blog/${post.slug}/ (${related.length} related)`);
  }

  // Listing
  fs.writeFileSync(path.join(BLOG_OUT, 'index.html'), listHtml(posts), 'utf8');
  console.log(`[blog] ✓ /blog/`);

  // RSS
  fs.writeFileSync(path.join(BLOG_OUT, 'feed.xml'), rssXml(posts), 'utf8');
  console.log(`[blog] ✓ /blog/feed.xml`);

  // Sitemap (overwrite root sitemap.xml)
  fs.writeFileSync(SITEMAP_OUT, sitemapXml(posts), 'utf8');
  console.log(`[blog] ✓ /sitemap.xml (${STATIC_URLS.length + posts.length} urls)`);

  console.log(`[blog] Done.`);
}

main();
