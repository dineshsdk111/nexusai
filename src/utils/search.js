/**
 * Web Search Utility — Pure Frontend Implementation
 * 
 * Executes multiple search queries using a CORS proxy and free search APIs (DuckDuckGo & Wikipedia)
 */

export async function executeMultiSearch(queries) {
  if (!queries || queries.length === 0) return '';
  
  console.log(`[NexusAI Search] 🔍 Executing web searches for:`, queries);
  
  const resultsPromises = queries.map(query => searchSingleQuery(query));
  const allResults = await Promise.all(resultsPromises);
  
  // Flatten and filter empty results
  const validResults = allResults.filter(res => res && res.trim().length > 0);
  
  if (validResults.length === 0) {
    console.warn('[NexusAI Search] 🚨 No search results from any query! Gemini will use training data.');
    return '';
  }

  const context = `[LIVE WEB SEARCH RESULTS]:\n\n${validResults.join('\n\n---\n\n')}`;
  console.log(`[NexusAI Search] ✅ Final context assembled: ${context.length} characters`);
  return context;
}

async function searchSingleQuery(query) {
  let queryParts = [];
  
  // Layer 1: DuckDuckGo HTML Search via CORS proxy + Deep Scrape
  try {
    const ddgContext = await searchDuckDuckGo(query);
    if (ddgContext) {
      queryParts.push(ddgContext);
    }
  } catch (err) {
    console.warn(`[NexusAI Search] ❌ DuckDuckGo error for "${query}":`, err.message);
  }

  if (queryParts.length === 0) return null;
  return `Results for query: "${query}"\n` + queryParts.join('\n\n');
}

const SEARX_INSTANCES = [
  'https://searx.be',
  'https://paulgo.io',
  'https://search.mdosch.de',
  'https://searxng.site',
  'https://searx.tiekoetter.com'
];

async function searchDuckDuckGo(query) {
  let links = [];

  // Try SearXNG instances first (reliable JSON API, less likely to block Vercel)
  for (const instance of SEARX_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&language=en-US`;
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
      
      if (!response.ok) continue;
      
      const text = await response.text();
      const data = JSON.parse(text);
      if (data.results && data.results.length > 0) {
        links = data.results.slice(0, 3).map(r => ({ url: r.url, title: r.title }));
        break; // Successfully got links
      }
    } catch(e) {
      // Continue to next instance
    }
  }

  // Fallback to DuckDuckGo HTML if SearXNG instances fail
  if (links.length === 0) {
    try {
      const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const html = await response.text();
        const domParser = new DOMParser();
        const doc = domParser.parseFromString(html, 'text/html');
        const resultNodes = doc.querySelectorAll('.result__body');
        
        resultNodes.forEach((node, index) => {
          if (index >= 3) return; // Keep top 3 links per query
          const titleNode = node.querySelector('.result__title .result__a');
          if (titleNode) {
            const title = titleNode.textContent.trim();
            const rawUrl = titleNode.getAttribute('href');
            let cleanUrl = rawUrl;
            if (rawUrl) {
              const decodedUrlMatch = rawUrl.match(/uddg=([^&]+)/);
              cleanUrl = decodedUrlMatch ? decodeURIComponent(decodedUrlMatch[1]) : rawUrl;
            }
            if (cleanUrl) links.push({ url: cleanUrl, title });
          }
        });
      }
    } catch(e) {}
  }

  if (links.length === 0) return '';

  const fetchPromises = links.map(l => scrapeWebpage(l.url, l.title));
  const scrapedResults = await Promise.all(fetchPromises);
  const validScrapes = scrapedResults.filter(r => r !== null);

  if (validScrapes.length > 0) {
    return `Top Scraped Web Pages for "${query}":\n${validScrapes.join('\n\n')}`;
  }
  return '';
}

async function scrapeWebpage(url, title) {
  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    
    const html = await res.text();
    if (!html) return null;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove noisy elements
    doc.querySelectorAll('script, style, nav, footer, header, aside').forEach(el => el.remove());
    
    let text = doc.body ? doc.body.innerText : '';
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Truncate to ~25000 chars to take advantage of Gemini's large context window
    if (text.length > 25000) {
      text = text.substring(0, 25000) + '...';
    }
    
    if (text.length < 50) return null; // Ignore mostly empty pages

    return `--- Source: ${title} (${url}) ---\n${text}`;
  } catch (e) {
    console.warn(`[NexusAI Search] Failed to scrape ${url}`, e.message);
    return null;
  }
}


