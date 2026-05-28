import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';

const BUCKET   = 'game-media';
const MAX_FILES = 10;

export default function GameNotesMedia({ gameId, userId }) {
  const { t } = useT();

  // ── Notes ──────────────────────────────────────────────────────────────
  const [noteContent, setNoteContent] = useState('');
  const [noteSaving,  setNoteSaving]  = useState(false);
  const [noteSavedAt, setNoteSavedAt] = useState(null);
  const debounceRef = useRef(null);

  // ── Media ───────────────────────────────────────────────────────────────
  const [mediaFiles,   setMediaFiles]   = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [lightbox,     setLightbox]     = useState(null);

  // ── Loaders ─────────────────────────────────────────────────────────────
  const loadNote = useCallback(async () => {
    const { data } = await supabase
      .from('game_notes')
      .select('content')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .maybeSingle();
    if (data) setNoteContent(data.content || '');
  }, [gameId, userId]);

  const loadMedia = useCallback(async () => {
    setMediaLoading(true);
    const { data } = await supabase
      .from('game_media')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setMediaFiles(data || []);
    setMediaLoading(false);
  }, [gameId, userId]);

  useEffect(() => {
    loadNote();
    loadMedia();
  }, [loadNote, loadMedia]);

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // ── Notes handlers ───────────────────────────────────────────────────────
  const saveNote = useCallback(async (content) => {
    setNoteSaving(true);
    await supabase.from('game_notes').upsert(
      { game_id: gameId, user_id: userId, content, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,game_id' }
    );
    setNoteSaving(false);
    setNoteSavedAt(new Date());
  }, [gameId, userId]);

  const handleNoteChange = (value) => {
    setNoteContent(value);
    setNoteSavedAt(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNote(value), 1000);
  };

  // ── Media handlers ───────────────────────────────────────────────────────
  const mediaUrl = (path) =>
    `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (mediaFiles.length + files.length > MAX_FILES) {
      alert(t('notes.maxFiles', { n: MAX_FILES }));
      e.target.value = '';
      return;
    }
    setUploading(true);
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      const path = `${userId}/${gameId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type });
      if (!error) {
        await supabase.from('game_media').insert([{
          game_id: gameId, user_id: userId,
          file_path: path, file_name: file.name,
        }]);
      }
    }
    setUploading(false);
    e.target.value = '';
    loadMedia();
  };

  const handleDelete = async (media, ev) => {
    ev.stopPropagation();
    if (!window.confirm(t('notes.confirmDelete'))) return;
    await supabase.storage.from(BUCKET).remove([media.file_path]);
    await supabase.from('game_media').delete().eq('id', media.id);
    setMediaFiles(f => f.filter(m => m.id !== media.id));
    if (lightbox === mediaUrl(media.file_path)) setLightbox(null);
  };

  const saveStatus = noteSaving
    ? t('notes.saving')
    : noteSavedAt
    ? t('notes.saved')
    : '';

  return (
    <div className="nm-wrap">
      {/* ── Notes ── */}
      <div className="nm-section">
        <div className="nm-section-head">
          <span className="nm-section-title">📝 {t('notes.notesLabel')}</span>
          <span className={`nm-save-status${noteSaving ? ' saving' : noteSavedAt ? ' saved' : ''}`}>
            {saveStatus}
          </span>
        </div>
        <textarea
          className="nm-textarea"
          value={noteContent}
          onChange={e => handleNoteChange(e.target.value)}
          placeholder={t('notes.placeholder')}
          rows={7}
          spellCheck={false}
        />
      </div>

      {/* ── Media ── */}
      <div className="nm-section">
        <div className="nm-section-head">
          <span className="nm-section-title">🖼️ {t('notes.mediaLabel')}</span>
          <span className="nm-file-count">{mediaFiles.length}/{MAX_FILES}</span>
        </div>

        {mediaFiles.length < MAX_FILES && (
          <label className={`nm-upload-btn${uploading ? ' uploading' : ''}`}>
            {uploading ? t('notes.uploading') : t('notes.uploadBtn')}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        )}

        {mediaLoading ? (
          <div className="nm-empty">…</div>
        ) : mediaFiles.length === 0 ? (
          <div className="nm-empty">{t('notes.noMedia')}</div>
        ) : (
          <div className="nm-grid">
            {mediaFiles.map(m => (
              <div
                key={m.id}
                className="nm-item"
                onClick={() => setLightbox(mediaUrl(m.file_path))}
                title={m.file_name}
              >
                <img src={mediaUrl(m.file_path)} alt={m.file_name} loading="lazy" />
                <button
                  className="nm-item-del"
                  title={t('notes.deleteTitle')}
                  onClick={ev => handleDelete(m, ev)}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="nm-lightbox" onClick={() => setLightbox(null)}>
          <img
            src={lightbox}
            alt="preview"
            onClick={e => e.stopPropagation()}
          />
          <button className="nm-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
