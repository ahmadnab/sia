// Gemini API Service for Sia
// Uses Google's Gemini 1.5 Flash model

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Using gemini-2.5-flash - current free tier model (Jan 2026)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Check if Gemini is configured
export const isGeminiConfigured = () => {
  return !!(GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key');
};

// Base function to call Gemini API
const callGemini = async (prompt, systemInstruction = '') => {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini API key not configured');
  }

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API error');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

// ========================
// SURVEY QUESTION GENERATION
// ========================

export const generateSurveyQuestions = async (topic) => {
  const systemInstruction = `You are an educational survey designer. You MUST respond with ONLY valid JSON, no markdown, no explanation.`;
  
  const prompt = `Generate 5 survey questions about "${topic}" for university students.

Requirements:
- Mix of scale (1-10) and text questions
- Focus on student experience
- Be specific to the topic

Respond with ONLY this JSON format (no markdown code blocks, no other text):
[{"type":"scale","question":"Your question here","min":1,"max":10,"minLabel":"Low","maxLabel":"High"},{"type":"text","question":"Your question here"}]`;

  try {
    const response = await callGemini(prompt, systemInstruction);
    
    // Try to extract JSON from response (handle various formats)
    // 1. Try to find JSON array in the response
    const jsonMatch = response.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    
    // 2. Try to parse the entire response as JSON
    try {
      const directParse = JSON.parse(response.trim());
      if (Array.isArray(directParse)) {
        return directParse;
      }
    } catch {
      // Not direct JSON, continue to fallback
    }
    
    console.warn('Could not parse Gemini response, using fallback questions. Response:', response.substring(0, 200));
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
  const systemInstruction = `You are a sentiment analysis expert for educational feedback. Analyze student responses with empathy and accuracy.`;
  
  const prompt = `Analyze the sentiment of this student feedback:

"${text}"

Return ONLY a JSON object with this exact format:
{
  "score": <number from 0-100, where 0 is very negative and 100 is very positive>,
  "tags": [<array of 2-4 relevant keyword tags like "TimeManagement", "ClearInstructions", "Stress", etc.>],
  "summary": "<one sentence summary of the feedback>"
}`;

  try {
    const response = await callGemini(prompt, systemInstruction);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
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
  // Safety check for crisis keywords
  const crisisKeywords = ['suicide', 'kill myself', 'end my life', 'self-harm', 'hurt myself'];
  const lowerMessage = message.toLowerCase();
  
  if (crisisKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return {
      response: `I'm really concerned about what you've shared. Please know that you're not alone, and there are people who want to help.

**Please reach out to these resources immediately:**
- **National Suicide Prevention Lifeline:** 988 (US)
- **Crisis Text Line:** Text HOME to 741741
- **International Association for Suicide Prevention:** https://www.iasp.info/resources/Crisis_Centres/

Your wellbeing matters. Please talk to your course coordinator, a counselor, or someone you trust right away.`,
      isCrisisResponse: true
    };
  }

  const systemInstruction = `You are Sia, a supportive academic peer assistant for university students. 

Key behaviors:
- The user is currently in: ${milestone}
- Tailor your advice to their academic stage
- Be warm, encouraging, but concise
- Do NOT do their homework for them - guide them to learn
- If they seem distressed, suggest talking to their course coordinator
- Keep responses under 150 words
- Use a friendly, peer-like tone`;

  // Build conversation context
  const conversationContext = chatHistory.length > 0 
    ? `Previous conversation:\n${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser's new message: ${message}`
    : message;

  try {
    const response = await callGemini(conversationContext, systemInstruction);
    return {
      response: response.trim(),
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
      averageSentiment: 0
    };
  }

  const systemInstruction = `You are an educational analytics expert. Summarize student feedback for course coordinators in a clear, actionable way.`;
  
  const feedbackTexts = responses
    .slice(0, 20) // Limit to last 20 for API efficiency
    .map(r => r.answerText || '')
    .filter(t => t.length > 0)
    .join('\n---\n');

  const prompt = `Analyze these anonymous student feedback responses:

${feedbackTexts}

Provide a summary for the course coordinator. Return ONLY a JSON object:
{
  "summary": "<2-3 sentence executive summary of overall sentiment and key points>",
  "themes": [<array of top 3-5 recurring themes/issues mentioned>],
  "actionItems": [<array of 2-3 suggested actions based on feedback>]
}`;

  try {
    const response = await callGemini(prompt, systemInstruction);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      // Calculate average sentiment from responses
      const sentimentScores = responses.filter(r => r.sentimentScore != null).map(r => r.sentimentScore);
      result.averageSentiment = sentimentScores.length > 0 
        ? Math.round(sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length)
        : 50;
      return result;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Summary generation error:', error);
    return {
      summary: 'Unable to generate summary. Please try again.',
      themes: [],
      actionItems: [],
      averageSentiment: 50
    };
  }
};
