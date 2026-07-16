import { executeMultiSearch } from './search';

// System Prompts for different Modes
const SYSTEM_PROMPTS = {
  general: `You are NexusAI, a highly intelligent, premium, and friendly personal assistant. 
Your goal is to provide accurate, comprehensive, and well-structured answers.
Use clear headers, bullet points, and formatting to make your answers readable.`,

  study: `You are NexusAI, an elite academic tutor. Your mission is to help the user learn and understand concepts deeply.
- Break down complex topics into digestible parts.
- Use analogies and real-world examples to explain theoretical concepts.
- Highlight key definitions in **bold**.
- At the end of a long explanation, provide a brief bulleted "Study Summary" or "Takeaways".
- Suggest related concepts for further reading.`,

  code: `You are NexusAI, an expert software developer and coding coach.
- Provide clean, highly optimized, and readable code blocks.
- Always add brief comments in the code explaining complex logic.
- Include a short, bulleted explanation of how the code works below the snippet.
- Format all code with proper language tags (e.g., \`\`\`javascript, \`\`\`python).`,

  quiz: `You are NexusAI, a supportive but strict examiner. 
The user wants to test their knowledge on a topic.
- You must ask EXACTLY ONE question at a time.
- DO NOT list all questions at once.
- Wait for the user to answer the current question.
- Once they reply:
  1. Evaluate their answer (provide constructive feedback, tell them if it's correct/incorrect).
  2. Reward them (e.g., "Correct! +10 XP").
  3. Ask the next question.
- Keep track of the current question number (e.g. "Question 2 of 5").
- At the end of the quiz, display their final score and a brief summary of how they did.`
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        attempt++;
        if (attempt >= maxRetries) {
          return response;
        }

        // Try to parse the error message to get the exact wait time
        let waitMs = 5000; // Default fallback to 5 seconds
        try {
          const clonedResponse = response.clone();
          const errorData = await clonedResponse.json();
          const message = errorData?.error?.message || '';
          const match = message.match(/Please retry in (\d+\.?\d*)s/i);
          if (match) {
            const seconds = parseFloat(match[1]);
            waitMs = Math.ceil((seconds + 1.0) * 1000); // Add 1s safety buffer
          }
        } catch (e) {
          console.warn('Failed to parse retry duration from 429 response:', e);
        }

        // Wait before retrying
        await delay(waitMs);
        continue;
      }
      return response;
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      await delay(5000);
    }
  }
}

/**
 * Call the Gemini REST API
 * @param {string} apiKey - Google Gemini API Key
 * @param {string} model - e.g. 'gemini-3.1-flash-lite'
 * @param {Array} chatHistory - Thread messages formatted as [{ role: 'user'|'model', text: string }]
 * @param {string} mode - 'general' | 'study' | 'code' | 'quiz'
 * @param {string} customPrompt - Custom instructions set by user
 * @param {boolean} enableSearch - Toggle Google Search Grounding
 * @param {string} fileContext - Attached text file context
 */
export async function queryGemini({
  apiKey,
  model = 'gemini-3.1-flash-lite',
  chatHistory,
  mode = 'general',
  customPrompt = '',
  fileContext = '',
  enableSearch = false,
  provider = 'gemini'
}) {
  if (!apiKey) {
    throw new Error('API key is required. Go to settings to enter your key.');
  }

  // Base system instructions
  let basePrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.general;
  
  if (customPrompt.trim()) {
    basePrompt += `\n\nAdditional User Constraints:\n${customPrompt}`;
  }

  if (fileContext) {
    basePrompt += `\n\n[ATTACHED FILE CONTEXT]:\nThe user has attached a file for this session. Use this information as source material to answer queries:\n"""\n${fileContext}\n"""`;
  }

  // Fallback for stale/invalid model names saved in localStorage
  let activeModel = model;
  if (provider === 'openrouter') {
    const validOpenRouterModels = [
      'openrouter/free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'mistralai/mistral-7b-instruct:free'
    ];
    if (!validOpenRouterModels.includes(activeModel)) {
      activeModel = 'openrouter/free';
    }
  } else {
    const validGeminiModels = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
    if (!validGeminiModels.includes(activeModel)) {
      activeModel = 'gemini-3.1-flash-lite';
    }
  }

  if (provider === 'openrouter') {
    // Format history for OpenRouter
    const messages = [
      { role: 'system', content: basePrompt },
      ...chatHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }))
    ];

    const requestBody = {
      model: activeModel,
      messages: messages,
      temperature: mode === 'quiz' ? 0.5 : 0.7,
      top_p: 0.95,
      max_tokens: 4096
    };

    const url = 'https://openrouter.ai/api/v1/chat/completions';

    try {
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://nexus-ai-chatbot-six.vercel.app',
          'X-Title': 'NexusAI'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const replyText = result.choices?.[0]?.message?.content || 'No response generated.';

      return {
        text: replyText,
        searchQueries: [],
        searchSources: []
      };

    } catch (error) {
      console.error('OpenRouter API Error:', error);
      throw error;
    }
  }

  let contents = chatHistory.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  let searchQueries = [];
  let searchSources = [];
  let webSearchContext = '';

  // --- AGENTIC FLOW: Generate Queries & Fetch Data ---
  if (enableSearch && contents.length > 0) {
    const lastUserMsg = contents[contents.length - 1].parts[0].text;
    
    // Create a temporary prompt for generating queries
    const queryGenPrompt = `Based on the user's latest message, frame 2 to 3 concise Google search queries that would help answer their question accurately. 
Return ONLY a JSON array of strings. No markdown, no other text.
User message: "${lastUserMsg}"`;

    const queryGenBody = {
      contents: [{ role: 'user', parts: [{ text: queryGenPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    };

    try {
      const qRes = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryGenBody)
      });
      if (qRes.ok) {
        const qData = await qRes.json();
        const jsonText = qData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const parsedQueries = JSON.parse(jsonText);
        
        if (Array.isArray(parsedQueries) && parsedQueries.length > 0) {
          searchQueries = parsedQueries;
          webSearchContext = await executeMultiSearch(parsedQueries);
          
          if (webSearchContext) {
            // Add search context strong prompt
            basePrompt += `\n\n[WEB SEARCH MODE ACTIVE]:\nYou have been given live web search results below in the user's message.\nYou MUST prioritize the search results over your training data. Answer based on what the search results say.`;
            
            // Inject into the last user message
            const lastIdx = contents.length - 1;
            contents[lastIdx] = {
              role: 'user',
              parts: [{
                text: `${webSearchContext}\n\n---\n\nUsing the live web search results above, please answer the following question with the most up-to-date information:\n\n${lastUserMsg}`
              }]
            };
            
            // Populate mock sources for UI based on queries
            searchSources = parsedQueries.map((q, i) => ({ title: `Search: ${q}`, url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`, number: i + 1 }));
          }
        }
      }
    } catch (e) {
      console.warn("Failed to generate/execute search queries", e);
    }
  }

  // Build POST body
  const requestBody = {
    contents: contents,
    systemInstruction: {
      parts: [{ text: basePrompt }]
    },
    generationConfig: {
      temperature: mode === 'quiz' ? 0.5 : 0.7,
      topP: 0.95,
      maxOutputTokens: 8192
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    // Extract reply text
    const candidate = result.candidates?.[0];
    const replyText = candidate?.content?.parts?.[0]?.text || 'No response generated.';

    // Note: We handled search queries and sources manually in the agentic flow above.
    // If we were using native Gemini tools, we would extract grounding metadata here.

    return {
      text: replyText,
      searchQueries,
      searchSources,
      webSearchContext
    };

  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}
