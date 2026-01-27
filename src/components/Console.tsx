import React, { useEffect, useRef } from 'react';

export interface LogEntry {
  type: 'log' | 'warn' | 'error' | 'info';
  message: string[];
  timestamp: number;
}

interface ConsoleProps {
  logs: LogEntry[];
  onClear: () => void;
}

const Console: React.FC<ConsoleProps> = ({ logs, onClear }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return '#ff6b6b';
      case 'warn': return '#feca57';
      case 'info': return '#54a0ff';
      default: return '#c8d6e5';
    }
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#1e1e1e', 
      borderTop: '1px solid #333',
      fontFamily: 'monospace' 
    }}>
      <div style={{ 
        padding: '8px 16px', 
        borderBottom: '1px solid #333', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 'bold',
        color: '#ccc'
      }}>
        <span>CONSOLE</span>
        <button 
          onClick={onClear}
          style={{
            background: 'transparent',
            border: '1px solid #555',
            color: '#ccc',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
        >
          Clear
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: '4px', display: 'flex' }}>
            <span style={{ color: '#666', marginRight: '8px', minWidth: '80px' }}>
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span style={{ color: getColor(log.type), whiteSpace: 'pre-wrap' }}>
              {log.message.join(' ')}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default Console;
