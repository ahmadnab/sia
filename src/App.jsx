import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import RoleSwitcher from './components/RoleSwitcher';
import DemoBanner from './components/DemoBanner';
import LoadingSpinner from './components/LoadingSpinner';
import ThemeToggle from './components/ThemeToggle';

// Public Pages
import PublicLanding from './pages/PublicLanding';

// Student Pages
import StudentHome from './pages/student/StudentHome';
import StudentChat from './pages/student/StudentChat';
import StudentSurvey from './pages/student/StudentSurvey';
import StudentResponses from './pages/student/StudentResponses';
import AnonymousWall from './pages/student/AnonymousWall';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRoster from './pages/admin/AdminRoster';
import AdminSurveys from './pages/admin/AdminSurveys';
import AdminCohorts from './pages/admin/AdminCohorts';
import AdminStudentChats from './pages/admin/AdminStudentChats';
import AdminAnonymousWall from './pages/admin/AdminAnonymousWall';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';

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
        <Routes>
          <Route path="/" element={<StudentHome />} />
          <Route path="/chat" element={<StudentChat />} />
          <Route path="/survey/:surveyId" element={<StudentSurvey />} />
          <Route path="/responses" element={<StudentResponses />} />
          <Route path="/wall" element={<AnonymousWall />} />
          <Route path="*" element={<Navigate to="/student" replace />} />
        </Routes>
      </div>
      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-20 right-4 z-40">
        <ThemeToggle />
      </div>
      <RoleSwitcher />
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
      </div>
      <RoleSwitcher />
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
