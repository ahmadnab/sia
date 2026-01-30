import { useState, useEffect } from 'react';
import { Shield, MessageSquare, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../../components/AdminLayout';
import { subscribeToWallPosts } from '../../services/firebase';

const AdminAnonymousWall = () => {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all'); // all, positive, neutral, negative

  useEffect(() => {
    const unsubscribe = subscribeToWallPosts(setPosts);
    return () => unsubscribe();
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate?.() || new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getSentimentColor = (score) => {
    if (score >= 70) return 'text-green-500 dark:text-green-400';
    if (score >= 40) return 'text-amber-500 dark:text-amber-400';
    return 'text-red-500 dark:text-red-400';
  };

  const getSentimentBadge = (score) => {
    if (score >= 70) return { label: 'Positive', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-900/30' };
    if (score >= 40) return { label: 'Neutral', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/30' };
    return { label: 'Negative', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-900/30' };
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    const score = post.sentimentScore || 50;
    if (filter === 'positive') return score >= 70;
    if (filter === 'neutral') return score >= 40 && score < 70;
    if (filter === 'negative') return score < 40;
    return true;
  });

  // Statistics
  const totalPosts = posts.length;
  const positivePosts = posts.filter(p => (p.sentimentScore || 50) >= 70).length;
  const neutralPosts = posts.filter(p => {
    const score = p.sentimentScore || 50;
    return score >= 40 && score < 70;
  }).length;
  const negativePosts = posts.filter(p => (p.sentimentScore || 50) < 40).length;
  const avgSentiment = totalPosts > 0
    ? Math.round(posts.reduce((sum, p) => sum + (p.sentimentScore || 50), 0) / totalPosts)
    : 0;

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Anonymous Wall</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View anonymous student feedback and concerns</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Posts</h3>
              <MessageSquare className="text-sky-500" size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalPosts}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avg. Sentiment</h3>
              <div className={getSentimentColor(avgSentiment)}>
                {avgSentiment >= 50 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{avgSentiment}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">out of 100</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Positive</h3>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{positivePosts}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{totalPosts > 0 ? Math.round((positivePosts / totalPosts) * 100) : 0}% of posts</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Needs Attention</h3>
              <AlertTriangle className="text-red-500" size={18} />
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{negativePosts}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{totalPosts > 0 ? Math.round((negativePosts / totalPosts) * 100) : 0}% of posts</p>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-900/30 rounded-xl p-4 flex items-start gap-3 mb-6">
          <Shield className="text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm text-teal-900 dark:text-teal-300 font-medium">Privacy Protected</p>
            <p className="text-xs text-teal-700 dark:text-teal-400 mt-1">
              All posts on this wall are completely anonymous. No user identifiers are stored or tracked.
              This ensures students feel safe sharing honest feedback and concerns.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'bg-sky-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            All Posts ({totalPosts})
          </button>
          <button
            onClick={() => setFilter('positive')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              filter === 'positive'
                ? 'bg-green-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Positive ({positivePosts})
          </button>
          <button
            onClick={() => setFilter('neutral')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              filter === 'neutral'
                ? 'bg-amber-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Neutral ({neutralPosts})
          </button>
          <button
            onClick={() => setFilter('negative')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              filter === 'negative'
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Needs Attention ({negativePosts})
          </button>
        </div>

        {/* Posts List */}
        {filteredPosts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center shadow-sm">
            <MessageSquare className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No posts {filter !== 'all' && `in ${filter} category`}</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {filter === 'all'
                ? 'Students haven\'t posted anything yet.'
                : 'Try selecting a different filter to view posts.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredPosts.map((post) => {
                const sentiment = getSentimentBadge(post.sentimentScore || 50);
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <Shield size={16} className="text-teal-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Anonymous</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${sentiment.bg} ${sentiment.text} ${sentiment.border}`}>
                          {sentiment.label}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{formatTime(post.createdAt)}</span>
                      </div>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{post.content}</p>

                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        {post.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-xs rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {post.sentimentScore !== undefined && (
                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>Sentiment Score: {post.sentimentScore}/100</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAnonymousWall;
