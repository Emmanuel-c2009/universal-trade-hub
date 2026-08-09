import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send,
  X,
  Brain,
  MessageSquare,
  Minimize2,
  Maximize2,
  Sparkles,
  TrendingUp,
  Shield,
  Search,
  Lightbulb,
  Zap,
  Database,
  User,
  Bot,
  Loader2,
  Mic,
  MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { aiGatewayService } from "@/services/aiGatewayService";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { FileAttachment } from "@/components/FileAttachment";
import { AIFeedback } from "@/components/AIFeedback";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ✅ Language options
const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
];

export const AIChatPanel = ({ isOpen, onClose }: AIChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [knowledgeBaseCount, setKnowledgeBaseCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [language, setLanguage] = useState('en');
  const [attachedFileUrls, setAttachedFileUrls] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  // ✅ Quick Action Questions
  const quickActions = [
    { 
      id: 'funding',
      icon: TrendingUp, 
      label: 'Funding Info',
      question: "How much funding can I get?"
    },
    { 
      id: 'withdraw',
      icon: Zap, 
      label: 'Withdrawal Process',
      question: "How do I withdraw my funds?"
    },
    { 
      id: 'fees',
      icon: Shield, 
      label: 'Fee Structure',
      question: "What are the withdrawal fees?"
    },
    { 
      id: 'scam',
      icon: Search, 
      label: 'Scam Prevention',
      question: "How do I avoid scams?"
    },
    { 
      id: 'strategy',
      icon: Lightbulb, 
      label: 'Trading Strategy',
      question: "Help me build a trading strategy"
    },
  ];

  // ✅ Voice Input Hook
  const { 
    isListening, 
    isSupported, 
    toggleListening 
  } = useVoiceInput({
    lang: language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'en-US',
    onResult: (text: string) => {
      setInput((prev: string) => prev + (prev ? ' ' : '') + text);
    },
    onError: (error: string) => {
      toast.error(error);
    },
  });

  // Get user and load session
  useEffect(() => {
    mountedRef.current = true;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mountedRef.current && user) {
        setUserId(user.id);
        await loadOrCreateSession(user.id);
        await getSessionCount(user.id);
        await getKnowledgeBaseCount();
      }
    };
    init();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Get knowledge base count
  const getKnowledgeBaseCount = async () => {
    try {
      const { count, error } = await supabase
        .from('ai_knowledge_base')
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        setKnowledgeBaseCount(count);
      }
    } catch (error) {
      console.error('Error getting knowledge base count:', error);
    }
  };

  // Get session count
  const getSessionCount = async (uid: string) => {
    try {
      const { count, error } = await supabase
        .from('ai_chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid);

      if (!error && count !== null) {
        setSessionCount(count);
      }
    } catch (error) {
      console.error('Error getting session count:', error);
    }
  };

  // Load or create chat session
  const loadOrCreateSession = async (uid: string) => {
    try {
      const { data: sessions } = await supabase
        .from('ai_chat_sessions')
        .select('id')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })
        .limit(1);

      let sessionId = sessions?.[0]?.id;

      if (!sessionId) {
        const { data: newSession, error } = await supabase
          .from('ai_chat_sessions')
          .insert({ user_id: uid, title: 'Chat Panel' })
          .select()
          .single();

        if (error) throw error;
        sessionId = newSession.id;
        setSessionCount((prev: number) => prev + 1);
      }

      setSessionId(sessionId);

      const { data: messagesData } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messagesData) {
        setMessages(messagesData);
      }

    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  // ✅ Send message with ALL features
  const sendMessage = useCallback(async (messageText?: string) => {
    const messageToSend = messageText || input.trim();
    
    console.log('🔴 sendMessage CALLED (Panel)');
    console.log('📝 Message to send:', messageToSend);
    
    if (!messageToSend) {
      toast.warning('Please type a message');
      return;
    }

    if (!userId) {
      toast.error('Please log in first');
      return;
    }

    if (!sessionId) {
      toast.error('No chat session found');
      return;
    }

    // ✅ Build message with file attachments
    let fullMessage = messageToSend;
    if (attachedFileUrls.length > 0) {
      const fileInfo = attachedFileUrls.map((url: string) => `[Attached File: ${url}]`).join('\n');
      fullMessage = `${messageToSend}\n\n${fileInfo}`;
      console.log('📎 Attached files:', attachedFileUrls.length);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: fullMessage,
      created_at: new Date().toISOString()
    };

    setMessages((prev: ChatMessage[]) => [...prev, userMessage]);
    setInput("");
    setAttachedFileUrls([]);
    setLoading(true);

    try {
      // Save user message
      await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: sessionId,
          role: 'user',
          content: userMessage.content
        });

      // Build conversation history
      const conversationHistory = messages.map((m: ChatMessage) => ({
        role: m.role,
        content: m.content
      }));

      conversationHistory.push({
        role: 'user',
        content: userMessage.content
      });

      // ✅ Call the Edge Function with language
      console.log('🤖 Calling AI Gateway...');
      
      let response = '';
      
      try {
        response = await aiGatewayService.chat(
          conversationHistory,
          'Universal Stock Trade AI Assistant',
          language
        );
        console.log('✅ AI Gateway success');
      } catch (aiError) {
        console.error('❌ AI Gateway failed:', aiError);
        response = "I'm sorry, I'm having trouble connecting to my AI services right now. Please try again in a moment.";
      }

      const assistantMessage: ChatMessage = {
        id: Date.now().toString() + '-assistant',
        role: 'assistant',
        content: response || 'Sorry, I could not process your request.',
        created_at: new Date().toISOString()
      };

      setMessages((prev: ChatMessage[]) => [...prev, assistantMessage]);

      // Save assistant message
      await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: sessionId,
          role: 'assistant',
          content: assistantMessage.content
        });

      // Update session timestamp
      await supabase
        .from('ai_chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      console.log('✅ Message sent successfully');

    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  }, [input, userId, sessionId, messages, language, attachedFileUrls]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle send button click
  const handleSendClick = () => {
    sendMessage();
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          height: isMinimized ? 'auto' : '620px',
          width: isMinimized ? 'auto' : '420px',
        }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-24 right-4 z-50 bg-[#0f0a1a] rounded-2xl border border-[#DA123E33] shadow-2xl shadow-[#DA123E]/10 overflow-hidden"
        style={{
          width: isMinimized ? 'auto' : '420px',
          height: isMinimized ? 'auto' : '620px',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#DA123E]/10 to-[#ff2b4f]/5 border-b border-[#DA123E33]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#DA123E]/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#DA123E]" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">AI Trading Assistant</span>
              <div className="flex items-center gap-1.5">
                <Badge className="bg-emerald-500/20 text-emerald-500 text-[8px] h-4">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block mr-1 animate-pulse" />
                  Online
                </Badge>
                {knowledgeBaseCount > 0 && (
                  <Badge className="bg-blue-500/10 text-blue-400 text-[8px] h-4">
                    <Database className="w-2.5 h-2.5 mr-0.5" />
                    {knowledgeBaseCount} FAQs
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* ✅ Language Dropdown */}
            <select
              value={language}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLanguage(e.target.value)}
              className="bg-white/5 border border-[#DA123E33] rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-[#DA123E] max-w-[80px]"
            >
              {languages.map((lang: { code: string; label: string }) => (
                <option key={lang.code} value={lang.code} className="bg-[#1a0b2e]">
                  {lang.label}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-white rounded-full hover:bg-white/5"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-white rounded-full hover:bg-white/5"
              onClick={onClose}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4 h-[400px]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center text-center h-full justify-center">
                  <div className="w-16 h-16 rounded-full bg-[#DA123E]/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-[#DA123E]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">How can I help you with your trading today?</h3>
                  <p className="text-xs text-gray-400 max-w-[280px] mb-4">
                    Ask me about funding, withdrawals, fees, trading strategies, or anything about Universal Stock Trade.
                  </p>
                  
                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 w-full max-w-[340px]">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="sm"
                          className="h-auto py-2.5 px-3 border-[#DA123E33] hover:border-[#DA123E] hover:bg-[#DA123E]/5 text-left justify-start gap-2 text-white/80 hover:text-white text-xs"
                          onClick={() => sendMessage(action.question)}
                          disabled={loading}
                        >
                          <Icon className="w-3.5 h-3.5 text-[#DA123E] flex-shrink-0" />
                          <span className="line-clamp-2">{action.question}</span>
                        </Button>
                      );
                    })}
                  </div>

                  {/* Stats */}
                  <div className="mt-4 flex items-center gap-4 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {messages.length} messages
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {sessionCount} sessions
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Database className="w-3 h-3 text-emerald-400" />
                      {knowledgeBaseCount} FAQs loaded
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-600 mt-2">
                    🔗 Connected to Universal Stock Trade
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message: ChatMessage) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start gap-2 max-w-[88%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="w-7 h-7 flex-shrink-0">
                          <AvatarFallback className={message.role === 'assistant' ? 'bg-[#DA123E] text-white text-[9px]' : 'bg-purple-500/30 text-white text-[9px]'}>
                            {message.role === 'assistant' ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`rounded-xl px-3.5 py-2 text-sm ${
                          message.role === 'user'
                            ? 'bg-purple-500/20 text-white'
                            : 'bg-white/5 text-white/90'
                        }`}>
                          <p className="whitespace-pre-wrap text-xs leading-relaxed">{message.content}</p>
                          <p className="text-[8px] text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </p>
                          {/* ✅ Feedback buttons for assistant messages */}
                          {message.role === 'assistant' && userId && sessionId && (
                            <AIFeedback 
                              messageId={message.id}
                              sessionId={sessionId}
                              userId={userId}
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7 flex-shrink-0">
                          <AvatarFallback className="bg-[#DA123E] text-white text-[9px]">
                            <Bot className="w-3.5 h-3.5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-white/5 rounded-xl px-4 py-2.5">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input Section */}
            <div className="p-3 border-t border-[#DA123E33] bg-[#0f0a1a]/50">
              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? '🎤 Listening...' : 'Type your question...'}
                  className="flex-1 bg-white/5 border-[#DA123E33] text-white placeholder:text-gray-500 h-9 text-sm rounded-xl focus-visible:ring-[#DA123E]"
                  disabled={loading || isListening}
                />
                
                {/* ✅ File Attachment */}
                {userId && (
                  <FileAttachment
                    userId={userId}
                    onFileAttached={(urls: string[]) => setAttachedFileUrls(urls)}
                    onFileRemoved={() => setAttachedFileUrls([])}
                    multiple={true}
                    maxFiles={5}
                  />
                )}
                
                {/* ✅ Microphone Button */}
                {isSupported && (
                  <Button
                    onClick={toggleListening}
                    disabled={loading}
                    className={`h-9 w-9 p-0 rounded-xl transition-all duration-200 ${
                      isListening 
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                        : 'bg-white/5 hover:bg-white/10 text-white border border-[#DA123E33]'
                    }`}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                )}

                <Button
                  onClick={handleSendClick}
                  disabled={loading || !input.trim() || isListening}
                  className="bg-[#DA123E] hover:bg-[#DA123E]/80 text-white h-9 w-9 p-0 rounded-xl"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              
              {/* ✅ Listening indicator */}
              {isListening && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '600ms' }} />
                  </div>
                  <span className="text-[10px] text-red-400">Listening... Speak now</span>
                </div>
              )}
              
              {knowledgeBaseCount > 0 && (
                <p className="text-[8px] text-gray-500 mt-1.5 text-center">
                  🔍 I search our {knowledgeBaseCount} FAQ database to give you accurate answers
                </p>
              )}
              <p className="text-[8px] text-gray-600 text-center mt-0.5">
                ⚠️ Not financial advice. Trading involves risk.
              </p>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default AIChatPanel;