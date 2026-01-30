import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, Bot, User, AlertTriangle, Trash2, History, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { chatWithSia } from '../../services/gemini';
import { subscribeToChatHistory, saveChatMessage, clearChatHistory } from '../../services/firebase';
import LoadingSpinner from '../../components/LoadingSpinner';
import { renderMarkdown } from '../../utils/markdown';

const StudentChat = () => {
  const { studentMilestone, configStatus } = useApp();
  const [studentEmail, setStudentEmail] = useState(() => localStorage.getItem('studentEmail') || '');
  const [showEmailPrompt, setShowEmailPrompt] = useState(!localStorage.getItem('studentEmail'));
  const [emailInput, setEmailInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when student email is set
  useEffect(() => {
    if (!studentEmail || !configStatus.firebase) {
      setIsLoadingHistory(false);
      // Set welcome message if no history
      if (!studentEmail && messages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm Sia, your academic companion. I see you're in ${studentMilestone}. How can I help you today? 😊`
        }]);
      }
      return;
    }

    const unsubscribe = subscribeToChatHistory(studentEmail, (history) => {
      if (history.length > 0) {
        setMessages(history.map(msg => ({
          role: msg.role,
          content: msg.content,
          isCrisis: msg.isCrisis || false
        })));
      } else {
        // No history, show welcome message
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm Sia, your academic companion. I see you're in ${studentMilestone}. How can I help you today! 😊`
        }]);
      }
      setIsLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [studentEmail, studentMilestone, configStatus.firebase]);

  const handleSetEmail = () => {
    const email = emailInput.trim();
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    localStorage.setItem('studentEmail', email);
    setStudentEmail(email);
    setShowEmailPrompt(false);
  };

  const handleClearHistory = async () => {
    const confirmed = window.confirm('Are you sure you want to clear your chat history? This cannot be undone.');
    if (!confirmed) return;

    if (configStatus.firebase) {
      await clearChatHistory(studentEmail);
    }
    setMessages([{
      role: 'assistant',
      content: `Hi! I'm Sia, your academic companion. I see you're in ${studentMilestone}. How can I help you today? 😊`
    }]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to UI immediately
    const userMsg = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);

    // Save user message to Firebase
    if (configStatus.firebase && studentEmail) {
      await saveChatMessage(studentEmail, 'user', userMessage);
    }

    setIsLoading(true);

    try {
      let assistantResponse;
      let isCrisis = false;

      if (!configStatus.gemini) {
        // Demo mode response
        await new Promise(resolve => setTimeout(resolve, 1000));
        assistantResponse = "I'm in demo mode right now! Add your DeepSeek API key to `.env` to enable real AI responses. In the meantime, feel free to explore the interface. 🎯";
      } else {
        const chatHistory = messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));

        const result = await chatWithSia(userMessage, studentMilestone, chatHistory);
        assistantResponse = result.response;
        isCrisis = result.isCrisisResponse;
      }

      // Add assistant message to UI
      const assistantMsg = {
        role: 'assistant',
        content: assistantResponse,
        isCrisis: isCrisis
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Save assistant message to Firebase
      if (configStatus.firebase && studentEmail) {
        await saveChatMessage(studentEmail, 'assistant', assistantResponse);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting. Please try again in a moment."
      };
      setMessages(prev => [...prev, errorMsg]);

      // Save error message to Firebase
      if (configStatus.firebase && studentEmail) {
        await saveChatMessage(studentEmail, 'assistant', errorMsg.content);
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Email prompt modal
  if (showEmailPrompt) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700">
          <div className="w-16 h-16 bg-sky-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-2">Welcome to Sia!</h2>
          <p className="text-slate-400 text-center mb-6">
            Enter your email to start chatting. Your chat history will be saved and synced.
          </p>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSetEmail()}
            placeholder="your.email@university.edu"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent mb-4"
            autoFocus
          />
          <button
            onClick={handleSetEmail}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-lg font-medium transition-colors"
          >
            Start Chatting
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 lg:px-8 py-4 lg:py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-4">
            <Link to="/student" className="p-2 -ml-2 hover:bg-slate-700 rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-slate-400" />
            </Link>
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-sky-500 rounded-full flex items-center justify-center">
                <Bot size={20} className="text-white lg:w-6 lg:h-6" />
              </div>
              <div>
                <h1 className="font-semibold lg:text-lg text-white">Sia</h1>
                <p className="text-xs lg:text-sm text-slate-400">Your Academic Companion</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="View chat history"
            >
              <History size={18} className="text-slate-400" />
            </button>
            <button
              onClick={handleClearHistory}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Clear chat history"
            >
              <Trash2 size={18} className="text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Chat History Panel */}
      <AnimatePresence>
        {showHistoryPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryPanel(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-slate-800 border-l border-slate-700 z-50 overflow-hidden flex flex-col"
            >
              {/* Panel Header */}
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <History size={20} className="text-sky-400" />
                  Chat History
                </h2>
                <button
                  onClick={() => setShowHistoryPanel(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 dark-scrollbar">
                {/* Statistics */}
                <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-medium text-slate-300">Conversation Stats</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Total Messages</p>
                      <p className="text-2xl font-bold text-white mt-1">{messages.length}</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Your Messages</p>
                      <p className="text-2xl font-bold text-sky-400 mt-1">
                        {messages.filter(m => m.role === 'user').length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Message History */}
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-3">Recent Messages</h3>
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">No messages yet</p>
                    ) : (
                      messages.slice().reverse().slice(0, 20).map((msg, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-sky-500/10 border border-sky-500/30'
                              : 'bg-slate-900/50 border border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {msg.role === 'user' ? (
                              <User size={14} className="text-sky-400" />
                            ) : (
                              <Bot size={14} className="text-slate-400" />
                            )}
                            <span className="text-xs font-medium text-slate-400">
                              {msg.role === 'user' ? 'You' : 'Sia'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 line-clamp-3">
                            {msg.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 dark-scrollbar">
        <div className="max-w-5xl mx-auto space-y-4 lg:space-y-5">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <LoadingSpinner size="lg" light />
                <p className="text-slate-400 mt-4">Loading chat history...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-3 lg:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-slate-700'
                    : message.isCrisis
                      ? 'bg-red-500'
                      : 'bg-sky-500'
                }`}>
                  {message.role === 'user'
                    ? <User size={16} className="text-slate-300 lg:w-5 lg:h-5" />
                    : message.isCrisis
                      ? <AlertTriangle size={16} className="text-white lg:w-5 lg:h-5" />
                      : <Bot size={16} className="text-white lg:w-5 lg:h-5" />
                  }
                </div>
                <div className={`max-w-[80%] lg:max-w-[75%] rounded-2xl px-4 py-3 lg:px-5 lg:py-4 ${
                  message.role === 'user'
                    ? 'bg-sky-500 text-white'
                    : message.isCrisis
                      ? 'bg-red-500/20 border border-red-500/50 text-slate-100'
                      : 'bg-slate-800 text-slate-100'
                }`}>
                  <div className="text-sm lg:text-base">
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      renderMarkdown(message.content)
                    )}
                  </div>
                </div>
              </motion.div>
              ))}
            </AnimatePresence>
          )}

          {isLoading && !isLoadingHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 lg:gap-4"
            >
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-sky-500 rounded-full flex items-center justify-center">
                <Bot size={16} className="text-white lg:w-5 lg:h-5" />
              </div>
              <div className="bg-slate-800 rounded-2xl px-4 py-3 lg:px-5 lg:py-4">
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" light />
                  <span className="text-sm lg:text-base text-slate-400">Sia is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="bg-slate-800 border-t border-slate-700 p-4 lg:p-6">
        <div className="max-w-5xl mx-auto flex gap-3 lg:gap-4">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-3 lg:px-6 lg:py-4 text-sm lg:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 lg:w-14 lg:h-14 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors"
          >
            <Send size={20} className="text-white lg:w-6 lg:h-6" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default StudentChat;
