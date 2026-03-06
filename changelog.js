/**
 * changelog.js — AI news feed module
 * Call initChangelog(containerId) to render into an existing element.
 */

const STYLES = `
  .cl-section {
    margin: 2rem 0;
    font-family: inherit;
  }
  .cl-heading {
    font-size: 1rem;
    font-weight: 600;
    color: #a78bfa;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 1rem;
  }
  .cl-scroll {
    display: flex;
    gap: 1rem;
    overflow-x: auto;
    padding-bottom: 0.75rem;
    scrollbar-width: thin;
    scrollbar-color: #1e2a4a transparent;
  }
  .cl-scroll::-webkit-scrollbar {
    height: 4px;
  }
  .cl-scroll::-webkit-scrollbar-thumb {
    background: #1e2a4a;
    border-radius: 2px;
  }
  .cl-card {
    flex: 0 0 260px;
    background: #0d1526;
    border: 1px solid #1e2a4a;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: border-color 0.2s;
  }
  .cl-card:hover {
    border-color: #3b4f7a;
  }
  .cl-card-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .cl-source {
    font-size: 0.7rem;
    font-weight: 600;
    color: #60a5fa;
    background: rgba(96,165,250,0.12);
    border-radius: 4px;
    padding: 0.15rem 0.45rem;
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }
  .cl-date {
    font-size: 0.7rem;
    color: #4a5568;
  }
  .cl-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #e2e8f0;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .cl-snippet {
    font-size: 0.75rem;
    color: #718096;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    flex: 1;
  }
  .cl-link {
    font-size: 0.75rem;
    color: #a78bfa;
    text-decoration: none;
    margin-top: auto;
    align-self: flex-start;
  }
  .cl-link:hover {
    text-decoration: underline;
  }
  /* Skeleton */
  .cl-skeleton {
    background: linear-gradient(90deg, #0d1526 25%, #111d35 50%, #0d1526 75%);
    background-size: 200% 100%;
    animation: cl-shimmer 1.4s infinite;
    border-radius: 6px;
  }
  @keyframes cl-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .cl-skel-source { height: 14px; width: 70px; }
  .cl-skel-title  { height: 14px; width: 100%; margin-top: 2px; }
  .cl-skel-title2 { height: 14px; width: 80%; }
  .cl-skel-line   { height: 11px; width: 100%; }
  .cl-skel-line2  { height: 11px; width: 90%; }
  .cl-empty {
    font-size: 0.8rem;
    color: #4a5568;
    padding: 1rem 0;
  }
`;

function injectStyles() {
  if (document.getElementById('cl-styles')) return;
  const style = document.createElement('style');
  style.id = 'cl-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function skeletonCard() {
  return `
    <div class="cl-card">
      <div class="cl-card-meta">
        <div class="cl-skeleton cl-skel-source"></div>
      </div>
      <div class="cl-skeleton cl-skel-title"></div>
      <div class="cl-skeleton cl-skel-title2"></div>
      <div class="cl-skeleton cl-skel-line" style="margin-top:4px"></div>
      <div class="cl-skeleton cl-skel-line2"></div>
    </div>
  `;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function articleCard(article) {
  const title = article.title ? escHtml(article.title) : 'Untitled';
  const source = article.source ? escHtml(article.source) : '';
  const date = formatDate(article.date);
  const snippet = article.snippet ? escHtml(article.snippet) : '';
  const url = article.url || '#';

  return `
    <div class="cl-card">
      <div class="cl-card-meta">
        ${source ? `<span class="cl-source" title="${source}">${source}</span>` : ''}
        ${date ? `<span class="cl-date">${date}</span>` : ''}
      </div>
      <div class="cl-title">${title}</div>
      ${snippet ? `<div class="cl-snippet">${snippet}</div>` : ''}
      <a class="cl-link" href="${url}" target="_blank" rel="noopener noreferrer">Read more &rarr;</a>
    </div>
  `;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function initChangelog(containerId) {
  injectStyles();

  const container = document.getElementById(containerId);
  if (!container) return;

  // Render skeleton
  container.innerHTML = `
    <div class="cl-section">
      <div class="cl-heading">Recent AI News</div>
      <div class="cl-scroll" id="cl-scroll-inner">
        ${skeletonCard()}${skeletonCard()}${skeletonCard()}
      </div>
    </div>
  `;

  fetch('/api/news')
    .then((r) => r.ok ? r.json() : [])
    .catch(() => [])
    .then((articles) => {
      const scroll = document.getElementById('cl-scroll-inner');
      if (!scroll) return;

      if (!Array.isArray(articles) || articles.length === 0) {
        scroll.innerHTML = '<div class="cl-empty">No recent news available.</div>';
        return;
      }

      scroll.innerHTML = articles.map(articleCard).join('');
    });
}
