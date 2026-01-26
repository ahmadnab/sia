import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, MessageSquare, AlertTriangle, RefreshCw, Activity, Clock, PieChart as PieChartIcon, HelpCircle, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import AdminLayout from '../../components/AdminLayout';
import { subscribeToResponses, subscribeToStudents, subscribeToSurveys, subscribeToSurveyStatus, getVoteCountsBySurvey } from '../../services/firebase';
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

  useEffect(() => {
    const unsubResponses = subscribeToResponses(setResponses);
    const unsubStudents = subscribeToStudents(setStudents);
    const unsubSurveys = subscribeToSurveys(setSurveys);
    const unsubStatuses = subscribeToSurveyStatus(setSurveyStatuses);
    return () => {
      unsubResponses();
      unsubStudents();
      unsubSurveys();
      unsubStatuses();
    };
  }, []);

  // Generate summary when responses change
  useEffect(() => {
    let cancelled = false;
    
    const fetchSummary = async () => {
      if (!configStatus.gemini || responses.length === 0) {
        setSummary({
          summary: responses.length === 0 
            ? 'No responses yet. Create a survey to start collecting feedback.'
            : 'Add Gemini API key to enable AI-powered summaries.',
          themes: [],
          actionItems: [],
          averageSentiment: responses.length > 0 
            ? Math.round(responses.reduce((a, r) => a + (r.sentimentScore || 50), 0) / responses.length)
            : 0
        });
        return;
      }

      setIsLoadingSummary(true);
      try {
        const result = await generateResponseSummary(responses);
        if (!cancelled) {
          setSummary(result);
        }
      } catch (error) {
        console.error('Summary error:', error);
      }
      if (!cancelled) {
        setIsLoadingSummary(false);
      }
    };

    fetchSummary();
    
    return () => { cancelled = true; };
  }, [responses, configStatus.gemini]);

  // Manual refresh handler for the button
  const refreshSummary = async () => {
    if (!configStatus.gemini || responses.length === 0) {
      setSummary({
        summary: responses.length === 0 
          ? 'No responses yet. Create a survey to start collecting feedback.'
          : 'Add Gemini API key to enable AI-powered summaries.',
        themes: [],
        actionItems: [],
        averageSentiment: responses.length > 0 
          ? Math.round(responses.reduce((a, r) => a + (r.sentimentScore || 50), 0) / responses.length)
          : 0
      });
      return;
    }

    setIsLoadingSummary(true);
    try {
      const result = await generateResponseSummary(responses);
      setSummary(result);
    } catch (error) {
      console.error('Summary error:', error);
    }
    setIsLoadingSummary(false);
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

  // Mock trend data for chart
  const trendData = [
    { day: 'Mon', sentiment: 65 },
    { day: 'Tue', sentiment: 58 },
    { day: 'Wed', sentiment: 72 },
    { day: 'Thu', sentiment: 68 },
    { day: 'Fri', sentiment: avgSentiment || 70 },
  ];

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
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Needs Attention</h3>
              <AlertTriangle className="text-amber-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{atRiskStudents}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Students at risk</p>
          </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Sentiment Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
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
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sentiment" 
                    stroke="#0EA5E9" 
                    strokeWidth={2}
                    fill="url(#sentimentGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Summary</h3>
              <button 
                onClick={refreshSummary}
                disabled={isLoadingSummary}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={`text-slate-500 dark:text-slate-400 ${isLoadingSummary ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {isLoadingSummary ? (
              <div className="flex items-center justify-center h-48">
                <LoadingSpinner />
              </div>
            ) : summary ? (
              <div className="space-y-4">
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

        {/* Needs Attention List */}
        {atRiskStudents > 0 && (
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Students Needing Attention</h3>
            <div className="space-y-3">
              {students.filter(s => s.riskLevel === 'high').map(student => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        {student.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{student.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {student.milestone} • GPA: {student.gpa !== null ? student.gpa?.toFixed(1) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
                    High Risk
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      <h3 className="font-semibold text-red-900 dark:text-red-300">High Risk</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{riskMetrics.highRiskCount}</p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {riskMetrics.totalStudents > 0 ? Math.round((riskMetrics.highRiskCount / riskMetrics.totalStudents) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <h3 className="font-semibold text-amber-900 dark:text-amber-300">Medium Risk</h3>
                    </div>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{riskMetrics.mediumRiskCount}</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {riskMetrics.totalStudents > 0 ? Math.round((riskMetrics.mediumRiskCount / riskMetrics.totalStudents) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      <h3 className="font-semibold text-green-900 dark:text-green-300">Low Risk</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{riskMetrics.lowRiskCount}</p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {riskMetrics.totalStudents > 0 ? Math.round((riskMetrics.lowRiskCount / riskMetrics.totalStudents) * 100) : 0}% of total
                    </p>
                  </div>
                  {riskMetrics.unknownRiskCount > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <HelpCircle size={16} className="text-slate-400 dark:text-slate-500" />
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Unknown</h3>
                      </div>
                      <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{riskMetrics.unknownRiskCount}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-400">
                        {riskMetrics.totalStudents > 0 ? Math.round((riskMetrics.unknownRiskCount / riskMetrics.totalStudents) * 100) : 0}% of total
                      </p>
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">High Risk Students</h3>
                  {riskMetrics.highRiskCount === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No high-risk students at this time.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {students.filter(s => s.riskLevel === 'high').map(student => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                              <span className="text-red-600 dark:text-red-400 font-medium text-sm">
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
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
