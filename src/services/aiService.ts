import { supabase } from "@/integrations/supabase/client";

export interface AIResponse {
  text: string;
  error?: string;
  provider?: 'gemini' | 'groq';
}

export const aiService = {
  /**
   * Send a message to Gemini API
   */
  async geminiChat(prompt: string): Promise<AIResponse> {
    try {
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!GEMINI_API_KEY) {
        console.warn('Gemini API key not configured');
        return { text: '', error: 'Gemini API key not configured' };
      }

      console.log('🟢 Calling Gemini API...');
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              temperature: 0.7, 
              maxOutputTokens: 4096 
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        return { text: '', error: `Gemini API error: ${response.status}` };
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (!text) {
        return { text: '', error: 'Gemini returned empty response' };
      }
      
      console.log('✅ Gemini success');
      return { text, provider: 'gemini' };
    } catch (error: any) {
      console.error('Gemini request failed:', error);
      return { text: '', error: error.message || 'Gemini request failed' };
    }
  },

  /**
   * Send a message to Groq API
   */
  async groqChat(prompt: string): Promise<AIResponse> {
    try {
      const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
      
      if (!GROQ_API_KEY) {
        console.warn('Groq API key not configured');
        return { text: '', error: 'Groq API key not configured' };
      }

      console.log('🔵 Trying Groq API...');
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq API error:', response.status, errorText);
        return { text: '', error: `Groq API error: ${response.status}` };
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      
      if (!text) {
        return { text: '', error: 'Groq returned empty response' };
      }
      
      console.log('✅ Groq success');
      return { text, provider: 'groq' };
    } catch (error: any) {
      console.error('Groq request failed:', error);
      return { text: '', error: error.message || 'Groq request failed' };
    }
  },

  /**
   * Send a message to AI with fallback (Gemini → Groq)
   */
  async chat(prompt: string): Promise<AIResponse> {
    // Try Gemini first
    let response = await this.geminiChat(prompt);
    
    // If Gemini fails, try Groq
    if (response.error) {
      console.warn('Gemini failed, trying Groq...');
      response = await this.groqChat(prompt);
    }
    
    return response;
  },
};