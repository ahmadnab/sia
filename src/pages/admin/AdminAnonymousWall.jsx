import { useState, useEffect } from 'react';
import { Shield, MessageSquare, TrendingUp, TrendingDown, AlertTriangle, Send, MessageCircle, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../../components/AdminLayout';
import { subscribeToWallPosts, subscribeToAllWallReplies, addWallPostReply, deleteWallReply, updateWallPostReplyCount } from '../../services/firebase';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminAnonymousWall = () => {
  const { configStatus } = useApp();
  const [posts, setPosts] = useState([]);
  const [allReplies, setAllReplies] = useState([]);
  const [filter, setFilter] = useState('all'); // all, positive, neutral, negative
  const [expandedPosts, setExpandedPosts] = useState(new Set());
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const unsubPosts = subscribeToWallPosts(setPosts);
    const unsubReplies = subscribeToAllWallReplies(setAllReplies);
    return () => {
      unsubPosts();
      unsubReplies();
    };
  }, []);

  // Group replies by postId
  const repliesByPost = allReplies.reduce((acc, reply) => {
    if (!acc[reply.postId]) acc[reply.postId] = [];
    acc[reply.postId].push(reply);
    return acc;
  }, {});

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

  const toggleExpanded = (postId) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleStartReply = (postId) => {
    setReplyingTo(postId);
    setReplyContent('');
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyContent('');
  };

  const handleSubmitReply = async (postId) => {
    if (!replyContent.trim() || !configStatus.firebase) return;

    setIsSubmittingReply(true);
    try {
      await addWallPostReply(postId, {
        content: replyContent.trim(),
        authorName: 'Course Coordinator',
        isPrivate: false
      });
      await updateWallPostReplyCount(postId, true);
      setReplyingTo(null);
      setReplyContent('');
      setExpandedPosts(prev => new Set([...prev, postId]));
      showNotification('Reply posted successfully!', 'success');
    } catch (error) {
      console.error('Error posting reply:', error);
      showNotification('Failed to post reply.', 'error');
    }
    setIsSubmittingReply(false);
  };

  const handleDeleteReply = async (replyId, postId) => {
    const confirmed = window.confirm('Are you sure you want to delete this reply?');
    if (!confirmed) return;

    try {
      await deleteWallReply(replyId);
      showNotification('Reply deleted.', 'success');
    } catch (error) {
      console.error('Error deleting reply:', error);
      showNotification('Failed to delete reply.', 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 right-4 z-50 p-4 rounded-xl flex items-center gap-3 shadow-lg backdrop-blur-md ${notification.type === 'success'
                  ? 'bg-green-50/90 dark:bg-green-900/90 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
                  : 'bg-red-50/90 dark:bg-red-900/90 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
                }`}
            >
              <span className="font-medium">{notification.message}</span>
              <button onClick={() => setNotification(null)} className="ml-auto p-1 hover:bg-black/5 rounded-full">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 p-8 shadow-xl shadow-teal-500/20">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-teal-50 mb-2">
                <Shield size={16} className="text-teal-200" />
                <span className="text-sm font-medium tracking-wide uppercase opacity-90">Student Voice</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Anonymous Wall
              </h1>
              <p className="text-teal-50/90 text-lg max-w-xl">
                A safe space for student feedback. Listen, understand, and respond to concerns.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Posts</h3>
              <div className="p-2 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
                <MessageSquare className="text-sky-500" size={18} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalPosts}</p>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avg. Sentiment</h3>
              <div className={`p-2 rounded-lg ${avgSentiment >= 50 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <div className={getSentimentColor(avgSentiment)}>
                  {avgSentiment >= 50 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{avgSentiment}</p>
              <span className="text-sm text-slate-400">/ 100</span>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Positive</h3>
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{positivePosts}</p>
              <span className="text-sm text-slate-400">{totalPosts > 0 ? Math.round((positivePosts / totalPosts) * 100) : 0}%</span>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Needs Attention</h3>
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="text-red-500" size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{negativePosts}</p>
              <span className="text-sm text-slate-400">{totalPosts > 0 ? Math.round((negativePosts / totalPosts) * 100) : 0}%</span>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-teal-50/50 dark:bg-teal-900/10 backdrop-blur-sm border border-teal-200/50 dark:border-teal-900/30 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
            <Shield className="text-teal-600 dark:text-teal-400 flex-shrink-0" size={20} />
          </div>
          <div>
            <p className="text-sm text-teal-900 dark:text-teal-300 font-bold mb-0.5">Privacy Protected</p>
            <p className="text-sm text-teal-700 dark:text-teal-400/80 leading-relaxed">
              All posts on this wall are completely anonymous. No user identifiers are stored or tracked.
              Your replies will be visible to all students who view this post.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'all', label: `All Posts (${totalPosts})`, color: 'sky' },
            { id: 'positive', label: `Positive (${positivePosts})`, color: 'emerald' },
            { id: 'neutral', label: `Neutral (${neutralPosts})`, color: 'amber' },
            { id: 'negative', label: `Needs Attention (${negativePosts})`, color: 'red' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${filter === tab.id
                  ? `bg-${tab.color}-500 text-white shadow-lg shadow-${tab.color}-500/25 scale-105`
                  : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Posts List */}
        {filteredPosts.length === 0 ? (
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="text-slate-300 dark:text-slate-600" size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No posts found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {filter === 'all'
                ? 'Students haven\'t posted anything yet. Check back later!'
                : `No posts match the "${filter}" filter currently.`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {filteredPosts.map((post) => {
                const sentiment = getSentimentBadge(post.sentimentScore || 50);
                const postReplies = repliesByPost[post.id] || [];
                const isExpanded = expandedPosts.has(post.id);
                const isReplying = replyingTo === post.id;

                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                  >
                    {/* Post Content */}
                    <div className="p-6 md:p-8">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                            <Shield size={20} className="text-white" />
                          </div>
                          <div>
                            <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">Anonymous Student</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{formatTime(post.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${sentiment.bg} ${sentiment.text} ${sentiment.border}`}>
                            {sentiment.label}
                          </span>
                        </div>
                      </div>

                      <div className="pl-[52px]">
                        <p className="text-lg text-slate-700 dark:text-slate-200 leading-relaxed mb-4">{post.content}</p>

                        {post.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-6">
                            {post.tags.map((tag, i) => (
                              <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-lg">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handleStartReply(post.id)}
                              className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors group/btn"
                            >
                              <div className="p-1.5 rounded-lg group-hover/btn:bg-sky-50 dark:group-hover/btn:bg-sky-900/30 transition-colors">
                                <MessageCircle size={18} />
                              </div>
                              Reply
                            </button>
                            {postReplies.length > 0 && (
                              <button
                                onClick={() => toggleExpanded(post.id)}
                                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                              >
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                {postReplies.length} {postReplies.length === 1 ? 'reply' : 'replies'}
                              </button>
                            )}
                          </div>
                          {post.sentimentScore !== undefined && (
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                              <span>Sentiment Score:</span>
                              <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${post.sentimentScore >= 70 ? 'bg-green-500' : post.sentimentScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${post.sentimentScore}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reply Input */}
                    <AnimatePresence>
                      {isReplying && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-6 pb-6 md:px-8 md:pb-8 pl-[52px]"
                        >
                          <div className="bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50 ring-4 ring-slate-100 dark:ring-slate-800/30">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Write your official response..."
                              rows={3}
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none text-sm"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-2 mt-3">
                              <button
                                onClick={handleCancelReply}
                                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSubmitReply(post.id)}
                                disabled={!replyContent.trim() || isSubmittingReply}
                                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 flex items-center gap-2 transform active:scale-95"
                              >
                                {isSubmittingReply ? (
                                  <LoadingSpinner size="sm" light />
                                ) : (
                                  <Send size={16} />
                                )}
                                Post Reply
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Replies Section */}
                    <AnimatePresence>
                      {isExpanded && postReplies.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                        >
                          <div className="p-6 md:p-8 space-y-4 pl-[52px]">
                            {postReplies.map((reply) => (
                              <div key={reply.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800 shadow-sm relative group/reply">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
                                      <MessageCircle size={16} className="text-sky-600 dark:text-sky-400" />
                                    </div>
                                    <div>
                                      <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
                                        {reply.authorName || 'Course Coordinator'}
                                      </span>
                                      <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {formatTime(reply.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteReply(reply.id, post.id)}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                    title="Delete reply"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 pl-11 text-sm leading-relaxed">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
