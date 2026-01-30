import { useState, useEffect } from 'react';
import { Search, Download, Plus, AlertTriangle, ExternalLink } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { subscribeToStudents, importMockStudents } from '../../services/firebase';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminRoster = () => {
  const { configStatus } = useApp();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToStudents(setStudents);
    return () => unsubscribe();
  }, []);

  const handleImportMockData = async () => {
    if (!configStatus.firebase) {
      alert('Firebase not configured. Add your Firebase keys to .env first.');
      return;
    }
    
    setIsImporting(true);
    try {
      const success = await importMockStudents();
      if (success) {
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Import error:', error);
    }
    setIsImporting(false);
  };

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(search.toLowerCase()) ||
                          student.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRisk = filterRisk === 'all' || student.riskLevel === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const getRiskBadge = (level) => {
    const styles = {
      low: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30',
      medium: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
      high: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30',
      unknown: 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'
    };
    return styles[level] || styles.unknown;
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Student Roster</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{students.length} students enrolled</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleImportMockData}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {isImporting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Download size={18} />
              )}
              Import Mock Data
            </button>
          </div>
        </div>

        {/* Success Message */}
        {importSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-300 rounded-lg">
            Successfully imported 10 mock students!
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            
            {/* Risk Filter */}
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
              <option value="unknown">Unknown (No GPA)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center">
              <AlertTriangle className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No students found</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {students.length === 0 
                  ? 'Import mock data or add students to get started.'
                  : 'Try adjusting your search or filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto" role="region" aria-label="Students table">
              <table className="w-full" aria-describedby="roster-caption">
                <caption id="roster-caption" className="sr-only">
                  List of students with their milestone, GPA, risk level, and portfolio status
                </caption>
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Student</th>
                    <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Milestone</th>
                    <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">GPA</th>
                    <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Risk Level</th>
                    <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Portfolio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                            <span className="text-sky-600 dark:text-sky-400 font-medium">
                              {student.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{student.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-700 dark:text-slate-300">{student.milestone || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        {student.gpa != null ? (
                          <span className={`font-medium ${
                            student.gpa >= 3.5 ? 'text-green-600 dark:text-green-400' :
                            student.gpa >= 2.5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {student.gpa.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">Not provided</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getRiskBadge(student.riskLevel)}`}>
                          {student.riskLevel?.charAt(0).toUpperCase() + student.riskLevel?.slice(1) || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {student.portfolioLink ? (
                          <a
                            href={student.portfolioLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 flex items-center gap-1"
                          >
                            View <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminRoster;
