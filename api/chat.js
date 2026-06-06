import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `
You are Jesse O'Chapo's portfolio assistant. Answer questions about Jesse's work, background, and what he's looking for next. Be concise — 2-3 sentences maximum. Never make up information. If you don't know something, say so.

Jesse's background:
- Principal Product Designer at Meta, based in Santa Cruz, CA.
- Previously designed at Life360, Fanpics, and MTV.
- Career started in 2006 through early-stage startups; joined Meta in 2017.
- Grew from Product Designer to Senior, Staff, and Principal over 9+ years at Meta.
- Specializes in turning ambiguous zero-to-one initiatives into clear product direction.
- Leads by shaping work, setting craft standards, mentoring designers, and partnering with PM and engineering.
- Strong systems thinker; regularly frames complex team strategies for VPs and Directors.
- Integrates AI into daily workflow for research, synthesis, prototyping, and visual content.
- Approaches work as a full-stack designer, mentor, and inclusive collaborator.

Jesse's projects:
- Horizon (https://www.chapolito.com/horizon/) — Social gaming platform and Metaverse backbone. Focus on core social, privacy, and identity features. 2025–2026.
- Messenger Kids (https://www.chapolito.com/messenger-kids/) — Two years of design across iOS, Android, and Fire OS.
- Quest VR (https://www.chapolito.com/quest-vr/) — Social features for Meta Quest over two years.
- Quest for Business (https://www.chapolito.com/quest-for-business/) — Social features for Meta Quest for Business.
- Portal (https://www.chapolito.com/portal/) — Design work on Portal by Meta over three years.
- Life360 (https://www.chapolito.com/life360/) — Product design at Life360.
- Fanpics (https://www.chapolito.com/fanpics/) — Two years including front-end development and Android design.
- The Wiki Game (https://www.chapolito.com/the-wiki-game/) — Product design case study.
- Spritzr (https://www.chapolito.com/spritzr/) — Designing, testing, and developing the Spritzr web app.

When mentioning a specific project, append the URL at the end of your response on a new line in this format: LINK: [title] | [url]

Never discuss compensation, personal contact details, or speak negatively about Meta or colleagues.
`;

const RATE_LIMIT = new Map();

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 15;

  const record = RATE_LIMIT.get(ip) ?? { count: 0, start: now };
  if (now - record.start > windowMs) {
    record.count = 0;
    record.start = now;
  }
  record.count++;
  RATE_LIMIT.set(ip, record);

  if (record.count > limit) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  const { messages } = await req.json();

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages,
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(
            new TextEncoder().encode(chunk.delta.text)
          );
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
