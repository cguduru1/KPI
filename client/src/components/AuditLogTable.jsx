//client/src/components/AuditLogTable.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../../services/api';

const AuditLogTable = ({ user }) => { 
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    // kpiId: '',
    // userId: '',
    startDate: '',
    endDate: ''
  });
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [year, setYear] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/api/kpi/departments');
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setDepartments([]);
    }
  };
  if (['HR', 'DeptHead', 'Supervisor'].includes(user?.role)) {
    fetchDepartments();
  }
}, [user]);


  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/api/kpi/auditlogs/view', {
        params: { ...filters, page, limit: 20, sortField, sortOrder }
      });
    setLogs(data.logs || []);   // ✅ fallback to empty array
    setPages(data.pages || 1);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setLogs([]); 
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters, sortField, sortOrder]);

  const handleSort = field => {
    if (sortField === field) {
      // toggle order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const archiveYear = async () => {
    try {
      const { data } = await api.post(`/kpi/archive/${year}`);
      setMessage(data.message);
      fetchLogs();
    } catch (err) {
      setMessage('Error archiving KPIs');
    }
  };

  const revertYear = async () => {
    try {
      const { data } = await api.post(`/kpi/archive/revert/${year}`);
      setMessage(data.message);
      fetchLogs();
    } catch (err) {
      setMessage('Error reverting KPIs');
    }
  };

  return (
    <div>
      <h2>Audit Logs</h2>

      {/* Filters */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="date"
          value={filters.startDate || ''}
          onChange={e => setFilters({ ...filters, startDate: e.target.value })}
        />
        <input
          type="date"
          value={filters.endDate || ''}
          onChange={e => setFilters({ ...filters, endDate: e.target.value })}
        />
        <button onClick={fetchLogs}>Apply Filters</button>
      </div>

      {/* Department dropdowns */}
      {user?.role === 'Supervisor' && Array.isArray(departments) && (
        <select
          value={filters.department || ''}
          onChange={e => setFilters({ ...filters, department: e.target.value })}
        >
          <option value="">My Employees</option>
          {departments.map(dep => (
            <option key={dep} value={dep}>{dep}</option>
          ))}
        </select>
      )}

      {user?.role === 'DeptHead' && Array.isArray(departments) && (
        <select
          value={filters.department || ''}
          onChange={e => setFilters({ ...filters, department: e.target.value })}
        >
          <option value="">My Department</option>
          {departments.map(dep => (
            <option key={dep} value={dep}>{dep}</option>
          ))}
        </select>
      )}

      {user?.role === 'HR' && Array.isArray(departments) && (
        <select
          value={filters.department || ''}
          onChange={e => setFilters({ ...filters, department: e.target.value })}
        >
          <option value="">All Departments</option>
          {departments.map(dep => (
            <option key={dep} value={dep}>{dep}</option>
          ))}
        </select>
      )}

       {/* HR-only Archive/Revert Controls */}
      {user?.role === 'HR' && (
        <div style={{ marginBottom: '1rem' }}>
          <label>Year: </label>
          <input
            type="number"
            placeholder="Enter Year"
            value={year}
            onChange={e => setYear(e.target.value)}
          />
          <button style={{ marginLeft: '10px' }} onClick={archiveYear}>
            Archive Year
          </button>
          <button style={{ marginLeft: '10px' }} onClick={revertYear}>
            Revert Archive
          </button>
          {message && <p style={{ color: 'green' }}>{message}</p>}
        </div>
      )}

      {/* Table */}
      <table border="1" cellPadding="8" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th onClick={() => handleSort('action')}>Action</th>
            <th onClick={() => handleSort('kpiId.title')}>KPI Title</th>
            <th onClick={() => handleSort('performedBy.name')}>User Name</th>
            <th>User Email</th>
            <th onClick={() => handleSort('role')}>Role</th>
            <th onClick={() => handleSort('timestamp')}>Timestamp</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.length > 0 ? (
            logs.map(log => (
              <tr key={log._id}>
                <td>{log.action}</td>
                <td>{log.kpiId?.title}</td>
                <td>{log.performedBy?.name}</td>
                <td>{log.performedBy?.email}</td>
                <td>{log.role}</td>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>{log.details}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7">No logs found.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div style={{ marginTop: '1rem' }}>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Prev
        </button>
        <span> Page {page} of {pages} </span>
        <button disabled={page >= pages} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
};

export default AuditLogTable;
