import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, MessageSquare, Users } from 'lucide-react';
import { getStudentResponses, subscribeToSurveys } from '../../services/firebase';
import { useApp } from '../../context/AppContext';
import { SkeletonResponse } from '../../components/Skeleton';
import ThemeToggle from '../../components/ThemeToggle';

const StudentResponses = () => {
  const { configStatus } = useApp();
  const [responses, setResponses] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentEmail] = useState(() => localStorage.getItem('studentEmail') || '');
  const [showEmailPrompt, setShowEmailPrompt] = useState(!localStorage.getItem('studentEmail'));
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    if (!studentEmail || !configStatus.firebase) {
      setIsLoading(false);
      return;
    }

    // Load surveys
    const unsubSurveys = subscribeToSurveys((data) => {
      setSurveys(data);
    });

    // Load student responses
    const loadResponses = async () => {
      const data = await getStudentResponses(studentEmail);
      setResponses(data);
      setIsLoading(false);
    };

    loadResponses();

    return () => unsubSurveys();
  }, [studentEmail, configStatus.firebase]);

  const handleSetEmail = () => {
    const email = emailInput.trim();
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    localStorage.setItem('studentEmail', email);
    window.location.reload(); // Reload to fetch responses
  };

  const getSurveyTitle = (surveyId) => {
    const survey = surveys.find(s => s.id === surveyId);
    return survey?.title || 'Survey';
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

  if (showEmailPrompt) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-lg">
          <div className="w-16 h-16 bg-sky-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">View Your Responses</h2>
          <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
            Enter your email to view your survey responses.
          </p>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSetEmail()}
            placeholder="your.email@university.edu"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent mb-4"
            autoFocus
          />
          <button
            onClick={handleSetEmail}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-lg font-medium transition-colors mb-4"
          >
            View Responses
          </button>
          <Link
            to="/student"
            className="block text-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-sm"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/student" className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Survey Responses</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{studentEmail}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/admin"
              className="group p-2 hover:px-3 flex items-center gap-0 hover:gap-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-700 rounded-lg transition-all hover:scale-105 active:scale-95 hidden sm:flex items-center justify-center"
              title="Switch to Admin"
            >
              <Users size={20} />
              <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-sm font-medium opacity-0 group-hover:opacity-100">
                Switch to Admin
              </span>
            </Link>
            <ThemeToggle variant="icon" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 lg:p-6 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            <SkeletonResponse />
            <SkeletonResponse />
            <SkeletonResponse />
          </div>
        ) : responses.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No responses yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">You haven't submitted any surveys yet.</p>
            <Link
              to="/student"
              className="inline-block px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-sky-500/20 active:scale-95"
            >
              Take a Survey
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {responses.map((response) => (
              <div
                key={response.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      {getSurveyTitle(response.surveyId)}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar size={14} />
                      <span>{formatDate(response.timestamp)}</span>
                    </div>
                  </div>
                  {response.sentimentScore !== null && response.sentimentScore !== undefined && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sentiment</p>
                      <p className={`text-2xl font-bold ${getSentimentColor(response.sentimentScore)}`}>
                        {response.sentimentScore}
                      </p>
                    </div>
                  )}
                </div>

                {/* Text Feedback */}
                {response.answerText && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={16} className="text-slate-500 dark:text-slate-400" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Your Feedback</p>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                      {response.answerText}
                    </p>
                  </div>
                )}

                {/* Individual Answers */}
                {response.answers && Object.keys(response.answers).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Individual Responses</p>
                    <div className="space-y-3">
                      {Object.entries(response.answers).map(([questionId, answer], idx) => (
                        <div key={questionId} className="flex items-start gap-3">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Q{idx + 1}:</span>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {typeof answer === 'number' ? `${answer}/10` : answer}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {response.aiSummaryTags && response.aiSummaryTags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {response.aiSummaryTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 text-xs font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentResponses;
