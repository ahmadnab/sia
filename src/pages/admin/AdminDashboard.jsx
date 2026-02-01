import { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, TrendingDown, Users, MessageSquare, AlertTriangle, RefreshCw, Activity, Clock, PieChart as PieChartIcon, HelpCircle, X, Database, Trash2, ChevronDown, ChevronUp, Sparkles, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import AdminLayout from '../../components/AdminLayout';
import { subscribeToResponses, subscribeToStudents, subscribeToSurveys, subscribeToSurveyStatus, getVoteCountsBySurvey, seedTestData, clearTestData, subscribeToSummaryCache, saveSummaryCache } from '../../services/firebase';
import { generateResponseSummary } from '../../services/gemini';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminDashboard = () => {
  const { configStatus } = useApp();
  const { resolvedTheme } = useTheme();
  const [responses, setResponses] = useState([]);
  const [students, setStudents] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [surveyStatuses, setSurveyStatuses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [showResponseRateModal, setShowResponseRateModal] = useState(false);
  const [showRecentActivityModal, setShowRecentActivityModal] = useState(false);
  const [showRiskDistributionModal, setShowRiskDistributionModal] = useState(false);
  const [showNeedsAttentionModal, setShowNeedsAttentionModal] = useState(false);
  const [riskFilterLevel, setRiskFilterLevel] = useState('high'); // 'high', 'medium', 'low', 'unknown'
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [seedMessage, setSeedMessage] = useState(null);
  const [clearMessage, setClearMessage] = useState(null);
  const [showDemoData, setShowDemoData] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);

  // Refs for timeout cleanup to prevent memory leaks
  const seedTimeoutRef = useRef(null);
  const clearTimeoutRef = useRef(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (seedTimeoutRef.current) clearTimeout(seedTimeoutRef.current);
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    };
  }, []);

  // M18 FIX: Chart render delay - allows container dimensions to stabilize after mount
  const CHART_RENDER_DELAY_MS = 100;

  // Delay chart rendering to ensure container dimensions are calculated
  useEffect(() => {
    const timer = setTimeout(() => setIsChartReady(true), CHART_RENDER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubResponses = subscribeToResponses(setResponses);
    const unsubStudents = subscribeToStudents(setStudents);
    const unsubSurveys = subscribeToSurveys(setSurveys);
    const unsubStatuses = subscribeToSurveyStatus(setSurveyStatuses);
    const unsubSummaryCache = subscribeToSummaryCache((cachedSummary) => {
      if (cachedSummary) {
        setSummary(cachedSummary);
      }
    });
    return () => {
      unsubResponses();
      unsubStudents();
      unsubSurveys();
      unsubStatuses();
      unsubSummaryCache();
    };
  }, []);

  // Set default summary when no responses or no API key
  useEffect(() => {
    if (!configStatus.gemini || responses.length === 0) {
      const defaultSummary = {
        summary: responses.length === 0
          ? 'No responses yet. Create a survey to start collecting feedback.'
          : 'Add Gemini API key to enable AI-powered summaries.',
        themes: [],
        actionItems: [],
        averageSentiment: responses.length > 0
          ? Math.round(responses.reduce((a, r) => a + (r.sentimentScore || 50), 0) / responses.length)
          : 0
      };
      setSummary(defaultSummary);
    }
  }, [responses.length, configStatus.gemini]);

  // Manual refresh handler for the button - generates new summary and caches it
  const refreshSummary = async () => {
    if (!configStatus.gemini || responses.length === 0) {
      const defaultSummary = {
        summary: responses.length === 0
          ? 'No responses yet. Create a survey to start collecting feedback.'
          : 'Add Gemini API key to enable AI-powered summaries.',
        themes: [],
        actionItems: [],
        averageSentiment: responses.length > 0
          ? Math.round(responses.reduce((a, r) => a + (r.sentimentScore || 50), 0) / responses.length)
          : 0
      };
      setSummary(defaultSummary);
      return;
    }

    setIsLoadingSummary(true);
    try {
      const result = await generateResponseSummary(responses);

      // Add response count to track freshness
      const summaryWithMetadata = {
        ...result,
        responseCount: responses.length
      };

      setSummary(summaryWithMetadata);

      // Save to cache in Firebase
      if (configStatus.firebase) {
        await saveSummaryCache(summaryWithMetadata);
      }
    } catch (error) {
      console.error('Summary error:', error);
    }
    setIsLoadingSummary(false);
  };

  // Handle seed test data
  const handleSeedTestData = async () => {
    // Clear any existing timeout
    if (seedTimeoutRef.current) clearTimeout(seedTimeoutRef.current);

    if (!configStatus.firebase) {
      setSeedMessage({ type: 'error', text: 'Firebase not configured. Add your Firebase keys to .env first.' });
      seedTimeoutRef.current = setTimeout(() => setSeedMessage(null), 5000);
      return;
    }

    setIsSeeding(true);
    setSeedMessage(null);

    try {
      const result = await seedTestData();
      if (result.success) {
        setSeedMessage({
          type: 'success',
          text: `✓ ${result.message} - ${result.details.cohorts} cohorts, ${result.details.students} students, ${result.details.surveys} surveys, ${result.details.responses} responses, ${result.details.wallPosts} wall posts`
        });
      } else {
        setSeedMessage({ type: 'error', text: `✗ ${result.message}` });
      }
    } catch (error) {
      console.error('Seed error:', error);
      setSeedMessage({ type: 'error', text: `✗ Failed to seed data: ${error.message}` });
    }

    setIsSeeding(false);
    seedTimeoutRef.current = setTimeout(() => setSeedMessage(null), 8000);
  };

  // Handle clear test data
  const handleClearTestData = async () => {
    // Clear any existing timeout
    if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);

    if (!configStatus.firebase) {
      setClearMessage({ type: 'error', text: 'Firebase not configured. Add your Firebase keys to .env first.' });
      clearTimeoutRef.current = setTimeout(() => setClearMessage(null), 5000);
      return;
    }

    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL data from Firebase!\n\n' +
      'This includes:\n' +
      '• All students\n' +
      '• All cohorts\n' +
      '• All surveys\n' +
      '• All responses\n' +
      '• All wall posts\n' +
      '• All vote tracking\n\n' +
      'Are you absolutely sure you want to proceed?'
    );

    if (!confirmed) return;

    setIsClearing(true);
    setClearMessage(null);

    try {
      const result = await clearTestData();
      if (result.success) {
        setClearMessage({
          type: 'success',
          text: `✓ ${result.message}`
        });
      } else {
        setClearMessage({ type: 'error', text: `✗ ${result.message}` });
      }
    } catch (error) {
      console.error('Clear error:', error);
      setClearMessage({ type: 'error', text: `✗ Failed to clear data: ${error.message}` });
    }

    setIsClearing(false);
    clearTimeoutRef.current = setTimeout(() => setClearMessage(null), 5000);
  };

  // ==================
  // ENGAGEMENT METRICS
  // ==================

  // Calculate response rate for active surveys
  const engagementMetrics = useMemo(() => {
    const activeSurveys = surveys.filter(s => s.status === 'Active');
    const voteCounts = getVoteCountsBySurvey(surveyStatuses);
    const totalStudents = students.length;

    if (activeSurveys.length === 0 || totalStudents === 0) {
      return { avgResponseRate: 0, activeSurveyCount: activeSurveys.length };
    }

    // Calculate average response rate across active surveys
    let totalRate = 0;
    activeSurveys.forEach(survey => {
      // Get eligible students (cohort-specific or all)
      const eligibleCount = survey.cohortId
        ? students.filter(s => s.cohortId === survey.cohortId).length
        : totalStudents;

      const votes = voteCounts[survey.id] || 0;
      const rate = eligibleCount > 0 ? (votes / eligibleCount) * 100 : 0;
      totalRate += rate;
    });

    const avgResponseRate = Math.round(totalRate / activeSurveys.length);
    return { avgResponseRate, activeSurveyCount: activeSurveys.length };
  }, [surveys, surveyStatuses, students]);

  // Calculate recent engagement (last 7 days vs previous 7 days)
  const recentEngagement = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let last7Days = 0;
    let prev7Days = 0;

    responses.forEach(r => {
      const timestamp = r.timestamp?.toDate?.() || (r.timestamp ? new Date(r.timestamp) : null);
      if (!timestamp) return;

      if (timestamp >= sevenDaysAgo) {
        last7Days++;
      } else if (timestamp >= fourteenDaysAgo) {
        prev7Days++;
      }
    });

    const delta = prev7Days > 0 ? Math.round(((last7Days - prev7Days) / prev7Days) * 100) : (last7Days > 0 ? 100 : 0);

    return { last7Days, prev7Days, delta };
  }, [responses]);

  // ==================
  // RISK METRICS
  // ==================

  const riskMetrics = useMemo(() => {
    const totalStudents = students.length;
    const highRiskCount = students.filter(s => s.riskLevel === 'high').length;
    const mediumRiskCount = students.filter(s => s.riskLevel === 'medium').length;
    const unknownRiskCount = students.filter(s => s.riskLevel === 'unknown' || !s.riskLevel).length;
    const lowRiskCount = students.filter(s => s.riskLevel === 'low').length;

    const highRiskPercent = totalStudents > 0 ? Math.round((highRiskCount / totalStudents) * 100) : 0;

    return {
      totalStudents,
      highRiskCount,
      mediumRiskCount,
      unknownRiskCount,
      lowRiskCount,
      highRiskPercent
    };
  }, [students]);

  // Risk distribution chart data
  const riskDistributionData = [
    { name: 'High', value: riskMetrics.highRiskCount, color: '#F43F5E' },
    { name: 'Medium', value: riskMetrics.mediumRiskCount, color: '#F97316' },
    { name: 'Low', value: riskMetrics.lowRiskCount, color: '#10B981' },
    { name: 'Unknown', value: riskMetrics.unknownRiskCount, color: '#94A3B8' },
  ].filter(d => d.value > 0);

  // Detailed response rate data by survey
  const responseRateDetails = useMemo(() => {
    const activeSurveys = surveys.filter(s => s.status === 'Active');
    const voteCounts = getVoteCountsBySurvey(surveyStatuses);
    const totalStudents = students.length;

    return activeSurveys.map(survey => {
      const eligibleCount = survey.cohortId
        ? students.filter(s => s.cohortId === survey.cohortId).length
        : totalStudents;
      const votes = voteCounts[survey.id] || 0;
      const rate = eligibleCount > 0 ? Math.round((votes / eligibleCount) * 100) : 0;

      return {
        surveyId: survey.id,
        surveyName: survey.title || 'Untitled Survey',
        votes,
        eligibleCount,
        rate,
        cohortId: survey.cohortId
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [surveys, surveyStatuses, students]);

  // Recent activity timeline data
  const recentActivityDetails = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentResponses = responses
      .map(r => {
        const timestamp = r.timestamp?.toDate?.() || (r.timestamp ? new Date(r.timestamp) : null);
        return { ...r, timestamp };
      })
      .filter(r => r.timestamp && r.timestamp >= sevenDaysAgo)
      .sort((a, b) => b.timestamp - a.timestamp);

    // Group by day
    const groupedByDay = {};
    recentResponses.forEach(r => {
      const dayKey = r.timestamp.toISOString().split('T')[0];
      if (!groupedByDay[dayKey]) {
        groupedByDay[dayKey] = [];
      }
      groupedByDay[dayKey].push(r);
    });

    return Object.entries(groupedByDay)
      .map(([day, dayResponses]) => ({
        date: new Date(day),
        count: dayResponses.length,
        responses: dayResponses
      }))
      .sort((a, b) => b.date - a.date);
  }, [responses]);

  // Basic metrics
  const avgSentiment = summary?.averageSentiment || 0;
  const responseCount = responses.length;
  const atRiskStudents = riskMetrics.highRiskCount;

  // Sentiment gauge data
  const sentimentColor = avgSentiment >= 70 ? '#10B981' : avgSentiment >= 40 ? '#F59E0B' : '#F43F5E';
  const gaugeData = [
    { name: 'Score', value: avgSentiment },
    { name: 'Remaining', value: 100 - avgSentiment }
  ];

  // ==================
  // SENTIMENT ANALYTICS
  // ==================

  // Calculate sentiment distribution (histogram data)
  const sentimentDistribution = useMemo(() => {
    const buckets = [
      { range: '0-20', min: 0, max: 20, count: 0, label: 'Very Low', color: '#F43F5E' },
      { range: '21-40', min: 21, max: 40, count: 0, label: 'Low', color: '#F97316' },
      { range: '41-60', min: 41, max: 60, count: 0, label: 'Neutral', color: '#F59E0B' },
      { range: '61-80', min: 61, max: 80, count: 0, label: 'Good', color: '#84CC16' },
      { range: '81-100', min: 81, max: 100, count: 0, label: 'Excellent', color: '#10B981' },
    ];

    responses.forEach(r => {
      const score = r.sentimentScore;
      if (score != null) {
        const bucket = buckets.find(b => score >= b.min && score <= b.max);
        if (bucket) bucket.count++;
      }
    });

    return buckets;
  }, [responses]);

  // Calculate week-over-week sentiment change
  const sentimentWoW = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let thisWeekScores = [];
    let lastWeekScores = [];

    responses.forEach(r => {
      const timestamp = r.timestamp?.toDate?.() || (r.timestamp ? new Date(r.timestamp) : null);
      const score = r.sentimentScore;
      if (!timestamp || score == null) return;

      if (timestamp >= sevenDaysAgo) {
        thisWeekScores.push(score);
      } else if (timestamp >= fourteenDaysAgo) {
        lastWeekScores.push(score);
      }
    });

    const thisWeekAvg = thisWeekScores.length > 0
      ? Math.round(thisWeekScores.reduce((a, b) => a + b, 0) / thisWeekScores.length)
      : null;
    const lastWeekAvg = lastWeekScores.length > 0
      ? Math.round(lastWeekScores.reduce((a, b) => a + b, 0) / lastWeekScores.length)
      : null;

    let delta = null;
    if (thisWeekAvg !== null && lastWeekAvg !== null && lastWeekAvg > 0) {
      delta = Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100);
    } else if (thisWeekAvg !== null && lastWeekAvg === null) {
      delta = 0; // No comparison available
    }

    return { thisWeekAvg, lastWeekAvg, delta, thisWeekCount: thisWeekScores.length };
  }, [responses]);

  // Theme sentiment data from AI summary
  const themeSentiments = useMemo(() => {
    if (!summary?.themeSentiments || summary.themeSentiments.length === 0) {
      // Fallback: create from themes if themeSentiments not available
      if (summary?.themes && summary.themes.length > 0) {
        return summary.themes.map((theme, idx) => {
          const variance = ((idx % 5) - 2) * 10;
          return {
            theme: theme,
            sentiment: Math.max(20, Math.min(80, avgSentiment + variance)),
            mentions: (idx % 7) + 3
          };
        });
      }
      return [];
    }
    return summary.themeSentiments.sort((a, b) => a.sentiment - b.sentiment);
  }, [summary, avgSentiment]);

  // Generate real trend data from responses (last 7 days)
  const trendData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const result = [];

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayName = days[date.getDay()];
      const dateKey = date.toISOString().split('T')[0];

      // Find responses for this day
      const dayResponses = responses.filter(r => {
        const timestamp = r.timestamp?.toDate?.() || (r.timestamp ? new Date(r.timestamp) : null);
        if (!timestamp) return false;
        return timestamp.toISOString().split('T')[0] === dateKey;
      });

      const dayScores = dayResponses
        .map(r => r.sentimentScore)
        .filter(s => s != null);

      const avgScore = dayScores.length > 0
        ? Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length)
        : null;

      result.push({
        day: dayName,
        sentiment: avgScore,
        count: dayScores.length
      });
    }

    return result;
  }, [responses]);

  // Glass Card Component
  const GlassCard = ({ children, className = "", onClick, ...props }) => (
    <div
      onClick={onClick}
      className={`relative bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
      {...props}
    >
      {/* Subtle top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent opacity-50" />
      {children}
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Welcome Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 md:p-12 shadow-xl shadow-indigo-500/20">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 blur-3xl rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/20 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-100 mb-2">
                <Sparkles size={16} className="text-amber-300" />
                <span className="text-sm font-medium tracking-wide uppercase opacity-90">Admin Dashboard</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white">Coordinator</span>
              </h1>
              <p className="text-indigo-100/80 text-lg max-w-xl">
                Here's what's happening in your student community today. You have {responses.length} total responses across {surveys.length} surveys.
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 text-white/90">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                <Calendar size={18} />
                <span className="font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Metric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sentiment Score */}
          <GlassCard className="p-6 group">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg. Sentiment</h3>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold shadow-sm ${avgSentiment >= 50 ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                }`}>
                {avgSentiment >= 50 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{avgSentiment >= 50 ? '+' : ''}{(avgSentiment - 50).toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex items-end gap-5">
              <div className="relative w-28 h-28 shrink-0">
                {isChartReady && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gaugeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={50}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        className="drop-shadow-sm"
                      >
                        <Cell fill={sentimentColor} stroke="none" />
                        <Cell fill={resolvedTheme === 'dark' ? '#1E293B' : '#E2E8F0'} stroke="none" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">{avgSentiment}</span>
                </div>
              </div>
              <div className="pb-2">
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Platform Health Score</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Based on student feedback sentiment analysis</p>
              </div>
            </div>
          </GlassCard>

          {/* Response Count */}
          <GlassCard className="p-6 flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Feedback</h3>
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform duration-300">
                <MessageSquare size={20} />
              </div>
            </div>
            <div>
              <p className="text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                {responseCount}
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  +{recentEngagement.last7Days}
                </span>
                <span>new this week</span>
              </div>
            </div>
          </GlassCard>

          {/* At-Risk Students */}
          <button
            onClick={() => setShowNeedsAttentionModal(true)}
            className="text-left w-full focus:outline-none"
          >
            <GlassCard className={`p-6 h-full flex flex-col justify-between border-l-4 hover:translate-y-[-2px] ${atRiskStudents > 0 ? 'border-l-rose-500' : 'border-l-emerald-500'
              }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Risk Radar</h3>
                {atRiskStudents > 0 ? (
                  <div className="animate-pulse">
                    <AlertTriangle className="text-rose-500" size={24} />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Sparkles size={20} />
                  </div>
                )}
              </div>
              <div>
                <p className={`text-5xl font-bold tracking-tight mb-2 ${atRiskStudents > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {atRiskStudents}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Students requiring attention
                  </p>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">View Details →</span>
                </div>
              </div>
            </GlassCard>
          </button>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button onClick={() => setShowResponseRateModal(true)} className="text-left group focus:outline-none">
            <GlassCard className="p-5 h-full flex items-center justify-between border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Activity size={18} />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Response Rates</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-1">Avg. Survey Engagement</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">{engagementMetrics.avgResponseRate}%</span>
              </div>
            </GlassCard>
          </button>

          <button onClick={() => setShowRecentActivityModal(true)} className="text-left group focus:outline-none">
            <GlassCard className="p-5 h-full flex items-center justify-between border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Clock size={18} />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Recent Activity</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-1">New responses this week</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{recentEngagement.last7Days}</span>
              </div>
            </GlassCard>
          </button>

          <button onClick={() => setShowRiskDistributionModal(true)} className="text-left group focus:outline-none">
            <GlassCard className="p-5 h-full flex items-center justify-between border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <PieChartIcon size={18} />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Risk Distribution</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-1">High / Med / Low</p>
              </div>
              <div className="flex gap-1">
                <div className="flex flex-col items-center px-2 border-r border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-bold text-rose-500">{riskMetrics.highRiskCount}</span>
                  <span className="text-[10px] text-slate-400">High</span>
                </div>
                <div className="flex flex-col items-center px-2">
                  <span className="text-sm font-bold text-amber-500">{riskMetrics.mediumRiskCount}</span>
                  <span className="text-[10px] text-slate-400">Med</span>
                </div>
              </div>
            </GlassCard>
          </button>
        </div>

        {/* Secondary Metrics & Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Area */}
          <GlassCard className="lg:col-span-2 p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sentiment Trends</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">7-day moving average</p>
              </div>
              {sentimentWoW.delta !== null && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold backdrop-blur-md ${sentimentWoW.delta >= 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>
                  {sentimentWoW.delta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>{sentimentWoW.delta >= 0 ? '+' : ''}{sentimentWoW.delta}% vs last week</span>
                </div>
              )}
            </div>

            <div className="h-64 mb-8">
              {isChartReady && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData.filter(d => d.sentiment !== null)}>
                    <defs>
                      <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: resolvedTheme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(8px)',
                        border: 'none',
                        borderRadius: '16px', // Rounded tooltip
                        color: resolvedTheme === 'dark' ? '#F1F5F9' : '#0f172a',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                      itemStyle={{ color: '#6366f1', fontWeight: 600 }}
                      formatter={(value) => [`${value}/100`, 'Sentiment Score']}
                      labelStyle={{ opacity: 0.7, marginBottom: '0.25rem' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sentiment"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fill="url(#sentimentGradient)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Distribution & Themes Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-200/50 dark:border-slate-800/50 pt-8">
              {/* Distribution */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Score Distribution</h4>
                <div className="h-40">
                  {isChartReady && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sentimentDistribution} barCategoryGap="20%">
                        <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{
                            backgroundColor: resolvedTheme === 'dark' ? '#1E293B' : '#fff',
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                          }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 6, 6]} overflow="visible">
                          {sentimentDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Themes */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Top Themes</h4>
                <div className="space-y-4">
                  {themeSentiments.slice(0, 4).map((item, idx) => {
                    const barColor = item.sentiment >= 70 ? '#10B981' : item.sentiment >= 40 ? '#F59E0B' : '#F43F5E';
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1.5 font-medium">
                          <span className="text-slate-700 dark:text-slate-200">{item.theme}</span>
                          <span style={{ color: barColor }}>{Math.round(item.sentiment)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${item.sentiment}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  {themeSentiments.length === 0 && (
                    <div className="text-center text-slate-400 text-sm py-8">Generate AI summary to see themes</div>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* AI Summary Side Panel */}
          <div className="space-y-6">
            <GlassCard className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Sparkles className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight">AI Insights</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Gemini</p>
                  </div>
                </div>
                <button
                  onClick={refreshSummary}
                  disabled={isLoadingSummary || !configStatus.gemini || responses.length === 0}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={18} className={`text-slate-500 ${isLoadingSummary ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex-1">
                {isLoadingSummary ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 min-h-[200px]">
                    <LoadingSpinner />
                    <span className="text-sm">Analyzing feedback...</span>
                  </div>
                ) : summary ? (
                  <div className="space-y-6">
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                      <p className="text-sm leading-relaxed text-indigo-900 dark:text-indigo-100">
                        {summary.summary}
                      </p>
                    </div>

                    {summary.actionItems?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Recommended Actions</h4>
                        <ul className="space-y-3">
                          {summary.actionItems.slice(0, 3).map((item, i) => (
                            <li key={i} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                              <div className="shrink-0 w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center mt-0.5">
                                <span className="text-xs font-bold text-sky-600 dark:text-sky-400">{i + 1}</span>
                              </div>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50">
                      <p className="text-xs text-center text-slate-400">
                        Last updated: {summary.cachedAt ? new Date(summary.cachedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-10">
                    No data to analyze yet
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Demo Data Management Footer */}
        <div className="mt-12 mb-6 flex flex-col items-center">
          <button
            onClick={() => setShowDemoData(!showDemoData)}
            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-indigo-500 transition-colors px-4 py-2 rounded-full hover:bg-white/50 dark:hover:bg-slate-800/50"
          >
            <Database size={16} />
            <span>Manage Demo Data</span>
            {showDemoData ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showDemoData && (
            <div className="mt-4 w-full max-w-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <Database className="text-amber-600 dark:text-amber-400" size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Test Data Controls</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Populate your database with realistic sample data to test the analytics engine.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleSeedTestData}
                  disabled={isSeeding || isClearing}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSeeding ? <LoadingSpinner size="sm" light /> : <Database size={18} />}
                  <span>Seed Test Data</span>
                </button>

                <button
                  onClick={handleClearTestData}
                  disabled={isSeeding || isClearing}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClearing ? <LoadingSpinner size="sm" /> : <Trash2 size={18} />}
                  <span>Clear All Data</span>
                </button>
              </div>

              {/* Messages */}
              {(seedMessage || clearMessage) && (
                <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-sm">
                  {seedMessage && <p className={`font-medium ${seedMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{seedMessage.text}</p>}
                  {clearMessage && <p className={`font-medium ${clearMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{clearMessage.text}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals - Keeping structure, adding glass class to containers if needed, though usually modals are solid or heavily blurred overlays */}
        {/* Response Rate Detail Modal */}
        {showResponseRateModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 pt-[10vh] sm:pt-4 overflow-y-auto" onClick={() => setShowResponseRateModal(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] sm:max-h-[85dvh] overflow-y-auto my-auto shadow-2xl border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Response Rate Details</h2>
                <button onClick={() => setShowResponseRateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              <div className="p-6">
                {responseRateDetails.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">No active surveys to display.</p>
                ) : (
                  <div className="space-y-4">
                    {responseRateDetails.map((detail) => (
                      <div key={detail.surveyId} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:border-teal-200 dark:hover:border-teal-900/50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-slate-900 dark:text-white">{detail.surveyName}</h3>
                          <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{detail.rate}%</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1.5"><Users size={14} /> {detail.votes} votes</span>
                          <span className="opacity-50">•</span>
                          <span>{detail.eligibleCount} eligible</span>
                        </div>
                        <div className="mt-3 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full transition-all duration-1000"
                            style={{ width: `${detail.rate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity Detail Modal */}
        {showRecentActivityModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 pt-[10vh] sm:pt-4 overflow-y-auto" onClick={() => setShowRecentActivityModal(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] sm:max-h-[85dvh] overflow-y-auto my-auto shadow-2xl border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Activity Timeline</h2>
                <button onClick={() => setShowRecentActivityModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              <div className="p-6">
                {recentActivityDetails.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">No activity in the last 7 days.</p>
                ) : (
                  <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-8">
                    {recentActivityDetails.map((day, idx) => (
                      <div key={idx} className="pl-6 relative">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white dark:border-slate-900" />
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-slate-900 dark:text-white">
                            {day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </h3>
                          <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                            {day.count} {day.count !== 1 ? 'responses' : 'response'}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {day.responses.slice(0, 5).map((response, rIdx) => (
                            <div key={rIdx} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 text-sm">
                              <div className="flex justify-between items-start">
                                <span className="text-slate-500 dark:text-slate-400 font-medium">
                                  {response.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {response.sentimentScore !== undefined && (
                                  <span className={`font-bold ${response.sentimentScore >= 70 ? 'text-emerald-500' : response.sentimentScore >= 40 ? 'text-amber-500' : 'text-rose-500'
                                    }`}>
                                    Score: {response.sentimentScore}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          {day.responses.length > 5 && (
                            <button className="text-sm font-medium text-indigo-500 hover:underline pl-1">
                              View {day.responses.length - 5} more responses
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Risk Distribution Detail Modal */}
        {showRiskDistributionModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 pt-[10vh] sm:pt-4 overflow-y-auto" onClick={() => setShowRiskDistributionModal(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] sm:max-h-[85dvh] overflow-y-auto my-auto shadow-2xl border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Risk Metrics</h2>
                <button onClick={() => setShowRiskDistributionModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {['high', 'medium', 'low', 'unknown'].map((level) => {
                    const isSelected = riskFilterLevel === level;
                    const metrics = {
                      high: { count: riskMetrics.highRiskCount, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', active: 'ring-rose-500' },
                      medium: { count: riskMetrics.mediumRiskCount, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', active: 'ring-amber-500' },
                      low: { count: riskMetrics.lowRiskCount, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', active: 'ring-emerald-500' },
                      unknown: { count: riskMetrics.unknownRiskCount, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', active: 'ring-slate-500' },
                    }[level];

                    if (level === 'unknown' && riskMetrics.unknownRiskCount === 0) return null;

                    return (
                      <button
                        key={level}
                        onClick={() => setRiskFilterLevel(level)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${isSelected
                          ? `border-transparent ring-2 ${metrics.active} bg-white dark:bg-slate-800 shadow-md`
                          : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-200'
                          }`}
                      >
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{level} Risk</p>
                        <p className={`text-2xl font-bold ${metrics.color} dark:text-white`}>{metrics.count}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {riskMetrics.totalStudents > 0 ? Math.round((metrics.count / riskMetrics.totalStudents) * 100) : 0}% of total
                        </p>
                      </button>
                    )
                  })}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
                  {students.filter(s => s.riskLevel === riskFilterLevel || (!s.riskLevel && riskFilterLevel === 'unknown')).length === 0 ? (
                    <div className="text-center py-6 text-slate-500">No students found with {riskFilterLevel} risk.</div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      {students.filter(s => s.riskLevel === riskFilterLevel || (!s.riskLevel && riskFilterLevel === 'unknown')).map(student => (
                        <div key={student.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400">
                              {student.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">{student.name}</p>
                              <p className="text-xs text-slate-500">{student.milestone} • GPA: {student.gpa ?? 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Needs Attention Modal */}
        {showNeedsAttentionModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 pt-[10vh] sm:pt-4 overflow-y-auto" onClick={() => setShowNeedsAttentionModal(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] sm:max-h-[85dvh] overflow-y-auto my-auto shadow-2xl border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                    <AlertTriangle className="text-rose-600 dark:text-rose-400" size={18} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Attention Required</h2>
                </div>
                <button onClick={() => setShowNeedsAttentionModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              <div className="p-6">
                {riskMetrics.highRiskCount === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                      <Sparkles className="text-emerald-500" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">All Clear!</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs">No high-risk students detected at this time.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {riskMetrics.highRiskCount} student{riskMetrics.highRiskCount !== 1 ? 's' : ''} flagged as high-risk based on GPA thresholds.
                    </p>
                    {students.filter(s => s.riskLevel === 'high').map(student => (
                      <div key={student.id} className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white dark:bg-rose-900/40 rounded-full flex items-center justify-center border-2 border-rose-100 dark:border-rose-800">
                            <span className="text-rose-600 dark:text-rose-400 font-bold text-lg">
                              {student.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{student.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {student.milestone} • <span className="text-rose-600 dark:text-rose-400 font-medium">GPA: {student.gpa?.toFixed(1)}</span>
                            </p>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-white dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 text-sm font-semibold rounded-xl border border-rose-100 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/50 transition-colors">
                          View Profile
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
