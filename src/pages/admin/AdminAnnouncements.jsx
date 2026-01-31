import { useState, useEffect } from 'react';
import { Plus, X, Bell, Megaphone, Trash2, Edit2, Send, Clock, Users, AlertTriangle, Check } from 'lucide-react';
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
      <div className="p-6 lg:p-8">
        {/* Notification Banner */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                notification.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-300'
                  : notification.type === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300'
                    : 'bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-900/30 text-sky-700 dark:text-sky-300'
              }`}
            >
              <Bell size={18} />
              <span>{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="ml-auto p-1 hover:bg-black/5 rounded"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Announcements</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Create and manage announcements for students</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            New Announcement
          </button>
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
                  <div key={announcement.id} className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-900/30 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{announcement.title}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${getPriorityBadge(announcement.priority)}`}>
                            {getPriorityIcon(announcement.priority)}
                            {announcement.priority}
                          </span>
                          {cohort && (
                            <span className="text-xs px-2 py-0.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-full flex items-center gap-1">
                              <Users size={10} />
                              {cohort.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{announcement.content}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleOpenEdit(announcement)}
                          className="p-2 hover:bg-amber-100 dark:hover:bg-amber-800/30 text-amber-700 dark:text-amber-400 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id, announcement.title)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => handlePublish(announcement)}
                          className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Send size={14} />
                          Publish
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
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center shadow-sm">
              <Megaphone className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
              <p className="text-slate-500 dark:text-slate-400">No announcements yet. Create one to notify students.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {publishedAnnouncements.map(announcement => {
                const cohort = announcement.cohortId ? cohorts.find(c => c.id === announcement.cohortId) : null;
                return (
                  <div key={announcement.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{announcement.title}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${getPriorityBadge(announcement.priority)}`}>
                            {getPriorityIcon(announcement.priority)}
                            {announcement.priority}
                          </span>
                          {cohort ? (
                            <span className="text-xs px-2 py-0.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-full flex items-center gap-1">
                              <Users size={10} />
                              {cohort.name}
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                              All Students
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{announcement.content}</p>
                        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span>By {announcement.authorName || 'Course Coordinator'}</span>
                          <span>•</span>
                          <span>{formatDate(announcement.publishedAt || announcement.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleOpenEdit(announcement)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id, announcement.title)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
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
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-slate-500" />
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
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                            formData.priority === priority
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
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          formData.status === 'published'
                            ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                        }`}
                      >
                        <Send size={14} />
                        Publish Now
                      </button>
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, status: 'draft' }))}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          formData.status === 'draft'
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
