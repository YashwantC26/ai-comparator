/**
 * animations.js
 * Standalone module for AI Model Comparator.
 *
 * Exports:
 *   initAnimations()   — sequential card fade-in/slide-up via MutationObserver
 *   initThemeToggle()  — injects a sun/moon toggle into the header
 */

// ─────────────────────────────────────────────────────────────
// CARD ANIMATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Injects the CSS rules needed for the staggered card animation.
 * Cards start invisible and 18px below their natural position,
 * then transition to full opacity and translateY(0).
 * CSS transitions are used — no JS animation libraries.
 */
function injectCardAnimationStyles() {
  if (document.getElementById('anim-card-styles')) return;

  const style = document.createElement('style');
  style.id = 'anim-card-styles';
  style.textContent = `
    .anim-card-pending {
      opacity: 0;
      transform: translateY(18px);
    }
    .anim-card-visible {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 0.35s ease, transform 0.35s ease;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Given a container element that has just had cards inserted into it,
 * applies the staggered reveal: each direct child card gets
 * .anim-card-pending immediately, then .anim-card-visible with an
 * 80ms stagger per card.
 */
function animateCardsIn(container) {
  const cards = Array.from(container.children);
  if (cards.length === 0) return;

  // First, stamp all cards as pending (invisible, shifted down).
  // We do this synchronously before the browser paints so the
  // initial invisible state is applied before any transitions run.
  cards.forEach(card => {
    card.classList.remove('anim-card-visible');
    card.classList.add('anim-card-pending');
  });

  // Force a reflow so the browser registers the pending state before
  // we add the visible class (which triggers the CSS transition).
  // Reading offsetHeight is a reliable reflow trigger.
  // eslint-disable-next-line no-unused-expressions
  container.offsetHeight;

  cards.forEach((card, i) => {
    setTimeout(() => {
      card.classList.remove('anim-card-pending');
      card.classList.add('anim-card-visible');
    }, i * 80);
  });
}

/**
 * Sets up a MutationObserver on #recommendationsGrid.
 * Whenever its child list changes (i.e. renderCards() rewrites innerHTML),
 * we trigger the staggered animation on the newly inserted cards.
 *
 * The grid is the only element whose children are dynamically replaced
 * en-masse by the app's renderCards() function (line 856 in index.html).
 */
function initAnimations() {
  injectCardAnimationStyles();

  const grid = document.getElementById('recommendationsGrid');
  if (!grid) {
    // Defer until DOM is ready.
    document.addEventListener('DOMContentLoaded', initAnimations);
    return;
  }

  const observer = new MutationObserver(mutations => {
    // We only care about childList changes (innerHTML replacement).
    const hasChildChange = mutations.some(m => m.type === 'childList');
    if (hasChildChange && grid.children.length > 0) {
      animateCardsIn(grid);
    }
  });

  observer.observe(grid, { childList: true });
}

// ─────────────────────────────────────────────────────────────
// DARK / LIGHT THEME TOGGLE
// ─────────────────────────────────────────────────────────────

/**
 * CSS variable overrides applied to :root / body for light mode.
 * Dark mode is the default (index.html baseline).
 * Preference is stored in memory only (no localStorage).
 */
const LIGHT_MODE_STYLES_ID = 'theme-light-overrides';

const LIGHT_MODE_CSS = `
  /* ── Light mode overrides ── */

  /* Page background and text */
  body {
    background-color: #f8f7ff !important;
    color: #1a1333 !important;
  }

  /* Hide the star field — it looks odd on white */
  .stars {
    opacity: 0 !important;
  }

  /* Mute the purple radial glow behind the hero */
  body > div[style*="radial-gradient"] {
    opacity: 0.25 !important;
  }

  /* Scrollbar */
  ::-webkit-scrollbar-track { background: #ede9fe !important; }
  ::-webkit-scrollbar-thumb { background: #a855f7 !important; }

  /* Header border */
  header {
    border-color: rgba(168, 85, 247, 0.18) !important;
    background: rgba(248, 247, 255, 0.95) !important;
  }

  /* Nav links */
  header nav a {
    color: rgba(26, 19, 51, 0.6) !important;
  }
  header nav a:hover {
    color: rgba(26, 19, 51, 0.95) !important;
  }

  /* "10 models tracked" pill */
  header .bg-white\\/5 {
    background: rgba(168, 85, 247, 0.08) !important;
    border-color: rgba(168, 85, 247, 0.2) !important;
    color: rgba(26, 19, 51, 0.55) !important;
  }

  /* Input / textarea backgrounds */
  input, textarea, [contenteditable] {
    background: rgba(255, 255, 255, 0.9) !important;
    color: #1a1333 !important;
    border-color: rgba(168, 85, 247, 0.25) !important;
  }

  /* Gradient-border cards — lighten their background */
  .gradient-border {
    background: rgba(255, 255, 255, 0.7) !important;
  }

  /* Recommendation / projector cards rendered inline */
  [style*="rgba(13,21,48"] {
    background: rgba(255, 255, 255, 0.85) !important;
  }

  /* Table rows */
  .table-row-hover:hover {
    background: rgba(168, 85, 247, 0.06) !important;
  }

  /* Section headings */
  h1, h2, h3 {
    color: #1a1333 !important;
  }

  /* Muted text classes */
  .text-white\\/40, .text-white\\/45, .text-white\\/50 {
    color: rgba(26, 19, 51, 0.5) !important;
  }
  .text-white\\/60 {
    color: rgba(26, 19, 51, 0.65) !important;
  }
  .text-white\\/70 {
    color: rgba(26, 19, 51, 0.75) !important;
  }
  .text-white\\/80, .text-white\\/90 {
    color: rgba(26, 19, 51, 0.9) !important;
  }
  .text-white {
    color: #1a1333 !important;
  }

  /* Filter / toggle buttons */
  .bg-white\\/5, .bg-white\\/\\[0\\.06\\], .bg-space-800\\/80,
  .bg-space-800\\/50, .bg-space-800\\/40 {
    background: rgba(255, 255, 255, 0.75) !important;
  }

  /* Divider lines */
  .divider {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(168, 85, 247, 0.3),
      rgba(34, 211, 238, 0.3),
      transparent
    ) !important;
  }

  /* Card hover shadow — lighter on white */
  .card-hover:hover {
    box-shadow:
      0 8px 32px rgba(168, 85, 247, 0.18),
      0 4px 12px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
  }

  /* Toggle button itself in light mode */
  #theme-toggle-btn {
    background: rgba(168, 85, 247, 0.1) !important;
    border-color: rgba(168, 85, 247, 0.3) !important;
    color: #7c3aed !important;
  }
  #theme-toggle-btn:hover {
    background: rgba(168, 85, 247, 0.18) !important;
  }
`;

// Moon SVG (shown in dark mode — click to go light)
const ICON_MOON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>`;

// Sun SVG (shown in light mode — click to go dark)
const ICON_SUN = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="5"/>
  <line x1="12" y1="1"  x2="12" y2="3"/>
  <line x1="12" y1="21" x2="12" y2="23"/>
  <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
  <line x1="1"  y1="12" x2="3"  y2="12"/>
  <line x1="21" y1="12" x2="23" y2="12"/>
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
</svg>`;

// In-memory theme state (no localStorage).
let isDarkMode = true;

/**
 * Applies or removes the light-mode CSS override <style> block.
 */
function applyTheme(dark) {
  const existing = document.getElementById(LIGHT_MODE_STYLES_ID);
  if (dark) {
    // Remove the light override to restore the dark baseline.
    if (existing) existing.remove();
  } else {
    // Inject light override if not already present.
    if (!existing) {
      const style = document.createElement('style');
      style.id = LIGHT_MODE_STYLES_ID;
      style.textContent = LIGHT_MODE_CSS;
      document.head.appendChild(style);
    }
  }
}

/**
 * Updates the toggle button icon and aria-label to reflect the current mode.
 */
function syncToggleButton(btn, dark) {
  btn.innerHTML = dark ? ICON_MOON : ICON_SUN;
  btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
}

/**
 * Creates the toggle button, injects it into the header's right-hand flex
 * container (alongside the "10 models tracked" pill), and wires up click logic.
 *
 * The header structure in index.html (line 125):
 *   <div class="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
 *     <div>  ← logo/brand
 *     <nav>  ← navigation links
 *     <div>  ← "10 models tracked" pill  ← we insert the button before this
 *   </div>
 */
function initThemeToggle() {
  // Inject toggle button styles (dark-mode baseline appearance).
  if (!document.getElementById('theme-toggle-styles')) {
    const style = document.createElement('style');
    style.id = 'theme-toggle-styles';
    style.textContent = `
      #theme-toggle-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        flex-shrink: 0;
      }
      #theme-toggle-btn:hover {
        background: rgba(168, 85, 247, 0.15);
        border-color: rgba(168, 85, 247, 0.35);
        color: rgba(255, 255, 255, 0.9);
      }
    `;
    document.head.appendChild(style);
  }

  // Find the header's inner flex container.
  const headerInner = document.querySelector('header .max-w-7xl');
  if (!headerInner) {
    // Retry after DOMContentLoaded if called too early.
    document.addEventListener('DOMContentLoaded', initThemeToggle);
    return;
  }

  // Create the button.
  const btn = document.createElement('button');
  btn.id = 'theme-toggle-btn';
  syncToggleButton(btn, isDarkMode);

  btn.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    applyTheme(isDarkMode);
    syncToggleButton(btn, isDarkMode);
  });

  // Insert the button as the second-to-last child of the header flex row,
  // i.e. just before the "10 models tracked" pill (the last child).
  const lastChild = headerInner.lastElementChild;
  if (lastChild) {
    headerInner.insertBefore(btn, lastChild);
  } else {
    headerInner.appendChild(btn);
  }
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

export { initAnimations, initThemeToggle };
