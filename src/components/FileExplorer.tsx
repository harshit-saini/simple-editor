import React, { useState } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';

const FileExplorer: React.FC = () => {
  const { files, activeFile, selectFile, createFile, deleteFile } = useFileSystem();
  const [newFileName, setNewFileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = () => {
    if (newFileName) {
      createFile(newFileName);
      setNewFileName('');
      setIsCreating(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteFile(name);
    }
  };

  return (
    <div style={{ width: '250px', backgroundColor: '#252526', color: '#fff', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', fontWeight: 'bold', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>EXPLORER</span>
        <button 
          onClick={() => setIsCreating(true)}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}
          title="New File"
        >
          +
        </button>
      </div>
      
      {isCreating && (
        <div style={{ padding: '5px 10px' }}>
          <input
            autoFocus
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setIsCreating(false);
            }}
            onBlur={() => setIsCreating(false)}
            placeholder="filename.ts"
            style={{ width: '100%', padding: '4px', backgroundColor: '#3c3c3c', border: '1px solid #007acc', color: 'white' }}
          />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {Object.keys(files).map((fileName) => (
          <div
            key={fileName}
            onClick={() => selectFile(fileName)}
            style={{
              padding: '5px 10px',
              cursor: 'pointer',
              backgroundColor: activeFile === fileName ? '#37373d' : 'transparent',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              userSelect: 'none'
            }}
            className="file-item"
          >
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</span>
            <button
               onClick={(e) => handleDelete(e, fileName)}
               style={{ border: 'none', background: 'none', color: '#aaa', cursor: 'pointer', display: 'none' }}
               className="delete-btn"
            >
              x
            </button>
          </div>
        ))}
      </div>
      <style>{
        `.file-item:hover { background-color: #2a2d2e !important; }
         .file-item:hover .delete-btn { display: block !important; }
        `
      }</style>
    </div>
  );
};

export default FileExplorer;
