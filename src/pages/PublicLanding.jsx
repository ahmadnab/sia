import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Shield, MessageCircle, BarChart3, Users, ChevronRight, Menu, X, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';

const PublicLanding = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="px-4 sm:px-6 py-4 flex items-center justify-between max-w-6xl mx-auto" aria-label="Main navigation">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
            <Bot className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">Sia</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden sm:flex items-center gap-3 md:gap-4">
          <ThemeToggle variant="icon" />
          <Link
            to="/student"
            className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Student Login
          </Link>
          <Link
            to="/admin"
            className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-lg transition-all shadow-md shadow-sky-500/20 font-medium"
          >
            Admin Login
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex sm:hidden items-center gap-2">
          <ThemeToggle variant="icon" />
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Open menu"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 sm:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-white dark:bg-slate-800 z-50 sm:hidden flex flex-col shadow-xl"
            >
              {/* Mobile Menu Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center">
                    <Bot className="text-white" size={20} />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">Sia</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X size={24} className="text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Mobile Menu Links */}
              <div className="flex-1 p-4 space-y-2">
                <Link
                  to="/student"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Users size={20} className="text-sky-500" />
                  <span className="font-medium">Student Login</span>
                </Link>
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <BarChart3 size={20} className="text-teal-500" />
                  <span className="font-medium">Admin Login</span>
                </Link>
              </div>

              {/* Mobile Menu Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Student Inclusive Analysis
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <header className="px-4 sm:px-6 pt-12 sm:pt-20 pb-20 sm:pb-32 max-w-6xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
            Student Inclusive Analysis
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-slate-600 dark:text-slate-400 mt-4 sm:mt-6 max-w-3xl mx-auto">
            Bridge the communication gap with <span className="text-teal-500 dark:text-teal-400">guaranteed anonymity</span>,
            targeted announcements, and AI-powered insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-8 sm:mt-10">
            <Link
              to="/student"
              className="px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 hover:scale-105"
            >
              I'm a Student
              <ChevronRight size={20} />
            </Link>
            <Link
              to="/admin"
              className="px-6 sm:px-8 py-3.5 sm:py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold rounded-xl transition-all shadow-lg shadow-slate-200/20 dark:shadow-none flex items-center justify-center gap-2 hover:scale-105"
            >
              I'm a Coordinator
              <ChevronRight size={20} />
            </Link>
          </div>
        </motion.div>
      </header>

      {/* Features Section */}
      <section className="px-4 sm:px-6 py-12 sm:py-20 bg-slate-200/50 dark:bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white text-center mb-8 sm:mb-12">
            Why Sia?
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-5 sm:p-6"
            >
              <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center mb-4">
                <Shield className="text-teal-400" size={24} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Double-Blind Anonymity
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Your feedback is mathematically untraceable. Even database admins
                cannot link responses to your identity.
              </p>
            </motion.div>

            {/* Feature 2: Smart Announcements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-5 sm:p-6"
            >
              <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center mb-4">
                <Megaphone className="text-sky-400" size={24} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Smart Announcements
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Send priority alerts to specific cohorts or the entire campus instantly.
                Keep everyone on the same page.
              </p>
            </motion.div>

            {/* Feature 3: Community Wall */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-5 sm:p-6"
            >
              <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="text-indigo-400" size={24} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Community Wall
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                A moderated, anonymous space for students to share shared experiences
                and find peer support.
              </p>
            </motion.div>

            {/* Feature 4: AI Companion */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-5 sm:p-6"
            >
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="text-amber-400" size={24} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Clustered Communication & AI
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Coordinators see aggregated insights and key themes, while students get an AI companion
                that understands their semester and learning stage.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white text-center mb-8 sm:mb-12">
            How It Works
          </h2>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
            {/* For Students */}
            <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-5 sm:mb-6">
                <Users className="text-sky-400" size={24} />
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">For Students</h3>
              </div>
              <ul className="space-y-3 sm:space-y-4 text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-sky-400 font-bold min-w-[1.5rem]">1.</span>
                  <span className="text-sm sm:text-base">One-click secure login via magic link</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sky-400 font-bold min-w-[1.5rem]">2.</span>
                  <span className="text-sm sm:text-base">Chat with Sia for instant academic guidance</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sky-400 font-bold min-w-[1.5rem]">3.</span>
                  <span className="text-sm sm:text-base">Share experiences securely on the Community Wall</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sky-400 font-bold min-w-[1.5rem]">4.</span>
                  <span className="text-sm sm:text-base">Answer surveys knowing your identity is protected</span>
                </li>
              </ul>
            </div>

            {/* For Coordinators */}
            <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-5 sm:mb-6">
                <BarChart3 className="text-teal-400" size={24} />
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">For Coordinators</h3>
              </div>
              <ul className="space-y-3 sm:space-y-4 text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-teal-400 font-bold min-w-[1.5rem]">1.</span>
                  <span className="text-sm sm:text-base">Bulk import class rosters via CSV</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-teal-400 font-bold min-w-[1.5rem]">2.</span>
                  <span className="text-sm sm:text-base">Broadcast targeted announcements and surveys</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-teal-400 font-bold min-w-[1.5rem]">3.</span>
                  <span className="text-sm sm:text-base">View real-time sentiment analysis and key themes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-teal-400 font-bold min-w-[1.5rem]">4.</span>
                  <span className="text-sm sm:text-base">Identify at-risk students who need intervention</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 py-12 sm:py-20 bg-sky-500/10 border-t border-sky-500/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Ready to transform student feedback?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-6 sm:mb-8">
            Join the institutions using Sia to create a safer, more responsive
            learning environment.
          </p>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-sky-500/30 hover:scale-105"
          >
            Get Started
            <ChevronRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-6 sm:py-8 border-t border-slate-300 dark:border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Bot className="text-sky-400" size={20} />
            <span className="text-sm sm:text-base text-slate-600 dark:text-slate-400">Sia — Student Inclusive Analysis</span>
          </div>
          <p className="text-slate-500 dark:text-slate-500 text-xs sm:text-sm">
            Built with privacy at its core.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLanding;
