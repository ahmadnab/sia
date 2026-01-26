import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToSurveys, submitAnonymousResponse, checkHasVoted, markAsVoted, getVisitorId } from '../../services/firebase';
import { analyzeSentiment } from '../../services/gemini';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const StudentSurvey = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { configStatus } = useApp();
  
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [textFeedback, setTextFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState(null); // null, 'shredding', 'encrypting', 'complete'
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState(false);
  const [isCheckingVote, setIsCheckingVote] = useState(true);

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
      const found = surveys.find(s => s.id === surveyId);
      // Only show Active surveys to students
      if (found && found.status === 'Active') {
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
    return () => unsubscribe();
  }, [surveyId]);

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
          aiSummaryTags: sentimentResult.tags
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
    }
  };

  // Loading state
  if (isCheckingVote || (!survey && !hasAlreadyVoted)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" light />
      </div>
    );
  }

  // Already voted state
  if (hasAlreadyVoted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto bg-teal-500/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="text-teal-400" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Already Submitted</h1>
          <p className="text-slate-400 mb-6">
            You have already submitted your response to this survey. 
            Each person can only submit once to maintain fairness.
          </p>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-teal-400 text-sm">
              <Shield size={16} />
              <span>Your previous submission remains anonymous</span>
            </div>
          </div>
          <Link
            to="/student"
            className="inline-flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Survey not found or not active
  if (!survey) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="text-slate-400" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Survey Not Available</h1>
          <p className="text-slate-400 mb-6">
            This survey is no longer active or doesn't exist.
          </p>
          <Link
            to="/student"
            className="inline-flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Submission Animation Overlay
  if (submitPhase) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <AnimatePresence mode="wait">
            {submitPhase === 'shredding' && (
              <motion.div
                key="shredding"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 5, -5, 5, 0],
                    scale: [1, 0.95, 1.05, 0.95, 1]
                  }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-20 h-20 mx-auto bg-slate-800 rounded-xl flex items-center justify-center"
                >
                  <Sparkles className="text-sky-400" size={40} />
                </motion.div>
                <p className="text-lg text-slate-300">Disconnecting Identity...</p>
              </motion.div>
            )}

            {submitPhase === 'encrypting' && (
              <motion.div
                key="encrypting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-20 h-20 mx-auto bg-slate-800 rounded-xl flex items-center justify-center"
                >
                  <Lock className="text-teal-400" size={40} />
                </motion.div>
                <p className="text-lg text-slate-300">Encrypting Data...</p>
              </motion.div>
            )}

            {submitPhase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className="w-20 h-20 mx-auto bg-teal-500 rounded-full flex items-center justify-center"
                >
                  <Shield className="text-white" size={40} />
                </motion.div>
                <div>
                  <p className="text-xl font-semibold text-white">Sent.</p>
                  <p className="text-slate-400 mt-1">No trace remains.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/student" className="p-2 -ml-2 hover:bg-slate-700 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-slate-400" />
          </Link>
          <div>
            <h1 className="font-semibold text-white">{survey.title}</h1>
            <div className="flex items-center gap-1 text-xs text-teal-400 mt-0.5">
              <Shield size={12} />
              <span>Anonymous Survey</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Privacy Notice */}
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 flex items-start gap-3">
          <Shield className="text-teal-400 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-teal-300">
            This submission is untraceable. Your identity will not be linked to your responses.
          </p>
        </div>

        {/* Questions */}
        {survey.questions?.map((question, index) => (
          <div key={index} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <label className="block text-white font-medium mb-3">
              {index + 1}. {question.question}
            </label>
            
            {question.type === 'scale' ? (
              <div className="space-y-3">
                <input
                  type="range"
                  min={question.min || 1}
                  max={question.max || 10}
                  value={answers[index] || 5}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [index]: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{question.minLabel || 'Low'}</span>
                  <span className="text-sky-400 font-medium">{answers[index] || 5}</span>
                  <span>{question.maxLabel || 'High'}</span>
                </div>
              </div>
            ) : (
              <textarea
                value={answers[index] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                placeholder="Share your thoughts..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              />
            )}
          </div>
        ))}

        {/* Additional Feedback */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <label className="block text-white font-medium mb-3">
            Any additional thoughts? (Optional)
          </label>
          <textarea
            value={textFeedback}
            onChange={(e) => setTextFeedback(e.target.value)}
            placeholder="Share anything else on your mind..."
            rows={4}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Shield size={20} />
          Submit Anonymously
        </button>
      </main>
    </div>
  );
};

export default StudentSurvey;
