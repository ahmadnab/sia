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
      low: 'bg-green-50 text-green-600 border-green-100',
      medium: 'bg-amber-50 text-amber-600 border-amber-100',
      high: 'bg-red-50 text-red-600 border-red-100',
      unknown: 'bg-slate-50 text-slate-600 border-slate-200'
    };
    return styles[level] || styles.unknown;
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Student Roster</h1>
            <p className="text-slate-500 mt-1">{students.length} students enrolled</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleImportMockData}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
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
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            Successfully imported 10 mock students!
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            
            {/* Risk Filter */}
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center">
              <AlertTriangle className="mx-auto text-slate-300 mb-4" size={48} />
              <h3 className="text-lg font-medium text-slate-900">No students found</h3>
              <p className="text-slate-500 mt-1">
                {students.length === 0 
                  ? 'Import mock data or add students to get started.'
                  : 'Try adjusting your search or filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Student</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Milestone</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">GPA</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Risk Level</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Portfolio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                            <span className="text-sky-600 font-medium">
                              {student.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{student.name}</p>
                            <p className="text-sm text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-700">{student.milestone || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        {student.gpa != null ? (
                          <span className={`font-medium ${
                            student.gpa >= 3.5 ? 'text-green-600' :
                            student.gpa >= 2.5 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {student.gpa.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
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
                            className="text-sky-500 hover:text-sky-600 flex items-center gap-1"
                          >
                            View <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
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
