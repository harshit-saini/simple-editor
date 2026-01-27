import { useState, useCallback } from 'react';
import CodeEditor from './components/CodeEditor';
import Console, { LogEntry } from './components/Console';
import FileExplorer from './components/FileExplorer';
import Tabs from './components/Tabs';
import { useFileSystem } from './contexts/FileSystemContext';
import { executeCode } from './utils/executor';

function App() {
  const { activeFile, files, updateFile, languageMode, setLanguageMode } = useFileSystem();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
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
    
    // Small timeout to allow UI to update
    setTimeout(() => {
        try {
            // executeCode now handles transpilation, module resolution, and routing by language
            executeCode(activeFile, files, addLog, (htmlContent) => {
                setPreviewContent(htmlContent);
                setShowPreview(true);
            });
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontWeight: 'bold', color: '#fff' }}>TS Editor Pro</div>
            <select 
                value={languageMode} 
                onChange={(e) => {
                    const mode = e.target.value as any;
                    if (window.confirm('Switching language will reset your workspace. Are you sure?')) {
                        setLanguageMode(mode);
                    }
                }}
                style={{
                    backgroundColor: '#444',
                    color: '#fff',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    padding: '2px 5px',
                    fontSize: '12px'
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
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                        Select a file to edit
                    </div>
                )}
              </div>

               {/* Preview Pane */}
               {showPreview && (
                 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #333', backgroundColor: '#fff' }}>
                     <div style={{ padding: '5px', backgroundColor: '#eee', color: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc' }}>
                         <span style={{ fontWeight: 'bold', fontSize: '12px' }}>HTML Preview</span>
                         <button onClick={() => setShowPreview(false)} style={{ cursor: 'pointer', border: '1px solid #999', padding: '2px 8px', borderRadius: '3px', background: '#fff' }}>Close</button>
                     </div>
                     <iframe 
                        title="preview"
                        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
                        srcDoc={previewContent || ''}
                     />
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
