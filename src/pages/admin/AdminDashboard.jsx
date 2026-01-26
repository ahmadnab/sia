import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, MessageSquare, AlertTriangle, RefreshCw, Activity, Clock, PieChart as PieChartIcon, HelpCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import AdminLayout from '../../components/AdminLayout';
import { subscribeToResponses, subscribeToStudents, subscribeToSurveys, subscribeToSurveyStatus, getVoteCountsBySurvey } from '../../services/firebase';
import { generateResponseSummary } from '../../services/gemini';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminDashboard = () => {
  const { configStatus } = useApp();
  const [responses, setResponses] = useState([]);
  const [students, setStudents] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [surveyStatuses, setSurveyStatuses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

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
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Real-time insights from your students</p>
        </div>

        {/* Primary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Sentiment Score */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Avg. Sentiment</h3>
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
                      <Cell fill="#E2E8F0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{avgSentiment}</p>
                <p className="text-sm text-slate-500">out of 100</p>
              </div>
            </div>
          </div>

          {/* Response Count */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Responses</h3>
              <MessageSquare className="text-sky-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-slate-900">{responseCount}</p>
            <p className="text-sm text-slate-500 mt-1">Anonymous submissions</p>
          </div>

          {/* At-Risk Students */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Needs Attention</h3>
              <AlertTriangle className="text-amber-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-slate-900">{atRiskStudents}</p>
            <p className="text-sm text-slate-500 mt-1">Students at risk</p>
          </div>
        </div>

        {/* Secondary Metric Cards - Engagement & Risk */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Response Rate */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Avg. Response Rate</h3>
              <Activity className="text-teal-500" size={20} />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{engagementMetrics.avgResponseRate}%</p>
              {engagementMetrics.activeSurveyCount > 0 && (
                <span className="text-sm text-slate-500">
                  across {engagementMetrics.activeSurveyCount} active survey{engagementMetrics.activeSurveyCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {engagementMetrics.activeSurveyCount === 0 
                ? 'No active surveys' 
                : 'Votes / Eligible students'}
            </p>
          </div>

          {/* Recent Engagement */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Recent Activity</h3>
              <Clock className="text-purple-500" size={20} />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{recentEngagement.last7Days}</p>
              <div className={`flex items-center gap-1 text-sm ${recentEngagement.delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {recentEngagement.delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{recentEngagement.delta >= 0 ? '+' : ''}{recentEngagement.delta}%</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Responses in last 7 days (vs prior week)
            </p>
          </div>

          {/* Risk Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Risk Distribution</h3>
              <PieChartIcon className="text-rose-500" size={20} />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16">
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
                  <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center">
                    <Users className="text-slate-400" size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-red-600">{riskMetrics.highRiskPercent}%</p>
                  <span className="text-sm text-slate-500">high risk</span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    {riskMetrics.highRiskCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    {riskMetrics.mediumRiskCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {riskMetrics.lowRiskCount}
                  </span>
                  {riskMetrics.unknownRiskCount > 0 && (
                    <span className="flex items-center gap-1" title="No GPA data">
                      <HelpCircle size={12} className="text-slate-400" />
                      {riskMetrics.unknownRiskCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Sentiment Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#F1F5F9'
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
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">AI Summary</h3>
              <button 
                onClick={refreshSummary}
                disabled={isLoadingSummary}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={`text-slate-500 ${isLoadingSummary ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {isLoadingSummary ? (
              <div className="flex items-center justify-center h-48">
                <LoadingSpinner />
              </div>
            ) : summary ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">{summary.summary}</p>
                
                {summary.themes?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Key Themes</p>
                    <div className="flex flex-wrap gap-2">
                      {summary.themes.map((theme, i) => (
                        <span key={i} className="px-2 py-1 bg-sky-50 text-sky-600 text-xs rounded-full">
                          #{theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {summary.actionItems?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Suggested Actions</p>
                    <ul className="space-y-1">
                      {summary.actionItems.map((item, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-sky-500 mt-1">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No data to summarize yet.</p>
            )}
          </div>
        </div>

        {/* Needs Attention List */}
        {atRiskStudents > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Students Needing Attention</h3>
            <div className="space-y-3">
              {students.filter(s => s.riskLevel === 'high').map(student => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-medium">
                        {student.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{student.name}</p>
                      <p className="text-sm text-slate-500">
                        {student.milestone} • GPA: {student.gpa !== null ? student.gpa?.toFixed(1) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                    High Risk
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
