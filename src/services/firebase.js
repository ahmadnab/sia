import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp
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

export const deleteStudent = async (studentId) => {
  if (!db) return false;
  try {
    const studentRef = doc(db, 'students', studentId);
    await deleteDoc(studentRef);
    return true;
  } catch (error) {
    console.error('Error deleting student:', error);
    return false;
  }
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

export const deleteSurvey = async (surveyId) => {
  if (!db) return false;
  const surveyRef = doc(db, 'surveys', surveyId);
  await deleteDoc(surveyRef);
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

  // Store response with optional student email for viewing later
  const responseDoc = {
    surveyId: responseData.surveyId,
    answerText: responseData.answerText,
    answers: responseData.answers || {},
    sentimentScore: responseData.sentimentScore,
    aiSummaryTags: responseData.aiSummaryTags || [],
    studentEmail: responseData.studentEmail || null, // Optional student identifier
    timestamp: serverTimestamp()
  };

  const docRef = await addDoc(responsesRef, responseDoc);
  return docRef.id;
};

// Get responses for a specific student
export const getStudentResponses = async (studentEmail) => {
  if (!db) return [];
  try {
    const responsesRef = collection(db, 'responses');
    const q = query(
      responsesRef,
      where('studentEmail', '==', studentEmail.toLowerCase()),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Get student responses error:', error);
    return [];
  }
};

// Get all responses for a survey with student emails (admin view)
export const getSurveyResponsesWithStudents = async (surveyId) => {
  if (!db) return [];
  try {
    const responsesRef = collection(db, 'responses');
    const q = query(
      responsesRef,
      where('surveyId', '==', surveyId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Get survey responses with students error:', error);
    return [];
  }
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

// ===================
// TEST DATA SEEDING & CLEARING
// ===================

// Seed comprehensive test data for demo purposes
export const seedTestData = async () => {
  if (!db) return { success: false, message: 'Database not configured' };

  try {
    const batch = writeBatch(db);
    const results = {
      cohorts: [],
      students: [],
      surveys: [],
      responses: [],
      wallPosts: []
    };

    // ============================================
    // 1. CREATE COHORTS
    // ============================================
    const cohortData = [
      { name: 'Computer Science 2024', year: '2024' },
      { name: 'Software Engineering 2023', year: '2023' },
      { name: 'Data Science 2025', year: '2025' }
    ];

    const cohortRefs = [];
    const cohortsRef = collection(db, 'cohorts');

    for (const cohort of cohortData) {
      const cohortDocRef = doc(cohortsRef);
      batch.set(cohortDocRef, {
        ...cohort,
        createdAt: serverTimestamp()
      });
      cohortRefs.push({ id: cohortDocRef.id, ...cohort });
    }

    // Commit cohorts first to get IDs
    await batch.commit();
    results.cohorts = cohortRefs.map(c => c.id);

    // ============================================
    // 2. CREATE STUDENTS (30 students across cohorts)
    // ============================================
    const studentsBatch = writeBatch(db);
    const studentsData = [
      // CS 2024 - 12 students
      { firstName: 'Alice', lastName: 'Chen', email: 'alice.chen@uni.edu', gpa: 3.8, milestoneTag: 'Sem 4', riskLevel: 'low', portfolioLink: 'https://alice-chen.dev', cohortIndex: 0 },
      { firstName: 'Bob', lastName: 'Martinez', email: 'bob.martinez@uni.edu', gpa: 2.3, milestoneTag: 'Sem 3', riskLevel: 'high', portfolioLink: 'https://bob-martinez.dev', cohortIndex: 0 },
      { firstName: 'Carol', lastName: 'Williams', email: 'carol.williams@uni.edu', gpa: 3.5, milestoneTag: 'Sem 4', riskLevel: 'low', portfolioLink: 'https://carol-williams.dev', cohortIndex: 0 },
      { firstName: 'David', lastName: 'Kumar', email: 'david.kumar@uni.edu', gpa: 2.9, milestoneTag: 'Sem 3', riskLevel: 'medium', portfolioLink: 'https://david-kumar.dev', cohortIndex: 0 },
      { firstName: 'Emma', lastName: 'Rodriguez', email: 'emma.rodriguez@uni.edu', gpa: 3.9, milestoneTag: 'Sem 4', riskLevel: 'low', portfolioLink: 'https://emma-rodriguez.dev', cohortIndex: 0 },
      { firstName: 'Frank', lastName: 'O\'Brien', email: 'frank.obrien@uni.edu', gpa: 2.1, milestoneTag: 'Sem 2', riskLevel: 'high', portfolioLink: 'https://frank-obrien.dev', cohortIndex: 0 },
      { firstName: 'Grace', lastName: 'Park', email: 'grace.park@uni.edu', gpa: 3.6, milestoneTag: 'Sem 4', riskLevel: 'low', portfolioLink: 'https://grace-park.dev', cohortIndex: 0 },
      { firstName: 'Henry', lastName: 'Thompson', email: 'henry.thompson@uni.edu', gpa: 2.5, milestoneTag: 'Sem 3', riskLevel: 'medium', portfolioLink: 'https://henry-thompson.dev', cohortIndex: 0 },
      { firstName: 'Ivy', lastName: 'Zhang', email: 'ivy.zhang@uni.edu', gpa: 3.7, milestoneTag: 'Sem 4', riskLevel: 'low', portfolioLink: 'https://ivy-zhang.dev', cohortIndex: 0 },
      { firstName: 'Jack', lastName: 'Foster', email: 'jack.foster@uni.edu', gpa: 1.9, milestoneTag: 'Sem 2', riskLevel: 'high', portfolioLink: 'https://jack-foster.dev', cohortIndex: 0 },
      { firstName: 'Kate', lastName: 'Anderson', email: 'kate.anderson@uni.edu', gpa: 3.4, milestoneTag: 'Sem 3', riskLevel: 'low', portfolioLink: 'https://kate-anderson.dev', cohortIndex: 0 },
      { firstName: 'Leo', lastName: 'Santos', email: 'leo.santos@uni.edu', gpa: 2.7, milestoneTag: 'Sem 3', riskLevel: 'medium', portfolioLink: 'https://leo-santos.dev', cohortIndex: 0 },

      // SE 2023 - 10 students
      { firstName: 'Maya', lastName: 'Patel', email: 'maya.patel@uni.edu', gpa: 3.9, milestoneTag: 'Final Year', riskLevel: 'low', portfolioLink: 'https://maya-patel.dev', cohortIndex: 1 },
      { firstName: 'Noah', lastName: 'Kim', email: 'noah.kim@uni.edu', gpa: 3.2, milestoneTag: 'Final Year', riskLevel: 'low', portfolioLink: 'https://noah-kim.dev', cohortIndex: 1 },
      { firstName: 'Olivia', lastName: 'Johnson', email: 'olivia.johnson@uni.edu', gpa: 2.8, milestoneTag: 'Sem 4', riskLevel: 'medium', portfolioLink: 'https://olivia-johnson.dev', cohortIndex: 1 },
      { firstName: 'Peter', lastName: 'Lee', email: 'peter.lee@uni.edu', gpa: 3.6, milestoneTag: 'Final Year', riskLevel: 'low', portfolioLink: 'https://peter-lee.dev', cohortIndex: 1 },
      { firstName: 'Quinn', lastName: 'Taylor', email: 'quinn.taylor@uni.edu', gpa: 2.4, milestoneTag: 'Sem 4', riskLevel: 'high', portfolioLink: 'https://quinn-taylor.dev', cohortIndex: 1 },
      { firstName: 'Ruby', lastName: 'Nguyen', email: 'ruby.nguyen@uni.edu', gpa: 3.8, milestoneTag: 'Final Year', riskLevel: 'low', portfolioLink: 'https://ruby-nguyen.dev', cohortIndex: 1 },
      { firstName: 'Sam', lastName: 'Davis', email: 'sam.davis@uni.edu', gpa: 3.1, milestoneTag: 'Sem 4', riskLevel: 'low', portfolioLink: 'https://sam-davis.dev', cohortIndex: 1 },
      { firstName: 'Tara', lastName: 'Wilson', email: 'tara.wilson@uni.edu', gpa: 2.6, milestoneTag: 'Sem 4', riskLevel: 'medium', portfolioLink: 'https://tara-wilson.dev', cohortIndex: 1 },
      { firstName: 'Uma', lastName: 'Singh', email: 'uma.singh@uni.edu', gpa: 3.7, milestoneTag: 'Final Year', riskLevel: 'low', portfolioLink: 'https://uma-singh.dev', cohortIndex: 1 },
      { firstName: 'Victor', lastName: 'Brown', email: 'victor.brown@uni.edu', gpa: 2.2, milestoneTag: 'Sem 3', riskLevel: 'high', portfolioLink: 'https://victor-brown.dev', cohortIndex: 1 },

      // DS 2025 - 8 students
      { firstName: 'Wendy', lastName: 'Moore', email: 'wendy.moore@uni.edu', gpa: 3.5, milestoneTag: 'Sem 2', riskLevel: 'low', portfolioLink: 'https://wendy-moore.dev', cohortIndex: 2 },
      { firstName: 'Xavier', lastName: 'Garcia', email: 'xavier.garcia@uni.edu', gpa: 2.9, milestoneTag: 'Sem 2', riskLevel: 'medium', portfolioLink: 'https://xavier-garcia.dev', cohortIndex: 2 },
      { firstName: 'Yara', lastName: 'Ali', email: 'yara.ali@uni.edu', gpa: 3.8, milestoneTag: 'Sem 2', riskLevel: 'low', portfolioLink: 'https://yara-ali.dev', cohortIndex: 2 },
      { firstName: 'Zack', lastName: 'Miller', email: 'zack.miller@uni.edu', gpa: 2.0, milestoneTag: 'Sem 1', riskLevel: 'high', portfolioLink: 'https://zack-miller.dev', cohortIndex: 2 },
      { firstName: 'Aria', lastName: 'White', email: 'aria.white@uni.edu', gpa: 3.3, milestoneTag: 'Sem 2', riskLevel: 'low', portfolioLink: 'https://aria-white.dev', cohortIndex: 2 },
      { firstName: 'Ben', lastName: 'Harris', email: 'ben.harris@uni.edu', gpa: 2.7, milestoneTag: 'Sem 1', riskLevel: 'medium', portfolioLink: 'https://ben-harris.dev', cohortIndex: 2 },
      { firstName: 'Chloe', lastName: 'Clark', email: 'chloe.clark@uni.edu', gpa: 3.6, milestoneTag: 'Sem 2', riskLevel: 'low', portfolioLink: 'https://chloe-clark.dev', cohortIndex: 2 },
      { firstName: 'Dan', lastName: 'Lewis', email: 'dan.lewis@uni.edu', gpa: 2.4, milestoneTag: 'Sem 1', riskLevel: 'high', portfolioLink: 'https://dan-lewis.dev', cohortIndex: 2 }
    ];

    const studentsRef = collection(db, 'students');
    const studentDocRefs = [];

    studentsData.forEach((student) => {
      const studentDocRef = doc(studentsRef);
      const cohortId = cohortRefs[student.cohortIndex].id;
      studentsBatch.set(studentDocRef, {
        firstName: student.firstName,
        lastName: student.lastName,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        gpa: student.gpa,
        portfolioLink: student.portfolioLink,
        milestoneTag: student.milestoneTag,
        milestone: student.milestoneTag,
        riskLevel: student.riskLevel,
        cohortId: cohortId,
        createdAt: serverTimestamp()
      });
      studentDocRefs.push(studentDocRef.id);
    });

    await studentsBatch.commit();
    results.students = studentDocRefs;

    // ============================================
    // 3. CREATE SURVEYS (5 surveys)
    // ============================================
    const surveysBatch = writeBatch(db);
    const surveysData = [
      {
        title: 'Mid-Semester Wellness Check',
        cohortId: cohortRefs[0].id, // CS 2024
        status: 'Active',
        questions: [
          { type: 'scale', question: 'How would you rate your overall wellbeing this semester?', min: 1, max: 10, minLabel: 'Very Poor', maxLabel: 'Excellent' },
          { type: 'text', question: 'What has been your biggest challenge so far?' },
          { type: 'scale', question: 'How manageable is your current workload?', min: 1, max: 10, minLabel: 'Overwhelming', maxLabel: 'Very Manageable' },
          { type: 'text', question: 'What support would help you succeed?' }
        ]
      },
      {
        title: 'Course Content & Teaching Quality',
        cohortId: cohortRefs[0].id, // CS 2024
        status: 'Active',
        questions: [
          { type: 'scale', question: 'How clear and understandable are the lecture materials?', min: 1, max: 10, minLabel: 'Very Unclear', maxLabel: 'Very Clear' },
          { type: 'text', question: 'Which topics do you find most confusing or challenging?' },
          { type: 'scale', question: 'How helpful are the lab sessions and practical exercises?', min: 1, max: 10, minLabel: 'Not Helpful', maxLabel: 'Very Helpful' },
          { type: 'text', question: 'What improvements would you suggest for the course content or teaching methods?' }
        ]
      },
      {
        title: 'Assignment 3 Feedback',
        cohortId: cohortRefs[1].id, // SE 2023
        status: 'Closed',
        questions: [
          { type: 'scale', question: 'How clear were the assignment requirements and instructions?', min: 1, max: 10, minLabel: 'Very Unclear', maxLabel: 'Very Clear' },
          { type: 'text', question: 'What aspects of the assignment did you find most challenging?' },
          { type: 'scale', question: 'Was the time allocated for this assignment appropriate?', min: 1, max: 10, minLabel: 'Too Short', maxLabel: 'More Than Enough' },
          { type: 'text', question: 'What resources or support would have been helpful for completing this assignment?' }
        ]
      },
      {
        title: 'End Term Survey',
        cohortId: cohortRefs[2].id, // DS 2025
        status: 'Active',
        questions: [
          { type: 'scale', question: 'How would you rate your overall learning experience this semester?', min: 1, max: 10, minLabel: 'Poor', maxLabel: 'Excellent' },
          { type: 'text', question: 'What were the most valuable things you learned this semester?' },
          { type: 'scale', question: 'How well do you feel prepared for the next stage of your studies?', min: 1, max: 10, minLabel: 'Not Prepared', maxLabel: 'Very Prepared' },
          { type: 'text', question: 'What would you change about the course if you could?' },
          { type: 'scale', question: 'How likely are you to recommend this course to other students?', min: 1, max: 10, minLabel: 'Not Likely', maxLabel: 'Very Likely' }
        ]
      },
      {
        title: 'Student Wellbeing & Support Check-in',
        cohortId: null, // All students
        status: 'Active',
        questions: [
          { type: 'scale', question: 'How would you rate your current stress levels?', min: 1, max: 10, minLabel: 'Very Low', maxLabel: 'Extremely High' },
          { type: 'text', question: 'What are your main sources of stress or concern right now?' },
          { type: 'scale', question: 'How aware are you of the support services available to you?', min: 1, max: 10, minLabel: 'Not Aware', maxLabel: 'Very Aware' },
          { type: 'text', question: 'What would make it easier for you to access support when you need it?' },
          { type: 'scale', question: 'How comfortable do you feel reaching out for help when struggling?', min: 1, max: 10, minLabel: 'Very Uncomfortable', maxLabel: 'Very Comfortable' }
        ]
      }
    ];

    const surveysRef = collection(db, 'surveys');
    const surveyDocRefs = [];

    for (const survey of surveysData) {
      const surveyDocRef = doc(surveysRef);
      surveysBatch.set(surveyDocRef, {
        ...survey,
        createdAt: serverTimestamp(),
        publishedAt: serverTimestamp(),
        notificationsSentAt: serverTimestamp()
      });
      surveyDocRefs.push({ id: surveyDocRef.id, cohortId: survey.cohortId });
    }

    await surveysBatch.commit();
    results.surveys = surveyDocRefs.map(s => s.id);

    // ============================================
    // 4. CREATE SURVEY RESPONSES (60 responses)
    // ============================================
    const responsesBatch = writeBatch(db);

    // Helper to generate realistic responses
    const generateResponses = (surveyId, responseCount) => {
      const responses = [];

      // Distribute sentiment: 40% positive, 35% neutral, 25% negative
      const sentimentDistribution = [
        ...Array(Math.floor(responseCount * 0.4)).fill('positive'),
        ...Array(Math.floor(responseCount * 0.35)).fill('neutral'),
        ...Array(Math.floor(responseCount * 0.25)).fill('negative')
      ];

      const positiveTexts = [
        "I'm really enjoying this semester. The pace is good and I feel supported.",
        "The teaching quality has been excellent. I'm learning a lot and feeling confident.",
        "Great experience so far. The balance between theory and practice is perfect.",
        "I appreciate all the resources available. Feeling well-prepared for my future career.",
        "The workload is challenging but manageable. I'm developing strong skills.",
        "Very satisfied with the support from professors and TAs. Makes a huge difference.",
        "The course content is relevant and engaging. I can see how it applies to real work."
      ];

      const neutralTexts = [
        "Things are okay overall. Some aspects could be better but it's manageable.",
        "The workload varies a lot week to week. Some weeks are overwhelming, others are fine.",
        "I understand most of the material but sometimes struggle to keep up with the pace.",
        "The course is decent. I wish there were more practical examples and hands-on work.",
        "It's a mixed experience. Some topics are interesting, others feel disconnected.",
        "Doing alright, though I worry about whether I'm truly prepared for industry.",
        "The content is solid but I sometimes feel lost in larger lecture sessions."
      ];

      const negativeTexts = [
        "I'm struggling to keep up with the workload. It feels overwhelming most weeks.",
        "The pace is too fast and I don't feel like I'm truly understanding the fundamentals.",
        "I'm concerned about my performance and future prospects. Feeling quite stressed.",
        "The lecture materials are often unclear and hard to follow. Need more support.",
        "I'm falling behind and don't know how to catch up. Very anxious about exams.",
        "The workload combined with other responsibilities is causing serious stress.",
        "I don't feel prepared for the career ahead. The gap between coursework and industry feels huge.",
        "Mental health is suffering due to constant pressure. Need better support systems."
      ];

      for (let i = 0; i < sentimentDistribution.length; i++) {
        const sentiment = sentimentDistribution[i];
        let answerText, sentimentScore;

        if (sentiment === 'positive') {
          answerText = positiveTexts[Math.floor(Math.random() * positiveTexts.length)];
          sentimentScore = 70 + Math.floor(Math.random() * 30); // 70-100
        } else if (sentiment === 'neutral') {
          answerText = neutralTexts[Math.floor(Math.random() * neutralTexts.length)];
          sentimentScore = 40 + Math.floor(Math.random() * 30); // 40-69
        } else {
          answerText = negativeTexts[Math.floor(Math.random() * negativeTexts.length)];
          sentimentScore = 10 + Math.floor(Math.random() * 30); // 10-39
        }

        responses.push({
          surveyId,
          answerText,
          sentimentScore,
          answers: {}, // Scale responses would go here
          aiSummaryTags: sentiment === 'positive' ? ['satisfied', 'engaged'] :
                        sentiment === 'neutral' ? ['manageable', 'mixed-feelings'] :
                        ['stressed', 'struggling']
        });
      }

      return responses;
    };

    const responsesRef = collection(db, 'responses');

    // Helper to generate a random timestamp within the past N days
    const getRandomPastTimestamp = (daysAgo) => {
      const now = Date.now();
      const msAgo = daysAgo * 24 * 60 * 60 * 1000;
      const randomOffset = Math.floor(Math.random() * msAgo);
      return Timestamp.fromDate(new Date(now - randomOffset));
    };

    // Generate 12 responses per survey, spread across last 7 days
    surveyDocRefs.forEach(survey => {
      const surveyResponses = generateResponses(survey.id, 12);
      surveyResponses.forEach((response, idx) => {
        const responseDocRef = doc(responsesRef);
        // Spread responses across the past 7 days for better trend visualization
        const daysAgo = Math.floor((idx / surveyResponses.length) * 7);
        const timestamp = getRandomPastTimestamp(7);
        responsesBatch.set(responseDocRef, {
          ...response,
          timestamp: timestamp
        });
        results.responses.push(responseDocRef.id);
      });
    });

    await responsesBatch.commit();

    // ============================================
    // 5. CREATE ANONYMOUS WALL POSTS (20 posts)
    // ============================================
    const wallBatch = writeBatch(db);
    const wallPostsData = [
      { content: "Does anyone else feel like the workload this semester is impossible? I can barely sleep.", sentimentScore: 25, tags: ['stress', 'workload'] },
      { content: "Really grateful for the study groups. You all make this journey so much better! 💙", sentimentScore: 85, tags: ['support', 'community'] },
      { content: "Midterms are approaching and I'm terrified. Anyone have tips for managing exam anxiety?", sentimentScore: 35, tags: ['anxiety', 'exams'] },
      { content: "The new lab sessions are amazing! Finally getting hands-on experience.", sentimentScore: 90, tags: ['learning', 'practical'] },
      { content: "I don't understand why we're learning some of these topics. They seem irrelevant to actual jobs.", sentimentScore: 40, tags: ['curriculum', 'relevance'] },
      { content: "Shoutout to the TAs who stay late to help us. You're the real MVPs!", sentimentScore: 95, tags: ['gratitude', 'support'] },
      { content: "Feeling really isolated this semester. Hard to make friends when everyone's so busy.", sentimentScore: 30, tags: ['isolation', 'mental-health'] },
      { content: "Just landed my first internship interview! This program really prepares you well.", sentimentScore: 88, tags: ['career', 'success'] },
      { content: "The pace of lectures is way too fast. I'm constantly playing catch-up.", sentimentScore: 35, tags: ['pace', 'struggling'] },
      { content: "Love how diverse our cohort is. Learning so much from different perspectives.", sentimentScore: 82, tags: ['diversity', 'learning'] },
      { content: "Seriously considering dropping out. The imposter syndrome is overwhelming.", sentimentScore: 15, tags: ['imposter-syndrome', 'crisis'] },
      { content: "The career services workshop was incredibly helpful. Highly recommend attending!", sentimentScore: 87, tags: ['career', 'resources'] },
      { content: "Why is there no mental health support specific to CS students? We need it.", sentimentScore: 40, tags: ['mental-health', 'support'] },
      { content: "Group projects are the worst. Always ends up being 1-2 people doing all the work.", sentimentScore: 30, tags: ['group-work', 'frustration'] },
      { content: "Just want to say thanks to everyone who shares their notes. Lifesavers! 🙏", sentimentScore: 80, tags: ['gratitude', 'community'] },
      { content: "The library is too crowded during exam season. Can we get more study spaces?", sentimentScore: 45, tags: ['facilities', 'resources'] },
      { content: "Best decision ever to join this program. Challenging but so rewarding!", sentimentScore: 92, tags: ['satisfaction', 'growth'] },
      { content: "I wish professors would record lectures. Can't always make it to 8am classes.", sentimentScore: 50, tags: ['accessibility', 'lectures'] },
      { content: "Anyone else struggling to balance studies with part-time work? It's exhausting.", sentimentScore: 32, tags: ['work-life-balance', 'stress'] },
      { content: "The networking events have been great for meeting industry professionals!", sentimentScore: 85, tags: ['networking', 'career'] }
    ];

    const wallRef = collection(db, 'anonymous_wall');

    wallPostsData.forEach(post => {
      const wallDocRef = doc(wallRef);
      wallBatch.set(wallDocRef, {
        ...post,
        createdAt: serverTimestamp()
      });
      results.wallPosts.push(wallDocRef.id);
    });

    await wallBatch.commit();

    // ============================================
    // 6. CREATE SURVEY STATUS (Vote tracking)
    // ============================================
    const statusBatch = writeBatch(db);
    const statusRef = collection(db, 'survey_status');

    // Simulate votes from different visitors for each survey
    surveyDocRefs.forEach(survey => {
      // 12 unique visitors per survey
      for (let i = 0; i < 12; i++) {
        const statusDocRef = doc(statusRef);
        statusBatch.set(statusDocRef, {
          surveyId: survey.id,
          visitorId: `demo_visitor_${survey.id}_${i}`,
          hasVoted: true,
          updatedAt: serverTimestamp()
        });
      }
    });

    await statusBatch.commit();

    // ============================================
    // 7. CREATE CHAT HISTORY (Sample conversations)
    // ============================================
    const chatBatch = writeBatch(db);
    const chatsRef = collection(db, 'chat_history');

    // Create chat conversations for 10 students
    const chatConversations = [
      // Bob Martinez (high risk) - struggling
      {
        email: 'bob.martinez@uni.edu',
        messages: [
          { role: 'user', content: "I'm really struggling with the data structures assignment. I don't even know where to start.", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "I understand this feels overwhelming. Let's break it down into smaller steps. What specific part of the assignment is confusing you?", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60000) },
          { role: 'user', content: "The binary tree traversal part. I just can't wrap my head around recursion.", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 120000) },
          { role: 'assistant', content: "Recursion can be tricky at first. Try drawing out the tree and trace through each recursive call step by step. Start with a simple 3-node tree. Would you like me to suggest some practice problems?", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 180000) },
          { role: 'user', content: "Yeah that would help. I'm also worried about failing this class.", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "Your concern is valid, but there's still time to improve. Have you considered attending the TA's office hours? They can provide one-on-one help with recursion. Also, your professor has office hours on Wednesdays - that could be really helpful.", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 60000) }
        ]
      },
      // Frank O'Brien (high risk) - serious concerns
      {
        email: 'frank.obrien@uni.edu',
        messages: [
          { role: 'user', content: "I don't think I belong here. Everyone else seems to understand everything so easily.", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "It sounds like you're experiencing imposter syndrome, which is very common in CS programs. Many of your peers feel the same way but don't show it. What makes you feel this way?", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 60000) },
          { role: 'user', content: "I failed the last two quizzes. My GPA is dropping and I'm thinking about dropping out.", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 120000) },
          { role: 'assistant', content: "I'm concerned about what you've shared. Before making any major decisions, please talk to your course coordinator or academic advisor. They can help you create a recovery plan. There are also tutoring services and study groups that can help. Would you be willing to reach out to them?", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 180000) },
          { role: 'user', content: "I guess so. But I feel like I'm too far behind to catch up.", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "Many students have felt behind and successfully caught up with the right support. Your mental health matters too - consider reaching out to counseling services if the stress is overwhelming. You're not alone in this.", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 60000) }
        ]
      },
      // Alice Chen (low risk) - doing well
      {
        email: 'alice.chen@uni.edu',
        messages: [
          { role: 'user', content: "Hey Sia! I'm working on my final project and wanted to get some advice on structuring it.", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "Great to hear you're planning ahead! What kind of project are you building?", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60000) },
          { role: 'user', content: "A web app for managing student study groups. I'm thinking React frontend with Node.js backend.", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 120000) },
          { role: 'assistant', content: "That's a solid tech stack! For the structure, consider separating your concerns: client folder for React, server folder for Node. Use environment variables for config. Have you thought about the database?", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 180000) },
          { role: 'user', content: "I was thinking MongoDB. Also, any tips for the presentation?", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "MongoDB works well with Node. For the presentation, focus on the problem you're solving and demo the key features. Practice explaining your technical decisions. You've got this!", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60000) }
        ]
      },
      // David Kumar (medium risk) - workload stress
      {
        email: 'david.kumar@uni.edu',
        messages: [
          { role: 'user', content: "How do people manage to do all the assignments, projects, AND study for exams?", timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "Time management is definitely challenging! Many successful students use techniques like time-blocking and prioritization. Do you have a study schedule?", timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 60000) },
          { role: 'user', content: "Not really. I just work on whatever's due soonest.", timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 120000) },
          { role: 'assistant', content: "That's common but can lead to last-minute stress. Try creating a weekly schedule where you allocate specific time blocks for each subject. Include breaks - they're important! The Pomodoro technique (25 min work, 5 min break) works well for many students.", timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 180000) },
          { role: 'user', content: "That makes sense. I'll try it out. Thanks!", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
        ]
      },
      // Quinn Taylor (high risk) - multiple issues
      {
        email: 'quinn.taylor@uni.edu',
        messages: [
          { role: 'user', content: "I'm working part-time and taking a full course load. It's too much.", timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "Balancing work and studies is really tough. Have you looked into reducing your course load or finding financial aid options?", timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60000) },
          { role: 'user', content: "I need the money though. My grades are suffering but I can't quit my job.", timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 120000) },
          { role: 'assistant', content: "This is a difficult situation. I really encourage you to speak with your academic advisor and the financial aid office. There may be options like bursaries, scholarships, or emergency funds you don't know about. They're there to help with exactly these situations.", timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 180000) },
          { role: 'user', content: "I'll try. Just feeling really overwhelmed right now.", timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "I hear you. Remember that asking for help is a strength, not a weakness. Reach out to your coordinator as soon as possible - they want to see you succeed.", timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 60000) }
        ]
      },
      // Maya Patel (low risk) - career focused
      {
        email: 'maya.patel@uni.edu',
        messages: [
          { role: 'user', content: "I have an interview for a software engineering internship next week. Any preparation tips?", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "Congratulations on landing the interview! For technical interviews, practice coding problems on platforms like LeetCode. Focus on explaining your thought process out loud. What company is it with?", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 60000) },
          { role: 'user', content: "It's with a fintech startup. They mentioned data structures and algorithms.", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 120000) },
          { role: 'assistant', content: "Great! Review arrays, linked lists, trees, and graphs. Practice explaining Big O notation. Also research the company - know their product and recent news. Prepare questions to ask them too - it shows interest!", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 180000) },
          { role: 'user', content: "Perfect, thanks! I feel more confident now.", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
        ]
      },
      // Leo Santos (medium risk) - assignment help
      {
        email: 'leo.santos@uni.edu',
        messages: [
          { role: 'user', content: "Can you help me debug my code?", timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "I can guide you through debugging strategies! What error are you getting?", timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 60000) },
          { role: 'user', content: "Index out of bounds error but I don't know where.", timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 120000) },
          { role: 'assistant', content: "Try using print statements to check your array indices at each loop iteration. Look for places where you might be accessing array[i+1] without checking if i+1 is valid. What kind of loop are you using?", timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 180000) },
          { role: 'user', content: "A for loop. Oh wait, I think I see it - my range is wrong!", timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "Great catch! That's a very common bug. Make sure your loop condition is i < length, not i <= length.", timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60000) }
        ]
      },
      // Zack Miller (high risk) - struggling badly
      {
        email: 'zack.miller@uni.edu',
        messages: [
          { role: 'user', content: "I don't understand anything in my algorithms class.", timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "Algorithms can be challenging, especially at first. What specific topics are you finding difficult?", timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 60000) },
          { role: 'user', content: "All of it honestly. Sorting, searching, graphs - it's all confusing.", timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 120000) },
          { role: 'assistant', content: "It sounds like you might need more foundational support. Have you attended any tutoring sessions? The CS tutoring center has drop-in hours specifically for algorithms. I also recommend watching visualization videos - seeing how algorithms work step-by-step can really help.", timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 180000) },
          { role: 'user', content: "I'm too embarrassed to go to tutoring. Everyone will think I'm stupid.", timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "Many students feel this way, but tutoring is for everyone - even top students use it! The tutors are there to help, not judge. Your success is what matters. Please give it a try, and if you're really uncomfortable with group tutoring, ask your professor about one-on-one help.", timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000 + 60000) }
        ]
      },
      // Olivia Johnson (medium risk) - exam anxiety
      {
        email: 'olivia.johnson@uni.edu',
        messages: [
          { role: 'user', content: "I always freeze up during exams even though I know the material.", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "Test anxiety is really common. What happens when you freeze - do you blank out or get too stressed to think?", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 60000) },
          { role: 'user', content: "Both. My mind just goes blank and I panic.", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 120000) },
          { role: 'assistant', content: "Try these strategies: Before the exam, do deep breathing exercises. During the exam, if you blank out, skip that question and come back to it. Start with easier questions to build confidence. Also, practice under timed conditions when studying. Have you tried any anxiety management techniques?", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 180000) },
          { role: 'user', content: "Not really. I'll try the breathing thing. Thanks.", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "You're welcome! If the anxiety continues to be a problem, the university counseling center can teach you more coping strategies. Good luck!", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 60000) }
        ]
      },
      // Emma Rodriguez (low risk) - project collaboration
      {
        email: 'emma.rodriguez@uni.edu',
        messages: [
          { role: 'user', content: "Our group project is going well but one member isn't contributing much.", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
          { role: 'assistant', content: "Group dynamics can be tricky. Have you tried talking to them directly about it?", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 60000) },
          { role: 'user', content: "Not yet. I don't want to seem mean.", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 120000) },
          { role: 'assistant', content: "It's not mean to have a respectful conversation. Try: 'Hey, I've noticed you haven't been able to make some meetings. Is everything okay? How can we help you contribute?' Give them a chance to explain - they might be dealing with something. If it continues, talk to your professor.", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 180000) },
          { role: 'user', content: "That's a good approach. I'll try that. Thanks!", timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000) }
        ]
      }
    ];

    // Add all chat messages to the batch
    chatConversations.forEach(conversation => {
      conversation.messages.forEach(msg => {
        const chatDocRef = doc(chatsRef);
        chatBatch.set(chatDocRef, {
          studentEmail: conversation.email,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        });
      });
    });

    await chatBatch.commit();
    results.chatMessages = chatConversations.reduce((sum, conv) => sum + conv.messages.length, 0);

    return {
      success: true,
      message: `Successfully seeded test data!`,
      details: {
        cohorts: results.cohorts.length,
        students: results.students.length,
        surveys: results.surveys.length,
        responses: results.responses.length,
        wallPosts: results.wallPosts.length,
        chatMessages: results.chatMessages
      }
    };
  } catch (error) {
    console.error('Seed data error:', error);
    return {
      success: false,
      message: error.message || 'Failed to seed test data'
    };
  }
};

// Clear all test data from Firebase
export const clearTestData = async () => {
  if (!db) return { success: false, message: 'Database not configured' };

  try {
    const collections = ['students', 'surveys', 'responses', 'cohorts', 'survey_status', 'anonymous_wall', 'summary_cache', 'chat_history', 'chat_summary_cache'];
    let totalDeleted = 0;

    for (const collectionName of collections) {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);

      if (snapshot.empty) continue;

      // Delete in batches of 500 (Firestore limit)
      const docs = snapshot.docs;
      const BATCH_SIZE = 500;

      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const batchDocs = docs.slice(i, i + BATCH_SIZE);

        batchDocs.forEach(docSnapshot => {
          batch.delete(docSnapshot.ref);
        });

        await batch.commit();
        totalDeleted += batchDocs.length;
      }
    }

    return {
      success: true,
      message: `Successfully deleted ${totalDeleted} documents across all collections`,
      deletedCount: totalDeleted
    };
  } catch (error) {
    console.error('Clear data error:', error);
    return {
      success: false,
      message: error.message || 'Failed to clear test data'
    };
  }
};

// ===================
// SUMMARY CACHE
// ===================

// Save AI-generated summary to cache
export const saveSummaryCache = async (summary) => {
  if (!db) return null;

  try {
    const cacheRef = collection(db, 'summary_cache');

    // Delete existing cache (we only keep one latest summary)
    const existingDocs = await getDocs(cacheRef);
    const batch = writeBatch(db);
    existingDocs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Add new cache
    const docRef = await addDoc(cacheRef, {
      ...summary,
      cachedAt: serverTimestamp(),
      responseCount: summary.responseCount || 0
    });

    return docRef.id;
  } catch (error) {
    console.error('Save summary cache error:', error);
    return null;
  }
};

// Get cached summary
export const getCachedSummary = async () => {
  if (!db) return null;

  try {
    const cacheRef = collection(db, 'summary_cache');
    const snapshot = await getDocs(cacheRef);

    if (snapshot.empty) return null;

    // Get the first (and should be only) cached summary
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Get cached summary error:', error);
    return null;
  }
};

// Subscribe to summary cache changes
export const subscribeToSummaryCache = (callback) => {
  if (!db) {
    callback(null);
    return () => {};
  }

  const cacheRef = collection(db, 'summary_cache');
  return onSnapshot(cacheRef, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }

    const doc = snapshot.docs[0];
    callback({
      id: doc.id,
      ...doc.data()
    });
  }, (error) => {
    console.error('Summary cache subscription error:', error);
    callback(null);
  });
};

// ========================
// CHAT HISTORY MANAGEMENT
// ========================

// Save a chat message for a student
export const saveChatMessage = async (studentEmail, role, content) => {
  if (!db) return false;
  try {
    const chatsRef = collection(db, 'chat_history');
    await addDoc(chatsRef, {
      studentEmail: studentEmail.toLowerCase(),
      role: role, // 'user' or 'assistant'
      content: content,
      timestamp: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Save chat message error:', error);
    return false;
  }
};

// Get chat history for a student
export const getChatHistory = async (studentEmail) => {
  if (!db) return [];
  try {
    const chatsRef = collection(db, 'chat_history');
    const q = query(
      chatsRef,
      where('studentEmail', '==', studentEmail.toLowerCase()),
      orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Get chat history error:', error);
    return [];
  }
};

// Subscribe to chat history for a student
export const subscribeToChatHistory = (studentEmail, callback) => {
  if (!db) {
    callback([]);
    return () => {};
  }

  const chatsRef = collection(db, 'chat_history');
  const q = query(
    chatsRef,
    where('studentEmail', '==', studentEmail.toLowerCase()),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(messages);
  }, (error) => {
    console.error('Chat history subscription error:', error);
    callback([]);
  });
};

// Clear chat history for a student
export const clearChatHistory = async (studentEmail) => {
  if (!db) return false;
  try {
    const chatsRef = collection(db, 'chat_history');
    const q = query(chatsRef, where('studentEmail', '==', studentEmail.toLowerCase()));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Clear chat history error:', error);
    return false;
  }
};

// Get all students who have chat history (for admin)
export const getStudentsWithChats = async () => {
  if (!db) return [];
  try {
    const chatsRef = collection(db, 'chat_history');
    const snapshot = await getDocs(chatsRef);

    // Get unique student emails
    const emailsSet = new Set();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.studentEmail) {
        emailsSet.add(data.studentEmail);
      }
    });

    // Get student details for each email
    const students = [];
    const studentsRef = collection(db, 'students');

    for (const email of emailsSet) {
      const q = query(studentsRef, where('email', '==', email));
      const studentSnapshot = await getDocs(q);

      if (!studentSnapshot.empty) {
        students.push({
          id: studentSnapshot.docs[0].id,
          ...studentSnapshot.docs[0].data()
        });
      } else {
        // Student not in roster, create basic info
        students.push({
          id: email,
          email: email,
          name: email.split('@')[0],
          riskLevel: 'unknown',
          cohortId: null
        });
      }
    }

    return students;
  } catch (error) {
    console.error('Get students with chats error:', error);
    return [];
  }
};

// Get chat analytics for admin dashboard
export const getChatAnalytics = async (filters = {}) => {
  if (!db) return [];
  try {
    // Get all students with chats
    const students = await getStudentsWithChats();

    // Apply filters
    let filteredStudents = students;

    if (filters.riskLevel && filters.riskLevel !== 'all') {
      filteredStudents = filteredStudents.filter(s => s.riskLevel === filters.riskLevel);
    }

    if (filters.cohortId && filters.cohortId !== 'all') {
      filteredStudents = filteredStudents.filter(s => s.cohortId === filters.cohortId);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredStudents = filteredStudents.filter(s =>
        s.name?.toLowerCase().includes(searchLower) ||
        s.email?.toLowerCase().includes(searchLower)
      );
    }

    // Get message count for each student
    const chatsRef = collection(db, 'chat_history');
    const studentsWithCounts = await Promise.all(
      filteredStudents.map(async (student) => {
        const q = query(chatsRef, where('studentEmail', '==', student.email));
        const snapshot = await getDocs(q);

        return {
          ...student,
          messageCount: snapshot.size,
          lastMessageAt: snapshot.docs.length > 0
            ? snapshot.docs.reduce((latest, doc) => {
                const docTime = doc.data().timestamp;
                return !latest || (docTime && docTime > latest) ? docTime : latest;
              }, null)
            : null
        };
      })
    );

    // Sort by last message time (most recent first)
    return studentsWithCounts.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return b.lastMessageAt - a.lastMessageAt;
    });
  } catch (error) {
    console.error('Get chat analytics error:', error);
    return [];
  }
};

// ========================
// CHAT SUMMARY CACHE
// ========================

// Save AI-generated chat summary to cache for a specific student
export const saveChatSummaryCache = async (studentEmail, summary) => {
  if (!db) return null;

  try {
    const cacheRef = collection(db, 'chat_summary_cache');

    // Delete existing cache for this student
    const q = query(cacheRef, where('studentEmail', '==', studentEmail.toLowerCase()));
    const existingDocs = await getDocs(q);
    const batch = writeBatch(db);
    existingDocs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Add new cache
    const docRef = await addDoc(cacheRef, {
      studentEmail: studentEmail.toLowerCase(),
      ...summary,
      cachedAt: serverTimestamp(),
      messageCount: summary.messageCount || 0
    });

    return docRef.id;
  } catch (error) {
    console.error('Save chat summary cache error:', error);
    return null;
  }
};

// Get cached chat summary for a student
export const getCachedChatSummary = async (studentEmail) => {
  if (!db) return null;

  try {
    const cacheRef = collection(db, 'chat_summary_cache');
    const q = query(cacheRef, where('studentEmail', '==', studentEmail.toLowerCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    // Get the cached summary for this student
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Get cached chat summary error:', error);
    return null;
  }
};

// Export Firestore instance for advanced usage
export { db, auth };
