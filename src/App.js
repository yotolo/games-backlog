import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import GameGrid from './components/GameGrid';
import GameModal from './components/GameModal';
import StatsBar from './components/StatsBar';
import FilterBar from './components/FilterBar';
import './App.css';

export default function App() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGame, setEditGame] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', franchise: 'all', platform: 'all', search: '' });

  const fetchGames = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('franchise', { ascending: true })
      .order('title', { ascending: true });
    if (!error) setGames(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  const filteredGames = games.filter(g => {
    if (filters.status !== 'all' && g.status !== filters.status) return false;
    if (filters.franchise !== 'all' && g.franchise !== filters.franchise) return false;
    if (filters.platform !== 'all' && !(g.platform || []).includes(filters.platform)) return false;
    if (filters.search && !g.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const franchises = [...new Set(games.map(g => g.franchise).filter(Boolean))].sort();
  const platforms = [...new Set(games.flatMap(g => g.platform || []))].sort();

  const handleSave = async (game) => {
    if (game.id) {
      const { id, created_at, ...updates } = game;
      await supabase.from('games').update(updates).eq('id', id);
    } else {
      await supabase.from('games').insert([game]);
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

  const handleEdit = (game) => {
    setEditGame(game);
    setModalOpen(true);
  };

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
          <button className="btn-add" onClick={() => { setEditGame(null); setModalOpen(true); }}>
            + Aggiungi Gioco
          </button>
        </div>
      </header>

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
      ) : (
        <GameGrid
          games={filteredGames}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {modalOpen && (
        <GameModal
          game={editGame}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditGame(null); }}
        />
      )}
    </div>
  );
}
