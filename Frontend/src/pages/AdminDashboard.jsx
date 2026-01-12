// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer 
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import "./AdminDashboard.css";
import { getAdminStats } from "../lib/adminApi";
import StatCard from "./admin/StatCard";


const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getAdminStats(timeRange);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = (route) => {
    navigate(route);
  };

  const handleQuickAction = (action) => {
    switch(action) {
      case 'add-user':
        navigate('/admin/users');
        break;
      case 'generate-report':
        navigate('/admin/reports');
        break;
      case 'send-announcement':
        // Implement send announcement logic
        break;
      case 'system-settings':
        navigate('/admin/settings');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  const userData = stats?.users?.growth || [];
  const examData = stats?.exams?.distribution || [];
  const classData = stats?.classes?.status || [];
  const recentActivities = stats?.recentActivities || [];

  const COLORS = ['#667eea', '#00C49F', '#FF9800', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="admin-dashboard">
      {/* Main Content */}
      <main className="admin-main-content">
        {/* Top Header */}
        <div className="main-header">
          <div className="header-left">
            <h1>Dashboard Overview</h1>
            <p className="subtitle">Welcome back! Here's your platform performance summary.</p>
          </div>
          <div className="header-right">
            <div className="time-range-selector">
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                className="select-minimal"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
            <button className="btn-primary" onClick={fetchStats}>
              <span className="refresh-icon">↻</span>
              Refresh Data
            </button>
          </div>
        </div>

        {/* Stats Cards - Make them clickable */}
        
        <div className="stats-grid">
        <Link to="/admin/users" className="stat-card-link">
  <StatCard
    title="Total Users"
    value={stats?.totalUsers || 0}
    change={stats?.userGrowthPercentage || 0}
    icon="👥"
    color="#2196F3"
    isLoading={loading}
  />
</Link>
          
          <Link to="/admin/classes" className="stat-card-link">
            <StatCard
              title="Active Classes"
              value={stats?.classes?.active || 0}
              change={stats?.classes?.growthPercentage || 0}
              icon="🏫"
              color="#4CAF50"
              isLoading={loading}
            />
          </Link>
          
          <Link to="/admin/exams" className="stat-card-link">
            <StatCard
              title="Ongoing Exams"
              value={stats?.exams?.active || 0}
              change={stats?.exams?.growthPercentage || 0}
              icon="📝"
              color="#FF9800"
              isLoading={loading}
            />
          </Link>
          
          <Link to="/admin/system" className="stat-card-link">
            <StatCard
              title="System Status"
              value={stats?.system?.status || 'Good'}
              change={stats?.system?.uptime || 99.9}
              icon="🛡️"
              color="#9C27B0"
              isStatus={true}
              isLoading={loading}
            />
          </Link>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <div className="section-header">
            <h2>Analytics & Insights</h2>
            <button 
              className="text-link" 
              onClick={() => handleViewAll('/admin/reports')}
            >
              View detailed reports →
            </button>
          </div>
          
          <div className="charts-grid">
            {/* User Growth Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>User Growth Trend</h3>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-dot students"></span>
                    <span>Students</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot teachers"></span>
                    <span>Teachers</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={userData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#999"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#999"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      fontSize: '12px',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value, name) => [
                      `${value} ${name}`,
                      name === 'students' ? 'Students' : 'Teachers'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="students" 
                    name="students"
                    stroke="#667eea" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="teachers" 
                    name="teachers"
                    stroke="#00C49F" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="chart-footer">
                <button 
                  className="view-chart-btn"
                  onClick={() => handleViewAll('/admin/users')}
                >
                  View User Analytics
                </button>
              </div>
            </div>

            {/* Exam Distribution Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Exam Distribution</h3>
                <span className="chart-subtitle">By subject area</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={examData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    stroke="#fff"
                    strokeWidth={1}
                  >
                    {examData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value} exams`,
                      props.payload.name
                    ]}
                    contentStyle={{
                      fontSize: '12px',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-footer">
                <button 
                  className="view-chart-btn"
                  onClick={() => handleViewAll('/admin/exams')}
                >
                  View Exam Analytics
                </button>
              </div>
            </div>

            {/* Class Status Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Class Status</h3>
                <span className="chart-subtitle">Active vs Inactive</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={classData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis 
                    dataKey="status" 
                    stroke="#999"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#999"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value} classes`, 'Count']}
                    contentStyle={{
                      fontSize: '12px',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#667eea"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="chart-footer">
                <button 
                  className="view-chart-btn"
                  onClick={() => handleViewAll('/admin/classes')}
                >
                  View Class Analytics
                </button>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Recent Activities</h3>
                <button 
                  className="text-link" 
                  onClick={() => handleViewAll('/admin/audit-logs')}
                >
                  View all →
                </button>
              </div>
              <div className="activity-list">
                {recentActivities.slice(0, 6).map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">
                      {activity.type === 'login' ? '🔐' : 
                       activity.type === 'create' ? '➕' : 
                       activity.type === 'update' ? '🔄' : 
                       activity.type === 'delete' ? '🗑️' : '📝'}
                    </div>
                    <div className="activity-content">
                      <div className="activity-text">{activity.description}</div>
                      <div className="activity-meta">
                        <span className="activity-user">{activity.user}</span>
                        <span className="activity-time">• {activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & System Status */}
        <div className="actions-section">
          <div className="actions-grid">
            <div className="quick-actions-card">
              <div className="section-header">
                <h2>Quick Actions</h2>
              </div>
              <div className="quick-actions-grid">
                <button 
                  className="quick-action-btn"
                  onClick={() => handleQuickAction('add-user')}
                >
                  <span className="action-icon">+</span>
                  <div className="action-content">
                    <span className="action-title">Add User</span>
                    <span className="action-desc">Create new user account</span>
                  </div>
                </button>
                <button 
                  className="quick-action-btn"
                  onClick={() => handleQuickAction('generate-report')}
                >
                  <span className="action-icon">📊</span>
                  <div className="action-content">
                    <span className="action-title">Generate Report</span>
                    <span className="action-desc">Export analytics data</span>
                  </div>
                </button>
                <button 
                  className="quick-action-btn"
                  onClick={() => handleQuickAction('send-announcement')}
                >
                  <span className="action-icon">📧</span>
                  <div className="action-content">
                    <span className="action-title">Send Announcement</span>
                    <span className="action-desc">Broadcast message</span>
                  </div>
                </button>
                <button 
                  className="quick-action-btn"
                  onClick={() => handleQuickAction('system-settings')}
                >
                  <span className="action-icon">⚙️</span>
                  <div className="action-content">
                    <span className="action-title">System Settings</span>
                    <span className="action-desc">Configure platform</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="system-status-card">
              <div className="section-header">
                <h2>System Status</h2>
                <span className={`status-badge ${stats?.system?.status === 'Good' ? 'good' : 'warning'}`}>
                  {stats?.system?.status === 'Good' ? 'All Systems Operational' : 'System Issues Detected'}
                </span>
              </div>
              <div className="system-status-list">
                <div className="status-item">
                  <div className="status-info">
                    <span className="status-name">Web Server</span>
                    <span className="status-value">{stats?.system?.webServer || '120ms response'}</span>
                  </div>
                  <span className="status-indicator good"></span>
                </div>
                <div className="status-item">
                  <div className="status-info">
                    <span className="status-name">Database</span>
                    <span className="status-value">{stats?.system?.database || '45 queries/sec'}</span>
                  </div>
                  <span className="status-indicator good"></span>
                </div>
                <div className="status-item">
                  <div className="status-info">
                    <span className="status-name">Storage</span>
                    <span className="status-value">{stats?.system?.storage || '85% used'}</span>
                  </div>
                  <span className="status-indicator warning"></span>
                </div>
                <div className="status-item">
                  <div className="status-info">
                    <span className="status-name">API Service</span>
                    <span className="status-value">{stats?.system?.uptime || '99.9% uptime'}</span>
                  </div>
                  <span className="status-indicator good"></span>
                </div>
              </div>
              <div className="status-footer">
                <button 
                  className="view-system-btn"
                  onClick={() => handleViewAll('/admin/system')}
                >
                  View System Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;