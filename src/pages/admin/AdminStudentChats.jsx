import { useState, useEffect } from 'react';
import { MessageCircle, Search, Users, AlertTriangle, TrendingUp, FileText, X, ChevronRight, RefreshCw, Send, Mail, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import AdminLayout from '../../components/AdminLayout';
import { getChatAnalytics, subscribeToCohorts, subscribeToChatHistory, getCachedChatSummary, saveChatSummaryCache, sendDirectMessage, subscribeToAllDirectMessages } from '../../services/firebase';
import { generateChatSummary } from '../../services/gemini';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminStudentChats = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [cohortFilter, setCohortFilter] = useState('all');

  // Modal state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatSummary, setChatSummary] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Direct message state
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [allDirectMessages, setAllDirectMessages] = useState([]);
  const [notification, setNotification] = useState(null);

  // Load cohorts and students
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Load cohorts for filter
      const unsubCohorts = subscribeToCohorts(setCohorts);

      // Load direct messages
      const unsubMessages = subscribeToAllDirectMessages(setAllDirectMessages);

      // Load students with chat data
      try {
        const data = await getChatAnalytics();
        setStudents(data);
        setFilteredStudents(data);
      } catch (error) {
        console.error('Error loading chat analytics:', error);
      }

      setIsLoading(false);

      return () => {
        unsubCohorts();
        unsubMessages();
      };
    };

    loadData();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...students];

    // Risk level filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(s => s.riskLevel === riskFilter);
    }

    // Cohort filter
    if (cohortFilter !== 'all') {
      filtered = filtered.filter(s => s.cohortId === cohortFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query)
      );
    }

    setFilteredStudents(filtered);
  }, [students, riskFilter, cohortFilter, searchQuery]);

  // View student chat details
  const handleViewChat = async (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
    setIsLoadingChat(true);
    setChatHistory([]);
    setChatSummary(null);

    try {
      // Check for cached summary first
      const cachedSummary = await getCachedChatSummary(student.email);
      if (cachedSummary) {
        setChatSummary(cachedSummary);
      }

      // Load chat history
      const unsubscribe = subscribeToChatHistory(student.email, async (messages) => {
        setChatHistory(messages);
        setIsLoadingChat(false);

        // Auto-generate summary only if no cache exists
        if (messages.length > 0 && !cachedSummary) {
          setIsGeneratingSummary(true);
          try {
            const summary = await generateChatSummary(messages, {
              name: student.name,
              email: student.email,
              cohortName: cohorts.find(c => c.id === student.cohortId)?.name,
              riskLevel: student.riskLevel
            });

            // Save to cache
            await saveChatSummaryCache(student.email, {
              ...summary,
              messageCount: messages.length
            });

            setChatSummary(summary);
          } catch (error) {
            console.error('Error generating summary:', error);
          }
          setIsGeneratingSummary(false);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading chat history:', error);
      setIsLoadingChat(false);
    }
  };

  // Refresh chat summary (regenerate)
  const handleRefreshSummary = async () => {
    if (!selectedStudent || chatHistory.length === 0) return;

    setIsGeneratingSummary(true);
    try {
      const summary = await generateChatSummary(chatHistory, {
        name: selectedStudent.name,
        email: selectedStudent.email,
        cohortName: cohorts.find(c => c.id === selectedStudent.cohortId)?.name,
        riskLevel: selectedStudent.riskLevel
      });

      // Save to cache
      await saveChatSummaryCache(selectedStudent.email, {
        ...summary,
        messageCount: chatHistory.length
      });

      setChatSummary(summary);
    } catch (error) {
      console.error('Error refreshing summary:', error);
    }
    setIsGeneratingSummary(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
    setChatHistory([]);
    setChatSummary(null);
    setShowMessageForm(false);
    setMessageSubject('');
    setMessageContent('');
  };

  // Send direct message
  const handleSendMessage = async () => {
    if (!selectedStudent || !messageSubject.trim() || !messageContent.trim()) return;

    setIsSendingMessage(true);
    try {
      await sendDirectMessage(selectedStudent.email, {
        subject: messageSubject.trim(),
        content: messageContent.trim(),
        senderName: 'Course Coordinator'
      });
      setShowMessageForm(false);
      setMessageSubject('');
      setMessageContent('');
      showNotificationMsg('Message sent successfully!', 'success');
    } catch (error) {
      console.error('Error sending message:', error);
      showNotificationMsg('Failed to send message.', 'error');
    }
    setIsSendingMessage(false);
  };

  const showNotificationMsg = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Get messages sent to selected student
  const getStudentMessages = (email) => {
    return allDirectMessages.filter(m => m.studentEmail === email?.toLowerCase());
  };

  // Helper functions
  const getRiskBadgeColor = (level) => {
    switch (level) {
      case 'high': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'medium': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      case 'low': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 dark:text-green-400';
      case 'distressed': return 'text-red-600 dark:text-red-400';
      case 'concerned': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <AdminLayout>
      <div className="min-h-screen p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 right-4 z-50 p-4 rounded-xl flex items-center gap-3 shadow-lg backdrop-blur-md ${notification.type === 'success'
                ? 'bg-green-50/90 dark:bg-green-900/90 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
                : 'bg-red-50/90 dark:bg-red-900/90 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
                }`}
            >
              <span className="font-medium">{notification.message}</span>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/5 rounded-full">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 shadow-xl shadow-indigo-500/20">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-100 mb-2">
                <MessageCircle size={16} className="text-indigo-200" />
                <span className="text-sm font-medium tracking-wide uppercase opacity-90">Student Support</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Chat Analytics
              </h1>
              <p className="text-indigo-100/90 text-lg max-w-xl">
                Monitor student engagement, identify at-risk students, and provide timely support.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all hover:bg-white dark:hover:bg-slate-800"
              />
            </div>

            {/* Risk Level Filter */}
            <div className="relative">
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none transition-all hover:bg-white dark:hover:bg-slate-800"
              >
                <option value="all">All Risk Levels</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
              </select>
              <AlertTriangle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Cohort Filter */}
            <div className="relative">
              <select
                value={cohortFilter}
                onChange={(e) => setCohortFilter(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none transition-all hover:bg-white dark:hover:bg-slate-800"
              >
                <option value="all">All Cohorts</option>
                {cohorts.map(cohort => (
                  <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
                ))}
              </select>
              <Users size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl group-hover:scale-110 transition-transform">
                  <Users className="text-indigo-500" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Students</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{filteredStudents.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-red-200/50 dark:border-red-900/30 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl group-hover:scale-110 transition-transform">
                  <AlertTriangle className="text-red-500" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">High Risk</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {filteredStudents.filter(s => s.riskLevel === 'high').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp className="text-amber-500" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Medium Risk</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {filteredStudents.filter(s => s.riskLevel === 'medium').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl group-hover:scale-110 transition-transform">
                  <MessageCircle className="text-emerald-500" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Chats</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {filteredStudents.filter(s => s.messageCount > 0).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Students List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <MessageCircle className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                {students.length === 0 ? 'No chat history yet' : 'No students match your filters'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {students.length === 0 ? 'Students will appear here once they start chatting with Sia.' : 'Try adjusting your search or filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map(student => (
                <div
                  key={student.id}
                  onClick={() => handleViewChat(student)}
                  className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-5 hover:border-indigo-500/50 dark:hover:border-indigo-400/50 hover:shadow-md transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {student.name || 'Unknown Student'}
                        </h3>
                        <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${getRiskBadgeColor(student.riskLevel)}`}>
                          {student.riskLevel || 'unknown'} risk
                        </span>
                      </div>

                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        {student.email}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded-md">
                          <MessageCircle size={14} className="text-indigo-500" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">{student.messageCount}</span> messages
                        </span>
                        <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded-md">
                          <Users size={14} className="text-slate-500" />
                          {cohorts.find(c => c.id === student.cohortId)?.name || 'No cohort'}
                        </span>
                        {student.lastMessageAt && (
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active {formatDate(student.lastMessageAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between self-stretch">
                      <div className="p-2 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 text-slate-400 group-hover:text-indigo-500 transition-colors">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Detail Modal */}
        <AnimatePresence>
          {isModalOpen && selectedStudent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-800/50 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center">
                      <MessageCircle size={20} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {selectedStudent.name || 'Unknown Student'}
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{selectedStudent.email}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getRiskBadgeColor(selectedStudent.riskLevel)}`}>
                      {selectedStudent.riskLevel || 'unknown'} risk
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowMessageForm(!showMessageForm)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${showMessageForm
                        ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                        : 'bg-sky-500 hover:bg-sky-600 text-white'
                        }`}
                    >
                      <Mail size={16} />
                      Send Message
                    </button>
                    <button
                      onClick={closeModal}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X size={20} className="text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Direct Message Form */}
                  <AnimatePresence>
                    {showMessageForm && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700/50 rounded-xl p-5 space-y-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="text-sky-600 dark:text-sky-400" size={18} />
                          <h3 className="font-semibold text-slate-900 dark:text-white">Send Direct Message</h3>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                          <input
                            type="text"
                            value={messageSubject}
                            onChange={(e) => setMessageSubject(e.target.value)}
                            placeholder="e.g., Follow-up on your concerns"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
                          <textarea
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                            placeholder="Write your message here..."
                            rows={4}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setShowMessageForm(false)}
                            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSendMessage}
                            disabled={!messageSubject.trim() || !messageContent.trim() || isSendingMessage}
                            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isSendingMessage ? (
                              <LoadingSpinner size="sm" light />
                            ) : (
                              <Send size={16} />
                            )}
                            Send
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Previously Sent Messages */}
                  {getStudentMessages(selectedStudent?.email).length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-4">
                        <Mail className="text-slate-500 dark:text-slate-400" size={18} />
                        <h3 className="font-semibold text-slate-900 dark:text-white">Sent Messages ({getStudentMessages(selectedStudent?.email).length})</h3>
                      </div>
                      <div className="space-y-3">
                        {getStudentMessages(selectedStudent?.email).map(msg => (
                          <div key={msg.id} className={`p-3 rounded-lg border ${msg.isRead ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-700/50'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-slate-900 dark:text-white">{msg.subject}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${msg.isRead ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                                {msg.isRead ? 'Read' : 'Unread'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{msg.content}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                              Sent {formatDate(msg.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Summary */}
                  {isGeneratingSummary ? (
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <LoadingSpinner size="sm" />
                        <p className="text-slate-600 dark:text-slate-400">Generating AI summary...</p>
                      </div>
                    </div>
                  ) : chatSummary ? (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <FileText className="text-sky-600 dark:text-sky-400" size={20} />
                          <h3 className="font-semibold text-slate-900 dark:text-white">AI-Generated Summary</h3>
                          {chatSummary.cachedAt && chatSummary.messageCount !== chatHistory.length && (
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                              Update Available
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleRefreshSummary}
                          disabled={isGeneratingSummary || chatHistory.length === 0}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                          title="Refresh summary"
                        >
                          <RefreshCw size={16} className={`text-slate-500 dark:text-slate-400 ${isGeneratingSummary ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                      <div className="bg-gradient-to-br from-sky-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 rounded-xl p-6 border border-sky-200 dark:border-slate-700">
                        <p className="text-slate-700 dark:text-slate-300 mb-4">{chatSummary.summary}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Topics Discussed</p>
                            <div className="flex flex-wrap gap-2">
                              {chatSummary.topics?.map((topic, idx) => (
                                <span key={idx} className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Overall Sentiment</p>
                            <p className={`text-lg font-semibold capitalize ${getSentimentColor(chatSummary.sentiment)}`}>
                              {chatSummary.sentiment}
                            </p>
                          </div>
                        </div>

                        {/* Concerns and Recommendations side by side */}
                        {(chatSummary.concerns?.length > 0 || chatSummary.recommendations?.length > 0) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {chatSummary.concerns && chatSummary.concerns.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="text-amber-600" size={16} />
                                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Concerns Identified</p>
                                </div>
                                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                  {chatSummary.concerns.map((concern, idx) => (
                                    <li key={idx}>{concern}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {chatSummary.recommendations && chatSummary.recommendations.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Recommendations</p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                  {chatSummary.recommendations.map((rec, idx) => (
                                    <li key={idx}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {chatSummary.riskLevel && (
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              AI-Assessed Risk Level: <span className={`font-semibold capitalize ${chatSummary.riskLevel === 'high' ? 'text-red-600' : chatSummary.riskLevel === 'medium' ? 'text-amber-600' : 'text-green-600'}`}>
                                {chatSummary.riskLevel}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Chat History */}
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Chat History ({chatHistory.length} messages)</h3>

                    {isLoadingChat ? (
                      <div className="flex items-center justify-center py-12">
                        <LoadingSpinner size="md" />
                      </div>
                    ) : chatHistory.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                        No chat history available
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {chatHistory.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] rounded-xl p-4 ${msg.role === 'user'
                              ? 'bg-sky-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                              }`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminStudentChats;
