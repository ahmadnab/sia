import { useState, useEffect } from 'react';
import { Search, AlertTriangle, ExternalLink, Users } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { subscribeToStudents } from '../../services/firebase';
import { useApp } from '../../context/AppContext';


const AdminRoster = () => {
  const { configStatus } = useApp();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');


  useEffect(() => {
    const unsubscribe = subscribeToStudents(setStudents);
    return () => unsubscribe();
  }, []);



  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(search.toLowerCase()) ||
      student.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRisk = filterRisk === 'all' || student.riskLevel === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const getRiskBadge = (level) => {
    const styles = {
      low: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
      medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
      high: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
      unknown: 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'
    };
    return styles[level] || styles.unknown;
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 shadow-xl shadow-indigo-500/20">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-100 mb-2">
                <Users size={16} className="text-amber-300" />
                <span className="text-sm font-medium tracking-wide uppercase opacity-90">Student Management</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Student Roster
              </h1>
              <p className="text-indigo-100/80 text-lg max-w-xl">
                Manage your {students.length} enrolled students, track their milestones, and monitor academic risk levels.
              </p>
            </div>


          </div>
        </div>



        {/* Filters Bar */}
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:text-white"
              />
            </div>

            {/* Risk Filter */}
            <div className="relative">
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="w-full sm:w-48 appearance-none px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {filteredStudents.length === 0 ? (
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
              <Search className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No students found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              We couldn't find any students matching your search. Try adjusting your filters or import new data.
            </p>
          </div>
        ) : (
          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/50 dark:border-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Milestone</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">GPA</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Risk Level</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Portfolio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shadow-sm group-hover:scale-110 transition-transform">
                            {student.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{student.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium border border-slate-200 dark:border-slate-700">
                          {student.milestone || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {student.gpa != null ? (
                          <span className={`font-bold ${student.gpa >= 3.5 ? 'text-emerald-600 dark:text-emerald-400' :
                            student.gpa >= 2.5 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                            {student.gpa.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${getRiskBadge(student.riskLevel)}`}>
                          {student.riskLevel?.charAt(0).toUpperCase() + student.riskLevel?.slice(1) || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {student.portfolioLink ? (
                          <a
                            href={student.portfolioLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
                          >
                            View <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-sm opacity-50">No link</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Custom Grid for mobile) */}
            <div className="md:hidden divide-y divide-slate-200/50 dark:divide-slate-800/50">
              {filteredStudents.map((student) => (
                <div key={student.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-800">
                        {student.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{student.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{student.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getRiskBadge(student.riskLevel)}`}>
                      {student.riskLevel?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
                      <span className="text-xs text-slate-400 block mb-0.5">GPA</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{student.gpa?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
                      <span className="text-xs text-slate-400 block mb-0.5">Milestone</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{student.milestone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRoster;
