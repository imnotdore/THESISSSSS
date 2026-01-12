// src/components/admin/StatCard.jsx - UPDATED VERSION
import React from 'react';
import "./StatCard.css";

const StatCard = ({ 
  title, 
  value, 
  change = 0, 
  icon, 
  color, 
  isStatus = false, 
  isLoading = false 
}) => {
  
  // Loading state
  if (isLoading) {
    return (
      <div className="stat-card-minimal loading">
        <div className="stat-skeleton"></div>
      </div>
    );
  }

  const changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
  const statusClass = typeof value === 'string' && value.toLowerCase();
  
  return (
    <div className="stat-card-minimal" style={{ borderLeftColor: color }}>
      <div className="stat-main">
        <div className="stat-icon-wrapper">
          <div className="stat-icon-minimal" style={{ backgroundColor: `${color}20` }}>
            {icon}
          </div>
        </div>
        
        <div className="stat-content-minimal">
          <div className="stat-value-minimal">
            {isStatus ? value : value.toLocaleString()}
          </div>
          <span className="stat-title-minimal">{title}</span>
        </div>
      </div>
      
      <div className="stat-indicator">
        {!isStatus ? (
          <div className={`stat-change-minimal ${changeType}`}>
            {change > 0 ? '+' : ''}{change}%
          </div>
        ) : (
          <div className={`status-indicator-minimal ${statusClass}`}>
            <span className="status-dot-minimal"></span>
            {value}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;