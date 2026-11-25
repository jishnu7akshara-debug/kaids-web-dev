import fs from 'node:fs';
import path from 'node:path';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateHomePartnersHtml(partners) {
  const cardsHtml = partners.map((p) => {
    return `          <!-- TODO-CONFIRM: Verify photo-to-name mapping for ${p.slug} -->
          <article class="partner-card" data-reveal>
            <figure class="photo partner-photo">
              <picture>
                <source type="image/avif" srcset="${p.image.base}-480.avif 480w, ${p.image.base}-800.avif 800w, ${p.image.base}-1200.avif 1200w" sizes="(min-width: 62rem) 16rem, (min-width: 40rem) 14rem, 6.5rem">
                <source type="image/webp" srcset="${p.image.base}-480.webp 480w, ${p.image.base}-800.webp 800w, ${p.image.base}-1200.webp 1200w" sizes="(min-width: 62rem) 16rem, (min-width: 40rem) 14rem, 6.5rem">
                <img src="${p.image.base}-800.jpg" width="${p.image.width}" height="${p.image.height}" loading="lazy" decoding="async" alt="${escapeHtml(p.image.alt)}">
              </picture>
            </figure>
            <div class="partner-card-body">
              <h3 class="partner-name">${escapeHtml(p.name)}</h3>
              <p class="partner-line">${escapeHtml(p.cardLine)}</p>
              <a href="partners.html#${p.slug}" class="btn-read-bio" data-partner-open="${p.slug}" aria-haspopup="dialog">
                <span>Read bio</span>
                <svg class="plus-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>
              </a>
            </div>
          </article>`;
  }).join('\n');

  return `    <section class="section" id="partners">
      <div class="wrap partners-wrap">
        <div class="partners-layout">
          <div class="partners-head" data-stagger>
            <div class="accent-bar" aria-hidden="true"></div>
            <h2 data-reveal="mask">The people behind your file.</h2>
            <p class="lead" data-reveal>Three partners. One family firm. Every client file has a partner on it.</p>
            <div class="partners-cta-inline" data-reveal>
              <a class="btn btn-quiet" href="partners.html">Meet the partners</a>
            </div>
          </div>

          <div class="partners-grid" data-stagger>
${cardsHtml}
          </div>
        </div>

        <div class="partners-foot" data-reveal>
          <a class="btn btn-quiet" href="partners.html">Meet the partners</a>
        </div>
      </div>
    </section>`;
}

export function generateDialogsHtml(partners) {
  return partners.map((p, idx) => {
    const prevIndex = (idx - 1 + partners.length) % partners.length;
    const nextIndex = (idx + 1) % partners.length;
    const prevSlug = partners[prevIndex].slug;
    const nextSlug = partners[nextIndex].slug;

    const focusAreasList = p.focusAreas.map(fa => `              <li>${escapeHtml(fa)}</li>`).join('\n');

    return `    <dialog class="partner-dialog" id="dialog-${p.slug}" aria-labelledby="dialog-title-${p.slug}">
      <div class="dialog-panel">
        <button type="button" class="dialog-close" data-partner-close aria-label="Close">&times;</button>
        <div class="dialog-layout">
          <figure class="dialog-photo">
            <picture>
              <source type="image/avif" srcset="${p.image.base}-480.avif 480w, ${p.image.base}-800.avif 800w, ${p.image.base}-1200.avif 1200w" sizes="(min-width: 48rem) 36vw, 90vw">
              <source type="image/webp" srcset="${p.image.base}-480.webp 480w, ${p.image.base}-800.webp 800w, ${p.image.base}-1200.webp 1200w" sizes="(min-width: 48rem) 36vw, 90vw">
              <img src="${p.image.base}-800.jpg" width="${p.image.width}" height="${p.image.height}" loading="lazy" alt="${escapeHtml(p.image.alt)}">
            </picture>
          </figure>
          <div class="dialog-body">
            <h2 id="dialog-title-${p.slug}">${escapeHtml(p.name)}</h2>
            <div class="dialog-divider"></div>
            <p class="dialog-bio">${escapeHtml(p.bio)}</p>
            <div class="dialog-focus">
              <h4>Focus areas</h4>
              <ul class="focus-list">
${focusAreasList}
              </ul>
            </div>
            <div class="dialog-cta">
              <a href="#contact" class="btn" data-dialog-cta>Talk to our team</a>
            </div>
            <nav class="dialog-nav" aria-label="Partner navigation">
              <button type="button" class="btn-dialog-nav" data-partner-prev="${prevSlug}">Previous partner</button>
              <button type="button" class="btn-dialog-nav" data-partner-next="${nextSlug}">Next partner</button>
            </nav>
          </div>
        </div>
      </div>
    </dialog>`;
  }).join('\n\n');
}

export function generatePartnersPageHtml(partners) {
  const jsonLdGraph = {
    "@context": "https://schema.org",
    "@graph": partners.map(p => ({
      "@type": "Person",
      "@id": `https://www.kaids.in/partners#${p.slug}`,
      "name": p.name,
      "description": p.cardLine,
      "image": `https://www.kaids.in/${p.image.base}-800.webp`,
      "worksFor": {
        "@id": "https://www.kaids.in/#org"
      },
      "url": `https://www.kaids.in/partners#${p.slug}`
    }))
  };

  const navLinks = partners.map(p => {
    const firstName = p.name.split(' ')[0];
    return `<a href="#${p.slug}">${escapeHtml(firstName)}</a>`;
  }).join('<span class="nav-sep" aria-hidden="true">/</span>');

  const articlesHtml = partners.map((p, idx) => {
    const isFirst = idx === 0;
    const focusAreasList = p.focusAreas.map(fa => `              <li>${escapeHtml(fa)}</li>`).join('\n');
    const isEven = idx % 2 === 1;

    return `      <!-- TODO-CONFIRM: Verify photo-to-name mapping for ${p.slug} -->
      <article class="partner-profile ${isEven ? 'is-reversed' : ''}" id="${p.slug}">
        <div class="wrap profile-grid">
          <figure class="photo profile-photo" data-reveal>
            <picture>
              <source type="image/avif" srcset="${p.image.base}-480.avif 480w, ${p.image.base}-800.avif 800w, ${p.image.base}-1200.avif 1200w" sizes="(min-width: 56rem) 42vw, 100vw">
              <source type="image/webp" srcset="${p.image.base}-480.webp 480w, ${p.image.base}-800.webp 800w, ${p.image.base}-1200.webp 1200w" sizes="(min-width: 56rem) 42vw, 100vw">
              <img src="${p.image.base}-800.jpg" width="${p.image.width}" height="${p.image.height}" ${isFirst ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" alt="${escapeHtml(p.image.alt)}">
            </picture>
          </figure>
          <div class="profile-content" data-stagger>
            <h2 data-reveal="mask">${escapeHtml(p.name)}</h2>
            <div class="dialog-divider" data-reveal></div>
            <p class="lead" data-reveal>${escapeHtml(p.cardLine)}</p>
            <p class="profile-bio" data-reveal>${escapeHtml(p.bio)}</p>
            <div class="dialog-focus" data-reveal>
              <h4>Focus areas</h4>
              <ul class="focus-list">
${focusAreasList}
              </ul>
            </div>
            <div class="profile-cta" data-reveal>
              <a href="index.html#contact" class="btn">Talk to our team</a>
            </div>
          </div>
        </div>
      </article>`;
  }).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en-IN" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Partners | KAIDS</title>
  <meta name="description" content="Meet the partners of Karnataka Industrial Documentation Services: Gurunath, Tejas and Ajay Vernekar.">
  <link rel="canonical" href="https://www.kaids.in/partners">
  <meta property="og:title" content="Partners | KAIDS">
  <meta property="og:description" content="Meet the partners of Karnataka Industrial Documentation Services: Gurunath, Tejas and Ajay Vernekar.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.kaids.in/partners">
  <meta property="og:image" content="https://www.kaids.in/assets/img/partners-og.jpg">
  <meta name="theme-color" content="#13132e">
  <link rel="icon" href="assets/img/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
  <link rel="manifest" href="site.webmanifest">
  <link rel="preload" href="assets/fonts/archivo-variable.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="assets/css/site.css?v=3">
  <script src="assets/js/site.js?v=3" defer></script>
  <script type="application/ld+json">
${JSON.stringify(jsonLdGraph, null, 2)}
  </script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>

  <header class="site-header" data-header>
    <div class="wrap header-row">
      <a class="brand" href="/" aria-label="KAIDS home">
        <img src="assets/img/kaids-seal.webp" width="320" height="320" alt="">
        <span class="brand-name">KAIDS</span>
        <span class="brand-full note">Karnataka Industrial Documentation Services</span>
      </a>
      <nav class="nav" id="nav" aria-label="Primary">
        <ul>
          <li><a href="about.html">About</a></li>
          <li><a href="services.html">Services</a></li>
          <li><a href="process.html">Process</a></li>
          <li><a href="clients.html">Clients</a></li>
          <li><a href="partners.html" aria-current="page">Partners</a></li>
          <li class="nav-contact-link"><a href="contact.html">Contact</a></li>
        </ul>
        <div class="nav-contact">
          <span class="note">Call the office</span>
          <a href="tel:+919353128035">93531 28035</a>
          <a href="tel:+919916310226">99163 10226</a>
        </div>
      </nav>
      <a class="btn header-call" href="index.html#contact">Contact Us</a>
      <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="nav">Menu<span aria-hidden="true"></span></button>
    </div>
  </header>

  <main id="main">
    <div class="wrap page-head">
      <h1 data-reveal="mask">Partners</h1>
      <p class="lead">Three partners, one family firm, two decades of Bengaluru land and industrial work between KAIDS and Verna Developers.</p>
      <nav class="partner-inpage-nav" aria-label="Jump to partner">
        ${navLinks}
      </nav>
    </div>

${articlesHtml}

    <aside class="sister" aria-label="Start an enquiry">
      <div class="wrap">
        <p>Have an industrial plot or file that needs dedicated partner guidance?</p>
        <a class="text-link" href="index.html#contact">Start an enquiry</a>
      </div>
    </aside>
  </main>

  <footer class="site-footer">
    <div class="wrap">
      <div class="title-block">
        <div class="tb-brand">
          <img src="assets/img/kaids-seal.webp" width="320" height="320" loading="lazy" alt="">
          <p class="tb-name">Karnataka Industrial Documentation Services</p>
          <p class="note">Documentation, liaison, compliance and construction for industry. Bengaluru, since 2015.</p>
        </div>
        <div>
          <p class="note">Office</p>
          <p>#84, Unit No 1102, 11th Floor, Barton Centre, M G Road, Bengaluru 560001</p>
        </div>
        <div>
          <p class="note">Telephone</p>
          <p><a href="tel:+919353128035">93531 28035</a><br><a href="tel:+919916310226">99163 10226</a></p>
        </div>
        <div>
          <p class="note">Hours</p>
          <p>Monday to Friday<br>11:00 to 18:30</p>
        </div>
        <div>
          <p class="note">Site</p>
          <p class="tb-links">
            <a href="about.html">About</a>
            <a href="services.html">Services</a>
            <a href="process.html">Process</a>
            <a href="clients.html">Clients</a>
            <a href="partners.html" aria-current="page">Partners</a>
            <a href="contact.html">Contact</a>
          </p>
        </div>
        <div>
          <p class="note">Legal</p>
          <p class="tb-links"><a href="privacy.html">Privacy Notice</a><a href="terms.html">Terms of Use</a><a href="cookies.html">Cookie Policy</a></p>
        </div>
      </div>
      <div class="footer-legal note">
        <p>&copy; <span data-year>2026</span> Verna Developers. All rights reserved.</p>
        <p>Developed by <a href="https://www.digifootprint.in/" target="_blank" rel="noopener">Digital Footprint<span class="visually-hidden"> (opens in a new tab)</span></a></p>
      </div>
    </div>
  </footer>

  <div class="mobile-bar" data-mobile-bar>
    <a class="btn btn-quiet" href="tel:+919353128035">Call</a>
    <a class="btn" href="index.html#contact">Enquire</a>
  </div>
</body>
</html>`;
}

export function injectAll() {
  const rootDir = process.cwd();
  const partners = JSON.parse(fs.readFileSync(path.join(rootDir, 'assets', 'data', 'partners.json'), 'utf-8'));

  // 1. Generate partners.html
  const partnersHtml = generatePartnersPageHtml(partners);
  fs.writeFileSync(path.join(rootDir, 'partners.html'), partnersHtml, 'utf-8');
  console.log('[GENERATE] partners.html written');

  // 2. Inject section & dialogs into index.html
  const indexPath = path.join(rootDir, 'index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf-8');

  const homePartnersHtml = `<!-- partners:home:start -->\n${generateHomePartnersHtml(partners)}\n    <!-- partners:home:end -->`;
  const dialogsHtml = `<!-- partners:dialogs:start -->\n${generateDialogsHtml(partners)}\n  <!-- partners:dialogs:end -->`;

  if (indexHtml.includes('<!-- partners:home:start -->')) {
    indexHtml = indexHtml.replace(/<!-- partners:home:start -->[\s\S]*?<!-- partners:home:end -->/, homePartnersHtml);
  } else {
    // Insert after #about
    const aboutEnd = indexHtml.indexOf('</section>', indexHtml.indexOf('id="about"')) + '</section>'.length;
    indexHtml = indexHtml.slice(0, aboutEnd) + '\n\n' + homePartnersHtml + indexHtml.slice(aboutEnd);
  }

  if (indexHtml.includes('<!-- partners:dialogs:start -->')) {
    indexHtml = indexHtml.replace(/<!-- partners:dialogs:start -->[\s\S]*?<!-- partners:dialogs:end -->/, dialogsHtml);
  } else {
    // Insert before closing body or main
    const bodyClose = indexHtml.lastIndexOf('</body>');
    indexHtml = indexHtml.slice(0, bodyClose) + dialogsHtml + '\n' + indexHtml.slice(bodyClose);
  }

  fs.writeFileSync(indexPath, indexHtml, 'utf-8');
  console.log('[INJECT] index.html updated with Partners section and dialogs');
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('inject-partners.mjs')) {
  injectAll();
}
