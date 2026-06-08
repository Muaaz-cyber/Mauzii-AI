// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();

// ======================
// Middleware
// ======================
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: '*',
  credentials: false
}));
app.use(express.json({ limit: '1mb' }));

// ======================
// Rate Limiting
// ======================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' }
});
app.use('/api/', limiter);

// ======================
// API Key Validation
// ======================
if (!process.env.OPENROUTER_API_KEY) {
  console.error('❌ Missing OPENROUTER_API_KEY');
  process.exit(1);
}

// ======================
// Constants
// ======================
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const MAX_HISTORY = 10;
const TIMEOUT_MS = 25000;

// ======================
// Model Configuration
// ======================
const MODELS = {
  // Free tier//
gemini_flash: 'openrouter/auto',
llama:        'openrouter/auto',
deepseek:     'openrouter/auto',
  // Mid tier
  gpt_mini:     'openai/gpt-4o-mini',
  // Top tier
  claude_sonnet:'anthropic/claude-sonnet-4-5',
  gpt4o:        'openai/gpt-4o',
};

// Human mode to model mapping
if (model === 'auto') {
  const [r1, r2, r3] = await Promise.all([
    callOpenRouter(MODELS.gemini_flash, messages),
    callOpenRouter(MODELS.gemini_flash, messages),
    callOpenRouter(MODELS.gemini_flash, messages),
  ]);

  const responses = [r1, r2, r3].filter(Boolean);

  const best = responses.sort((a, b) => b.length - a.length)[0];

  const words = best.split(' ');
  for (const word of words) {
    res.write(`data: ${JSON.stringify({ token: word + ' ' })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  return res.end();
}
// Source display names
const MODEL_NAMES = {
  [MODELS.gemini_flash]:  'Mauzii AI',
  [MODELS.llama]:         'Mauzii AI',
  [MODELS.deepseek]:      'Mauzii AI',
  [MODELS.gpt_mini]:      'Mauzii AI',
  [MODELS.claude_sonnet]: 'Mauzii AI',
  [MODELS.gpt4o]:         'Mauzii AI',
};

// ======================
// Free greeting responses
// ======================
const FREE_RESPONSES = {
  greetings: [
    'Hey! 👋 How can I help you today?',
    'Hello! What would you like to explore today?',
    'Hi there! What can I help you with?',
  ]
};

function isGreeting(message) {
  const greetings = /^(hi|hello|hey|sup|yo|howdy|greetings|good morning|good evening|good afternoon|what's up|how are you|hii|hiii)[\s!?.]*$/i;
  return greetings.test(message.trim());
}

function getFreeResponse() {
  const responses = FREE_RESPONSES.greetings;
  return responses[Math.floor(Math.random() * responses.length)];
}

// ======================
// Smart Routing
// ======================
function autoDetectModel(message) {
  const msg = message.toLowerCase();

  // Simple/casual - use free model
  if (/^(what|who|when|where|define|meaning|tell me about|explain simply|what is|what are)\b/.test(msg) && msg.length < 100)
    return MODELS.gemini_flash;

  // Coding tasks - use GPT-4o
  if (/code|bug|function|error|debug|script|programming|syntax|javascript|python|html|css|json|react|node|api|database|fix this|rewrite|full app|entire|whole/.test(msg))
    return MODELS.gpt4o;

  // Deep explanation/study - use Claude
  if (/explain|analyze|essay|summarize|study|understand|concept|theory|difference between|compare|why does|how does|elaborate/.test(msg))
    return MODELS.claude_sonnet;

  // Creative writing - use Claude
  if (/write|story|poem|letter|creative|draft|describe|narrative/.test(msg))
    return MODELS.claude_sonnet;

  // Medium complexity - use GPT mini
  if (msg.length > 100 && msg.length < 300)
    return MODELS.gpt_mini;

  // Default - free model
  return MODELS.gemini_flash;
}

// ======================
// Helpers
// ======================
function sanitizeHistory(history = []) {
  return history
    .slice(-MAX_HISTORY)
    .map(msg => ({
      role: msg.role === 'model' ? 'assistant' : msg.role,
      content: String(msg.content || '').slice(0, 3000)
    }))
    .filter(msg => msg.role === 'user' || msg.role === 'assistant');
}

function timeoutPromise(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), ms)
  );
}

// System prompt - never reveals underlying AI
const SYSTEM_PROMPT = `You are Mauzii AI - a friendly, warm, and helpful AI assistant.
Always respond as Mauzii AI. Never reveal that you are Claude, GPT, Gemini, or any other AI.
Never mention OpenRouter, Anthropic, OpenAI, or Google.
Be conversational, warm, and helpful like a smart friend.
Keep responses clear and well-formatted using markdown when appropriate.`;

// ======================
// OpenRouter API Call (streaming)
// ======================
async function streamFromOpenRouter(model, messages, res) {
  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
      'X-Title': 'Mauzii AI',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') return;

        try {
          const parsed = JSON.parse(dataStr);
          const token = parsed.choices?.[0]?.delta?.content || '';
          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch (e) {}
      }
    }
  }
}

// ======================
// OpenRouter API Call (non-streaming for consensus)
// ======================
async function callOpenRouter(model, messages) {
  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
      'X-Title': 'Mauzii AI',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })
  });

  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ======================
// Response Cache
// ======================
const responseCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCacheKey(message, model) {
  return `${model}:${message.trim().toLowerCase()}`;
}

function getFromCache(key) {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    responseCache.delete(key);
    return null;
  }
  return cached.response;
}

function setCache(key, response) {
  responseCache.set(key, { response, timestamp: Date.now() });
  // Limit cache size
  if (responseCache.size > 500) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
}

// ======================
// Main Chat Route
// ======================
app.post('/api/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const { message, history = [], model = 'auto' } = req.body;

    // Validation
    if (typeof message !== 'string' || !message.trim()) {
      res.write(`data: ${JSON.stringify({ error: 'Invalid message' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    if (message.length > 5000) {
      res.write(`data: ${JSON.stringify({ error: 'Message too long (max 5000 chars)' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // Free greeting response
    if (isGreeting(message) && model === 'auto') {
      const freeReply = getFreeResponse();
      res.write(`data: ${JSON.stringify({ meta: { source: 'Mauzii AI', autoSelected: false, isConsensus: false } })}\n\n`);
      // Stream it word by word for natural feel
      for (const word of freeReply.split(' ')) {
        res.write(`data: ${JSON.stringify({ token: word + ' ' })}\n\n`);
        await new Promise(r => setTimeout(r, 30));
      }
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const cleanHistory = sanitizeHistory(history);
    const messages = [...cleanHistory, { role: 'user', content: message.trim() }];

    // ---- ULTRA MODE (Consensus) ----
    if (model === 'ultra' || model === 'consensus') {
      res.write(`data: ${JSON.stringify({
        meta: { source: 'Mauzii AI', autoSelected: false, isConsensus: true }
      })}\n\n`);

      const safeCall = async (modelKey, fallback) => {
        try {
          return await Promise.race([
            callOpenRouter(modelKey, messages),
            timeoutPromise(TIMEOUT_MS)
          ]);
        } catch {
          return fallback;
        }
      };

      // Call 3 AIs in parallel
      const [res1, res2, res3] = await Promise.all([
        safeCall(MODELS.gemini_flash, ''),
        safeCall(MODELS.gpt_mini, ''),
        safeCall(MODELS.claude_sonnet, ''),
      ]);

      // Synthesize best answer
      const synthesisMessages = [{
        role: 'user',
        content: `You are Mauzii AI synthesis engine. Three AI perspectives answered the same question. Combine the BEST parts into ONE perfect answer. Be clear and use markdown.\n\nQUESTION: ${message}\n\nPERSPECTIVE 1:\n${res1}\n\nPERSPECTIVE 2:\n${res2}\n\nPERSPECTIVE 3:\n${res3}\n\nWrite the single best combined answer:`
      }];

      await streamFromOpenRouter(MODELS.gpt4o, synthesisMessages, res);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // ---- NORMAL / AUTO MODE ----
    let finalModel;

    if (model === 'auto') {
      finalModel = autoDetectModel(message);
    } else if (MODE_TO_MODEL[model]) {
      finalModel = MODE_TO_MODEL[model];
    } else {
      finalModel = MODELS.gemini_flash;
    }

    const isAutoSelected = model === 'auto';

    // Check cache for simple questions
    const cacheKey = getCacheKey(message, finalModel);
    const cached = getFromCache(cacheKey);

    res.write(`data: ${JSON.stringify({
      meta: { source: 'Mauzii AI', autoSelected: isAutoSelected, isConsensus: false }
    })}\n\n`);

    if (cached) {
      // Stream cached response
      const words = cached.split(' ');
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ token: word + ' ' })}\n\n`);
        await new Promise(r => setTimeout(r, 10));
      }
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // Fallback chain
    const fallbackChain = [finalModel, MODELS.gemini_flash, MODELS.llama];
    const uniqueChain = [...new Set(fallbackChain)];
    let success = false;

    for (const modelKey of uniqueChain) {
      if (success) break;
      try {
        await Promise.race([
          streamFromOpenRouter(modelKey, messages, res),
          timeoutPromise(TIMEOUT_MS)
        ]);
        success = true;
      } catch (err) {
        console.error(`Model ${modelKey} failed:`, err.message);
      }
    }

    if (!success) {
      res.write(`data: ${JSON.stringify({ error: 'All AI models failed. Please try again.' })}\n\n`);
    }

  } catch (error) {
    console.error('Chat error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Something went wrong. Please try again.' })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', app: 'Mauzii AI' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Mauzii AI Server running on port ${PORT}`);
});
