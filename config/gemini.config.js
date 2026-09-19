const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let geminiModel = null;

function getApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ''
  ).trim();
}

function isGeminiConfigured() {
  const key = getApiKey();
  return Boolean(key && key.length > 5);
}

function getGeminiModel() {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  if (!genAI || !geminiModel) {
    try {
      genAI = new GoogleGenerativeAI(apiKey);
      // gemini-3.5-flash-lite is active and natively supports SDK tool calling
      geminiModel = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        generationConfig: {
          temperature: 0.4,
          topP: 0.85,
          topK: 40,
          maxOutputTokens: 1024
        }
      });
    } catch (err) {
      console.warn('[Darwin/Gemini] Initialization error:', err.message);
      return null;
    }
  }

  return geminiModel;
}

module.exports = {
  isGeminiConfigured,
  getGeminiModel,
  getApiKey
};

