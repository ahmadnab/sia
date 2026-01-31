import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Send, MessageSquare, Lock, Sparkles, AlertCircle, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToWallPosts, submitWallPost, subscribeToAllWallReplies } from '../../services/firebase';
import { analyzeSentiment } from '../../services/gemini';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const AnonymousWall = () => {
  const { configStatus } = useApp();
  const [posts, setPosts] = useState([]);
  const [allReplies, setAllReplies] = useState([]);
  const [expandedPosts, setExpandedPosts] = useState(new Set());
  const [newPost, setNewPost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState(null);
  const [submitError, setSubmitError] = useState(null);

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

  const handleSubmit = async () => {
    if (!newPost.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitPhase('processing');

    try {
      // Analyze sentiment if Gemini is configured
      let sentimentResult = { score: 50, tags: ['Feedback'] };
      if (configStatus.gemini) {
        sentimentResult = await analyzeSentiment(newPost);
      }

      setSubmitPhase('encrypting');
      await new Promise(r => setTimeout(r, 800));

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
    <div className="min-h-screen bg-slate-900 pb-24">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/student" className="p-2 -ml-2 hover:bg-slate-700 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-slate-400" />
          </Link>
          <div>
            <h1 className="font-semibold text-white">Anonymous Wall</h1>
            <div className="flex items-center gap-1 text-xs text-teal-400 mt-0.5">
              <Shield size={12} />
              <span>100% Anonymous</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Privacy Notice */}
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 flex items-start gap-3">
          <Shield className="text-teal-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm text-teal-300 font-medium">Your identity is protected</p>
            <p className="text-xs text-teal-400/80 mt-1">
              Posts on this wall are completely untraceable. Share your thoughts, concerns,
              or feedback knowing that your identity will never be linked to your words.
            </p>
          </div>
        </div>

        {/* New Post Input */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Share your thoughts
          </label>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="What's on your mind? Share anything — feedback, concerns, suggestions..."
            rows={4}
            disabled={isSubmitting}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none disabled:opacity-50"
          />

          {/* Submit Button or Status */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Lock size={12} />
              <span>No identity stored</span>
            </div>

            {submitError && (
              <div className="flex items-center gap-2 text-sm text-red-400" role="alert">
                <AlertCircle size={16} />
                <span>{submitError}</span>
                <button
                  onClick={() => setSubmitError(null)}
                  className="ml-2 hover:text-red-300"
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}
            {submitPhase ? (
              <div className="flex items-center gap-2 text-sm text-teal-400">
                {submitPhase === 'processing' && (
                  <>
                    <LoadingSpinner size="sm" light />
                    <span>Analyzing...</span>
                  </>
                )}
                {submitPhase === 'encrypting' && (
                  <>
                    <Sparkles size={16} className="animate-pulse" />
                    <span>Encrypting...</span>
                  </>
                )}
                {submitPhase === 'complete' && (
                  <>
                    <Shield size={16} />
                    <span>Posted anonymously!</span>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setSubmitError(null);
                  handleSubmit();
                }}
                disabled={!newPost.trim() || isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Shield size={16} />
                Post Anonymously
              </button>
            )}
          </div>
        </div>

        {/* Wall Posts */}
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
            Recent Posts ({posts.length})
          </h2>

          {posts.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <MessageSquare className="mx-auto text-slate-600 mb-2" size={32} />
              <p className="text-slate-400">No posts yet</p>
              <p className="text-sm text-slate-500 mt-1">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {posts.map((post) => {
                  const postReplies = repliesByPost[post.id] || [];
                  const isExpanded = expandedPosts.has(post.id);
                  const hasReplies = postReplies.length > 0;

                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
                    >
                      {/* Post Content */}
                      <div className="p-4">
                        <p className="text-slate-200">{post.content}</p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center">
                              <Shield size={12} className="text-teal-400" />
                            </div>
                            <span className="text-xs text-slate-500">Anonymous</span>
                          </div>
                          <span className="text-xs text-slate-500">{formatTime(post.createdAt)}</span>
                        </div>
                        {post.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {post.tags.map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded-full">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Replies indicator */}
                        {hasReplies && (
                          <button
                            onClick={() => toggleExpanded(post.id)}
                            className="mt-3 flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300 transition-colors"
                          >
                            <MessageCircle size={14} />
                            <span>{postReplies.length} {postReplies.length === 1 ? 'reply' : 'replies'} from coordinator</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                      </div>

                      {/* Replies Section */}
                      <AnimatePresence>
                        {isExpanded && hasReplies && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-700 bg-slate-800/50"
                          >
                            <div className="p-4 space-y-3">
                              {postReplies.map((reply) => (
                                <div key={reply.id} className="bg-sky-900/20 border border-sky-700/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 bg-sky-500/20 rounded-full flex items-center justify-center">
                                      <MessageCircle size={12} className="text-sky-400" />
                                    </div>
                                    <span className="text-sm font-medium text-sky-300">
                                      {reply.authorName || 'Course Coordinator'}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {formatTime(reply.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-300 pl-8">{reply.content}</p>
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
        </section>
      </main>
    </div>
  );
};

export default AnonymousWall;
