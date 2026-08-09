import { supabase } from "@/integrations/supabase/client";

interface AIGatewayResponse {
  success: boolean;
  result: string;
  action: string;
  provider: string;
  model: string;
  error?: string;
  errorType?: string;
}

export const aiGatewayService = {
  /**
   * Send a chat message to the AI via Supabase Edge Function
   */
  async chat(
    messages: Array<{ role: string; content: string }>, 
    context?: string,
    language: string = 'en'
  ): Promise<string> {
    console.log('📤 Sending chat to AI Gateway...');
    console.log('📝 Messages:', messages.length);
    console.log('🌐 Language:', language);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ No session found');
      throw new Error('You must be logged in to use the AI assistant');
    }

    console.log('👤 User authenticated:', session.user.id);

    const request = {
      action: 'chat',
      messages: messages,
      context: context || 'Universal Stock Trade AI Assistant',
      language: language,
    };

    try {
      const response = await supabase.functions.invoke('ai-chat', {
        body: request,
      });

      if (response.error) {
        console.error('❌ AI Gateway error:', response.error);
        throw new Error(response.error.message || 'AI service error');
      }

      const data = response.data as AIGatewayResponse;
      
      if (!data.success) {
        console.error('❌ AI Gateway response error:', data.error);
        throw new Error(data.error || 'AI service error');
      }

      console.log('✅ AI Gateway response received, provider:', data.provider);
      console.log('📝 Response length:', data.result.length);
      
      return data.result;
    } catch (error) {
      console.error('❌ AI Gateway service error:', error);
      throw error;
    }
  },

  async translate(text: string, targetLanguage: string): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to use the AI assistant');
    }

    const response = await supabase.functions.invoke('ai-chat', {
      body: {
        action: 'translate',
        content: text,
        context: `Translate to ${targetLanguage}`,
        language: 'en',
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Translation failed');
    }

    const data = response.data as AIGatewayResponse;
    if (!data.success) {
      throw new Error(data.error || 'Translation failed');
    }

    return data.result;
  },

  async analyze(text: string): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to use the AI assistant');
    }

    const response = await supabase.functions.invoke('ai-chat', {
      body: {
        action: 'analyze',
        content: text,
        context: 'Analyze this trading-related content',
        language: 'en',
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Analysis failed');
    }

    const data = response.data as AIGatewayResponse;
    if (!data.success) {
      throw new Error(data.error || 'Analysis failed');
    }

    return data.result;
  },

  async improve(text: string): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to use the AI assistant');
    }

    const response = await supabase.functions.invoke('ai-chat', {
      body: {
        action: 'improve',
        content: text,
        context: 'Improve this trading-related content',
        language: 'en',
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Text improvement failed');
    }

    const data = response.data as AIGatewayResponse;
    if (!data.success) {
      throw new Error(data.error || 'Text improvement failed');
    }

    return data.result;
  },
};