/**
 * Web Search Utility — Two-layer approach:
 *
 * Layer 1: Wikipedia REST API (CORS-friendly, works locally & on Vercel)
 *   - Called directly from the browser, no proxy needed
 *   - Free, no API key, returns real up-to-date factual summaries
 *
 * Layer 2: /api/search proxy (only runs on Vercel, skipped locally)
 *   - Calls DuckDuckGo HTML search via a serverless function
 *   - Returns real web results (titles, snippets, URLs)
 */

/**
 * Main search function — combines Wikipedia + DuckDuckGo results.
 * @param {string} query - The user's message
 * @returns {Promise<string>} - Formatted context string for Gemini
 */
export async function searchDuckDuckGo(query) {
  const parts = [];

  // --- Layer 1: Wikipedia API (browser-side, CORS-enabled, works everywhere) ---
  try {
    const wikiContext = await searchWikipedia(query);
    if (wikiContext) parts.push(wikiContext);
  } catch (_) {
    // Fail silently
  }

  // --- Layer 2: DuckDuckGo HTML via /api/search proxy (Vercel only) ---
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(5000) // 5s timeout
    });

    const contentType = response.headers.get('content-type') || '';

    // Only parse if the response is actually JSON (avoids local dev static file issue)
    if (response.ok && contentType.includes('application/json')) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const formatted = data.results
          .slice(0, 5)
          .filter(r => r.title)
          .map(r => {
            let entry = `• ${r.title}`;
            if (r.snippet) entry += `\n  ${r.snippet}`;
            if (r.url) entry += `\n  Source: ${r.url}`;
            return entry;
          })
          .join('\n\n');

        if (formatted) {
          parts.push(`DuckDuckGo Web Results:\n${formatted}`);
        }
      }
    }
  } catch (_) {
    // Fail silently — expected in local dev (Vite doesn't run serverless functions)
  }

  if (parts.length === 0) return '';

  return `[WEB SEARCH RESULTS for "${query}"]:\n\n${parts.join('\n\n---\n\n')}`;
}

/**
 * Wikipedia search — called directly from the browser.
 * Wikipedia's API supports CORS via ?origin=* — no proxy needed.
 */
async function searchWikipedia(query) {
  // Step 1: Search for matching Wikipedia articles
  const searchUrl =
    `https://en.wikipedia.org/w/api.php?action=query&list=search` +
    `&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=2`;

  const searchResponse = await fetch(searchUrl, {
    signal: AbortSignal.timeout(4000)
  });

  if (!searchResponse.ok) return '';

  const searchData = await searchResponse.json();
  const searchResults = searchData?.query?.search;

  if (!searchResults || searchResults.length === 0) return '';

  const topTitle = searchResults[0].title;

  // Step 2: Get the full summary for the top result
  const summaryUrl =
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`;

  const summaryResponse = await fetch(summaryUrl, {
    signal: AbortSignal.timeout(4000)
  });

  if (!summaryResponse.ok) return '';

  const summary = await summaryResponse.json();

  if (!summary.extract) return '';

  const extract = summary.extract.length > 600
    ? summary.extract.slice(0, 600) + '...'
    : summary.extract;

  const sourceUrl = summary.content_urls?.desktop?.page || '';

  return `Wikipedia — ${topTitle}:\n${extract}${sourceUrl ? `\nSource: ${sourceUrl}` : ''}`;
}
