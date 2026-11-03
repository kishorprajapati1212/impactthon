import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import api from "../../utils/api.js";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler,
  Title, Tooltip, Legend
);

const AnalyticsCharts = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');
  const { isDark } = useTheme();

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.15)';

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/report/admin/analytics', {
        params: { days },
      });
      setData(res.data?.data || null);
    } catch (err) {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card p-6 animate-pulse">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
            <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: textColor, font: { size: 12 }, padding: 16, usePointStyle: true },
      },
    },
    scales: {
      x: {
        ticks: { color: textColor, font: { size: 11 } },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: textColor, font: { size: 11 } },
        grid: { color: gridColor },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">Full-history analytics (not limited to one week)</p>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="glass-card px-3 py-2 text-sm rounded-xl text-slate-700 dark:text-slate-200 bg-transparent outline-none"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Scans', value: data.summary?.totalScans || 0, icon: Activity, color: 'text-cyan-400' },
          { label: 'Active Sessions', value: data.summary?.activeSessions || 0, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Avg Attendance', value: `${data.summary?.avgAttendance || 0}%`, icon: BarChart3, color: 'text-blue-400' },
          { label: 'Total Students', value: data.summary?.totalStudents || 0, icon: PieChart, color: 'text-purple-400' },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} className={s.color} />
              <span className="text-xs uppercase tracking-wider text-slate-400">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Attendance Trend — Line chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5"
        >
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <TrendingUp size={18} className="text-cyan-400" />
            Attendance Trend ({days === 'all' ? 'All time (chart window)' : `Last ${days} days`})
          </h3>
          <p className="text-xs text-slate-400 mb-4">Daily present vs absent counts · dept rates use full history</p>
          <div className="h-64">
            <Line
              data={{
                labels: data.dailyTrend?.labels || [],
                datasets: [
                  {
                    label: 'Present',
                    data: data.dailyTrend?.present || [],
                    borderColor: '#22d3ee',
                    backgroundColor: 'rgba(34,211,238,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#22d3ee',
                  },
                  {
                    label: 'Absent',
                    data: data.dailyTrend?.absent || [],
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244,63,94,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#f43f5e',
                  },
                ],
              }}
              options={chartDefaults}
            />
          </div>
        </motion.div>

        {/* Department Breakdown — Bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-5"
        >
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-400" />
            Department-wise Attendance %
          </h3>
          <p className="text-xs text-slate-400 mb-4">Average attendance rate by department</p>
          <div className="h-64">
            <Bar
              data={{
                labels: data.departmentBreakdown?.labels || [],
                datasets: [
                  {
                    label: 'Attendance %',
                    data: data.departmentBreakdown?.rates || [],
                    backgroundColor: [
                      'rgba(34,211,238,0.7)',
                      'rgba(59,130,246,0.7)',
                      'rgba(168,85,247,0.7)',
                      'rgba(34,197,94,0.7)',
                      'rgba(251,191,36,0.7)',
                    ],
                    borderRadius: 8,
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                ...chartDefaults,
                scales: {
                  ...chartDefaults.scales,
                  y: { ...chartDefaults.scales.y, max: 100, ticks: { ...chartDefaults.scales.y.ticks, callback: v => v + '%' } },
                },
              }}
            />
          </div>
        </motion.div>

        {/* Subject Distribution — Doughnut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-5"
        >
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <PieChart size={18} className="text-purple-400" />
            Lectures Per Subject
          </h3>
          <p className="text-xs text-slate-400 mb-4">Distribution of lectures across subjects</p>
          <div className="h-64 flex items-center justify-center">
            <div className="w-56 h-56">
              <Doughnut
                data={{
                  labels: data.subjectDistribution?.labels || [],
                  datasets: [
                    {
                      data: data.subjectDistribution?.lectures || [],
                      backgroundColor: [
                        'rgba(34,211,238,0.8)',
                        'rgba(59,130,246,0.8)',
                        'rgba(168,85,247,0.8)',
                        'rgba(34,197,94,0.8)',
                        'rgba(251,191,36,0.8)',
                      ],
                      borderWidth: 2,
                      borderColor: isDark ? '#0f172a' : '#ffffff',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: textColor, font: { size: 11 }, padding: 12, usePointStyle: true },
                    },
                  },
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Faculty-wise lectures + attendance % */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="glass-card p-5 lg:col-span-2"
        >
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <BarChart3 size={18} className="text-emerald-400" />
            Faculty-wise performance
          </h3>
          <p className="text-xs text-slate-400 mb-4">Lectures conducted and average attendance % by faculty</p>
          <div className="h-72">
            <Bar
              data={{
                labels: data.facultyBreakdown?.labels || [],
                datasets: [
                  {
                    label: 'Lectures',
                    data: data.facultyBreakdown?.lectures || [],
                    backgroundColor: 'rgba(34,211,238,0.65)',
                    borderRadius: 6,
                    yAxisID: 'y',
                  },
                  {
                    label: 'Attendance %',
                    data: data.facultyBreakdown?.rates || [],
                    backgroundColor: 'rgba(52,211,153,0.65)',
                    borderRadius: 6,
                    yAxisID: 'y1',
                  },
                ],
              }}
              options={{
                ...chartDefaults,
                scales: {
                  x: chartDefaults.scales.x,
                  y: { ...chartDefaults.scales.y, position: 'left', title: { display: true, text: 'Lectures', color: textColor } },
                  y1: {
                    ...chartDefaults.scales.y,
                    position: 'right',
                    max: 100,
                    grid: { drawOnChartArea: false },
                    ticks: { ...chartDefaults.scales.y.ticks, callback: (v) => v + '%' },
                    title: { display: true, text: 'Att %', color: textColor },
                  },
                },
              }}
            />
          </div>
        </motion.div>

        {/* Recent Activity — compact list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-5"
        >
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Activity size={18} className="text-emerald-400" />
            Quick Stats
          </h3>
          <p className="text-xs text-slate-400 mb-4">System overview at a glance</p>
          <div className="space-y-3">
            {[
              { label: 'Total Lectures', value: data.summary?.totalLectures || 0 },
              { label: 'Attendance records', value: data.summary?.totalScans || 0 },
              { label: 'Attendance Compliance', value: `${data.summary?.avgAttendance || 0}%` },
              { label: 'Active sessions', value: data.summary?.activeSessions || 0 },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/40">
                <span className="text-sm text-slate-500 dark:text-slate-400">{item.label}</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
