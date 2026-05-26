import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isSuspicious(psn, game) {
  const np = normalize(psn);
  const ng = normalize(game);
  if (np === ng) return false;
  if (np.includes(ng) || ng.includes(np)) return false;
  const firstWordP = np.split(' ')[0];
  const firstWordG = ng.split(' ')[0];
  return firstWordP !== firstWordG;
}

export default function SyncReviewModal({ syncResult, games, onClose, onRefresh }) {
  const [tab, setTab] = useState('matches');
  const [search, setSearch] = useState('');
  const [manualMap, setManualMap] = useState({});
  const [busy, setBusy] = useState(null);
  const [onlyBad, setOnlyBad] = useState(true);

  const matched = syncResult.matched || [];
  const unmatched = syncResult.unmatched || [];

  const suspicious = matched.filter(m => isSuspicious(m.psn, m.game));
  const good = matched.filter(m => !isSuspicious(m.psn, m.game));
  const visibleMatches = onlyBad ? suspicious : matched;
  const filteredMatches = visibleMatches.filter(m =>
    !search || m.psn.toLowerCase().includes(search.toLowerCase()) || m.game.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUnmatched = unmatched.filter(u =>
    !search || u.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleReject = async (match) => {
    setBusy(match.game + match.psn);
    const game = games.find(g => g.title === match.game);
    if (game) await supabase.from('games').update({ trophy_percent: null }).eq('id', game.id);
    setBusy(null);
    onRefresh();
  };

  const handleAssign = async (u, gameId) => {
    if (!gameId) return;
    setBusy(u.title);
    await supabase.from('games').update({ trophy_percent: u.progress }).eq('id', gameId);
    setBusy(null);
    setManualMap(m => { const n = { ...m }; delete n[u.title]; return n; });
    onRefresh();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sync" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🏆 Revisione Sync Trofei</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="sync-tabs">
          <button
            className={`sync-tab ${tab === 'matches' ? 'active' : ''}`}
            onClick={() => { setTab('matches'); setSearch(''); }}
          >
            ✅ Match <span className="sync-tab-count">{matched.length}</span>
            {suspicious.length > 0 && <span className="sync-tab-warn">⚠️ {suspicious.length}</span>}
          </button>
          <button
            className={`sync-tab ${tab === 'unmatched' ? 'active' : ''}`}
            onClick={() => { setTab('unmatched'); setSearch(''); }}
          >
            ❓ Non trovati <span className="sync-tab-count">{unmatched.length}</span>
          </button>
        </div>

        <div className="sync-search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={tab === 'matches' ? 'Cerca tra i match...' : 'Cerca titolo PSN...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="sync-body">
          {tab === 'matches' && (
            <>
              <div className="sync-filter-row">
                <label className="sync-toggle">
                  <input
                    type="checkbox"
                    checked={onlyBad}
                    onChange={e => setOnlyBad(e.target.checked)}
                  />
                  Solo sospetti ({suspicious.length})
                </label>
                {!onlyBad && <span className="sync-sub">✅ Ok: {good.length} · ⚠️ Sospetti: {suspicious.length}</span>}
              </div>

              {filteredMatches.length === 0 ? (
                <div className="sync-empty">Nessun match da mostrare</div>
              ) : (
                filteredMatches.map((m, i) => {
                  const bad = isSuspicious(m.psn, m.game);
                  const key = m.game + m.psn;
                  return (
                    <div key={i} className={`sync-row ${bad ? 'sync-row-warn' : ''}`}>
                      <span className="sync-pct">🏆 {m.progress}%</span>
                      <div className="sync-titles">
                        <span className="sync-psn-title">{m.psn}</span>
                        <span className="sync-arrow">→</span>
                        <span className="sync-game-title">{m.game}</span>
                      </div>
                      <button
                        className="sync-btn-reject"
                        onClick={() => handleReject(m)}
                        disabled={busy === key}
                        title="Rimuovi questo match"
                      >✗</button>
                    </div>
                  );
                })
              )}
            </>
          )}

          {tab === 'unmatched' && (
            filteredUnmatched.length === 0 ? (
              <div className="sync-empty">Nessun titolo trovato</div>
            ) : (
              filteredUnmatched.map((u, i) => (
                <div key={i} className="sync-row sync-row-unmatched">
                  <div className="sync-unmatched-left">
                    <span className="sync-psn-title">{u.title}</span>
                    <span className="sync-pct-small">🏆 {u.progress}%</span>
                  </div>
                  <select
                    className="sync-select"
                    value={manualMap[u.title] || ''}
                    onChange={e => setManualMap(m => ({ ...m, [u.title]: e.target.value }))}
                  >
                    <option value="">— nessun gioco —</option>
                    {games.map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                  <button
                    className="sync-btn-assign"
                    onClick={() => handleAssign(u, manualMap[u.title])}
                    disabled={!manualMap[u.title] || busy === u.title}
                    title="Assegna"
                  >✓</button>
                </div>
              ))
            )
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}
