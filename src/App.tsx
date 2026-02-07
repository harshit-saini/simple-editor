import { useState, useCallback } from 'react';
import CodeEditor from './components/CodeEditor';
import Console, { LogEntry } from './components/Console';
import FileExplorer from './components/FileExplorer';
import Tabs from './components/Tabs';
import { useFileSystem } from './contexts/FileSystemContext';
import { executeCode, terminateExecution } from './utils/executor';

function App() {
  const { activeFile, files, updateFile, languageMode, setLanguageMode } = useFileSystem();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
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

    addLog({ type: 'info', message: [`Executing ${activeFile}...`] });
    setIsExecuting(true);
    
    // Small timeout to allow UI to update
    setTimeout(() => {
        try {
            // executeCode now handles transpilation, module resolution, and routing by language
            executeCode(
                activeFile, 
                files, 
                addLog, 
                (htmlContent) => {
                    setPreviewContent(htmlContent);
                    setShowPreview(true);
                },
                () => setIsExecuting(false)
            );
        } catch (err: any) {
            addLog({ type: 'error', message: [err.message] });
            setIsExecuting(false);
        }
    }, 10);
  };

  const handleStop = () => {
      terminateExecution();
      setIsExecuting(false);
      addLog({ type: 'warn', message: ['Execution stopped by user.'] });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--md-bg-root)', color: 'var(--md-text-high)' }}>
      {/* Top App Bar */}
      <div style={{ 
        height: '48px', /* Standard Material App Bar Height (dense) */
        backgroundColor: 'var(--md-surface-2)', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 16px',
        boxShadow: 'var(--md-shadow-1)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ fontWeight: '500', fontSize: '1.1rem', color: 'var(--md-text-high)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--md-primary)' }}>&lt;/&gt;</span> TS Editor Pro
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--md-text-medium)' }}>MODE:</label>
                <select 
                    value={languageMode} 
                    onChange={(e) => {
                        const mode = e.target.value as any;
                        if (window.confirm('Switching language will reset your workspace. Are you sure?')) {
                            handleClearLogs();
                            setLanguageMode(mode);
                        }
                    }}
                    style={{
                        backgroundColor: 'var(--md-surface-1)',
                        color: 'var(--md-text-high)',
                        border: '1px solid var(--md-border-color)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.85rem',
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <option value="node">Node.js (TS/JS)</option>
                    <option value="python">Python</option>
                    <option value="html">HTML/CSS</option>
                    <option value="markdown">Markdown</option>
                    <option value="sql">SQL (SQLite)</option>
                    <option value="react">React (TSX)</option>
                    <option value="go">Go (Wasm)</option>
                </select>
            </div>
        </div>

        {isExecuting ? (
            <button 
            className="btn-material"
            style={{ backgroundColor: '#ff6b6b', color: 'white' }}
            onClick={handleStop}
            >
            <span>⏹</span> STOP
            </button>
        ) : (
            <button 
            className="btn-material btn-primary"
            onClick={handleRun}
            >
            <span>▶</span> RUN
            </button>
        )}
      </div>

      {/* Main Layout Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Sidebar: File Explorer */}
        <FileExplorer />

        {/* Center: Editor Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Tabs Bar */}
          <Tabs />
          
          {/* Main Content Area: Editor + Preview */}
          <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
              {/* Code Editor */}
              <div style={{ flex: 1, position: 'relative', display: showPreview ? 'none' : 'block' }}>
                {activeFileObj ? (
                   <CodeEditor 
                      code={code} 
                      onChange={handleCodeChange} 
                      language={language}
                      files={files}
                      fileName={activeFile || ''}
                   />
                ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--md-text-disabled)' }}>
                        Select a file to start editing
                    </div>
                )}
              </div>

               {/* Preview Pane - as a floating or split panel */}
               {showPreview && (
                 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: 'var(--md-divider)', backgroundColor: '#fff' }}>
                     <div style={{ 
                         height: '36px', 
                         backgroundColor: '#f5f5f5', /* Light theme wrapper for preview header */
                         color: '#333', 
                         display: 'flex', 
                         justifyContent: 'space-between', 
                         alignItems: 'center', 
                         padding: '0 8px',
                         borderBottom: '1px solid #e0e0e0' 
                     }}>
                         <span style={{ fontWeight: 500, fontSize: '0.8rem' }}>PREVIEW</span>
                         <button 
                            onClick={() => setShowPreview(false)} 
                            style={{ 
                                cursor: 'pointer', 
                                border: 'none', 
                                background: 'transparent',
                                color: '#666',
                                fontWeight: 'bold'
                            }}
                         >✕</button>
                     </div>
                     <iframe 
                        title="preview"
                        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
                        srcDoc={previewContent || ''}
                     />
                 </div>
               )}
          </div>


          {/* Bottom Panel: Console */}
          <div style={{ height: '220px', borderTop: 'var(--md-divider)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--md-bg-root)' }}>
             <Console logs={logs} onClear={handleClearLogs} />
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default App;
