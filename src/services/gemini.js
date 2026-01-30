// DeepSeek API Service for Sia (replacing Gemini)
// Uses DeepSeek's reasoner model for chat and chat model for other features

const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// ========================
// INPUT SANITIZATION
// ========================

// Sanitize user input to prevent prompt injection attacks
const sanitizePromptInput = (input, maxLength = 5000) => {
  if (!input || typeof input !== 'string') return '';
  
  // Truncate to max length
  let sanitized = input.slice(0, maxLength);
  
  // Remove potential prompt injection patterns
  // These patterns attempt to override system instructions
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|context)/gi,
    /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)/gi,
    /forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)/gi,
    /new\s+instructions?:/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
  ];
  
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '[filtered]');
  }
  
  return sanitized.trim();
};

// Validate that input is a non-empty string
const validateInput = (input, fieldName = 'input') => {
  if (!input || typeof input !== 'string') {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
  return trimmed;
};

// Model configurations
const MODELS = {
  REASONER: 'deepseek-reasoner', // Thinking model for student chat
  CHAT: 'deepseek-chat'          // Standard model for other features
};

// Check if DeepSeek is configured (keeping function name for compatibility)
export const isGeminiConfigured = () => {
  return !!(DEEPSEEK_API_KEY && DEEPSEEK_API_KEY !== 'your_deepseek_api_key');
};

// Base function to call DeepSeek API
const callDeepSeek = async (messages, model = MODELS.CHAT, maxTokens = 2048, temperature = 0.7) => {
  if (!isGeminiConfigured()) {
    throw new Error('DeepSeek API key not configured');
  }

  const requestBody = {
    model: model,
    messages: messages,
    temperature: temperature,
    max_tokens: maxTokens
  };

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();

    // Check if response was cut off
    const finishReason = data.choices?.[0]?.finish_reason;
    if (finishReason === 'length') {
      console.warn('Response truncated due to max_tokens limit. Consider increasing maxTokens.');
    }

    // Extract response content
    const content = data.choices?.[0]?.message?.content || '';

    // For reasoner model, also extract reasoning if available (optional, not used for now)
    const reasoning = data.choices?.[0]?.message?.reasoning_content || null;

    return { content, reasoning };
  } catch (error) {
    console.error('DeepSeek API call failed:', error);
    throw error;
  }
};

// ========================
// SURVEY QUESTION GENERATION
// ========================

export const generateSurveyQuestions = async (topic) => {
  // Validate and sanitize input
  let safeTopic;
  try {
    safeTopic = sanitizePromptInput(validateInput(topic, 'topic'), 500);
  } catch {
    // Return fallback questions if topic is invalid
    return [
      { type: 'scale', question: 'How would you rate your overall experience?', min: 1, max: 10, minLabel: 'Poor', maxLabel: 'Excellent' },
      { type: 'text', question: 'What aspects did you find most helpful?' },
      { type: 'scale', question: 'How clear were the instructions?', min: 1, max: 10, minLabel: 'Unclear', maxLabel: 'Very Clear' },
      { type: 'text', question: 'What improvements would you suggest?' },
      { type: 'text', question: 'Any additional comments?' }
    ];
  }

  const messages = [
    {
      role: 'system',
      content: 'You are an educational survey designer. You MUST respond with ONLY valid JSON, no markdown, no explanation.'
    },
    {
      role: 'user',
      content: `Generate 5 survey questions about "${safeTopic}" for university students.

Requirements:
- Mix of scale (1-10) and text questions
- Focus on student experience
- Be specific to the topic

Respond with ONLY this JSON format (no markdown code blocks, no other text):
[{"type":"scale","question":"Your question here","min":1,"max":10,"minLabel":"Low","maxLabel":"High"},{"type":"text","question":"Your question here"}]`
    }
  ];

  try {
    const { content } = await callDeepSeek(messages, MODELS.CHAT, 1024, 0.7);

    // Try to extract JSON from response (handle various formats)
    // 1. Try to find JSON array in the response
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // 2. Try to parse the entire response as JSON
    try {
      const directParse = JSON.parse(content.trim());
      if (Array.isArray(directParse)) {
        return directParse;
      }
    } catch {
      // Not direct JSON, continue to fallback
    }

    console.warn('Could not parse DeepSeek response, using fallback questions. Response:', content.substring(0, 200));
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Survey generation error:', error);
    // Return fallback questions
    return [
      { type: 'scale', question: `How would you rate your experience with ${topic}?`, min: 1, max: 10, minLabel: 'Poor', maxLabel: 'Excellent' },
      { type: 'text', question: `What aspects of ${topic} did you find most helpful?` },
      { type: 'scale', question: `How clear were the instructions related to ${topic}?`, min: 1, max: 10, minLabel: 'Unclear', maxLabel: 'Very Clear' },
      { type: 'text', question: `What improvements would you suggest for ${topic}?` },
      { type: 'text', question: `Any additional comments about ${topic}?` }
    ];
  }
};

// ========================
// SENTIMENT ANALYSIS
// ========================

export const analyzeSentiment = async (text) => {
  // Validate and sanitize input
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      score: 50,
      tags: ['Empty'],
      summary: 'No text provided'
    };
  }
  
  const safeText = sanitizePromptInput(text, 2000);
  
  const messages = [
    {
      role: 'system',
      content: 'You are a sentiment analysis expert for educational feedback. Analyze student responses with empathy and accuracy.'
    },
    {
      role: 'user',
      content: `Analyze the sentiment of this student feedback:

"${safeText}"

Return ONLY a JSON object with this exact format:
{
  "score": <number from 0-100, where 0 is very negative and 100 is very positive>,
  "tags": [<array of 2-4 relevant keyword tags like "TimeManagement", "ClearInstructions", "Stress", etc.>],
  "summary": "<one sentence summary of the feedback>"
}`
    }
  ];

  try {
    const { content } = await callDeepSeek(messages, MODELS.CHAT, 512, 0.7);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    // Return neutral fallback
    return {
      score: 50,
      tags: ['Feedback'],
      summary: 'Feedback received'
    };
  }
};

// ========================
// STUDENT CHAT (Sia AI Companion)
// ========================

export const chatWithSia = async (message, milestone = 'Student', chatHistory = []) => {
  // Validate input
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return {
      response: "I didn't catch that. Could you please try again?",
      isCrisisResponse: false
    };
  }
  
  // Sanitize the message (but keep original for crisis detection)
  const originalMessage = message.trim();
  const safeMessage = sanitizePromptInput(originalMessage, 2000);
  
  // Safety check for crisis keywords (use original message for accurate detection)
  const crisisKeywords = ['suicide', 'kill myself', 'end my life', 'self-harm', 'hurt myself'];
  const lowerMessage = originalMessage.toLowerCase();

  if (crisisKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return {
      response: `I'm really concerned about what you've shared. Please know that you're not alone, and there are people who want to help.

*Please reach out to these resources immediately:*

- National Suicide Prevention Lifeline: 988 (US)
- Crisis Text Line: Text HOME to 741741
- International Association for Suicide Prevention: [crisis centers](https://www.iasp.info/resources/Crisis_Centres/)

Your wellbeing matters. Please talk to your course coordinator, a counselor, or someone you trust right away.`,
      isCrisisResponse: true
    };
  }

  const systemInstruction = `You are Sia, a supportive and knowledgeable academic companion for university students. You're like a helpful peer who genuinely cares about their success and wellbeing.

CONTEXT:
- Student is currently in: ${milestone}
- Tailor all advice to their specific academic stage and challenges

CORE PRINCIPLES:
1. Be empathetic and understanding - acknowledge their feelings
2. Be encouraging and positive - celebrate small wins
3. Be practical - provide actionable, specific advice
4. Be honest - if you don't know, say so and suggest resources
5. Guide, don't solve - help them learn, don't do their work

COMMUNICATION STYLE:
- Use natural, conversational language (like texting a friend)
- Keep responses concise (100-150 words max)
- Break complex ideas into simple steps
- Use bullet lists (-) for multiple points when helpful
- Use examples when helpful
- Avoid jargon unless necessary
- Write in plain, readable text - avoid excessive formatting
- Use *emphasis* sparingly, only for critical points

BOUNDARIES:
- Never solve homework or assignments directly
- If they show signs of serious distress (anxiety, depression, crisis), compassionately suggest speaking with their course coordinator or counselor
- Don't provide medical, legal, or financial advice
- Stay focused on academic support and student wellbeing

HELPFUL STRATEGIES:
- Ask clarifying questions when needed
- Suggest study techniques, time management tips
- Recommend breaking large tasks into smaller steps
- Encourage reaching out to professors during office hours
- Remind them about campus resources (library, tutoring, counseling)

Remember: You're here to support and empower them, not replace human mentors and instructors.`;

  // Build messages array with chat history
  const messages = [
    {
      role: 'system',
      content: systemInstruction
    }
  ];

  // Add chat history
  chatHistory.forEach(msg => {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  });

  // Add current message (sanitized)
  messages.push({
    role: 'user',
    content: safeMessage
  });

  try {
    // Use reasoner model for deeper thinking in chat
    const { content } = await callDeepSeek(messages, MODELS.REASONER, 2048, 0.7);
    return {
      response: content.trim(),
      isCrisisResponse: false
    };
  } catch (error) {
    console.error('Chat error:', error);
    return {
      response: "I'm having trouble connecting right now. Please try again in a moment, or reach out to your course coordinator if you need immediate help.",
      isCrisisResponse: false
    };
  }
};

// ========================
// ADMIN SUMMARY GENERATION
// ========================

export const generateResponseSummary = async (responses) => {
  if (!responses || responses.length === 0) {
    return {
      summary: 'No responses to analyze yet.',
      themes: [],
      themeSentiments: [],
      actionItems: [],
      averageSentiment: 0
    };
  }

  const feedbackTexts = responses
    .slice(0, 20) // Limit to last 20 for API efficiency
    .map(r => sanitizePromptInput(r.answerText || '', 500))
    .filter(t => t.length > 0)
    .join('\n---\n');

  const messages = [
    {
      role: 'system',
      content: 'You are an educational analytics expert. Summarize student feedback for course coordinators in a clear, actionable way.'
    },
    {
      role: 'user',
      content: `Analyze these anonymous student feedback responses:

${feedbackTexts}

Provide a summary for the course coordinator. Return ONLY a JSON object:
{
  "summary": "<2-3 sentence executive summary of overall sentiment and key points>",
  "themes": [<array of top 3-5 recurring themes/issues mentioned as simple strings>],
  "themeSentiments": [
    {"theme": "<theme name>", "sentiment": <0-100 score>, "mentions": <count of responses mentioning this>},
    ...for each theme
  ],
  "actionItems": [<array of 2-3 suggested actions based on feedback>]
}

IMPORTANT: themeSentiments must include a sentiment score (0=very negative, 100=very positive) for each theme based on how students feel about that specific topic.`
    }
  ];

  try {
    // Use higher token limit for summary generation
    const { content } = await callDeepSeek(messages, MODELS.CHAT, 2048, 0.7);

    // Try to extract complete JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        // Calculate average sentiment from responses
        const sentimentScores = responses.filter(r => r.sentimentScore != null).map(r => r.sentimentScore);
        result.averageSentiment = sentimentScores.length > 0
          ? Math.round(sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length)
          : 50;
        // Ensure themeSentiments exists
        if (!result.themeSentiments) {
          result.themeSentiments = [];
        }
        return result;
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response:', content);
        throw new Error('Invalid JSON in response');
      }
    }
    console.error('No JSON found in response:', content);
    throw new Error('Invalid response format - no JSON object found');
  } catch (error) {
    console.error('Summary generation error:', error);
    return {
      summary: 'Unable to generate summary. Please try again.',
      themes: [],
      themeSentiments: [],
      actionItems: [],
      averageSentiment: 50
    };
  }
};

// ========================
// CHAT CONVERSATION SUMMARY
// ========================

export const generateChatSummary = async (chatMessages, studentInfo = {}) => {
  if (!chatMessages || chatMessages.length === 0) {
    return {
      summary: 'No chat history available.',
      topics: [],
      sentiment: 'neutral',
      concerns: [],
      recommendations: [],
      riskLevel: 'low'
    };
  }

  // Build conversation transcript (sanitize user messages)
  const transcript = chatMessages
    .slice(-50) // Last 50 messages for context efficiency
    .map(msg => {
      const content = msg.role === 'user' 
        ? sanitizePromptInput(msg.content || '', 500)
        : (msg.content || '');
      return `${msg.role === 'user' ? 'Student' : 'Sia'}: ${content}`;
    })
    .join('\n\n');

  const studentContext = studentInfo.name
    ? `Student: ${studentInfo.name} (${studentInfo.email})\nCohort: ${studentInfo.cohortName || 'N/A'}\nRisk Level: ${studentInfo.riskLevel || 'unknown'}\n\n`
    : '';

  const messages = [
    {
      role: 'system',
      content: `You are an educational counselor analyzing student chat conversations. Provide insights for course coordinators to better support students.

Focus on:
1. Main topics and concerns discussed
2. Overall student sentiment and wellbeing indicators
3. Any red flags or areas needing attention
4. Actionable recommendations for support

Be empathetic, professional, and privacy-conscious.`
    },
    {
      role: 'user',
      content: `Analyze this chat conversation between a student and Sia (AI academic companion):

${studentContext}CONVERSATION TRANSCRIPT:
${transcript}

Provide a comprehensive analysis. Return ONLY a JSON object:
{
  "summary": "<2-3 sentence executive summary of the conversation and student's situation>",
  "topics": [<array of 3-5 main topics or concerns discussed>],
  "sentiment": "<overall student sentiment: positive, neutral, concerned, or distressed>",
  "concerns": [<array of specific concerns or red flags, empty if none>],
  "recommendations": [<array of 2-3 actionable recommendations for staff>],
  "riskLevel": "<assessed risk level: low, medium, or high>"
}`
    }
  ];

  try {
    const { content } = await callDeepSeek(messages, MODELS.CHAT, 2048, 0.7);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        return result;
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response:', content);
        throw new Error('Invalid JSON in response');
      }
    }
    console.error('No JSON found in response:', content);
    throw new Error('Invalid response format - no JSON object found');
  } catch (error) {
    console.error('Chat summary generation error:', error);
    return {
      summary: 'Unable to generate summary. Please review conversation manually.',
      topics: ['Error generating summary'],
      sentiment: 'neutral',
      concerns: [],
      recommendations: ['Review chat history manually'],
      riskLevel: 'unknown'
    };
  }
};
