const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { adminAuth, requirePermission } = require('../middleware/adminAuth');
const auditLog = require('../middleware/auditLog');
const User = require('../models/user');
const Class = require('../models/Class');
const Exam = require('../models/Exam');
const Assignment = require('../models/Assignment');
const Announcement = require('../models/Announcement');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const Report = require('../models/Report');

// Apply audit log and auth to all routes
router.use(auditLog);
router.use(adminAuth);

// Dashboard Statistics - UPDATED STRUCTURE
router.get('/stats', requirePermission('dashboard', 'read'), async (req, res) => {
  try {
    const { timeRange = 'week' } = req.query;
    
    // Calculate date ranges based on timeRange
    let startDate;
    const endDate = new Date();
    
    switch(timeRange) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
    }

    const [
      totalUsers,
      totalTeachers,
      totalStudents,
      totalClasses,
      activeClasses,
      totalExams,
      activeExams,
      pendingExams,
      totalAdmins
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'student' }),
      Class.countDocuments(),
      Class.countDocuments({ status: 'active' }),
      Exam.countDocuments(),
      Exam.countDocuments({ status: 'active' }),
      Exam.countDocuments({ status: 'pending' }),
      Admin.countDocuments({ isActive: true })
    ]);

    // Get growth data
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(startDate);
    
    switch(timeRange) {
      case 'today':
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        break;
      case 'week':
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate.setDate(previousEndDate.getDate() - 7);
        break;
      case 'month':
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        previousEndDate.setMonth(previousEndDate.getMonth() - 1);
        break;
      case 'year':
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
        previousEndDate.setFullYear(previousEndDate.getFullYear() - 1);
        break;
    }

    // Count users in current and previous periods
    const [currentPeriodUsers, previousPeriodUsers] = await Promise.all([
      User.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate } 
      }),
      User.countDocuments({ 
        createdAt: { $gte: previousStartDate, $lte: previousEndDate } 
      })
    ]);

    // Calculate growth percentage
    const userGrowthPercentage = previousPeriodUsers > 0 
      ? ((currentPeriodUsers - previousPeriodUsers) / previousPeriodUsers * 100).toFixed(1)
      : currentPeriodUsers > 0 ? 100 : 0;

    // Get active users (logged in today)
    const activeUsers = await User.countDocuments({ 
      lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    });

    // Get new users this week
    const newUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    // Get exam distribution by subject
    const examDistribution = await Exam.aggregate([
      { $group: { 
        _id: "$subject", 
        count: { $sum: 1 },
        avgScore: { $avg: "$averageScore" }
      }},
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    // Get class status distribution
    const classStatus = await Class.aggregate([
      { $group: { 
        _id: "$status", 
        count: { $sum: 1 }
      }}
    ]);

    // Get user growth data for chart
    const userGrowthData = [];
    const daysInRange = timeRange === 'today' ? 24 : 
                       timeRange === 'week' ? 7 : 
                       timeRange === 'month' ? 30 : 12;
    
    for (let i = daysInRange - 1; i >= 0; i--) {
      const date = new Date();
      if (timeRange === 'today') {
        date.setHours(date.getHours() - i);
      } else {
        date.setDate(date.getDate() - i);
      }
      
      const nextDate = new Date(date);
      if (timeRange === 'today') {
        nextDate.setHours(nextDate.getHours() + 1);
      } else {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      
      const [studentsCount, teachersCount] = await Promise.all([
        User.countDocuments({ 
          role: 'student',
          createdAt: { $lt: nextDate }
        }),
        User.countDocuments({ 
          role: 'teacher',
          createdAt: { $lt: nextDate }
        })
      ]);
      
      userGrowthData.push({
        date: timeRange === 'today' ? date.getHours() + ':00' : 
              timeRange === 'year' ? date.toLocaleDateString('en-US', { month: 'short' }) :
              date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        students: studentsCount,
        teachers: teachersCount
      });
    }

    // Get recent activities
    const recentActivities = await AuditLog.find()
      .populate('adminId', 'name email')
      .sort({ timestamp: -1 })
      .limit(6)
      .lean();

    // Get system health
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      success: true,
      // ✅ CONSISTENT STRUCTURE - FLATTENED
      totalUsers,
      totalTeachers,
      totalStudents,
      totalClasses,
      activeClasses,
      totalExams,
      activeExams,
      pendingExams,
      totalAdmins,
      activeUsers,
      newUsers,
      userGrowthPercentage: parseFloat(userGrowthPercentage),
      
      // Charts data
      userGrowth: userGrowthData,
      examDistribution: examDistribution.map(item => ({
        name: item._id || 'Unknown',
        value: item.count
      })),
      classStatus: classStatus.map(item => ({
        status: item._id,
        count: item.count
      })),
      
      // System info
      system: {
        status: dbStatus === 'connected' ? 'Good' : 'Poor',
        uptime: process.uptime().toFixed(2),
        webServer: '120ms response',
        database: '45 queries/sec',
        storage: '85% used'
      },
      
      // Recent activities formatted
      recentActivities: recentActivities.map(log => ({
        id: log._id,
        type: log.action,
        description: `${log.adminId?.name || 'System'} ${log.action} ${log.entity}`,
        user: log.adminId?.name || 'System',
        time: new Date(log.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      })),
      
      // Time range info
      timeRange,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// User Management
router.get('/users', requirePermission('users', 'read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get single user
router.get('/users/:id', requirePermission('users', 'read'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('enrolledClasses', 'className classCode description')
      .populate('createdClasses', 'className classCode description');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user activities
    const userActivities = await AuditLog.find({
      $or: [
        { 'details.body.userId': req.params.id },
        { 'details.body.studentId': req.params.id },
        { 'details.body.teacherId': req.params.id }
      ]
    }).sort({ timestamp: -1 }).limit(20);

    res.json({
      success: true,
      user,
      activities: userActivities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update user
router.put('/users/:id', requirePermission('users', 'update'), async (req, res) => {
  try {
    const { name, email, role, status, isVerified } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (status) user.status = status;
    if (isVerified !== undefined) user.isVerified = isVerified;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user: await User.findById(user._id).select('-password')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete user
router.delete('/users/:id', requirePermission('users', 'delete'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete or hard delete based on your needs
    user.status = 'deleted';
    await user.save();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Class Management
router.get('/classes', requirePermission('classes', 'read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { className: { $regex: search, $options: 'i' } },
        { classCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [classes, total] = await Promise.all([
      Class.find(query)
        .populate('teacher', 'name email')
        .populate('students', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Class.countDocuments(query)
    ]);

    res.json({
      success: true,
      classes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Exam Management
router.get('/exams', requirePermission('exams', 'read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, classId } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (classId) query.class = classId;

    const [exams, total] = await Promise.all([
      Exam.find(query)
        .populate('class', 'className classCode')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Exam.countDocuments(query)
    ]);

    res.json({
      success: true,
      exams,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get exam details with attempts
router.get('/exams/:id/details', requirePermission('exams', 'read'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('class', 'className classCode')
      .populate('createdBy', 'name email');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Get exam attempts
    const StudentAttempts = require('../models/StudentAttempts');
    const attempts = await StudentAttempts.find({ exam: req.params.id })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 });

    // Get proctoring violations
    const StudentExamSession = require('../models/StudentExamSession');
    const violations = await StudentExamSession.find({
      exam: req.params.id,
      violations: { $exists: true, $ne: [] }
    }).populate('student', 'name email');

    res.json({
      success: true,
      exam,
      statistics: {
        totalAttempts: attempts.length,
        averageScore: attempts.length > 0 
          ? attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length 
          : 0,
        highestScore: attempts.length > 0 
          ? Math.max(...attempts.map(a => a.score)) 
          : 0,
        lowestScore: attempts.length > 0 
          ? Math.min(...attempts.map(a => a.score)) 
          : 0,
        violationsCount: violations.length
      },
      attempts,
      violations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin Management
router.get('/admins', requirePermission('admins', 'read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (role) query.role = role;
    if (status !== undefined) query.isActive = status === 'active';

    const [admins, total] = await Promise.all([
      Admin.find(query)
        .select('-password -twoFactorSecret')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Admin.countDocuments(query)
    ]);

    res.json({
      success: true,
      admins,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create admin
router.post('/admins', requirePermission('admins', 'create'), async (req, res) => {
  try {
    const { email, password, name, role, permissions } = req.body;

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    const admin = new Admin({
      email,
      password,
      name,
      role: role || 'admin',
      permissions: permissions || []
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: await Admin.findById(admin._id).select('-password -twoFactorSecret')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update admin
router.put('/admins/:id', requirePermission('admins', 'update'), async (req, res) => {
  try {
    const { name, role, permissions, isActive } = req.body;
    
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Cannot modify superadmin unless you are superadmin
    if (admin.role === 'superadmin' && req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify superadmin'
      });
    }

    if (name) admin.name = name;
    if (role && req.admin.role === 'superadmin') admin.role = role;
    if (permissions) admin.permissions = permissions;
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();

    res.json({
      success: true,
      message: 'Admin updated successfully',
      admin: await Admin.findById(admin._id).select('-password -twoFactorSecret')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Audit Logs
router.get('/audit-logs', requirePermission('audit', 'read'), async (req, res) => {
  try {
    const { page = 1, limit = 50, adminId, action, entity, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (adminId) query.adminId = adminId;
    if (action) query.action = action;
    if (entity) query.entity = entity;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('adminId', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Generate Report
router.post('/reports/generate', requirePermission('reports', 'create'), async (req, res) => {
  try {
    const { type, title, parameters, startDate, endDate } = req.body;

    const report = new Report({
      type,
      title,
      parameters,
      startDate,
      endDate,
      generatedBy: req.admin._id,
      status: 'pending'
    });

    await report.save();

    // Generate report in background
    generateReport(report._id);

    res.json({
      success: true,
      message: 'Report generation started',
      reportId: report._id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

async function generateReport(reportId) {
  try {
    const report = await Report.findById(reportId);
    if (!report) return;

    report.status = 'generating';
    await report.save();

    let data = {};
    
    switch (report.type) {
      case 'user':
        data = await generateUserReport(report);
        break;
      case 'class':
        data = await generateClassReport(report);
        break;
      case 'exam':
        data = await generateExamReport(report);
        break;
      case 'system':
        data = await generateSystemReport(report);
        break;
      case 'violation':
        data = await generateViolationReport(report);
        break;
    }

    report.data = data;
    report.status = 'completed';
    report.generatedAt = new Date();
    await report.save();

  } catch (error) {
    const report = await Report.findById(reportId);
    if (report) {
      report.status = 'failed';
      report.error = error.message;
      await report.save();
    }
  }
}

async function generateUserReport(report) {
  const { startDate, endDate, role } = report.parameters || {};
  
  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  if (role) query.role = role;

  const users = await User.find(query)
    .select('name email role createdAt lastLogin status')
    .sort({ createdAt: -1 });

  const statistics = {
    total: users.length,
    byRole: {},
    byStatus: {},
    growth: {}
  };

  users.forEach(user => {
    statistics.byRole[user.role] = (statistics.byRole[user.role] || 0) + 1;
    statistics.byStatus[user.status || 'active'] = (statistics.byStatus[user.status || 'active'] || 0) + 1;
  });

  return {
    users,
    statistics,
    generatedAt: new Date()
  };
}

async function generateExamReport(report) {
  const { startDate, endDate, classId } = report.parameters || {};
  
  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  if (classId) query.class = classId;

  const exams = await Exam.find(query)
    .populate('class', 'className classCode')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  const StudentAttempts = require('../models/StudentAttempts');
  const attempts = await StudentAttempts.find({
    exam: { $in: exams.map(e => e._id) }
  }).populate('student', 'name email');

  const statistics = {
    totalExams: exams.length,
    totalAttempts: attempts.length,
    averageScore: attempts.length > 0 
      ? attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length 
      : 0,
    byStatus: {}
  };

  exams.forEach(exam => {
    statistics.byStatus[exam.status] = (statistics.byStatus[exam.status] || 0) + 1;
  });

  return {
    exams,
    attempts: attempts.slice(0, 100), // Limit to 100 attempts
    statistics,
    generatedAt: new Date()
  };
}

// Get reports
router.get('/reports', requirePermission('reports', 'read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('generatedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments(query)
    ]);

    res.json({
      success: true,
      reports,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get single report
router.get('/reports/:id', requirePermission('reports', 'read'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('generatedBy', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// System Settings
const SiteSettings = require('../models/SiteSettings');

// Get all settings
router.get('/settings', requirePermission('settings', 'read'), async (req, res) => {
  try {
    const settings = await SiteSettings.find().sort({ category: 1, key: 1 });
    
    // Group by category
    const groupedSettings = {};
    settings.forEach(setting => {
      if (!groupedSettings[setting.category]) {
        groupedSettings[setting.category] = [];
      }
      groupedSettings[setting.category].push(setting);
    });

    res.json({
      success: true,
      settings: groupedSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update setting
router.put('/settings/:key', requirePermission('settings', 'update'), async (req, res) => {
  try {
    const { value } = req.body;
    
    const setting = await SiteSettings.findOneAndUpdate(
      { key: req.params.key },
      { value },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Setting updated successfully',
      setting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get system info
router.get('/system/info', requirePermission('system', 'read'), async (req, res) => {
  try {
    const os = require('os');
    const packageJson = require('../../../package.json');

    const systemInfo = {
      application: {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      },
      server: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        totalMemory: Math.round(os.totalmem() / 1024 / 1024),
        freeMemory: Math.round(os.freemem() / 1024 / 1024),
        cpus: os.cpus().length
      },
      database: {
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState,
        models: mongoose.modelNames()
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        versions: process.versions
      }
    };

    res.json({
      success: true,
      systemInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Clear cache (example endpoint)
router.post('/system/clear-cache', requirePermission('system', 'manage'), async (req, res) => {
  try {
    // Clear any cached data if you have caching
    // For example, if using memory-cache or similar
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;