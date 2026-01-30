import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ClipboardList, Shield, ChevronRight, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { subscribeToSurveys, subscribeToCohorts } from '../../services/firebase';
import ThemeToggle from '../../components/ThemeToggle';

const StudentHome = () => {
  const { studentMilestone, setStudentMilestone, studentCohortId, setStudentCohortId } = useApp();
  const [allSurveys, setAllSurveys] = useState([]);
  const [cohorts, setCohorts] = useState([]);

  useEffect(() => {
    const unsubSurveys = subscribeToSurveys((data) => {
      setAllSurveys(data.filter(s => s.status === 'Active'));
    }, 'Active');
    const unsubCohorts = subscribeToCohorts(setCohorts);
    return () => {
      unsubSurveys();
      unsubCohorts();
    };
  }, []);

  // Filter surveys based on student's cohort
  // Show surveys that: have no cohortId (all students) OR match student's cohortId
  const surveys = allSurveys.filter(s => {
    if (!s.cohortId) return true; // Survey is for all students
    if (!studentCohortId) return true; // Student has no cohort filter (demo mode - see all)
    return s.cohortId === studentCohortId; // Match student's cohort
  });

  const milestones = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Final Year'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Hey there! <span className="text-sky-500 dark:text-sky-400">👋</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Welcome to Sia, your academic companion</p>
          
          {/* Profile Selectors */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">Your Stage</label>
              <select
                value={studentMilestone}
                onChange={(e) => setStudentMilestone(e.target.value)}
                className="mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {milestones.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                <Users size={10} />
                Your Cohort
              </label>
              <select
                value={studentCohortId}
                onChange={(e) => setStudentCohortId(e.target.value)}
                className="mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">All Cohorts (Demo)</option>
                {cohorts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Theme Toggle - Fixed Position */}
      <div className="fixed bottom-24 right-6 z-40">
        <ThemeToggle />
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/student/chat"
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-sky-500/50 transition-all group"
            >
              <div className="w-10 h-10 bg-sky-500/20 dark:bg-sky-500/20 rounded-lg flex items-center justify-center mb-3">
                <MessageCircle className="text-sky-400 dark:text-sky-400" size={20} />
              </div>
              <h3 className="font-medium text-slate-900 dark:text-white">Chat with Sia</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Get instant help</p>
            </Link>
            
            <Link
              to="/student/wall"
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-teal-500/50 transition-all group"
            >
              <div className="w-10 h-10 bg-teal-500/20 dark:bg-teal-500/20 rounded-lg flex items-center justify-center mb-3">
                <Shield className="text-teal-400 dark:text-teal-400" size={20} />
              </div>
              <h3 className="font-medium text-slate-900 dark:text-white">Anonymous Wall</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Your voice, protected</p>
            </Link>
          </div>
        </section>

        {/* Active Surveys */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Active Surveys</h2>
            <div className="flex items-center gap-1 text-xs text-teal-400 dark:text-teal-400">
              <Shield size={12} />
              <span>100% Anonymous</span>
            </div>
          </div>

          {surveys.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
              <ClipboardList className="mx-auto text-slate-600 dark:text-slate-500 mb-2" size={32} />
              <p className="text-slate-600 dark:text-slate-400">No active surveys right now</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Check back later!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {surveys.map(survey => (
                <Link
                  key={survey.id}
                  to={`/student/survey/${survey.id}`}
                  className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-sky-500/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
                        {survey.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {survey.questions?.length || 0} questions
                      </p>
                    </div>
                    <ChevronRight className="text-slate-600 dark:text-slate-500 group-hover:text-sky-400 transition-colors" size={20} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Privacy Assurance */}
        <section className="bg-slate-800/50 dark:bg-slate-800/50 border border-slate-700 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-teal-500/20 dark:bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="text-teal-400 dark:text-teal-400" size={16} />
            </div>
            <div>
              <h3 className="font-medium text-white dark:text-slate-100 text-sm">Your Privacy Matters</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Survey responses are completely anonymous. We use a double-blind system — 
                even database admins can't link your answers to your identity.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudentHome;
