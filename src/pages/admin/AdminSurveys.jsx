import { useState, useEffect } from 'react';
import { Plus, Sparkles, X, Check, Clock, Archive, Edit2, Trash2, GripVertical, Send, FileText, Bell, Users, Mail, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../../components/AdminLayout';
import { subscribeToSurveys, subscribeToCohorts, createSurvey, closeSurvey, publishSurvey, deleteSurvey, getSurveyResponsesWithStudents } from '../../services/firebase';
import { generateSurveyQuestions } from '../../services/gemini';
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

  useEffect(() => {
    const unsubSurveys = subscribeToSurveys(setSurveys);
    const unsubCohorts = subscribeToCohorts(setCohorts);
    return () => {
      unsubSurveys();
      unsubCohorts();
    };
  }, []);

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
      <div className="p-6 lg:p-8">
        {/* Notification Banner */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                notification.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-300' 
                  : notification.type === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300'
                    : 'bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-900/30 text-sky-700 dark:text-sky-300'
              }`}
            >
              <Bell size={18} />
              <span>{notification.message}</span>
              <button 
                onClick={() => setNotification(null)}
                className="ml-auto p-1 hover:bg-black/5 rounded"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Survey Manager</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Create and manage anonymous surveys</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            Create Survey
          </button>
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
                  <div key={survey.id} className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-900/30 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{survey.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {survey.questions?.length || 0} questions
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                          Draft
                        </span>
                        <button
                          onClick={() => handleDeleteSurvey(survey.id, survey.title)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                          title="Delete draft"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => handlePublishSurvey(survey.id)}
                          className="px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Send size={14} />
                          Publish
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
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center shadow-sm">
              <p className="text-slate-500 dark:text-slate-400">No active surveys. Create one to start collecting feedback.</p>
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
                <div key={survey.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{survey.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {survey.questions?.length || 0} questions
                        </p>
                        {cohort && (
                          <span className="text-xs px-2 py-0.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-full flex items-center gap-1">
                            <Users size={10} />
                            {cohort.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
                        Active
                      </span>
                      <button
                        onClick={() => handleCloseSurvey(survey.id)}
                        className="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm rounded-lg transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {/* Publish Info */}
                  {(publishedDate || notifiedDate) && (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                      {publishedDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          Published {publishedDate.toLocaleDateString()}
                        </span>
                      )}
                      {notifiedDate && (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <Mail size={12} />
                          Notified (simulated)
                        </span>
                      )}
                    </div>
                  )}

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
                  <div key={survey.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300">{survey.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {survey.questions?.length || 0} questions
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-full">
                          Closed
                        </span>
                        <button
                          onClick={() => handleDeleteSurvey(survey.id, survey.title)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
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
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
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
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                          creationMode === 'ai'
                            ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400'
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                        }`}
                      >
                        <Sparkles size={18} />
                        <span className="font-medium">AI Assist</span>
                      </button>
                      <button
                        onClick={() => setCreationMode('manual')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                          creationMode === 'manual'
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
                            className={`p-3 rounded-lg border transition-all ${
                              editingQuestionIndex === i
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
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        newSurvey.publishImmediately ? 'bg-sky-500' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        newSurvey.publishImmediately ? 'translate-x-7' : 'translate-x-1'
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
      </div>
    </AdminLayout>
  );
};

export default AdminSurveys;
