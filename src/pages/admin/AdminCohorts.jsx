import { useState, useEffect, useRef } from 'react';
import { Plus, Users, Calendar, Upload, X, Check, FileSpreadsheet, AlertCircle, Mail, ChevronDown, ChevronUp, UserPlus, Trash2 } from 'lucide-react';
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
        if (fileInputRefs.current[cohortId]) {
          fileInputRefs.current[cohortId].value = '';
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
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cohort Manager</h1>
            <p className="text-slate-500 mt-1">Create cohorts and import students</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            Create Cohort
          </button>
        </div>

        {/* CSV Import Info */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="text-sky-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium text-sky-900">CSV Import Format</p>
              <p className="text-xs text-sky-700 mt-1">
                Required columns: <code className="bg-sky-100 px-1 rounded">First Name</code>, 
                <code className="bg-sky-100 px-1 rounded ml-1">Last Name</code>, 
                <code className="bg-sky-100 px-1 rounded ml-1">Email</code>, 
                <code className="bg-sky-100 px-1 rounded ml-1">GPA</code>, 
                <code className="bg-sky-100 px-1 rounded ml-1">Portfolio_Link</code>, 
                <code className="bg-sky-100 px-1 rounded ml-1">Milestone_Tag</code>
              </p>
              <p className="text-xs text-sky-600 mt-2">
                Supports 50+ rows. Duplicates (same email in cohort) are automatically skipped.
              </p>
            </div>
          </div>
        </div>

        {/* Cohorts Grid */}
        {cohorts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-sm">
            <Users className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No cohorts yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Create your first cohort to get started.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {cohorts.map(cohort => (
                <div key={cohort.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm w-full">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{cohort.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-1">
                      <Calendar size={14} />
                      <span>{cohort.year}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                    <Users className="text-sky-500" size={20} />
                  </div>
                </div>
                
                {/* Import Status Message */}
                {importStatus[cohort.id] && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${
                    importStatus[cohort.id].success 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {importStatus[cohort.id].success ? (
                        <Check size={16} className="flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p>{importStatus[cohort.id].message}</p>
                        {/* Show errors if any */}
                        {importStatus[cohort.id].errors?.length > 0 && (
                          <ul className="mt-2 text-xs space-y-1">
                            {importStatus[cohort.id].errors.map((err, i) => (
                              <li key={i}>• {err}</li>
                            ))}
                          </ul>
                        )}
                        {/* Simulated email notification banner */}
                        {importStatus[cohort.id].success && importStatus[cohort.id].emailsSent && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                            <Mail size={12} />
                            <span>Demo: Welcome emails simulated for {importStatus[cohort.id].count} students</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* CSV Upload */}
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".csv"
                    ref={el => fileInputRefs.current[cohort.id] = el}
                    onChange={(e) => handleCSVUpload(cohort.id, e.target.files?.[0])}
                    className="hidden"
                    id={`csv-upload-${cohort.id}`}
                  />
                  <button
                    onClick={() => fileInputRefs.current[cohort.id]?.click()}
                    disabled={isImporting[cohort.id]}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                  >
                    {isImporting[cohort.id] ? (
                      <>
                        <LoadingSpinner size="sm" light />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet size={16} />
                        Upload CSV
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenAddStudent(cohort.id)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm"
                  >
                    <UserPlus size={16} />
                    Add Student
                  </button>
                </div>

                {/* Student List */}
                {(() => {
                  const cohortStudents = students.filter(s => s.cohortId === cohort.id);
                  const isExpanded = expandedCohorts.has(cohort.id);

                  return cohortStudents.length > 0 ? (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => toggleCohortExpansion(cohort.id)}
                        className="flex items-center justify-between w-full text-left mb-3"
                      >
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Students ({cohortStudents.length})
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-slate-500 dark:text-slate-400" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-500 dark:text-slate-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {cohortStudents.map(student => (
                            <div
                              key={student.id}
                              className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                  {student.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {student.email}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                {student.gpa !== null && (
                                  <span className="text-xs text-slate-600 dark:text-slate-300">
                                    GPA: {student.gpa.toFixed(1)}
                                  </span>
                                )}
                                {student.riskLevel && student.riskLevel !== 'unknown' && (
                                  <span
                                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                      student.riskLevel === 'high'
                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                        : student.riskLevel === 'medium'
                                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    }`}
                                  >
                                    {student.riskLevel}
                                  </span>
                                )}
                                <button
                                  onClick={() => handleDeleteStudent(student.id, student.name)}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                  title="Remove student"
                                >
                                  <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center">
                        No students in this cohort yet
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
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md"
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
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
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
      </div>
    </AdminLayout>
  );
};

export default AdminCohorts;
