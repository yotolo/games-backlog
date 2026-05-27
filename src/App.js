import React, { useState, useEffect, useCallback } from 'react';
import { supabase, envError } from './lib/supabase';
import { searchGameCovers } from './lib/igdb';
import { LangProvider, useT } from './lib/i18n';
import GameGrid from './components/GameGrid';
import GameModal from './components/GameModal';
import SyncReviewModal from './components/SyncReviewModal';
import StatsBar from './components/StatsBar';
import FilterBar from './components/FilterBar';
import AuthPage from './components/AuthPage';
import './App.css';

// ── Config error screen ────────────────────────────────────────────────────
// Shown when REACT_APP_SUPABASE_* env vars are not set at build time.
// No data hooks — safe to render unconditionally.
function EnvErrorScreen() {
  const { t } = useT();
  const missingVars = envError ? envError.split(': ').slice(1).join(': ') : '';

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div className="auth-content">
        <div className="auth-logo">
          <span className="auth-logo-icon">⚙️</span>
          <h1 className="auth-logo-title">{t('env.title')}</h1>
          <p className="auth-logo-sub">{t('env.subtitle')}</p>
        </div>
        <div className="auth-card">
          <div className="auth-card-body" style={{ gap: 18 }}>
            <div className="auth-msg auth-error">
              <strong>{t('env.subtitle')}:</strong>
              <br />{missingVars}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
              {t('env.createFile')}{' '}
              <code className="inline-code">.env.local</code>
            </p>
            <pre className="env-error-pre">{`REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
REACT_APP_RAWG_KEY=your_rawg_key`}</pre>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              {t('env.restart')}{' '}
              <code className="inline-code">npm start</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vault (main app — all hooks live here) ────────────────────────────────
// Only mounted when env vars are present and supabase client is valid.
function VaultApp() {
  const { t, lang, setLang } = useT();

  // Auth
  const [session, setSession]         = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const claimUnownedGames = useCallback(async (userId) => {
    try {
      await supabase.from('games').update({ user_id: userId }).is('user_id', null);
    } catch (e) {
      console.warn('Auto-claim skipped:', e);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // IMPORTANT: keep this callback synchronous.
        // Awaiting inside onAuthStateChange causes a Supabase v2 deadlock:
        // the client waits for the callback to return before settling the
        // auth state, while any awaited DB call needs a settled auth state
        // for RLS — so the spinner freezes forever.
        setSession(session);
        setAuthLoading(false);

        // Claim unowned games in the background (fire-and-forget).
        if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          claimUnownedGames(session.user.id);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [claimUnownedGames]);

  // App state
  const [games, setGames]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editGame, setEditGame]         = useState(null);
  const [filters, setFilters]           = useState({ status: 'all', franchise: 'all', platform: 'all', search: '' });
  const [autoProgress, setAutoProgress] = useState(null);
  const [trophySync, setTrophySync]     = useState(null);
  const [syncResult, setSyncResult]     = useState(null);
  const [syncReviewOpen, setSyncReviewOpen] = useState(false);

  const fetchGames = useCallback(async () => {
    if (!session) { setGames([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('franchise', { ascending: true })
        .order('title',    { ascending: true });
      if (error) console.error('fetchGames error:', error);
      else setGames(data || []);
    } catch (e) {
      console.error('fetchGames exception:', e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  const filteredGames = games.filter(g => {
    if (filters.status    !== 'all' && g.status !== filters.status) return false;
    if (filters.franchise !== 'all' && g.franchise !== filters.franchise) return false;
    if (filters.platform  !== 'all' && !(g.platform || []).includes(filters.platform)) return false;
    if (filters.search && !g.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const franchises = [...new Set(games.map(g => g.franchise).filter(Boolean))].sort();
  const platforms  = [...new Set(games.flatMap(g => g.platform || []))].sort();

  const handleSave = async (game) => {
    if (game.id) {
      const { id, created_at, user_id, ...updates } = game; // eslint-disable-line no-unused-vars
      await supabase.from('games').update(updates).eq('id', id);
    } else {
      await supabase.from('games').insert([{ ...game, user_id: session.user.id }]);
    }
    setModalOpen(false);
    setEditGame(null);
    fetchGames();
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirm.delete'))) return;
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
    if (missing.length === 0) { alert(t('alert.noCoversNeeded')); return; }
    if (!window.confirm(t('confirm.autoCover', { n: missing.length }))) return;

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
    alert(t('alert.autoCoverDone', { n: updated, total: missing.length }));
  };

  const handleLogout = () => supabase.auth.signOut();

  // Auth loading
  if (authLoading) {
    return (
      <div className="app">
        <div className="loading" style={{ minHeight: '100vh' }}>
          <div className="spinner" /><p>{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthPage />;

  const displayName = session.user.user_metadata?.full_name
    || session.user.user_metadata?.name
    || session.user.email?.split('@')[0]
    || 'User';
  const avatarLetter = displayName[0].toUpperCase();

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-logo">
            <span className="logo-icon">🎮</span>
            <div>
              <h1>GAME VAULT</h1>
              <p>{t('app.tagline')}</p>
            </div>
          </div>

          <div className="header-actions">
            <button
              className="btn-sync-trophies"
              onClick={handleSyncTrophies}
              disabled={trophySync === 'syncing' || loading}
              title={t('header.syncTitle')}
            >
              {trophySync === 'syncing'
                ? <>🏆 <span className="btn-label">{t('header.syncing')}</span></>
                : trophySync?.error
                  ? <>❌ <span className="btn-label">{t('header.syncError')}</span></>
                  : trophySync?.updated != null
                    ? <>✅ <span className="btn-label">{t('header.syncDone', { n: trophySync.updated })}</span></>
                    : <>🏆 <span className="btn-label"> {t('header.syncTrophies')}</span></>}
            </button>
            {syncResult && (
              <button
                className="btn-review-sync"
                onClick={() => setSyncReviewOpen(true)}
                title={t('header.reviewTitle')}
              >🔍 <span className="btn-label">{t('header.review')}</span></button>
            )}
            <button
              className="btn-auto-cover"
              onClick={handleAutoCovers}
              disabled={!!autoProgress || loading}
              title={t('header.autoCoverTitle')}
            >
              {autoProgress
                ? `🖼 ${autoProgress.done}/${autoProgress.total}`
                : <>🖼 <span className="btn-label"> {t('header.autoCover')}</span></>}
            </button>
            <button className="btn-add" onClick={() => { setEditGame(null); setModalOpen(true); }}>
              <span className="btn-icon">+</span><span className="btn-label"> {t('header.addGame')}</span>
            </button>
          </div>

          <div className="header-user">
            <button
              className="btn-lang"
              onClick={() => setLang(lang === 'en' ? 'it' : 'en')}
              title="Change language"
            >
              {lang === 'en' ? '🇮🇹' : '🇬🇧'}
            </button>
            <div className="user-avatar" title={session.user.email}>{avatarLetter}</div>
            <span className="user-name">{displayName}</span>
            <button className="btn-logout" onClick={handleLogout} title={t('header.signOutTitle')}>
              ⏏<span className="btn-label"> {t('header.signOut')}</span>
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
      <FilterBar filters={filters} setFilters={setFilters} franchises={franchises} platforms={platforms} total={filteredGames.length} />

      {loading ? (
        <div className="loading"><div className="spinner" /><p>{t('app.loadingGames')}</p></div>
      ) : games.length === 0 ? (
        <div className="empty-vault">
          <div className="empty-vault-icon">🎮</div>
          <h2>{t('vault.emptyTitle')}</h2>
          <p>{t('vault.emptySubtitle')}</p>
          <button className="btn-add empty-vault-cta" onClick={() => { setEditGame(null); setModalOpen(true); }}>
            <span className="btn-icon">+</span> {t('vault.emptyCta')}
          </button>
        </div>
      ) : (
        <GameGrid games={filteredGames} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {modalOpen && (
        <GameModal game={editGame} onSave={handleSave} onClose={() => { setModalOpen(false); setEditGame(null); }} />
      )}
      {syncReviewOpen && syncResult && (
        <SyncReviewModal syncResult={syncResult} games={games} onClose={() => setSyncReviewOpen(false)} onRefresh={fetchGames} />
      )}
    </div>
  );
}

// ── Root export ────────────────────────────────────────────────────────────
// Thin wrapper: LangProvider must wrap everything so useT() works everywhere,
// including EnvErrorScreen and AuthPage.
export default function App() {
  return (
    <LangProvider>
      {envError ? <EnvErrorScreen /> : <VaultApp />}
    </LangProvider>
  );
}
