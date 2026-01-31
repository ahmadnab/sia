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
      <div className="p-6 lg:p-8">
        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                notification.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300'
              }`}
            >
              <span>{notification.message}</span>
              <button onClick={() => setNotification(null)} className="ml-auto p-1 hover:bg-black/5 rounded">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Anonymous Wall</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View anonymous student feedback and respond to concerns</p>
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
              Your replies will be visible to all students who view this post.
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
                const postReplies = repliesByPost[post.id] || [];
                const isExpanded = expandedPosts.has(post.id);
                const isReplying = replyingTo === post.id;

                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden"
                  >
                    {/* Post Content */}
                    <div className="p-6">
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
                        <div className="flex flex-wrap gap-2 mt-4">
                          {post.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-xs rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleStartReply(post.id)}
                            className="flex items-center gap-1.5 text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                          >
                            <MessageCircle size={16} />
                            Reply
                          </button>
                          {postReplies.length > 0 && (
                            <button
                              onClick={() => toggleExpanded(post.id)}
                              className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              {postReplies.length} {postReplies.length === 1 ? 'reply' : 'replies'}
                            </button>
                          )}
                        </div>
                        {post.sentimentScore !== undefined && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Sentiment: {post.sentimentScore}/100
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reply Input */}
                    {isReplying && (
                      <div className="px-6 pb-4">
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write your reply..."
                            rows={3}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none text-sm"
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-2 mt-3">
                            <button
                              onClick={handleCancelReply}
                              className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSubmitReply(post.id)}
                              disabled={!replyContent.trim() || isSubmittingReply}
                              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {isSubmittingReply ? (
                                <LoadingSpinner size="sm" light />
                              ) : (
                                <Send size={14} />
                              )}
                              Post Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Replies Section */}
                    {isExpanded && postReplies.length > 0 && (
                      <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <div className="p-4 space-y-3">
                          {postReplies.map((reply) => (
                            <div key={reply.id} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                                    <MessageCircle size={12} className="text-sky-600 dark:text-sky-400" />
                                  </div>
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {reply.authorName || 'Course Coordinator'}
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {formatTime(reply.createdAt)}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteReply(reply.id, post.id)}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-colors"
                                  title="Delete reply"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 pl-8">{reply.content}</p>
                            </div>
                          ))}
                        </div>
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
