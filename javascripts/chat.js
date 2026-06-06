const conversationHistory = [];

async function sendMessage(userText) {
  conversationHistory.push({ role: 'user', content: userText });

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: conversationHistory }),
  });

  if (!response.ok) {
    throw new Error(response.status === 429 ? 'Rate limit exceeded. Try again later.' : 'Something went wrong.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  const responseEl = document.getElementById('chat-response');
  const linksEl = document.getElementById('chat-links');
  responseEl.textContent = '';
  linksEl.innerHTML = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });

    const { text, links } = parseLinks(fullText);
    responseEl.textContent = text;
    renderLinks(links, linksEl);
  }

  conversationHistory.push({ role: 'assistant', content: fullText });
}

function parseLinks(text) {
  const lines = text.split('\n');
  const links = [];
  const cleanLines = [];

  for (const line of lines) {
    if (line.startsWith('LINK:')) {
      const [title, url] = line.replace('LINK:', '').split('|').map(s => s.trim());
      if (title && url) links.push({ title, url });
    } else {
      cleanLines.push(line);
    }
  }

  return { text: cleanLines.join('\n').trim(), links };
}

function renderLinks(links, container) {
  container.innerHTML = links
    .map(l => `<a href="${l.url}">${l.title}</a>`)
    .join('');
}

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const responseEl = document.getElementById('chat-response');
  if (!form || !input || !responseEl) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.disabled = true;

    try {
      await sendMessage(text);
    } catch (err) {
      responseEl.textContent = err.message || 'Something went wrong.';
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
});
