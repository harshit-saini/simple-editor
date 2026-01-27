import React, { useState, useCallback } from 'react';
import CodeEditor from './components/CodeEditor';
import Console, { LogEntry } from './components/Console';
import { transpile, executeCode } from './utils/executor';

const DEFAULT_CODE = `// Write your TypeScript/JavaScript here
console.log("Hello from the editor!");

const sum = (a: number, b: number): number => a + b;
console.log("Sum of 2 + 3 =", sum(2, 3));
`;

function App() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const handleCodeChange = (value: string | undefined) => {
    setCode(value || '');
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const addLog = useCallback((entry: Omit<LogEntry, 'timestamp'>) => {
    setLogs(prev => [...prev, { ...entry, timestamp: Date.now() }]);
  }, []);

  const handleRun = () => {
    handleClearLogs();
    addLog({ type: 'info', message: ['Transpiling and executing...'] });
    
    // Small timeout to allow UI to update
    setTimeout(() => {
        try {
            const jsCode = transpile(code);
            executeCode(jsCode, addLog);
        } catch (err: any) {
            addLog({ type: 'error', message: [err.message] });
        }
    }, 10);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ 
        padding: '10px 20px', 
        backgroundColor: '#333', 
        display: 'flex', 
        gap: '10px',
        borderBottom: '1px solid #444',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, marginRight: '20px', color: '#fff' }}>TS Editor</h3>
        <button 
          onClick={handleRun}
          style={{
            padding: '8px 16px',
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          Run Code
        </button>
      </div>

      {/* Main Content - Horizontal Split (Mobile friendly could be vertical) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Editor Pane */}
        <div style={{ flex: 1, borderRight: '1px solid #444' }}>
          <CodeEditor code={code} onChange={handleCodeChange} />
        </div>

        {/* Console Pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Console logs={logs} onClear={handleClearLogs} />
        </div>
      </div>
    </div>
  );
}

export default App;
