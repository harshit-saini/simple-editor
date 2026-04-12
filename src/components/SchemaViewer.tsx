import React, { useMemo, useState } from 'react';
import { VscTable, VscChevronRight, VscChevronDown, VscSymbolVariable, VscSearch } from 'react-icons/vsc';

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
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSchema = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return schema;

    return schema.filter((table) => {
      const tableMatches = table.tableName.toLowerCase().includes(query);
      const columnMatches = table.columns.some((column) => column.name.toLowerCase().includes(query));
      return tableMatches || columnMatches;
    });
  }, [schema, searchTerm]);

  const toggleTable = (tableName: string) => {
    setExpandedTables((previous) => {
      const next = new Set(previous);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedTables(new Set(filteredSchema.map((table) => table.tableName)));
  };

  const collapseAll = () => {
    setExpandedTables(new Set());
  };

  return (
    <div className="schema-viewer">
      <div className="schema-header">
        <span>Database Schema</span>
        <div className="schema-actions">
          <button className="ghost-button" onClick={expandAll}>Expand</button>
          <button className="ghost-button" onClick={collapseAll}>Collapse</button>
        </div>
      </div>

      <div className="schema-search">
        <VscSearch />
        <input
          type="text"
          placeholder="Search tables or columns"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="schema-list">
        {filteredSchema.length === 0 && (
          <div className="schema-empty">No matching tables yet.</div>
        )}

        {filteredSchema.map((table) => {
          const expanded = expandedTables.has(table.tableName);

          return (
            <div key={table.tableName} className="schema-table">
              <button
                className="schema-table-row"
                onClick={() => toggleTable(table.tableName)}
              >
                {expanded ? <VscChevronDown /> : <VscChevronRight />}
                <VscTable className="schema-table-icon" />
                <span className="schema-table-name">{table.tableName}</span>
              </button>

              {expanded && (
                <div className="schema-columns">
                  {table.columns.map((column) => (
                    <div key={`${table.tableName}-${column.name}`} className="schema-column-row">
                      <VscSymbolVariable className="schema-column-icon" />
                      <span>{column.name}</span>
                      <span className="schema-column-type">{column.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SchemaViewer;