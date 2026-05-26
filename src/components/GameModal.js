import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { searchGameCovers } from '../lib/igdb';

const PLATFORMS = ['PS1', 'PS2', 'PS3', 'PS4', 'PS5', 'PSVR2', 'PC', 'Switch', 'Xbox'];
const STATUSES = [
  { value: 'done', label: '✅ Completato' },
  { value: 'in_progress', label: '🎮 In corso' },
  { value: 'to_start', label: '🔜 Da iniziare' },
  { value: 'backlog', label: '📦 Backlog' },
];

const DEFAULT_FORM = {
  title: '', franchise: '', platform: [],
  status: 'backlog', cover_url: '', rating: null,
  trophy_percent: null, notes: '', year_completed: null,
};

export default function GameModal({ game, onSave, onClose }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [coverSearch, setCoverSearch] = useState('');
  const [coverResults, setCoverResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (game) setForm({ ...DEFAULT_FORM, ...game });
    else setForm(DEFAULT_FORM);
  }, [game]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const togglePlatform = (p) => {
    set('platform', form.platform.includes(p)
      ? form.platform.filter(x => x !== p)
      : [...form.platform, p]
    );
  };

  const handleCoverSearch = async () => {
    if (!coverSearch.trim()) return;
    setSearching(true);
    const results = await searchGameCovers(coverSearch);
    setCoverResults(results);
    setSearching(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('game-covers')
      .upload(fileName, file, { contentType: file.type });
    if (!error) {
      const url = `https://heguzznqmrzmsoqmhbmx.supabase.co/storage/v1/object/public/game-covers/${fileName}`;
      set('cover_url', url);
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = { ...form };
    if (game?.id) payload.id = game.id;
    await onSave(payload);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{game ? '✏️ Modifica Gioco' : '➕ Nuovo Gioco'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-left">
            {/* Cover preview */}
            <div className="cover-preview">
              {form.cover_url ? (
                <img src={form.cover_url} alt="cover" />
              ) : (
                <div className="cover-empty">🎮</div>
              )}
            </div>

            {/* Cover search */}
            <div className="cover-search-section">
              <p className="section-label">🔍 Cerca copertina online</p>
              <div className="cover-search-input">
                <input
                  value={coverSearch}
                  onChange={e => setCoverSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCoverSearch()}
                  placeholder="Nome gioco..."
                />
                <button onClick={handleCoverSearch} disabled={searching}>
                  {searching ? '...' : 'Cerca'}
                </button>
              </div>

              {coverResults.length > 0 && (
                <div className="cover-results">
                  {coverResults.map(r => r.cover && (
                    <img
                      key={r.id}
                      src={r.cover}
                      alt={r.name}
                      title={r.name}
                      className={form.cover_url === r.cover ? 'selected' : ''}
                      onClick={() => set('cover_url', r.cover)}
                    />
                  ))}
                </div>
              )}

              <p className="section-label" style={{ marginTop: 12 }}>📁 Oppure carica manualmente</p>
              <label className="upload-btn">
                {uploading ? 'Caricamento...' : '📤 Scegli file'}
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          <div className="modal-right">
            <div className="form-group">
              <label>Titolo *</label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Nome del gioco"
              />
            </div>

            <div className="form-group">
              <label>Saga / Franchise</label>
              <input
                value={form.franchise || ''}
                onChange={e => set('franchise', e.target.value)}
                placeholder="es. Assassin's Creed"
              />
            </div>

            <div className="form-group">
              <label>Stato</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Piattaforme</label>
              <div className="platform-toggles">
                {PLATFORMS.map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`platform-toggle ${form.platform.includes(p) ? 'active' : ''}`}
                    onClick={() => togglePlatform(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Valutazione</label>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`star ${form.rating >= n ? 'active' : ''}`}
                      onClick={() => set('rating', form.rating === n ? null : n)}
                    >⭐</button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Trofei %</label>
                <input
                  type="number"
                  min="0" max="100"
                  value={form.trophy_percent ?? ''}
                  onChange={e => set('trophy_percent', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="0-100"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Anno completamento</label>
              <input
                type="number"
                value={form.year_completed ?? ''}
                onChange={e => set('year_completed', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="es. 2024"
              />
            </div>

            <div className="form-group">
              <label>Note personali</label>
              <textarea
                value={form.notes || ''}
                onChange={e => set('notes', e.target.value)}
                placeholder="Commenti, impressioni..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={handleSubmit} disabled={saving || !form.title.trim()}>
            {saving ? 'Salvataggio...' : game ? '💾 Salva modifiche' : '➕ Aggiungi gioco'}
          </button>
        </div>
      </div>
    </div>
  );
}
