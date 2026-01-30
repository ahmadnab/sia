import { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, TrendingDown, Users, MessageSquare, AlertTriangle, RefreshCw, Activity, Clock, PieChart as PieChartIcon, HelpCircle, X, Database, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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
    { name: 'High', value: riskMetrics.highRiskCount, color: '#EF4444' },
    { name: 'Medium', value: riskMetrics.mediumRiskCount, color: '#F59E0B' },
    { name: 'Low', value: riskMetrics.lowRiskCount, color: '#22C55E' },
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
  const sentimentColor = avgSentiment >= 70 ? '#22C55E' : avgSentiment >= 40 ? '#F59E0B' : '#EF4444';
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
      { range: '0-20', min: 0, max: 20, count: 0, label: 'Very Low', color: '#EF4444' },
      { range: '21-40', min: 21, max: 40, count: 0, label: 'Low', color: '#F97316' },
      { range: '41-60', min: 41, max: 60, count: 0, label: 'Neutral', color: '#F59E0B' },
      { range: '61-80', min: 61, max: 80, count: 0, label: 'Good', color: '#84CC16' },
      { range: '81-100', min: 81, max: 100, count: 0, label: 'Excellent', color: '#22C55E' },
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
      // Use deterministic values based on index (no Math.random in useMemo)
      if (summary?.themes && summary.themes.length > 0) {
        return summary.themes.map((theme, idx) => {
          // Create deterministic variance based on index
          const variance = ((idx % 5) - 2) * 10; // -20, -10, 0, 10, 20
          return {
            theme: theme,
            sentiment: Math.max(20, Math.min(80, avgSentiment + variance)),
            mentions: (idx % 7) + 3 // 3-9 mentions, deterministic
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

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time insights from your students</p>
        </div>

        {/* Primary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Sentiment Score */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avg. Sentiment</h3>
              <div className={`flex items-center gap-1 text-sm ${avgSentiment >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                {avgSentiment >= 50 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{avgSentiment >= 50 ? '+' : ''}{(avgSentiment - 50).toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gaugeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={40}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                    >
                      <Cell fill={sentimentColor} />
                      <Cell fill="#E2E8F0" className="dark:fill-slate-700" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{avgSentiment}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">out of 100</p>
              </div>
            </div>
          </div>

          {/* Response Count */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Responses</h3>
              <MessageSquare className="text-sky-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{responseCount}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Anonymous submissions</p>
          </div>

          {/* At-Risk Students */}
          <button
            onClick={() => setShowNeedsAttentionModal(true)}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow text-left w-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            type="button"
            aria-label="View at-risk students"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Needs Attention</h3>
              <AlertTriangle className="text-amber-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{atRiskStudents}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Students at risk • Click to view</p>
          </button>
        </div>

        {/* Secondary Metric Cards - Engagement & Risk */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Response Rate */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowResponseRateModal(true);
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow text-left w-full focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            type="button"
            aria-label="View Response Rate Details"
          >
            <div className="flex items-center justify-between mb-4 pointer-events-none">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avg. Response Rate</h3>
              <Activity className="text-teal-500" size={20} />
            </div>
            <div className="flex items-baseline gap-2 pointer-events-none">
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{engagementMetrics.avgResponseRate}%</p>
              {engagementMetrics.activeSurveyCount > 0 && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  across {engagementMetrics.activeSurveyCount} active survey{engagementMetrics.activeSurveyCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 pointer-events-none">
              {engagementMetrics.activeSurveyCount === 0 
                ? 'No active surveys' 
                : 'Votes / Eligible students'}
            </p>
          </button>

          {/* Recent Engagement */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowRecentActivityModal(true);
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow text-left w-full focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            type="button"
            aria-label="View Recent Activity Details"
          >
            <div className="flex items-center justify-between mb-4 pointer-events-none">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Recent Activity</h3>
              <Clock className="text-purple-500" size={20} />
            </div>
            <div className="flex items-baseline gap-2 pointer-events-none">
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{recentEngagement.last7Days}</p>
              <div className={`flex items-center gap-1 text-sm ${recentEngagement.delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {recentEngagement.delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{recentEngagement.delta >= 0 ? '+' : ''}{recentEngagement.delta}%</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 pointer-events-none">
              Responses in last 7 days (vs prior week)
            </p>
          </button>

          {/* Risk Distribution */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowRiskDistributionModal(true);
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow text-left w-full focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            type="button"
            aria-label="View Risk Distribution Details"
          >
            <div className="flex items-center justify-between mb-4 pointer-events-none">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Risk Distribution</h3>
              <PieChartIcon className="text-rose-500" size={20} />
            </div>
            <div className="flex items-center gap-4 pointer-events-none">
              <div className="w-16 h-16 pointer-events-none">
                {riskDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={18}
                        outerRadius={30}
                        dataKey="value"
                      >
                        {riskDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center pointer-events-none">
                    <Users className="text-slate-400 dark:text-slate-500" size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 pointer-events-none">
                <div className="flex items-baseline gap-2 pointer-events-none">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 pointer-events-none">{riskMetrics.highRiskPercent}%</p>
                  <span className="text-sm text-slate-500 dark:text-slate-400 pointer-events-none">high risk</span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 pointer-events-none">
                  <span className="flex items-center gap-1 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-red-500 pointer-events-none"></span>
                    {riskMetrics.highRiskCount}
                  </span>
                  <span className="flex items-center gap-1 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-amber-500 pointer-events-none"></span>
                    {riskMetrics.mediumRiskCount}
                  </span>
                  <span className="flex items-center gap-1 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-green-500 pointer-events-none"></span>
                    {riskMetrics.lowRiskCount}
                  </span>
                  {riskMetrics.unknownRiskCount > 0 && (
                    <span className="flex items-center gap-1 pointer-events-none" title="No GPA data">
                      <HelpCircle size={12} className="text-slate-400 dark:text-slate-500 pointer-events-none" />
                      {riskMetrics.unknownRiskCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sentiment Trend</h3>
              {/* Week-over-Week Delta Badge */}
              {sentimentWoW.delta !== null && (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                  sentimentWoW.delta >= 0 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {sentimentWoW.delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{sentimentWoW.delta >= 0 ? '+' : ''}{sentimentWoW.delta}% vs last week</span>
                </div>
              )}
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData.filter(d => d.sentiment !== null)}>
                  <defs>
                    <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 12 }} 
                    className="dark:[&>text]:fill-slate-400"
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 12 }} 
                    className="dark:[&>text]:fill-slate-400"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: resolvedTheme === 'dark' ? '#1E293B' : '#ffffff',
                      border: resolvedTheme === 'dark' ? 'none' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: resolvedTheme === 'dark' ? '#F1F5F9' : '#0f172a'
                    }}
                    formatter={(value, name) => [value, name === 'sentiment' ? 'Sentiment Score' : name]}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sentiment" 
                    stroke="#0EA5E9" 
                    strokeWidth={2}
                    fill="url(#sentimentGradient)"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {trendData.filter(d => d.sentiment !== null).length === 0 && (
              <div className="flex items-center justify-center h-48 text-slate-400 dark:text-slate-500 text-sm">
                No sentiment data available for the past 7 days
              </div>
            )}

            {/* Sentiment Distribution & Theme Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              {/* Sentiment Distribution Histogram */}
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Score Distribution</h4>
                {responses.filter(r => r.sentimentScore != null).length > 0 ? (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sentimentDistribution} barCategoryGap="15%">
                        <XAxis 
                          dataKey="range" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94A3B8', fontSize: 10 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94A3B8', fontSize: 10 }}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          cursor={false}
                          contentStyle={{ 
                            backgroundColor: resolvedTheme === 'dark' ? '#1E293B' : '#ffffff',
                            border: resolvedTheme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          labelStyle={{
                            color: resolvedTheme === 'dark' ? '#F1F5F9' : '#0f172a',
                            fontWeight: 600,
                            marginBottom: '4px'
                          }}
                          itemStyle={{
                            color: resolvedTheme === 'dark' ? '#CBD5E1' : '#475569'
                          }}
                          formatter={(value, name, props) => [
                            `${value} responses`,
                            props.payload.label
                          ]}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {sentimentDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                    No response data yet
                  </div>
                )}
                <div className="flex justify-center gap-3 mt-2 flex-wrap">
                  {sentimentDistribution.map((bucket, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bucket.color }}></span>
                      <span>{bucket.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme Sentiment Matrix */}
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Theme Breakdown</h4>
                {themeSentiments.length > 0 ? (
                  <div className="space-y-2.5">
                    {themeSentiments.slice(0, 5).map((item, idx) => {
                      const barColor = item.sentiment >= 70 ? '#22C55E' : item.sentiment >= 40 ? '#F59E0B' : '#EF4444';
                      return (
                        <div key={idx} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="relative max-w-[60%]">
                              <span className="text-sm text-slate-700 dark:text-slate-300 truncate block">
                                {item.theme}
                              </span>
                              {/* Tooltip on hover */}
                              <div className="absolute left-0 bottom-full mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap max-w-xs">
                                {item.theme}
                                <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-700"></div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.mentions && (
                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                  {item.mentions} mentions
                                </span>
                              )}
                              <span className="text-sm font-semibold" style={{ color: barColor }}>
                                {Math.round(item.sentiment)}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${item.sentiment}%`,
                                backgroundColor: barColor
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                    <p>No theme data available</p>
                    <p className="text-xs mt-1">Generate an AI summary to see theme breakdown</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Summary</h3>
                {summary?.responseCount > 0 && summary.responseCount !== responses.length && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                    Update Available
                  </span>
                )}
              </div>
              <button
                onClick={refreshSummary}
                disabled={isLoadingSummary || !configStatus.gemini || responses.length === 0}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                title={
                  !configStatus.gemini
                    ? 'Add Gemini API key to enable AI summaries'
                    : responses.length === 0
                      ? 'No responses to summarize'
                      : summary?.responseCount > 0 && summary.responseCount !== responses.length
                        ? 'Click to generate updated summary'
                        : 'Click to refresh summary'
                }
              >
                <RefreshCw size={16} className={`text-slate-500 dark:text-slate-400 ${isLoadingSummary ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {isLoadingSummary ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <LoadingSpinner />
                <p className="text-sm text-slate-500 dark:text-slate-400">Generating AI summary...</p>
              </div>
            ) : summary ? (
              <div className="space-y-4">
                {summary.cachedAt && (
                  <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <span>
                      Cached {new Date(summary.cachedAt?.seconds * 1000 || Date.now()).toLocaleString()}
                    </span>
                    {summary.responseCount > 0 && summary.responseCount !== responses.length && (
                      <span className="text-amber-600 dark:text-amber-500">
                        • {responses.length - summary.responseCount} new response(s)
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-300">{summary.summary}</p>
                
                {summary.themes?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Key Themes</p>
                    <div className="flex flex-wrap gap-2">
                      {summary.themes.map((theme, i) => (
                        <span key={i} className="px-2 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-xs rounded-full">
                          #{theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {summary.actionItems?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Suggested Actions</p>
                    <ul className="space-y-1">
                      {summary.actionItems.map((item, i) => (
                        <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                          <span className="text-sky-500 dark:text-sky-400 mt-1">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No data to summarize yet.</p>
            )}
          </div>
        </div>


        {/* Response Rate Detail Modal */}
        {showResponseRateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowResponseRateModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Response Rate Details</h2>
                <button onClick={() => setShowResponseRateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X size={20} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              <div className="p-6">
                {responseRateDetails.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">No active surveys to display.</p>
                ) : (
                  <div className="space-y-4">
                    {responseRateDetails.map((detail) => (
                      <div key={detail.surveyId} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{detail.surveyName}</h3>
                          <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{detail.rate}%</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                          <span>{detail.votes} votes</span>
                          <span>•</span>
                          <span>{detail.eligibleCount} eligible students</span>
                        </div>
                        <div className="mt-3 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-teal-500 transition-all"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowRecentActivityModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Recent Activity Timeline</h2>
                <button onClick={() => setShowRecentActivityModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X size={20} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              <div className="p-6">
                {recentActivityDetails.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">No activity in the last 7 days.</p>
                ) : (
                  <div className="space-y-4">
                    {recentActivityDetails.map((day, idx) => (
                      <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </h3>
                          <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{day.count} response{day.count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="space-y-2">
                          {day.responses.slice(0, 5).map((response, rIdx) => (
                            <div key={rIdx} className="text-sm text-slate-600 dark:text-slate-300 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
                              <span className="text-slate-400 dark:text-slate-500">
                                {response.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {' • '}
                              <span className="text-slate-700 dark:text-slate-300">
                                {response.sentimentScore !== undefined ? `Sentiment: ${response.sentimentScore}/100` : 'Response submitted'}
                              </span>
                            </div>
                          ))}
                          {day.responses.length > 5 && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 pl-4">...and {day.responses.length - 5} more</p>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowRiskDistributionModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Risk Distribution Details</h2>
                <button onClick={() => setShowRiskDistributionModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X size={20} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setRiskFilterLevel('high')}
                    className={`text-left rounded-lg p-4 transition-all ${
                      riskFilterLevel === 'high'
                        ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 shadow-md'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      <h3 className="font-semibold text-red-900 dark:text-red-300">High Risk</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{riskMetrics.highRiskCount}</p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {riskMetrics.totalStudents > 0 ? Math.round((riskMetrics.highRiskCount / riskMetrics.totalStudents) * 100) : 0}% of total
                    </p>
                  </button>
                  <button
                    onClick={() => setRiskFilterLevel('medium')}
                    className={`text-left rounded-lg p-4 transition-all ${
                      riskFilterLevel === 'medium'
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 dark:border-amber-600 shadow-md'
                        : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <h3 className="font-semibold text-amber-900 dark:text-amber-300">Medium Risk</h3>
                    </div>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{riskMetrics.mediumRiskCount}</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {riskMetrics.totalStudents > 0 ? Math.round((riskMetrics.mediumRiskCount / riskMetrics.totalStudents) * 100) : 0}% of total
                    </p>
                  </button>
                  <button
                    onClick={() => setRiskFilterLevel('low')}
                    className={`text-left rounded-lg p-4 transition-all ${
                      riskFilterLevel === 'low'
                        ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 shadow-md'
                        : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 hover:border-green-300 dark:hover:border-green-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      <h3 className="font-semibold text-green-900 dark:text-green-300">Low Risk</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{riskMetrics.lowRiskCount}</p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {riskMetrics.totalStudents > 0 ? Math.round((riskMetrics.lowRiskCount / riskMetrics.totalStudents) * 100) : 0}% of total
                    </p>
                  </button>
                  {riskMetrics.unknownRiskCount > 0 && (
                    <button
                      onClick={() => setRiskFilterLevel('unknown')}
                      className={`text-left rounded-lg p-4 transition-all ${
                        riskFilterLevel === 'unknown'
                          ? 'bg-slate-50 dark:bg-slate-700/50 border-2 border-slate-500 dark:border-slate-500 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <HelpCircle size={16} className="text-slate-400 dark:text-slate-500" />
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Unknown</h3>
                      </div>
                      <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{riskMetrics.unknownRiskCount}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-400">
                        {riskMetrics.totalStudents > 0 ? Math.round((riskMetrics.unknownRiskCount / riskMetrics.totalStudents) * 100) : 0}% of total
                      </p>
                    </button>
                  )}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    {riskFilterLevel === 'high' && 'High Risk Students'}
                    {riskFilterLevel === 'medium' && 'Medium Risk Students'}
                    {riskFilterLevel === 'low' && 'Low Risk Students'}
                    {riskFilterLevel === 'unknown' && 'Students with Unknown Risk'}
                  </h3>
                  {students.filter(s => s.riskLevel === riskFilterLevel || (!s.riskLevel && riskFilterLevel === 'unknown')).length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No students in this category.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {students.filter(s => s.riskLevel === riskFilterLevel || (!s.riskLevel && riskFilterLevel === 'unknown')).map(student => {
                        const getRiskColor = (level) => {
                          if (level === 'high') return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-100 dark:border-red-900/30', text: 'text-red-600 dark:text-red-400', initBg: 'bg-red-100 dark:bg-red-900/40' };
                          if (level === 'medium') return { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-900/30', text: 'text-amber-600 dark:text-amber-400', initBg: 'bg-amber-100 dark:bg-amber-900/40' };
                          if (level === 'low') return { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-100 dark:border-green-900/30', text: 'text-green-600 dark:text-green-400', initBg: 'bg-green-100 dark:bg-green-900/40' };
                          return { bg: 'bg-slate-50 dark:bg-slate-700/50', border: 'border-slate-100 dark:border-slate-600', text: 'text-slate-600 dark:text-slate-300', initBg: 'bg-slate-100 dark:bg-slate-600' };
                        };
                        const colors = getRiskColor(riskFilterLevel);
                        return (
                          <div key={student.id} className={`flex items-center justify-between p-3 ${colors.bg} border ${colors.border} rounded-lg`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 ${colors.initBg} rounded-full flex items-center justify-center`}>
                                <span className={`${colors.text} font-medium text-sm`}>
                                  {student.name?.charAt(0) || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{student.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {student.milestone} • GPA: {student.gpa !== null ? student.gpa?.toFixed(1) : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Needs Attention Modal */}
        {showNeedsAttentionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowNeedsAttentionModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-red-500" size={24} />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Students Needing Attention</h2>
                </div>
                <button onClick={() => setShowNeedsAttentionModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X size={20} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    The following students have been identified as high-risk based on their GPA and performance metrics.
                    Consider reaching out for additional support.
                  </p>
                </div>
                {riskMetrics.highRiskCount === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="text-green-600 dark:text-green-400" size={32} />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">All Students On Track</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">No high-risk students at this time.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {students.filter(s => s.riskLevel === 'high').map(student => (
                      <div key={student.id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                            <span className="text-red-600 dark:text-red-400 font-bold text-lg">
                              {student.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {student.milestone} • GPA: {student.gpa !== null ? student.gpa?.toFixed(1) : 'N/A'}
                            </p>
                            {student.email && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{student.email}</p>
                            )}
                          </div>
                        </div>
                        <span className="px-3 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-sm font-medium rounded-full">
                          High Risk
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test Data Management Section - Collapsible */}
        <div className="mt-8">
          <button
            onClick={() => setShowDemoData(!showDemoData)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Database size={16} />
            <span>Demo Data Management</span>
            {showDemoData ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showDemoData && (
            <div className="mt-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-xl border-2 border-amber-200 dark:border-amber-900/30 p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <Database className="text-amber-600 dark:text-amber-400" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-300 mb-1">Demo Data Management</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Use these tools to populate or clear your database for demonstration purposes.
                    <span className="font-medium"> Seed creates 3 cohorts, 30 students, 5 surveys, 60 responses, 20 wall posts, and 60+ chat messages.</span>
                  </p>
                </div>
              </div>

              {/* Status Messages */}
              {seedMessage && (
                <div className={`mb-4 p-3 rounded-lg border ${
                  seedMessage.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  <p className="text-sm font-medium">{seedMessage.text}</p>
                </div>
              )}

              {clearMessage && (
                <div className={`mb-4 p-3 rounded-lg border ${
                  clearMessage.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  <p className="text-sm font-medium">{clearMessage.text}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSeedTestData}
                  disabled={isSeeding || isClearing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSeeding ? (
                    <>
                      <LoadingSpinner size="sm" light />
                      <span>Seeding Data...</span>
                    </>
                  ) : (
                    <>
                      <Database size={18} />
                      <span>Seed Test Data</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleClearTestData}
                  disabled={isSeeding || isClearing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClearing ? (
                    <>
                      <LoadingSpinner size="sm" light />
                      <span>Clearing Data...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      <span>Clear All Data</span>
                    </>
                  )}
                </button>
              </div>

              {/* Warning Notice */}
              <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-900/40 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">⚠️ Important:</span> Clear All Data will permanently delete all records from Firebase.
                  This action cannot be undone. Always backup important data before clearing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
