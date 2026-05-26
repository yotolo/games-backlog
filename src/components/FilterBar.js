import React from 'react';

const STATUSES = [
  { value: 'all', label: '🎯 Tutti' },
  { value: 'done', label: '✅ Completati' },
  { value: 'in_progress', label: '🎮 In corso' },
  { value: 'to_start', label: '🔜 Da iniziare' },
  { value: 'backlog', label: '📦 Backlog' },
];

export default function FilterBar({ filters, setFilters, franchises, platforms, total }) {
  return (
    <div className="filter-bar">
      <div className="filter-row-1">
        <div className="filter-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Cerca un gioco..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <div className="filter-count">{total} giochi</div>
      </div>

      <div className="filter-chips">
        {STATUSES.map(s => (
          <button
            key={s.value}
            className={`chip ${filters.status === s.value ? 'active' : ''}`}
            onClick={() => setFilters(f => ({ ...f, status: s.value }))}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="filter-row-2">
        <div className="filter-selects">
          <select
            value={filters.franchise}
            onChange={e => setFilters(f => ({ ...f, franchise: e.target.value }))}
          >
            <option value="all">📁 Tutte le saghe</option>
            {franchises.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <select
            value={filters.platform}
            onChange={e => setFilters(f => ({ ...f, platform: e.target.value }))}
          >
            <option value="all">🕹️ Tutte le piattaforme</option>
            {platforms.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
