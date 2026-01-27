import React from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';

const Tabs: React.FC = () => {
  const { openFiles, activeFile, selectFile, closeFile } = useFileSystem();

  return (
    <div style={{ 
        display: 'flex', 
        backgroundColor: 'var(--md-surface-1)', 
        borderBottom: 'var(--md-divider)',
        overflowX: 'auto' 
    }}>
      {openFiles.map((fileName) => (
        <div
          key={fileName}
          onClick={() => selectFile(fileName)}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            backgroundColor: activeFile === fileName ? 'var(--md-surface-2)' : 'transparent',
            color: activeFile === fileName ? 'var(--md-text-high)' : 'var(--md-text-medium)',
            borderRight: 'var(--md-divider)',
            borderTop: activeFile === fileName ? '2px solid var(--md-primary)' : '2px solid transparent', /* Top or Bottom indicator? Material usually bottom, VS Code top. Let's do top for editor feel */
            minWidth: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '0.85rem',
            userSelect: 'none'
          }}
        >
          <span>{fileName}</span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              closeFile(fileName);
            }}
            style={{
              padding: '0 4px',
              borderRadius: '50%',
              fontSize: '12px',
              opacity: 0.6
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✕
          </span>
        </div>
      ))}
    </div>
  );
};

export default Tabs;
