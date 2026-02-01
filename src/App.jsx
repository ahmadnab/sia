import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';

import DemoBanner from './components/DemoBanner';
import LoadingSpinner from './components/LoadingSpinner';
import ThemeToggle from './components/ThemeToggle';
import ErrorBoundary from './components/ErrorBoundary';

// Public Pages
import PublicLanding from './pages/PublicLanding';

// H9 FIX: Code splitting with React.lazy for route-based lazy loading
// Student Pages
const StudentHome = lazy(() => import('./pages/student/StudentHome'));
const StudentChat = lazy(() => import('./pages/student/StudentChat'));
const StudentSurvey = lazy(() => import('./pages/student/StudentSurvey'));
const StudentResponses = lazy(() => import('./pages/student/StudentResponses'));
const AnonymousWall = lazy(() => import('./pages/student/AnonymousWall'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminRoster = lazy(() => import('./pages/admin/AdminRoster'));
const AdminSurveys = lazy(() => import('./pages/admin/AdminSurveys'));
const AdminCohorts = lazy(() => import('./pages/admin/AdminCohorts'));
const AdminStudentChats = lazy(() => import('./pages/admin/AdminStudentChats'));
const AdminAnonymousWall = lazy(() => import('./pages/admin/AdminAnonymousWall'));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-slate-500 dark:text-slate-400">Loading...</p>
    </div>
  </div>
);

// Student Portal Layout
const StudentLayout = () => {
  const { isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" light />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading Sia...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DemoBanner />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        {/* H9 FIX: Wrap lazy-loaded routes in Suspense */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<StudentHome />} />
            <Route path="/chat" element={<StudentChat />} />
            <Route path="/survey/:surveyId" element={<StudentSurvey />} />
            <Route path="/responses" element={<StudentResponses />} />
            <Route path="/wall" element={<AnonymousWall />} />
            <Route path="*" element={<Navigate to="/student" replace />} />
          </Routes>
        </Suspense>
      </div>


    </>
  );
};

// Admin Dashboard Layout
const AdminLayout = () => {
  const { isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-500 dark:text-slate-400">Loading Sia...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DemoBanner />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        {/* H9 FIX: Wrap lazy-loaded routes in Suspense */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/roster" element={<AdminRoster />} />
            <Route path="/surveys" element={<AdminSurveys />} />
            <Route path="/cohorts" element={<AdminCohorts />} />
            <Route path="/student-chats" element={<AdminStudentChats />} />
            <Route path="/anonymous-wall" element={<AdminAnonymousWall />} />
            <Route path="/announcements" element={<AdminAnnouncements />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </div>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      {/* H11 FIX: Wrap app with ErrorBoundary */}
      <ErrorBoundary>
        <ThemeProvider>
          <AppProvider>
            <Routes>
              {/* Public Landing Page */}
              <Route path="/" element={<PublicLanding />} />

              {/* Student Portal */}
              <Route path="/student/*" element={<StudentLayout />} />

              {/* Admin Dashboard */}
              <Route path="/admin/*" element={<AdminLayout />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
