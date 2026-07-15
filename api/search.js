/**
 * Vercel Serverless Function — Free Web Search Proxy
 *
 * Strategy: Try multiple public SearXNG instances (open-source meta-search engines
 * that aggregate Google/Bing/DDG). They expose a free JSON API and work from
 * cloud server IPs. Falls back to DuckDuckGo Instant Answer API.
 *
 * No API key required. Completely free.
 */

// Public SearXNG instances with JSON API enabled
const SEARX_INSTANCES = [
  'https://searx.be',
  'https://paulgo.io',
  'https://search.mdosch.de',
  'https://searxng.site',
  'https://searx.tiekoetter.com'
];

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function trySearXNG(query) {
  for (const instance of SEARX_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&language=en-US&categories=general`;
      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      }, 5000);

      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) continue;

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        return {
          source: instance,
          results: data.results.slice(0, 6).map(r => ({
            title: r.title || '',
            snippet: r.content || '',
            url: r.url || ''
          }))
        };
      }
    } catch (_) {
      // Try next instance
      continue;
    }
  }
  return null;
}

async function tryDDGInstantAnswer(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'NexusAI/1.0 (educational chatbot)' }
    }, 4000);

    if (!response.ok) return null;
    const data = await response.json();

    const parts = [];
    if (data.Answer) parts.push({ title: 'Direct Answer', snippet: data.Answer, url: '' });
    if (data.AbstractText) parts.push({ title: data.AbstractSource || 'Summary', snippet: data.AbstractText, url: data.AbstractURL || '' });
    if (data.Definition) parts.push({ title: data.DefinitionSource || 'Definition', snippet: data.Definition, url: '' });

    return parts.length > 0 ? { source: 'DuckDuckGo', results: parts } : null;
  } catch (_) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q?.trim()) {
    return res.status(400).json({ error: 'Missing query', results: [] });
  }

  // Try SearXNG first (real web results), fall back to DDG Instant Answer
  let searchData = await trySearXNG(q);

  if (!searchData) {
    searchData = await tryDDGInstantAnswer(q);
  }

  if (!searchData) {
    return res.status(200).json({ query: q, results: [], message: 'No results found' });
  }

  return res.status(200).json({
    query: q,
    source: searchData.source,
    results: searchData.results
  });
}
