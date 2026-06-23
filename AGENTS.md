# AGENTS.md — chapolito.com

Rules for any agent working in this repo. This file is read on every task, so it applies to **both** website code work and **Figma** work driven through the Figma MCP. Add your own rules under the `TODO` markers in each section.

---

## Shared principles (apply everywhere)

These hold whether you are editing the site or designing in Figma.

- **Owner / identity:** Jesse O'Chapo — Principal Product Designer, Santa Cruz, CA. This is a personal portfolio (`chapolito.com`).
- **Audience:** hiring managers, recruiters, and fellow designers. Optimize for clarity, craft, and credibility.
- **Voice & tone:** confident, concise, human. No marketing fluff, no buzzwords, no emojis unless explicitly asked.
- **Craft bar:** every change should look intentional and polished. Prefer fewer, higher-quality elements over busy layouts.
- **Accessibility:** meaningful `alt` text and `aria-label`s, sufficient contrast, respect reduced-motion and keyboard use.
- **Consistency over novelty:** match what already exists (patterns, spacing, type, color) before inventing something new.

### Content & language (website and Figma)

- Use **"network"** to refer to a friend graph (not "social graph," "friend graph," etc.).
- Use **"profile"** instead of **"identity."**
- Avoid jargon specific to the identity/accounts space. Write so a hiring manager from any domain can easily understand.

<!-- TODO: add your own shared/brand/voice rules here -->

---

## Website rules

Static portfolio site, deployed to Amazon S3. See [README.md](README.md) for full structure and deploy steps.

- **No new frameworks:** do not add Tailwind, a CSS build step, or a second global stylesheet for the home page. Case studies and legacy pages use [stylesheets/all.css](stylesheets/all.css); the home page uses the modular sheets under `stylesheets/` (`tokens.css`, `home.css`, `bento-bulge.css`, etc.).
- **Layout:** follow the grid and CSS conventions in [.cursor/rules/chapolito-css-layout.mdc](.cursor/rules/chapolito-css-layout.mdc). Match the home page or a sibling case study before creating new structure.
- **Home page:** `index.html` is the bento bulge portfolio — grid shell, dock, overlay reader, and WebGL surface in `javascripts/bento-bulge/`. Project content lives in [javascripts/projects.js](javascripts/projects.js).
- **Page shell:** legacy case studies keep `#main` > `.identifier-wrapper` > `header.row` / `main` / `footer.row`. The home page uses `.stage`, `.grid`, `.dock`, and `.reader` instead.
- **Assets:** images and video live under `images/`; fonts under `fonts/`. Keep `.well-known/` when syncing to S3.
- **JS:** case studies use jQuery + SmoothState + FastClick ([javascripts/all.js](javascripts/all.js)). The home page uses ES modules (Three.js bulge + overlays). Don't introduce another framework for small interactions.
- **Local preview:** `npm start` then open `http://localhost:8080`. Run `npm run generate:home-routes` before deploy so `/{project-id}/` deep links resolve on S3. `/about` redirects to `/#about`.
- **No inline styles for layout/spacing;** add scoped rules in the relevant stylesheet (`all.css` for legacy pages; `stylesheets/home.css` / `bento-bulge.css` for the home page).
- **WebGL + fallback parity:** any interaction or visual state driven by the bento bulge WebGL path (`javascripts/bento-bulge/`) must also work when WebGL is unavailable — coarse pointer, reduced motion, low memory, or context failure. The fallback uses DOM tiles and CSS (see `initFallbackHover` and overlay rules on `.grid.grid--bulge` without `.grid--bulge-active`). Shader-only effects need a CSS or DOM equivalent on the fallback path; do not rely on `.experimental-bento__surface` alone.

<!-- TODO: add your own website rules here -->

---

## Figma rules

For work driven through the Figma MCP (designing screens, components, tokens).

- **Reuse the design system first:** search existing components, variables, and styles before creating anything new. Leverage existing components before creating new ones.
- **Text styles:** only use the text styles already defined in the file. Do not create new text styles.
- **Tokens, not hardcoded values:** bind to design variables/tokens (color, spacing, type) instead of raw hex or magic numbers.
- **Naming:** use clear, consistent layer and frame names (e.g. `Page / Section / Element`) so files stay navigable.
- **Map back to the site:** keep mockups translatable to the site's existing grid and patterns from `all.css` — design with the same breakpoints and column logic in mind so handoff is clean.
- **Keep the brand consistent** with the live site (type, color, spacing, voice).

<!-- TODO: add your own Figma rules here -->
