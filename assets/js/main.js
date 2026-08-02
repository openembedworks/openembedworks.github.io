/**
 * OpenEmbedWorks – Tool Loader
 * File: assets/js/main.js
 *
 * This script fetches tools.json and dynamically renders tool cards
 * into the matching category sections defined in index.html.
 *
 * HOW TO ADD NEW TOOLS:
 *   1. Open tools.json in the project root.
 *   2. Add a new object to the "tools" array with:
 *        { "name": "...", "category": "...", "description": "...", "url": "..." }
 *   3. The category value must match one of the section IDs in index.html:
 *        systems-linux | embedded-automotive | networking-protocols | development-tools
 *   4. Save tools.json – the page will pick up the new card automatically.
 */

(function () {
  'use strict';

  /** Map category id → the grid container inside that section */
  const CATEGORY_GRIDS = {
    'systems-linux':        document.getElementById('grid-systems-linux'),
    'embedded-automotive':  document.getElementById('grid-embedded-automotive'),
    'networking-protocols': document.getElementById('grid-networking-protocols'),
    'development-tools':    document.getElementById('grid-development-tools'),
  };

  /** Arrow SVG icon reused in every card link */
  const ARROW_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>`;

  /**
   * Build the HTML string for a single tool card.
   * @param {Object} tool – a tool entry from tools.json
   * @returns {string} HTML markup
   */
  function buildCardHTML(tool) {
    // Escape user-supplied content to prevent XSS
    const name = escapeHTML(tool.name || 'Untitled');
    const desc = escapeHTML(tool.description || '');
    const url  = sanitizeURL(tool.url || '#');

    return `
      <article class="tool-card">
        <h3 class="tool-card-title">${name}</h3>
        <p class="tool-card-desc">${desc}</p>
        <a class="tool-card-link" href="${url}" ${url !== '#' ? 'target="_blank" rel="noopener noreferrer"' : ''}>
          Open tool ${ARROW_ICON}
        </a>
      </article>`;
  }

  /**
   * Render skeleton placeholder cards while data loads.
   * @param {number} count – number of skeletons to show per grid
   */
  function showSkeletons(count = 4) {
    const skeletonHTML = Array.from({ length: count }, () =>
      '<div class="tool-card skeleton skeleton-card" aria-hidden="true"></div>'
    ).join('');

    Object.values(CATEGORY_GRIDS).forEach(grid => {
      if (grid) grid.innerHTML = skeletonHTML;
    });
  }

  /**
   * Insert rendered cards into each category grid.
   * @param {Array} tools – array of tool objects from tools.json
   */
  function renderTools(tools) {
    // Clear skeletons
    Object.values(CATEGORY_GRIDS).forEach(grid => {
      if (grid) grid.innerHTML = '';
    });

    let rendered = 0;

    tools.forEach(tool => {
      const grid = CATEGORY_GRIDS[tool.category];
      if (!grid) {
        console.warn(`[tools] Unknown category "${tool.category}" for tool "${tool.name}"`);
        return;
      }
      grid.insertAdjacentHTML('beforeend', buildCardHTML(tool));
      rendered++;
    });

    console.info(`[tools] Rendered ${rendered} of ${tools.length} tools.`);

    // Show a message for any empty grid
    Object.entries(CATEGORY_GRIDS).forEach(([cat, grid]) => {
      if (grid && grid.children.length === 0) {
        grid.innerHTML = `<p class="tools-loading">No tools in this category yet.</p>`;
      }
    });
  }

  /**
   * Show an error message inside every grid.
   * @param {string} message
   */
  function showError(message) {
    Object.values(CATEGORY_GRIDS).forEach(grid => {
      if (grid) {
        grid.innerHTML = `<p class="tools-error" role="alert">⚠ ${escapeHTML(message)}</p>`;
      }
    });
  }

  /**
   * Fetch tools.json and kick off rendering.
   * Falls back gracefully if the network is unavailable.
   */
  async function loadTools() {
    showSkeletons(4);

    try {
      const resp = await fetch('./tools.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

      const data = await resp.json();

      if (!Array.isArray(data.tools)) {
        throw new Error('tools.json must have a top-level "tools" array.');
      }

      renderTools(data.tools);
    } catch (err) {
      console.error('[tools] Failed to load tools.json:', err);
      showError('Could not load tools. Please try refreshing the page.');
    }
  }

  /* ---- Helpers ---- */

  /**
   * Minimal HTML escaping to prevent XSS from JSON content.
   * @param {string} str
   * @returns {string}
   */
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Ensure URLs are safe (http/https/# only).
   * @param {string} url
   * @returns {string}
   */
  function sanitizeURL(url) {
    try {
      const parsed = new URL(url, window.location.href);
      if (['http:', 'https:'].includes(parsed.protocol)) return url;
    } catch (_) {
      // Not a valid absolute URL; allow relative paths starting with /
      if (/^[/#]/.test(url)) return url;
    }
    return '#';
  }

  /* ---- Bootstrap ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTools);
  } else {
    loadTools();
  }

  /* ---- Service Worker registration ----
   * The service worker (sw.js at the root) caches key assets for offline use.
   * Registration is deferred until after the page loads to avoid blocking.
   */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.info('[sw] Registered, scope:', reg.scope))
        .catch(err => console.warn('[sw] Registration failed:', err));
    });
  }
})();
