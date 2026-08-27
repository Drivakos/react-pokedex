import React, { useEffect, useState } from 'react';
import { Save, Upload } from 'lucide-react';

interface TeamEditorHeaderProps {
  teamName: string;
  onBack: () => void;
  onExport: () => void;
  exportDisabled: boolean;
  onRename: (name: string) => Promise<boolean>;
}

export const TeamEditorHeader: React.FC<TeamEditorHeaderProps> = ({ 
  teamName, 
  onBack, 
  onExport, 
  exportDisabled,
  onRename,
}) => {
  const [draftName, setDraftName] = useState(teamName);
  const [saving, setSaving] = useState(false);
  const normalizedName = draftName.trim();
  const nameChanged = normalizedName !== teamName;

  useEffect(() => setDraftName(teamName), [teamName]);

  const handleRename = async () => {
    if (!normalizedName || !nameChanged || saving) return;
    setSaving(true);
    try {
      const success = await onRename(normalizedName);
      if (!success) setDraftName(teamName);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sd-panel">
      <div className="sd-header">
        <button className="sd-header-btn" onClick={onBack}>
          ‹ List
        </button>
        <input
          className="sd-team-name-input"
          value={draftName}
          onChange={event => setDraftName(event.target.value)}
          onBlur={() => void handleRename()}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleRename();
            }
            if (event.key === 'Escape') setDraftName(teamName);
          }}
          aria-label="Team name"
          maxLength={80}
          disabled={saving}
        />
        {nameChanged && normalizedName && (
          <button className="sd-header-btn" onClick={() => void handleRename()} disabled={saving}>
            <Save size={12} style={{ marginRight: 3 }} />
            {saving ? 'Saving' : 'Save name'}
          </button>
        )}
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
