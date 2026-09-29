//client/src/components/KPIAnalytics.jsx

import React from 'react';
import { Bar } from 'react-chartjs-2';

const KPIAnalytics = ({ data = [] }) => {
  const chartData = {
    labels: data.map(k => k.title),
    datasets: [{
      label: 'Approved KPIs',
      data: data.map(k => k.status === 'DeptHeadApproved' ? 1 : 0),
      backgroundColor: 'rgba(75,192,192,0.6)'
    }]
  };
  return (
    <div>
      <h2>KPI Analytics</h2>
      <Bar data={chartData} />
    </div>
  );
};

export default KPIAnalytics;
