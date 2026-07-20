export async function POST(request) {
  try {
    const { query, count = 5 } = await request.json();

    if (!query) {
      return Response.json({ error: 'Missing query parameter' }, { status: 400 });
    }

    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      return Response.json({ error: 'TAVILY_API_KEY environment variable is not set.' }, { status: 500 });
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: count,
        include_answer: false,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ error: `Tavily API error (${response.status}): ${errorText}` }, { status: response.status });
    }

    const data = await response.json();

    const results = (data.results || []).map((r) => ({
      title: r.title || '',
      url: r.url || '',
      content: r.content || '',
      score: r.score || 0,
    }));

    return Response.json({ results });
  } catch (error) {
    console.error('Tavily Search API Route Error:', error);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
