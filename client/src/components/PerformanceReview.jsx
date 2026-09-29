//client/src/components/PerformanceReview.jsx

import React, { useState } from 'react';
import axios from 'axios';

const PerformanceReview = () => {
  const [rating, setRating] = useState('');

  const submitReview = async () => {
    await axios.post('/api/kpi/123/review', { rating });
    alert('Review Submitted');
  };

  return (
    <div>
      <h2>Performance Review</h2>
      <input placeholder="Rating" value={rating} onChange={e => setRating(e.target.value)} />
      <button onClick={submitReview}>Submit Review</button>
    </div>
  );
};

export default PerformanceReview;
