import React, { useState, useCallback } from 'react';
import CodeEditor from './components/CodeEditor';
import Console, { LogEntry } from './components/Console';
import FileExplorer from './components/FileExplorer';
import Tabs from './components/Tabs';
import { useFileSystem } from './contexts/FileSystemContext';
import { executeCode } from './utils/executor';

function App() {
  const { activeFile, files, updateFile } = useFileSystem();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // We need to sync the editor content with the active file content
  // When activeFile changes, we want the editor to show the new content.
  // When editor changes, we update the file in context.
  
  const activeFileObj = activeFile ? files[activeFile] : null;
  const code = activeFileObj ? activeFileObj.content : '';
  const language = activeFileObj ? activeFileObj.language : 'typescript';

  const handleCodeChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      updateFile(activeFile, value);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const addLog = useCallback((entry: Omit<LogEntry, 'timestamp'>) => {
    setLogs(prev => [...prev, { ...entry, timestamp: Date.now() }]);
  }, []);

  const handleRun = () => {
    handleClearLogs();
    
    // Check if activeFile is valid
    if (!activeFile || !activeFileObj) {
        addLog({ type: 'warn', message: ['No file selected to run'] });
        return;
    }

    addLog({ type: 'info', message: [`Transpiling and executing ${activeFile}...`] });
    
    // Small timeout to allow UI to update
    setTimeout(() => {
        try {
            // executeCode now handles transpilation and module resolution
            executeCode(activeFile, files, addLog);
        } catch (err: any) {
            addLog({ type: 'error', message: [err.message] });
        }
    }, 10);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', color: '#ccc' }}>
      {/* Top Bar / Header */}
      <div style={{ 
        height: '40px',
        backgroundColor: '#333', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid #111'
      }}>
        <div style={{ fontWeight: 'bold', color: '#fff' }}>TS Editor Pro</div>
        <button 
          onClick={handleRun}
          style={{
            padding: '6px 14px',
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span>▶</span> RUN
        </button>
      </div>

      {/* Main Layout Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Sidebar: File Explorer */}
        <FileExplorer />

        {/* Center: Editor Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Tabs Bar */}
          <Tabs />
          
          {/* Code Editor */}
          <div style={{ flex: 1, position: 'relative' }}>
            {activeFileObj ? (
               <CodeEditor 
                  code={code} 
                  onChange={handleCodeChange} 
                  language={language}
                  files={files}
                  fileName={activeFile || ''}
               />
            ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                    Select a file to edit
                </div>
            )}
          </div>

          {/* Bottom Panel: Console (could be collapsible or resizable, fixed height for now) */}
          <div style={{ height: '200px', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
             <Console logs={logs} onClear={handleClearLogs} />
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default App;
