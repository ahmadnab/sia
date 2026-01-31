import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ClipboardList, Shield, ChevronRight, Users, FileText, Megaphone, AlertTriangle, Bell, Mail, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { subscribeToSurveys, subscribeToCohorts, subscribeToAnnouncements, subscribeToDirectMessages, markDirectMessageRead } from '../../services/firebase';

const StudentHome = () => {
  const { studentMilestone, setStudentMilestone, studentCohortId, setStudentCohortId } = useApp();
  const [allSurveys, setAllSurveys] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [allAnnouncements, setAllAnnouncements] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Get student email from localStorage (set when they use chat)
  const studentEmail = (() => {
    try {
      return localStorage.getItem('studentEmail') || '';
    } catch {
      return '';
    }
  })();

  useEffect(() => {
    const unsubSurveys = subscribeToSurveys((data) => {
      setAllSurveys(data.filter(s => s.status === 'Active'));
    }, 'Active');
    const unsubCohorts = subscribeToCohorts(setCohorts);
    const unsubAnnouncements = subscribeToAnnouncements((data) => {
      setAllAnnouncements(data.filter(a => a.status === 'published'));
    });

    // Subscribe to direct messages if student has email set
    let unsubMessages = () => {};
    if (studentEmail) {
      unsubMessages = subscribeToDirectMessages(studentEmail, setDirectMessages);
    }

    return () => {
      unsubSurveys();
      unsubCohorts();
      unsubAnnouncements();
      unsubMessages();
    };
  }, [studentEmail]);

  // Filter surveys based on student's cohort
  // Show surveys that: have no cohortId (all students) OR match student's cohortId
  const surveys = allSurveys.filter(s => {
    if (!s.cohortId) return true; // Survey is for all students
    if (!studentCohortId) return true; // Student has no cohort filter (demo mode - see all)
    return s.cohortId === studentCohortId; // Match student's cohort
  });

  // Filter announcements based on student's cohort
  const announcements = allAnnouncements.filter(a => {
    if (!a.cohortId) return true; // Announcement is for all students
    if (!studentCohortId) return true; // Student has no cohort filter (demo mode - see all)
    return a.cohortId === studentCohortId; // Match student's cohort
  });

  const milestones = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Final Year'];

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30';
      case 'important':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30';
      default:
        return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent') return <AlertTriangle className="text-red-500" size={18} />;
    if (priority === 'important') return <Bell className="text-amber-500" size={18} />;
    return <Megaphone className="text-sky-500" size={18} />;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOpenMessage = async (message) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      await markDirectMessageRead(message.id);
    }
  };

  const unreadCount = directMessages.filter(m => !m.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                Hey there! <span className="text-sky-500 dark:text-sky-400">👋</span>
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Welcome to Sia, your academic companion</p>
            </div>

            {/* Profile Selectors */}
            <div className="flex flex-col sm:flex-row gap-3 lg:min-w-[400px]">
              <div className="flex-1">
                <label className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1.5">Your Stage</label>
                <select
                  value={studentMilestone}
                  onChange={(e) => setStudentMilestone(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 sm:py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-base"
                >
                  {milestones.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                  Your Cohort
                </label>
                <select
                  value={studentCohortId}
                  onChange={(e) => setStudentCohortId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 sm:py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-base"
                >
                  <option value="">All Cohorts (Demo)</option>
                  {cohorts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-8 pb-24 safe-bottom">
        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <Link
              to="/student/chat"
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-sky-500/50 transition-all group hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-sky-500/20 dark:bg-sky-500/20 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="text-sky-500 dark:text-sky-400" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Chat with Sia</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Get instant help and academic support</p>
            </Link>

            <Link
              to="/student/responses"
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-purple-500/50 transition-all group hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-purple-500/20 dark:bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <FileText className="text-purple-500 dark:text-purple-400" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">My Responses</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">View your survey submissions</p>
            </Link>

            <Link
              to="/student/wall"
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-teal-500/50 transition-all group hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-teal-500/20 dark:bg-teal-500/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="text-teal-500 dark:text-teal-400" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Anonymous Wall</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Your voice, safely protected</p>
            </Link>
          </div>
        </section>

        {/* Direct Messages */}
        {studentEmail && directMessages.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Mail size={16} />
              Messages from Coordinator
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-sky-500 text-white text-xs rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {directMessages.map(message => (
                <motion.button
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleOpenMessage(message)}
                  className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-lg ${
                    message.isRead
                      ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      : 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.isRead
                        ? 'bg-slate-100 dark:bg-slate-700'
                        : 'bg-sky-500'
                    }`}>
                      <Mail size={18} className={message.isRead ? 'text-slate-500 dark:text-slate-400' : 'text-white'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={`font-semibold truncate ${
                          message.isRead
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {message.subject}
                        </h3>
                        {!message.isRead && (
                          <span className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">
                        {message.content}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        {message.senderName || 'Course Coordinator'} • {formatMessageDate(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* Announcements */}
        {announcements.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Megaphone size={16} />
              Announcements
            </h2>
            <div className="space-y-3">
              {announcements.map(announcement => (
                <div
                  key={announcement.id}
                  className={`rounded-xl border p-4 lg:p-5 ${getPriorityStyles(announcement.priority)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getPriorityIcon(announcement.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {announcement.title}
                        </h3>
                        {announcement.priority === 'urgent' && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-medium">
                            Urgent
                          </span>
                        )}
                        {announcement.priority === 'important' && (
                          <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                            Important
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                        {formatDate(announcement.publishedAt || announcement.createdAt)} • {announcement.authorName || 'Course Coordinator'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active Surveys */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Active Surveys</h2>
            <div className="flex items-center gap-1.5 text-xs text-teal-400 dark:text-teal-400">
              <Shield size={14} />
              <span>100% Anonymous</span>
            </div>
          </div>

          {surveys.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 lg:p-12 text-center">
              <ClipboardList className="mx-auto text-slate-600 dark:text-slate-500 mb-3" size={40} />
              <p className="text-base text-slate-600 dark:text-slate-400">No active surveys right now</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Check back later!</p>
            </div>
          ) : (
            <div className="space-y-3 lg:space-y-4">
              {surveys.map(survey => (
                <Link
                  key={survey.id}
                  to={`/student/survey/${survey.id}`}
                  className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 lg:p-6 hover:border-sky-500/50 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-base lg:text-lg font-semibold text-slate-900 dark:text-white group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
                        {survey.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
                        {survey.questions?.length || 0} questions
                      </p>
                    </div>
                    <ChevronRight className="text-slate-600 dark:text-slate-500 group-hover:text-sky-400 transition-colors flex-shrink-0 ml-4" size={24} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Privacy Assurance */}
        <section className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-700/80 dark:border-slate-700 rounded-xl p-5 lg:p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-teal-500/20 dark:bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="text-teal-400 dark:text-teal-400" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white dark:text-slate-100 text-base lg:text-lg">Your Privacy Matters</h3>
              <p className="text-sm lg:text-base text-slate-300 dark:text-slate-400 mt-2 leading-relaxed">
                Survey responses are completely anonymous. We use a double-blind system —
                even database admins can't link your answers to your identity.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Message Detail Modal */}
      <AnimatePresence>
        {selectedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedMessage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-500/20 rounded-full flex items-center justify-center">
                    <Mail size={20} className="text-sky-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {selectedMessage.subject}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      From {selectedMessage.senderName || 'Course Coordinator'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto max-h-[50vh]">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                  {formatMessageDate(selectedMessage.createdAt)}
                </p>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.content}
                </p>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <div className="flex items-center gap-2 text-sm text-teal-500">
                  <Check size={16} />
                  <span>Message read</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentHome;
