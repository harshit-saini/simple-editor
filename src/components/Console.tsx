import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  VscChevronUp,
  VscChevronDown,
  VscClearAll,
  VscScreenFull,
  VscScreenNormal,
  VscCopy,
  VscSave
} from 'react-icons/vsc';

export interface LogEntry {
  type: 'log' | 'warn' | 'error' | 'info';
  message: string[];
  timestamp: number;
}

interface ConsoleProps {
  logs: LogEntry[];
  onClear: () => void;
  onToggle: () => void;
  onMaximize: () => void;
  isExpanded: boolean;
  isMaximized: boolean;
}

const LOG_FILTERS: Array<{ label: string; value: LogEntry['type'] | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Info', value: 'info' },
  { label: 'Log', value: 'log' },
  { label: 'Warn', value: 'warn' },
  { label: 'Error', value: 'error' }
];

const Console: React.FC<ConsoleProps> = ({ logs, onClear, onToggle, onMaximize, isExpanded, isMaximized }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<LogEntry['type'] | 'all'>('all');

  useEffect(() => {
    if (isExpanded) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const filteredLogs = useMemo(() => {
    if (activeFilter === 'all') return logs;
    return logs.filter((log) => log.type === activeFilter);
  }, [activeFilter, logs]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return '#ff6f7c';
      case 'warn':
        return '#f8c75a';
      case 'info':
        return '#79b8ff';
      default:
        return '#d2dcf5';
    }
  };

  const serializeLogs = () => {
    return logs
      .map((log) => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        return `[${time}] [${log.type.toUpperCase()}] ${log.message.join(' ')}`;
      })
      .join('\n');
  };

  const handleCopyLogs = async () => {
    if (logs.length === 0 || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(serializeLogs());
    } catch {
      // Ignore clipboard permission errors.
    }
  };

  const handleDownloadLogs = () => {
    if (logs.length === 0) return;

    const blob = new Blob([serializeLogs()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `console-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="console-panel">
      <div className="console-header" onClick={onToggle}>
        <div className="console-title-wrap">
          <span className="console-chevron">
            {isExpanded ? <VscChevronDown /> : <VscChevronUp />}
          </span>
          <span className="console-title">Terminal / Console</span>
          <span className="console-count">{logs.length} entries</span>
        </div>

        <div className="console-controls" onClick={(event) => event.stopPropagation()}>
          <button className="icon-button" onClick={onClear} title="Clear Console">
            <VscClearAll />
          </button>
          <button
            className="icon-button"
            onClick={handleCopyLogs}
            title="Copy Logs"
            disabled={logs.length === 0}
          >
            <VscCopy />
          </button>
          <button
            className="icon-button"
            onClick={handleDownloadLogs}
            title="Download Logs"
            disabled={logs.length === 0}
          >
            <VscSave />
          </button>
          <button
            className="icon-button"
            onClick={onMaximize}
            title={isMaximized ? 'Restore Size' : 'Maximize'}
          >
            {isMaximized ? <VscScreenNormal /> : <VscScreenFull />}
          </button>
          <button
            className="icon-button"
            onClick={onToggle}
            title={isExpanded ? 'Minimize' : 'Restore'}
          >
            {isExpanded ? <VscChevronDown /> : <VscChevronUp />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="console-filter-row">
            {LOG_FILTERS.map((filter) => (
              <button
                key={filter.value}
                className={`console-filter-btn ${activeFilter === filter.value ? 'is-active' : ''}`}
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="console-body">
            {filteredLogs.map((log, index) => (
              <div key={`${log.timestamp}-${index}`} className="console-line" style={{ color: getLogColor(log.type) }}>
                <span className="console-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="console-message">{log.message.join(' ')}</span>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="console-empty">Ready to execute...</div>
            )}
            <div ref={endRef} />
          </div>
        </>
      )}
    </div>
  );
};

export default Console;
