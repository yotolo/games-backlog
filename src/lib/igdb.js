const RAWG_BASE = 'https://api.rawg.io/api';
const RAWG_KEY = process.env.REACT_APP_RAWG_KEY || '';

export async function searchGameCovers(title) {
  if (!RAWG_KEY) {
    console.warn('RAWG API key mancante. Aggiungi REACT_APP_RAWG_KEY nel file .env.local');
    return [];
  }
  try {
    const query = encodeURIComponent(title);
    const res = await fetch(
      `${RAWG_BASE}/games?search=${query}&page_size=6&key=${RAWG_KEY}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .filter(g => g.background_image)
      .map(g => ({
        id: g.id,
        name: g.name,
        cover: g.background_image,
        released: g.released,
        platforms: (g.platforms || []).map(p => p.platform.name),
      }));
  } catch (e) {
    console.error('RAWG search error:', e);
    return [];
  }
}
