/**
 * OpenRouter AI Configuration
 * Fallback provider offering free models (openrouter/free, llama-3.3-70b:free, mistral-7b:free, etc.)
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_MODELS = [
  'openrouter/free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-7b-instruct:free'
];

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY || '';
}

function isOpenRouterConfigured() {
  const key = getOpenRouterApiKey();
  return Boolean(key && key.trim().length > 5);
}

module.exports = {
  OPENROUTER_API_URL,
  DEFAULT_MODELS,
  getOpenRouterApiKey,
  isOpenRouterConfigured
};

