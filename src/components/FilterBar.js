import React from 'react';
import { useT } from '../lib/i18n';

export default function FilterBar({ filters, setFilters, franchises, platforms, total }) {
  const { t } = useT();

  const STATUSES = [
    { value: 'all',         label: t('filter.all') },
    { value: 'done',        label: t('filter.done') },
    { value: 'in_progress', label: t('filter.inProgress') },
    { value: 'to_start',    label: t('filter.toStart') },
    { value: 'backlog',     label: t('filter.backlog') },
  ];

  return (
    <div className="filter-bar">
      <div className="filter-row-1">
        <div className="filter-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={t('filter.search')}
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <div className="filter-count">{t('filter.count', { n: total })}</div>
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
            <option value="all">{t('filter.allFranchises')}</option>
            {franchises.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <select
            value={filters.platform}
            onChange={e => setFilters(f => ({ ...f, platform: e.target.value }))}
          >
            <option value="all">{t('filter.allPlatforms')}</option>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
