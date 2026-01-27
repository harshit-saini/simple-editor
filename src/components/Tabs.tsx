import React from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';

const Tabs: React.FC = () => {
  const { openFiles, activeFile, selectFile, closeFile } = useFileSystem();

  return (
    <div style={{ display: 'flex', backgroundColor: '#252526', overflowX: 'auto', borderBottom: '1px solid #333' }}>
      {openFiles.map((fileName) => (
        <div
          key={fileName}
          onClick={() => selectFile(fileName)}
          style={{
            padding: '8px 15px',
            backgroundColor: activeFile === fileName ? '#1e1e1e' : '#2d2d2d',
            color: activeFile === fileName ? '#fff' : '#969696',
            cursor: 'pointer',
            borderRight: '1px solid #252526',
            display: 'flex',
            alignItems: 'center',
            minWidth: '100px',
            justifyContent: 'space-between',
            borderTop: activeFile === fileName ? '1px solid #007acc' : '1px solid transparent',
          }}
        >
          <span style={{ marginRight: '10px' }}>{fileName}</span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              closeFile(fileName);
            }}
            style={{ fontSize: '14px', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', ':hover': { backgroundColor: '#444' } } as React.CSSProperties}
          >
            ×
          </span>
        </div>
      ))}
    </div>
  );
};

export default Tabs;
