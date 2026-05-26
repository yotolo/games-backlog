import { createClient } from "jsr:@supabase/supabase-js@2";

const AUTH_BASE = "https://ca.account.sony.com/api/authz/v3/oauth";
const TROPHY_BASE = "https://m.np.playstation.com/api/trophy/v1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function getAccessToken(npsso: string): Promise<string> {
  const params = new URLSearchParams({
    access_type: "offline",
    client_id: "09515159-7237-4370-9b40-3806e67c0891",
    redirect_uri: "com.scee.psxandroid.scecompcall://redirect",
    response_type: "code",
    scope: "psn:mobile.v2.core psn:clientapp",
  });

  const authRes = await fetch(`${AUTH_BASE}/authorize?${params}`, {
    headers: { Cookie: `npsso=${npsso}` },
    redirect: "manual",
  });

  const location = authRes.headers.get("location") ?? "";
  if (!location.includes("?code=")) {
    throw new Error("NPSSO non valido o scaduto. Rinnovalo da ca.account.sony.com/api/v1/ssocookie");
  }

  // location looks like: com.scee.psxandroid.scecompcall://redirect?code=v3.xxx&ctype=code
  const code = location.match(/[?&]code=([^&]+)/)?.[1];
  if (!code) throw new Error("Impossibile estrarre il codice dalla risposta Sony");

  const tokenRes = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // official client credentials used by psn-api
      Authorization: "Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=",
    },
    body: new URLSearchParams({
      code,
      redirect_uri: "com.scee.psxandroid.scecompcall://redirect",
      grant_type: "authorization_code",
      token_format: "jwt",
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Token exchange fallito: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

async function fetchAllTrophyTitles(accessToken: string): Promise<any[]> {
  const all: any[] = [];
  let offset = 0;

  while (true) {
    const res = await fetch(
      `${TROPHY_BASE}/users/me/trophyTitles?limit=200&offset=${offset}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) break;

    const data = await res.json();
    const titles: any[] = data.trophyTitles ?? [];
    all.push(...titles);
    if (titles.length < 200) break;
    offset += 200;
  }

  return all;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // accents → base letter
    .replace(/[''ʼ]/g, "'")
    .replace(/[^a-z0-9 ]/g, " ")       // keep only alphanumeric
    .replace(/\s+/g, " ")
    .trim();
}

function titlesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // one contains the other (handles subtitle differences)
  if (na.length > 4 && nb.includes(na)) return true;
  if (nb.length > 4 && na.includes(nb)) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const npsso = Deno.env.get("PSN_NPSSO");
  if (!npsso) return json({ error: "PSN_NPSSO non configurato come secret Supabase" }, 500);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const accessToken = await getAccessToken(npsso);
    const trophyTitles = await fetchAllTrophyTitles(accessToken);

    const { data: games } = await supabase.from("games").select("id, title");

    const matched: { psn: string; game: string; progress: number }[] = [];
    const unmatched: { title: string; progress: number }[] = [];

    for (const t of trophyTitles) {
      const psnTitle: string = t.trophyTitleName ?? "";
      const progress: number = t.progress ?? 0;

      const game = games?.find(g => titlesMatch(g.title, psnTitle));
      if (game) {
        await supabase
          .from("games")
          .update({ trophy_percent: progress })
          .eq("id", game.id);
        matched.push({ psn: psnTitle, game: game.title, progress });
      } else {
        unmatched.push({ title: psnTitle, progress });
      }
    }

    return json({
      success: true,
      updated: matched.length,
      totalPsn: trophyTitles.length,
      matched,
      unmatched,
    });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});
