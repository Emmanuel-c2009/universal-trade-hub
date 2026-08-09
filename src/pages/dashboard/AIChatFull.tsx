import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send,
  Plus,
  X,
  Clock,
  Sparkles,
  Brain,
  History,
  ChevronLeft,
  ChevronRight,
  Database,
  BookOpen,
  Bot,
  User,
  Loader2,
  Trash2,
  Mic,
  MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { aiGatewayService } from "@/services/aiGatewayService";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";
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

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

interface KnowledgeBaseEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
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

const AIChatFull = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseEntry[]>([]);
  const [isKnowledgeBaseLoading, setIsKnowledgeBaseLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [attachedFileUrls, setAttachedFileUrls] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

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

  // Get user
  useEffect(() => {
    mountedRef.current = true;
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mountedRef.current && user) {
        setUserId(user.id);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profileData) setProfile(profileData);
        loadKnowledgeBase();
      }
    };
    getUser();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load knowledge base
  const loadKnowledgeBase = async () => {
    setIsKnowledgeBaseLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      
      if (mountedRef.current && data) {
        setKnowledgeBase(data);
        console.log(`📚 Loaded ${data.length} knowledge base entries`);
      }
    } catch (error) {
      console.error('Error loading knowledge base:', error);
    } finally {
      setIsKnowledgeBaseLoading(false);
    }
  };

  // Load chat sessions
  const loadSessions = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (mountedRef.current && data) {
        const sessionsWithMessages = await Promise.all(
          data.map(async (session: any) => {
            const { data: messagesData } = await supabase
              .from('ai_chat_messages')
              .select('*')
              .eq('session_id', session.id)
              .order('created_at', { ascending: true });

            return {
              ...session,
              messages: messagesData || []
            };
          })
        );

        setSessions(sessionsWithMessages);

        if (sessionsWithMessages.length > 0 && !currentSession) {
          setCurrentSession(sessionsWithMessages[0]);
          setMessages(sessionsWithMessages[0].messages);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }, [userId, currentSession]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Create new chat
  const createNewChat = useCallback(async () => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: userId,
          title: 'New Chat',
        })
        .select()
        .single();

      if (error) throw error;

      const newSession: ChatSession = {
        ...data,
        messages: []
      };

      setSessions((prev: ChatSession[]) => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
      toast.success('New chat created');
      return newSession;
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create new chat');
      return null;
    }
  }, [userId]);

  // Delete chat
  const deleteChat = async (sessionId: string) => {
    if (!userId) return;

    try {
      await supabase
        .from('ai_chat_messages')
        .delete()
        .eq('session_id', sessionId);

      await supabase
        .from('ai_chat_sessions')
        .delete()
        .eq('id', sessionId);

      setSessions((prev: ChatSession[]) => prev.filter((s: ChatSession) => s.id !== sessionId));
      
      if (currentSession?.id === sessionId) {
        const remaining = sessions.filter((s: ChatSession) => s.id !== sessionId);
        if (remaining.length > 0) {
          setCurrentSession(remaining[0]);
          setMessages(remaining[0].messages);
        } else {
          setCurrentSession(null);
          setMessages([]);
        }
      }

      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  // Send message
  const sendMessage = useCallback(async (messageText?: string) => {
    const messageToSend = messageText || input.trim();
    
    console.log('🔴 sendMessage CALLED (Full Page)');
    console.log('📝 Message to send:', messageToSend);
    
    if (!messageToSend) {
      toast.warning('Please type a message');
      return;
    }

    if (!userId) {
      toast.error('Please log in first');
      return;
    }

    if (!currentSession) {
      console.log('⚠️ No session, creating one...');
      const newSession = await createNewChat();
      if (!newSession) {
        toast.error('Failed to create chat session');
        return;
      }
      await loadSessions();
      const { data: freshSession } = await supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (freshSession) {
        setCurrentSession({
          ...freshSession,
          messages: []
        });
        await new Promise((resolve: any) => setTimeout(resolve, 100));
      }
    }

    const sessionId = currentSession?.id;
    if (!sessionId) {
      toast.error('No chat session found');
      return;
    }

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
      await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: sessionId,
          role: 'user',
          content: userMessage.content
        });

      const conversationHistory = messages.map((m: ChatMessage) => ({
        role: m.role,
        content: m.content
      }));

      conversationHistory.push({
        role: 'user',
        content: userMessage.content
      });

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

      await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: sessionId,
          role: 'assistant',
          content: assistantMessage.content
        });

      if (messages.length === 0) {
        const title = messageToSend.length > 30 ? messageToSend.substring(0, 30) + '...' : messageToSend;
        await supabase
          .from('ai_chat_sessions')
          .update({ title })
          .eq('id', sessionId);

        setSessions((prev: ChatSession[]) => prev.map((s: ChatSession) => 
          s.id === sessionId ? { ...s, title } : s
        ));
        setCurrentSession((prev: ChatSession | null) => prev ? { ...prev, title } : null);
      }

      await supabase
        .from('ai_chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  }, [input, userId, currentSession, messages, createNewChat, loadSessions, language, attachedFileUrls]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSendClick = () => {
    sendMessage();
  };

  useEffect(() => {
    const cleanupOldMessages = async () => {
      if (!userId) return;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      try {
        const { data: oldSessions } = await supabase
          .from('ai_chat_sessions')
          .select('id')
          .eq('user_id', userId)
          .lt('updated_at', thirtyDaysAgo.toISOString());

        if (oldSessions && oldSessions.length > 0) {
          const sessionIds = oldSessions.map((s: any) => s.id);
          await supabase
            .from('ai_chat_messages')
            .delete()
            .in('session_id', sessionIds);
          await supabase
            .from('ai_chat_sessions')
            .delete()
            .in('id', sessionIds);
          loadSessions();
        }
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    };

    cleanupOldMessages();
    const interval = setInterval(cleanupOldMessages, 3600000);
    return () => clearInterval(interval);
  }, [userId, loadSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const userName = profile?.full_name || "User";

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader
        userName={userName}
        onMenuClick={() => setSidebarOpen(true)}
        pageTitle="AI Chat Assistant"
        avatarUrl={profile?.avatar_url}
      />

      <main className="container mx-auto px-4 pt-28 max-w-7xl h-[calc(100vh-7rem)]">
        <div className="flex h-full gap-4">
          {/* History Sidebar */}
          <motion.div
            initial={{ width: isHistoryOpen ? 280 : 0 }}
            animate={{ width: isHistoryOpen ? 280 : 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="w-[280px] h-full bg-[#1a0b2e] rounded-xl border border-[#DA123E33] p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-[#DA123E]" />
                  History
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsHistoryOpen(false)}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>

              <Button
                onClick={createNewChat}
                className="w-full mb-4 bg-[#DA123E] hover:bg-[#DA123E]/80 text-white"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>

              <div className="mb-3 px-2 py-1.5 bg-white/5 rounded-lg flex items-center gap-2">
                <Database className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-gray-400">
                  {isKnowledgeBaseLoading ? 'Loading...' : `${knowledgeBase.length} FAQs loaded`}
                </span>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-1">
                  {sessions.map((session: ChatSession) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-2 rounded-lg cursor-pointer transition-all duration-200 group ${
                        currentSession?.id === session.id
                          ? 'bg-[#DA123E]/20 border border-[#DA123E33]'
                          : 'hover:bg-white/5'
                      }`}
                      onClick={() => {
                        setCurrentSession(session);
                        setMessages(session.messages);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">
                            {session.title || 'New Chat'}
                          </p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            deleteChat(session.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>

              <div className="pt-4 border-t border-white/5 mt-4">
                <p className="text-[10px] text-gray-500 text-center">
                  Conversations auto-delete after 30 days
                </p>
              </div>
            </div>
          </motion.div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-[#1a0b2e] rounded-xl border border-[#DA123E33] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#DA123E33]">
              <div className="flex items-center gap-3">
                {!isHistoryOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsHistoryOpen(true)}
                    className="text-gray-400 hover:text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
                <Brain className="w-5 h-5 text-[#DA123E]" />
                <span className="text-white font-semibold">AI Chat Assistant</span>
                <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block mr-1 animate-pulse" />
                  Active
                </Badge>
                {knowledgeBase.length > 0 && (
                  <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">
                    <BookOpen className="w-3 h-3 mr-1" />
                    {knowledgeBase.length} FAQs
                  </Badge>
                )}
                
                {/* ✅ Language Dropdown */}
                <select
                  value={language}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLanguage(e.target.value)}
                  className="bg-white/5 border border-[#DA123E33] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#DA123E]"
                >
                  {languages.map((lang: { code: string; label: string }) => (
                    <option key={lang.code} value={lang.code} className="bg-[#1a0b2e]">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={createNewChat}
                className="text-gray-400 hover:text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Brain className="w-16 h-16 text-[#DA123E]/30 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Ask me anything</h3>
                  <p className="text-sm text-gray-400 max-w-md">
                    I'm your AI trading assistant. Ask me about trading strategies, 
                    market analysis, or anything else you need help with.
                  </p>
                  {knowledgeBase.length > 0 && (
                    <p className="text-xs text-blue-400 mt-2">
                      📚 I'm trained on {knowledgeBase.length} FAQs from Universal Stock Trade
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message: ChatMessage) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="w-8 h-8">
                          {message.role === 'assistant' ? (
                            <AvatarFallback className="bg-[#DA123E] text-white text-xs">
                              <Bot className="w-4 h-4" />
                            </AvatarFallback>
                          ) : (
                            <AvatarFallback className="bg-purple-500 text-white text-xs">
                              {profile?.full_name?.[0] || 'U'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className={`rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-purple-500/20 text-white'
                            : 'bg-white/5 text-white'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </p>
                          {message.role === 'assistant' && userId && currentSession?.id && (
                            <AIFeedback 
                              messageId={message.id}
                              sessionId={currentSession.id}
                              userId={userId}
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-[#DA123E] text-white text-xs">
                            <Bot className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-white/5 rounded-lg px-4 py-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
            <div className="p-4 border-t border-[#DA123E33]">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? '🎤 Listening...' : 'Type your message...'}
                  className="flex-1 bg-white/5 border-[#DA123E33] text-white placeholder:text-gray-400"
                  disabled={loading || isListening}
                />
                
                {/* File Attachment */}
                {userId && (
                  <FileAttachment
                    userId={userId}
                    onFileAttached={(urls: string[]) => setAttachedFileUrls(urls)}
                    onFileRemoved={() => setAttachedFileUrls([])}
                    multiple={true}
                    maxFiles={5}
                  />
                )}
                
                {/* Microphone Button */}
                {isSupported && (
                  <Button
                    onClick={toggleListening}
                    disabled={loading}
                    className={`${
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
                  className="bg-[#DA123E] hover:bg-[#DA123E]/80 text-white"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              
              {isListening && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '600ms' }} />
                  </div>
                  <span className="text-[10px] text-red-400">Listening... Speak now</span>
                </div>
              )}
              
              {knowledgeBase.length > 0 && (
                <p className="text-[10px] text-gray-500 mt-2 text-center">
                  🔍 I search our FAQ database to give you accurate answers
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default AIChatFull;