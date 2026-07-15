/**
 * Vercel Serverless Function — DuckDuckGo Instant Answer Proxy
 * Bypasses CORS by calling DuckDuckGo from the server side.
 * No API key required. Completely free.
 */
export default async function handler(req, res) {
  // Allow CORS from any origin (safe because there's no secret here)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Missing query parameter: q' });
  }

  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NexusAI-Chatbot/1.0 (educational project)'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'DuckDuckGo API error', status: response.status });
    }

    const data = await response.json();

    // Extract the most useful parts into a clean structure
    const result = {
      abstract: data.AbstractText || '',
      abstractSource: data.AbstractSource || '',
      abstractUrl: data.AbstractURL || '',
      answer: data.Answer || '',
      answerType: data.AnswerType || '',
      definition: data.Definition || '',
      definitionSource: data.DefinitionSource || '',
      relatedTopics: (data.RelatedTopics || [])
        .filter(t => t.Text && t.FirstURL)
        .slice(0, 5)
        .map(t => ({ text: t.Text, url: t.FirstURL })),
      results: (data.Results || [])
        .slice(0, 3)
        .map(r => ({ title: r.Text, url: r.FirstURL }))
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('DuckDuckGo proxy error:', error);
    return res.status(500).json({ error: 'Failed to fetch search results' });
  }
}
