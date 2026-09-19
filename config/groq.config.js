/**
 * Groq AI Cloud Configuration
 * High-speed LPU inference engine with OpenAI-compatible API
 * Free tier: https://console.groq.com/keys
 */

function getGroqApiKey() {
  return process.env.GROQ_API_KEY || '';
}

function isGroqConfigured() {
  const key = getGroqApiKey();
  return Boolean(key && key.trim().length > 0 && !key.includes('your-groq-key'));
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_FALLBACK_MODELS = [
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768'
];

module.exports = {
  getGroqApiKey,
  isGroqConfigured,
  GROQ_API_URL,
  GROQ_DEFAULT_MODEL,
  GROQ_FALLBACK_MODELS
};

