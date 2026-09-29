//client/src/components/KPIList.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../../services/api';
import "../styles/quantum.css";
import KPIForm from './KPIForm';

const KPIList = ({ user, logout }) => {
  const [kpis, setKpis] = useState([]);
  const [ratings, setRatings] = useState({});
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [archivedFilter, setArchivedFilter] = useState('');
  const [currentKPIs, setCurrentKPIs] = useState([]);
  const [editingKpi, setEditingKpi] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    target: '',
    timeline: '',
    department: '',
    year: ''
  });
  const [editError, setEditError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [year, setYear] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [departments, setDepartments] = useState([]);
  const [formMessage, setFormMessage] = useState('');

  const navigate = useNavigate();

  const itemsPerPage = 10;

  const fetchKPIs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/kpi', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKpis(res.data);
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, []);

  // Callback passed to KPIForm
  const handleKpiCreated = (response) => {
    // 1. Either append the new KPI directly to state...
    if (response.kpi) {
      setKpis((prevKpis) => [response.kpi, ...prevKpis]);
    } else {
      // 2. ...or trigger a full refetch from backend
      fetchKPIs();
    }
  };

// const refreshKPIs = async () => {
//     try {

//       // 1. Build dynamic parameters object
//     const params = {
//       archived: false,
//     };

//     // Only add optional filters if they hold valid values
//     if (filter && filter !== 'All') {
//       params.filter = filter;
//     }

//     if (search && search.trim() !== '') {
//       params.search = search.trim();
//     }

//     // Pass department ONLY for DeptHead or HR management views
//     if (user?.role === 'DeptHead' || user?.role === 'HR') {
//       if (user?.department) {
//         params.department = user.department;
//       }
//     }

    //   const { data } = await api.get('/kpi', {
    //   params: {
    //     filter: filter !== 'All' ? filter : undefined,
    //     search: search.trim() !== '' ? search : undefined,
    //     year: new Date().getFullYear(),   // or whatever year you want
    //     archived: false,
    //     department: user?.department
    //   }
    // });
  //   const { data } = await api.get('/kpi', { params });

  //     // Ensure data is safely handled as an array
  //     const kpiArray = Array.isArray(data)
  //       ? data
  //       : Array.isArray(data?.kpis)
  //       ? data.kpis
  //       : [];
      
  //       setKpis(kpiArray);
  //   } catch (err) {
  //     console.error('Error fetching KPIs:', err);
  //     setKpis([]);
  //   }
  // };

  // useEffect(() => {
  //   refreshKPIs();
  // }, [filter, search]);

  const getEmployeeName = (employeeId) => {
  if (!employeeId) return 'N/A';
  if (typeof employeeId === 'object' && employeeId.name) {
    return employeeId.name;
  }
  return 'Employee Record'; // Fallback if populated object is missing
};

  // Handle KPI creation
  const handleCreateKPI = async (e) => {
    e.preventDefault();
    setFormMessage('');
    try {
      const res = await api.post('/kpi/submit', {
        title,
        description,
        target,
        timeline,
        year,
        owner: user?.employeeRef
      });
      setFormMessage('KPI submitted successfully!');
      setTitle('');
      setDescription('');
      setTarget('');
      setTimeline('');
      setShowForm(false);
      refreshKPIs();
    } catch (err) {
      setFormMessage(err.response?.data?.message || 'Failed to create KPI.');
    }
  };

  const handleApproval = async (id, action, comments) => {
    try {
      await axios.put(`/kpi/${id}/${action}`, { comments });
      fetchKPIs(); // refresh after action
    } catch (err) {
      console.error(`Error ${action} KPI:`, err);
    }
  };

  useEffect(() => {
  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/kpi/departments');
      setDepartments(data);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  if (user?.role === 'DeptHead' || user?.role === 'HR') {
    fetchDepartments();
  }
}, [user]);

  // Workflow actions (same as before)
  const handleSupervisorAction = async (id, approved) => {
    const actionText = approved ? 'approval' : 'rejection';
    const defaultComment = approved ? 'Looks good' : 'Needs improvement';
    
    const comments = window.prompt(
      `Enter your comments for this KPI ${actionText}:`, 
      defaultComment
    );

    if (comments === null) {
      return; 
    }

  try {
    await api.post(`/kpi/${id}/supervisor`, { 
      approved, 
      comments: comments.trim() || defaultComment
    });
    if (typeof refreshKPIs === 'function') {
      refreshKPIs();
    } else if (typeof fetchKPIs === 'function') {
      fetchKPIs();
    }
  } catch (err) {
    console.error('Error updating KPI (Supervisor):', err.response?.data || err.message);
  }
};
  const handleDeptHeadAction = async (id, approved) => {
    const actionText = approved ? 'approval' : 'rejection';
    const defaultComment = approved ? 'Approved by Dept Head' : 'Rejected by Dept Head';

    const comments = window.prompt(
      `Enter your comments for this KPI ${actionText}:`, 
      defaultComment
    );

    if (comments === null) {
      return;
    }
  try {
    await api.post(`/kpi/${id}/depthead`, { 
      approved, 
      comments: comments.trim() || defaultComment
    });
    if (typeof refreshKPIs === 'function') {
      refreshKPIs();
    } else if (typeof fetchKPIs === 'function') {
      fetchKPIs();
    }
    console.log("=== DEPT HEAD DEBUG LOGS ===");
    console.log("Current Logged-in User:", user);
    console.log("User Dept Path 1 (user.department):", user?.department);
    console.log("User Dept Path 2 (user.employeeRef?.department):", user?.employeeRef?.department);
    console.log("Raw KPIs array from API:", kpis);
  } catch (err) {
    console.error('Error updating KPI (DeptHead):', err.response?.data || err.message);
  }
};
  const handleSupervisorRating = async (id) => {
  try {
    const rating = ratings[id];
    await api.post(`/kpi/${id}/review`, { rating });
    refreshKPIs();
  } catch (err) {
    console.error('Error rating KPI:', err.response?.data || err.message);
  }
};

const handleDeptHeadRating = async (id) => {
  try {
    const rating = ratings[id + '-dh'];
    await api.post(`/kpi/${id}/review/depthead`, { rating });
    refreshKPIs();
  } catch (err) {
    console.error('Error rating KPI (DeptHead):', err.response?.data || err.message);
  }
};
  const handleEmployeeResponse = async (id, response) => {
    await api.post(`/kpi/${id}/review/employee`, { response });
    refreshKPIs();
  };
  const handleForceAcceptance = async (id) => {
    await api.post(`/kpi/${id}/review/force`);
    refreshKPIs();
  };

  // Separate KPIs into two groups
  const myKPIs = currentKPIs.filter(k => {
    const empId = k.employeeId?._id || k.employeeId;
    return String(empId) === String(user?.employeeRef);
  });

  // 2. Actionable Employee Management Dashboard filter queue
  const employeeKPIs = currentKPIs.filter(k => {
    const empId = k.employeeId?._id || k.employeeId;
    
    // Filter out personal KPIs from your actionable employee tracking queue
    if (String(empId) === String(user?.employeeRef)) return false;

    if (user?.role === 'Supervisor') {
      const superId = k.supervisorId?._id || k.supervisorId;
      return String(superId) === String(user?.employeeRef);
    }
    if (user?.role === 'DeptHead') {
      return String(k.department).toLowerCase() === String(user?.department).toLowerCase();
    }
    return false;
  });

    const handleEditKPI = (kpi) => {
    setEditError('');
    setEditingKpi(kpi);
    setEditFormData({
      title: kpi.title || '',
      description: kpi.description || '',
      target: kpi.target || '',
      timeline: kpi.timeline || '',
      department: kpi.department || '',
      year: kpi.year || ''
    });
  };

  // 2. Submit Update to Backend PUT /api/kpi/:id
  const handleUpdateKPI = async (e) => {
    e.preventDefault();
    setEditError('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      
      await axios.put(`/api/kpi/${editingKpi._id}`, editFormData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setEditingKpi(null);
      setIsSubmitting(false);

      if (typeof refreshKPIs === 'function') {
        refreshKPIs();
      }
    } catch (err) {
      setIsSubmitting(false);
      console.error('Update KPI Error:', err);
      setEditError(err.response?.data?.error || 'Failed to update KPI. Please try again.');
    }
  };

  const handleDeleteKPI = async (id) => {
    if (window.confirm('Are you sure you want to delete this KPI?')) {
      try {
        await api.delete(`/kpi/${id}`);
        refreshKPIs();
      } catch (err) {
        console.error('Error deleting KPI:', err);
      }
    }
  };

  // Badge styling
  const getStatusBadge = (status) => {
  switch (status) {
    case 'Submitted':
      return <span className="badge submitted">Submitted</span>;
    case 'SupervisorApproved':
      return <span className="badge supervisor-approved">Supervisor Approved</span>;
    case 'DeptHeadApproved':
      return <span className="badge dept-approved">Dept Head Approved</span>;
    case 'Rejected':
      return <span className="badge rejected">Rejected</span>;
    default:
      return <span className="badge default">{status || 'Unknown'}</span>;
  }
};

  // Apply filter + search
  const filteredKPIs = currentKPIs.filter(k => {
    const matchesFilter = filter === 'All' || k.status === filter;
    const matchesSearch =
      (k.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (k.description || '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredKPIs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  // const currentKPIs = filteredKPIs.slice(startIndex, startIndex + itemsPerPage);

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ['Title', 'Description', 'Status'],
      ...filteredKPIs.map(k => [k.title, k.description, k.status])
    ];
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'kpi_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF (simple client-side using window.print)
  const exportPDF = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    const html = `
      <html>
        <head><title>KPI Report</title></head>
        <body>
          <h1>KPI Report</h1>
          <table border="1" cellpadding="8" style="width:100%; border-collapse: collapse;">
            <thead>
              <tr><th>Title</th><th>Description</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${filteredKPIs.map(k => `<tr><td>${k.title}</td><td>${k.description}</td><td>${k.status}</td></tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
  <div className="kpi-page">
    <img src="/s3-logo.png" alt="S3 Technologies" className="sn-logo" />
    <div className="page-watermark">
      <img src="/s3-watermark.png" alt="S3 Technologies" />
    </div>
    <h2>Welcome {user?.name} ({user?.role})</h2>
    <button className="logout-btn" onClick={logout}>Logout</button>

    {/* Audit Logs Button for Supervisor & DeptHead & HR */}
    {(user?.role === 'Supervisor' || user?.role === 'DeptHead' || user?.role === 'HR') && (
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => navigate('/auditlogs')}>
          View Audit Logs
        </button>
      </div>
    )}

    {/* Create KPI button for Employee, Supervisor, DeptHead */}
    {(user?.role === 'Employee' || user?.role === 'Supervisor' || user?.role === 'DeptHead') && (
      <div className="create-kpi-toggle">
        <button className="primary-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Create KPI'}
        </button>
      </div>
    )}

      

      {/* <input
        type="number"
        placeholder="Year"
        value={year}
        onChange={e => setYear(e.target.value)}
      />
      <select value={archivedFilter} onChange={e => setArchivedFilter(e.target.value)}>
        <option value="">All</option>
        <option value="false">Active</option>
        <option value="true">Archived</option>
      </select>
      <button onClick={fetchKpis}>Apply Filters</button> */}


      {/* {showForm && (
        <form className="kpi-form" onSubmit={handleCreateKPI}>
          <h3>Create KPI</h3>
          {formMessage && <p className="form-message">{formMessage}</p>}
          <input type="text" placeholder="Year" value={year} onChange={e => setTimeline(e.target.value)} />
          <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
          <input type="text" placeholder="Target" value={target} onChange={e => setTarget(e.target.value)} />
          <input type="text" placeholder="Timeline" value={timeline} onChange={e => setTimeline(e.target.value)} />
          
          <button type="submit" className="primary-btn">Submit KPI</button>
        </form>
      )} */}

        {showForm && (
          <KPIForm user={user} onKpiCreated={() => { setShowForm(false); fetchKPIs(); }} />
        )}

        <h2 style={{ marginTop: '30px' }}>All KPIs</h2>

        {/* Filter + Search + Export */}
        <div className="kpi-controls">
        <div>
          <button className="secondary-btn" onClick={exportCSV}>Export CSV</button>
          <button className="secondary-btn" onClick={exportPDF}>Export PDF</button>
        </div>
      </div>

      {/* Separate KPIs into two groups */}
    {user?.role === 'Supervisor' || user?.role === 'DeptHead' ? (
      <>
        {/* ================= MY KPIs TABLE ================= */}
        <h2>My KPIs</h2>
        {Array.isArray(kpis) &&
          kpis.filter((k) => String(k.employeeId?._id || k.employeeId) === String(user?.employeeRef)).length === 0 ? (
            <p>You have not submitted any KPIs.</p>
        ) : (
          <table className="kpi-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Title</th>
                <th>Description</th>
                <th>Target</th>
                <th>Timeline</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(kpis) &&
                  kpis
                    .filter((k) => String(k.employeeId?._id || k.employeeId) === String(user?.employeeRef))
                  .map((kpi) => (
                  <tr key={kpi._id}>
                    <td>{kpi.year}</td>
                    <td>{kpi.title}</td>
                    <td>{kpi.description}</td>
                    <td>{kpi.target}</td>
                    <td>{kpi.timeline}</td>
                    <td>{getStatusBadge(kpi.status)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
        {/* ================= EMPLOYEE KPIs TABLE ================= */}
        <h2>Employee KPIs</h2>
        {(() => {
            const employeeKPIs = Array.isArray(kpis)
              ? kpis.filter((k) => {
                  // If employeeId is directly the ObjectId, k.employeeId?._id is undefined.
                  // We check for both options to ensure we get a valid hex string.
                  const empId = k.employeeId?._id 
                    ? String(k.employeeId._id) 
                    : (k.employeeId ? String(k.employeeId) : '');
                    
                  const rawSuperId = k.supervisorId?._id 
                    ? String(k.supervisorId._id) 
                    : (k.supervisorId ? String(k.supervisorId) : '');

                  const myEmpRef = String(user?.employeeRef || '');
                  
                  // Management Gate: Hide the Dept Head's personal KPIs from this operational table
                  const isNotMe = empId !== myEmpRef;
                  // 2. Department Extraction
                  const kpiDept = String(k.department || '').trim().toLowerCase();
                  const userDept = String(user?.department || '').trim().toLowerCase();
                  const isDeptMatch = !userDept || kpiDept === userDept;
                  // return isNotMe && amISupervisor;
                  // --- A. DEPARTMENT HEAD STRATIFIED WORKFLOW ---
                  if (user?.role === 'DeptHead') {
                    console.log("=== DEPT HEAD VISIBILITY DEBUG ===");
                    console.log("Logged-In User Dept Object:", user?.department);
                    console.log("Target KPI status:", kpis.map(k => k.status));
                    console.log("Target KPI Dept paths:", kpis.map(k => ({
                      topLevel: k.department,
                      empDeptName: k.employeeId?.department?.name,
                      empDeptRaw: k.employeeId?.department
                    })));
                    // A Supervisor's own KPI is identified if their supervisorId field matches their own employeeId field
                    const isSupervisorOwnKpi = rawSuperId && empId && rawSuperId === empId;

                    let isEligibleStatus = false;
                    if (isSupervisorOwnKpi) {
                      // Path B: Supervisor acting as employee -> Visible immediately at 'Submitted'
                      isEligibleStatus = k.status === 'Submitted';
                    } else {
                      // Path A: Normal Employee -> ONLY visible when it is strictly 'SupervisorApproved'
                      isEligibleStatus = k.status === 'SupervisorApproved';
                    }

                    // Return true only if it passes all authorization criteria
                    return isNotMe && isDeptMatch && isEligibleStatus;
                  }

                  // --- B. SUPERVISOR STRATIFIED WORKFLOW ---
                  if (user?.role === 'Supervisor') {
                    const isAssignedSupervisor = rawSuperId && rawSuperId === myEmpRef;
                    const amISupervisor = isAssignedSupervisor || isDeptMatch;

                    // Supervisors only see initial employee submissions
                    return isNotMe && amISupervisor && k.status === 'Submitted';
                  }

                  return false;
                })
              : [];

            if (employeeKPIs.length === 0) {
              return <p>No employee KPIs found matching your review profile.</p>;
            }

          return (
            <table className="kpi-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Year</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Target</th>
                  <th>Timeline</th>
                  <th>Status</th>
                  <th>Approvals</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employeeKPIs.map(kpi => (
                  <tr key={kpi._id}>
                    <td>{kpi.employeeId?.name}</td>
                    <td>{kpi.year}</td>
                    <td>{kpi.title}</td>
                    <td>{kpi.description}</td>
                    <td>{kpi.target}</td>
                    <td>{kpi.timeline}</td>
                    <td>{getStatusBadge(kpi.status)}</td>
                    <td>
                      {kpi.approvals && kpi.approvals.length > 0 ? (
                        <ul>
                          {kpi.approvals.map((a, idx) => (
                            <li key={idx}>
                              <strong>{a.role}:</strong> {a.approved ? 'Approved' : 'Rejected'} ({a.comments || 'No comments'})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        'Pending'
                      )}
                    </td>
                    <td>
                      {user?.role === 'Supervisor' && kpi.status === 'Submitted' && (
                        <>
                          <button onClick={() => handleSupervisorAction(kpi._id, true)}>Approve</button>
                          <button onClick={() => handleSupervisorAction(kpi._id, false)}>Reject</button>
                        </>
                      )}

                      {user?.role === 'DeptHead' && (
                      (() => {
                        // Bulletproof ID string conversions to inspect database structure
                        const empId = kpi.employeeId?._id ? String(kpi.employeeId._id) : String(kpi.employeeId || '');
                        const rawSuperId = kpi.supervisorId?._id ? String(kpi.supervisorId._id) : String(kpi.supervisorId || '');
                        
                        // Identify if a Supervisor submitted this record themselves
                        const isSupervisorOwnKpi = rawSuperId && empId && rawSuperId === empId;

                        // Render buttons if:
                        // - It's a supervisor's own goal waiting at 'Submitted'
                        // - OR it's a regular employee's goal already approved by a supervisor at 'SupervisorApproved'
                        const showButtons = (isSupervisorOwnKpi && kpi.status === 'Submitted') || 
                                            (!isSupervisorOwnKpi && kpi.status === 'SupervisorApproved');

                        if (showButtons) {
                          return (
                            <>
                              <button onClick={() => handleDeptHeadAction(kpi._id, true)}>Approve</button>
                              <button onClick={() => handleDeptHeadAction(kpi._id, false)}>Reject</button>
                            </>
                          );
                        }
                        return null;
                      })()
                    )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </>
    ) : (
      /* ✅ FIX: Replaced broken comment string with the mandatory colon (:) condition branch */
      <>
        {Array.isArray(kpis) && kpis.length === 0 ? (
          <p>No KPIs match this filter or search.</p>
        ) : (
          <table className="kpi-table">
            <thead>
              <tr>
                {/* ✅ FIX: Render header dynamically for HR users to line up alignment blocks */}
                {user?.role === 'HR' && <th>Employee</th>}
                <th>Year</th>
                <th>Title</th>
                <th>Description</th>
                <th>Target</th>
                <th>Timeline</th>
                <th>Status</th>
                <th>Approvals</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(kpis) &&
                kpis
                  .filter((kpi) => {
                    // If logged in as an Employee, show all returned records
                    if (user?.role === 'Employee') return true;

                    // For Supervisors/DeptHeads checking "My KPIs"
                    const kpiEmpId = String(kpi.employeeId?._id || kpi.employeeId);
                    const myEmpRef = String(user?.employeeRef);
                    const myUserId = String(user?.id || user?._id);

                    return kpiEmpId === myEmpRef || kpiEmpId === myUserId;
                  })
                  .map((kpi) => (
                  <tr key={kpi._id}>
                    {user?.role === 'HR' && <td>{kpi.employeeId?.name || 'N/A'}</td>}
                    <td>{kpi.year}</td>
                    <td>{kpi.title}</td>
                    <td>{kpi.description}</td>
                    <td>{kpi.target}</td>
                    <td>{kpi.timeline}</td>
                    <td>{getStatusBadge(kpi.status)}</td>
                    <td>
                      {kpi.approvals && kpi.approvals.length > 0 ? (
                        <ul>
                          {kpi.approvals.map((a, idx) => (
                            <li key={idx}>
                              {a.role}: {a.approved ? 'Approved' : 'Rejected'} ({a.comments || 'No comments'})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        'Pending'
                      )}
                    </td>
                    <td>
                      {(user?.role === 'Employee' || user?.role === 'HR') && kpi.status === 'Submitted' ? (
                        <>
                          <button onClick={() => handleEditKPI(kpi)}>Edit</button>
                          <button onClick={() => handleDeleteKPI(kpi._id)}>Delete</button>
                        </>
                      ) : (
                        <span style={{ color: '#888', fontSize: '0.85rem' }}>N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </>
    )}
    {/* ================= EDIT KPI MODAL OVERLAY ================= */}
      {editingKpi && (
        <div 
          className="modal-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="modal-content" 
            style={{
              backgroundColor: '#ffffff',
              padding: '24px',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            <h3>Edit KPI</h3>

            {editError && (
              <div style={{ color: '#e74c3c', backgroundColor: '#fde8e8', padding: '8px', borderRadius: '4px', marginBottom: '12px' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateKPI} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  required
                  rows="3"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Target</label>
                  <input
                    type="text"
                    value={editFormData.target}
                    onChange={(e) => setEditFormData({ ...editFormData, target: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Timeline</label>
                  <input
                    type="text"
                    value={editFormData.timeline}
                    onChange={(e) => setEditFormData({ ...editFormData, timeline: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Department</label>
                  <input
                    type="text"
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Year</label>
                  <input
                    type="number"
                    value={editFormData.year}
                    onChange={(e) => setEditFormData({ ...editFormData, year: Number(e.target.value) })}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingKpi(null)}
                  disabled={isSubmitting}
                  className="secondary-btn"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="primary-btn"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
  </div>
);
}
    
export default KPIList;