// Centralized list of supported games with normalized titles
export const GAME_OPTIONS = [
  "League of Legends",
  "Dota 2",
  "Counter-Strike 2",
  "Rocket League",
  "Overwatch 2",
  "Apex Legends",
  "Valorant",
  "Mobile Legends",
  "Clash Royale",
  "Marvel Rivals",
  "Tekken 8",
  "StarCraft II",
  "EA FC",
  "Call of Duty: Warzone",
  "Call of Duty: Black Ops",
  "PUBG: Battlegrounds",
  "PUBG Mobile",
  "Fortnite",
  "CrossFire",
  "Honor of Kings",
  "Chess",
  "RENNSPORT",
  "Fatal Fury",
  "Street Fighter",

] as const;

export type GameOption = (typeof GAME_OPTIONS)[number];

// Map common legacy names and aliases to canonical titles in GAME_OPTIONS
const LEGACY_GAME_ALIASES: Record<string, GameOption> = {
  // Counter-Strike
  cs: "Counter-Strike 2",
  cs2: "Counter-Strike 2",
  "cs:go": "Counter-Strike 2",
  csgo: "Counter-Strike 2",
  "counter strike": "Counter-Strike 2",
  "counter-strike": "Counter-Strike 2",

  // League of Legends
  lol: "League of Legends",
  league: "League of Legends",
  "league of legends": "League of Legends",

  // Valorant
  valorant: "Valorant",

  // Dota 2
  dota: "Dota 2",
  dota2: "Dota 2",

  // Rocket League
  "rocket league": "Rocket League",

  // Overwatch 2
  overwatch: "Overwatch 2",
  "overwatch 2": "Overwatch 2",

  // Apex Legends
  apex: "Apex Legends",
  "apex legends": "Apex Legends",

  // Call of Duty variants
  cod: "Call of Duty: Warzone",
  "call of duty": "Call of Duty: Warzone",
  warzone: "Call of Duty: Warzone",
  "black ops": "Call of Duty: Black Ops",

  // PUBG
  pubg: "PUBG: Battlegrounds",
  "pubg battlegrounds": "PUBG: Battlegrounds",
  "pubg mobile": "PUBG Mobile",

  // EA FC / FIFA
  fifa: "EA FC",
  "ea fc": "EA FC",

  // Mobile Legends
  mlbb: "Mobile Legends",
  "mobile legends": "Mobile Legends",

  // Clash Royale
  "clash royale": "Clash Royale",

  // Honor of Kings
  "honor of kings": "Honor of Kings",

  // Street Fighter
  "street fighter": "Street Fighter",

  // StarCraft II
  "starcraft ii": "StarCraft II",
};

const CANONICAL_SET = new Set<string>(
  (GAME_OPTIONS as readonly string[]).map((g) => g.toLowerCase()),

);

/**
 * Normalize any incoming game title to the canonical GAME_OPTIONS value.
 * - Trims whitespace
 * - Lowercases for comparison
 * - Maps common aliases and legacy names
 * Returns the canonical title if found, otherwise returns the input trimmed.
 */
export function normalizeGameTitle(input: string | null | undefined): string {
  const raw = (input ?? "").trim();

  if (raw.length === 0) return raw;
  const lower = raw.toLowerCase();
  // If already a canonical title (case-insensitive), return the canonical cased version
  if (CANONICAL_SET.has(lower)) {
    const idx = (GAME_OPTIONS as readonly string[]).findIndex(
      (g) => g.toLowerCase() === lower,
    );

    return idx >= 0 ? GAME_OPTIONS[idx] : raw;
  }
  // Map via aliases
  if (LEGACY_GAME_ALIASES[lower]) return LEGACY_GAME_ALIASES[lower];
  // Fallback to raw (will be validated by zod where needed)
  return raw;
}
