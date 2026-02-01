import { useState, useEffect, useRef } from 'react';
import { Plus, Users, Calendar, Upload, X, Check, FileSpreadsheet, AlertCircle, Mail, ChevronDown, ChevronUp, UserPlus, Trash2, Download, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import AdminLayout from '../../components/AdminLayout';
import { subscribeToCohorts, createCohort, importMockStudents, importStudentsFromCSVWithDedup, subscribeToStudents, addStudent, deleteStudent } from '../../services/firebase';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../../components/LoadingSpinner';

// Required CSV headers (normalized for comparison)
const REQUIRED_HEADERS = ['firstname', 'lastname', 'email', 'gpa', 'portfoliolink', 'milestonetag'];
const HEADER_DISPLAY = ['First Name', 'Last Name', 'Email', 'GPA', 'Portfolio_Link', 'Milestone_Tag'];

// Normalize header for comparison
const normalizeHeader = (h) => h.toLowerCase().replace(/[_\s-]/g, '');

// Validate a single row and return errors
const validateRow = (row, rowIndex) => {
  const errors = [];
  const email = row.email || row.Email || row.EMAIL || '';
  const firstName = row['First Name'] || row.firstname || row.FirstName || '';
  const lastName = row['Last Name'] || row.lastname || row.LastName || '';

  if (!email || !email.includes('@')) {
    errors.push(`Row ${rowIndex + 1}: Invalid or missing email`);
  }
  if (!firstName.trim() && !lastName.trim()) {
    errors.push(`Row ${rowIndex + 1}: Missing name`);
  }

  return errors;
};

// Map PapaParse row to student data
const mapRowToStudent = (row, cohortId) => {
  // Find values with flexible header matching
  const getValue = (possibleKeys) => {
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== '') return row[key];
    }
    return '';
  };

  const firstName = getValue(['First Name', 'firstname', 'FirstName', 'first_name']);
  const lastName = getValue(['Last Name', 'lastname', 'LastName', 'last_name']);
  const email = getValue(['Email', 'email', 'EMAIL', 'e-mail']);
  const gpaStr = getValue(['GPA', 'gpa', 'Gpa']);
  const portfolioLink = getValue(['Portfolio_Link', 'portfoliolink', 'PortfolioLink', 'portfolio_link', 'Portfolio']);
  const milestoneTag = getValue(['Milestone_Tag', 'milestonetag', 'MilestoneTag', 'milestone_tag', 'Milestone']);

  // Parse GPA - treat missing/invalid as null
  const gpa = gpaStr ? parseFloat(gpaStr) : null;
  const validGpa = gpa !== null && !isNaN(gpa) ? gpa : null;

  // Derive risk level from GPA (null GPA = unknown risk)
  let riskLevel = 'unknown';
  if (validGpa !== null) {
    if (validGpa < 2.0) riskLevel = 'high';
    else if (validGpa < 2.5) riskLevel = 'medium';
    else riskLevel = 'low';
  }

  return {
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email: email.toLowerCase().trim(),
    gpa: validGpa,
    portfolioLink,
    milestoneTag,
    milestone: milestoneTag,
    riskLevel,
    cohortId
  };
};

const AdminCohorts = () => {
  const { configStatus } = useApp();
  const [cohorts, setCohorts] = useState([]);
  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState({});
  const [importStatus, setImportStatus] = useState({}); // { cohortId: { success, message, count, errors, emailsSent } }
  const [expandedCohorts, setExpandedCohorts] = useState(new Set());
  const fileInputRefs = useRef({});

  const [newCohort, setNewCohort] = useState({
    name: '',
    year: new Date().getFullYear().toString()
  });

  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [selectedCohortForStudent, setSelectedCohortForStudent] = useState(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gpa: '',
    portfolioLink: '',
    milestoneTag: ''
  });

  useEffect(() => {
    const unsubCohorts = subscribeToCohorts(setCohorts);
    const unsubStudents = subscribeToStudents(setStudents);
    return () => {
      unsubCohorts();
      unsubStudents();
    };
  }, []);

  // CSV Upload Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedUploadCohort, setSelectedUploadCohort] = useState('');
  const uploadFileRef = useRef(null);

  // CSV Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedExportCohort, setSelectedExportCohort] = useState('');

  // Generate and download sample CSV
  const handleDownloadSample = () => {
    const sampleData = `First Name,Last Name,Email,GPA,Portfolio_Link,Milestone_Tag
John,Doe,john.doe@example.edu,3.5,https://portfolio.com/john,Freshman
Jane,Smith,jane.smith@example.edu,3.8,https://portfolio.com/jane,Sophomore
Mike,Johnson,mike.johnson@example.edu,2.9,https://portfolio.com/mike,Senior`;

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export cohort students as CSV
  const handleExportCohort = () => {
    if (!selectedExportCohort) return;

    const cohort = cohorts.find(c => c.id === selectedExportCohort);
    const cohortStudents = students.filter(s => s.cohortId === selectedExportCohort);

    if (cohortStudents.length === 0) {
      alert('No students in this cohort to export.');
      return;
    }

    const csvData = Papa.unparse(cohortStudents.map(s => ({
      'First Name': s.firstName || '',
      'Last Name': s.lastName || '',
      'Email': s.email || '',
      'GPA': s.gpa !== null ? s.gpa : '',
      'Portfolio_Link': s.portfolioLink || '',
      'Milestone_Tag': s.milestoneTag || s.milestone || '',
      'Risk_Level': s.riskLevel || ''
    })));

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cohort?.name || 'cohort'}_students.csv`.replace(/\s+/g, '_');
    a.click();
    URL.revokeObjectURL(url);

    setIsExportModalOpen(false);
    setSelectedExportCohort('');
  };

  const toggleCohortExpansion = (cohortId) => {
    setExpandedCohorts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cohortId)) {
        newSet.delete(cohortId);
      } else {
        newSet.add(cohortId);
      }
      return newSet;
    });
  };

  // Handle CSV file upload with PapaParse
  const handleCSVUpload = async (cohortId, file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setImportStatus(prev => ({
        ...prev,
        [cohortId]: { success: false, message: 'Please select a valid CSV file' }
      }));
      return;
    }

    if (!configStatus.firebase) {
      setImportStatus(prev => ({
        ...prev,
        [cohortId]: { success: false, message: 'Firebase not configured' }
      }));
      return;
    }

    setIsImporting(prev => ({ ...prev, [cohortId]: true }));
    setImportStatus(prev => ({ ...prev, [cohortId]: null }));

    // Parse CSV with PapaParse
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: async (results) => {
        try {
          const { data, errors: parseErrors, meta } = results;

          // Check for parse errors
          if (parseErrors.length > 0) {
            setImportStatus(prev => ({
              ...prev,
              [cohortId]: {
                success: false,
                message: `CSV parse errors: ${parseErrors.slice(0, 3).map(e => e.message).join('; ')}`,
                errors: parseErrors.map(e => e.message)
              }
            }));
            setIsImporting(prev => ({ ...prev, [cohortId]: false }));
            return;
          }

          // Validate headers
          const normalizedHeaders = meta.fields.map(normalizeHeader);
          const missingHeaders = HEADER_DISPLAY.filter((h, i) =>
            !normalizedHeaders.includes(REQUIRED_HEADERS[i])
          );

          if (missingHeaders.length > 0) {
            setImportStatus(prev => ({
              ...prev,
              [cohortId]: {
                success: false,
                message: `Missing columns: ${missingHeaders.join(', ')}`
              }
            }));
            setIsImporting(prev => ({ ...prev, [cohortId]: false }));
            return;
          }

          if (data.length === 0) {
            setImportStatus(prev => ({
              ...prev,
              [cohortId]: { success: false, message: 'CSV file contains no data rows' }
            }));
            setIsImporting(prev => ({ ...prev, [cohortId]: false }));
            return;
          }

          // Validate each row
          const rowErrors = [];
          data.forEach((row, i) => {
            const errors = validateRow(row, i);
            rowErrors.push(...errors);
          });

          if (rowErrors.length > 0) {
            setImportStatus(prev => ({
              ...prev,
              [cohortId]: {
                success: false,
                message: `Validation errors in ${rowErrors.length} rows`,
                errors: rowErrors.slice(0, 5) // Show first 5 errors
              }
            }));
            setIsImporting(prev => ({ ...prev, [cohortId]: false }));
            return;
          }

          // Map rows to student data
          const students = data.map(row => mapRowToStudent(row, cohortId));

          // Import to Firestore with deduplication
          const result = await importStudentsFromCSVWithDedup(students, cohortId);

          if (result.success) {
            setImportStatus(prev => ({
              ...prev,
              [cohortId]: {
                success: true,
                message: `Imported ${result.imported} students${result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : ''}`,
                count: result.imported,
                skipped: result.skipped,
                emailsSent: true // Demo: simulated
              }
            }));
          } else {
            setImportStatus(prev => ({
              ...prev,
              [cohortId]: { success: false, message: result.message || 'Failed to import students' }
            }));
          }
        } catch (error) {
          console.error('CSV import error:', error);
          setImportStatus(prev => ({
            ...prev,
            [cohortId]: { success: false, message: 'Error processing CSV file' }
          }));
        }

        setIsImporting(prev => ({ ...prev, [cohortId]: false }));

        // Clear file input
        if (uploadFileRef.current) {
          uploadFileRef.current.value = '';
        }

        // Auto-clear success message after 8 seconds
        setTimeout(() => {
          setImportStatus(prev => ({ ...prev, [cohortId]: null }));
        }, 8000);
      },
      error: (error) => {
        console.error('PapaParse error:', error);
        setImportStatus(prev => ({
          ...prev,
          [cohortId]: { success: false, message: 'Failed to parse CSV file' }
        }));
        setIsImporting(prev => ({ ...prev, [cohortId]: false }));
      }
    });
  };

  const handleCreateCohort = async () => {
    if (!newCohort.name.trim()) return;
    if (!configStatus.firebase) {
      alert('Firebase not configured. Add your Firebase keys to .env first.');
      return;
    }

    setIsCreating(true);
    try {
      await createCohort(newCohort);
      setIsModalOpen(false);
      setNewCohort({ name: '', year: new Date().getFullYear().toString() });
    } catch (error) {
      console.error('Create error:', error);
    }
    setIsCreating(false);
  };

  const handleImportMockData = async (cohortId) => {
    if (!configStatus.firebase) {
      setImportStatus(prev => ({
        ...prev,
        [cohortId]: { success: false, message: 'Firebase not configured' }
      }));
      return;
    }

    setIsImporting(prev => ({ ...prev, [cohortId]: true }));
    setImportStatus(prev => ({ ...prev, [cohortId]: null }));

    try {
      const success = await importMockStudents(cohortId);
      if (success) {
        setImportStatus(prev => ({
          ...prev,
          [cohortId]: {
            success: true,
            message: 'Imported 10 mock students',
            count: 10,
            emailsSent: true // Demo: simulated
          }
        }));
      } else {
        setImportStatus(prev => ({
          ...prev,
          [cohortId]: { success: false, message: 'Failed to import mock data' }
        }));
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus(prev => ({
        ...prev,
        [cohortId]: { success: false, message: 'Error importing mock data' }
      }));
    }

    setIsImporting(prev => ({ ...prev, [cohortId]: false }));

    // Auto-clear after 8 seconds
    setTimeout(() => {
      setImportStatus(prev => ({ ...prev, [cohortId]: null }));
    }, 8000);
  };

  const handleOpenAddStudent = (cohortId) => {
    setSelectedCohortForStudent(cohortId);
    setIsAddStudentModalOpen(true);
  };

  const handleAddStudent = async () => {
    if (!newStudent.firstName.trim() || !newStudent.lastName.trim() || !newStudent.email.trim()) {
      alert('Please fill in at least name and email');
      return;
    }

    if (!configStatus.firebase) {
      alert('Firebase not configured. Add your Firebase keys to .env first.');
      return;
    }

    setIsAddingStudent(true);
    try {
      const gpa = newStudent.gpa ? parseFloat(newStudent.gpa) : null;
      const validGpa = gpa !== null && !isNaN(gpa) ? gpa : null;

      let riskLevel = 'unknown';
      if (validGpa !== null) {
        if (validGpa < 2.0) riskLevel = 'high';
        else if (validGpa < 2.5) riskLevel = 'medium';
        else riskLevel = 'low';
      }

      const studentData = {
        firstName: newStudent.firstName.trim(),
        lastName: newStudent.lastName.trim(),
        name: `${newStudent.firstName.trim()} ${newStudent.lastName.trim()}`,
        email: newStudent.email.toLowerCase().trim(),
        gpa: validGpa,
        portfolioLink: newStudent.portfolioLink.trim(),
        milestoneTag: newStudent.milestoneTag.trim(),
        milestone: newStudent.milestoneTag.trim(),
        riskLevel,
        cohortId: selectedCohortForStudent
      };

      await addStudent(studentData);
      setIsAddStudentModalOpen(false);
      setNewStudent({
        firstName: '',
        lastName: '',
        email: '',
        gpa: '',
        portfolioLink: '',
        milestoneTag: ''
      });
    } catch (error) {
      console.error('Add student error:', error);
      alert('Failed to add student');
    }
    setIsAddingStudent(false);
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    const confirmed = window.confirm(`Are you sure you want to remove ${studentName} from this cohort?`);
    if (!confirmed) return;

    if (!configStatus.firebase) {
      alert('Firebase not configured');
      return;
    }

    const success = await deleteStudent(studentId);
    if (!success) {
      alert('Failed to remove student');
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 shadow-xl shadow-indigo-500/20">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-100 mb-2">
                <Users size={16} className="text-amber-300" />
                <span className="text-sm font-medium tracking-wide uppercase opacity-90">Academic Management</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Cohort Manager
              </h1>
              <p className="text-indigo-100/80 text-lg max-w-xl">
                Create and manage student cohorts, import rosters, and track academic progress across different years.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                disabled={cohorts.length === 0}
                className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={18} />
                <span className="font-medium">Import CSV</span>
              </button>

              <button
                onClick={() => setIsExportModalOpen(true)}
                disabled={cohorts.length === 0 || students.length === 0}
                className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                <span className="font-medium">Export CSV</span>
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl shadow-lg shadow-black/10 transition-all active:scale-95"
              >
                <Plus size={18} />
                <span>New Cohort</span>
              </button>
            </div>
          </div>
        </div>

        {/* Cohorts Grid */}
        {cohorts.length === 0 ? (
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
              <Users className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No cohorts yet</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Get started by creating your first student cohort.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {cohorts.map(cohort => (
              <div key={cohort.id} className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{cohort.name}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1">
                      <Calendar size={14} className="text-indigo-500" />
                      <span className="font-medium">{cohort.year}</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                    <Users className="text-indigo-600 dark:text-indigo-400" size={24} />
                  </div>
                </div>

                {/* Import Status Message */}
                {importStatus[cohort.id] && (
                  <div className={`mb-4 p-4 rounded-xl text-sm border ${importStatus[cohort.id].success
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-800'
                    }`}>
                    <div className="flex items-start gap-3">
                      {importStatus[cohort.id].success ? (
                        <Check size={18} className="flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{importStatus[cohort.id].message}</p>
                        {/* Show errors if any */}
                        {importStatus[cohort.id].errors?.length > 0 && (
                          <ul className="mt-2 text-xs space-y-1 opacity-90">
                            {importStatus[cohort.id].errors.map((err, i) => (
                              <li key={i}>• {err}</li>
                            ))}
                          </ul>
                        )}
                        {/* Simulated email notification banner */}
                        {importStatus[cohort.id].success && importStatus[cohort.id].emailsSent && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 px-2 py-1.5 rounded-lg">
                            <Mail size={12} />
                            <span className="font-medium">Welcome emails sent to {importStatus[cohort.id].count} students</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => handleOpenAddStudent(cohort.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 text-sm font-medium"
                  >
                    <UserPlus size={16} />
                    Add Student Manually
                  </button>
                </div>

                {/* Student List */}
                {(() => {
                  const cohortStudents = students.filter(s => s.cohortId === cohort.id);
                  const isExpanded = expandedCohorts.has(cohort.id);

                  return cohortStudents.length > 0 ? (
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => toggleCohortExpansion(cohort.id)}
                        className="flex items-center justify-between w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group/accordion"
                      >
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          Enrolled Students ({cohortStudents.length})
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-slate-400 group-hover/accordion:text-indigo-500 transition-colors" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400 group-hover/accordion:text-indigo-500 transition-colors" />
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2 mt-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                              {cohortStudents.map(student => (
                                <div
                                  key={student.id}
                                  className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg text-sm border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800/30 transition-colors"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                      {student.name}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                      {student.email}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    {student.gpa !== null && (
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${student.gpa >= 3.0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {student.gpa.toFixed(1)} CPA
                                      </span>
                                    )}
                                    <button
                                      onClick={() => handleDeleteStudent(student.id, student.name)}
                                      className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-md transition-colors group/delete"
                                      title="Remove student"
                                    >
                                      <Trash2 size={14} className="text-slate-400 group-hover/delete:text-rose-500 transition-colors" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <p className="text-xs text-slate-400 italic text-center py-2">
                        No students enrolled yet
                      </p>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}

        {/* Create Cohort Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setIsModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-2xl w-full max-w-md"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create New Cohort</h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Cohort Name
                    </label>
                    <input
                      type="text"
                      value={newCohort.name}
                      onChange={(e) => setNewCohort(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Computer Science 2024"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Year
                    </label>
                    <select
                      value={newCohort.year}
                      onChange={(e) => setNewCohort(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCohort}
                    disabled={isCreating || !newCohort.name.trim()}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCreating ? <LoadingSpinner size="sm" light /> : <Check size={16} />}
                    Create Cohort
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Student Modal */}
        <AnimatePresence>
          {isAddStudentModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setIsAddStudentModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add Student</h2>
                  <button
                    onClick={() => setIsAddStudentModalOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={newStudent.firstName}
                        onChange={(e) => setNewStudent(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="John"
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={newStudent.lastName}
                        onChange={(e) => setNewStudent(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Doe"
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john.doe@university.edu"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      GPA
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={newStudent.gpa}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, gpa: e.target.value }))}
                      placeholder="3.5"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Portfolio Link
                    </label>
                    <input
                      type="url"
                      value={newStudent.portfolioLink}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, portfolioLink: e.target.value }))}
                      placeholder="https://portfolio.example.com"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Milestone Tag
                    </label>
                    <input
                      type="text"
                      value={newStudent.milestoneTag}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, milestoneTag: e.target.value }))}
                      placeholder="e.g., Final Project"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                  <button
                    onClick={() => setIsAddStudentModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStudent}
                    disabled={isAddingStudent || !newStudent.firstName.trim() || !newStudent.lastName.trim() || !newStudent.email.trim()}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAddingStudent ? <LoadingSpinner size="sm" light /> : <UserPlus size={16} />}
                    Add Student
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CSV Upload Modal */}
        <AnimatePresence>
          {isUploadModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setIsUploadModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-2xl w-full max-w-md"
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Upload Student CSV</h2>
                  <button
                    onClick={() => setIsUploadModalOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-lg text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold mb-1">CSV Format Requirements:</p>
                        <p>Files must include: First Name, Last Name, Email, GPA, Portfolio Link, Milestone Tag.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Select Cohort
                    </label>
                    <select
                      value={selectedUploadCohort}
                      onChange={(e) => setSelectedUploadCohort(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select a cohort...</option>
                      {cohorts.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
                      ))}
                    </select>
                  </div>

                  {selectedUploadCohort && importStatus[selectedUploadCohort] && (
                    <div className={`p-3 rounded-lg text-sm ${importStatus[selectedUploadCohort].success
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                      <div className="flex items-start gap-2">
                        {importStatus[selectedUploadCohort].success ? (
                          <Check size={16} className="flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p>{importStatus[selectedUploadCohort].message}</p>
                          {importStatus[selectedUploadCohort].errors?.length > 0 && (
                            <ul className="mt-2 text-xs space-y-1">
                              {importStatus[selectedUploadCohort].errors.map((err, i) => (
                                <li key={i}>• {err}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleDownloadSample}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-600 dark:text-slate-300"
                    >
                      <FileSpreadsheet size={16} />
                      Download Sample CSV
                    </button>

                    <div className="relative">
                      <input
                        ref={uploadFileRef}
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          if (selectedUploadCohort && e.target.files?.[0]) {
                            handleCSVUpload(selectedUploadCohort, e.target.files[0]);
                          }
                        }}
                        className="hidden"
                        id="csv-upload-input"
                        disabled={!selectedUploadCohort || isImporting[selectedUploadCohort]}
                      />
                      <label
                        htmlFor="csv-upload-input"
                        className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-lg transition-all cursor-pointer ${!selectedUploadCohort
                          ? 'border-slate-200 dark:border-slate-700 text-slate-400 bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed'
                          : isImporting[selectedUploadCohort]
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-600 cursor-wait'
                            : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                          }`}
                      >
                        {isImporting[selectedUploadCohort] ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Upload size={20} />
                        )}
                        <span className="font-medium">
                          {isImporting[selectedUploadCohort] ? 'Uploading...' : 'Upload CSV'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                  <button
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CSV Export Modal */}
        <AnimatePresence>
          {isExportModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setIsExportModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-2xl w-full max-w-md"
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Export Cohort Data</h2>
                  <button
                    onClick={() => setIsExportModalOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Select Cohort to Export
                    </label>
                    <select
                      value={selectedExportCohort}
                      onChange={(e) => setSelectedExportCohort(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select a cohort...</option>
                      {cohorts.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg text-sm text-slate-600 dark:text-slate-400">
                    <p>This will export all students from the selected cohort as a CSV file, including their profiles, GPAs, and milestone tags.</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                  <button
                    onClick={() => setIsExportModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExportCohort}
                    disabled={!selectedExportCohort}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminCohorts;
