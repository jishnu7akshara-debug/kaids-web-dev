# KAIDS Website — Karnataka Industrial Documentation Services

Official static website for **KAIDS** (Karnataka Industrial Documentation Services, Bengaluru).

## Quick Start (Run Locally)

The website is fully static with zero build dependencies required.

### Option 1: Python
```bash
python -m http.server 8085
```
Then open: [http://localhost:8085](http://localhost:8085)

### Option 2: Node.js / npm
```bash
npm start
# or
npx serve -l 8085 .
```
Then open: [http://localhost:8085](http://localhost:8085)

---

## Project Structure

```text
├── index.html              # Main homepage (Services, About, Process, Contact)
├── clients.html            # Dedicated clients page with interactive search
├── site.webmanifest        # PWA Web App Manifest
├── package.json            # npm convenience scripts
└── assets/
    ├── css/
    │   └── site.css        # Clean responsive styles and typography
    ├── js/
    │   └── site.js         # Navigation, animations, client filter, enquiry form
    ├── fonts/
    │   └── archivo-variable.woff2 # Self-hosted Archivo variable font
    └── img/
        ├── clients/        # WebP logos for 15+ featured client brands
        └── ...             # Hero graphics, seal, and service photos
```

---

## How to Deploy Online

### 1. GitHub Pages (Free)
1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of KAIDS website"
   ```
2. Push to a GitHub repository.
3. In GitHub Settings > **Pages**, set branch to `main` and folder to `/ (root)`.
4. Your site will be live at `https://<username>.github.io/<repo>/` or your custom domain (`kaids.in`).

### 2. Netlify / Vercel / Cloudflare Pages (Free & Instant)
- Simply drag-and-drop this folder into **Netlify Drop** ([app.netlify.com/drop](https://app.netlify.com/drop)), or connect your repository on Vercel or Cloudflare Pages with publish directory set to `.`.

## Content Security Policy (CSP) & Styling Rule

- No inline styles (`style="..."` or `<style>` blocks in HTML, or `setAttribute('style', ...)` / `.style.cssText` / `style=` strings in JS).
- Use classes and tokens in `assets/css/site.css` (and `admin/admin.css` for the admin portal).
- For dynamic values in JS, use `element.style.setProperty('--var', value)` or CSSOM properties (`element.style.transform`).
- `npm run check:csp` enforces this rule across all deployable files.
