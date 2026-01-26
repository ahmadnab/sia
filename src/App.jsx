import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import RoleSwitcher from './components/RoleSwitcher';
import DemoBanner from './components/DemoBanner';
import LoadingSpinner from './components/LoadingSpinner';

// Public Pages
import PublicLanding from './pages/PublicLanding';

// Student Pages
import StudentHome from './pages/student/StudentHome';
import StudentChat from './pages/student/StudentChat';
import StudentSurvey from './pages/student/StudentSurvey';
import AnonymousWall from './pages/student/AnonymousWall';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRoster from './pages/admin/AdminRoster';
import AdminSurveys from './pages/admin/AdminSurveys';
import AdminCohorts from './pages/admin/AdminCohorts';

// Student Portal Layout
const StudentLayout = () => {
  const { isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" light />
          <p className="mt-4 text-slate-400">Loading Sia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dark">
      <DemoBanner />
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <Routes>
          <Route path="/" element={<StudentHome />} />
          <Route path="/chat" element={<StudentChat />} />
          <Route path="/survey/:surveyId" element={<StudentSurvey />} />
          <Route path="/wall" element={<AnonymousWall />} />
          <Route path="*" element={<Navigate to="/student" replace />} />
        </Routes>
      </div>
      <RoleSwitcher />
    </div>
  );
};

// Admin Dashboard Layout
const AdminLayout = () => {
  const { isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-500">Loading Sia...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DemoBanner />
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/roster" element={<AdminRoster />} />
          <Route path="/surveys" element={<AdminSurveys />} />
          <Route path="/cohorts" element={<AdminCohorts />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
      <RoleSwitcher />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
