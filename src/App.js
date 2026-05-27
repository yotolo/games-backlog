import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { searchGameCovers } from './lib/igdb';
import GameGrid from './components/GameGrid';
import GameModal from './components/GameModal';
import SyncReviewModal from './components/SyncReviewModal';
import StatsBar from './components/StatsBar';
import FilterBar from './components/FilterBar';
import AuthPage from './components/AuthPage';
import './App.css';

export default function App() {
  // ── Auth ────────────────────────────────────────────────────────────────
  const [session, setSession]       = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  /** Claim any legacy games that have no owner yet (first login migration). */
  const claimUnownedGames = useCallback(async (userId) => {
    try {
      await supabase
        .from('games')
        .update({ user_id: userId })
        .is('user_id', null);
    } catch (e) {
      console.warn('Auto-claim skipped:', e);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          await claimUnownedGames(session.user.id);
        }
        setSession(session);
        setAuthLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, [claimUnownedGames]);

  // ── App state ────────────────────────────────────────────────────────────
  const [games, setGames]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editGame, setEditGame]         = useState(null);
  const [filters, setFilters]           = useState({ status: 'all', franchise: 'all', platform: 'all', search: '' });
  const [autoProgress, setAutoProgress] = useState(null);
  const [trophySync, setTrophySync]     = useState(null);
  const [syncResult, setSyncResult]     = useState(null);
  const [syncReviewOpen, setSyncReviewOpen] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchGames = useCallback(async () => {
    if (!session) { setGames([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('franchise', { ascending: true })
      .order('title',    { ascending: true });
    if (!error) setGames(data || []);
    setLoading(false);
  }, [session]);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  // ── Derived state ────────────────────────────────────────────────────────
  const filteredGames = games.filter(g => {
    if (filters.status    !== 'all' && g.status !== filters.status) return false;
    if (filters.franchise !== 'all' && g.franchise !== filters.franchise) return false;
    if (filters.platform  !== 'all' && !(g.platform || []).includes(filters.platform)) return false;
    if (filters.search && !g.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const franchises = [...new Set(games.map(g => g.franchise).filter(Boolean))].sort();
  const platforms  = [...new Set(games.flatMap(g => g.platform || []))].sort();

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSave = async (game) => {
    if (game.id) {
      // Strip non-updatable fields (incl. user_id — ownership never changes)
      const { id, created_at, user_id, ...updates } = game;
      await supabase.from('games').update(updates).eq('id', id);
    } else {
      await supabase.from('games').insert([{ ...game, user_id: session.user.id }]);
    }
    setModalOpen(false);
    setEditGame(null);
    fetchGames();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo gioco?')) return;
    await supabase.from('games').delete().eq('id', id);
    fetchGames();
  };

  const handleEdit = (game) => { setEditGame(game); setModalOpen(true); };

  const handleSyncTrophies = async () => {
    setTrophySync('syncing');
    const { data, error } = await supabase.functions.invoke('sync-psn-trophies');
    if (error || data?.error) {
      setTrophySync({ error: error?.message || data?.error });
      setTimeout(() => setTrophySync(null), 5000);
    } else {
      setTrophySync({ updated: data.updated, total: data.totalPsn });
      setSyncResult(data);
      setSyncReviewOpen(true);
      fetchGames();
      setTimeout(() => setTrophySync(null), 4000);
    }
  };

  const handleAutoCovers = async () => {
    const missing = games.filter(g => !g.cover_url);
    if (missing.length === 0) { alert('Tutti i giochi hanno già una copertina!'); return; }
    if (!window.confirm(`Cerca copertine automaticamente per ${missing.length} giochi senza immagine?`)) return;

    let updated = 0;
    setAutoProgress({ done: 0, total: missing.length, current: missing[0].title });
    for (let i = 0; i < missing.length; i++) {
      const game = missing[i];
      setAutoProgress({ done: i, total: missing.length, current: game.title });
      const results = await searchGameCovers(game.title);
      if (results.length > 0 && results[0].cover) {
        await supabase.from('games').update({ cover_url: results[0].cover }).eq('id', game.id);
        updated++;
      }
      if (i < missing.length - 1) await new Promise(r => setTimeout(r, 300));
    }
    setAutoProgress(null);
    fetchGames();
    alert(`✅ Aggiornate ${updated} copertine su ${missing.length}!`);
  };

  const handleLogout = () => supabase.auth.signOut();

  // ── Auth loading ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="app">
        <div className="loading" style={{ minHeight: '100vh' }}>
          <div className="spinner" />
          <p>Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthPage />;

  // ── User display info ─────────────────────────────────────────────────────
  const displayName = session.user.user_metadata?.full_name
    || session.user.user_metadata?.name
    || session.user.email?.split('@')[0]
    || 'Utente';
  const avatarLetter = displayName[0].toUpperCase();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-logo">
            <span className="logo-icon">🎮</span>
            <div>
              <h1>GAME VAULT</h1>
              <p>Alessio's Backlog</p>
            </div>
          </div>

          <div className="header-actions">
            <button
              className="btn-sync-trophies"
              onClick={handleSyncTrophies}
              disabled={trophySync === 'syncing' || loading}
              title="Sincronizza trofei PSN da Toshi-_-"
            >
              {trophySync === 'syncing'
                ? <>🏆 <span className="btn-label">Sync...</span></>
                : trophySync?.error
                  ? <>❌ <span className="btn-label">Errore</span></>
                  : trophySync?.updated != null
                    ? <>✅ <span className="btn-label">{trophySync.updated} sync</span></>
                    : <>🏆 <span className="btn-label"> Sync Trofei</span></>}
            </button>
            {syncResult && (
              <button
                className="btn-review-sync"
                onClick={() => setSyncReviewOpen(true)}
                title="Revisiona match e assegna non trovati"
              >🔍 <span className="btn-label">Revisiona</span></button>
            )}
            <button
              className="btn-auto-cover"
              onClick={handleAutoCovers}
              disabled={!!autoProgress || loading}
              title="Scarica automaticamente le copertine mancanti"
            >
              {autoProgress
                ? `🖼 ${autoProgress.done}/${autoProgress.total}`
                : <>🖼 <span className="btn-label"> Auto-cover</span></>}
            </button>
            <button className="btn-add" onClick={() => { setEditGame(null); setModalOpen(true); }}>
              <span className="btn-icon">+</span><span className="btn-label"> Aggiungi Gioco</span>
            </button>
          </div>

          <div className="header-user">
            <div className="user-avatar" title={session.user.email}>{avatarLetter}</div>
            <span className="user-name">{displayName}</span>
            <button className="btn-logout" onClick={handleLogout} title="Esci dall'account">
              ⏏<span className="btn-label"> Esci</span>
            </button>
          </div>
        </div>
      </header>

      {autoProgress && (
        <div className="auto-cover-banner">
          <div className="auto-cover-bar" style={{ width: `${(autoProgress.done / autoProgress.total) * 100}%` }} />
          <span className="auto-cover-label">🖼 {autoProgress.current} — {autoProgress.done}/{autoProgress.total}</span>
        </div>
      )}

      <StatsBar games={games} />

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        franchises={franchises}
        platforms={platforms}
        total={filteredGames.length}
      />

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <p>Caricamento giochi...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="empty-vault">
          <div className="empty-vault-icon">🎮</div>
          <h2>Il tuo vault è vuoto!</h2>
          <p>Benvenuto! Inizia aggiungendo i giochi del tuo backlog.</p>
          <button
            className="btn-add empty-vault-cta"
            onClick={() => { setEditGame(null); setModalOpen(true); }}
          >
            <span className="btn-icon">+</span> Aggiungi il tuo primo gioco
          </button>
        </div>
      ) : (
        <GameGrid games={filteredGames} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {modalOpen && (
        <GameModal
          game={editGame}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditGame(null); }}
        />
      )}

      {syncReviewOpen && syncResult && (
        <SyncReviewModal
          syncResult={syncResult}
          games={games}
          onClose={() => setSyncReviewOpen(false)}
          onRefresh={fetchGames}
        />
      )}
    </div>
  );
}
