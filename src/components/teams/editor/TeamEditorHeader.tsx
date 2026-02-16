import React from 'react';
import { Upload } from 'lucide-react';

interface TeamEditorHeaderProps {
  teamName: string;
  onBack: () => void;
  onExport: () => void;
  exportDisabled: boolean;
}

export const TeamEditorHeader: React.FC<TeamEditorHeaderProps> = ({ 
  teamName, 
  onBack, 
  onExport, 
  exportDisabled 
}) => {
  return (
    <div className="sd-panel">
      <div className="sd-header">
        <button className="sd-header-btn" onClick={onBack}>
          ‹ List
        </button>
        <input
          className="sd-team-name-input"
          value={teamName}
          readOnly
        />
        <button 
          className="sd-header-btn" 
          onClick={onExport} 
          disabled={exportDisabled}
        >
          <Upload size={12} style={{ marginRight: 3 }} />
          Export
        </button>
      </div>
    </div>
  );
};
