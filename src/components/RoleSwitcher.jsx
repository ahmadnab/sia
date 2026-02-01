import { Link, useLocation } from 'react-router-dom';
import { Users, GraduationCap, Home } from 'lucide-react';

const RoleSwitcher = () => {
  const location = useLocation();
  const isStudent = location.pathname.startsWith('/student');

  return (
    <div className="fixed top-24 right-6 z-50 flex flex-col gap-2">
      {/* Home button */}
      <Link
        to="/"
        className="flex items-center justify-center w-12 h-12 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all duration-300"
        aria-label="Go to home"
      >
        <Home size={20} />
      </Link>

      {/* Role switch button */}
      <Link
        to={isStudent ? '/admin' : '/student'}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-full shadow-lg shadow-sky-500/30 hover:shadow-sky-500/40 hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-md"
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
