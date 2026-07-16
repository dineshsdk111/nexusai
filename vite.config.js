import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-cors-proxy',
      configureServer(server) {
        server.middlewares.use('/api/proxy', async (req, res) => {
          // Parse the target URL from the query string
          const urlStr = req.url.split('?url=')[1];
          if (!urlStr) {
            res.statusCode = 400;
            return res.end('Missing url parameter');
          }
          const targetUrl = decodeURIComponent(urlStr);
          try {
            // Fetch the target URL from Node.js (bypasses browser CORS)
            const fetchRes = await fetch(targetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
              }
            });
            const text = await fetchRes.text();
            res.setHeader('Content-Type', 'text/plain');
            res.end(text);
          } catch (e) {
            res.statusCode = 500;
            res.end(e.message);
          }
        });
      }
    }
  ],
})
