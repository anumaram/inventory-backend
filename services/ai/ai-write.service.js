/**
 * Universal AI Write Service
 * Supports Local Ollama (100% private, free) + Groq + Gemini + OpenRouter + Smart Offline Fallback
 */

const { getGroqApiKey, isGroqConfigured, GROQ_API_URL } = require('../../config/groq.config');
const { getGeminiModel, isGeminiConfigured } = require('../../config/gemini.config');
const { getOpenRouterApiKey, isOpenRouterConfigured, OPENROUTER_API_URL, DEFAULT_MODELS } = require('../../config/openrouter.config');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

/**
 * Check if local Ollama daemon is active
 */
async function checkOllamaAvailability() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(1200)
    });
    if (res.ok) {
      const data = await res.json();
      const models = Array.isArray(data.models) ? data.models.map((m) => m.name) : [];
      return { available: true, models, defaultModel: models[0] || 'llama3.2' };
    }
  } catch {}
  return { available: false, models: [], defaultModel: null };
}

/**
 * Clean and parse JSON or text from LLM responses
 */
function cleanGeneratedText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/^["']|["']$/g, '')
    .replace(/<\|.*?\|>/g, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}

function parseJsonOrExtract(text, fallbackFields = {}) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}
  return fallbackFields;
}

/**
 * Smart Heuristic Generator (Offline / Fallback)
 */
function generateHeuristicText(task, input, context) {
  const rating = Number(context?.rating) || 5;
  const prodName = context?.productName || 'product';
  const raw = String(input || '').trim();

  if (task === 'review_full' || task === 'review_headline' || task === 'review_body') {
    let headline = '';
    let body = '';

    if (rating >= 5) {
      headline = raw ? `Outstanding Quality – ${raw.charAt(0).toUpperCase() + raw.slice(1)}!` : `Exceptional Quality and Value!`;
      body = `I am thoroughly impressed with the ${prodName}. ${raw ? `Especially noticed that: ${raw}. ` : ''}The build quality, performance, and overall packaging exceeded my expectations. Delivery was fast and in pristine condition. Highly recommended to anyone considering this!`;
    } else if (rating === 4) {
      headline = raw ? `Very Good Purchase – ${raw}` : `Solid Product with Great Everyday Utility`;
      body = `Overall, the ${prodName} is a solid product that delivers on its core promises. ${raw ? `My experience: ${raw}. ` : ''}Minor room for polish, but for the price point, it provides dependable value. Satisfied with the purchase.`;
    } else if (rating === 3) {
      headline = raw ? `Average Experience – ${raw}` : `Decent But Average Overall`;
      body = `The ${prodName} is okay for standard usage. ${raw ? `Note: ${raw}. ` : ''}It functions as described, though build quality and speed could be improved. Fair purchase if found at a steep discount.`;
    } else {
      headline = raw ? `Needs Improvement – ${raw}` : `Did Not Meet Expectations`;
      body = `Unfortunately, the ${prodName} fell short of expectations. ${raw ? `Issue encountered: ${raw}. ` : ''}Customer support and quality control could be significantly improved. Hoping the seller addresses this in future batches.`;
    }

    if (task === 'review_headline') return { headline };
    if (task === 'review_body') return { review: body };
    return { headline, review: body };
  }

  if (task === 'support_ticket' || task === 'warranty_claim') {
    const orderId = context?.orderId ? ` (Order #${context.orderId})` : '';
    const serial = context?.serialNumber ? ` [Serial: ${context.serialNumber}]` : '';
    const cat = context?.issueCategory || context?.category || 'Hardware Defect';
    const claimType = (context?.claimType || 'repair').toUpperCase();

    if (context?.isWarranty || task === 'warranty_claim') {
      const message = `Issue Category: ${cat}\nProduct: ${prodName}${serial}\nRequested Service: ${claimType}\n\nSymptoms & Fault Description:\n${raw || `Encountered unexpected ${cat.toLowerCase()} malfunction during standard operation. The device is not performing to manufacturer specifications.`}\n\nTroubleshooting Attempted:\n• Performed device restart and clean reboot cycle\n• Verified power source and cable connections\n• Inspected physical chassis with zero signs of external or water damage\n\nRequesting authorized manufacturer warranty diagnostic and ${claimType.toLowerCase()} under active coverage.`;
      return { message };
    }

    const message = `Hello Support Team,\n\nI am writing regarding an issue with my ${prodName}${orderId}.\n\nDetails:\n${raw || 'I need assistance regarding order dispatch and delivery status.'}\n\nPlease look into this at your earliest convenience and let me know the resolution.\n\nThank you.`;
    return { message };
  }

  if (task === 'product_description') {
    const cat = context?.category || 'General';
    const price = context?.price ? `₹${Number(context.price).toLocaleString('en-IN')}` : '';
    const desc = `Elevate your everyday experience with the ${prodName}. Designed specifically for ${cat} enthusiasts, this premium product combines durable craftsmanship, ergonomic design, and top-tier performance.\n\n✨ Key Highlights:\n• High-grade materials built for longevity\n• Optimized for smooth everyday performance\n• Backed by manufacturer guarantee and easy customer support\n\n${raw ? `Special Notes: ${raw}\n` : ''}${price ? `Available now at great value for ${price}.` : ''}`;
    return { description: desc };
  }

  if (task === 'product_title') {
    const cat = context?.category ? ` - ${context.category}` : '';
    return { title: `${prodName}${cat} (High Performance & Premium Quality)` };
  }

  if (task === 'broadcast_announcement') {
    const topic = raw || prodName || 'Platform Update';
    return {
      title: `${topic.slice(0, 40)} Announcement`,
      message: `Important update regarding ${topic}: Please take note of the latest changes on our platform. Contact support for any assistance.`
    };
  }

  if (task === 'support_reply') {
    const custName = context?.customerName || 'Customer';
    const subj = context?.subject || 'your inquiry';
    return {
      message: `Hello ${custName},\n\nThank you for getting in touch with our Support Team regarding "${subj}". ${raw ? `${raw}. ` : 'We have investigated your issue and resolved it according to our platform service guidelines. '}Please let us know if there is anything else we can assist you with.\n\nBest regards,\nCustomer Support Team`
    };
  }

  if (task === 'vendor_ticket') {
    const topic = context?.subject || raw || 'Merchant Account & Payout Inquiry';
    const cat = context?.category || 'Payments & Payouts';
    return {
      message: `Dear Admin Support Desk,\n\nWe are writing to report an issue under ${cat} regarding: "${topic}".\n\nIssue Details:\n${raw || 'We have detected a reconciliation discrepancy in our latest settlement batch and require administrative verification.'}\n\nPlease review and advise on the next steps at your earliest convenience.\n\nThank you,\nMerchant Operations Team`
    };
  }

  if (task === 'resolution_summary') {
    return {
      message: raw ? `Resolution confirmed: ${raw}` : `Inquiry verified and successfully resolved with customer satisfaction.`
    };
  }

  return { result: raw || 'Content generated successfully.' };
}

/**
 * Construct prompts for different writing tasks
 */
function buildTaskPrompt(task, input, context) {
  const rating = Number(context?.rating) || 5;
  const prodName = context?.productName || 'the product';
  const category = context?.category || '';
  const orderId = context?.orderId || '';
  const rawNotes = String(input || '').trim();

  let system = 'You are a helpful e-commerce copywriting AI. Output only clean text or exact JSON as requested. Do not include conversational greetings.';
  let user = '';

  if (task === 'review_full') {
    user = `You are a real customer writing a verified buyer product review for "${prodName}".
Star Rating: ${rating} out of 5 stars.
Customer's quick raw notes: "${rawNotes || 'Great product, satisfied with purchase'}".
Generate a realistic, natural customer review with:
1) A catchy, authentic headline (5 to 8 words, no exclamation overkill).
2) A detailed, helpful review body (3 to 4 sentences explaining experience, delivery, and quality).

Respond ONLY with valid JSON in this exact structure:
{"headline": "...", "review": "..."}`;
  } else if (task === 'review_headline') {
    user = `Write ONE concise, catchy customer review headline (under 8 words) for "${prodName}".
Star rating: ${rating}/5.
User notes: "${rawNotes}".
Output ONLY the headline text without quotes.`;
  } else if (task === 'review_body') {
    user = `Write an authentic, helpful product review body (2 to 4 sentences) for "${prodName}".
Star rating: ${rating}/5.
User notes: "${rawNotes}".
Output ONLY the review paragraph text.`;
  } else if (task === 'support_ticket' || task === 'warranty_claim') {
    const isWarranty = context?.isWarranty || task === 'warranty_claim';
    if (isWarranty) {
      const serial = context?.serialNumber ? `Serial Number: "${context.serialNumber}".` : '';
      const claimType = context?.claimType || 'repair';
      const issueCat = context?.issueCategory || category || 'Hardware Defect';
      user = `You are a customer raising an official warranty claim for "${prodName}".
${serial}
Issue Category: "${issueCat}".
Service Requested: "${claimType}".
Customer's brief symptom notes: "${rawNotes || 'Device malfunctioning during standard use'}".
Write a clear, professional defect description for the authorized warranty service center:
1) Specific fault symptoms observed and when they occur.
2) Basic troubleshooting steps already tried (e.g. restarts, cable checks).
3) A brief confirmation that the device is in good physical condition (no liquid/crack damage) and request for warranty ${claimType}.
Keep it concise and structured (2 short paragraphs or bullet points). Output ONLY the issue description text.`;
    } else {
      user = `Write a polite, professional, and clear customer support ticket message.
Product/Topic: "${prodName}".
Category: "${category || 'General Support'}".
${orderId ? `Order Reference: "${orderId}".` : ''}
Customer's brief summary of what happened: "${rawNotes || 'Need help with my order'}".
Write 2 to 3 structured paragraphs explaining the issue and requesting assistance.
Output ONLY the message body.`;
    }
  } else if (task === 'support_reply') {
    const custName = context?.customerName || 'Customer';
    const subj = context?.subject || prodName;
    const history = context?.history || '';
    user = `You are an expert customer service representative writing an official administrative support response to ${custName}.
Ticket Subject: "${subj}"
Ticket Status after reply: "${context?.status || 'resolved'}"
${history ? `Previous Context: "${history}"` : ''}
Staff's notes / points to convey: "${rawNotes || `We have addressed and resolved your issue regarding ${subj}.`}".
Write an empathetic, reassuring, professional support reply (2 to 3 concise sentences).
Output ONLY the reply message text.`;
  } else if (task === 'vendor_ticket') {
    const topic = context?.subject || rawNotes || 'Merchant Support';
    const cat = context?.category || 'Payments & Payouts';
    user = `You are a verified seller/merchant on an e-commerce platform submitting a support ticket to Platform Administration.
Subject: "${topic}"
Category: "${cat}"
Priority: "${context?.priority || 'Medium'}"
Seller's notes / explanation: "${rawNotes || 'Requesting review and resolution for this merchant matter.'}".
Write a professional, structured business support message explaining the issue and asking admin to assist.
Output ONLY the message body text.`;
  } else if (task === 'resolution_summary') {
    user = `Write a concise 1-sentence formal ticket resolution summary note for internal records:
Subject: "${context?.subject || prodName}"
Action Taken: "${rawNotes || 'Verified issue and resolved successfully for customer.'}".
Output ONLY the 1-sentence resolution note.`;
  } else if (task === 'product_description') {
    user = `Write a high-converting, professional e-commerce product description for:
Product Name: "${prodName}"
Category: "${category}"
${context?.price ? `Price: ₹${context.price}` : ''}
Key notes/features from seller: "${rawNotes}".
Include a brief compelling introduction paragraph, followed by a bulleted "Key Features" list and "Warranty & Support" note.
Output clean markdown text.`;
  } else if (task === 'product_title') {
    user = `Generate a clean, SEO-friendly e-commerce product title for:
Base Name: "${prodName}"
Category: "${category}"
Details: "${rawNotes}".
Output ONLY the title string (under 75 characters).`;
  } else if (task === 'broadcast_announcement') {
    user = `Draft an administrative e-commerce announcement/notification:
Topic: "${rawNotes || prodName}".
Audience: "${context?.audience || 'All Platform Customers'}".
Respond ONLY in valid JSON:
{"title": "Punchy Notification Title (under 8 words)", "message": "Clear announcement message (2-3 sentences)"}`;
  } else {
    user = `Polish, fix grammar, and improve the tone of this text for an e-commerce platform:
"${rawNotes}"
Desired tone: ${context?.tone || 'professional, friendly and clear'}.
Output ONLY the refined text.`;
  }

  return { system, user };
}

/**
 * Universal AI Generation Runner
 */
async function generateAiText({ task = 'review_full', input = '', context = {}, options = {} }) {
  const { system, user } = buildTaskPrompt(task, input, context);
  const preferredProvider = options.provider || 'auto'; // 'auto' | 'ollama' | 'groq' | 'gemini' | 'openrouter'

  // 1. TIER 0: Local Ollama (if requested or auto and available)
  if (preferredProvider === 'ollama' || preferredProvider === 'auto') {
    const ollamaStatus = await checkOllamaAvailability();
    if (ollamaStatus.available) {
      try {
        const modelToUse = options.model || ollamaStatus.defaultModel || 'llama3.2';
        const res = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user }
            ],
            temperature: 0.6,
            max_tokens: 500
          }),
          signal: AbortSignal.timeout(6000)
        });

        if (res.ok) {
          const data = await res.json();
          const rawContent = cleanGeneratedText(data.choices?.[0]?.message?.content || '');
          if (rawContent) {
            if (task === 'review_full' || task === 'broadcast_announcement') {
              const parsed = parseJsonOrExtract(rawContent, generateHeuristicText(task, input, context));
              return { ...parsed, provider: 'ollama', model: modelToUse, free: true };
            }
            return { result: rawContent, text: rawContent, message: rawContent, provider: 'ollama', model: modelToUse, free: true };
          }
        }
      } catch (err) {
        console.warn('[AI-Write] Ollama execution error, falling back:', err.message);
      }
    }
  }

  // 2. TIER 1: Groq Cloud (Ultra-Fast LPU Free Tier)
  if ((preferredProvider === 'auto' || preferredProvider === 'groq') && isGroqConfigured()) {
    try {
      const apiKey = getGroqApiKey();
      const modelName = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          temperature: 0.5,
          max_tokens: 500
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const data = await res.json();
        const rawContent = cleanGeneratedText(data.choices?.[0]?.message?.content || '');
        if (rawContent) {
          if (task === 'review_full' || task === 'broadcast_announcement') {
            const parsed = parseJsonOrExtract(rawContent, generateHeuristicText(task, input, context));
            return { ...parsed, provider: 'groq', model: modelName, free: true };
          }
          return { result: rawContent, text: rawContent, message: rawContent, provider: 'groq', model: modelName, free: true };
        }
      }
    } catch (err) {
      console.warn('[AI-Write] Groq execution error, falling back:', err.message);
    }
  }

  // 3. TIER 2: Google Gemini (Free Tier)
  if ((preferredProvider === 'auto' || preferredProvider === 'gemini') && isGeminiConfigured()) {
    try {
      const model = getGeminiModel();
      if (model) {
        const fullPrompt = `${system}\n\nTask:\n${user}`;
        const result = await model.generateContent(fullPrompt);
        const rawContent = cleanGeneratedText(result.response.text());
        if (rawContent) {
          if (task === 'review_full' || task === 'broadcast_announcement') {
            const parsed = parseJsonOrExtract(rawContent, generateHeuristicText(task, input, context));
            return { ...parsed, provider: 'gemini', model: 'gemini-2.5-flash', free: true };
          }
          return { result: rawContent, text: rawContent, message: rawContent, provider: 'gemini', model: 'gemini-2.5-flash', free: true };
        }
      }
    } catch (err) {
      console.warn('[AI-Write] Gemini execution error, falling back:', err.message);
    }
  }

  // 4. TIER 3: OpenRouter Free Models
  if ((preferredProvider === 'auto' || preferredProvider === 'openrouter') && isOpenRouterConfigured()) {
    try {
      const apiKey = getOpenRouterApiKey();
      const modelName = DEFAULT_MODELS[0] || 'openrouter/free';
      const res = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          max_tokens: 500
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const data = await res.json();
        const rawContent = cleanGeneratedText(data.choices?.[0]?.message?.content || '');
        if (rawContent) {
          if (task === 'review_full' || task === 'broadcast_announcement') {
            const parsed = parseJsonOrExtract(rawContent, generateHeuristicText(task, input, context));
            return { ...parsed, provider: 'openrouter', model: modelName, free: true };
          }
          return { result: rawContent, text: rawContent, message: rawContent, provider: 'openrouter', model: modelName, free: true };
        }
      }
    } catch (err) {
      console.warn('[AI-Write] OpenRouter execution error, falling back:', err.message);
    }
  }

  // 5. TIER 4: Smart Offline Heuristic Generator
  const fallback = generateHeuristicText(task, input, context);
  return {
    ...fallback,
    provider: 'smart_heuristic',
    model: 'offline_ecom_v1',
    free: true
  };
}

/**
 * Get status of available providers and models
 */
async function getAiWriteStatus() {
  const ollama = await checkOllamaAvailability();
  return {
    ollama: {
      available: ollama.available,
      url: OLLAMA_BASE_URL,
      models: ollama.models,
      defaultModel: ollama.defaultModel
    },
    providers: [
      { id: 'auto', name: 'Smart Auto (Best Available)', available: true, free: true },
      { id: 'ollama', name: 'Ollama (Local Private & Free)', available: ollama.available, free: true },
      { id: 'groq', name: 'Groq LPU (Ultra-Fast Free)', available: isGroqConfigured(), free: true },
      { id: 'gemini', name: 'Google Gemini (Creative Free)', available: isGeminiConfigured(), free: true },
      { id: 'openrouter', name: 'OpenRouter (Open Weights Free)', available: isOpenRouterConfigured(), free: true }
    ],
    defaultProvider: ollama.available ? 'ollama' : 'auto'
  };
}

module.exports = {
  generateAiText,
  getAiWriteStatus,
  checkOllamaAvailability
};
