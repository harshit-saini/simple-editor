import React from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';

const Tabs: React.FC = () => {
  const { openFiles, activeFile, selectFile, closeFile } = useFileSystem();

  return (
    <div className="tabs-bar" role="tablist" aria-label="Open files">
      {openFiles.map((fileName) => {
        const isActive = activeFile === fileName;

        return (
          <button
            type="button"
            key={fileName}
            onClick={() => selectFile(fileName)}
            className={`tab-item ${isActive ? 'is-active' : ''}`}
            role="tab"
            aria-selected={isActive}
          >
            <span className="tab-label">{fileName}</span>
            <span
              onClick={(event) => {
                event.stopPropagation();
                closeFile(fileName);
              }}
              className="tab-close"
              title={`Close ${fileName}`}
              aria-label={`Close ${fileName}`}
            >
              x
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;