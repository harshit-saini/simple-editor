import React, { useState } from 'react';
import { VscTable, VscChevronRight, VscChevronDown, VscSymbolVariable } from 'react-icons/vsc';

interface Column {
    name: string;
    type: string;
}

interface Table {
    tableName: string;
    columns: Column[];
}

interface SchemaViewerProps {
    schema: Table[];
}

const SchemaViewer: React.FC<SchemaViewerProps> = ({ schema }) => {
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

    const toggleTable = (tableName: string) => {
        const newSet = new Set(expandedTables);
        if (newSet.has(tableName)) {
            newSet.delete(tableName);
        } else {
            newSet.add(tableName);
        }
        setExpandedTables(newSet);
    };

    return (
        <div style={{ padding: '0', color: 'var(--md-text-high)' }}>
            <div style={{ padding: '8px 16px', fontWeight: 500, fontSize: '0.85rem', color: 'var(--md-text-medium)', textTransform: 'uppercase', borderBottom: 'var(--md-divider)' }}>
                DATABASE SCHEMA
            </div>
            <div style={{ overflowY: 'auto' }}>
                {schema.length === 0 && <div style={{ padding: '16px', color: 'var(--md-text-disabled)', fontSize: '0.9rem' }}>Loading schema...</div>}
                
                {schema.map(table => (
                    <div key={table.tableName}>
                        <div 
                            onClick={() => toggleTable(table.tableName)}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                padding: '6px 16px', 
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                userSelect: 'none'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--md-surface-2)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {expandedTables.has(table.tableName) ? <VscChevronDown /> : <VscChevronRight />}
                            <VscTable color="#42a5f5" />
                            <span style={{ fontWeight: 500 }}>{table.tableName}</span>
                        </div>
                        
                        {expandedTables.has(table.tableName) && (
                            <div style={{ paddingLeft: '36px', paddingBottom: '4px' }}>
                                {table.columns.map(col => (
                                    <div key={col.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--md-text-medium)', padding: '2px 0' }}>
                                        <VscSymbolVariable color="#ab47bc" style={{ fontSize: '0.8rem' }} />
                                        <span>{col.name}</span>
                                        <span style={{ color: 'var(--md-text-disabled)', fontSize: '0.75rem' }}>{col.type}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SchemaViewer;
