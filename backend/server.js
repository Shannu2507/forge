const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Forge's AI builder. Given a user's description, generate a single complete self-contained HTML file.

Rules:
- Output ONLY raw HTML. No markdown, no backticks, no explanation.
- Start with <!DOCTYPE html> and end with </html>
- Use Tailwind CSS via CDN for styling
- Use vanilla JS only (no external JS frameworks)
- Make it beautiful, modern, and fully functional
- Include realistic sample data
- Make it mobile responsive
- For games: make them fully playable
- For dashboards: include charts using Chart.js via CDN
- For landing pages: include hero, features, CTA sections
- For AI agents: build a working chat UI that clearly shows the agent's purpose
- The output must be 100% self-contained — all CSS and JS inline

Type hints and what to build:
- App → interactive web application
- Website → multi-section landing page  
- Game → fully playable browser game
- AI agent → chat interface with agent persona
- Dashboard → data dashboard with charts/tables
- API → show an API docs / tester UI`;

app.post('/api/build', async (req, res) => {
  const { prompt, type } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const fullPrompt = `Build type: ${type || 'App'}\n\nUser request: ${prompt}`;

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: fullPrompt }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Forge backend running on http://localhost:${PORT}`));
