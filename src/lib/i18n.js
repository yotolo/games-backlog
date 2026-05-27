import React, { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'game-vault-lang';
export const LANGS = ['en', 'it'];

// ── Translations ────────────────────────────────────────────────────────────
const T = {
  en: {
    // App
    'app.tagline':          "Alessio's Backlog",
    'app.loading':          'Loading...',
    'app.loadingGames':     'Loading games...',

    // Header
    'header.syncTrophies':  'Sync Trophies',
    'header.syncing':       'Sync...',
    'header.syncError':     'Error',
    'header.syncDone':      '{n} synced',
    'header.review':        'Review',
    'header.autoCover':     'Auto-cover',
    'header.addGame':       'Add Game',
    'header.signOut':       'Sign out',
    'header.syncTitle':     'Sync PSN trophies from Toshi-_-',
    'header.reviewTitle':   'Review matches and assign unmatched',
    'header.autoCoverTitle':'Auto-download missing covers',
    'header.signOutTitle':  'Sign out',

    // Empty vault
    'vault.emptyTitle':     'Your vault is empty!',
    'vault.emptySubtitle':  'Welcome! Start by adding games to your backlog.',
    'vault.emptyCta':       'Add your first game',

    // Confirms / alerts
    'confirm.delete':       'Are you sure you want to delete this game?',
    'confirm.autoCover':    'Auto-find covers for {n} games without an image?',
    'alert.noCoversNeeded': 'All games already have a cover!',
    'alert.autoCoverDone':  '✅ Updated {n} covers out of {total}!',

    // Auth
    'auth.signIn':          'Sign in',
    'auth.signUp':          'Sign up',
    'auth.email':           'Email',
    'auth.password':        'Password',
    'auth.emailPh':         'you@email.com',
    'auth.passwordPh':      '••••••••',
    'auth.signInBtn':       'Sign in',
    'auth.createBtn':       'Create account',
    'auth.confirmEmail':    'Check your email for the confirmation link!',
    'auth.or':              'or',
    'auth.google':          'Continue with Google',
    'auth.footer':          'Game Vault · Your personal backlog',

    // Env error
    'env.title':            'SETUP',
    'env.subtitle':         'Configuration required',
    'env.createFile':       'Create the .env.local file in the project root:',
    'env.restart':          'Then restart with npm start (or redeploy on Vercel with the variables configured).',

    // Filter bar
    'filter.search':        'Search for a game...',
    'filter.count':         '{n} games',
    'filter.all':           '🎯 All',
    'filter.done':          '✅ Completed',
    'filter.inProgress':    '🎮 In progress',
    'filter.toStart':       '🔜 To start',
    'filter.backlog':       '📦 Backlog',
    'filter.allFranchises': '📁 All franchises',
    'filter.allPlatforms':  '🕹️ All platforms',

    // Stats bar
    'stats.inVault':        'in the vault',
    'stats.games':          '{n} games',
    'stats.done':           'Completed',
    'stats.inProgress':     'In progress',
    'stats.toStart':        'To start',
    'stats.backlog':        'Backlog',

    // Game grid
    'grid.noGames':         'No games found',
    'grid.done':            'Done',
    'grid.inProgress':      'In progress',
    'grid.toStart':         'To start',
    'grid.backlog':         'Backlog',

    // Game modal
    'modal.editTitle':      '✏️ Edit Game',
    'modal.newTitle':       '➕ New Game',
    'modal.coverSearch':    '🔍 Search cover online',
    'modal.coverPh':        'Game name...',
    'modal.search':         'Search',
    'modal.uploadLabel':    '📁 Or upload manually',
    'modal.uploading':      'Uploading...',
    'modal.chooseFile':     '📤 Choose file',
    'modal.titleLabel':     'Title *',
    'modal.titlePh':        'Game title',
    'modal.franchiseLabel': 'Franchise / Series',
    'modal.franchisePh':    "e.g. Assassin's Creed",
    'modal.statusLabel':    'Status',
    'modal.platformsLabel': 'Platforms',
    'modal.ratingLabel':    'Rating',
    'modal.trophiesLabel':  'Trophies %',
    'modal.yearLabel':      'Year completed',
    'modal.yearPh':         'e.g. 2024',
    'modal.notesLabel':     'Personal notes',
    'modal.notesPh':        'Comments, impressions...',
    'modal.cancel':         'Cancel',
    'modal.saving':         'Saving...',
    'modal.saveChanges':    '💾 Save changes',
    'modal.addGame':        '➕ Add game',
    'modal.sDone':          '✅ Completed',
    'modal.sInProgress':    '🎮 In progress',
    'modal.sToStart':       '🔜 To start',
    'modal.sBacklog':       '📦 Backlog',

    // Sync review
    'sync.title':           '🏆 Trophy Sync Review',
    'sync.matchesTab':      '✅ Matches',
    'sync.unmatchedTab':    '❓ Unmatched',
    'sync.searchMatches':   'Search matches...',
    'sync.searchUnmatched': 'Search PSN title...',
    'sync.suspiciousOnly':  'Suspicious only ({n})',
    'sync.stats':           '✅ OK: {ok} · ⚠️ Suspicious: {bad}',
    'sync.noMatches':       'No matches to show',
    'sync.noTitles':        'No titles found',
    'sync.noGame':          '— no game —',
    'sync.removeTitle':     'Remove this match',
    'sync.assignTitle':     'Assign',
    'sync.close':           'Close',
  },

  it: {
    // App
    'app.tagline':          "Alessio's Backlog",
    'app.loading':          'Caricamento...',
    'app.loadingGames':     'Caricamento giochi...',

    // Header
    'header.syncTrophies':  'Sync Trofei',
    'header.syncing':       'Sync...',
    'header.syncError':     'Errore',
    'header.syncDone':      '{n} sync',
    'header.review':        'Revisiona',
    'header.autoCover':     'Auto-cover',
    'header.addGame':       'Aggiungi Gioco',
    'header.signOut':       'Esci',
    'header.syncTitle':     'Sincronizza trofei PSN da Toshi-_-',
    'header.reviewTitle':   'Revisiona match e assegna non trovati',
    'header.autoCoverTitle':'Scarica automaticamente le copertine mancanti',
    'header.signOutTitle':  "Esci dall'account",

    // Empty vault
    'vault.emptyTitle':     'Il tuo vault è vuoto!',
    'vault.emptySubtitle':  'Benvenuto! Inizia aggiungendo i giochi del tuo backlog.',
    'vault.emptyCta':       'Aggiungi il tuo primo gioco',

    // Confirms / alerts
    'confirm.delete':       'Sei sicuro di voler eliminare questo gioco?',
    'confirm.autoCover':    'Cerca copertine automaticamente per {n} giochi senza immagine?',
    'alert.noCoversNeeded': 'Tutti i giochi hanno già una copertina!',
    'alert.autoCoverDone':  '✅ Aggiornate {n} copertine su {total}!',

    // Auth
    'auth.signIn':          'Accedi',
    'auth.signUp':          'Registrati',
    'auth.email':           'Email',
    'auth.password':        'Password',
    'auth.emailPh':         'tu@email.com',
    'auth.passwordPh':      '••••••••',
    'auth.signInBtn':       'Accedi',
    'auth.createBtn':       'Crea account',
    'auth.confirmEmail':    'Controlla la tua email per il link di conferma!',
    'auth.or':              'oppure',
    'auth.google':          'Continua con Google',
    'auth.footer':          'Game Vault · Il tuo backlog personale',

    // Env error
    'env.title':            'SETUP',
    'env.subtitle':         'Configurazione richiesta',
    'env.createFile':       'Crea il file .env.local nella root del progetto:',
    'env.restart':          'Poi riavvia con npm start (o rideploya su Vercel con le variabili configurate).',

    // Filter bar
    'filter.search':        'Cerca un gioco...',
    'filter.count':         '{n} giochi',
    'filter.all':           '🎯 Tutti',
    'filter.done':          '✅ Completati',
    'filter.inProgress':    '🎮 In corso',
    'filter.toStart':       '🔜 Da iniziare',
    'filter.backlog':       '📦 Backlog',
    'filter.allFranchises': '📁 Tutte le saghe',
    'filter.allPlatforms':  '🕹️ Tutte le piattaforme',

    // Stats bar
    'stats.inVault':        'nel vault',
    'stats.games':          '{n} giochi',
    'stats.done':           'Completati',
    'stats.inProgress':     'In corso',
    'stats.toStart':        'Da iniziare',
    'stats.backlog':        'Backlog',

    // Game grid
    'grid.noGames':         'Nessun gioco trovato',
    'grid.done':            'Done',
    'grid.inProgress':      'In corso',
    'grid.toStart':         'Da iniziare',
    'grid.backlog':         'Backlog',

    // Game modal
    'modal.editTitle':      '✏️ Modifica Gioco',
    'modal.newTitle':       '➕ Nuovo Gioco',
    'modal.coverSearch':    '🔍 Cerca copertina online',
    'modal.coverPh':        'Nome gioco...',
    'modal.search':         'Cerca',
    'modal.uploadLabel':    '📁 Oppure carica manualmente',
    'modal.uploading':      'Caricamento...',
    'modal.chooseFile':     '📤 Scegli file',
    'modal.titleLabel':     'Titolo *',
    'modal.titlePh':        'Nome del gioco',
    'modal.franchiseLabel': 'Saga / Franchise',
    'modal.franchisePh':    "es. Assassin's Creed",
    'modal.statusLabel':    'Stato',
    'modal.platformsLabel': 'Piattaforme',
    'modal.ratingLabel':    'Valutazione',
    'modal.trophiesLabel':  'Trofei %',
    'modal.yearLabel':      'Anno completamento',
    'modal.yearPh':         'es. 2024',
    'modal.notesLabel':     'Note personali',
    'modal.notesPh':        'Commenti, impressioni...',
    'modal.cancel':         'Annulla',
    'modal.saving':         'Salvataggio...',
    'modal.saveChanges':    '💾 Salva modifiche',
    'modal.addGame':        '➕ Aggiungi gioco',
    'modal.sDone':          '✅ Completato',
    'modal.sInProgress':    '🎮 In corso',
    'modal.sToStart':       '🔜 Da iniziare',
    'modal.sBacklog':       '📦 Backlog',

    // Sync review
    'sync.title':           '🏆 Revisione Sync Trofei',
    'sync.matchesTab':      '✅ Match',
    'sync.unmatchedTab':    '❓ Non trovati',
    'sync.searchMatches':   'Cerca tra i match...',
    'sync.searchUnmatched': 'Cerca titolo PSN...',
    'sync.suspiciousOnly':  'Solo sospetti ({n})',
    'sync.stats':           '✅ Ok: {ok} · ⚠️ Sospetti: {bad}',
    'sync.noMatches':       'Nessun match da mostrare',
    'sync.noTitles':        'Nessun titolo trovato',
    'sync.noGame':          '— nessun gioco —',
    'sync.removeTitle':     'Rimuovi questo match',
    'sync.assignTitle':     'Assegna',
    'sync.close':           'Chiudi',
  },
};

// ── Context ─────────────────────────────────────────────────────────────────
const LangCtx = createContext({ lang: 'en', setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return LANGS.includes(saved) ? saved : 'en';
    } catch { return 'en'; }
  });

  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  };

  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Returns { t, lang, setLang }.
 * t(key, params?) — params: object with {placeholder: value} replacements.
 * Example: t('filter.count', { n: 42 })  →  "42 games"
 */
export function useT() {
  const { lang, setLang } = useContext(LangCtx);

  const t = (key, params) => {
    let str = T[lang]?.[key] ?? T.en?.[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };

  return { t, lang, setLang };
}
