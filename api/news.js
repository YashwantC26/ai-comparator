module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json([]);
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return res.status(200).json([]);
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: 'AI model release GPT Claude Gemini 2026',
        search_depth: 'basic',
        max_results: 8,
        days: 30,
      }),
    });

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];

    const articles = results.map((item) => ({
      title: item.title || '',
      url: item.url || '',
      source: item.url ? new URL(item.url).hostname.replace(/^www\./, '') : '',
      date: item.published_date || '',
      snippet: item.content || item.snippet || '',
    }));

    return res.status(200).json(articles);
  } catch {
    return res.status(200).json([]);
  }
};
