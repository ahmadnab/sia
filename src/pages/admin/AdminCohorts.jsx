import { useState, useEffect, useRef } from 'react';
import { Plus, Users, Calendar, Upload, X, Check, FileSpreadsheet, AlertCircle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import AdminLayout from '../../components/AdminLayout';
import { subscribeToCohorts, createCohort, importMockStudents, importStudentsFromCSVWithDedup } from '../../services/firebase';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState({});
  const [importStatus, setImportStatus] = useState({}); // { cohortId: { success, message, count, errors, emailsSent } }
  const fileInputRefs = useRef({});
  
  const [newCohort, setNewCohort] = useState({
    name: '',
    year: new Date().getFullYear().toString()
  });

  useEffect(() => {
    const unsubscribe = subscribeToCohorts(setCohorts);
    return () => unsubscribe();
  }, []);

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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cohort Manager</h1>
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
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-slate-900">No cohorts yet</h3>
            <p className="text-slate-500 mt-1">Create your first cohort to get started.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cohorts.map(cohort => (
              <div key={cohort.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{cohort.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
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
                    onClick={() => handleImportMockData(cohort.id)}
                    disabled={isImporting[cohort.id]}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm disabled:opacity-50"
                  >
                    <Upload size={16} />
                    Import Mock Data
                  </button>
                </div>
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
                className="bg-white rounded-2xl shadow-xl w-full max-w-md"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <h2 className="text-xl font-bold text-slate-900">Create New Cohort</h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Cohort Name
                    </label>
                    <input
                      type="text"
                      value={newCohort.name}
                      onChange={(e) => setNewCohort(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Computer Science 2024"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Year
                    </label>
                    <select
                      value={newCohort.year}
                      onChange={(e) => setNewCohort(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
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
      </div>
    </AdminLayout>
  );
};

export default AdminCohorts;
