import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';
import MapEditor, { mapImgUrl } from './MapEditor';

export default function MapTab({ gameId, userId, displayName }) {
  const { t } = useT();
  const [maps,          setMaps]          = useState([]);
  const [communityMaps, setCommunityMaps] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeMap,     setActiveMap]     = useState(null);
  const [creating,      setCreating]      = useState(false);
  const [newName,       setNewName]       = useState('');
  const [importing,     setImporting]     = useState(null);

  const loadMaps = useCallback(async () => {
    setLoading(true);
    const [{ data: own }, { data: pub }] = await Promise.all([
      supabase.from('game_maps').select('*')
        .eq('game_id', gameId).eq('user_id', userId).order('created_at'),
      supabase.from('game_maps').select('*')
        .eq('game_id', gameId).eq('is_public', true).neq('user_id', userId)
        .order('updated_at', { ascending: false }).limit(20),
    ]);
    setMaps(own || []);
    setCommunityMaps(pub || []);
    setLoading(false);
  }, [gameId, userId]);

  useEffect(() => { loadMaps(); }, [loadMaps]);

  /* ── Create map ─────────────────────────────────────────────────────── */
  const handleCreate = async () => {
    const name = newName.trim() || t('map.defaultName');
    const { data } = await supabase.from('game_maps')
      .insert([{ game_id: gameId, user_id: userId, name, author_name: displayName }])
      .select().single();
    if (data) { setActiveMap(data); setCreating(false); setNewName(''); }
  };

  /* ── Import community map ───────────────────────────────────────────── */
  const handleImport = async (src) => {
    setImporting(src.id);
    const { data: newMap } = await supabase.from('game_maps').insert([{
      game_id: gameId, user_id: userId,
      name: src.name, image_path: src.image_path,
      imported_from: src.id, author_name: displayName,
    }]).select().single();

    if (newMap) {
      const { data: srcMarkers } = await supabase
        .from('map_markers').select('*').eq('map_id', src.id);
      if (srcMarkers?.length) {
        await supabase.from('map_markers').insert(srcMarkers.map(m => ({
          map_id: newMap.id, user_id: userId,
          category: m.category, title: m.title, description: m.description,
          found: false, x: m.x, y: m.y,
        })));
      }
      await loadMaps();
      setActiveMap(newMap);
    }
    setImporting(null);
  };

  /* ── Open editor ────────────────────────────────────────────────────── */
  if (activeMap) {
    return (
      <MapEditor
        map={activeMap}
        userId={userId}
        onBack={() => { setActiveMap(null); loadMaps(); }}
        onUpdate={(updated) => setActiveMap(updated)}
      />
    );
  }

  /* ── Map list ───────────────────────────────────────────────────────── */
  return (
    <div className="map-tab-wrap">

      {/* My Maps */}
      <div className="nm-section">
        <div className="nm-section-head">
          <span className="nm-section-title">🗺️ {t('map.myMaps')}</span>
          <button className="map-new-btn" onClick={() => setCreating(true)}>
            + {t('map.newMap')}
          </button>
        </div>

        {creating && (
          <div className="map-create-row">
            <input autoFocus className="map-name-new-input" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter') handleCreate(); if (e.key==='Escape') setCreating(false); }}
              placeholder={t('map.namePh')} />
            <button className="btn-save map-confirm-btn" onClick={handleCreate}>{t('map.create')}</button>
            <button className="btn-cancel map-confirm-btn" onClick={() => setCreating(false)}>✕</button>
          </div>
        )}

        {loading ? <div className="nm-empty">…</div>
          : maps.length === 0 && !creating
          ? <div className="nm-empty">{t('map.noMaps')}</div>
          : (
            <div className="map-list">
              {maps.map(m => (
                <div key={m.id} className="map-list-item" onClick={() => setActiveMap(m)}>
                  <div className="map-list-thumb">
                    {m.image_path
                      ? <img src={mapImgUrl(m.image_path)} alt={m.name} />
                      : <span>🗺️</span>}
                  </div>
                  <div className="map-list-info">
                    <span className="map-list-name">{m.name}</span>
                    <div className="map-list-badges">
                      {m.is_public    && <span className="map-badge pub">{t('map.public')}</span>}
                      {m.imported_from && <span className="map-badge imp">{t('map.imported')}</span>}
                    </div>
                  </div>
                  <span className="map-list-arrow">›</span>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Community Maps */}
      {communityMaps.length > 0 && (
        <div className="nm-section">
          <div className="nm-section-head">
            <span className="nm-section-title">🌍 {t('map.community')}</span>
          </div>
          <div className="map-list">
            {communityMaps.map(m => (
              <div key={m.id} className="map-list-item map-community-item">
                <div className="map-list-thumb">
                  {m.image_path
                    ? <img src={mapImgUrl(m.image_path)} alt={m.name} />
                    : <span>🗺️</span>}
                </div>
                <div className="map-list-info">
                  <span className="map-list-name">{m.name}</span>
                  <span className="map-list-author">by {m.author_name || 'unknown'}</span>
                </div>
                <button
                  className="map-import-btn"
                  disabled={importing === m.id}
                  onClick={e => { e.stopPropagation(); handleImport(m); }}
                >
                  {importing === m.id ? '⏳' : t('map.import')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
