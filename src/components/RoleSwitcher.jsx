import { Link, useLocation } from 'react-router-dom';
import { Users, GraduationCap, Home } from 'lucide-react';

const RoleSwitcher = () => {
  const location = useLocation();
  const isStudent = location.pathname.startsWith('/student');

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {/* Home button */}
      <Link
        to="/"
        className="flex items-center justify-center w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105"
        aria-label="Go to home"
      >
        <Home size={20} />
      </Link>
      
      {/* Role switch button */}
      <Link
        to={isStudent ? '/admin' : '/student'}
        className="flex items-center gap-2 px-4 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105"
        aria-label={`Switch to ${isStudent ? 'Admin' : 'Student'} view`}
      >
        {isStudent ? (
          <>
            <Users size={20} />
            <span className="text-sm font-medium">Switch to Admin</span>
          </>
        ) : (
          <>
            <GraduationCap size={20} />
            <span className="text-sm font-medium">Switch to Student</span>
          </>
        )}
      </Link>
    </div>
  );
};

export default RoleSwitcher;
