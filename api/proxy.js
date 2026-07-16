export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const targetUrl = decodeURIComponent(url);
    
    // Fetch the target URL from Vercel's backend (bypasses browser CORS)
    const fetchRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });

    const text = await fetchRes.text();
    
    // Return raw text
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(text);
    
  } catch (error) {
    console.error('Vercel Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
