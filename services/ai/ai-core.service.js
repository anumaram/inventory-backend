/**
 * Universal AI Core Execution Engine
 * Provides standard OpenAI-compatible & Gemini tool calling with automatic deterministic NLP fallback
 */

const { getOpenRouterApiKey, OPENROUTER_API_URL, DEFAULT_MODELS, isOpenRouterConfigured } = require('../../config/openrouter.config');
const { getGeminiModel, isGeminiConfigured } = require('../../config/gemini.config');
const { getGroqApiKey, isGroqConfigured, GROQ_API_URL, GROQ_DEFAULT_MODEL, GROQ_FALLBACK_MODELS } = require('../../config/groq.config');
const { getCerebrasApiKey, isCerebrasConfigured, CEREBRAS_API_URL, CEREBRAS_DEFAULT_MODEL, CEREBRAS_FALLBACK_MODELS } = require('../../config/cerebras.config');


function convertOpenAiToolsToGemini(tools = []) {
  if (!Array.isArray(tools)) return [];
  return tools.map((t) => {
    const fn = t.function || t;
    const name = fn.name;
    const description = fn.description || '';
    let parameters = fn.parameters || { type: 'OBJECT', properties: {} };

    function formatParam(schema) {
      if (!schema || typeof schema !== 'object') return { type: 'OBJECT', properties: {} };
      const res = { ...schema };
      if (typeof res.type === 'string') {
        res.type = res.type.toUpperCase();
      }
      if (res.properties && typeof res.properties === 'object') {
        const p = {};
        for (const [k, v] of Object.entries(res.properties)) {
          p[k] = formatParam(v);
        }
        res.properties = p;
      }
      if (res.items) {
        res.items = formatParam(res.items);
      }
      return res;
    }

    return {
      name,
      description,
      parameters: formatParam(parameters)
    };
  });
}

/**
 * Strips XML tags, tool tags, and raw ObjectIds from user-facing text
 */
function sanitizeAiResponseText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<\|.*?\|>/g, '')
    .replace(/\[(?:get|attach|search)[a-zA-Z0-9_]*\([^)]*\)\]/gi, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<function=[^>]+>[\s\S]*?(?:<\/function>|$)/gi, '')
    .replace(/<\/?(?:tool_call|function|parameter|arg_key|arg_value)[^>]*>/gi, '')
    .replace(/```(?:json)?\s*\{\s*"(?:name|function)"[\s\S]*?\}\s*```/gi, '')
    .replace(/(?:Product|Order|User|Vendor|Customer|ID)?\s*[0-9a-fA-F]{24}/gi, '')
    .replace(/\([0-9a-fA-F]{24}\)/gi, '')
    .replace(/\b[0-9a-fA-F]{24}\b/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Execute AI Chat with tool calling and deterministic fallback
 */
async function executeAiChat({
  personality = 'system',
  systemPrompt = '',
  tools = [],
  executeToolCall = null,
  message = '',
  conversationHistory = [],
  context = {},
  nlpFallback = null
}) {
  const trimmed = String(message || '').trim();
  const preferredProvider = context.aiProviderPreference || 'auto';

  // If user specifically requests offline Deterministic NLP, jump directly to Tier 3
  if (preferredProvider === 'nlp' && typeof nlpFallback === 'function') {
    const nlpRes = await nlpFallback({
      message: trimmed,
      ...context,
      conversationHistory
    });
    if (nlpRes) {
      nlpRes.mode = 'nlp';
      nlpRes.personality = personality;
      if (nlpRes.message) nlpRes.message = sanitizeAiResponseText(nlpRes.message);
      return nlpRes;
    }
  }

  // Tier 1: Google Gemini API (Auto Router or Explicit Gemini preference)
  if ((preferredProvider === 'auto' || preferredProvider === 'gemini') && isGeminiConfigured() && typeof executeToolCall === 'function') {
    try {
      const model = getGeminiModel();
      if (model) {
        const geminiTools = convertOpenAiToolsToGemini(tools);
        const historyParts = [];
        if (Array.isArray(conversationHistory)) {
          conversationHistory.slice(-6).forEach((msg) => {
            if (msg.content) {
              historyParts.push({
                role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: String(msg.content) }]
              });
            }
          });
        }

        const chat = model.startChat({
          history: historyParts,
          tools: geminiTools.length > 0 ? [{ functionDeclarations: geminiTools }] : undefined,
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined
        });

        const initialResult = await chat.sendMessage(trimmed);
        const functionCalls = initialResult.response.functionCalls();

        let toolData = null;
        let finalText = '';

        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0];
          const toolResult = await executeToolCall(call.name, call.args || {}, context);
          toolData = { toolName: call.name, data: toolResult };

          try {
            const secondResult = await chat.sendMessage([
              {
                functionResponse: {
                  name: call.name,
                  response: { result: toolResult }
                }
              }
            ]);
            finalText = secondResult.response.text();
          } catch (secondErr) {
            const synthPrompt = `User question: "${trimmed}"\nTool "${call.name}" executed. Database result:\n${JSON.stringify(toolResult).slice(0, 4000)}\nSynthesize a clear, executive-level, actionable response in markdown format with currency in ₹.`;
            const synthRes = await model.generateContent({
              contents: [{ role: 'user', parts: [{ text: synthPrompt }] }],
              systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined
            });
            finalText = synthRes.response.text();
          }
        } else {
          finalText = initialResult.response.text();
        }

        finalText = sanitizeAiResponseText(finalText);

        if (finalText || toolData) {
          const action = toolData?.data?.action || toolData?.data?.data?.action || undefined;
          return {
            message: finalText || toolData?.data?.summary || 'Here is the requested intelligence overview:',
            mode: 'gemini',
            toolData,
            action,
            personality
          };
        }
      }
    } catch (geminiErr) {
      console.warn(`[AI:${personality}] Gemini execution error, attempting fallback:`, geminiErr.message);
    }
  }

  // Helper for OpenAI-compatible chat completions (OpenRouter, Groq, Cerebras)
  async function executeOpenAiCompatibleChat({
    providerName,
    apiUrl,
    apiKey,
    defaultModel,
    fallbackModels = [],
    extraHeaders = {},
    messages,
    tools,
    executeToolCall,
    context,
    personality
  }) {
    if (!apiKey) return null;
    const modelsToTry = [defaultModel, ...fallbackModels.filter((m) => m && m !== defaultModel)];

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const currentModel = modelsToTry[mIdx];
      try {
        const requestBody = {
          model: currentModel,
          messages,
          tools: tools && tools.length > 0 ? tools : undefined,
          tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
          temperature: 0.2
        };

        if (providerName === 'openrouter' && Array.isArray(fallbackModels) && fallbackModels.length > 0) {
          requestBody.models = fallbackModels;
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...extraHeaders
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(6500)
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[AI:${personality}] ${providerName} (model: ${currentModel}) failed (${response.status}):`, errText.slice(0, 160));
          if (mIdx < modelsToTry.length - 1 && (response.status === 404 || response.status === 400 || response.status === 422 || response.status === 429)) {
            continue;
          }
          return null;
        }

        const json = await response.json();
        const choice = json.choices && json.choices[0];
        const choiceMessage = choice?.message;

        if (!choiceMessage) return null;

        let toolData = null;
        let finalText = choiceMessage.content || '';

        // Handle standard tool calling
        if (choiceMessage.tool_calls && choiceMessage.tool_calls.length > 0) {
          const call = choiceMessage.tool_calls[0];
          const toolName = call.function?.name;
          let toolArgs = {};
          try {
            toolArgs = typeof call.function?.arguments === 'string'
              ? JSON.parse(call.function.arguments)
              : (call.function?.arguments || {});
          } catch {
            toolArgs = {};
          }

          const toolResult = await executeToolCall(toolName, toolArgs, context);
          toolData = { toolName, data: toolResult };

          // Second pass for conversational answer synthesis
          const synthMessages = [
            ...messages,
            choiceMessage,
            {
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify(toolResult)
            }
          ];

          try {
            const secBody = {
              model: currentModel,
              messages: synthMessages,
              temperature: 0.3
            };
            if (providerName === 'openrouter' && Array.isArray(fallbackModels) && fallbackModels.length > 0) {
              secBody.models = fallbackModels;
            }

            const secRes = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                ...extraHeaders
              },
              body: JSON.stringify(secBody),
              signal: AbortSignal.timeout(6500)
            });

            if (secRes.ok) {
              const secJson = await secRes.json();
              const secChoice = secJson.choices && secJson.choices[0];
              if (secChoice?.message?.content) {
                finalText = secChoice.message.content;
              }
            }
          } catch (secErr) {
            console.warn(`[AI:${personality}] ${providerName} second pass synthesis warning:`, secErr.message);
          }
        }

        finalText = sanitizeAiResponseText(finalText);

        const action = toolData?.data?.action || toolData?.data?.data?.action || undefined;
        return {
          message: finalText || toolData?.data?.summary || 'Here is the requested intelligence overview:',
          mode: providerName,
          toolData,
          action,
          personality
        };
      } catch (err) {
        console.warn(`[AI:${personality}] ${providerName} model ${currentModel} error:`, err.message);
        if (mIdx < modelsToTry.length - 1) continue;
        return null;
      }
    }

    return null;
  }

  // Construct message array for OpenAI-compatible providers
  const openAiMessages = [{ role: 'system', content: systemPrompt }];
  if (Array.isArray(conversationHistory)) {
    conversationHistory.slice(-6).forEach((msg) => {
      if (msg.content) {
        openAiMessages.push({
          role: msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user',
          content: String(msg.content)
        });
      }
    });
  }
  openAiMessages.push({ role: 'user', content: trimmed });

  // Tier 2: OpenRouter API (Auto Router fallback or Explicit OpenRouter preference or Gemini fallback)
  if ((preferredProvider === 'auto' || preferredProvider === 'openrouter' || preferredProvider === 'gemini') && isOpenRouterConfigured() && typeof executeToolCall === 'function') {
    const openRouterRes = await executeOpenAiCompatibleChat({
      providerName: 'openrouter',
      apiUrl: OPENROUTER_API_URL,
      apiKey: getOpenRouterApiKey(),
      defaultModel: 'openrouter/free',
      fallbackModels: DEFAULT_MODELS,
      extraHeaders: {
        'HTTP-Referer': 'https://inventory-system.local',
        'X-Title': `Inventory AI - ${personality}`
      },
      messages: openAiMessages,
      tools,
      executeToolCall,
      context,
      personality
    });
    if (openRouterRes) return openRouterRes;
  }

  // Tier 3: Groq LPU Cloud API (Auto Router fallback or Explicit Groq preference)
  if ((preferredProvider === 'auto' || preferredProvider === 'groq' || preferredProvider === 'openrouter' || preferredProvider === 'gemini') && isGroqConfigured() && typeof executeToolCall === 'function') {
    const groqRes = await executeOpenAiCompatibleChat({
      providerName: 'groq',
      apiUrl: GROQ_API_URL,
      apiKey: getGroqApiKey(),
      defaultModel: GROQ_DEFAULT_MODEL,
      fallbackModels: GROQ_FALLBACK_MODELS,
      messages: openAiMessages,
      tools,
      executeToolCall,
      context,
      personality
    });
    if (groqRes) return groqRes;
  }

  // Tier 4: Cerebras Wafer Cloud API (Auto Router fallback or Explicit Cerebras preference)
  if ((preferredProvider === 'auto' || preferredProvider === 'cerebras' || preferredProvider === 'groq' || preferredProvider === 'openrouter' || preferredProvider === 'gemini') && isCerebrasConfigured() && typeof executeToolCall === 'function') {
    const cerebrasRes = await executeOpenAiCompatibleChat({
      providerName: 'cerebras',
      apiUrl: CEREBRAS_API_URL,
      apiKey: getCerebrasApiKey(),
      defaultModel: CEREBRAS_DEFAULT_MODEL,
      fallbackModels: CEREBRAS_FALLBACK_MODELS,
      messages: openAiMessages,
      tools,
      executeToolCall,
      context,
      personality
    });
    if (cerebrasRes) return cerebrasRes;
  }

  // Tier 5: Local Deterministic NLP Dispatcher (100% Reliable, Zero Cost, Always Online)
  if (typeof nlpFallback === 'function') {
    const nlpRes = await nlpFallback({
      message: trimmed,
      ...context,
      conversationHistory
    });
    if (nlpRes) {
      nlpRes.mode = nlpRes.mode || 'nlp';
      nlpRes.personality = personality;
      if (nlpRes.message) {
        nlpRes.message = sanitizeAiResponseText(nlpRes.message);
      }
      return nlpRes;
    }
  }

  return {
    message: "I couldn't process that query. Please choose a suggestion below or ask me another way.",
    mode: 'system',
    personality,
    suggestions: []
  };
}

module.exports = {
  executeAiChat,
  sanitizeAiResponseText
};
