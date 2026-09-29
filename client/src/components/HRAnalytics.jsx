client/src/components/HRAnalytics.jsx

import React, { useEffect, useState } from 'react';
import api from '../axiosConfig';
import { Bar, Pie, Radar } from 'react-chartjs-2';

const HRAnalytics = ({ user, logout }) => {
  const [deptAnalytics, setDeptAnalytics] = useState({});
  const [ratings, setRatings] = useState({});
  const [overallRating, setOverallRating] = useState(0);
  const [aiInsights, setAiInsights] = useState({});

  useEffect(() => {
    async function fetchData() {
      const resDept = await api.get('/kpi/analytics');
      setDeptAnalytics(resDept.data);

      const resRatings = await api.get('/kpi/ratings');
      setRatings(resRatings.data);

      const resOverall = await api.get('/kpi/ratings/overall');
      setOverallRating(resOverall.data.overall);

      const resAI = await api.get('/kpi/ai-insights');
      setAiInsights(resAI.data);
    }
    fetchData();
  }, []);

  // Bar chart for KPI status by department
  const statusData = {
    labels: Object.keys(deptAnalytics),
    datasets: [
      {
        label: 'Approved',
        data: Object.values(deptAnalytics).map(d => d.approved),
        backgroundColor: 'green'
      },
      {
        label: 'Pending',
        data: Object.values(deptAnalytics).map(d => d.pending),
        backgroundColor: 'orange'
      },
      {
        label: 'Rejected',
        data: Object.values(deptAnalytics).map(d => d.rejected),
        backgroundColor: 'red'
      }
    ]
  };

  // Ratings chart
  const ratingData = {
    labels: Object.keys(ratings),
    datasets: [
      {
        label: 'Average Rating',
        data: Object.values(ratings),
        backgroundColor: 'blue'
      }
    ]
  };

  return (
    <div>
      <h2>HR Analytics</h2>
      <p>Welcome {user?.name} ({user?.role})</p>
      <button onClick={logout}>Logout</button>

      <h3>Department‑wise KPI Status</h3>
      <Bar data={statusData} />

      <h3>Department‑wise Ratings</h3>
      <Bar data={ratingData} />

      <h3>Overall Average Rating</h3>
      <p>{overallRating}</p>

      <h3>AI Insights</h3>
      <ul>
        <li>Predictive KPI Success: {aiInsights.prediction}</li>
        <li>Sentiment Trends: {aiInsights.sentiment}</li>
        <li>Risk Alerts: {aiInsights.risks}</li>
        <li>Recommendations: {aiInsights.recommendations}</li>
      </ul>
    </div>
  );
};

export default HRAnalytics;
