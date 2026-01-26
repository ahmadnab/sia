import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs,
  query, 
  where, 
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if Firebase is configured
export const isFirebaseConfigured = () => {
  return !!(
    firebaseConfig.apiKey && 
    firebaseConfig.projectId && 
    firebaseConfig.apiKey !== 'your_firebase_api_key'
  );
};

// Initialize Firebase only if configured
let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured()) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

// Anonymous authentication
export const signInAnonymousUser = async () => {
  if (!auth) return null;
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error('Anonymous auth error:', error);
    return null;
  }
};

// Auth state listener
export const onAuthChange = (callback) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

// ===================
// STUDENTS COLLECTION
// ===================

export const subscribeToStudents = (callback) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  const studentsRef = collection(db, 'students');
  const q = query(studentsRef, orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const students = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(students);
  }, (error) => {
    console.error('Students subscription error:', error);
    callback([]);
  });
};

export const addStudent = async (studentData) => {
  if (!db) return null;
  const studentsRef = collection(db, 'students');
  const docRef = await addDoc(studentsRef, {
    ...studentData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const importMockStudents = async (cohortId = null) => {
  if (!db) return false;
  
  // Mock students matching CSV import fields: First Name, Last Name, Email, GPA, Portfolio_Link, Milestone_Tag
  const mockStudents = [
    { firstName: 'Alice', lastName: 'Johnson', email: 'alice@university.edu', gpa: 3.8, milestoneTag: 'Sem 4', riskLevel: 'low', portfolioLink: 'https://portfolio.alice.dev' },
    { firstName: 'Bob', lastName: 'Smith', email: 'bob@university.edu', gpa: 2.9, milestoneTag: 'Sem 2', riskLevel: 'medium', portfolioLink: 'https://portfolio.bob.dev' },
    { firstName: 'Carol', lastName: 'Williams', email: 'carol@university.edu', gpa: 3.5, milestoneTag: 'Final Year', riskLevel: 'low', portfolioLink: 'https://portfolio.carol.dev' },
    { firstName: 'David', lastName: 'Brown', email: 'david@university.edu', gpa: 2.1, milestoneTag: 'Sem 1', riskLevel: 'high', portfolioLink: 'https://portfolio.david.dev' },
    { firstName: 'Emma', lastName: 'Davis', email: 'emma@university.edu', gpa: 3.9, milestoneTag: 'Sem 3', riskLevel: 'low', portfolioLink: 'https://portfolio.emma.dev' },
    { firstName: 'Frank', lastName: 'Miller', email: 'frank@university.edu', gpa: 2.5, milestoneTag: 'Sem 2', riskLevel: 'medium', portfolioLink: 'https://portfolio.frank.dev' },
    { firstName: 'Grace', lastName: 'Wilson', email: 'grace@university.edu', gpa: 3.2, milestoneTag: 'Sem 4', riskLevel: 'low', portfolioLink: 'https://portfolio.grace.dev' },
    { firstName: 'Henry', lastName: 'Taylor', email: 'henry@university.edu', gpa: 1.9, milestoneTag: 'Sem 1', riskLevel: 'high', portfolioLink: 'https://portfolio.henry.dev' },
    { firstName: 'Ivy', lastName: 'Anderson', email: 'ivy@university.edu', gpa: 3.6, milestoneTag: 'Final Year', riskLevel: 'low', portfolioLink: 'https://portfolio.ivy.dev' },
    { firstName: 'Jack', lastName: 'Thomas', email: 'jack@university.edu', gpa: 2.7, milestoneTag: 'Sem 3', riskLevel: 'medium', portfolioLink: 'https://portfolio.jack.dev' },
  ];

  const batch = writeBatch(db);
  const studentsRef = collection(db, 'students');
  
  mockStudents.forEach((student) => {
    const docRef = doc(studentsRef);
    batch.set(docRef, {
      ...student,
      name: `${student.firstName} ${student.lastName}`, // Combined for display
      milestone: student.milestoneTag, // Alias for compatibility
      cohortId: cohortId,
      createdAt: serverTimestamp()
    });
  });

  try {
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Batch write error:', error);
    return false;
  }
};

// Import students from parsed CSV data
export const importStudentsFromCSV = async (students) => {
  if (!db) return false;
  if (!students || students.length === 0) return false;

  // Firestore batch writes are limited to 500 operations
  // Split into chunks if necessary
  const BATCH_SIZE = 500;
  const studentsRef = collection(db, 'students');

  try {
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const chunk = students.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      
      chunk.forEach((student) => {
        const docRef = doc(studentsRef);
        batch.set(docRef, {
          firstName: student.firstName || '',
          lastName: student.lastName || '',
          name: student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
          email: (student.email || '').toLowerCase().trim(),
          gpa: student.gpa, // Can be null for unknown
          portfolioLink: student.portfolioLink || '',
          milestoneTag: student.milestoneTag || '',
          milestone: student.milestone || student.milestoneTag || '',
          riskLevel: student.riskLevel || 'unknown',
          cohortId: student.cohortId || null,
          createdAt: serverTimestamp()
        });
      });
      
      await batch.commit();
    }
    return true;
  } catch (error) {
    console.error('CSV batch import error:', error);
    return false;
  }
};

// Import students with deduplication by email + cohortId
export const importStudentsFromCSVWithDedup = async (students, cohortId) => {
  if (!db) return { success: false, message: 'Database not configured' };
  if (!students || students.length === 0) return { success: false, message: 'No students to import' };

  try {
    // Get existing students for this cohort
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('cohortId', '==', cohortId));
    const snapshot = await getDocs(q);
    
    const existingEmails = new Set();
    snapshot.docs.forEach(doc => {
      const email = doc.data().email?.toLowerCase().trim();
      if (email) existingEmails.add(email);
    });
    
    // Filter out duplicates
    const newStudents = students.filter(s => {
      const email = s.email?.toLowerCase().trim();
      return email && !existingEmails.has(email);
    });
    
    const skipped = students.length - newStudents.length;
    
    if (newStudents.length === 0) {
      return { 
        success: true, 
        imported: 0, 
        skipped,
        message: skipped > 0 ? 'All students already exist in this cohort' : 'No valid students to import'
      };
    }
    
    // Import new students in batches
    const BATCH_SIZE = 500;
    
    for (let i = 0; i < newStudents.length; i += BATCH_SIZE) {
      const chunk = newStudents.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      
      chunk.forEach((student) => {
        const docRef = doc(studentsRef);
        batch.set(docRef, {
          firstName: student.firstName || '',
          lastName: student.lastName || '',
          name: student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
          email: (student.email || '').toLowerCase().trim(),
          gpa: student.gpa, // Can be null for unknown
          portfolioLink: student.portfolioLink || '',
          milestoneTag: student.milestoneTag || '',
          milestone: student.milestone || student.milestoneTag || '',
          riskLevel: student.riskLevel || 'unknown',
          cohortId: cohortId,
          createdAt: serverTimestamp()
        });
      });
      
      await batch.commit();
    }
    
    return { 
      success: true, 
      imported: newStudents.length, 
      skipped 
    };
  } catch (error) {
    console.error('CSV dedup import error:', error);
    return { success: false, message: error.message || 'Import failed' };
  }
};

// ===================
// SURVEYS COLLECTION
// ===================

export const subscribeToSurveys = (callback, statusFilter = null) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  const surveysRef = collection(db, 'surveys');
  let q;
  if (statusFilter) {
    q = query(surveysRef, where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
  } else {
    q = query(surveysRef, orderBy('createdAt', 'desc'));
  }
  return onSnapshot(q, (snapshot) => {
    const surveys = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(surveys);
  }, (error) => {
    console.error('Surveys subscription error:', error);
    callback([]);
  });
};

export const createSurvey = async (surveyData) => {
  if (!db) return null;
  const surveysRef = collection(db, 'surveys');
  const isPublishing = surveyData.status === 'Active';
  const docRef = await addDoc(surveysRef, {
    title: surveyData.title,
    questions: surveyData.questions || [],
    cohortId: surveyData.cohortId || null, // Target cohort (null = all students)
    status: surveyData.status || 'Active', // 'Active', 'Draft', or 'Closed'
    createdAt: serverTimestamp(),
    publishedAt: isPublishing ? serverTimestamp() : null,
    notificationsSentAt: isPublishing ? serverTimestamp() : null // Demo: simulated
  });
  return docRef.id;
};

export const closeSurvey = async (surveyId) => {
  if (!db) return false;
  const surveyRef = doc(db, 'surveys', surveyId);
  await updateDoc(surveyRef, { status: 'Closed' });
  return true;
};

export const publishSurvey = async (surveyId) => {
  if (!db) return false;
  const surveyRef = doc(db, 'surveys', surveyId);
  await updateDoc(surveyRef, { 
    status: 'Active',
    publishedAt: serverTimestamp(),
    notificationsSentAt: serverTimestamp() // Demo: simulated notification
  });
  return true;
};

// ====================
// RESPONSES COLLECTION (Anonymous - No User ID!)
// ====================

export const subscribeToResponses = (callback, surveyId = null) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  const responsesRef = collection(db, 'responses');
  let q;
  if (surveyId) {
    q = query(responsesRef, where('surveyId', '==', surveyId), orderBy('timestamp', 'desc'));
  } else {
    q = query(responsesRef, orderBy('timestamp', 'desc'));
  }
  return onSnapshot(q, (snapshot) => {
    const responses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(responses);
  }, (error) => {
    console.error('Responses subscription error:', error);
    callback([]);
  });
};

// CRITICAL: This function intentionally does NOT store any user identifier
export const submitAnonymousResponse = async (responseData) => {
  if (!db) return null;
  const responsesRef = collection(db, 'responses');
  
  // Double-blind: Only store survey data, NO user ID
  const anonymousData = {
    surveyId: responseData.surveyId,
    answerText: responseData.answerText,
    answers: responseData.answers || {},
    sentimentScore: responseData.sentimentScore,
    aiSummaryTags: responseData.aiSummaryTags || [],
    timestamp: serverTimestamp()
    // NO userId, NO email, NO identifying information
  };
  
  const docRef = await addDoc(responsesRef, anonymousData);
  return docRef.id;
};

// ===================
// COHORTS COLLECTION
// ===================

export const subscribeToCohorts = (callback) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  const cohortsRef = collection(db, 'cohorts');
  const q = query(cohortsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const cohorts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(cohorts);
  }, (error) => {
    console.error('Cohorts subscription error:', error);
    callback([]);
  });
};

export const createCohort = async (cohortData) => {
  if (!db) return null;
  const cohortsRef = collection(db, 'cohorts');
  const docRef = await addDoc(cohortsRef, {
    name: cohortData.name,
    year: cohortData.year,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

// ===================
// SURVEY STATUS (Vote Tracking - Double-Blind)
// ===================

// Get or create a persistent anonymous visitor ID (stored in localStorage)
// This ID is used ONLY for vote tracking, NOT stored with responses
export const getVisitorId = () => {
  const VISITOR_ID_KEY = 'sia_visitor_id';
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    // Generate a random UUID
    visitorId = 'v_' + crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
};

// Check if user has already voted on a survey
export const checkHasVoted = async (surveyId, visitorId) => {
  if (!db || !visitorId) return false;
  try {
    const statusRef = collection(db, 'survey_status');
    const q = query(statusRef, 
      where('surveyId', '==', surveyId),
      where('visitorId', '==', visitorId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Check vote status error:', error);
    return false;
  }
};

// Mark survey as voted (separate from response - maintains anonymity)
export const markAsVoted = async (surveyId, visitorId) => {
  if (!db || !visitorId) return false;
  try {
    const statusRef = collection(db, 'survey_status');
    await addDoc(statusRef, {
      surveyId,
      visitorId, // Anonymous session ID, not user identity
      hasVoted: true,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Mark as voted error:', error);
    return false;
  }
};

// Subscribe to all survey_status records (for aggregate metrics)
export const subscribeToSurveyStatus = (callback) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  const statusRef = collection(db, 'survey_status');
  const q = query(statusRef, orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const statuses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(statuses);
  }, (error) => {
    console.error('Survey status subscription error:', error);
    callback([]);
  });
};

// Get vote counts per survey (aggregation helper)
export const getVoteCountsBySurvey = (surveyStatuses) => {
  const counts = {};
  surveyStatuses.forEach(status => {
    const surveyId = status.surveyId;
    if (!counts[surveyId]) {
      counts[surveyId] = 0;
    }
    counts[surveyId]++;
  });
  return counts;
};

// ===================
// ANONYMOUS WALL
// ===================

export const subscribeToWallPosts = (callback) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  const wallRef = collection(db, 'anonymous_wall');
  const q = query(wallRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(posts);
  }, (error) => {
    console.error('Wall subscription error:', error);
    callback([]);
  });
};

// CRITICAL: Anonymous wall posts have NO user identifier
export const submitWallPost = async (postData) => {
  if (!db) return null;
  const wallRef = collection(db, 'anonymous_wall');
  
  const anonymousPost = {
    content: postData.content,
    sentimentScore: postData.sentimentScore || 50,
    tags: postData.tags || [],
    createdAt: serverTimestamp()
    // NO userId, NO email, NO identifying information
  };
  
  const docRef = await addDoc(wallRef, anonymousPost);
  return docRef.id;
};

// Export Firestore instance for advanced usage
export { db, auth };
