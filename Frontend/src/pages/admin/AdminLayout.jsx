// src/layouts/AdminLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import './AdminLayout.css';
import { getAdminStats } from '../../lib/adminApi';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const [stats, setStats] = useState({});
  const navigate = useNavigate();

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    
    if (location.pathname === '/admin/dashboard') {
      fetchStats();
    }
  }, [location.pathname]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/admin/dashboard' },
    { id: 'users', label: 'Users', icon: '👥', path: '/admin/users' },
    { id: 'classes', label: 'Classes', icon: '🏫', path: '/admin/classes' },
    { id: 'exams', label: 'Exams', icon: '📝', path: '/admin/exams' },
    { id: 'reports', label: 'Reports', icon: '📈', path: '/admin/reports' },
    { id: 'audit-logs', label: 'Audit Logs', icon: '📋', path: '/admin/audit-logs' },
    { id: 'system', label: 'System', icon: '🖥️', path: '/admin/system' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/admin/settings' },
  ];

  const quickActions = [
    { 
      label: 'Add User', 
      icon: '👤', 
      action: () => navigate('/admin/users?action=create'),
      color: '#667eea'
    },
    { 
      label: 'Create Exam', 
      icon: '📋', 
      action: () => navigate('/admin/exams?action=create'),
      color: '#00C49F'
    },
    { 
      label: 'Send Alert', 
      icon: '🔔', 
      action: () => console.log('Send Alert'),
      color: '#FF9800'
    },
    { 
      label: 'View Logs', 
      icon: '📊', 
      action: () => navigate('/admin/audit-logs'),
      color: '#9C27B0'
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const isActive = (path) => {
    return location.pathname === path || 
           (path !== '/admin/dashboard' && location.pathname.includes(path.split('/')[2]));
  };

  const getCurrentPageTitle = () => {
    const currentNav = navItems.find(item => isActive(item.path));
    return currentNav?.label || 'Dashboard';
  };

  const getCurrentPageSubtitle = () => {
    const titles = {
      'dashboard': 'Welcome back! Here\'s what\'s happening today.',
      'users': 'Manage user accounts, permissions, and access levels.',
      'classes': 'View and manage classes, schedules, and enrollments.',
      'exams': 'Create and manage exams, questions, and results.',
      'reports': 'Generate and view detailed analytics reports.',
      'audit-logs': 'Monitor system activities and user actions.',
      'system': 'Check system health, performance, and settings.',
      'settings': 'Configure platform settings and preferences.',
    };
    const currentKey = navItems.find(item => isActive(item.path))?.id || 'dashboard';
    return titles[currentKey];
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    <div className={`admin-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Sidebar Overlay for Mobile */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

     {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <Link to="/admin/dashboard" className="sidebar-brand">
            <div className="brand-icon">EP</div>
            {sidebarOpen && <h2 className="brand-text">ExamPro Admin</h2>}
          </Link>
          <button 
            className="sidebar-toggle"
            onClick={toggleSidebar}
            title={sidebarOpen ? 'Close menu' : 'Open menu'}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {/* BURGER ICON REPLACEMENT */}
            <span className={`burger-icon ${sidebarOpen ? 'open' : ''}`}>
              <span className="burger-line"></span>
              <span className="burger-line"></span>
              <span className="burger-line"></span>
            </span>
          </button>
        </div>

        <div className="sidebar-content">
          {/* Navigation Menu */}
          <nav className="sidebar-nav">
            <div className="nav-section">
              <h3 className="section-title">MAIN MENU</h3>
              <ul className="nav-list">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <button
                      className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                      onClick={() => handleNavigation(item.path)}
                      aria-label={item.label}
                      aria-current={isActive(item.path) ? 'page' : undefined}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {sidebarOpen && <span className="nav-label">{item.label}</span>}
                      {isActive(item.path) && (
                        <span className="active-indicator" aria-hidden="true"></span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Actions */}
            {sidebarOpen && (
              <div className="nav-section">
                <h3 className="section-title">QUICK ACTIONS</h3>
                <div className="quick-actions-grid">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      className="quick-action-btn"
                      onClick={action.action}
                      style={{ '--action-color': action.color }}
                      aria-label={action.label}
                    >
                      <span className="action-icon">{action.icon}</span>
                      <span className="action-label">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* User Profile */}
          <div className="user-profile">
            <div className="profile-avatar">
              <span className="avatar-text">AD</span>
            </div>
            {sidebarOpen && (
              <div className="profile-info">
                <h4 className="profile-name">Admin User</h4>
                <p className="profile-role">Super Administrator</p>
                <button 
                  className="profile-settings"
                  onClick={() => navigate('/admin/settings')}
                  aria-label="Account Settings"
                >
                  <span className="settings-icon">⚙️</span>
                  Account Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      {/* Mobile Menu Toggle Button in Header */}
      <div className="main-content-wrapper">
        <header className="main-header">
          <div className="header-left">
            <div className="breadcrumb-nav">
              <button 
                className="mobile-menu-toggle"
                onClick={toggleSidebar}
                aria-label="Toggle menu"
              >
                {/* SAME BURGER ICON FOR MOBILE */}
                <span className={`burger-icon ${sidebarOpen ? 'open' : ''}`}>
                  <span className="burger-line"></span>
                  <span className="burger-line"></span>
                  <span className="burger-line"></span>
                </span>
              </button>
          </div>
            <div className="page-titles">
              <h1 className="page-title">{getCurrentPageTitle()}</h1>
              <p className="page-subtitle">{getCurrentPageSubtitle()}</p>
            </div>
          </div>
          
          <div className="header-right">
            <form className="search-bar" onSubmit={handleSearch}>
              <button type="button" className="search-icon" aria-label="Search">
                🔍
              </button>
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search input"
              />
            </form>
            
            <div className="header-actions">
              <button 
                className="header-action notification-btn"
                aria-label="Notifications"
                title="Notifications"
              >
                <span className="action-icon">🔔</span>
                <span className="notification-badge">3</span>
              </button>
              <button 
                className="header-action"
                aria-label="Messages"
                title="Messages"
              >
                <span className="action-icon">💬</span>
              </button>
              <button 
                className="header-action help-btn"
                aria-label="Help"
                title="Help"
              >
                <span className="action-icon">❓</span>
              </button>
            </div>
          </div>
           {/* ADD STATS SUMMARY TO HEADER */}
          {location.pathname === '/admin/dashboard' && stats && (
  <div className="header-stats">
    <div className="stat-item">
      <span className="stat-label">Total Users</span>
      <span className="stat-value">{stats.totalUsers || 0}</span>
    </div>
    <div className="stat-item">
      <span className="stat-label">Active Today</span>
      <span className="stat-value">{stats.activeUsers || 0}</span>
    </div>
    <div className="stat-item">
      <span className="stat-label">New This Week</span>
      <span className="stat-value">{stats.newUsers || 0}</span>
    </div>
  </div>
)}
        </header>

        {/* Content Area */}
        <main className="content-area" id="main-content">
          <div className="content-container">
            <Outlet context={{ stats, setStats }} /> {/* Pass stats as context */}
          </div>
        </main>

        {/* Footer */}
        <footer className="main-footer">
          <div className="footer-content">
            <div className="footer-left">
              <span className="copyright">© 2024 ExamPro Admin Dashboard</span>
              <div className="footer-links">
                <Link to="/admin/settings/privacy" className="footer-link">Privacy Policy</Link>
                <Link to="/admin/settings/terms" className="footer-link">Terms of Service</Link>
                <a href="/support" className="footer-link">Support</a>
              </div>
            </div>
            <div className="footer-right">
              <span className="system-status">
                <span className="status-indicator active" aria-hidden="true"></span>
                System Status: Operational
              </span>
              <span className="version">v2.4.1</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;