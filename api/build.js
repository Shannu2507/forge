import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are Forge's AI builder. Given a user's description, generate a single complete self-contained HTML file.

Rules:
- Output ONLY raw HTML. No markdown, no backticks, no explanation.
- Start with <!DOCTYPE html> and end with </html>
- Use Tailwind CSS via CDN for styling
- Use vanilla JS only (no external JS frameworks)
- Make it beautiful, modern, and fully functional
- Include realistic sample data
- Make it mobile responsive
- For games: make them fully playable. For 3D games use Three.js via CDN
- For dashboards: include charts using Chart.js via CDN
- For landing pages: include hero, features, CTA sections
- For AI agents: build a working chat UI that clearly shows the agent's purpose
- The output must be 100% self-contained — all CSS and JS inline

Type hints and what to build:
- App → interactive web application
- Website → multi-section landing page
- Game → fully playable browser game (use Three.js for 3D games)
- AI agent → chat interface with agent persona
- Dashboard → data dashboard with charts/tables
- API → show an API docs / tester UI`;

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { prompt, type } = await req.json();
  if (!prompt) return new Response('Prompt required', { status: 400 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const fullPrompt = `Build type: ${type || 'App'}\n\nUser request: ${prompt}`;

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: fullPrompt }],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
