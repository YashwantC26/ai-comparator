const { applyMiddleware, withTimeout, REQUEST_TIMEOUT_MS } = require('./middleware');

const VALID = new Set(['coding', 'writing', 'analysis', 'multimodal', 'speed', 'budget', 'default']);

module.exports = async function handler(req, res) {
  if (!applyMiddleware(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ taskType: 'default' });
  }

  const { task } = req.body || {};
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!task || !apiKey) {
    return res.status(200).json({ taskType: 'default' });
  }

  try {
    const upstream = await withTimeout(
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{
            role: 'user',
            content: `Classify this task into exactly one of these categories: coding, writing, analysis, multimodal, speed, budget, default.\n\nTask: "${String(task).slice(0, 500)}"\n\nReply with only the single category word, nothing else.`,
          }],
        }),
      }),
      REQUEST_TIMEOUT_MS
    );

    if (!upstream.ok) {
      return res.status(200).json({ taskType: 'default' });
    }

    const data = await upstream.json();
    const raw = (data.content?.[0]?.text ?? '').trim().toLowerCase().replace(/[^a-z]/g, '');
    return res.status(200).json({ taskType: VALID.has(raw) ? raw : 'default' });
  } catch (err) {
    if (err.message === 'REQUEST_TIMEOUT') {
      return res.status(504).json({ taskType: 'default' });
    }
    return res.status(200).json({ taskType: 'default' });
  }
};
