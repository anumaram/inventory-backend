/**
 * Cerebras AI Cloud Configuration
 * Wafer-scale ultra-fast inference with OpenAI-compatible API
 * Free tier: https://cloud.cerebras.ai
 */

function getCerebrasApiKey() {
  return process.env.CEREBRAS_API_KEY || '';
}

function isCerebrasConfigured() {
  const key = getCerebrasApiKey();
  return Boolean(key && key.trim().length > 0 && !key.includes('your-cerebras-key'));
}

const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';
const CEREBRAS_DEFAULT_MODEL = process.env.CEREBRAS_MODEL || 'gpt-oss-120b';
const CEREBRAS_FALLBACK_MODELS = [
  'gpt-oss-120b',
  'llama3.3-70b',
  'llama3.1-8b'
];

module.exports = {
  getCerebrasApiKey,
  isCerebrasConfigured,
  CEREBRAS_API_URL,
  CEREBRAS_DEFAULT_MODEL,
  CEREBRAS_FALLBACK_MODELS
};

