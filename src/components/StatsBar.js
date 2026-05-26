import React from 'react';

const STATUS_LABELS = {
  done: { label: 'Completati', color: '#4ade80', emoji: '✅' },
  in_progress: { label: 'In corso', color: '#facc15', emoji: '🎮' },
  to_start: { label: 'Da iniziare', color: '#60a5fa', emoji: '🔜' },
  backlog: { label: 'Backlog', color: '#a78bfa', emoji: '📦' },
};

export default function StatsBar({ games }) {
  const total = games.length;
  const counts = { done: 0, in_progress: 0, to_start: 0, backlog: 0 };
  games.forEach(g => { if (counts[g.status] !== undefined) counts[g.status]++; });
  const pct = total > 0 ? Math.round((counts.done / total) * 100) : 0;

  return (
    <div className="stats-bar">
      <div className="stats-completion">
        <div className="completion-ring">
          <svg viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="#2a2a3e" strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="#4ade80" strokeWidth="3"
              strokeDasharray={`${pct}, 100`}
            />
          </svg>
          <span>{pct}%</span>
        </div>
        <div className="completion-info">
          <strong>{total} giochi</strong>
          <span>nel vault</span>
        </div>
      </div>

      <div className="stats-grid">
        {Object.entries(STATUS_LABELS).map(([key, { label, color, emoji }]) => (
          <div className="stat-card" key={key} style={{ borderColor: color }}>
            <span className="stat-emoji">{emoji}</span>
            <span className="stat-count" style={{ color }}>{counts[key]}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
