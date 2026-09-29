import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Bar, Pie } from 'react-chartjs-2';

const HRDashboard = ({ user, logout }) => {
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [kpis, setKpis] = useState([]);
  const [deptAnalytics, setDeptAnalytics] = useState({});
  const [ratings, setRatings] = useState({});
  const [overallRating, setOverallRating] = useState(0);
  const [aiInsights, setAiInsights] = useState({});
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [year, setYear] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Unified data refetch function to keep charts and tables fully synchronized
  const refreshDashboardData = async () => {
    try {
      const resKpis = await api.get('/kpi');
      setKpis(resKpis.data);

      const uniqueDepts = [...new Set(resKpis.data.map(k => k.department).filter(Boolean))];
      setDepartments(uniqueDepts);

      const resDept = await api.get('/kpi/analytics/dept');
      setDeptAnalytics(resDept.data);

      const resRatings = await api.get('/kpi/ratings');
      setRatings(resRatings.data);

      const resOverall = await api.get('/kpi/ratings/overall');
      setOverallRating(resOverall.data.overall);

      const resAI = await api.get('/kpi/ai-insights');
      setAiInsights(resAI.data);

      try {
        const resEmployees = await api.get('/users'); // 💡 Updated endpoint matching your User Collection
        setEmployees(resEmployees.data);
      } catch (empErr) {
        console.error("Primary workforce endpoint failed, trying fallback...", empErr);
        // Fallback retry block just in case
        const resFallback = await api.get('/employees').catch(err => ({ data: [] }));
        setEmployees(resFallback.data);
      }
    } catch (err) {
      console.error("Error refreshing dashboard data:", err);
    }
  };

  useEffect(() => {
    refreshDashboardData();
  }, []);

  const toggleSelect = (id) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleForceAcceptance = async () => {
    if (selectedEmployees.length === 0) {
      alert("Please select at least one employee to force close records.");
      return;
    }
    try {
      await api.post('/kpi/review/force-bulk', { employeeIds: selectedEmployees });
      alert('Status updated to Closed and Accepted for selected employees and their KPIs');
      setSelectedEmployees([]);
      await refreshDashboardData();
    } catch (err) {
      console.error("Bulk action failed:", err);
      alert("Error processing bulk closure.");
    }
  };

  const exportPDF = () => {
    const printWindow = window.open('', '', 'width=900,height=700');
    
    const printRowsHtml = kpis
      .filter(kpi => {
        const empId = kpi.employeeId?._id ? String(kpi.employeeId._id) : String(kpi.employeeId || '');
        return selectedEmployees.includes(empId) && (!selectedDept || kpi.department === selectedDept);
      })
      .map(kpi => {
        const empName = kpi.employeeId?.name || kpi.employeeName || 'N/A';
        const empCode = kpi.employeeId?.employeeId || kpi.employeeId || 'N/A';
        
        return `
          <tr>
            <td>${empCode}</td>
            <td>${empName}</td>
            <td>${kpi.title || 'N/A'}</td>
            <td>${kpi.description || 'N/A'}</td>
            <td>${kpi.target || 'N/A'}</td>
            <td>${kpi.timeline || 'N/A'}</td>
            <td>${kpi.department || 'N/A'}</td>
            <td style="font-weight: bold; color: ${kpi.status === 'Closed' ? 'green' : 'orange'}">${kpi.status}</td>
          </tr>`;
      }).join('');

    if (!printRowsHtml) {
      alert("No active KPI records found for the selected personnel configurations.");
      printWindow.close();
      return;
    }

    const html = `
      <html>
        <head>
          <title>KPI Report - Administrative Archive</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #f4f5f7; }
            h1 { font-size: 20px; color: #333; }
          </style>
        </head>
        <body>
          <h1>Workforce Evaluation & KPI Report</h1>
          <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Target Department:</strong> ${selectedDept || 'All Departments'}</p>
          <table>
            <thead>
              <tr>
                <th>Employee Code</th>
                <th>Employee Name</th>
                <th>KPI Title</th>
                <th>Description</th>
                <th>Target Objective</th>
                <th>Timeline Target</th>
                <th>Department</th>
                <th>Lifecycle Status</th>
              </tr>
            </thead>
            <tbody>
              ${printRowsHtml}
            </tbody>
          </table>
        </body>
      </html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const archiveYear = async () => {
    try {
      const { data } = await api.post(`/kpi/archive/${year}`);
      setMessage(data.message);
    } catch (err) {
      setMessage('Error archiving KPIs');
    }
  };

  const revertYear = async () => {
    try {
      const { data } = await api.post(`/kpi/archive/revert/${year}`);
      setMessage(data.message);
    } catch (err) {
      setMessage('Error reverting KPIs');
    }
  };

  // Safe client filters cross-referencing live employee kpi targets
  const filteredEmployees = employees.filter(e => {
    const matchedKpi = kpis.find(k => {
      const kpiEmpId = k.employeeId?._id ? String(k.employeeId._id) : String(k.employeeId || '');
      return kpiEmpId === String(e._id);
    });
    const currentStatus = matchedKpi ? matchedKpi.status : '';

    return (
      (filterStatus ? currentStatus === filterStatus : true) &&
      (selectedDept ? e.department === selectedDept : true)
    );
  });

  // Chart configs
  const statusData = {
    labels: Object.keys(deptAnalytics),
    datasets: [
      { label: 'Approved', data: Object.values(deptAnalytics).map(d => d.approved), backgroundColor: 'green' },
      { label: 'Pending', data: Object.values(deptAnalytics).map(d => d.pending), backgroundColor: 'orange' },
      { label: 'Rejected', data: Object.values(deptAnalytics).map(d => d.rejected), backgroundColor: 'red' }
    ]
  };

  const ratingData = {
    labels: Object.keys(ratings),
    datasets: [
      { label: 'Average Rating', data: Object.values(ratings), backgroundColor: 'blue' }
    ]
  };

  if (user?.role !== 'HR') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>This dashboard is only available to authorized HR personnel.</p>
      </div>
    );
  }



    return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <img src="/s3-logo.png" alt="S3 Technologies" className="sn-logo" />
      <div className="page-watermark">
        <img src="/s3-watermark.png" alt="S3 Technologies" />
      </div>
      <h2>HR Dashboard</h2>
      <p>Welcome {user?.name} ({user?.role})</p>
      <button className="logout-btn" onClick={() => { logout(); navigate('/'); }}>Logout</button>

      {/* Audit Logs Button for HR */}
      {user?.role === 'HR' && (
        <div style={{ marginTop: '20px' }}>
          <button onClick={() => navigate('/auditlogs')}>
            Go to Audit Logs
          </button>
        </div>
      )}

      {/* Filters Configuration */}
      <div style={{ margin: '20px 0', padding: '15px', background: '#f8f9fa', borderRadius: '6px' }}>
        <label style={{ fontWeight: 'bold' }}>Filter by Department: </label>
        <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} style={{ padding: '5px' }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <label style={{ marginLeft: '20px', fontWeight: 'bold' }}>Filter by Status: </label>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '5px' }}>
          <option value="">All</option>
          <option value="Submitted">Submitted (Pending Supervisor)</option>
          <option value="SupervisorApproved">SupervisorApproved</option>
          <option value="DeptHeadApproved">DeptHeadApproved</option>
          <option value="Closed">Closed</option>
          <option value="Rejected">Rejected</option>
        </select>

        <label style={{ marginLeft: '20px', fontWeight: 'bold' }}>Filter/Archive Year: </label>
        <input
          type="number"
          value={year}
          onChange={e => setYear(e.target.value)}
          placeholder="e.g. 2026"
          style={{ padding: '5px', width: '100px' }}
        />

        <button style={{ marginLeft: '10px', padding: '5px 10px', cursor: 'pointer' }} onClick={archiveYear}>
          Archive Year
        </button>
        <button style={{ marginLeft: '10px', padding: '5px 10px', cursor: 'pointer' }} onClick={revertYear}>
          Revert Archive
        </button>
        {message && <span style={{ marginLeft: '10px', color: 'blue', fontWeight: 'bold' }}>{message}</span>}
      </div>

      {/* Employee & KPI Action Table */}
      <table border="1" cellPadding="8" style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ background: '#e9ecef' }}>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={
                  filteredEmployees.length > 0 &&
                  selectedEmployees.length === filteredEmployees.length
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedEmployees(filteredEmployees.map(emp => emp._id));
                  } else {
                    setSelectedEmployees([]);
                  }
                }}
              />
              <span style={{ marginLeft: '5px' }}>Select All</span>
            </th>
            <th>Year</th>
            <th>Employee Code</th>
            <th>Name</th>
            <th>Department</th>
            <th>Active KPI Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.map(e => {
            const matchedKpi = kpis.find(k => {
              const kpiEmpId = k.employeeId?._id ? String(k.employeeId._id) : String(k.employeeId || '');
              return kpiEmpId === String(e._id);
            });

            const displayYear = matchedKpi ? matchedKpi.year : 'N/A';
            const displayStatus = matchedKpi ? matchedKpi.status : 'No KPI Submitted';

            if (year && matchedKpi && String(matchedKpi.year) !== String(year)) {
              return null;
            }

            return (
              <tr key={e._id} style={{ background: selectedEmployees.includes(e._id) ? '#f1f3f5' : '#fff' }}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(e._id)}
                    onChange={() => toggleSelect(e._id)}
                  />
                </td>
                <td>{displayYear}</td>
                <td>{e.employeeId || 'N/A'}</td>
                <td><strong>{e.name}</strong></td>
                <td>{e.department || 'N/A'}</td>
                <td>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    background: displayStatus === 'Closed' || displayStatus === 'DeptHeadApproved' ? '#d4edda' : displayStatus === 'Rejected' ? '#f8d7da' : '#fff3cd',
                    color: displayStatus === 'Closed' || displayStatus === 'DeptHeadApproved' ? '#155724' : displayStatus === 'Rejected' ? '#721c24' : '#856404'
                  }}>
                    {displayStatus}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Global Actions Management */}
      <div style={{ marginTop: '15px' }}>
        <button 
          onClick={handleForceAcceptance} 
          style={{ padding: '8px 15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}
        >
          Force Accept & Close Selected
        </button>
        <button 
          onClick={exportPDF} 
          style={{ padding: '8px 15px', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Export PDF Report
        </button>
      </div>

      {/* Overall Ratings KPI Section */}
      <h3 style={{ marginTop: '30px' }}>Overall Average Corporate Rating</h3>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>{overallRating || '0.0'}</div>

      {/* Analytics Visualization Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
        <div>
          <h3>Department‑wise KPI Status Breakdown</h3>
          <Bar id="deptStatusChart" data={statusData} />
        </div>
        <div>
          <h3>Department‑wise Evaluated Ratings</h3>
          <Bar id="deptRatingChart" data={ratingData} />
        </div>
      </div>

      <div style={{ width: '400px', margin: '30px auto' }}>
        <h3 style={{ textAlign: 'center' }}>Overall Enterprise KPI Status Distribution</h3>
        <Pie id="overallStatusChart" data={{
          labels: ['Approved (Closed)', 'Pending Review', 'Rejected'],
          datasets: [
            {
              data: [
                kpis.filter(k => k.status === 'Closed' || k.status === 'DeptHeadApproved').length,
                kpis.filter(k => k.status === 'Submitted' || k.status === 'SupervisorApproved').length,
                kpis.filter(k => k.status === 'Rejected').length
              ],
              backgroundColor: ['#28a745', '#ffc107', '#dc3545']
            }
          ]
        }} />
      </div>

      {/* AI Insights Segment */}
      {aiInsights && (aiInsights.prediction || aiInsights.sentiment) && (
        <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ced4da', borderRadius: '6px', background: '#f8f9fa' }}>
          <h3 style={{ color: '#6c757d', marginTop: 0 }}>🧠 Predictive AI Compliance Insights</h3>
          <p><strong>Operational Prediction:</strong> {aiInsights.prediction || 'No predictive trends calculated yet.'}</p>
          <p><strong>Workforce Sentiment:</strong> {aiInsights.sentiment || 'Awaiting feedback data loops.'}</p>
          <p><strong>Risk Identifications:</strong> {aiInsights.risks || 'No immediate anomalies flagged.'}</p>
          <p><strong>Strategic Recommendations:</strong> {aiInsights.recommendations || 'Maintain standard evaluation pacing.'}</p>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;
