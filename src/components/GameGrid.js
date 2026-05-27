import React, { useState } from 'react';
import { useT } from '../lib/i18n';

const PLATFORM_COLORS = {
  PS1: '#003087', PS2: '#00439C', PS3: '#003791',
  PS4: '#003087', PS5: '#00439C', PSVR2: '#7B2FBE',
};

function GameCard({ game, onEdit, onDelete }) {
  const { t } = useT();
  const [imgError, setImgError] = useState(false);

  const STATUS_CONFIG = {
    done:        { label: t('grid.done'),       color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
    in_progress: { label: t('grid.inProgress'), color: '#facc15', bg: 'rgba(250,204,21,0.15)' },
    to_start:    { label: t('grid.toStart'),    color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
    backlog:     { label: t('grid.backlog'),    color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  };

  const status = STATUS_CONFIG[game.status] || STATUS_CONFIG.backlog;

  return (
    <div className="game-card" onClick={() => onEdit(game)}>
      <div className="card-cover">
        {game.cover_url && !imgError ? (
          <img src={game.cover_url} alt={game.title} onError={() => setImgError(true)} />
        ) : (
          <div className="cover-placeholder">
            <span>🎮</span>
            <p>{game.title}</p>
          </div>
        )}
        <div className="card-overlay">
          <button className="btn-edit" onClick={e => { e.stopPropagation(); onEdit(game); }}>✏️</button>
          <button className="btn-delete" onClick={e => { e.stopPropagation(); onDelete(game.id); }}>🗑️</button>
        </div>
      </div>

      <div className="card-info">
        <h3 className="card-title">{game.title}</h3>
        {game.franchise && <p className="card-franchise">{game.franchise}</p>}

        <div className="card-meta">
          <span className="status-badge" style={{ color: status.color, background: status.bg }}>
            {status.label}
          </span>
          {game.trophy_percent != null && (
            <span className="trophy-badge">🏆 {game.trophy_percent}%</span>
          )}
        </div>

        {game.rating && <div className="card-rating">{'⭐'.repeat(game.rating)}</div>}

        <div className="card-platforms">
          {(game.platform || []).map(p => (
            <span key={p} className="platform-tag" style={{ background: PLATFORM_COLORS[p] || '#333' }}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GameGrid({ games, onEdit, onDelete }) {
  const { t } = useT();

  if (games.length === 0) {
    return (
      <div className="empty-state">
        <span>🎮</span>
        <p>{t('grid.noGames')}</p>
      </div>
    );
  }

  return (
    <div className="game-grid">
      {games.map(game => (
        <GameCard key={game.id} game={game} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
