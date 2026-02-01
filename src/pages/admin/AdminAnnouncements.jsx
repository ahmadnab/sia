import { useState, useEffect } from 'react';
import { Plus, X, Bell, Megaphone, Trash2, Edit2, Send, Clock, Users, AlertTriangle, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../../components/AdminLayout';
import { subscribeToAnnouncements, subscribeToCohorts, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../services/firebase';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminAnnouncements = () => {
  const { configStatus } = useApp();
  const [announcements, setAnnouncements] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  // New announcement form
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    cohortId: '',
    priority: 'normal',
    status: 'published'
  });

  useEffect(() => {
    const unsubAnnouncements = subscribeToAnnouncements(setAnnouncements);
    const unsubCohorts = subscribeToCohorts(setCohorts);
    return () => {
      unsubAnnouncements();
      unsubCohorts();
    };
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      cohortId: '',
      priority: 'normal',
      status: 'published'
    });
    setEditingAnnouncement(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      cohortId: announcement.cohortId || '',
      priority: announcement.priority || 'normal',
      status: announcement.status || 'published'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;
    if (!configStatus.firebase) {
      alert('Firebase not configured. Add your Firebase keys to .env first.');
      return;
    }

    setIsCreating(true);
    try {
      if (editingAnnouncement) {
        // Update existing
        await updateAnnouncement(editingAnnouncement.id, {
          title: formData.title,
          content: formData.content,
          cohortId: formData.cohortId || null,
          priority: formData.priority,
          status: formData.status
        });
        showNotification('Announcement updated successfully!', 'success');
      } else {
        // Create new
        await createAnnouncement({
          title: formData.title,
          content: formData.content,
          cohortId: formData.cohortId || null,
          priority: formData.priority,
          status: formData.status,
          authorName: 'Course Coordinator'
        });
        const cohortName = formData.cohortId
          ? cohorts.find(c => c.id === formData.cohortId)?.name
          : 'All Students';
        showNotification(`Announcement ${formData.status === 'published' ? 'published' : 'saved as draft'} for ${cohortName}!`, 'success');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving announcement:', error);
      showNotification('Failed to save announcement.', 'error');
    }
    setIsCreating(false);
  };

  const handleDelete = async (announcementId, title) => {
    if (!configStatus.firebase) return;

    const confirmed = window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteAnnouncement(announcementId);
      showNotification('Announcement deleted successfully.', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showNotification('Failed to delete announcement.', 'error');
    }
  };

  const handlePublish = async (announcement) => {
    if (!configStatus.firebase) return;

    try {
      await updateAnnouncement(announcement.id, { status: 'published' });
      showNotification('Announcement published!', 'success');
    } catch (error) {
      console.error('Publish error:', error);
      showNotification('Failed to publish announcement.', 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      normal: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
      important: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    };
    return styles[priority] || styles.normal;
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent') return <AlertTriangle size={14} />;
    if (priority === 'important') return <Bell size={14} />;
    return null;
  };

  const publishedAnnouncements = announcements.filter(a => a.status === 'published');
  const draftAnnouncements = announcements.filter(a => a.status === 'draft');

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Notification Banner */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-lg backdrop-blur-md ${notification.type === 'success'
                ? 'bg-green-50/90 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                : notification.type === 'error'
                  ? 'bg-red-50/90 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                  : 'bg-sky-50/90 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300'
                }`}
            >
              <Bell size={18} />
              <span className="font-medium">{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="ml-auto p-1 hover:bg-black/5 rounded-full"
                aria-label="Dismiss notification"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 to-orange-600 p-8 shadow-xl shadow-rose-500/20">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-rose-100 mb-2">
                <Megaphone size={16} className="text-amber-300" />
                <span className="text-sm font-medium tracking-wide uppercase opacity-90">Communications</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Announcements
              </h1>
              <p className="text-rose-100/90 text-lg max-w-xl">
                Broadcast important updates, events, and news to student cohorts.
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-6 py-3.5 bg-white text-rose-600 hover:bg-rose-50 font-bold rounded-xl shadow-lg shadow-black/10 transition-all active:scale-95"
            >
              <Plus size={20} />
              <span>New Announcement</span>
            </button>
          </div>
        </div>

        {/* Draft Announcements */}
        {draftAnnouncements.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-amber-500" />
              Draft Announcements ({draftAnnouncements.length})
            </h2>

            <div className="grid gap-4">
              {draftAnnouncements.map(announcement => {
                const cohort = announcement.cohortId ? cohorts.find(c => c.id === announcement.cohortId) : null;
                return (
                  <div key={announcement.id} className="bg-amber-50/50 dark:bg-amber-900/10 backdrop-blur-sm rounded-2xl border border-amber-200/50 dark:border-amber-800/30 p-6 transition-all hover:bg-amber-50 dark:hover:bg-amber-900/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{announcement.title}</h3>
                          <span className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 ${getPriorityBadge(announcement.priority)}`}>
                            {getPriorityIcon(announcement.priority)}
                            {announcement.priority}
                          </span>
                          <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider rounded-lg border border-amber-200 dark:border-amber-800">
                            Draft
                          </span>
                          {cohort && (
                            <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                              <Users size={12} />
                              {cohort.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{announcement.content}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handlePublish(announcement)}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2 active:scale-95"
                        >
                          <Send size={14} />
                          Publish
                        </button>
                        <button
                          onClick={() => handleOpenEdit(announcement)}
                          className="p-2 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id, announcement.title)}
                          className="p-2 hover:bg-red-100/50 dark:hover:bg-red-900/30 text-rose-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Published Announcements */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Megaphone size={20} className="text-sky-500" />
            Published Announcements ({publishedAnnouncements.length})
          </h2>

          {publishedAnnouncements.length === 0 ? (
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                <Megaphone className="text-slate-400" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No announcements yet</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Create your first announcement to reach your students.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {publishedAnnouncements.map(announcement => {
                const cohort = announcement.cohortId ? cohorts.find(c => c.id === announcement.cohortId) : null;
                return (
                  <div key={announcement.id} className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            {announcement.title}
                          </h3>
                          <span className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 ${getPriorityBadge(announcement.priority)}`}>
                            {getPriorityIcon(announcement.priority)}
                            {announcement.priority}
                          </span>
                          <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                            <Check size={12} />
                            Published
                          </span>
                        </div>

                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 line-clamp-3 group-hover:line-clamp-none transition-all duration-500 mb-4">
                          {announcement.content}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                          {cohort ? (
                            <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md">
                              <Users size={12} className="text-indigo-500" />
                              To: <span className="font-medium text-slate-700 dark:text-slate-300">{cohort.name}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md">
                              <Users size={12} className="text-green-500" />
                              To: <span className="font-medium text-slate-700 dark:text-slate-300">All Students</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Clock size={12} />
                            {formatDate(announcement.publishedAt || announcement.createdAt)}
                          </span>
                          <span>•</span>
                          <span>By {announcement.authorName || 'Course Coordinator'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleOpenEdit(announcement)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id, announcement.title)}
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    aria-label="Close modal"
                  >
                    <X size={20} className="text-slate-500" aria-hidden="true" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Assignment Deadline Extended"
                      className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Content *
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Write your announcement here..."
                      rows={4}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                    />
                  </div>

                  {/* Cohort Selector */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Users size={16} />
                      Target Audience
                    </label>
                    <select
                      value={formData.cohortId}
                      onChange={(e) => setFormData(prev => ({ ...prev, cohortId: e.target.value }))}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">All Students</option>
                      {cohorts.map(cohort => (
                        <option key={cohort.id} value={cohort.id}>
                          {cohort.name} ({cohort.year})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Priority
                    </label>
                    <div className="flex gap-2">
                      {['normal', 'important', 'urgent'].map(priority => (
                        <button
                          key={priority}
                          onClick={() => setFormData(prev => ({ ...prev, priority }))}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${formData.priority === priority
                            ? priority === 'urgent'
                              ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
                              : priority === 'important'
                                ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                                : 'bg-sky-100 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400'
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                            }`}
                        >
                          {priority}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Status
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, status: 'published' }))}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${formData.status === 'published'
                          ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                          : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                          }`}
                      >
                        <Send size={14} />
                        Publish Now
                      </button>
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, status: 'draft' }))}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${formData.status === 'draft'
                          ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                          : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                          }`}
                      >
                        <Clock size={14} />
                        Save as Draft
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isCreating || !formData.title.trim() || !formData.content.trim()}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCreating ? (
                      <LoadingSpinner size="sm" light />
                    ) : formData.status === 'published' ? (
                      <Send size={16} />
                    ) : (
                      <Check size={16} />
                    )}
                    {editingAnnouncement ? 'Save Changes' : formData.status === 'published' ? 'Publish' : 'Save Draft'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminAnnouncements;
