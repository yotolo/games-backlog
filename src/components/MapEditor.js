import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';

const BUCKET = 'game-maps';

export const CATEGORIES = [
  { id: 'main',   icon: '🔴', color: '#ef4444', label: 'Main'        },
  { id: 'side',   icon: '🟡', color: '#facc15', label: 'Side'        },
  { id: 'coll',   icon: '🟢', color: '#4ade80', label: 'Collectible' },
  { id: 'poi',    icon: '🔵', color: '#60a5fa', label: 'POI'         },
  { id: 'secret', icon: '🟣', color: '#a78bfa', label: 'Secret'      },
  { id: 'custom', icon: '⚪', color: '#94a3b8', label: 'Custom'      },
];

const CAT     = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
const ALL_CATS = new Set(CATEGORIES.map(c => c.id));

export const mapImgUrl = (path) =>
  `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

export default function MapEditor({ map, userId, onBack, onUpdate }) {
  const { t } = useT();

  /* ── Transform: state + mirror refs so event handlers never go stale ── */
  const [zoom, setZoom] = useState(1);
  const [pan,  setPan]  = useState({ x: 0, y: 0 });
  const zoomRef         = useRef(1);
  const panRef          = useRef({ x: 0, y: 0 });

  // Keep refs in sync (used inside addEventListener callbacks that capture
  // on mount and would otherwise hold stale closures over pan/zoom state)
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current  = pan;  }, [pan]);

  const applyZoom = useCallback((nz) => { zoomRef.current = nz; setZoom(nz); }, []);
  const applyPan  = useCallback((np) => { panRef.current  = np; setPan(np);  }, []);

  const drag       = useRef({ on: false, sx: 0, sy: 0, px: 0, py: 0, moved: false });
  const pinchDist  = useRef(null);
  const containerRef = useRef(null);
  const imgRef       = useRef(null);

  /* ── Markers ─────────────────────────────────────────────────────────── */
  const [markers,     setMarkers]     = useState([]);
  const [visibleCats, setVisibleCats] = useState(ALL_CATS);
  const [showFound,   setShowFound]   = useState(true);

  /* ── UI ──────────────────────────────────────────────────────────────── */
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // editing: null | { mode:'add', x, y } | { mode:'edit', marker }
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState({ category: 'main', title: '', description: '', found: false });
  const editingRef = useRef(null);
  useEffect(() => { editingRef.current = editing; }, [editing]);

  /* ── Map metadata ────────────────────────────────────────────────────── */
  const [mapName,     setMapName]     = useState(map.name);
  const [nameEditing, setNameEditing] = useState(false);
  const [isPublic,    setIsPublic]    = useState(map.is_public);
  const [uploading,   setUploading]   = useState(false);

  /* ── Load markers ────────────────────────────────────────────────────── */
  const loadMarkers = useCallback(async () => {
    const { data } = await supabase
      .from('map_markers').select('*').eq('map_id', map.id).order('created_at');
    setMarkers(data || []);
  }, [map.id]);

  useEffect(() => { loadMarkers(); }, [loadMarkers]);

  /* ── Coordinate conversion — stable (uses refs) ──────────────────────── */
  const getCoords = useCallback((cx, cy) => {
    const c = containerRef.current, i = imgRef.current;
    if (!c || !i) return null;
    const r  = c.getBoundingClientRect();
    const ix = (cx - r.left - panRef.current.x) / zoomRef.current;
    const iy = (cy - r.top  - panRef.current.y) / zoomRef.current;
    const px = (ix / i.offsetWidth)  * 100;
    const py = (iy / i.offsetHeight) * 100;
    if (px < 0 || px > 100 || py < 0 || py > 100) return null;
    return { x: px, y: py };
  }, []); // intentionally empty — reads only refs

  /* ── Reset view ──────────────────────────────────────────────────────── */
  const resetView = useCallback(() => {
    const c = containerRef.current, i = imgRef.current;
    if (!c || !i) return;
    const cw = c.offsetWidth, ch = c.offsetHeight;
    const iw = i.naturalWidth  || i.offsetWidth  || 800;
    const ih = i.naturalHeight || i.offsetHeight || 600;
    const s  = Math.min(cw / iw, ch / ih) * 0.92;
    applyZoom(s);
    applyPan({ x: (cw - iw * s) / 2, y: (ch - ih * s) / 2 });
  }, [applyZoom, applyPan]);

  /* ── Mouse wheel zoom ────────────────────────────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      applyZoom(Math.min(10, Math.max(0.15, zoomRef.current * (e.deltaY < 0 ? 1.15 : 0.87))));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [applyZoom]);

  /* ── Touch events — must be passive:false for pinch + pan to work ───── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const touchDist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const imagePath = map.image_path; // captured at effect run time

    const onStart = (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        drag.current = { on: true, sx: t.clientX, sy: t.clientY,
                          px: panRef.current.x, py: panRef.current.y, moved: false };
      } else if (e.touches.length === 2) {
        drag.current.on = false;
        pinchDist.current = touchDist(e.touches[0], e.touches[1]);
      }
    };

    const onMove = (e) => {
      e.preventDefault(); // prevent page scroll / browser zoom
      if (e.touches.length === 1 && drag.current.on) {
        const t  = e.touches[0];
        const dx = t.clientX - drag.current.sx, dy = t.clientY - drag.current.sy;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) drag.current.moved = true;
        applyPan({ x: drag.current.px + dx, y: drag.current.py + dy });
      } else if (e.touches.length === 2 && pinchDist.current) {
        const d = touchDist(e.touches[0], e.touches[1]);
        applyZoom(Math.min(10, Math.max(0.15, zoomRef.current * (d / pinchDist.current))));
        pinchDist.current = d;
      }
    };

    const onEnd = (e) => {
      const moved = drag.current.moved;
      drag.current.on = false; drag.current.moved = false; pinchDist.current = null;
      if (!moved && e.changedTouches.length === 1 && imagePath) {
        if (editingRef.current) { setEditing(null); return; }
        const tc = e.changedTouches[0];
        const c  = getCoords(tc.clientX, tc.clientY);
        if (c) { setEditing({ mode: 'add', ...c }); setForm({ category: 'main', title: '', description: '', found: false }); }
      }
    };

    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, [map.image_path, getCoords, applyPan, applyZoom]);

  /* ── Mouse pan ───────────────────────────────────────────────────────── */
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    drag.current = { on: true, sx: e.clientX, sy: e.clientY,
                      px: panRef.current.x, py: panRef.current.y, moved: false };
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!drag.current.on) return;
    const dx = e.clientX - drag.current.sx, dy = e.clientY - drag.current.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.current.moved = true;
    applyPan({ x: drag.current.px + dx, y: drag.current.py + dy });
  }, [applyPan]);

  const onMouseUp = useCallback((e) => {
    if (!drag.current.on) return;
    const moved = drag.current.moved;
    drag.current.on = false; drag.current.moved = false;
    if (!moved && map.image_path) {
      if (editingRef.current) { setEditing(null); return; } // tap outside closes popup
      const c = getCoords(e.clientX, e.clientY);
      if (c) { setEditing({ mode: 'add', ...c }); setForm({ category: 'main', title: '', description: '', found: false }); }
    }
  }, [map.image_path, getCoords]);

  /* ── Save / delete marker ────────────────────────────────────────────── */
  const saveMarker = async () => {
    if (!editing) return;
    if (editing.mode === 'add') {
      const { data } = await supabase.from('map_markers').insert([{
        map_id: map.id, user_id: userId,
        category: form.category, title: form.title,
        description: form.description, found: form.found,
        x: editing.x, y: editing.y,
      }]).select().single();
      if (data) setMarkers(m => [data, ...m]);
    } else {
      const { data } = await supabase.from('map_markers')
        .update({ category: form.category, title: form.title,
                  description: form.description, found: form.found })
        .eq('id', editing.marker.id).select().single();
      if (data) setMarkers(m => m.map(mk => mk.id === data.id ? data : mk));
    }
    setEditing(null);
  };

  const deleteMarker = async (id) => {
    await supabase.from('map_markers').delete().eq('id', id);
    setMarkers(m => m.filter(mk => mk.id !== id));
    setEditing(null);
  };

  const toggleFound = async (marker) => {
    const { data } = await supabase.from('map_markers')
      .update({ found: !marker.found }).eq('id', marker.id).select().single();
    if (data) setMarkers(m => m.map(mk => mk.id === data.id ? data : mk));
    if (editing?.mode === 'edit' && editing.marker.id === marker.id) {
      setEditing(ed => ({ ...ed, marker: data }));
      setForm(f => ({ ...f, found: !f.found }));
    }
  };

  /* ── Image upload ────────────────────────────────────────────────────── */
  const uploadImage = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const path = `${userId}/${map.id}/bg-${Date.now()}.${file.name.split('.').pop().toLowerCase()}`;
    const { error } = await supabase.storage.from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });
    if (!error) {
      if (map.image_path) await supabase.storage.from(BUCKET).remove([map.image_path]);
      const { data } = await supabase.from('game_maps')
        .update({ image_path: path, updated_at: new Date().toISOString() })
        .eq('id', map.id).select().single();
      if (data) onUpdate(data);
    }
    setUploading(false); e.target.value = '';
  };

  /* ── Map settings ────────────────────────────────────────────────────── */
  const saveSetting = async (updates) => {
    const { data } = await supabase.from('game_maps')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', map.id).select().single();
    if (data) onUpdate(data);
  };

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const visibleMarkers = markers.filter(m => visibleCats.has(m.category) && (showFound || !m.found));
  const counts = Object.fromEntries(CATEGORIES.map(c => [c.id, markers.filter(m => m.category === c.id).length]));
  const toggleCat = (id) => setVisibleCats(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* ── RENDER ──────────────────────────────────────────────────────────── */
  return (
    <div className="map-editor">

      {/* ══ Toolbar ══════════════════════════════════════════════════════ */}
      <div className="map-toolbar">
        <button className="map-back-btn" onClick={onBack}>← {t('map.back')}</button>

        {nameEditing ? (
          <input className="map-name-input" value={mapName}
            autoFocus
            onChange={e => setMapName(e.target.value)}
            onBlur={() => { setNameEditing(false); saveSetting({ name: mapName }); }}
            onKeyDown={e => {
              if (e.key === 'Enter')  { setNameEditing(false); saveSetting({ name: mapName }); }
              if (e.key === 'Escape') { setMapName(map.name); setNameEditing(false); }
            }} />
        ) : (
          <span className="map-name" onClick={() => setNameEditing(true)} title={t('map.clickRename')}>
            {mapName}<span className="map-name-edit-icon"> ✎</span>
          </span>
        )}

        <div className="map-toolbar-right">
          <button
            className={`map-toolbar-btn${isPublic ? ' active-green' : ''}`}
            title={isPublic ? 'Public — click to make private' : 'Private — click to make public'}
            onClick={() => { const v = !isPublic; setIsPublic(v); saveSetting({ is_public: v }); }}
          >{isPublic ? '🌍' : '🔒'}</button>

          <label className={`map-toolbar-btn${uploading ? ' busy' : ''}`} title={t('map.uploadImage')}>
            {uploading ? '⏳' : '🖼️'}
            <input type="file" accept="image/*" onChange={uploadImage} disabled={uploading} style={{ display: 'none' }} />
          </label>

          <button className="map-toolbar-btn" onClick={resetView} title={t('map.resetView')}>⌖</button>

          <button className="map-toolbar-btn" onClick={() => setSidebarOpen(o => !o)} title="Toggle panel">
            {sidebarOpen ? '▶' : '◀'}
          </button>
        </div>
      </div>

      {/* ══ Body ═════════════════════════════════════════════════════════ */}
      <div className="map-body">

        {/* ── Canvas ─────────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="map-canvas-wrap"
          style={{ cursor: map.image_path ? (editing ? 'default' : 'crosshair') : 'default' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { drag.current.on = false; }}
        >
          {!map.image_path ? (
            <div className="map-no-image">
              <span style={{ fontSize: 52 }}>🗺️</span>
              <p>{t('map.noImage')}</p>
              <label className="btn-save" style={{ cursor: 'pointer' }}>
                📤 {t('map.uploadImage')}
                <input type="file" accept="image/*" onChange={uploadImage} style={{ display: 'none' }} />
              </label>
            </div>
          ) : (
            <div className="map-canvas"
              style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
              <div className="map-img-wrap">
                <img ref={imgRef} src={mapImgUrl(map.image_path)}
                  className="map-bg-img" onLoad={resetView} draggable={false} alt="map" />

                {/* Pulsing ring at pending placement */}
                {editing?.mode === 'add' && (
                  <div className="map-marker-pending" style={{ left: `${editing.x}%`, top: `${editing.y}%` }} />
                )}

                {/* Placed markers */}
                {visibleMarkers.map(m => {
                  const cat      = CAT[m.category] || CAT.custom;
                  const isActive = editing?.mode === 'edit' && editing.marker.id === m.id;
                  return (
                    <div key={m.id}
                      className={`map-marker${m.found ? ' found' : ''}${isActive ? ' active' : ''}`}
                      style={{ left: `${m.x}%`, top: `${m.y}%`, '--cc': cat.color }}
                      title={m.title || cat.label}
                      onClick={e => {
                        e.stopPropagation();
                        setEditing({ mode: 'edit', marker: m });
                        setForm({ category: m.category, title: m.title, description: m.description, found: m.found });
                      }}>
                      <span className="map-marker-icon">{cat.icon}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Floating popup (add / edit marker) ── */}
          {editing && (
            <div className="map-popup"
              onMouseDown={e => e.stopPropagation()}
              onMouseUp={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}>

              <div className="map-popup-title">
                {editing.mode === 'add'
                  ? `📍 ${t('map.addMarker')}`
                  : `✎ ${t('map.editMarker')}`}
                <button className="map-popup-close" onClick={() => setEditing(null)}>✕</button>
              </div>

              {/* Category picker */}
              <div className="map-cat-row">
                {CATEGORIES.map(c => (
                  <button key={c.id}
                    className={`map-cat-btn${form.category === c.id ? ' on' : ''}`}
                    style={form.category === c.id ? { borderColor: c.color, background: c.color + '28' } : {}}
                    onClick={() => setForm(f => ({ ...f, category: c.id }))}
                    title={c.label}
                  >{c.icon}</button>
                ))}
              </div>

              <input className="map-sb-input" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') saveMarker(); if (e.key === 'Escape') setEditing(null); }}
                placeholder={t('map.markerTitle')}
                autoFocus />

              <textarea className="map-sb-textarea" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t('map.markerDesc')} rows={2} />

              <label className="map-found-lbl">
                <input type="checkbox" checked={form.found}
                  onChange={e => setForm(f => ({ ...f, found: e.target.checked }))} />
                {t('map.markFound')}
              </label>

              <div className="map-sb-actions">
                <button className="map-sb-save" onClick={saveMarker}>{t('map.save')}</button>
                {editing.mode === 'edit' && (
                  <button className="map-sb-del" onClick={() => deleteMarker(editing.marker.id)}>🗑️</button>
                )}
                <button className="map-sb-cancel" onClick={() => setEditing(null)}>✕</button>
              </div>
            </div>
          )}

          {/* Hint when no popup is open */}
          {map.image_path && !editing && (
            <div className="map-canvas-hint">
              {t('map.clickToAdd')}
            </div>
          )}
        </div>

        {/* ── Sidebar: filters + list ─────────────────────────────────── */}
        <div className={`map-sidebar${sidebarOpen ? '' : ' collapsed'}`}>

          <div className="map-sb-head">{t('map.filters')}</div>
          <div className="map-cat-filters">
            {CATEGORIES.map(c => (
              <button key={c.id}
                className={`map-fcat${visibleCats.has(c.id) ? ' on' : ' off'}`}
                style={visibleCats.has(c.id) ? { borderColor: c.color } : {}}
                onClick={() => toggleCat(c.id)}
                title={c.label}
              >
                {c.icon}<span className="map-fcat-count">{counts[c.id]}</span>
              </button>
            ))}
          </div>

          <label className="map-found-lbl map-found-filter">
            <input type="checkbox" checked={showFound} onChange={e => setShowFound(e.target.checked)} />
            {t('map.showFound')}
          </label>

          <div className="map-sb-head map-sb-list-head">
            {t('map.markers')} ({visibleMarkers.length})
          </div>

          <div className="map-sb-list-section">
            {visibleMarkers.length === 0 ? (
              <p className="map-sb-empty">
                {map.image_path ? t('map.clickToAdd') : t('map.uploadFirst')}
              </p>
            ) : (
              <div className="map-marker-list">
                {visibleMarkers.map(m => {
                  const cat      = CAT[m.category] || CAT.custom;
                  const isActive = editing?.mode === 'edit' && editing.marker.id === m.id;
                  return (
                    <div key={m.id}
                      className={`map-mrow${m.found ? ' found' : ''}${isActive ? ' active' : ''}`}
                      onClick={() => {
                        setEditing({ mode: 'edit', marker: m });
                        setForm({ category: m.category, title: m.title, description: m.description, found: m.found });
                      }}>
                      <span className="map-mrow-icon">{cat.icon}</span>
                      <span className="map-mrow-title">{m.title || cat.label}</span>
                      <button
                        className={`map-found-dot${m.found ? ' on' : ''}`}
                        title={m.found ? t('map.unmarkFound') : t('map.markFound')}
                        onClick={e => { e.stopPropagation(); toggleFound(m); }}
                      >{m.found ? '✓' : '○'}</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
