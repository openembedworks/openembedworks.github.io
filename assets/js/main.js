/**
 * OpenEmbedWorks - Category/Subcategory Catalog Loader
 * File: assets/js/main.js
 */

(function () {
  'use strict';

  const dom = {
    categoryList: document.getElementById('category-list'),
    subcategoryList: document.getElementById('subcategory-list'),
    tableWrap: document.getElementById('tools-table-wrap'),
    tableBody: document.getElementById('tools-table-body'),
    tableHead: document.querySelector('.tools-table thead'),
    tilesWrap: document.getElementById('tools-tiles'),
    resultCount: document.getElementById('results-count'),
    activePath: document.getElementById('active-path'),
    queryInput: document.getElementById('search-input'),
    clearFilters: document.getElementById('clear-filters'),
    viewTableBtn: document.getElementById('view-table'),
    viewTilesBtn: document.getElementById('view-tiles'),
    status: document.getElementById('catalog-status'),
  };

  const STAR_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
  const STAR_CACHE_KEY = 'oew-github-stars-v1';

  const state = {
    query: '',
    category: 'all',
    subcategory: 'all',
    sort: 'rating-desc',
    view: 'table',
  };

  const VALID_SORTS = new Set([
    'name-asc', 'name-desc',
    'category-asc', 'category-desc',
    'subcategory-asc', 'subcategory-desc',
    'rating-asc', 'rating-desc',
    'stars-asc', 'stars-desc',
    'description-asc', 'description-desc',
  ]);

  const model = {
    categories: [],
    tags: [],
    tools: [],
  };

  function setStatus(message, isError) {
    if (!dom.status) return;
    dom.status.textContent = message || '';
    dom.status.classList.toggle('tools-error', Boolean(isError));
  }

  function showSkeletonRows(count) {
    if (!dom.tableBody) return;
    const total = count || 6;
    dom.tableBody.innerHTML = Array.from({ length: total }, () =>
      '<tr aria-hidden="true"><td colspan="7"><div class="table-skeleton-row skeleton"></div></td></tr>'
    ).join('');
  }

  function normalizeData(raw) {
    if (!raw || !Array.isArray(raw.tools)) {
      throw new Error('tools.json must include a tools array.');
    }

    const hasSchema = raw._schemaVersion === '2.0';

    if (hasSchema) {
      return {
        categories: Array.isArray(raw.categories) ? raw.categories.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) : [],
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        tools: raw.tools.map(tool => ({
          id: tool.id || slugify(tool.name || 'untitled-tool'),
          name: tool.name || 'Untitled',
          category: tool.category || 'uncategorized',
          tags: Array.isArray(tool.tags) ? tool.tags : [],
          description: tool.description || '',
          url: tool.url || '#',
          githubRepo: tool.githubRepo || '',
          rating: normalizeRating(tool.rating),
        })),
      };
    }

    const fallbackCategoryIds = [...new Set(raw.tools.map(tool => tool.category || 'uncategorized'))];
    return {
      categories: fallbackCategoryIds.map((id, index) => ({
        id,
        label: startCase(id),
        description: '',
        order: index + 1,
      })),
      tags: [],
      tools: raw.tools.map(tool => ({
        id: slugify(tool.name || 'untitled-tool'),
        name: tool.name || 'Untitled',
        category: tool.category || 'uncategorized',
        tags: [],
        description: tool.description || '',
        url: tool.url || '#',
        githubRepo: '',
        rating: normalizeRating(tool.rating),
      })),
    };
  }

  function normalizeRating(rating) {
    const value = Number(rating && rating.value);
    const count = Number(rating && rating.count);
    return {
      value: Number.isFinite(value) ? clamp(value, 0, 5) : 0,
      count: Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0,
      source: rating && rating.source ? String(rating.source) : 'seed',
      stars: 0,
    };
  }

  function renderSidebar() {
    if (dom.categoryList) {
      const categoryItems = [
        '<li><button type="button" class="facet-btn is-active" data-category="all">All tools</button></li>',
      ];
      model.categories.forEach(category => {
        categoryItems.push(
          `<li><button type="button" class="facet-btn" data-category="${escapeHTML(category.id)}">${escapeHTML(category.label || startCase(category.id))}</button></li>`
        );
      });
      dom.categoryList.innerHTML = categoryItems.join('');
    }

    renderSubcategories();
  }

  function renderSubcategories() {
    if (!dom.subcategoryList) return;
    const subcategories = getAvailableSubcategories();
    const items = [
      `<button type="button" class="subfacet-btn ${state.subcategory === 'all' ? 'is-active' : ''}" data-subcategory="all">All subcategories</button>`
    ];

    subcategories.forEach(subcategory => {
      const activeClass = state.subcategory === subcategory.id ? 'is-active' : '';
      items.push(
        `<button type="button" class="subfacet-btn ${activeClass}" data-subcategory="${escapeHTML(subcategory.id)}">${escapeHTML(subcategory.label)}</button>`
      );
    });

    dom.subcategoryList.innerHTML = items.join('');
  }

  function getAvailableSubcategories() {
    const toolsInCategory = state.category === 'all'
      ? model.tools
      : model.tools.filter(tool => tool.category === state.category);

    const tagIds = new Set();
    toolsInCategory.forEach(tool => (tool.tags || []).forEach(tag => tagIds.add(tag)));

    return Array.from(tagIds)
      .sort()
      .map(tagId => ({ id: tagId, label: getTagLabel(tagId) }));
  }

  function filteredTools() {
    const query = state.query.trim().toLowerCase();

    let tools = model.tools.filter(tool => {
      if (state.category !== 'all' && tool.category !== state.category) return false;

      if (state.subcategory !== 'all' && !(tool.tags || []).includes(state.subcategory)) {
        return false;
      }

      if (query) {
        const blob = `${tool.name} ${tool.description} ${(tool.tags || []).join(' ')}`.toLowerCase();
        if (!blob.includes(query)) return false;
      }

      return true;
    });

    tools = tools.slice();

    const [sortKey, sortDir] = state.sort.split('-');
    const direction = sortDir === 'asc' ? 1 : -1;

    tools.sort((a, b) => compareTools(a, b, sortKey) * direction);

    return tools;
  }

  function compareTools(a, b, sortKey) {
    if (sortKey === 'rating') {
      return (a.rating.value || 0) - (b.rating.value || 0);
    }

    if (sortKey === 'stars') {
      return (a.rating.stars || 0) - (b.rating.stars || 0);
    }

    const aValue = String(getToolSortValue(a, sortKey)).toLowerCase();
    const bValue = String(getToolSortValue(b, sortKey)).toLowerCase();
    return aValue.localeCompare(bValue);
  }

  function getToolSortValue(tool, sortKey) {
    if (sortKey === 'category') return getCategoryLabel(tool.category);
    if (sortKey === 'subcategory') return getPrimarySubcategoryLabel(tool.tags || []);
    if (sortKey === 'description') return tool.description || '';
    return tool.name || '';
  }

  function renderResults() {
    if (!dom.tableBody || !dom.tilesWrap || !dom.tableWrap) return;

    const tools = filteredTools();
    if (dom.resultCount) {
      dom.resultCount.textContent = `${tools.length} result${tools.length === 1 ? '' : 's'}`;
    }

    renderPath();
    applyViewState();
    applySortIndicators();
    dom.tableBody.innerHTML = '';
    dom.tilesWrap.innerHTML = '';

    if (tools.length === 0) {
      if (state.view === 'tiles') {
        dom.tilesWrap.innerHTML = '<p class="table-empty">No tools match the selected filters.</p>';
      } else {
        dom.tableBody.innerHTML = '<tr><td colspan="7" class="table-empty">No tools match the selected filters.</td></tr>';
      }
      return;
    }

    if (state.view === 'tiles') {
      renderTiles(tools);
    } else {
      renderTable(tools);
    }
  }

  function renderTable(tools) {
    tools.forEach(tool => {
      const safeUrl = sanitizeURL(tool.url || '#');
      const categoryLabel = getCategoryLabel(tool.category);
      const subcategoryLabel = getPrimarySubcategoryLabel(tool.tags || []);
      const stars = tool.rating.stars > 0 ? formatCompact(tool.rating.stars) : '-';
      const actionAttrs = safeUrl !== '#'
        ? 'target="_blank" rel="noopener noreferrer"'
        : '';

      dom.tableBody.insertAdjacentHTML('beforeend', `
        <tr>
          <td class="cell-tool">${escapeHTML(tool.name)}</td>
          <td>${escapeHTML(categoryLabel)}</td>
          <td>${escapeHTML(subcategoryLabel)}</td>
          <td>${escapeHTML(formatRating(tool.rating))}</td>
          <td>${escapeHTML(stars)}</td>
          <td class="cell-description">${escapeHTML(tool.description)}</td>
          <td><a class="tool-table-link" href="${safeUrl}" ${actionAttrs}>Open</a></td>
        </tr>
      `);
    });
  }

  function renderTiles(tools) {
    const cards = tools.map(tool => {
      const safeUrl = sanitizeURL(tool.url || '#');
      const categoryLabel = getCategoryLabel(tool.category);
      const subcategoryLabel = getPrimarySubcategoryLabel(tool.tags || []);
      const stars = tool.rating.stars > 0 ? `${formatCompact(tool.rating.stars)} stars` : 'No stars yet';
      const actionAttrs = safeUrl !== '#'
        ? 'target="_blank" rel="noopener noreferrer"'
        : '';

      return `
        <article class="tool-tile">
          <h3 class="tool-tile-title">${escapeHTML(tool.name)}</h3>
          <p class="tool-tile-meta">${escapeHTML(categoryLabel)} · ${escapeHTML(subcategoryLabel)}</p>
          <p class="tool-tile-rating">${escapeHTML(formatRating(tool.rating))} · ${escapeHTML(stars)}</p>
          <p class="tool-tile-desc">${escapeHTML(tool.description)}</p>
          <a class="tool-table-link" href="${safeUrl}" ${actionAttrs}>Open</a>
        </article>
      `;
    }).join('');

    dom.tilesWrap.innerHTML = cards;
  }

  function applyViewState() {
    const isTiles = state.view === 'tiles';

    if (dom.tableWrap) dom.tableWrap.hidden = isTiles;
    if (dom.tilesWrap) dom.tilesWrap.hidden = !isTiles;

    if (dom.viewTableBtn) {
      dom.viewTableBtn.classList.toggle('is-active', !isTiles);
      dom.viewTableBtn.setAttribute('aria-pressed', String(!isTiles));
    }

    if (dom.viewTilesBtn) {
      dom.viewTilesBtn.classList.toggle('is-active', isTiles);
      dom.viewTilesBtn.setAttribute('aria-pressed', String(isTiles));
    }
  }

  function applySortIndicators() {
    if (!dom.tableHead) return;
    const [activeKey, activeDir] = state.sort.split('-');

    dom.tableHead.querySelectorAll('th[data-sort]').forEach(th => {
      const key = th.getAttribute('data-sort');
      const button = th.querySelector('.col-sort-btn');
      const indicator = th.querySelector('.sort-indicator');

      if (!button || !indicator) return;

      if (key === activeKey) {
        th.setAttribute('aria-sort', activeDir === 'asc' ? 'ascending' : 'descending');
        button.classList.add('is-active');
        indicator.textContent = activeDir === 'asc' ? '↑' : '↓';
      } else {
        th.setAttribute('aria-sort', 'none');
        button.classList.remove('is-active');
        indicator.textContent = '↕';
      }
    });
  }

  function renderPath() {
    if (!dom.activePath) return;
    const category = state.category === 'all' ? 'All categories' : getCategoryLabel(state.category);
    const subcategory = state.subcategory === 'all' ? 'All subcategories' : getTagLabel(state.subcategory);
    dom.activePath.textContent = `${category} -> ${subcategory}`;
  }

  function syncSidebarSelections() {
    if (dom.categoryList) {
      dom.categoryList.querySelectorAll('.facet-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.category === state.category);
      });
    }
    if (dom.subcategoryList) {
      dom.subcategoryList.querySelectorAll('.subfacet-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.subcategory === state.subcategory);
      });
    }
  }

  function installHandlers() {
    if (dom.categoryList) {
      dom.categoryList.addEventListener('click', event => {
        const button = event.target.closest('button[data-category]');
        if (!button) return;
        state.category = button.dataset.category;
        const available = getAvailableSubcategories().map(tag => tag.id);
        if (state.subcategory !== 'all' && !available.includes(state.subcategory)) {
          state.subcategory = 'all';
        }
        renderSubcategories();
        syncSidebarSelections();
        writeStateToUrl();
        renderResults();
      });
    }

    if (dom.subcategoryList) {
      dom.subcategoryList.addEventListener('click', event => {
        const button = event.target.closest('button[data-subcategory]');
        if (!button) return;
        state.subcategory = button.dataset.subcategory;
        syncSidebarSelections();
        writeStateToUrl();
        renderResults();
      });
    }

    if (dom.queryInput) {
      dom.queryInput.addEventListener('input', () => {
        state.query = dom.queryInput.value;
        writeStateToUrl();
        renderResults();
      });
    }

    if (dom.tableHead) {
      dom.tableHead.addEventListener('click', event => {
        const button = event.target.closest('.col-sort-btn');
        if (!button) return;

        const th = button.closest('th[data-sort]');
        if (!th) return;

        const sortKey = th.getAttribute('data-sort');
        const [activeKey, activeDir] = state.sort.split('-');

        if (sortKey === activeKey) {
          state.sort = `${sortKey}-${activeDir === 'asc' ? 'desc' : 'asc'}`;
        } else {
          state.sort = `${sortKey}-asc`;
        }

        writeStateToUrl();
        renderResults();
      });
    }

    if (dom.clearFilters) {
      dom.clearFilters.addEventListener('click', () => {
        state.query = '';
        state.category = 'all';
        state.subcategory = 'all';
        state.sort = 'rating-desc';
        if (dom.queryInput) dom.queryInput.value = '';
        renderSubcategories();
        syncSidebarSelections();
        writeStateToUrl();
        renderResults();
      });
    }

    if (dom.viewTableBtn) {
      dom.viewTableBtn.addEventListener('click', () => {
        state.view = 'table';
        writeStateToUrl();
        renderResults();
      });
    }

    if (dom.viewTilesBtn) {
      dom.viewTilesBtn.addEventListener('click', () => {
        state.view = 'tiles';
        writeStateToUrl();
        renderResults();
      });
    }
  }

  function readStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const category = params.get('category');
    const subcategory = params.get('subcategory');
    const sort = params.get('sort');
    const view = params.get('view');

    if (q) state.query = q;
    if (category) state.category = category;
    if (subcategory) state.subcategory = subcategory;
    if (sort && VALID_SORTS.has(sort)) state.sort = sort;
    if (view === 'table' || view === 'tiles') state.view = view;

    if (dom.queryInput) dom.queryInput.value = state.query;
  }

  function writeStateToUrl() {
    const params = new URLSearchParams();
    if (state.query) params.set('q', state.query);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.subcategory !== 'all') params.set('subcategory', state.subcategory);
    if (state.sort && state.sort !== 'rating-desc') params.set('sort', state.sort);
    if (state.view !== 'table') params.set('view', state.view);

    const queryString = params.toString();
    const next = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash || ''}`;
    window.history.replaceState({}, '', next);
  }

  function getTagLabel(tagId) {
    const match = model.tags.find(tag => tag.id === tagId);
    return match ? match.label : startCase(tagId);
  }

  function getCategoryLabel(categoryId) {
    const match = model.categories.find(category => category.id === categoryId);
    return match ? match.label : startCase(categoryId);
  }

  function getPrimarySubcategoryLabel(tags) {
    if (!Array.isArray(tags) || tags.length === 0) return 'Untagged';
    if (state.subcategory !== 'all' && tags.includes(state.subcategory)) {
      return getTagLabel(state.subcategory);
    }
    return getTagLabel(tags[0]);
  }

  function buildTagsFromTools(tools) {
    const ids = new Set();
    tools.forEach(tool => (tool.tags || []).forEach(tag => ids.add(tag)));
    return Array.from(ids).sort().map(id => ({ id, label: startCase(id) }));
  }

  async function loadCatalogData() {
    if (window.location.protocol === 'file:') {
      const embedded = getEmbeddedToolsData();
      if (!embedded) throw new Error('No embedded tools data found for file mode.');
      return embedded;
    }

    const response = await fetch('./tools.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  function getEmbeddedToolsData() {
    const node = document.getElementById('tools-data');
    if (!node) return null;
    try {
      return JSON.parse(node.textContent || '{}');
    } catch (error) {
      console.warn('[tools] Invalid embedded tools data.', error);
      return null;
    }
  }

  async function hydrateGithubStars() {
    const repos = model.tools.map(tool => tool.githubRepo).filter(Boolean);
    if (repos.length === 0 || !window.navigator.onLine || window.location.protocol === 'file:') {
      return;
    }

    const cache = readStarCache();
    const now = Date.now();
    const missing = repos.filter(repo => {
      const entry = cache[repo];
      return !(entry && now - entry.timestamp < STAR_CACHE_TTL_MS);
    });

    if (missing.length > 0) {
      await Promise.allSettled(missing.map(async repo => {
        const resp = await fetch(`https://api.github.com/repos/${repo}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const stars = Number(data.stargazers_count || 0);
        cache[repo] = { stars, timestamp: Date.now() };
      }));
      writeStarCache(cache);
    }

    model.tools.forEach(tool => {
      if (!tool.githubRepo || !cache[tool.githubRepo]) return;
      const stars = Number(cache[tool.githubRepo].stars || 0);
      tool.rating.stars = stars;
      if (stars > 0) {
        const normalized = clamp(3 + Math.log10(stars + 1), 0, 5);
        tool.rating.value = Math.max(tool.rating.value, Number(normalized.toFixed(1)));
        tool.rating.source = 'github-stars';
      }
    });

    renderResults();
  }

  function readStarCache() {
    try {
      const raw = localStorage.getItem(STAR_CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function writeStarCache(cache) {
    try {
      localStorage.setItem(STAR_CACHE_KEY, JSON.stringify(cache));
    } catch (_) {
      // Ignore quota/storage errors.
    }
  }

  async function initializeCatalog() {
    showSkeletonRows(6);
    setStatus('Loading tools...');

    try {
      let raw;
      try {
        raw = await loadCatalogData();
      } catch (error) {
        const embedded = getEmbeddedToolsData();
        if (!embedded) throw error;
        raw = embedded;
      }

      const normalized = normalizeData(raw);
      model.categories = normalized.categories;
      model.tags = normalized.tags;
      model.tools = normalized.tools;

      renderSidebar();
      readStateFromUrl();
      renderSubcategories();
      if (state.subcategory !== 'all') {
        const available = getAvailableSubcategories().map(tag => tag.id);
        if (!available.includes(state.subcategory)) state.subcategory = 'all';
      }
      syncSidebarSelections();
      installHandlers();
      renderResults();
      setStatus('');

      hydrateGithubStars().catch(error => {
        console.warn('[tools] GitHub star hydration failed.', error);
      });
    } catch (error) {
      console.error('[tools] Failed to initialize catalog.', error);
      setStatus('Could not load tools. Please refresh or try hosting over http/https.', true);
      if (dom.tableBody) {
        dom.tableBody.innerHTML = '<tr><td colspan="7" class="table-empty tools-error">Could not load tools.</td></tr>';
      }
    }
  }

  function sanitizeURL(url) {
    try {
      const parsed = new URL(url, window.location.href);
      if (['http:', 'https:'].includes(parsed.protocol)) return url;
    } catch (_) {
      if (/^[/#]/.test(url)) return url;
    }
    return '#';
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'tool';
  }

  function startCase(value) {
    return String(value)
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatRating(rating) {
    const value = Number.isFinite(rating.value) ? rating.value.toFixed(1) : '0.0';
    const count = Number.isFinite(rating.count) ? rating.count : 0;
    return `${value}/5 (${count})`;
  }

  function formatCompact(value) {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return String(value);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCatalog);
  } else {
    initializeCatalog();
  }

  if ('serviceWorker' in navigator && window.isSecureContext && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.info('[sw] Registered, scope:', reg.scope))
        .catch(err => console.warn('[sw] Registration failed:', err));
    });
  }
})();
