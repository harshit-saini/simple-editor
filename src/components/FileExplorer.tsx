import React, { useState } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { VscNewFile, VscTrash, VscJson, VscMarkdown } from 'react-icons/vsc';
import { SiTypescript, SiReact, SiJavascript, SiHtml5, SiCss3, SiPython, SiGo, SiSqlite } from 'react-icons/si';

const FileExplorer: React.FC = () => {
  const { files, activeFile, selectFile, createFile, deleteFile } = useFileSystem();
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName) {
      createFile(newFileName);
      setNewFileName('');
      setIsCreating(false);
    }
  };

  return (
    <div style={{ 
      width: '250px', 
      backgroundColor: 'var(--md-surface-1)', 
      borderRight: 'var(--md-divider)', 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      flexShrink: 0
    }}>
      <div style={{ 
          padding: '12px 16px', 
          fontWeight: 500, 
          fontSize: '0.85rem', 
          color: 'var(--md-text-medium)', 
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: 'var(--md-divider)'
      }}>
        <span>EXPLORER</span>
        <button 
            onClick={() => setIsCreating(true)}
            style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--md-text-medium)', 
                cursor: 'pointer', 
                fontSize: '1.2rem',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px'
            }} 
            title="New File"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--md-primary)'; e.currentTarget.style.backgroundColor = 'var(--md-surface-2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--md-text-medium)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
         <VscNewFile />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {isCreating && (
          <form onSubmit={handleCreate} style={{ padding: '4px 16px' }}>
            <input
              autoFocus
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.ext"
              onBlur={() => setIsCreating(false)}
              style={{
                width: '100%',
                padding: '4px 8px',
                backgroundColor: 'var(--md-bg-root)',
                border: '1px solid var(--md-primary)',
                color: 'var(--md-text-high)',
                borderRadius: '2px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </form>
        )}
        {Object.keys(files).map((fileName) => (
          <div
            key={fileName}
            onClick={() => selectFile(fileName)}
            style={{
              padding: '6px 16px',
              cursor: 'pointer',
              backgroundColor: activeFile === fileName ? 'rgba(144, 202, 249, 0.16)' : 'transparent', // Primary with opacity
              color: activeFile === fileName ? 'var(--md-primary)' : 'var(--md-text-high)',
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderLeft: activeFile === fileName ? '2px solid var(--md-primary)' : '2px solid transparent', // Indicator
              transition: 'background-color 0.1s'
            }}
            className="file-item"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                 <span style={{ fontSize: '1rem', color: getFileIconColor(fileName.split('.').pop()), display: 'flex', alignItems: 'center' }}>
                     {getFileIcon(fileName)}
                 </span>
                 <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</span>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete ${fileName}?`)) {
                    deleteFile(fileName);
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--md-text-disabled)',
                cursor: 'pointer',
                opacity: 0,
                fontSize: '0.9rem',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              className="delete-btn"
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--md-error)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--md-text-disabled)'}
            >
              <VscTrash />
            </button>
          </div>
        ))}
      </div>
      <style>{
        `.file-item:hover { background-color: var(--md-surface-2) !important; }
         .file-item:hover .delete-btn { opacity: 1 !important; }
        `
      }</style>
    </div>
  );
};



const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop();
    switch(ext) {
        case 'ts': return <SiTypescript />;
        case 'tsx': return <SiReact />;
        case 'js': return <SiJavascript />;
        case 'html': return <SiHtml5 />;
        case 'css': return <SiCss3 />;
        case 'py': return <SiPython />;
        case 'json': return <VscJson />;
        case 'md': return <VscMarkdown />;
        case 'sql': return <SiSqlite />;
        case 'go': return <SiGo />;
        default: return <VscNewFile />;
    }
}

const getFileIconColor = (ext: string | undefined) => {
    switch(ext) {
        case 'ts': case 'tsx': return '#42a5f5'; // Blue
        case 'js': case 'jsx': return '#fdd835'; // Yellow
        case 'html': return '#ef6c00'; // Orange
        case 'css': return '#29b6f6'; // Light Blue
        case 'py': return '#ffca28'; // Amber
        case 'json': return '#ab47bc'; // Purple
        case 'md': return '#bdbdbd'; // Grey
        case 'sql': return '#e57373'; // Red
        case 'go': return '#00add8'; // Cyan
        default: return '#9e9e9e';
    }
}

export default FileExplorer;
