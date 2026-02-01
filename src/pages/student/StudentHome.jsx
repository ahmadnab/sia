import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ClipboardList, Shield, ChevronRight, Users, FileText, Megaphone, AlertTriangle, Bell, Mail, X, Check, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { subscribeToSurveys, subscribeToCohorts, subscribeToAnnouncements, subscribeToDirectMessages, markDirectMessageRead } from '../../services/firebase';
import ThemeToggle from '../../components/ThemeToggle';

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
    let unsubMessages = () => { };
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 safe-bottom">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
                <span className="text-xl">👋</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  Welcome back
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {studentMilestone} • {cohorts.find(c => c.id === studentCohortId)?.name || 'Demo Cohort'}
                </p>
              </div>
            </div>

            {/* Theme Toggle & Profile Selectors */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/admin"
                className="group p-2 hover:px-3 flex items-center gap-0 hover:gap-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-all hover:scale-105 active:scale-95 hidden sm:flex items-center justify-center"
                title="Switch to Admin"
              >
                <Users size={20} />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-sm font-medium opacity-0 group-hover:opacity-100">
                  Switch to Admin
                </span>
              </Link>
              <ThemeToggle variant="icon" />

              {/* Profile Selectors - Condensed */}
              <div className="hidden sm:flex gap-2">
                <select
                  value={studentMilestone}
                  onChange={(e) => setStudentMilestone(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-700 border-none rounded-lg text-sm px-3 py-2 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-sky-500"
                >
                  {milestones.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-6">

        {/* HERO SECTION: Chat with Sia */}
        <section className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-6 lg:p-10 shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl lg:text-3xl font-bold mb-3">How can I help you today?</h2>
            <p className="text-sky-100 text-base lg:text-lg mb-8 leading-relaxed opacity-90">
              I can help you prepare for upcoming exams, summarize complex topics,
              or just chat about your stress levels.
            </p>
            <Link
              to="/student/chat"
              className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-900/10 hover:bg-indigo-50 hover:scale-105 transition-all"
            >
              <MessageCircle size={20} className="fill-current" />
              Chat with Sia
            </Link>
          </div>
          {/* Decorative background elements */}
          <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 pointer-events-none">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
              <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.5,70.9,32.3C59.6,43.1,48.3,51.8,36.4,58.6C24.5,65.4,12,70.3,-1.3,72.5C-14.6,74.7,-29.3,74.2,-42.6,67.8C-55.9,61.4,-67.9,49.1,-75.7,35C-83.5,20.9,-87.1,5,-84.6,-9.7C-82.1,-24.4,-73.5,-37.9,-61.9,-46.8C-50.3,-55.7,-35.7,-60,-22.1,-67.6C-8.5,-75.2,4.1,-86,17.4,-86.3C30.7,-86.6,44.7,-76.4,44.7,-76.4Z" transform="translate(100 100)" />
            </svg>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">

          {/* LEFT COLUMN: Feed (Announcements & Surveys) */}
          <div className="lg:col-span-2 space-y-8">

            {/* Direct Messages */}
            {studentEmail && directMessages.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="text-sky-500" size={20} />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">Messages</h3>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </div>
                <div className="space-y-3">
                  {directMessages.map(message => (
                    <motion.button
                      key={message.id}
                      onClick={() => handleOpenMessage(message)}
                      className={`w-full text-left rounded-xl border p-4 transition-all ${message.isRead
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        : 'bg-white dark:bg-slate-800 border-sky-400 shadow-sm ring-1 ring-sky-400/20'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-slate-900 dark:text-white">{message.subject}</span>
                        <span className="text-xs text-slate-500">{formatMessageDate(message.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{message.content}</p>
                    </motion.button>
                  ))}
                </div>
              </section>
            )}

            {/* Announcements Feed */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Megaphone className="text-amber-500" size={20} />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">Latest Updates</h3>
              </div>
              {announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map(announcement => (
                    <div key={announcement.id} className={`rounded-xl border p-5 ${getPriorityStyles(announcement.priority)} transition-all hover:shadow-md`}>
                      <div className="flex items-start gap-3">
                        {getPriorityIcon(announcement.priority)}
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100">{announcement.title}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {announcement.content}
                          </p>
                          <p className="text-xs text-slate-400 mt-2 font-medium">
                            {formatDate(announcement.publishedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <p className="text-slate-500">No new announcements today.</p>
                </div>
              )}
            </section>

            {/* Active Surveys */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="text-teal-500" size={20} />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">Action Items</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded-md">
                  <Shield size={12} />
                  <span>100% Anonymous</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {surveys.map(survey => (
                  <Link
                    key={survey.id}
                    to={`/student/survey/${survey.id}`}
                    className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-teal-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-500">
                        <FileText size={18} />
                      </div>
                      <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                        Active
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors line-clamp-2 mb-2">
                      {survey.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {survey.questions?.length || 0} questions • Estimated 2 min
                    </p>
                  </Link>
                ))}

                {surveys.length === 0 && (
                  <div className="col-span-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center opacity-75">
                    <p className="text-slate-500">You're all caught up! No active surveys.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Sidebar (Community Wall & Tools) */}
          <div className="space-y-6">

            {/* Community Wall Widget - Redesigned */}
            <Link to="/student/wall" className="block group">
              <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group-hover:shadow-xl transition-all">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Users size={20} className="text-white" />
                    </div>
                    <ChevronRight className="text-white/70 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Community Wall</h3>
                  <p className="text-indigo-100 text-sm mb-4"> See what your peers are talking about anonymously.</p>
                  <div className="inline-block bg-white/10 backdrop-blur-md rounded-lg px-3 py-1.5 text-xs font-medium border border-white/10">
                    Join the conversation →
                  </div>
                </div>
                {/* Abstract shapes */}
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-indigo-500 rounded-full blur-2xl opacity-50"></div>
              </div>
            </Link>

            {/* Quick Tools */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
                Your Tools
              </h3>
              <div className="space-y-1">
                <Link
                  to="/student/responses"
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                    <FileText size={16} />
                  </div>
                  <span className="font-medium text-sm">My Responses</span>
                </Link>
                {/* Placeholder for future tools */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg opacity-50 cursor-not-allowed">
                  <div className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg">
                    <BarChart3 size={16} />
                  </div>
                  <span className="font-medium text-sm text-slate-400">Progress (Coming Soon)</span>
                </div>
              </div>
            </div>

            {/* Privacy Card (Small) */}
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 flex gap-3 opacity-75">
              <Shield size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Sia uses <span className="font-semibold">Double-Blind Anonymity</span>. Your identity is never linked to your feedback.
              </p>
            </div>

          </div>

        </div>
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
