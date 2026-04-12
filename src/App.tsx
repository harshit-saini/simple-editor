import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeEditor from './components/CodeEditor';
import Console, { LogEntry } from './components/Console';
import FileExplorer from './components/FileExplorer';
import Tabs from './components/Tabs';
import { LanguageMode, useFileSystem } from './contexts/FileSystemContext';
import { executeCode, terminateExecution, fetchSqlSchema } from './utils/executor';
import { VscPlay, VscDebugStop, VscLayoutSidebarLeft, VscCode } from 'react-icons/vsc';
import SchemaViewer from './components/SchemaViewer';

type RunState = 'idle' | 'running' | 'success' | 'error' | 'stopped';

const formatDuration = (durationMs: number | null) => {
  if (durationMs === null) return '--';
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(2)}s`;
};

function App() {
  const { activeFile, files, updateFile, languageMode, setLanguageMode } = useFileSystem();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);
  const [consoleSize, setConsoleSize] = useState<'minimized' | 'normal' | 'maximized'>('normal');
  const [sqlSchema, setSqlSchema] = useState<any[]>([]);
  const [runState, setRunState] = useState<RunState>('idle');
  const [lastRunAt, setLastRunAt] = useState<number | null>(null);
  const [lastRunDurationMs, setLastRunDurationMs] = useState<number | null>(null);
  const runStartedAtRef = useRef<number | null>(null);
  const runHadErrorRef = useRef(false);

  const activeFileObj = activeFile ? files[activeFile] : null;
  const code = activeFileObj?.content ?? '';
  const language = activeFileObj?.language ?? 'typescript';

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (activeFile && value !== undefined) {
      updateFile(activeFile, value);
    }
  }, [activeFile, updateFile]);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const addLog = useCallback((entry: Omit<LogEntry, 'timestamp'>) => {
    if (entry.type === 'error') {
      runHadErrorRef.current = true;
    }
    setLogs((prev) => [...prev, { ...entry, timestamp: Date.now() }]);
  }, []);

  const loadSqlSchema = useCallback(() => {
    fetchSqlSchema((schema) => {
      setSqlSchema(schema);
    });
  }, []);

  useEffect(() => {
    if (languageMode === 'sql') {
      loadSqlSchema();
    }
  }, [languageMode, loadSqlSchema]);

  const handleModeChange = useCallback((mode: LanguageMode) => {
    if (window.confirm('Switching language will reset your workspace. Are you sure?')) {
      handleClearLogs();
      setLanguageMode(mode);
      setPreviewContent(null);
      setShowPreview(false);
      setRunState('idle');
      setLastRunAt(null);
      setLastRunDurationMs(null);
    }
  }, [handleClearLogs, setLanguageMode]);

  const finalizeRun = useCallback((forcedState?: RunState) => {
    const endTime = Date.now();
    if (runStartedAtRef.current !== null) {
      setLastRunDurationMs(endTime - runStartedAtRef.current);
    }
    setLastRunAt(endTime);
    setRunState(forcedState ?? (runHadErrorRef.current ? 'error' : 'success'));
    runStartedAtRef.current = null;
    setIsExecuting(false);
  }, []);

  const handleRun = useCallback(() => {
    handleClearLogs();
    if (consoleSize === 'minimized') {
      setConsoleSize('normal');
    }

    if (!activeFile || !activeFileObj) {
      addLog({ type: 'warn', message: ['No file selected to run'] });
      return;
    }

    runHadErrorRef.current = false;
    runStartedAtRef.current = Date.now();
    setRunState('running');
    setIsExecuting(true);

    setTimeout(() => {
      try {
        executeCode(
          activeFile,
          files,
          addLog,
          (htmlContent) => {
            setPreviewContent(htmlContent);
            setShowPreview(true);
          },
          () => finalizeRun()
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        addLog({ type: 'error', message: [message] });
        finalizeRun('error');
      }
    }, 10);
  }, [activeFile, activeFileObj, addLog, consoleSize, files, finalizeRun, handleClearLogs]);

  const handleStop = useCallback(() => {
    terminateExecution();
    addLog({ type: 'warn', message: ['Execution stopped by user.'] });
    finalizeRun('stopped');
  }, [addLog, finalizeRun]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();
      if (key === 'enter') {
        event.preventDefault();
        if (isExecuting) {
          handleStop();
        } else {
          handleRun();
        }
        return;
      }

      if (key === 'b') {
        event.preventDefault();
        setIsSidebarVisible((prev) => !prev);
        return;
      }

      if (event.key === '`') {
        event.preventDefault();
        setConsoleSize((prev) => (prev === 'minimized' ? 'normal' : 'minimized'));
        return;
      }

      if (key === 'j') {
        event.preventDefault();
        setIsZenMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRun, handleStop, isExecuting]);

  const fileStats = useMemo(() => {
    if (!code) {
      return { lines: 0, characters: 0 };
    }

    return {
      lines: code.split('\n').length,
      characters: code.length
    };
  }, [code]);

  const runStateLabel = useMemo(() => {
    switch (runState) {
      case 'running':
        return 'Running';
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'stopped':
        return 'Stopped';
      case 'idle':
      default:
        return 'Idle';
    }
  }, [runState]);

  const openPreviewInNewTab = useCallback(() => {
    if (!previewContent) return;

    const nextWindow = window.open('', '_blank');
    if (!nextWindow) return;

    nextWindow.document.open();
    nextWindow.document.write(previewContent);
    nextWindow.document.close();
  }, [previewContent]);

  const showSidebar = isSidebarVisible && !isZenMode;
  const showConsole = !isZenMode;

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="topbar-left">
          <button
            className="icon-button"
            onClick={() => setIsSidebarVisible((prev) => !prev)}
            title={showSidebar ? 'Hide Sidebar (Ctrl/Cmd + B)' : 'Show Sidebar (Ctrl/Cmd + B)'}
          >
            <VscLayoutSidebarLeft />
          </button>

          <div className="brand">
            <span className="brand-icon">
              <VscCode size={20} />
            </span>
            <span className="brand-text">Code Studio</span>
          </div>

          <div className="mode-picker">
            <label htmlFor="mode-select">Mode</label>
            <select
              id="mode-select"
              value={languageMode}
              onChange={(event) => handleModeChange(event.target.value as LanguageMode)}
              className="mode-select"
            >
              <option value="node">Node.js (TS/JS)</option>
              <option value="react">React (TSX)</option>
              <option value="html">HTML/CSS/JS</option>
              <option value="python">Python</option>
              <option value="markdown">Markdown</option>
              <option value="sql">SQL (SQLite)</option>
              <option value="go">Go</option>
            </select>
          </div>
        </div>

        <div className="topbar-right">
          <span className={`run-pill run-pill-${runState}`}>{runStateLabel}</span>
          <button className="btn-material" onClick={() => setIsZenMode((prev) => !prev)}>
            {isZenMode ? 'Exit Zen' : 'Zen Mode'}
          </button>
          <button
            className="btn-material"
            onClick={() => setShowPreview((prev) => !prev)}
            disabled={!previewContent}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button
            className="btn-material"
            onClick={openPreviewInNewTab}
            disabled={!previewContent}
          >
            Popout Preview
          </button>
          {isExecuting ? (
            <button
              className="btn-material btn-danger"
              onClick={handleStop}
            >
              <VscDebugStop /> Stop
            </button>
          ) : (
            <button
              className="btn-material btn-primary"
              onClick={handleRun}
            >
              <VscPlay /> Run
            </button>
          )}
        </div>
      </header>

      <div className="workspace-layout">
        {showSidebar && (
          <aside className="sidebar-shell">
            {languageMode === 'sql' && (
              <div className="schema-shell">
                <SchemaViewer schema={sqlSchema} />
              </div>
            )}
            <div className="explorer-shell">
              <FileExplorer />
            </div>
          </aside>
        )}

        <section className="editor-shell">
          <Tabs />

          <div className={`editor-preview-layout ${showPreview ? 'with-preview' : ''}`}>
            <div className="editor-pane">
              {activeFileObj ? (
                <CodeEditor
                  code={code}
                  onChange={handleCodeChange}
                  language={language}
                  files={files}
                  fileName={activeFile ?? ''}
                />
              ) : (
                <div className="empty-state">
                  Select a file to start editing.
                </div>
              )}
            </div>

            {showPreview && (
              <div className="preview-pane">
                <div className="preview-header">
                  <span>Preview</span>
                  <button className="ghost-button" onClick={() => setShowPreview(false)}>
                    Close
                  </button>
                </div>
                <iframe
                  title="preview"
                  className="preview-frame"
                  srcDoc={previewContent ?? ''}
                />
              </div>
            )}
          </div>

          {showConsole && (
            <div
              className={`console-shell ${consoleSize === 'maximized' ? 'is-maximized' : ''}`}
              style={{
                height: consoleSize === 'maximized' ? '100%' : consoleSize === 'normal' ? '240px' : '44px',
                position: consoleSize === 'maximized' ? 'absolute' : 'relative',
                top: consoleSize === 'maximized' ? 0 : 'auto',
                bottom: 0,
                width: '100%',
                zIndex: 25
              }}
            >
              <Console
                logs={logs}
                onClear={handleClearLogs}
                onToggle={() => setConsoleSize((prev) => (prev === 'minimized' ? 'normal' : 'minimized'))}
                onMaximize={() => setConsoleSize((prev) => (prev === 'maximized' ? 'normal' : 'maximized'))}
                isExpanded={consoleSize !== 'minimized'}
                isMaximized={consoleSize === 'maximized'}
              />
            </div>
          )}

          <footer className="status-bar">
            <span>File: {activeFile ?? 'None'}</span>
            <span>Language: {languageMode}</span>
            <span>{fileStats.lines} lines / {fileStats.characters} chars</span>
            <span>Last run: {lastRunAt ? new Date(lastRunAt).toLocaleTimeString() : 'Never'}</span>
            <span>Duration: {formatDuration(lastRunDurationMs)}</span>
            <span className="shortcut-hint">Shortcuts: Ctrl/Cmd+Enter Run, Ctrl/Cmd+B Sidebar, Ctrl/Cmd+` Console, Ctrl/Cmd+J Zen</span>
          </footer>
        </section>
      </div>
    </div>
  );
}

export default App;