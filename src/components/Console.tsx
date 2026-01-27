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

  const getLogColor = (type: LogEntry['type']) => {
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
        // fontWeight: 'bold', // Removed duplicate
        fontSize: '0.8rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 500
      }}>
        <span>TERMINAL / CONSOLE</span>
        <button
            onClick={onClear}
            style={{
                background: 'none',
                border: 'none',
                color: 'var(--md-text-medium)',
                cursor: 'pointer',
                fontSize: '0.9rem'
            }}
            title="Clear Console"
        >
            &oslash;
        </button>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 16px',
        fontFamily: 'var(--font-mono)',
        fontSize: '13px'
      }}>
        {logs.map((log, i) => (
          <div key={i} style={{
              color: getLogColor(log.type),
              marginBottom: '4px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              paddingBottom: '2px',
              wordWrap: 'break-word'
          }}>
            <span style={{ color: 'var(--md-text-disabled)', marginRight: '8px', userSelect: 'none' }}>
                {new Date(log.timestamp).toLocaleTimeString()}
            </span>
             {/* Render message lines cleanly */}
            {log.message.map((line, j) => (
                <span key={j}>{line} </span>
            ))}
          </div>
        ))}
        {logs.length === 0 && (
            <div style={{ color: 'var(--md-text-disabled)', fontStyle: 'italic', marginTop: '10px' }}>
                Ready to execute...
            </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default Console;
