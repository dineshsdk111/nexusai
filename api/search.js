/**
 * Vercel Serverless Function — DuckDuckGo HTML Search Proxy
 * Scrapes real web search results from DuckDuckGo HTML endpoint.
 * No API key required. Completely free.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q?.trim()) {
    return res.status(400).json({ error: 'Missing query parameter: q', results: [] });
  }

  try {
    // Call DuckDuckGo HTML search — real web results, no API key needed
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'DuckDuckGo unavailable', results: [] });
    }

    const html = await response.text();

    // Extract titles
    const titles = [];
    const titleRegex = /<a[^>]+class="result__a"[^>]*>([^<]+)<\/a>/g;
    let m;
    while ((m = titleRegex.exec(html)) !== null) {
      titles.push(m[1].trim());
    }

    // Extract snippets (clean HTML tags)
    const snippets = [];
    const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    while ((m = snippetRegex.exec(html)) !== null) {
      snippets.push(m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
    }

    // Extract display URLs
    const urls = [];
    const urlRegex = /<span class="result__url">([^<]+)<\/span>/g;
    while ((m = urlRegex.exec(html)) !== null) {
      urls.push(m[1].trim());
    }

    const results = [];
    const count = Math.min(5, titles.length);
    for (let i = 0; i < count; i++) {
      results.push({
        title: titles[i] || '',
        snippet: snippets[i] || '',
        url: urls[i] || ''
      });
    }

    return res.status(200).json({ query: q, results });
  } catch (error) {
    console.error('Search proxy error:', error);
    return res.status(500).json({ error: 'Search failed', results: [] });
  }
}
