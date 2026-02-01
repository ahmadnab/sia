import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, MessageSquare, Lock, Sparkles, AlertCircle, MessageCircle, ChevronDown, ChevronUp, Heart, Filter, User, Users } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToWallPosts, submitWallPost, subscribeToAllWallReplies, getVisitorId, toggleWallPostLike } from '../../services/firebase';
import { analyzeSentiment } from '../../services/gemini';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../../components/LoadingSpinner';

// Heart Button Component with Pop Animation
const HeartButton = ({ postId, initialLikes, initialLikedBy = [] }) => {
  const visitorId = getVisitorId();
  const [likes, setLikes] = useState(initialLikes || 0);
  const [isLiked, setIsLiked] = useState(initialLikedBy.includes(visitorId));
  const [isAnimating, setIsAnimating] = useState(false);

  // Sync with prop updates (real-time changes from other users)
  useEffect(() => {
    setLikes(initialLikes || 0);
    setIsLiked(initialLikedBy.includes(visitorId));
  }, [initialLikes, initialLikedBy, visitorId]);

  const handleLike = async () => {
    // Optimistic Update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikes(prev => newIsLiked ? prev + 1 : prev - 1);
    setIsAnimating(true);

    // Backend Call
    await toggleWallPostLike(postId, visitorId);

    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleLike();
      }}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ${isLiked
        ? 'text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20'
        : 'text-slate-400 hover:text-pink-500 hover:bg-slate-50 dark:hover:bg-slate-700'
        }`}
    >
      <motion.div
        animate={isAnimating ? { scale: [1, 1.4, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Heart size={16} className={isLiked ? "fill-current" : ""} />
      </motion.div>
      <span className="text-xs font-medium tabular-nums">{likes > 0 ? likes : ''}</span>
    </button>
  );
};

// Infinite Scroll Sentinel
const LoadMoreSentinel = ({ onLoadMore, hasMore, isLoading }) => {
  const sentinelRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    }, {
      root: null,
      rootMargin: '100px',
      threshold: 0
    });

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [onLoadMore, hasMore, isLoading]);

  return (
    <div ref={sentinelRef} className="py-8 flex justify-center">
      {isLoading && hasMore ? (
        <LoadingSpinner size="sm" />
      ) : !hasMore ? (
        <p className="text-xs text-slate-400 font-medium opacity-60">You're all caught up</p>
      ) : (
        <div className="h-4" /> // Invisible spacer to trigger scroll
      )}
    </div>
  );
};

const AnonymousWall = () => {
  const { configStatus } = useApp();
  const [posts, setPosts] = useState([]);
  const [allReplies, setAllReplies] = useState([]);
  const [expandedPosts, setExpandedPosts] = useState(new Set());
  const [newPost, setNewPost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Pagination & Sorting State
  const [postLimit, setPostLimit] = useState(20);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = Newest, 'asc' = Oldest
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setIsLoadingMore(true);
    // Pass limit and sortOrder to subscription
    const unsubPosts = subscribeToWallPosts((fetchedPosts) => {
      setPosts(fetchedPosts);
      setIsLoadingMore(false);
    }, postLimit, sortOrder);

    const unsubReplies = subscribeToAllWallReplies(setAllReplies);

    return () => {
      unsubPosts();
      unsubReplies();
    };
  }, [postLimit, sortOrder]);

  // Memoize replies map
  const repliesByPost = useMemo(() => {
    return allReplies.reduce((acc, reply) => {
      if (!acc[reply.postId]) acc[reply.postId] = [];
      acc[reply.postId].push(reply);
      return acc;
    }, {});
  }, [allReplies]);

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

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    // Add small delay to prevent rapid-fire firing if network is instant
    setTimeout(() => {
      setPostLimit(prev => prev + 20);
    }, 500);
  };

  const handleSubmit = async () => {
    if (!newPost.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitPhase('processing');

    try {
      // Analyze sentiment if Gemini is configured
      let sentimentResult = { score: 50, tags: ['Community'] };
      if (configStatus.gemini) {
        sentimentResult = await analyzeSentiment(newPost);
      }

      setSubmitPhase('encrypting');
      await new Promise(r => setTimeout(r, 600));

      // Submit to Firestore (NO USER ID!)
      if (configStatus.firebase) {
        await submitWallPost({
          content: newPost,
          sentimentScore: sentimentResult.score,
          tags: sentimentResult.tags
        });
      }

      setSubmitPhase('complete');
      await new Promise(r => setTimeout(r, 1000));

      setNewPost('');
      setSubmitPhase(null);
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitPhase(null);
      setSubmitError('Failed to share your thought. Please try again.');
    }

    setIsSubmitting(false);
  };

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/80 dark:bg-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/student" className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none">Community Wall</h1>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Anonymous Peer Support</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className="group p-2 hover:px-3 flex items-center gap-0 hover:gap-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-700/50 rounded-full transition-all hover:scale-105 active:scale-95 hidden sm:flex items-center justify-center"
                title="Switch to Admin"
              >
                <Users size={20} />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-sm font-medium opacity-0 group-hover:opacity-100">
                  Switch to Admin
                </span>
              </Link>
              <ThemeToggle variant="icon" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">

        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN: Fixed Sidebar (Guidelines & Composer) */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">

            {/* Guidelines Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 border border-indigo-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Safe Space</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Community Guidelines</p>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  Your identity is always hidden.
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  Be respectful and supportive.
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">•</span>
                  No hate speech or bullying.
                </li>
              </ul>
            </div>

            {/* Composer Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-1">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={4}
                  disabled={isSubmitting}
                  className="w-full bg-transparent p-4 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none resize-none transition-all placeholder:transition-opacity focus:placeholder:opacity-50"
                />
              </div>

              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-1 rounded">
                  <Lock size={10} />
                  <span>Encrypted</span>
                </div>

                <div className="flex items-center gap-3">
                  {submitError && (
                    <span className="text-xs text-red-500">{submitError}</span>
                  )}

                  {submitPhase ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {submitPhase === 'processing' && <><LoadingSpinner size="xs" /> Analyzing</>}
                      {submitPhase === 'encrypting' && <><Sparkles size={14} className="animate-spin-slow" /> Encrypting</>}
                      {submitPhase === 'complete' && <><Shield size={14} /> Posted</>}
                    </div>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={!newPost.trim() || isSubmitting}
                      className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:from-slate-200 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-800 disabled:text-slate-400 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                    >
                      Post
                    </button>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN: Feed */}
          <section className="lg:col-span-8 space-y-6">

            {/* Filters Bar */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-[72px] z-20 lg:static">
              <div className="flex items-center gap-2 px-2">
                <MessageSquare size={16} className="text-indigo-500" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Live Feed</span>
                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                  {posts.length}
                </span>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => { setSortOrder('desc'); setPostLimit(20); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${sortOrder === 'desc' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Newest
                </button>
                <button
                  onClick={() => { setSortOrder('asc'); setPostLimit(20); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${sortOrder === 'asc' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Oldest
                </button>
              </div>
            </div>

            {/* Posts List */}
            {posts.length === 0 && !isLoadingMore ? (
              <div className="py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={32} className="text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">Quiet day?</h3>
                <p className="text-slate-500 dark:text-slate-400">Be the first to share something!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {posts.map((post) => {
                    const postReplies = repliesByPost[post.id] || [];
                    const isExpanded = expandedPosts.has(post.id);
                    const hasReplies = postReplies.length > 0;

                    return (
                      <motion.div
                        key={post.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shadow-inner">
                              <User size={16} className="text-slate-400 dark:text-slate-300" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Anonymous Student</h4>
                              <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">{formatTime(post.createdAt)}</span>
                            </div>
                          </div>

                          {/* Right Column: Tags & Like Button */}
                          <div className="flex flex-col items-end gap-2">
                            {post.tags?.length > 0 && (
                              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full uppercase tracking-wider">
                                #{post.tags[0]}
                              </span>
                            )}
                            <HeartButton
                              postId={post.id}
                              initialLikes={post.likes || 0}
                              initialLikedBy={post.likedBy}
                            />
                          </div>
                        </div>

                        <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap pl-11 mb-4">
                          {post.content}
                        </p>

                        {/* Reply Toggle (Only if replies exist) */}
                        {hasReplies && (
                          <div className="pl-11 border-t border-slate-50 dark:border-slate-700/50 pt-3">
                            <button
                              onClick={() => toggleExpanded(post.id)}
                              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isExpanded ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            >
                              <MessageCircle size={16} />
                              <span>{postReplies.length} {postReplies.length === 1 ? 'Reply' : 'Replies'}</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        )}

                        {/* Expanded Replies */}
                        <AnimatePresence>
                          {isExpanded && hasReplies && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pl-11 space-y-3">
                                {postReplies.map(reply => (
                                  <div key={reply.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span className="text-[10px] font-bold text-white bg-indigo-500 px-1.5 py-0.5 rounded">
                                        {reply.authorName || 'Staff'}
                                      </span>
                                      <span className="text-[10px] text-slate-400">{formatTime(reply.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{reply.content}</p>
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

                {/* Infinite Scroll Sentinel */}
                <LoadMoreSentinel
                  onLoadMore={handleLoadMore}
                  hasMore={posts.length >= postLimit}
                  isLoading={isLoadingMore}
                />
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
};

export default AnonymousWall;
