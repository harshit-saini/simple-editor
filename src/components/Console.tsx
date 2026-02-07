import React, { useEffect, useRef } from 'react';
import { VscChevronUp, VscChevronDown, VscClearAll } from 'react-icons/vsc';

export interface LogEntry {
  type: 'log' | 'warn' | 'error' | 'info';
  message: string[];
  timestamp: number;
}

interface ConsoleProps {
  logs: LogEntry[];
  onClear: () => void;
  onToggle: () => void;
  isExpanded: boolean;
}

const Console: React.FC<ConsoleProps> = ({ logs, onClear, onToggle, isExpanded }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

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
        padding: '0 16px', 
        height: '40px',
        borderBottom: isExpanded ? '1px solid #333' : 'none', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.8rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 500,
        backgroundColor: '#252526',
        userSelect: 'none',
        cursor: 'pointer'
      }} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ display: 'flex', alignItems: 'center' }}>
                {isExpanded ? <VscChevronDown /> : <VscChevronUp />}
             </span>
             <span>TERMINAL / CONSOLE</span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
            <button
                onClick={onClear}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--md-text-medium)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '4px'
                }}
                title="Clear Console"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <VscClearAll />
            </button>
            <button
                onClick={onToggle}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--md-text-medium)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '4px'
                }}
                title={isExpanded ? "Minimize" : "Restore"}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                {isExpanded ? <VscChevronDown /> : <VscChevronUp />}
            </button>
        </div>
      </div>
      
      {isExpanded && (
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
      )}
    </div>
  );
};

export default Console;
