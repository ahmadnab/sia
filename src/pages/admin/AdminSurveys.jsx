import { useState, useEffect } from 'react';
import { Plus, Sparkles, X, Check, Clock, Archive, Edit2, Trash2, GripVertical, Send, FileText, Bell, Users, Mail, Calendar, ChevronDown, ChevronUp, TrendingUp, Tag, BarChart3, MessageSquare, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../../components/AdminLayout';
import { subscribeToSurveys, subscribeToCohorts, createSurvey, closeSurvey, publishSurvey, deleteSurvey, getSurveyResponsesWithStudents, saveSurveyAnalysisCache, getSurveyAnalysisCache, deleteSurveyAnalysisCache } from '../../services/firebase';
import { generateSurveyQuestions, generateResponseSummary } from '../../services/gemini';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminSurveys = () => {
  const { configStatus } = useApp();
  const [surveys, setSurveys] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState(null);
  const [expandedSurveys, setExpandedSurveys] = useState(new Set());

  // Survey creation mode: 'manual' or 'ai'
  const [creationMode, setCreationMode] = useState('ai');

  // New survey form
  const [newSurvey, setNewSurvey] = useState({
    title: '',
    topic: '',
    questions: [],
    cohortId: '', // Target cohort
    publishImmediately: true
  });

  // Editing state for individual questions
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);

  // Responses modal state
  const [isResponsesModalOpen, setIsResponsesModalOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [surveyResponses, setSurveyResponses] = useState([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);

  // Theme analysis state
  const [themeAnalysis, setThemeAnalysis] = useState(null);
  const [isAnalyzingThemes, setIsAnalyzingThemes] = useState(false);
  const [activeTab, setActiveTab] = useState('themes'); // 'themes' or 'responses'

  // Cache for theme analysis results (keyed by survey ID)
  const [analysisCache, setAnalysisCache] = useState({});

  useEffect(() => {
    const unsubSurveys = subscribeToSurveys(setSurveys);
    const unsubCohorts = subscribeToCohorts(setCohorts);
    return () => {
      unsubSurveys();
      unsubCohorts();
    };
  }, []);

  const handleViewResponses = async (survey) => {
    setSelectedSurvey(survey);
    setIsResponsesModalOpen(true);
    setIsLoadingResponses(true);
    setActiveTab('themes');
    setThemeAnalysis(null);

    try {
      // Check for cached analysis in Firebase first
      const cachedAnalysis = await getSurveyAnalysisCache(survey.id);
      if (cachedAnalysis) {
        setThemeAnalysis(cachedAnalysis);
        setAnalysisCache(prev => ({ ...prev, [survey.id]: cachedAnalysis }));
      }

      const responses = await getSurveyResponsesWithStudents(survey.id);
      setSurveyResponses(responses);

      // Only auto-analyze if we don't have cached results and have responses
      if (!cachedAnalysis && responses.length > 0 && configStatus.gemini) {
        analyzeThemes(responses, survey.id);
      }
    } catch (error) {
      console.error('Error loading responses:', error);
      setSurveyResponses([]);
    }

    setIsLoadingResponses(false);
  };

  const analyzeThemes = async (responses, surveyId = null) => {
    setIsAnalyzingThemes(true);
    try {
      // Prepare response data for analysis
      const responseTexts = responses.map(r => {
        const parts = [];
        if (r.answerText) parts.push(r.answerText);
        if (r.answers) {
          Object.values(r.answers).forEach(a => {
            if (typeof a === 'string') parts.push(a);
          });
        }
        return parts.join(' ');
      }).filter(t => t.trim());

      const analysis = await generateResponseSummary(responseTexts);
      setThemeAnalysis(analysis);

      // Save to Firebase cache if surveyId provided
      if (surveyId) {
        setAnalysisCache(prev => ({ ...prev, [surveyId]: analysis }));
        await saveSurveyAnalysisCache(surveyId, analysis);
      }
    } catch (error) {
      console.error('Theme analysis error:', error);
      setThemeAnalysis({
        summary: 'Unable to analyze themes. Please try again.',
        themes: [],
        themeSentiments: []
      });
    }
    setIsAnalyzingThemes(false);
  };

  // Force re-analyze (clears cache for this survey)
  const handleReanalyze = async () => {
    if (!selectedSurvey || surveyResponses.length === 0) return;

    // Clear cache from Firebase and local state
    setAnalysisCache(prev => {
      const newCache = { ...prev };
      delete newCache[selectedSurvey.id];
      return newCache;
    });
    await deleteSurveyAnalysisCache(selectedSurvey.id);

    // Re-run analysis
    analyzeThemes(surveyResponses, selectedSurvey.id);
  };

  const handleCloseResponsesModal = () => {
    setIsResponsesModalOpen(false);
    setSelectedSurvey(null);
    setSurveyResponses([]);
    setThemeAnalysis(null);
    setActiveTab('themes');
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSentimentColor = (score) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSentimentBgColor = (score) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getSentimentLabel = (score) => {
    if (score >= 80) return 'Very Positive';
    if (score >= 60) return 'Positive';
    if (score >= 40) return 'Neutral';
    if (score >= 20) return 'Negative';
    return 'Very Negative';
  };

  // Reset form when modal closes
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewSurvey({ title: '', topic: '', questions: [], cohortId: '', publishImmediately: true });
    setCreationMode('ai');
    setEditingQuestionIndex(null);
  };

  const handleGenerateQuestions = async () => {
    if (!newSurvey.topic.trim()) return;

    setIsGenerating(true);
    try {
      const questions = await generateSurveyQuestions(newSurvey.topic);
      setNewSurvey(prev => ({
        ...prev,
        title: prev.title || `Survey: ${prev.topic}`,
        questions
      }));
    } catch (error) {
      console.error('Generation error:', error);
    }
    setIsGenerating(false);
  };

  // Add a new blank question manually
  const handleAddQuestion = (type = 'text') => {
    const newQuestion = type === 'scale'
      ? { type: 'scale', question: '', min: 1, max: 10, minLabel: 'Low', maxLabel: 'High' }
      : { type: 'text', question: '' };

    setNewSurvey(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
    setEditingQuestionIndex(newSurvey.questions.length);
  };

  // Update a question
  const handleUpdateQuestion = (index, updates) => {
    setNewSurvey(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === index ? { ...q, ...updates } : q)
    }));
  };

  // Remove a question
  const handleRemoveQuestion = (index) => {
    setNewSurvey(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
    if (editingQuestionIndex === index) {
      setEditingQuestionIndex(null);
    }
  };

  const handleCreateSurvey = async () => {
    if (!newSurvey.title.trim() || newSurvey.questions.length === 0) return;
    if (!configStatus.firebase) {
      alert('Firebase not configured. Add your Firebase keys to .env first.');
      return;
    }

    setIsCreating(true);
    try {
      await createSurvey({
        title: newSurvey.title,
        questions: newSurvey.questions,
        cohortId: newSurvey.cohortId || null,
        status: newSurvey.publishImmediately ? 'Active' : 'Draft'
      });

      handleCloseModal();

      // Show notification with cohort info
      const cohortName = newSurvey.cohortId
        ? cohorts.find(c => c.id === newSurvey.cohortId)?.name
        : 'All Students';
      if (newSurvey.publishImmediately) {
        showNotification(`Survey published for ${cohortName}! (Demo: notification emails simulated)`, 'success');
      } else {
        showNotification('Survey saved as draft.', 'info');
      }
    } catch (error) {
      console.error('Create error:', error);
      showNotification('Failed to create survey.', 'error');
    }
    setIsCreating(false);
  };

  const handleCloseSurvey = async (surveyId) => {
    if (!configStatus.firebase) return;
    try {
      await closeSurvey(surveyId);
      showNotification('Survey closed.', 'info');
    } catch (error) {
      console.error('Close error:', error);
    }
  };

  const handlePublishSurvey = async (surveyId) => {
    if (!configStatus.firebase) return;
    try {
      await publishSurvey(surveyId);
      showNotification('Survey published! Notification emails would be sent to students.', 'success');
    } catch (error) {
      console.error('Publish error:', error);
    }
  };

  const handleDeleteSurvey = async (surveyId, surveyTitle) => {
    if (!configStatus.firebase) return;

    const confirmed = window.confirm(`Are you sure you want to delete "${surveyTitle}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteSurvey(surveyId);
      showNotification('Survey deleted successfully.', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showNotification('Failed to delete survey.', 'error');
    }
  };

  const toggleSurveyExpansion = (surveyId) => {
    setExpandedSurveys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(surveyId)) {
        newSet.delete(surveyId);
      } else {
        newSet.add(surveyId);
      }
      return newSet;
    });
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const activeSurveys = surveys.filter(s => s.status === 'Active');
  const draftSurveys = surveys.filter(s => s.status === 'Draft');
  const closedSurveys = surveys.filter(s => s.status === 'Closed');

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Notification Banner */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-lg backdrop-blur-md ${notification.type === 'success'
                ? 'bg-green-50/90 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                : notification.type === 'error'
                  ? 'bg-red-50/90 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                  : 'bg-sky-50/90 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300'
                }`}
            >
              <Bell size={18} />
              <span className="font-medium">{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="ml-auto p-1 hover:bg-black/5 rounded-full"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 to-blue-700 p-8 shadow-xl shadow-sky-500/20">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-sky-100 mb-2">
                <MessageSquare size={16} className="text-sky-200" />
                <span className="text-sm font-medium tracking-wide uppercase opacity-90">Student Feedback</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Survey Manager
              </h1>
              <p className="text-sky-100/90 text-lg max-w-xl">
                Create, manage, and analyze student surveys to gather meaningful insights.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3.5 bg-white text-sky-600 hover:bg-sky-50 font-bold rounded-xl shadow-lg shadow-black/10 transition-all active:scale-95"
            >
              <Plus size={20} />
              <span>Create Survey</span>
            </button>
          </div>
        </div>

        {/* Draft Surveys */}
        {draftSurveys.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-amber-500" />
              Draft Surveys ({draftSurveys.length})
            </h2>

            <div className="grid gap-4">
              {draftSurveys.map(survey => {
                const isExpanded = expandedSurveys.has(survey.id);
                const questionsToShow = isExpanded ? survey.questions : survey.questions?.slice(0, 3);
                return (
                  <div key={survey.id} className="bg-amber-50/50 dark:bg-amber-900/10 backdrop-blur-sm rounded-2xl border border-amber-200/50 dark:border-amber-800/30 p-6 transition-all hover:bg-amber-50 dark:hover:bg-amber-900/20">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{survey.title}</h3>
                          <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-800">
                            Draft
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {survey.questions?.length || 0} questions • Created recently
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePublishSurvey(survey.id)}
                          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2 active:scale-95"
                        >
                          <Send size={14} />
                          Publish
                        </button>
                        <button
                          onClick={() => handleDeleteSurvey(survey.id, survey.title)}
                          className="p-2 hover:bg-red-100/50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-lg transition-colors"
                          title="Delete draft"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Questions Preview */}
                    {survey.questions && survey.questions.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {questionsToShow?.map((q, i) => (
                          <div key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                            <span className="text-slate-400 dark:text-slate-500 font-medium min-w-[20px]">{i + 1}.</span>
                            <span className="flex-1">{q.question || <span className="text-slate-400 dark:text-slate-500 italic">No question text</span>}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                              ({q.type === 'scale' ? 'Scale' : 'Text'})
                            </span>
                          </div>
                        ))}
                        {survey.questions.length > 3 && (
                          <button
                            onClick={() => toggleSurveyExpansion(survey.id)}
                            className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 mt-2"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={16} />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown size={16} />
                                Show {survey.questions.length - 3} more question{survey.questions.length - 3 !== 1 ? 's' : ''}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Active Surveys */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-sky-500" />
            Active Surveys ({activeSurveys.length})
          </h2>

          {activeSurveys.length === 0 ? (
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Clock className="text-slate-400" size={24} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">No active surveys.</p>
              <p className="text-sm text-slate-400 mt-1">Create a new survey to start collecting feedback.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeSurveys.map(survey => {
                const cohort = survey.cohortId ? cohorts.find(c => c.id === survey.cohortId) : null;
                const publishedDate = survey.publishedAt?.toDate?.() || null;
                const notifiedDate = survey.notificationsSentAt?.toDate?.() || null;
                const isExpanded = expandedSurveys.has(survey.id);
                const questionsToShow = isExpanded ? survey.questions : survey.questions?.slice(0, 3);
                return (
                  <div key={survey.id} className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {survey.title}
                          </h3>
                          <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap mt-2">
                          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                            <FileText size={14} className="text-sky-500" />
                            <span>{survey.questions?.length || 0} questions</span>
                          </div>

                          {cohort && (
                            <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                              <Users size={14} className="text-indigo-500" />
                              <span>{cohort.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewResponses(survey)}
                          className="px-4 py-2 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 border border-sky-200/50 dark:border-sky-800/50"
                        >
                          <BarChart3 size={16} />
                          Analysis
                        </button>
                        <button
                          onClick={() => handleCloseSurvey(survey.id)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition-colors"
                          title="Close Survey"
                        >
                          <Archive size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Publish Info */}
                    {(publishedDate || notifiedDate) && (
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                        {publishedDate && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-400" />
                            Published {publishedDate.toLocaleDateString()}
                          </span>
                        )}
                        {notifiedDate && (
                          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">
                            <Mail size={12} />
                            Notified
                          </span>
                        )}
                      </div>
                    )}

                    {/* Questions Preview */}
                    {survey.questions && survey.questions.length > 0 && (
                      <div className="mt-4 space-y-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-800/50">
                        {questionsToShow?.map((q, i) => (
                          <div key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                            <span className="text-slate-400 dark:text-slate-500 font-mono text-xs mt-0.5">{i + 1}.</span>
                            <span className="flex-1">{q.question || <span className="text-slate-400 italic">No question text</span>}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {q.type === 'scale' ? 'Scale' : 'Text'}
                            </span>
                          </div>
                        ))}
                        {survey.questions.length > 3 && (
                          <button
                            onClick={() => toggleSurveyExpansion(survey.id)}
                            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 mt-3 w-full justify-center py-1 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={14} />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} />
                                Show {survey.questions.length - 3} more
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Closed Surveys */}
        {closedSurveys.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Archive size={20} className="text-slate-400" />
              Closed Surveys ({closedSurveys.length})
            </h2>

            <div className="grid gap-4">
              {closedSurveys.map(survey => {
                const isExpanded = expandedSurveys.has(survey.id);
                const questionsToShow = isExpanded ? survey.questions : survey.questions?.slice(0, 3);
                return (
                  <div key={survey.id} className="bg-slate-50/80 dark:bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-6 grayscale-[0.5] hover:grayscale-0 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-600 dark:text-slate-400">{survey.title}</h3>
                          <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded">
                            Closed
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                          {survey.questions?.length || 0} questions
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewResponses(survey)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-700 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 text-sm rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                        >
                          <BarChart3 size={14} />
                          Results
                        </button>
                        <button
                          onClick={() => handleDeleteSurvey(survey.id, survey.title)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                          title="Delete closed survey"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Questions Preview */}
                    {survey.questions && survey.questions.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {questionsToShow?.map((q, i) => (
                          <div key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                            <span className="text-slate-400 dark:text-slate-500 font-medium min-w-[20px]">{i + 1}.</span>
                            <span className="flex-1">{q.question || <span className="text-slate-400 dark:text-slate-500 italic">No question text</span>}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                              ({q.type === 'scale' ? 'Scale' : 'Text'})
                            </span>
                          </div>
                        ))}
                        {survey.questions.length > 3 && (
                          <button
                            onClick={() => toggleSurveyExpansion(survey.id)}
                            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 mt-2"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={16} />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown size={16} />
                                Show {survey.questions.length - 3} more question{survey.questions.length - 3 !== 1 ? 's' : ''}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Create Survey Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create New Survey</h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1">
                  {/* Title */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Survey Title
                    </label>
                    <input
                      type="text"
                      value={newSurvey.title}
                      onChange={(e) => setNewSurvey(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Assignment 1 Feedback"
                      className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Cohort Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Users size={16} />
                      Target Cohort
                    </label>
                    <select
                      value={newSurvey.cohortId}
                      onChange={(e) => setNewSurvey(prev => ({ ...prev, cohortId: e.target.value }))}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">All Students (No Cohort Filter)</option>
                      {cohorts.map(cohort => (
                        <option key={cohort.id} value={cohort.id}>
                          {cohort.name} ({cohort.year})
                        </option>
                      ))}
                    </select>
                    {cohorts.length === 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        No cohorts created yet. Create cohorts in the Cohorts section to target specific groups.
                      </p>
                    )}
                  </div>

                  {/* Mode Toggle */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Creation Mode
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCreationMode('ai')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${creationMode === 'ai'
                          ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400'
                          : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                          }`}
                      >
                        <Sparkles size={18} />
                        <span className="font-medium">AI Assist</span>
                      </button>
                      <button
                        onClick={() => setCreationMode('manual')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${creationMode === 'manual'
                          ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400'
                          : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                          }`}
                      >
                        <Edit2 size={18} />
                        <span className="font-medium">Manual</span>
                      </button>
                    </div>
                  </div>

                  {/* AI Generation Section */}
                  {creationMode === 'ai' && (
                    <div className="mb-6 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-900/30">
                      <label className="block text-sm font-medium text-sky-900 dark:text-sky-300 mb-2 flex items-center gap-2">
                        <Sparkles size={16} />
                        Generate Questions with AI
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSurvey.topic}
                          onChange={(e) => setNewSurvey(prev => ({ ...prev, topic: e.target.value }))}
                          placeholder="Enter a topic (e.g., Assignment 1)"
                          className="flex-1 px-4 py-2 border border-sky-200 dark:border-sky-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                        <button
                          onClick={handleGenerateQuestions}
                          disabled={isGenerating || !newSurvey.topic.trim()}
                          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isGenerating ? <LoadingSpinner size="sm" light /> : <Sparkles size={16} />}
                          Generate
                        </button>
                      </div>
                      {!configStatus.gemini && (
                        <p className="text-xs text-sky-700 dark:text-sky-400 mt-2">
                          Add Gemini API key to enable AI generation. Fallback questions will be used.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Manual Question Addition */}
                  {creationMode === 'manual' && (
                    <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        Add Questions
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddQuestion('text')}
                          className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors text-sm"
                        >
                          + Text Question
                        </button>
                        <button
                          onClick={() => handleAddQuestion('scale')}
                          className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors text-sm"
                        >
                          + Scale Question (1-10)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Questions List (Editable) */}
                  {newSurvey.questions.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Questions ({newSurvey.questions.length})
                        </label>
                        {creationMode === 'ai' && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">Click to edit</span>
                        )}
                      </div>
                      <div className="space-y-3">
                        {newSurvey.questions.map((q, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-lg border transition-all ${editingQuestionIndex === i
                              ? 'bg-white dark:bg-slate-700 border-sky-300 dark:border-sky-600 ring-2 ring-sky-100 dark:ring-sky-900/50'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                          >
                            {editingQuestionIndex === i ? (
                              // Editing mode
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Question Text</label>
                                  <input
                                    type="text"
                                    value={q.question}
                                    onChange={(e) => handleUpdateQuestion(i, { question: e.target.value })}
                                    placeholder="Enter your question..."
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                    autoFocus
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <select
                                    value={q.type}
                                    onChange={(e) => handleUpdateQuestion(i, {
                                      type: e.target.value,
                                      ...(e.target.value === 'scale' ? { min: 1, max: 10, minLabel: 'Low', maxLabel: 'High' } : {})
                                    })}
                                    className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                  >
                                    <option value="text">Text Response</option>
                                    <option value="scale">Scale (1-10)</option>
                                  </select>
                                </div>

                                {q.type === 'scale' && (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={q.minLabel || 'Low'}
                                      onChange={(e) => handleUpdateQuestion(i, { minLabel: e.target.value })}
                                      placeholder="Min label"
                                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                    />
                                    <input
                                      type="text"
                                      value={q.maxLabel || 'High'}
                                      onChange={(e) => handleUpdateQuestion(i, { maxLabel: e.target.value })}
                                      placeholder="Max label"
                                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                    />
                                  </div>
                                )}

                                <div className="flex justify-end">
                                  <button
                                    onClick={() => setEditingQuestionIndex(null)}
                                    className="px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white text-sm rounded-lg transition-colors"
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // View mode
                              <div className="flex items-start gap-2">
                                <GripVertical size={16} className="text-slate-300 dark:text-slate-600 mt-0.5 flex-shrink-0" />
                                <div
                                  className="flex-1 cursor-pointer"
                                  onClick={() => setEditingQuestionIndex(i)}
                                >
                                  <p className="text-sm text-slate-700 dark:text-slate-300">
                                    <span className="font-medium">{i + 1}.</span> {q.question || <span className="text-slate-400 dark:text-slate-500 italic">Click to add question text...</span>}
                                  </p>
                                  <span className="text-xs text-slate-400 dark:text-slate-500">
                                    {q.type === 'scale' ? `Scale (${q.min || 1}-${q.max || 10})` : 'Text'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingQuestionIndex(i); }}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 size={14} className="text-slate-400" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveQuestion(i); }}
                                    className="p-1 hover:bg-red-100 rounded transition-colors"
                                    title="Remove"
                                  >
                                    <Trash2 size={14} className="text-red-400" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add more questions button (visible in both modes when questions exist) */}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleAddQuestion('text')}
                          className="flex-1 px-3 py-2 border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors text-sm"
                        >
                          + Add Text Question
                        </button>
                        <button
                          onClick={() => handleAddQuestion('scale')}
                          className="flex-1 px-3 py-2 border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors text-sm"
                        >
                          + Add Scale Question
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  {/* Publish Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Publish immediately</label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {newSurvey.publishImmediately
                          ? 'Survey will be active and students will be notified'
                          : 'Survey will be saved as draft'}
                      </p>
                    </div>
                    <button
                      onClick={() => setNewSurvey(prev => ({ ...prev, publishImmediately: !prev.publishImmediately }))}
                      className={`relative w-12 h-6 rounded-full transition-colors ${newSurvey.publishImmediately ? 'bg-sky-500' : 'bg-slate-300'
                        }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${newSurvey.publishImmediately ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateSurvey}
                      disabled={isCreating || !newSurvey.title.trim() || newSurvey.questions.length === 0}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isCreating ? (
                        <LoadingSpinner size="sm" light />
                      ) : newSurvey.publishImmediately ? (
                        <Send size={16} />
                      ) : (
                        <Check size={16} />
                      )}
                      {newSurvey.publishImmediately ? 'Create & Publish' : 'Save as Draft'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Responses Modal */}
        <AnimatePresence>
          {isResponsesModalOpen && selectedSurvey && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={handleCloseResponsesModal}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Survey Responses</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedSurvey.title}</p>
                  </div>
                  <button
                    onClick={handleCloseResponsesModal}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>

                {/* Tab Navigation */}
                {!isLoadingResponses && surveyResponses.length > 0 && (
                  <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
                    <button
                      onClick={() => setActiveTab('themes')}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'themes'
                        ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                      <BarChart3 size={16} />
                      Theme Analysis
                    </button>
                    <button
                      onClick={() => setActiveTab('responses')}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'responses'
                        ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                      <MessageSquare size={16} />
                      Individual Responses ({surveyResponses.length})
                    </button>
                  </div>
                )}

                {/* Modal Body */}
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                  {isLoadingResponses ? (
                    <div className="flex items-center justify-center py-20">
                      <LoadingSpinner size="lg" />
                    </div>
                  ) : surveyResponses.length === 0 ? (
                    <div className="text-center py-20">
                      <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
                      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No responses yet</h3>
                      <p className="text-slate-500 dark:text-slate-400">This survey hasn't received any responses.</p>
                    </div>
                  ) : activeTab === 'themes' ? (
                    /* Theme Analysis Tab */
                    <div className="space-y-6">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                              <FileText size={18} className="text-sky-500" />
                              <span className="text-sm font-medium">Total Responses</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{surveyResponses.length}</p>
                          </div>
                        </div>

                        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                              <Tag size={18} className="text-purple-500" />
                              <span className="text-sm font-medium">Themes Identified</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                              {themeAnalysis?.themes?.length || '—'}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                              <TrendingUp size={18} className="text-teal-500" />
                              <span className="text-sm font-medium">Avg Sentiment</span>
                            </div>
                            <p className={`text-3xl font-bold ${themeAnalysis?.themeSentiments?.length > 0
                              ? getSentimentColor(Math.round(themeAnalysis.themeSentiments.reduce((a, b) => a + b.sentiment, 0) / themeAnalysis.themeSentiments.length))
                              : 'text-slate-900 dark:text-white'
                              }`}>
                              {themeAnalysis?.themeSentiments?.length > 0
                                ? Math.round(themeAnalysis.themeSentiments.reduce((a, b) => a + b.sentiment, 0) / themeAnalysis.themeSentiments.length)
                                : '—'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* AI Analysis */}
                      {isAnalyzingThemes ? (
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800">
                          <LoadingSpinner size="md" />
                          <p className="text-slate-600 dark:text-slate-400 mt-4">Analyzing feedback themes...</p>
                        </div>
                      ) : themeAnalysis ? (
                        <>
                          {/* Executive Summary */}
                          <div className="relative overflow-hidden rounded-2xl p-6 border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-indigo-900/20 dark:to-violet-900/20 backdrop-blur-sm" />
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                                    <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
                                  </div>
                                  <h3 className="font-bold text-slate-900 dark:text-white">AI Executive Summary</h3>
                                  {analysisCache[selectedSurvey?.id] && (
                                    <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full border border-slate-200 dark:border-slate-700">Cached</span>
                                  )}
                                </div>
                                <button
                                  onClick={handleReanalyze}
                                  disabled={isAnalyzingThemes}
                                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <RefreshCw size={12} className={isAnalyzingThemes ? 'animate-spin' : ''} />
                                  Re-analyze
                                </button>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                                {themeAnalysis.summary}
                              </p>
                            </div>
                          </div>

                          {/* Theme Cards */}
                          {themeAnalysis.themeSentiments && themeAnalysis.themeSentiments.length > 0 && (
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2 uppercase tracking-wide opacity-80">
                                <Tag size={16} />
                                Key Themes & Sentiment
                              </h3>
                              <div className="grid gap-3">
                                {themeAnalysis.themeSentiments.map((theme, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-xl border border-slate-200/50 dark:border-slate-800/50 p-4 hover:border-sky-200 dark:hover:border-sky-800/50 transition-colors"
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                          {theme.theme}
                                        </span>
                                        {theme.mentions && (
                                          <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700">
                                            {theme.mentions} mention{theme.mentions !== 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <div className={`text-lg font-bold ${getSentimentColor(theme.sentiment)}`}>
                                          {theme.sentiment}%
                                        </div>
                                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                          {getSentimentLabel(theme.sentiment)}
                                        </p>
                                      </div>
                                    </div>
                                    {/* Sentiment Bar */}
                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${getSentimentBgColor(theme.sentiment)}`}
                                        style={{ width: `${theme.sentiment}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Simple Theme List (if no sentiment data) */}
                          {(!themeAnalysis.themeSentiments || themeAnalysis.themeSentiments.length === 0) && themeAnalysis.themes && themeAnalysis.themes.length > 0 && (
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide opacity-80">
                                Recurring Themes
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {themeAnalysis.themes.map((theme, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1.5 bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium shadow-sm"
                                  >
                                    {theme}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : !configStatus.gemini ? (
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-100 dark:border-amber-900/30 text-center">
                          <div className="inline-flex p-3 bg-amber-100 dark:bg-amber-900/40 rounded-full mb-3">
                            <Sparkles size={20} className="text-amber-600 dark:text-amber-400" />
                          </div>
                          <h3 className="font-semibold text-amber-900 dark:text-amber-300 mb-1">AI Analysis Unavailable</h3>
                          <p className="text-sm text-amber-700 dark:text-amber-400/80 max-w-sm mx-auto">
                            Add your Gemini API key in the .env file to enable automatic theme analysis.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800">
                          <p className="text-slate-500 dark:text-slate-400">
                            Theme analysis will appear here after processing.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Individual Responses Tab */
                    <div className="space-y-4">
                      {surveyResponses.map((response, idx) => (
                        <div
                          key={response.id}
                          className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-800/50 p-5 hover:bg-white/80 dark:hover:bg-slate-900/60 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider">
                                  Response #{idx + 1}
                                </span>
                                {response.studentEmail && (
                                  <span className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-sky-500 rounded-full"></span>
                                    {response.studentEmail}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-1">
                                <Calendar size={12} />
                                <span>{formatDate(response.timestamp)}</span>
                              </div>
                            </div>
                            {response.sentimentScore !== null && response.sentimentScore !== undefined && (
                              <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Sentiment</p>
                                <p className={`text-xl font-bold ${getSentimentColor(response.sentimentScore)}`}>
                                  {response.sentimentScore}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Text Feedback */}
                          {response.answerText && (
                            <div className="mb-4">
                              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Feedback</p>
                              <div className="text-sm text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-black/20 rounded-xl p-4 border border-slate-100 dark:border-slate-800 italic">
                                "{response.answerText}"
                              </div>
                            </div>
                          )}

                          {/* Individual Answers */}
                          {response.answers && Object.keys(response.answers).length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Structured Answers</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.entries(response.answers).map(([questionId, answer], answerIdx) => (
                                  <div key={questionId} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <span className="font-medium text-slate-500 dark:text-slate-400 text-xs">Q{answerIdx + 1}</span>
                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {typeof answer === 'number' ? `${answer}/10` : answer}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tags */}
                          {response.aiSummaryTags && response.aiSummaryTags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              {response.aiSummaryTags.map((tag, tagIdx) => (
                                <span
                                  key={tagIdx}
                                  className="px-2.5 py-1 text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-100 dark:border-indigo-800/30"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
                  <button
                    onClick={handleCloseResponsesModal}
                    className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-sm"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminSurveys;
