import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ClipboardList, Shield, ChevronRight, Users, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { subscribeToSurveys, subscribeToCohorts } from '../../services/firebase';

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
                <label className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1">Your Stage</label>
                <select
                  value={studentMilestone}
                  onChange={(e) => setStudentMilestone(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {milestones.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1">
                  Your Cohort
                </label>
                <select
                  value={studentCohortId}
                  onChange={(e) => setStudentCohortId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
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

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-8 pb-24">
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
    </div>
  );
};

export default StudentHome;
