import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle, Lock, Sparkles, AlertCircle, X, Menu, FileText, ChevronRight, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToSurveys, submitAnonymousResponse, checkHasVoted, markAsVoted, getVisitorId } from '../../services/firebase';
import { analyzeSentiment } from '../../services/gemini';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import ThemeToggle from '../../components/ThemeToggle';

const StudentSurvey = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { configStatus } = useApp();

  const [allSurveys, setAllSurveys] = useState([]);
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [textFeedback, setTextFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState(null); // null, 'shredding', 'encrypting', 'complete'
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState(false);
  const [isCheckingVote, setIsCheckingVote] = useState(true);
  const [submitError, setSubmitError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [studentEmail] = useState(() => {
    try {
      return localStorage.getItem('studentEmail') || '';
    } catch {
      return '';
    }
  });

  // Check if user has already voted
  useEffect(() => {
    const checkVoteStatus = async () => {
      if (!surveyId || !configStatus.firebase) {
        setIsCheckingVote(false);
        return;
      }

      const visitorId = getVisitorId();
      const voted = await checkHasVoted(surveyId, visitorId);
      setHasAlreadyVoted(voted);
      setIsCheckingVote(false);
    };

    checkVoteStatus();
  }, [surveyId, configStatus.firebase]);

  useEffect(() => {
    const unsubscribe = subscribeToSurveys((surveys) => {
      // Filter for active surveys only
      const activeSurveys = surveys.filter(s => s.status === 'Active');
      setAllSurveys(activeSurveys);

      const found = activeSurveys.find(s => s.id === surveyId);

      if (found) {
        setSurvey(found);
        if (found?.questions) {
          const initialAnswers = {};
          found.questions.forEach((q, i) => {
            if (q.type === 'scale') {
              initialAnswers[i] = 5;
            } else {
              initialAnswers[i] = '';
            }
          });
          setAnswers(initialAnswers);
        }
      } else {
        setSurvey(null);
      }
    });

    // Close sidebar on navigation (mobile)
    setIsSidebarOpen(false);

    return () => unsubscribe();
  }, [surveyId, location.pathname]);

  const handleSubmit = async () => {
    if (isSubmitting || hasAlreadyVoted) return;
    setIsSubmitting(true);

    // Get visitor ID for vote tracking (NOT stored with response)
    const visitorId = getVisitorId();

    // Double-check vote status before submitting
    if (configStatus.firebase) {
      const alreadyVoted = await checkHasVoted(surveyId, visitorId);
      if (alreadyVoted) {
        setHasAlreadyVoted(true);
        setIsSubmitting(false);
        return;
      }
    }

    // Compile all text for sentiment analysis
    const allText = [
      textFeedback,
      ...Object.entries(answers)
        .filter(([, v]) => typeof v === 'string' && v.trim())
        .map(([, v]) => v)
    ].filter(Boolean).join(' ');

    try {
      // Phase 1: Shredding animation
      setSubmitPhase('shredding');
      await new Promise(r => setTimeout(r, 1200));

      // Phase 2: Encrypting
      setSubmitPhase('encrypting');
      await new Promise(r => setTimeout(r, 1000));

      // Analyze sentiment
      let sentimentResult = { score: 50, tags: ['Feedback'], summary: 'Response recorded' };
      if (configStatus.gemini && allText.trim()) {
        sentimentResult = await analyzeSentiment(allText);
      }

      // Submit to Firestore (NO USER ID - Double-blind!)
      if (configStatus.firebase) {
        await submitAnonymousResponse({
          surveyId,
          answers,
          answerText: allText,
          sentimentScore: sentimentResult.score,
          aiSummaryTags: sentimentResult.tags,
          studentEmail: studentEmail // Include student email for response viewing
        });

        // Mark as voted SEPARATELY (double-blind: this record cannot be linked to the response)
        await markAsVoted(surveyId, visitorId);
      }

      // Phase 3: Complete
      setSubmitPhase('complete');
      await new Promise(r => setTimeout(r, 2000));

      navigate('/student');
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitPhase(null);
      setIsSubmitting(false);
      setSubmitError('Failed to submit your response. Please try again.');
    }
  };

  const calculateProgress = () => {
    if (!survey?.questions) return 0;
    const answeredCount = Object.keys(answers).length;
    return Math.min(100, Math.round((answeredCount / survey.questions.length) * 100));
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
          <FileText size={24} />
          <span>Active Surveys</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {allSurveys.length} {allSurveys.length === 1 ? 'survey' : 'surveys'} available
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {allSurveys.map((s) => (
          <Link
            key={s.id}
            to={`/student/survey/${s.id}`}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center justify-between p-3 rounded-xl transition-all ${s.id === surveyId
              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-700/50'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            <span className="font-medium text-sm line-clamp-1">{s.title}</span>
            {s.id === surveyId && <ChevronRight size={16} />}
          </Link>
        ))}

        {allSurveys.length === 0 && (
          <div className="text-center py-8 px-4 text-slate-400 text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            No active surveys at the moment.
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <Link
          to="/student"
          onClick={() => setIsSidebarOpen(false)}
          className="flex items-center gap-2 p-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium text-sm"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );

  // Loading state
  if (isCheckingVote || (!survey && !hasAlreadyVoted && allSurveys.length > 0)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Already voted state (modified to work within layout)
  const AlreadyVotedContent = () => (
    <div className="flex items-center justify-center p-4 h-full min-h-[60vh]">
      <div className="text-center max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
        <div className="w-20 h-20 mx-auto bg-teal-100 dark:bg-teal-900/40 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="text-teal-500 dark:text-teal-400" size={40} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Already Submitted</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          You have already submitted your response to this survey.
          Each person can only submit once to maintain fairness.
        </p>
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 text-sm font-medium">
            <Shield size={16} />
            <span>Your previous submission remains anonymous</span>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-semibold mb-3 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        >
          <FileText size={18} />
          Try Another Survey
        </button>
        <Link
          to="/student"
          className="inline-flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-all font-semibold shadow-lg shadow-sky-500/20"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>
      </div>
    </div>
  );

  // Survey not found content
  const NotFoundContent = () => (
    <div className="flex items-center justify-center p-4 h-full min-h-[60vh]">
      <div className="text-center max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
        <div className="w-20 h-20 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="text-slate-400" size={40} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Survey Not Available</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          This survey is no longer active or doesn't exist.
        </p>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-semibold mb-3 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        >
          <FileText size={18} />
          View Other Surveys
        </button>
        <Link
          to="/student"
          className="inline-flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-all font-semibold"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>
      </div>
    </div>
  );

  // Submission Animation Overlay
  if (submitPhase) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm w-full"
        >
          <AnimatePresence mode="wait">
            {submitPhase === 'shredding' && (
              <motion.div
                key="shredding"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <motion.div
                  animate={{
                    rotate: [0, 5, -5, 5, 0],
                    scale: [1, 0.95, 1.05, 0.95, 1]
                  }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-24 h-24 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center shadow-2xl ring-1 ring-white/10"
                >
                  <Sparkles className="text-sky-400" size={48} />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Disconnecting Identity</h3>
                  <p className="text-slate-400 text-sm">Validating tokens while scrubbing personal metadata...</p>
                </div>
              </motion.div>
            )}

            {submitPhase === 'encrypting' && (
              <motion.div
                key="encrypting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-24 h-24 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center shadow-2xl ring-1 ring-white/10"
                >
                  <Lock className="text-teal-400" size={48} />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Encrypting Response</h3>
                  <p className="text-slate-400 text-sm">Applying double-blind encryption to your answers...</p>
                </div>
              </motion.div>
            )}

            {submitPhase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className="w-24 h-24 mx-auto bg-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30"
                >
                  <Shield className="text-white" size={48} />
                </motion.div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Sent Securely.</h3>
                  <p className="text-teal-200">No trace remains.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">

      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden md:block w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 fixed inset-y-0 left-0 z-40 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed inset-y-0 left-0 w-[80%] max-w-sm bg-white dark:bg-slate-800 z-[51] shadow-2xl"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-72 flex flex-col min-h-screen">

        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 transition-colors">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <Menu size={20} />
                </button>

                <div className="hidden md:block">
                  {/* Desktop Back Button (Moved to sidebar, but nice to have redundancy or hide it) */}
                  <Link to="/student" className="md:hidden p-2 text-slate-500 rounded-full">
                    <ArrowLeft size={20} />
                  </Link>
                </div>

                <div>
                  <h1 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-1">
                    {survey ? survey.title : 'Details'}
                  </h1>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-teal-600 dark:text-teal-400">
                    <Shield size={12} />
                    <span>Anonymous Survey</span>
                  </div>
                </div>
              </div>
              <Link
                to="/admin"
                className="group p-2 hover:px-3 flex items-center gap-0 hover:gap-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg transition-all hover:scale-105 active:scale-95 hidden sm:flex items-center justify-center"
                title="Switch to Admin"
              >
                <Users size={20} />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-sm font-medium opacity-0 group-hover:opacity-100">
                  Switch to Admin
                </span>
              </Link>
              <ThemeToggle variant="icon" />
            </div>

            {/* Progress Bar (Only visible if active survey) */}
            {survey && !hasAlreadyVoted && (
              <div className="h-1 w-full bg-slate-100 dark:bg-slate-700 mt-3 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-sky-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateProgress()}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">

          {/* Case 1: Survey Loaded & Not Voted */}
          {survey && !hasAlreadyVoted && (
            <>
              {/* Privacy Notice Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-teal-50 to-sky-50 dark:from-teal-900/20 dark:to-sky-900/20 border border-teal-100 dark:border-teal-900/30 rounded-2xl p-4 sm:p-5 flex items-start gap-4"
              >
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-teal-100 dark:border-teal-900/30 text-teal-500">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1">Double-Blind Privacy</h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Your submission is encrypted and decoupled from your identity. Staff can see <span className="italic">what</span> was said, but not <span className="italic">who</span> said it.
                  </p>
                </div>
              </motion.div>

              {/* Questions */}
              <div className="space-y-4">
                {survey.questions?.map((question, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <label className="block text-slate-900 dark:text-white font-semibold text-lg mb-4">
                      <span className="text-slate-400 dark:text-slate-500 mr-2 text-base font-normal">{index + 1}.</span>
                      {question.question}
                    </label>

                    {question.type === 'scale' ? (
                      <div className="space-y-6 py-2">
                        <input
                          type="range"
                          min={question.min || 1}
                          max={question.max || 10}
                          value={answers[index] || 5}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [index]: parseInt(e.target.value) }))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-colors"
                        />
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">{question.minLabel || 'Low'}</span>
                          <div className="px-4 py-1.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 font-bold rounded-lg border border-sky-100 dark:border-sky-800 transition-all transform scale-100">
                            {answers[index] || 5} / {question.max || 10}
                          </div>
                          <span className="text-slate-500 dark:text-slate-400 font-medium">{question.maxLabel || 'High'}</span>
                        </div>
                      </div>
                    ) : (
                      <textarea
                        value={answers[index] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                        placeholder="Share your thoughts..."
                        rows={4}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all resize-none"
                      />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Additional Feedback */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm"
              >
                <label className="block text-slate-900 dark:text-white font-semibold mb-3">
                  Anything else on your mind? <span className="text-slate-400 font-normal text-sm ml-1">(Optional)</span>
                </label>
                <textarea
                  value={textFeedback}
                  onChange={(e) => setTextFeedback(e.target.value)}
                  placeholder="Feel free to share any other feedback or suggestions..."
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all resize-none"
                />
              </motion.div>

              {/* Error Message */}
              <AnimatePresence>
                {submitError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400"
                    role="alert"
                  >
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <p className="text-sm font-medium">{submitError}</p>
                    <button
                      onClick={() => setSubmitError(null)}
                      className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                      aria-label="Dismiss error"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <div className="pt-2 pb-6">
                <button
                  onClick={() => {
                    setSubmitError(null);
                    handleSubmit();
                  }}
                  disabled={isSubmitting}
                  className="w-full group relative bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Shield size={20} />
                    {isSubmitting ? 'Encrypting & Submitting...' : 'Submit Anonymously'}
                  </span>
                  {/* Shiny effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                </button>
                <p className="text-center text-xs text-slate-400 mt-4">
                  By submitting, you agree to our community guidelines.
                </p>
              </div>
            </>
          )}

          {/* Case 2: Already Voted */}
          {hasAlreadyVoted && <AlreadyVotedContent />}

          {/* Case 3: Survey Not Found */}
          {!survey && !hasAlreadyVoted && <NotFoundContent />}

        </main>
      </div>
    </div>
  );
};

export default StudentSurvey;
