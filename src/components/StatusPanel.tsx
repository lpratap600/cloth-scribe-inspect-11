
import React from 'react';

interface StatusPanelProps {
  status: string;
  onReset: () => void;
}

const StatusPanel = ({ status, onReset }: StatusPanelProps) => {
  return (
    <div className="sp-container">
      <div className="sp-content">
        <p className="sp-status-text">{status}</p>
        <button onClick={onReset} className="sp-reset-button">Reset Session</button>
      </div>
    </div>
  );
};

export default StatusPanel;
