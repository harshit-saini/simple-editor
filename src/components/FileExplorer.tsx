import React, { useMemo, useState } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { VscNewFile, VscTrash, VscJson, VscMarkdown, VscSearch, VscFile } from 'react-icons/vsc';
import { SiTypescript, SiReact, SiJavascript, SiHtml5, SiCss3, SiPython, SiGo, SiSqlite } from 'react-icons/si';

const FileExplorer: React.FC = () => {
  const { files, activeFile, selectFile, createFile, deleteFile } = useFileSystem();
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const sortedFiles = useMemo(() => {
    return Object.keys(files).sort((left, right) => left.localeCompare(right));
  }, [files]);

  const filteredFiles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return sortedFiles;
    return sortedFiles.filter((fileName) => fileName.toLowerCase().includes(query));
  }, [searchTerm, sortedFiles]);

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const nextName = newFileName.trim();
    if (!nextName) return;

    createFile(nextName);
    setNewFileName('');
    setIsCreating(false);
  };

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <span>Explorer</span>
        <button
          className="icon-button"
          onClick={() => setIsCreating(true)}
          title="New File"
        >
          <VscNewFile />
        </button>
      </div>

      <div className="explorer-search">
        <VscSearch />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Filter files"
          aria-label="Filter files"
        />
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="create-file-form">
          <input
            autoFocus
            type="text"
            value={newFileName}
            onChange={(event) => setNewFileName(event.target.value)}
            placeholder="filename.ext"
            onBlur={() => setIsCreating(false)}
          />
        </form>
      )}

      <div className="explorer-meta">{filteredFiles.length} files</div>

      <div className="file-list" role="listbox" aria-label="Workspace files">
        {filteredFiles.length === 0 ? (
          <div className="explorer-empty">No files match your search.</div>
        ) : (
          filteredFiles.map((fileName) => {
            const extension = fileName.split('.').pop();
            const isActive = activeFile === fileName;

            return (
              <div
                key={fileName}
                onClick={() => selectFile(fileName)}
                className={`file-item ${isActive ? 'is-active' : ''}`}
                role="option"
                aria-selected={isActive}
              >
                <div className="file-item-main">
                  <span className="file-icon" style={{ color: getFileIconColor(extension) }}>
                    {getFileIcon(fileName)}
                  </span>
                  <span className="file-name">{fileName}</span>
                </div>

                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    if (window.confirm(`Delete ${fileName}?`)) {
                      deleteFile(fileName);
                    }
                  }}
                  className="file-delete-btn"
                  title="Delete file"
                  aria-label={`Delete ${fileName}`}
                >
                  <VscTrash />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop();

  switch (extension) {
    case 'ts':
      return <SiTypescript />;
    case 'tsx':
      return <SiReact />;
    case 'js':
    case 'jsx':
      return <SiJavascript />;
    case 'html':
      return <SiHtml5 />;
    case 'css':
      return <SiCss3 />;
    case 'py':
      return <SiPython />;
    case 'json':
      return <VscJson />;
    case 'md':
      return <VscMarkdown />;
    case 'sql':
      return <SiSqlite />;
    case 'go':
      return <SiGo />;
    default:
      return <VscFile />;
  }
};

const getFileIconColor = (extension: string | undefined) => {
  switch (extension) {
    case 'ts':
      return '#56b6ff';
    case 'tsx':
      return '#5ed3f3';
    case 'js':
    case 'jsx':
      return '#f6db74';
    case 'html':
      return '#ff935c';
    case 'css':
      return '#68b7ff';
    case 'py':
      return '#ffda75';
    case 'json':
      return '#c796ff';
    case 'md':
      return '#bbc7d8';
    case 'sql':
      return '#ff868f';
    case 'go':
      return '#63d8ff';
    default:
      return '#9cb0ca';
  }
};

export default FileExplorer;