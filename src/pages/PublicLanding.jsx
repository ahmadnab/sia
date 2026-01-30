import { Link } from 'react-router-dom';
import { Bot, Shield, MessageCircle, BarChart3, Users, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';

const PublicLanding = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto" aria-label="Main navigation">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
            <Bot className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">Sia</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link 
            to="/student" 
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Student Login
          </Link>
          <Link 
            to="/admin" 
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
          >
            Admin Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="px-6 pt-20 pb-32 max-w-6xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
            Student Inclusive Analysis
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mt-6 max-w-3xl mx-auto">
            Bridge the communication gap between students and administration with 
            AI-powered insights and <span className="text-teal-400">guaranteed anonymity</span>.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link
              to="/student"
              className="px-8 py-4 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              I'm a Student
              <ChevronRight size={20} />
            </Link>
            <Link
              to="/admin"
              className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              I'm a Coordinator
              <ChevronRight size={20} />
            </Link>
          </div>
        </motion.div>
      </header>

      {/* Features Section */}
      <section className="px-6 py-20 bg-slate-200/50 dark:bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-12">
            Why Sia?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-6"
            >
              <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center mb-4">
                <Shield className="text-teal-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Double-Blind Anonymity
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Your feedback is mathematically untraceable. Even database admins 
                cannot link responses to your identity.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-6"
            >
              <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle className="text-sky-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                24/7 AI Companion
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Get instant, personalized academic support from Sia — an AI that 
                understands your semester and learning stage.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-6"
            >
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="text-amber-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Clustered Communication
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Coordinators see aggregated insights like "80% found lectures too fast" 
                — not 100 individual complaints.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-12">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            {/* For Students */}
            <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Users className="text-sky-400" size={24} />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">For Students</h3>
              </div>
              <ul className="space-y-4 text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-sky-400 font-bold">1.</span>
                  Click the magic link in your email — no password needed
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sky-400 font-bold">2.</span>
                  Chat with Sia for instant academic guidance
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sky-400 font-bold">3.</span>
                  Submit anonymous feedback on the Anonymous Wall
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sky-400 font-bold">4.</span>
                  Answer surveys knowing your identity is protected
                </li>
              </ul>
            </div>

            {/* For Coordinators */}
            <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="text-teal-400" size={24} />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">For Coordinators</h3>
              </div>
              <ul className="space-y-4 text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-teal-400 font-bold">1.</span>
                  Upload your class roster via CSV
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-teal-400 font-bold">2.</span>
                  Create surveys with AI-generated questions
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-teal-400 font-bold">3.</span>
                  View real-time sentiment analysis and key themes
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-teal-400 font-bold">4.</span>
                  Identify at-risk students who need intervention
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-sky-500/10 border-t border-sky-500/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Ready to transform student feedback?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Join the institutions using Sia to create a safer, more responsive 
            learning environment.
          </p>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-colors"
          >
            Get Started
            <ChevronRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-slate-300 dark:border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="text-sky-400" size={20} />
            <span className="text-slate-600 dark:text-slate-400">Sia — Student Inclusive Analysis</span>
          </div>
          <p className="text-slate-500 dark:text-slate-500 text-sm">
            Built with privacy at its core.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLanding;
