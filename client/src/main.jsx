//client/src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import "./chartSetup"; // must be at the very top


// Create root and render App
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
