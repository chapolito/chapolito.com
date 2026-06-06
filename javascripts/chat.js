const conversationHistory = [];
let activeExchange = null;

function createExchange(questionText) {
  var thread = document.getElementById('chat-thread');
  if (!thread) return null;

  var article = document.createElement('article');
  article.className = 'portfolio-chat__exchange';

  var answerEl = document.createElement('div');
  answerEl.className = 'portfolio-chat__answer';
  answerEl.setAttribute('aria-live', 'polite');

  var linksEl = document.createElement('div');
  linksEl.className = 'portfolio-chat__links';

  var questionEl = document.createElement('div');
  questionEl.className = 'portfolio-chat__question';
  questionEl.textContent = questionText;

  article.appendChild(questionEl);
  article.appendChild(answerEl);
  article.appendChild(linksEl);
  thread.appendChild(article);

  return { article: article, answerEl: answerEl, linksEl: linksEl, questionEl: questionEl };
}

function splitWordIntoSubtokens(word) {
  var apostrophe = word.indexOf("'");
  if (apostrophe > 0 && apostrophe < word.length - 1) {
    return [word.slice(0, apostrophe), word.slice(apostrophe)];
  }

  if (word.length <= 4) {
    return [word];
  }

  var parts = [];
  var pos = 0;

  while (pos < word.length) {
    var remaining = word.length - pos;
    var take = remaining <= 4 ? remaining : (pos === 0 ? 3 + (remaining % 2) : Math.min(4, remaining));
    parts.push(word.slice(pos, pos + take));
    pos += take;
  }

  return parts;
}

function tokenizeSegment(text, bold) {
  var chunks = [];
  var i = 0;
  var forceLeadingSpace = text.charAt(0) === ' ';

  if (forceLeadingSpace) {
    i = 1;
  }

  while (i < text.length) {
    if (text[i] === ' ') {
      i++;
      continue;
    }

    if (/[,.?!]/.test(text[i])) {
      chunks.push({ text: text[i], bold: bold });
      i++;
      continue;
    }

    var start = i;
    while (i < text.length && !/[\s,.?!]/.test(text[i])) {
      i++;
    }

    var subwords = splitWordIntoSubtokens(text.slice(start, i));
    for (var s = 0; s < subwords.length; s++) {
      var piece = subwords[s];
      if (s === 0 && (chunks.length > 0 || forceLeadingSpace)) {
        piece = ' ' + piece;
        forceLeadingSpace = false;
      }
      chunks.push({ text: piece, bold: bold });
    }
  }

  return chunks;
}

var INTRO_CHUNKS = tokenizeSegment(
  "Hi, I'm Jesse. After 20 years designing consumer products, including nine at Meta, I'm sidestepping to focus on consumer AI. ",
  false
).concat(tokenizeSegment(' Would you like to interview me?', true));

function persistIntroInThread() {
  var introEl = document.getElementById('chat-intro');
  var thread = document.getElementById('chat-thread');
  if (!introEl || !thread || introEl.dataset.persisted === 'true') return;
  thread.insertBefore(introEl, thread.firstChild);
  introEl.classList.add('portfolio-chat__intro--thread');
  introEl.dataset.persisted = 'true';
}

function showConversationPanel() {
  var conversationEl = document.getElementById('chat-conversation');
  var chatEl = document.getElementById('portfolio-chat');
  persistIntroInThread();
  if (conversationEl) conversationEl.hidden = false;
  if (chatEl) chatEl.classList.add('is-responding');
}

function showUserQuestion(text) {
  var thread = document.getElementById('chat-thread');
  var root = document.querySelector('.experimental-home');
  var isFirstExchange = !thread || thread.children.length === 0;

  showConversationPanel();
  if (root) root.classList.add('is-loaded');
  if (isFirstExchange) scrollToTop();

  activeExchange = createExchange(text);
  requestAnimationFrame(scrollConversationToBottom);
}

function syncInputState() {
  var chatEl = document.getElementById('portfolio-chat');
  var input = document.getElementById('chat-input');
  if (!chatEl || !input) return;
  chatEl.classList.toggle('is-filled', input.value.trim().length > 0);
}

function setChatFocused(isFocused) {
  var chatEl = document.getElementById('portfolio-chat');
  var suggestionsEl = document.getElementById('chat-suggestions');
  if (!chatEl) return;
  chatEl.classList.toggle('is-focused', isFocused);
  if (suggestionsEl) suggestionsEl.setAttribute('aria-hidden', isFocused ? 'false' : 'true');
  syncInputState();
}

function replaySuggestionAnimation() {
  var suggestions = document.querySelectorAll('.portfolio-chat__suggestion');
  suggestions.forEach(function (button) {
    button.style.animation = 'none';
    void button.offsetWidth;
    button.style.animation = '';
  });
}

function getTokenDelay(index, chunk, prevChunk) {
  if (chunk.text === '.' && index === 6) {
    return 600;
  }

  if (chunk.text === '.' && index === 43) {
    return 400;
  }

  if (index <= 6) {
    return 60 + Math.floor(Math.random() * 50);
  }

  if (index < 18) {
    return 28 + Math.floor(Math.random() * 36);
  }

  if (prevChunk && /^[.?!]$/.test(prevChunk.text)) {
    return 80 + Math.floor(Math.random() * 120);
  }

  if (chunk.bold && prevChunk && !prevChunk.bold) {
    return 140 + Math.floor(Math.random() * 100);
  }

  if (Math.random() < 0.1) {
    return 120 + Math.floor(Math.random() * 160);
  }

  if (Math.random() < 0.35) {
    return 8 + Math.floor(Math.random() * 18);
  }

  return 32 + Math.floor(Math.random() * 56);
}

function playIntro(onComplete) {
  var introEl = document.getElementById('chat-intro');
  if (!introEl) {
    if (onComplete) onComplete();
    return;
  }

  var index = 0;

  function appendChunk() {
    if (index >= INTRO_CHUNKS.length) {
      if (onComplete) onComplete();
      return;
    }

    var chunk = INTRO_CHUNKS[index];
    var prevChunk = index > 0 ? INTRO_CHUNKS[index - 1] : null;
    var node = chunk.bold ? document.createElement('strong') : document.createTextNode('');
    node.textContent = chunk.text;
    introEl.appendChild(node);
    index++;
    window.setTimeout(appendChunk, getTokenDelay(index - 1, chunk, prevChunk));
  }

  appendChunk();
}

function showInput(onComplete) {
  var form = document.getElementById('chat-form');
  if (!form) {
    if (onComplete) onComplete();
    return;
  }

  var done = false;

  function finish() {
    if (done) return;
    done = true;
    if (onComplete) onComplete();
  }

  form.classList.add('is-visible');

  function onFormTransitionEnd(e) {
    if (e.target !== form) return;
    if (e.propertyName !== 'opacity') return;
    form.removeEventListener('transitionend', onFormTransitionEnd);
    finish();
  }

  form.addEventListener('transitionend', onFormTransitionEnd);
  window.setTimeout(finish, 450);
}

function scrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function scrollConversationToBottom() {
  var conversationEl = document.getElementById('chat-conversation');
  if (!conversationEl || conversationEl.hidden) return;
  conversationEl.scrollTop = conversationEl.scrollHeight;
}

function initConversationScroll() {
  var conversationEl = document.getElementById('chat-conversation');
  if (!conversationEl) return;

  conversationEl.addEventListener('wheel', function (e) {
    if (conversationEl.hidden) return;

    var maxScroll = Math.max(0, conversationEl.scrollHeight - conversationEl.clientHeight);
    if (maxScroll <= 0) return;

    var atTop = conversationEl.scrollTop <= 0;
    var atBottom = conversationEl.scrollTop + conversationEl.clientHeight >= conversationEl.scrollHeight - 1;

    if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
      e.preventDefault();
    }
  }, { passive: false });
}

function showWork(onComplete) {
  var root = document.querySelector('.experimental-home');
  var grid = document.querySelector('.experimental-bento-projects');
  if (!root || !grid) {
    if (onComplete) onComplete();
    return;
  }

  var done = false;

  function finish() {
    if (done) return;
    done = true;
    scrollToTop();
    if (onComplete) onComplete();
  }

  scrollToTop();

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      root.classList.add('is-loaded');

      function onGridTransitionEnd(e) {
        if (e.target !== grid) return;
        if (e.propertyName !== 'opacity' && e.propertyName !== 'transform') return;
        grid.removeEventListener('transitionend', onGridTransitionEnd);
        finish();
      }

      grid.addEventListener('transitionend', onGridTransitionEnd);
      window.setTimeout(finish, 1050);
    });
  });
}

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

  if (!response.body) {
    throw new Error('Something went wrong.');
  }

  if (!activeExchange) {
    throw new Error('Something went wrong.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  const responseEl = activeExchange.answerEl;
  const linksEl = activeExchange.linksEl;
  responseEl.innerHTML = '';
  linksEl.innerHTML = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });

    const { text, links } = parseLinks(fullText);
    responseEl.innerHTML = renderMarkdown(text);
    renderLinks(links, linksEl);
    scrollConversationToBottom();
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

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function preprocessMarkdown(text) {
  return text.replace(/(?<=\S)\s+(?=\d+\.\s)/g, '\n');
}

function sanitizeLinkUrl(url) {
  var trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return trimmed.replace(/"/g, '&quot;');
  }
  return null;
}

function renderInlineMarkdown(text) {
  return escapeHtml(preprocessMarkdown(text))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, url) {
      var safeUrl = sanitizeLinkUrl(url);
      if (!safeUrl) return '[' + label + '](' + url + ')';
      return '<a href="' + safeUrl + '">' + label + '</a>';
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
}

function renderMarkdown(text) {
  if (!text) return '';

  const html = renderInlineMarkdown(text);

  const lines = html.split('\n');
  const blocks = [];
  let listType = null;
  let listItems = [];

  function flushList() {
    if (!listItems.length) return;
    const tag = listType === 'ol' ? 'ol' : 'ul';
    blocks.push(
      '<' + tag + '>' +
      listItems.map(function (item) { return '<li>' + item + '</li>'; }).join('') +
      '</' + tag + '>'
    );
    listItems = [];
    listType = null;
  }

  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim();
    var olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    var ulMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (olMatch) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(olMatch[2]);
    } else if (ulMatch) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(ulMatch[1]);
    } else if (trimmed) {
      flushList();
      blocks.push('<p>' + trimmed + '</p>');
    } else {
      flushList();
    }
  }
  flushList();

  return blocks.join('');
}

function runLoadSequence() {
  var root = document.querySelector('.experimental-home');
  var form = document.getElementById('chat-form');
  if (!root || !form) return;

  scrollToTop();

  playIntro(function () {
    window.setTimeout(function () {
      showInput(function () {
        showWork();
      });
    }, 200);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const threadEl = document.getElementById('chat-thread');
  const chatEl = document.getElementById('portfolio-chat');
  if (!form || !input || !threadEl || !chatEl) return;

  runLoadSequence();
  initConversationScroll();

  input.addEventListener('input', syncInputState);

  input.addEventListener('focus', function () {
    setChatFocused(true);
    replaySuggestionAnimation();
  });

  input.addEventListener('blur', function () {
    window.setTimeout(function () {
      if (!chatEl.contains(document.activeElement)) {
        setChatFocused(false);
      }
    }, 0);
  });

  document.querySelectorAll('.portfolio-chat__suggestion').forEach(function (button) {
    button.addEventListener('mousedown', function (e) {
      e.preventDefault();
    });

    button.addEventListener('click', function () {
      input.value = button.getAttribute('data-suggestion') || button.textContent.trim();
      input.focus();
      handleChatSubmit();
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    e.stopPropagation();
    handleChatSubmit();
  });

  async function handleChatSubmit() {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.disabled = true;
    setChatFocused(false);
    showUserQuestion(text);

    try {
      await sendMessage(text);
    } catch (err) {
      if (activeExchange) {
        activeExchange.answerEl.textContent = err.message || 'Something went wrong.';
        scrollConversationToBottom();
      }
    } finally {
      input.disabled = false;
      input.focus();
    }
  }
});
