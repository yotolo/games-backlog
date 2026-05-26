// Using RAWG API - free, no auth required for basic searches
const RAWG_BASE = 'https://api.rawg.io/api';
const RAWG_KEY = ''; // public endpoint works without key for basic use

export async function searchGameCovers(title) {
  try {
    const query = encodeURIComponent(title);
    const res = await fetch(
      `${RAWG_BASE}/games?search=${query}&page_size=5&key=`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map(g => ({
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
