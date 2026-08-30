import { useState, useMemo } from 'react';

const DataTable = ({
  columns,
  data,
  onRowClick = null,
  onAction = null,
  actions = [],
  loading = false,
  emptyMessage = 'No data available',
  pageSize = 10,
  showPagination = true,
  searchable = false,
  searchPlaceholder = 'Search...',
  sortable = true,
  className = '',
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim() || !searchable) return data;
    
    const query = searchQuery.toLowerCase().trim();
    return data.filter((row) => {
      return columns.some((col) => {
        const value = row[col.key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery, columns, searchable]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortable) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' 
        ? (aVal > bVal ? 1 : -1)
        : (bVal > aVal ? 1 : -1);
    });
  }, [filteredData, sortColumn, sortDirection, sortable]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage, pageSize, showPagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key) => {
    if (!sortable) return;
    if (sortColumn === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (key) => {
    if (sortColumn !== key) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#64748b',
        background: 'linear-gradient(145deg, #141b2b, #0f172a)',
        borderRadius: '12px',
        border: '1px solid rgba(0,229,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <span className="spin-icon">⏳</span>
          Loading...
        </div>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#64748b',
        background: 'linear-gradient(145deg, #141b2b, #0f172a)',
        borderRadius: '12px',
        border: '1px solid rgba(0,229,255,0.06)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {searchable && (
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(0,229,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: '#e2e8f0',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,229,255,0.08)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,229,255,0.12)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
          color: '#e2e8f0',
          background: 'transparent',
        }}>
          <thead style={{
            borderBottom: '1px solid rgba(0,229,255,0.08)',
          }}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    letterSpacing: '0.05em',
                    cursor: sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (sortable) e.currentTarget.style.color = '#e2e8f0';
                  }}
                  onMouseLeave={(e) => {
                    if (sortable) e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {col.label}
                    {sortable && <span style={{ fontSize: '10px', opacity: 0.5 }}>{getSortIcon(col.key)}</span>}
                  </span>
                </th>
              ))}
              {actions.length > 0 && (
                <th style={{
                  textAlign: 'center',
                  padding: '12px 16px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  fontSize: '11px',
                  letterSpacing: '0.05em',
                }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr
                key={row.id || index}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.15s ease',
                  cursor: onRowClick ? 'pointer' : 'default',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,229,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '12px 16px',
                      verticalAlign: 'middle',
                    }}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td style={{
                    padding: '8px 16px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                  }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick?.(row);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: action.variant === 'danger' 
                              ? 'rgba(248,113,113,0.1)' 
                              : action.variant === 'success'
                                ? 'rgba(52,211,153,0.1)'
                                : 'rgba(0,229,255,0.08)',
                            color: action.variant === 'danger' 
                              ? '#f87171' 
                              : action.variant === 'success'
                                ? '#34d399'
                                : '#00e5ff',
                            border: action.variant === 'danger' 
                              ? '1px solid rgba(248,113,113,0.2)' 
                              : action.variant === 'success'
                                ? '1px solid rgba(52,211,153,0.2)'
                                : '1px solid rgba(0,229,255,0.15)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = action.variant === 'danger' 
                              ? 'rgba(248,113,113,0.2)' 
                              : action.variant === 'success'
                                ? 'rgba(52,211,153,0.2)'
                                : 'rgba(0,229,255,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = action.variant === 'danger' 
                              ? 'rgba(248,113,113,0.1)' 
                              : action.variant === 'success'
                                ? 'rgba(52,211,153,0.1)'
                                : 'rgba(0,229,255,0.08)';
                          }}
                          title={action.label}
                        >
                          {action.icon && <span style={{ marginRight: '4px' }}>{action.icon}</span>}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination && totalPages > 1 && (
        <div style={{
          marginTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#94a3b8',
          fontSize: '13px',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <span>
            Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(0,229,255,0.12)',
                background: 'transparent',
                color: currentPage === 1 ? '#475569' : '#94a3b8',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.background = 'rgba(0,229,255,0.08)';
                  e.currentTarget.style.color = '#e2e8f0';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = currentPage === 1 ? '#475569' : '#94a3b8';
              }}
            >
              ← Prev
            </button>
            
            <span style={{ padding: '6px 12px', color: '#e2e8f0' }}>
              {currentPage} / {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(0,229,255,0.12)',
                background: 'transparent',
                color: currentPage === totalPages ? '#475569' : '#94a3b8',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.background = 'rgba(0,229,255,0.08)';
                  e.currentTarget.style.color = '#e2e8f0';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = currentPage === totalPages ? '#475569' : '#94a3b8';
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
