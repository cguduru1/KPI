//server/routes/kpiRoutes.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); 
const { protect, authorize } = require('../middleware/authMiddleware');
const KPI = require('../models/KPI');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const PerformanceReview = require('../models/PerformanceReview');
const { generateKPIReport } = require('../services/pdfService');
const { analyzeKPIs } = require('../services/analyticsService');
const Employee = require('../models/Employee');
const { Parser } = require('json2csv'); // for CSV export
const ExcelJS = require('exceljs');     // for Excel export
const regression = require('regression');
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

router.get('/', protect, async (req, res) => {
  try {
    const { year, archived, filter, search, department } = req.query;
    const filters = {};

    // 1. Process query string filters
    if (year) filters.year = parseInt(year, 10);
    if (archived !== undefined) filters.archived = archived === 'true';
    if (filter && filter !== 'All') filters.status = filter;
    
    if (department && req.user.role !== 'Employee') {
      filters.department = department;
    }

    if (search && search.trim() !== '') {
      filters.$or = [
        { title: { $regex: search.trim(),$options: 'i' } },
        { description: { $regex: search.trim(),$options: 'i' } }
      ];
    }
    const users = await User.find().select('-password');
    const rawUserId = req.user?.id || req.user?._id;
    const rawEmployeeRef = req.user?.employeeRef;

    // Build array of valid user IDs (both string and ObjectId format)
    const userIds = [];

    [rawUserId, rawEmployeeRef].forEach((id) => {
      if (!id) return;
      const strId = typeof id === 'object' ? id.toString() : String(id);
      if (mongoose.Types.ObjectId.isValid(strId)) {
        userIds.push(new mongoose.Types.ObjectId(strId));
        userIds.push(strId);
      }
    });

    // 3. Multi-tier role authorization query
    let roleQuery = {};

    if (req.user.role === 'Employee') {
      roleQuery = { employeeId: { $in: userIds } };
    } 
    else if (req.user.role === 'Supervisor') {
      roleQuery = {
        status: 'Submitted',
        $or: [
          { employeeId: { $in: userIds } },
          { supervisorId: { $in: userIds } }
        ]
      };
    } 
    else if (req.user?.role === 'DeptHead') {
      // const userDept = (req.user.department || currentUser?.department || '').trim();

      let rawDept = '';
      if (typeof req.user.department === 'string') {
        rawDept = req.user.department;
      } else if (req.user.department && typeof req.user.department === 'object') {
        rawDept = req.user.department.name || req.user.department.department || '';
      } else if (req.user.employeeRef?.department) {
        rawDept = String(req.user.employeeRef.department);
      }

      const cleanDept = String(rawDept).trim();

      const departmentFilter = cleanDept && cleanDept !== 'undefined'
    ? { department: new RegExp(`^${cleanDept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    : {};

      // Create case-insensitive regex for department (e.g., /sales/i)
      // const deptRegex = userDept ? new RegExp(`^${userDept.trim()}$`, 'i') : null;
      // const safeDept = cleanDept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // roleQuery = {
      //   $or: [
      //     { employeeId: { $in: userIds } },
      //     { deptHeadId: { $in: userIds } },
      //     // ...(userDept ? [{
      //     //   department: new RegExp(`^${userDept}$`, 'i'),
      //     //   status: { $in: ['SupervisorApproved', 'DeptHeadApproved', 'Rejected'] }
      //     // }] : [
      //     //   // Fallback: match SupervisorApproved records even if department field is omitted on KPI root
      //     //   { status: { $in: ['SupervisorApproved', 'DeptHeadApproved', 'Rejected'] } }
      //     // ]),
      //     cleanDept
      //       ? {
      //           department: new RegExp(`^${cleanDept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      //           status: { $in: ['SupervisorApproved', 'DeptHeadApproved', 'Rejected'] }
      //         }
      //       : {
      //           status: { $in: ['SupervisorApproved', 'DeptHeadApproved', 'Rejected'] }
      //         }
      //   ]
      // };
      const orConditions = [
        { employeeId: { $in: userIds } },
        { deptHeadId: { $in: userIds } }
      ];

      roleQuery = {
        $or: [
          { employeeId: { $in: userIds } },
          { deptHeadId: { $in: userIds } },
          {
            ...departmentFilter,
            status: { $in: ['Submitted', 'SupervisorApproved', 'DeptHeadApproved', 'Rejected'] }
          }
        ]
      };
    }
    else if (req.user.role === 'HR' || req.user.role === 'Admin') {
      if (department) filters.department = department;
    }

    // 4. Combine role scope and optional active search/status filters
    const queryConditions = [roleQuery];
    if (Object.keys(filters).length > 0) {
      queryConditions.push(filters);
    }

    const finalQuery = queryConditions.length > 1 ? { $and: queryConditions } : roleQuery;

    console.log('--- KPI API DEBUG ---');
    console.log('Searching using userIds:', userIds);
    console.log('Final Mongo Query:', JSON.stringify(finalQuery, null, 2));

    // 5. Query execution with Dual Population Fallback (User or Employee)
    const kpis = await KPI.find(finalQuery)
      .populate({
        path: 'employeeId',
        // select: 'name email department role'
        select: 'name department role supervisorId deptHeadId',
      })
      .populate({
        path: 'supervisorId',
        // select: 'name email department role'
        select: 'name'
      })
      .populate({
        path: 'deptHeadId',
        select: 'name email department role'
      })
      .lean();

      console.log('User Employee Ref:', req.user?.employeeRef);
      console.log('First KPI Employee Data:', kpis[0]?.employeeId);

      console.log(`Found ${kpis.length} KPI records`);
      console.log('---------------------');
      console.log({
        kpiTitle: req.kpis?.title,
        kpiDept: req.kpis?.department,
        userDept: req.user?.department,
        status: req.kpis?.status
      });

      if (req.user.role === 'DeptHead') {
        const userDept = (req.user.department || '').toLowerCase();

        const filteredForDeptHead = kpis.filter((kpi) => {
          // 1. Keep if it's depthead1's own KPI
          const isOwn = userIds.some(id => String(id) === String(kpi.employeeId?._id || kpi.employeeId));
          if (isOwn) return true;

          // 2. Fall back to populated employee department if root kpi.department is missing
          const kpiDept = String(kpi.department || kpi.employeeId?.department || '').toLowerCase();
          const isApprovedBySupervisor = kpi.status === 'SupervisorApproved';

          return kpiDept === userDept && isApprovedBySupervisor;
        });
      }

    return res.status(200).json(kpis);

  } catch (error) {
    console.error('KPI Root Retrieval Error:', error);
    return res.status(500).json({ error: 'Server error processing KPI checklist metrics' });
  }
});

// Employee submits KPI
// POST /api/kpi/submit
router.post('/submit', protect, authorize(['Employee', 'Supervisor', 'DeptHead', 'HR']), async (req, res) => {
  try {
    const { title, description, target, timeline, department: reqDepartment, year } = req.body;

    if (!title || !description || !target || !timeline || !reqDepartment || !year) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // 1. Fetch user to ensure employeeRef is present
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ error: 'User account not found' });
    }

    // 2. Fetch Employee record using user.employeeRef (not user._id)
    let supervisorUserId = null;
    let deptHeadUserId = null;
    let employee = null;

    if (currentUser.employeeRef) {
      const employee = await Employee.findById(currentUser.employeeRef);

      if (employee) {
        // 3. Find corresponding User account for Supervisor
        if (employee.supervisorId) {
          const supervisorUser = await User.findOne({ 
            $or: [
              { employeeRef: employee.supervisorId },
              { _id: employee.supervisorId }
            ]
          });

          if (supervisorUser) {
            supervisorUserId = supervisorUser._id;
          }
        }

        // 4. Find corresponding User account for Dept Head
        if (employee.deptHeadId) {
          const deptHeadUser = await User.findOne({ 
            $or: [
              { employeeRef: employee.deptHeadId },
              { _id: employee.deptHeadId }
            ]
          });

          if (deptHeadUser) {
            deptHeadUserId = deptHeadUser._id;
          }
        }
      }
    }

    const resolvedDepartment = reqDepartment || employee?.department || req.user.department;

    // 3. Create KPI document using User ID for consistent population
    const kpi = new KPI({
      employeeId: currentUser._id,      // Current User ID
      supervisorId: supervisorUserId,  // Supervisor User ID
      deptHeadId: deptHeadUserId,      // Dept Head User ID
      department: resolvedDepartment,
      title,
      description,
      target,
      timeline,
      year: parseInt(year, 10),
      status: 'Submitted'
    });

    await kpi.save();

    if (typeof AuditLog !== 'undefined') {
    await AuditLog.create({
      action: 'CREATE_KPI',
      kpiId: kpi._id,
      performedBy: currentUser._id,
      role: req.user.role,
      details: `KPI submitted by ${req.user.role} for year ${year}`
    });
  }

    res.json({ message: 'KPI submitted successfully', kpi });
  } catch (err) {
  console.error("🔴 KPI Submit Controller Error:", err); // Check server console!
  return res.status(500).json({ 
    error: 'Server error while submitting KPI',
    details: err.message,
    stack: err.stack 
  });
}
}
)

router.put('/approve/:id', protect, authorize('Supervisor', 'DeptHead'), async (req, res) => {
  const kpi = await KPI.findById(req.params.id);
  if (!kpi) return res.status(404).json({ error: 'KPI not found' });

  // Ensure supervisor is assigned to this employee
  if (req.user.role === 'Supervisor' && String(kpi.supervisorId) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not authorized to approve this KPI' });
  }

  kpi.status = 'Approved';
  await kpi.save();
  res.json({ message: 'KPI approved', kpi });
});



// GET /api/departments
router.get('/departments', protect, async (req, res) => {
  try {
    let departments = [];

    if (req.user.role === 'HR') {
      // HR sees all distinct departments
      departments = await Employee.distinct('department');
    } else if (req.user.role === 'DeptHead') {
      // DeptHead sees only their own department
      const deptHead = await Employee.findById(req.user._id);
      departments = deptHead ? [deptHead.department] : [];
    } else if (req.user.role === 'Supervisor') {
      // Supervisor sees only departments of their direct employees
      const employees = await Employee.find({ supervisorId: req.user._id }).distinct('department');
      departments = employees || [];
    } else {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    res.json(departments);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: 'Server error fetching departments' });
  }
});


// Supervisor approves/rejects
router.post('/:id/supervisor', protect, authorize(['Supervisor']), async (req, res) => {
  try {
    const kpi = await KPI.findById(req.params.id).populate('employeeId');
    if (!kpi) return res.status(404).json({ error: 'KPI not found' });

    // Extract logged-in supervisor references
    const currentSupervisorRef = String(req.user.employeeRef || req.user.id || req.user._id);
    const kpiSupervisorId = kpi.supervisorId || kpi.employeeId?.supervisorId;

    // 💡 FIXED: Validate supervisor access safely using employeeRef fallback
    if (String(kpi.supervisorId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to approve this KPI' });
    }

    kpi.approvals.push({
      role: 'Supervisor',
      approved: req.body.approved,
      date: new Date(),
      comments: req.body.comments
    });
    kpi.status = req.body.approved ? 'SupervisorApproved' : 'Rejected';

    await kpi.save();
    await AuditLog.create({
      action: 'APPROVE_KPI',
      kpiId: kpi._id,
      performedBy: req.user.id || req.user._id,
      role: 'Supervisor',
      details: `Supervisor ${req.body.approved ? 'approved' : 'rejected'} KPI`
    });
    res.json(kpi);
  } catch (err) {
    console.error('Supervisor approval error:', err);
    res.status(500).json({ error: 'Error updating KPI', details: err.message });
  }
});

// Dept Head approves/rejects
router.post('/:id/depthead', protect, authorize(['DeptHead']), async (req, res) => {
  try {
    const kpi = await KPI.findById(req.params.id).populate('employeeId');
    if (!kpi) return res.status(404).json({ error: 'KPI not found' });

    const currentDeptHeadRef = String(req.user.employeeRef || req.user.id || req.user._id);
    const kpiDeptHeadId = kpi.deptHeadId || kpi.employeeId?.deptHeadId;

    // 💡 FIXED: Validate Dept Head access by direct ID or department match
    const isDirectDeptHead = kpiDeptHeadId && String(kpiDeptHeadId) === currentDeptHeadRef;
    const isDeptMatch = String(kpi.department || kpi.employeeId?.department).toLowerCase() === String(req.user.department).toLowerCase();

    if (!isDirectDeptHead && !isDeptMatch) {
      return res.status(403).json({ error: 'Not authorized to approve this KPI' });
    }

    // 2. CRITICAL FIX: Validate workflow status pathing
    // Determine if the KPI belongs to a Supervisor submitting their own goals
    const isSupervisorOwnKpi = kpi.supervisorId && String(kpi.supervisorId) === String(kpi.employeeId?._id || kpi.employeeId);

    if (isSupervisorOwnKpi) {
      // Path B: Must be 'Submitted' for a Supervisor's own KPI
      if (kpi.status !== 'Submitted') {
        return res.status(400).json({ error: 'This KPI is not currently pending Department Head review.' });
      }
    } else {
      // Path A: Must be 'SupervisorApproved' for a standard employee KPI
      if (kpi.status !== 'SupervisorApproved') {
        return res.status(400).json({ error: 'This employee KPI must be approved by a Supervisor first.' });
      }
    }

    // 3. Prevent duplicate actioning if already finalized
    if (['DeptHeadApproved', 'Rejected'].includes(kpi.status)) {
      return res.status(400).json({ error: 'This KPI has already been finalized.' });
    }

    kpi.approvals.push({
      role: 'DeptHead',
      approved: req.body.approved,
      date: new Date(),
      comments: req.body.comments || 'No comments'
    });
    kpi.status = req.body.approved ? 'DeptHeadApproved' : 'Rejected';

    await kpi.save();

    await AuditLog.create({
      action: 'APPROVE_KPI',
      kpiId: kpi._id,
      performedBy: req.user.id || req.user._id,
      role: 'DeptHead',
      details: `DeptHead ${req.body.approved ? 'approved' : 'rejected'} KPI`
    });
    res.json(kpi);
  } catch (err) {
    console.error('DeptHead approval error:', err);
    res.status(500).json({ error: 'Error updating KPI', details: err.message });
  }
});

// Supervisor initiates performance review
router.post('/:id/review', protect, authorize('Supervisor'), async (req, res) => {
  try {
    const kpi = await KPI.findById(req.params.id).populate('employeeId');
    if (!kpi) return res.status(404).json({ error: 'KPI not found' });

    // Restrict to direct reports
    if (String(kpi.supervisorId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to review this KPI' });
    }

    const review = new PerformanceReview({
      kpiId: kpi._id,
      supervisorRating: req.body.rating
    });

    await review.save();
    await AuditLog.create({
      action: 'REVIEW_KPI',
      kpiId: review.kpiId,
      performedBy: req.user._id,
      role: 'Supervisor',
      details: `Supervisor review with rating ${req.body.rating}`
    });

    // Populate KPI and employee details for frontend
    const populatedReview = await KPI.findById(review._id)
      .populate({
        path: 'kpiId',
        populate: { path: 'employeeId', select: 'name department role' }
      });

    res.json(populatedReview);
  } catch (err) {
    res.status(500).json({ error: 'Error creating performance review' });
  }
});

// Dept Head rating
router.post('/:id/review/depthead', protect, authorize('DeptHead'), async (req, res) => {
  try {
    const review = await KPI.findById(req.params.id)
      .populate({
        path: 'kpiId',
        populate: { path: 'employeeId', select: 'name department role' }
      });

    if (!review) return res.status(404).json({ error: 'Review not found' });

    // Restrict to direct reports
    if (String(review.kpiId.deptHeadId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to rate this KPI' });
    }

    review.deptHeadRating = req.body.rating;
    await review.save();
    await AuditLog.create({
      action: 'REVIEW_KPI',
      kpiId: review.kpiId,
      performedBy: req.user._id,
      role: 'DeptHead',
      details: `DeptHead rating ${req.body.rating}`
    });

    res.json(review);
  } catch (err) {
    res.status(500).json({ error: 'Error updating performance review' });
  }
});


// Employee accept/reject
router.post('/:id/review/employee', protect, authorize('Employee'), async (req, res) => {
  try {
    const review = await KPI.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    review.employeeResponse = req.body.response;
    await review.save();

    // Audit log entry
    await AuditLog.create({
      action: 'EMPLOYEE_RESPONSE',
      kpiId: review.kpiId,
      performedBy: req.user._id,
      role: 'Employee',
      details: `Employee ${req.body.response}`
    });

    res.json(review);
  } catch (err) {
    res.status(500).json({ error: 'Error updating employee response' });
  }
});

// HR force acceptance for multiple employees
router.post('/review/force-bulk', protect, authorize(['HR']), async (req, res) => {
  try {
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of employeeIds.' });
    }

    // 1. PHASE 1: Core KPI Document State Transition
    // Find all active, open KPI records belonging to these employees
    const openStatuses = ['Submitted', 'SupervisorApproved', 'DeptHeadApproved'];
    const activeKPIs = await KPI.find({
      employeeId: {$in: employeeIds },
      status: {$in: openStatuses }
    });

    for (const kpi of activeKPIs) {
      kpi.status = 'Closed';
      kpi.approvals.push({
        role: 'HR',
        approved: true,
        date: new Date(),
        comments: 'Administrative Force Close - Bulk Override Applied by HR'
      });
      await kpi.save();
    }

    // 2. PHASE 2: PerformanceReview Forced Acceptance Logic (Your Existing Logic)
    const reviews = await PerformanceReview.find({
      employeeId: { $in: employeeIds },
      employeeResponse: { $exists: false },
      forcedAcceptance: { $ne: true }
    });

    for (const review of reviews) {
      review.forcedAcceptance = true;
      review.employeeResponse = 'Accepted';
      await review.save();

      // Audit log entry mapping both the review updates and kpi records
      await AuditLog.create({
        action: 'FORCE_ACCEPTANCE',
        kpiId: review.kpiId || null,
        performedBy: req.user.id || req.user._id,
        role: 'HR',
        details: `HR forced bulk acceptance and closure for employee ${review.employeeId}`
      });
    }

    res.json({ 
      message: `Forced acceptance and closure successfully applied to ${activeKPIs.length} KPIs and ${reviews.length} performance reviews.` 
    });

  } catch (err) {
    console.error('HR Bulk Force Close Error:', err);
    res.status(500).json({ error: 'Error forcing bulk acceptance and closure', details: err.message });
  }
});

// HR archive KPIs by year
router.post('/archive/:year', protect, authorize('HR'), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const result = await KPI.updateMany({ year, archived: false }, { archived: true });

    await AuditLog.create({
      action: 'ARCHIVE_YEAR',
      performedBy: req.user._id,
      role: 'HR',
      details: `Archived KPIs for year ${year}`
    });

    res.json({ message: `Archived ${result.modifiedCount} KPIs for year ${year}` });
  } catch (err) {
    res.status(500).json({ error: 'Error archiving KPIs' });
  }
});

// HR revert archive by year
router.post('/archive/revert/:year', protect, authorize('HR'), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const result = await KPI.updateMany({ year, archived: true }, { archived: false });

    await AuditLog.create({
      action: 'REVERT_ARCHIVE_YEAR',
      performedBy: req.user._id,
      role: 'HR',
      details: `Reverted archive for year ${year}`
    });

    res.json({ message: `Reverted ${result.modifiedCount} KPIs for year ${year}` });
  } catch (err) {
    res.status(500).json({ error: 'Error reverting archive' });
  }
});

// GET /api/auditlogs
router.get('/auditlogs', protect, async (req, res) => {
  try {
    const { kpiId, userId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = {};

    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    if (kpiId) filter.kpiId = kpiId;
    if (userId) filter.performedBy = userId;

    // Role restrictions
    if (req.user.role === 'Employee') {
      // Employees only see their own logs
      filter.performedBy = req.user._id;
    }

    if (req.user.role === 'Supervisor') {
      // Supervisors only see logs for KPIs they supervise
      const supervisedKpis = await KPI.find({ supervisorId: req.user._id }).select('_id');
      filter.kpiId = { $in: supervisedKpis.map(k => k._id) };
    }

    if (req.user.role === 'DeptHead') {
      // DeptHeads only see logs for KPIs they head
      const deptHeadKpis = await KPI.find({ deptHeadId: req.user._id }).select('_id');
      filter.kpiId = { $in: deptHeadKpis.map(k => k._id) };
    }

    // HR sees everything (no extra filter)

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await AuditLog.find(filter)
      .populate('kpiId', 'title employeeId')
      .populate('performedBy', 'name email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
      logs
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Server error fetching audit logs' });
  }
});

// GET /api/auditlogs/view
router.get('/auditlogs/view', protect, async (req, res) => {
  try {
    const { kpiId, userId, startDate, endDate, page = 1, limit = 50, sortField = 'timestamp', sortOrder = 'desc' } = req.query;
    const filter = {};

    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    if (kpiId) filter.kpiId = kpiId;
    if (userId) filter.performedBy = userId;

    // Role restrictions
    if (req.user.role === 'Employee') {
      filter.performedBy = req.user._id;
    }
    if (req.user.role === 'Supervisor') {
      const supervisedKpis = await KPI.find({ supervisorId: req.user._id }).select('_id');
      filter.kpiId = { $in: supervisedKpis.map(k => k._id) };
    }
    if (req.user.role === 'DeptHead') {
      const deptHeadKpis = await KPI.find({ deptHeadId: req.user._id }).select('_id');
      filter.kpiId = { $in: deptHeadKpis.map(k => k._id) };
    }
    // HR sees everything

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object dynamically
    const sort = {};
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    const logs = await AuditLog.find(filter)
      .populate('kpiId', 'title employeeId')
      .populate('performedBy', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
      logs
    });
  } catch (err) {
    console.error('Error viewing audit logs:', err);
    res.status(500).json({ error: 'Server error viewing audit logs' });
  }
});


// GET /api/auditlogs/export
router.get('/auditlogs/export', protect, async (req, res) => {
  try {
    const { format = 'csv', kpiId, userId, startDate, endDate } = req.query;
    const filter = {};

    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    if (kpiId) filter.kpiId = kpiId;
    if (userId) filter.performedBy = userId;

    // Role restrictions
    switch (req.user.role) {
      case 'Employee':
        filter.performedBy = req.user._id;
        break;

      case 'Supervisor': {
        const supervisedKpis = await KPI.find({ supervisorId: req.user._id }).select('_id');
        filter.kpiId = { $in: supervisedKpis.map(k => k._id) };
        break;
      }

      case 'DeptHead': {
        const deptHeadKpis = await KPI.find({ deptHeadId: req.user._id }).select('_id');
        filter.kpiId = { $in: deptHeadKpis.map(k => k._id) };
        break;
      }

      // HR → unrestricted
    }

    const logs = await AuditLog.find(filter)
      .populate('kpiId', 'title employeeId')
      .populate('performedBy', 'name email role')
      .sort({ timestamp: -1 });

    if (format === 'csv') {
      const { Parser } = require('json2csv');
      const fields = ['action', 'kpiId.title', 'performedBy.name', 'performedBy.email', 'role', 'timestamp', 'details'];
      const parser = new Parser({ fields });
      const csv = parser.parse(logs);

      res.header('Content-Type', 'text/csv');
      res.attachment('auditlogs.csv');
      return res.send(csv);
    }

    if (format === 'xlsx') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Audit Logs');

      sheet.columns = [
        { header: 'Action', key: 'action', width: 20 },
        { header: 'KPI Title', key: 'kpiTitle', width: 30 },
        { header: 'User Name', key: 'userName', width: 25 },
        { header: 'User Email', key: 'userEmail', width: 30 },
        { header: 'Role', key: 'role', width: 15 },
        { header: 'Timestamp', key: 'timestamp', width: 25 },
        { header: 'Details', key: 'details', width: 50 }
      ];

      logs.forEach(log => {
        sheet.addRow({
          action: log.action,
          kpiTitle: log.kpiId?.title,
          userName: log.performedBy?.name,
          userEmail: log.performedBy?.email,
          role: log.role,
          timestamp: log.timestamp,
          details: log.details
        });
      });

      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('auditlogs.xlsx');
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    res.status(400).json({ error: 'Unsupported format. Use csv or xlsx.' });
  } catch (err) {
    console.error('Error exporting audit logs:', err);
    res.status(500).json({ error: 'Server error exporting audit logs' });
  }
});


// Update KPI (only Employee, and only if still Submitted)
router.put('/:id', protect, authorize('Employee'), async (req, res) => {
  try {
    const kpi = await KPI.findById(req.params.id)
      .populate('employeeId', 'name department role supervisorId deptHeadId');

    if (!kpi) return res.status(404).json({ error: 'KPI not found' });

    // Only allow update if status is still Submitted
    if (kpi.status !== 'Submitted') {
      return res.status(400).json({ error: 'Cannot edit after submission' });
    }

    // Ensure employee can only update their own KPI
    if (String(kpi.employeeId._id) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden: not your KPI' });
    }

    // Merge updates
    Object.assign(kpi, req.body);
    await kpi.save();
    await AuditLog.create({
      action: 'UPDATE_KPI',
      kpiId: kpi._id,
      performedBy: req.user._id,
      role: req.user.role,
      details: 'KPI updated while status Submitted'
    });


    // Return KPI with employee details populated
    const updatedKpi = await KPI.findById(kpi._id)
      .populate('employeeId', 'name department role supervisorId deptHeadId');

    res.json(updatedKpi);
  } catch (err) {
    console.error('Error updating KPI:', err);
    res.status(500).json({ error: 'Server error while updating KPI' });
  }
});


// Delete KPI
router.delete('/:id', protect, async (req, res) => {
  try {
    const kpi = await KPI.findById(req.params.id);
    if (!kpi) return res.status(404).json({ error: 'KPI not found' });

    // Employee can delete only their own KPI if still Submitted
    if (req.user.role === 'Employee') {
      if (String(kpi.employeeId) !== String(req.user._id)) {
        return res.status(403).json({ error: 'Forbidden: not your KPI' });
      }
      if (kpi.status !== 'Submitted') {
        return res.status(400).json({ error: 'Cannot delete after submission' });
      }
    }

    // Supervisor can delete only KPIs of their direct reports
    if (req.user.role === 'Supervisor') {
      if (String(kpi.supervisorId) !== String(req.user._id)) {
        return res.status(403).json({ error: 'Forbidden: KPI not in your reporting chain' });
      }
    }

    // Dept Head can delete only KPIs of their direct reports
    if (req.user.role === 'DeptHead') {
      if (String(kpi.deptHeadId) !== String(req.user._id)) {
        return res.status(403).json({ error: 'Forbidden: KPI not in your reporting chain' });
      }
    }

    // HR can delete any KPI (no restriction)

    await kpi.deleteOne();
    await AuditLog.create({
      action: 'DELETE_KPI',
      kpiId: kpi._id,
      performedBy: req.user._id,
      role: req.user.role,
      details: 'KPI deleted'
    });
    res.json({ message: 'KPI deleted successfully' });
  } catch (err) {
    console.error('Error deleting KPI:', err);
    res.status(500).json({ error: 'Server error while deleting KPI' });
  }
});


// HR revert KPI status
router.post('/:id/revert', protect, authorize('HR'), async (req, res) => {
  try {
    const kpi = await KPI.findById(req.params.id);
    if (!kpi) return res.status(404).json({ error: 'Not found' });

    kpi.status = req.body.newStatus; // e.g. "Submitted" or "SupervisorApproved"
    await kpi.save();
    await AuditLog.create({
      action: 'UPDATE_KPI',
      kpiId: kpi._id,
      performedBy: req.user._id,
      role: req.user.role,
      details: 'KPI updated while status Submitted'
    });
    res.json(kpi);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Supervisor can view KPIs of their employees
router.get('/supervisor/:id', protect, authorize('Supervisor'), async (req, res) => {
  try {
    const employees = await Employee.find({ supervisorId: req.params.id }).select('_id');
    const kpis = await KPI.find({ employeeId: { $in: employees } });
    res.json(kpis);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Department-wise KPI Analytics ---
router.get('/analytics/dept', protect, authorize('HR'), async (req, res) => {
  try {
    const kpis = await KPI.find({});
    const departments = [...new Set(kpis.map(k => k.department))];

    const result = {};
    departments.forEach(dept => {
      const deptKpis = kpis.filter(k => k.department === dept);
      result[dept] = {
        total: deptKpis.length,
        approved: deptKpis.filter(k => k.status === 'DeptHeadApproved').length,
        pending: deptKpis.filter(k => k.status === 'Submitted' || k.status === 'SupervisorApproved').length,
        rejected: deptKpis.filter(k => k.status === 'Rejected').length
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error generating analytics' });
  }
});

// --- Department-wise Ratings Analytics ---
router.get('/ratings', protect, authorize('HR'), async (req, res) => {
  try {
    const reviews = await PerformanceReview.find({}).populate('employeeId');
    const result = {};

    reviews.forEach(r => {
      const dept = r.employeeId.department;
      if (!result[dept]) result[dept] = { total: 0, sum: 0 };
      if (r.supervisorRating) {
        result[dept].sum += r.supervisorRating;
        result[dept].total++;
      }
      if (r.deptHeadRating) {
        result[dept].sum += r.deptHeadRating;
        result[dept].total++;
      }
    });

    const averages = {};
    Object.keys(result).forEach(dept => {
      averages[dept] = result[dept].total > 0 ? (result[dept].sum / result[dept].total).toFixed(2) : 0;
    });

    res.json(averages);
  } catch (err) {
    res.status(500).json({ error: 'Error generating ratings analytics' });
  }
});

// --- Overall Ratings Analytics ---
router.get('/ratings/overall', protect, authorize('HR'), async (req, res) => {
  try {
    const reviews = await KPI.find({});
    let total = 0;
    let sum = 0;

    reviews.forEach(r => {
      if (r.supervisorRating) {
        sum += r.supervisorRating;
        total++;
      }
      if (r.deptHeadRating) {
        sum += r.deptHeadRating;
        total++;
      }
    });

    const overallAverage = total > 0 ? (sum / total).toFixed(2) : 0;
    res.json({ overall: overallAverage });
  } catch (err) {
    res.status(500).json({ error: 'Error generating overall ratings analytics' });
  }
});

// --- AI Insights for HR ---
router.get('/ai-insights', protect, authorize('HR'), async (req, res) => {
  try {
    const kpis = await KPI.find({});
    const reviews = await KPI.find({});

    // --- Predictive KPI Success (Regression) ---
    const data = reviews.map(r => {
      const avgRating = ((r.supervisorRating || 0) + (r.deptHeadRating || 0)) / 2;
      const approved = r.supervisorRating >= 3 && r.deptHeadRating >= 3 ? 1 : 0;
      return [avgRating, approved];
    });

    let regressionSummary = '';
    if (data.length > 1) {
      const result = regression.linear(data);
      const slope = isNaN(result.equation[0]) ? 0 : result.equation[0];
      regressionSummary = `Regression model suggests approval likelihood increases by ${(slope * 100).toFixed(1)}% per rating point.`;
    }

    const approvedRate = kpis.filter(k => k.status === 'DeptHeadApproved').length / (kpis.length || 1);
    const heuristicSummary = `Current approval rate across all KPIs is ${(approvedRate * 100).toFixed(1)}%.`;

    const prediction = `${regressionSummary} ${heuristicSummary}`;

    // --- Sentiment Analysis ---
    const allComments = [
      ...kpis.flatMap(k => k.approvals.map(a => a.comments || '')),
      ...reviews.map(r => r.comments || '')
    ].filter(c => c.length > 0);

    const sentimentScores = allComments.map(c => sentiment.analyze(c).score);
    const avgSentiment = sentimentScores.length > 0
      ? (sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length).toFixed(2)
      : 0;
    const sentimentSummary = avgSentiment > 0 ? 'Positive overall sentiment'
                          : avgSentiment < 0 ? 'Negative overall sentiment'
                          : 'Neutral sentiment';

    // --- Risk Alerts ---
    const deptCounts = {};
    kpis.forEach(k => {
      if (!deptCounts[k.department]) deptCounts[k.department] = { total: 0, rejected: 0 };
      deptCounts[k.department].total++;
      if (k.status === 'Rejected') deptCounts[k.department].rejected++;
    });
    const riskyDepts = Object.keys(deptCounts).filter(d => deptCounts[d].rejected / deptCounts[d].total > 0.3);
    const risks = riskyDepts.length > 0
      ? `High rejection rates in: ${riskyDepts.join(', ')}`
      : 'No major risk alerts';

    // --- Recommendations Engine ---
    let recommendations = [];
    if (avgSentiment < 0) recommendations.push('Launch employee satisfaction survey and mentoring programs.');
    if (riskyDepts.length > 0) recommendations.push('Provide supervisor training in high-risk departments.');
    if (overallAverageRating(reviews) < 3) recommendations.push('Introduce skill development workshops.');

    res.json({
      prediction,
      sentiment: sentimentSummary,
      risks,
      recommendations: recommendations.join(' ')
    });
  } catch (err) {
    res.status(500).json({ error: 'Error generating AI insights' });
  }
});

// Helper to compute overall average rating
function overallAverageRating(reviews) {
  let total = 0, sum = 0;
  reviews.forEach(r => {
    if (r.supervisorRating) { sum += r.supervisorRating; total++; }
    if (r.deptHeadRating) { sum += r.deptHeadRating; total++; }
  });
  return total > 0 ? sum / total : 0;
}

module.exports = router;
