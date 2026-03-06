export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { task, models } = req.body;

  if (!task || !Array.isArray(models) || models.length === 0) {
    return res.status(400).json({ error: 'Invalid request: task and models are required' });
  }

  const selectedModels = models.slice(0, 3);

  const MODEL_CONFIG = {
    sonnet46: {
      provider: 'anthropic',
      modelString: 'claude-sonnet-4-6',
    },
    haiku35: {
      provider: 'anthropic',
      modelString: 'claude-haiku-4-5-20251001',
    },
    gpt4o: {
      provider: 'openai',
      modelString: 'gpt-4o-2024-11-20',
    },
    gpt4omini: {
      provider: 'openai',
      modelString: 'gpt-4o-mini-2024-07-18',
    },
    gemini15pro: {
      provider: 'google',
      modelString: 'gemini-1.5-pro-002',
    },
    gemini20flash: {
      provider: 'google',
      modelString: 'gemini-2.0-flash',
    },
  };

  async function callAnthropic(modelString, task) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('API key not configured');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: modelString,
        max_tokens: 300,
        messages: [{ role: 'user', content: task }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text ?? null;
  }

  async function callOpenAI(modelString, task) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('API key not configured');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: modelString,
        max_tokens: 300,
        messages: [{ role: 'user', content: task }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? null;
  }

  async function callGoogle(modelString, task) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('API key not configured');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelString}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: task }] }],
        generationConfig: { maxOutputTokens: 300 },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }

  async function callModel(modelId) {
    const config = MODEL_CONFIG[modelId];
    if (!config) {
      return { modelId, output: null, error: 'Unknown model ID' };
    }

    try {
      let output;
      if (config.provider === 'anthropic') {
        output = await callAnthropic(config.modelString, task);
      } else if (config.provider === 'openai') {
        output = await callOpenAI(config.modelString, task);
      } else if (config.provider === 'google') {
        output = await callGoogle(config.modelString, task);
      }
      return { modelId, output, error: null };
    } catch (err) {
      const message = err.message || 'Unknown error';
      const isKeyError =
        message.includes('API key not configured') ||
        message.includes('credits') ||
        message.includes('quota') ||
        message.includes('401') ||
        message.includes('403');
      return {
        modelId,
        output: null,
        error: isKeyError ? 'API key not configured' : message,
      };
    }
  }

  const settled = await Promise.allSettled(selectedModels.map(callModel));

  const results = settled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return { modelId: selectedModels[i], output: null, error: result.reason?.message || 'Unknown error' };
  });

  return res.status(200).json(results);
}
