//client/src/components/KPIForm.jsx

import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import api from '../../services/api';

const KPIForm = ({ onKpiCreated }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

  const token = localStorage.getItem("token"); // Adjust key if yours is named differently (e.g., 'authToken')

  if (!token) {
    setErrorMessage("Authentication token not found. Please log in again.");
    return;
  }

    try {
      // const res = await api.post("/api/kpi/submit", {
      //   title,
      //   description,
      //   target,
      //   timeline,
      //   department,
      //   year,
      // });

      const res = await axios.post(
      '/api/kpi/submit',
      {
        title,
        description,
        target,
        timeline,
        department,
        year: Number(year) // Ensures year is sent as a number
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

      setSuccessMessage("KPI submitted successfully!");
      setTitle("");
      setDescription("");
      setTarget("");
      setTimeline("");
      setDepartment("");
      setYear("");

      if (onKpiCreated) onKpiCreated(res.data);
    } catch (err) {
    console.error("Submission error:", err);
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      "Failed to create KPI. Please try again.";
    setErrorMessage(message);
  }
};

  const handleBack = () => {
    if (user?.role === 'Employee') {
      navigate('/kpis');
    } else if (user?.role === 'Supervisor' || user?.role === 'DeptHead') {
      navigate('/auditlogs');
    } else if (user?.role === 'HR') {
      navigate('/hr');
    }
  };

  return (
    
    <form className="kpi-form" onSubmit={handleSubmit}>
      <h2>Create KPI</h2>

      {errorMessage && <div className="banner error-banner">{errorMessage}</div>}
      {successMessage && (
        <div className="banner success-banner">{successMessage}</div>
      )}

      <input
        type="text"
        placeholder="KPI Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />

      <input
        type="text"
        placeholder="Target (e.g., 90% customer satisfaction)"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        required
      />

      <input
        type="text"
        placeholder="Timeline (e.g., Q4 2026)"
        value={timeline}
        onChange={(e) => setTimeline(e.target.value)}
        required
      />

      <input
        type="text"
        placeholder="Department"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        required
      />

      <input
        type="number"
        placeholder="Year"
        value={year}
        onChange={(e) => setYear(e.target.valueAsNumber || '')}
        required
        style={{ position: 'relative', zIndex: 999, pointerEvents: 'auto' }}
      />


      <button type="submit">Submit KPI</button>
    </form>
  );
};

export default KPIForm;
