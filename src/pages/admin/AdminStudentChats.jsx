import { useState, useEffect } from 'react';
import { MessageCircle, Search, Users, AlertTriangle, TrendingUp, FileText, X, ChevronRight, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import AdminLayout from '../../components/AdminLayout';
import { getChatAnalytics, subscribeToCohorts, subscribeToChatHistory, getCachedChatSummary, saveChatSummaryCache } from '../../services/firebase';
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

  // Load cohorts and students
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Load cohorts for filter
      const unsubCohorts = subscribeToCohorts(setCohorts);

      // Load students with chat data
      try {
        const data = await getChatAnalytics();
        setStudents(data);
        setFilteredStudents(data);
      } catch (error) {
        console.error('Error loading chat analytics:', error);
      }

      setIsLoading(false);

      return () => unsubCohorts();
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
      <div className="min-h-screen">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-sky-500 rounded-xl flex items-center justify-center">
              <MessageCircle size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Chat Analytics</h1>
              <p className="text-slate-600 dark:text-slate-400">Monitor and support student conversations with Sia</p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Risk Level Filter */}
            <div>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Risk Levels</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
              </select>
            </div>

            {/* Cohort Filter */}
            <div>
              <select
                value={cohortFilter}
                onChange={(e) => setCohortFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Cohorts</option>
                {cohorts.map(cohort => (
                  <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <Users className="text-sky-500" size={20} />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Students</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{filteredStudents.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-500" size={20} />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">High Risk</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {filteredStudents.filter(s => s.riskLevel === 'high').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-amber-500" size={20} />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Medium Risk</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {filteredStudents.filter(s => s.riskLevel === 'medium').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <MessageCircle className="text-green-500" size={20} />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Active Chats</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
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
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-sky-500 dark:hover:border-sky-500 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
                        {student.name || 'Unknown Student'}
                      </h3>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getRiskBadgeColor(student.riskLevel)}`}>
                        {student.riskLevel || 'unknown'} risk
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{student.email}</p>

                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <MessageCircle size={14} />
                        {student.messageCount} messages
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {cohorts.find(c => c.id === student.cohortId)?.name || 'No cohort'}
                      </span>
                      {student.lastMessageAt && (
                        <span className="text-slate-500 dark:text-slate-500">
                          Last active {formatDate(student.lastMessageAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="text-slate-400 group-hover:text-sky-500 transition-colors" size={20} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

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
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
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
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

                    {chatSummary.concerns && chatSummary.concerns.length > 0 && (
                      <div className="mb-4">
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
                          <div className={`max-w-[80%] rounded-xl p-4 ${
                            msg.role === 'user'
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
