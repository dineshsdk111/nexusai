export async function executeMultiSearch(queries) {
  if (!queries || queries.length === 0) return '';

  console.log(`[NexusAI Search] Executing Tavily web searches for:`, queries);

  const resultsPromises = queries.map(query => searchWithTavily(query));
  const allResults = await Promise.all(resultsPromises);

  const validResults = allResults.filter(res => res && res.trim().length > 0);

  if (validResults.length === 0) {
    console.warn('[NexusAI Search] No search results from Tavily API.');
    return '';
  }

  const context = `[LIVE WEB SEARCH RESULTS]:\n\n${validResults.join('\n\n---\n\n')}`;
  console.log(`[NexusAI Search] Final context assembled: ${context.length} characters`);
  return context;
}

async function searchWithTavily(query) {
  try {
    const response = await fetch('/api/tavily-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, count: 5 }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const err = await response.json();
      console.warn(`[NexusAI Search] Tavily API error for "${query}":`, err.error);
      return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.warn(`[NexusAI Search] No results from Tavily for "${query}"`);
      return null;
    }

    let output = `Results for query: "${query}"\n`;

    for (const result of data.results) {
      output += `\n--- Source: ${result.title} (${result.url}) ---\n${result.content}`;
      if (output.length > 30000) break;
    }

    return output;
  } catch (e) {
    console.warn(`[NexusAI Search] Failed for "${query}":`, e.message);
    return null;
  }
}
