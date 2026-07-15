/**
 * Frontend utility to call the DuckDuckGo search proxy.
 * Calls /api/search (Vercel serverless function) to avoid CORS issues.
 */

/**
 * Search DuckDuckGo via the serverless proxy.
 * @param {string} query - The search query
 * @returns {Promise<string>} - A formatted string of search context to inject into the Gemini prompt
 */
export async function searchDuckDuckGo(query) {
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      console.warn('Web search returned non-200 status:', response.status);
      return '';
    }

    const data = await response.json();

    // Build a concise context string from what DuckDuckGo returned
    const parts = [];

    if (data.answer) {
      parts.push(`Direct Answer: ${data.answer}`);
    }

    if (data.abstract) {
      parts.push(`Summary (${data.abstractSource || 'DuckDuckGo'}): ${data.abstract}`);
      if (data.abstractUrl) {
        parts.push(`Source: ${data.abstractUrl}`);
      }
    }

    if (data.definition) {
      parts.push(`Definition (${data.definitionSource || 'DuckDuckGo'}): ${data.definition}`);
    }

    if (data.relatedTopics && data.relatedTopics.length > 0) {
      const topics = data.relatedTopics
        .slice(0, 3)
        .map(t => `- ${t.text}`)
        .join('\n');
      parts.push(`Related Information:\n${topics}`);
    }

    if (data.results && data.results.length > 0) {
      const results = data.results
        .map(r => `- ${r.title}`)
        .join('\n');
      parts.push(`Top Results:\n${results}`);
    }

    if (parts.length === 0) {
      return ''; // No useful results found
    }

    return `[WEB SEARCH RESULTS for "${query}"]:\n${parts.join('\n\n')}`;
  } catch (error) {
    console.warn('Web search failed (non-critical):', error);
    return ''; // Fail silently — Gemini still answers without search context
  }
}
