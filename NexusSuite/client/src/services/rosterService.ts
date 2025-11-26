import { apiRequest } from "../lib/queryClient";


export interface Roster {
  id: string;
  organizationId: string; // maps from tenantId
  createdBy: string; // not provided by API, default ""
  name: string; // not provided by API, default ""
  description?: string;
  game: string;
  // Roster type per product spec
  type: "International competitive" | "Local Competitive" | "Academy";

  // Capacity defaults to 5 until backend provides a value
  maxPlayers: number; // default 5
  // playerCount defaults to 0 until backend provides a value
  playerCount: number; // default 0
  isActive: boolean; // default true
  createdAt: Date;
  updatedAt: Date;
}

export interface RosterPlayer {
  id: string;
  rosterId: string;
  playerId: string;
  role: string;
  joinedAt: Date;
  isActive: boolean;
}

export interface CreateRosterData {
  organizationId: string;
  createdBy: string;
  name: string;
  description?: string;
  game: string;
  type: "International competitive" | "Local Competitive" | "Academy";

  maxPlayers: number;
}

export interface RosterFilters {
  organizationId: string;
  game?: string;
  type?: string;
  search?: string;
  limit?: number;
  startAfter?: string;
}

export interface PlayerAssignment {
  playerId: string;
  role: string;
}

function toDate(value: string | Date | null | undefined): Date {
  if (!value) return new Date();
  return typeof value === "string" ? new Date(value) : value;

}

function toRoster(api: any): Roster {
  return {
    id: api.id,
    organizationId: api.tenantId ?? "",
    createdBy: "",
    name: api.name ?? "",
    description: api.description ?? undefined,
    game: api.game ?? "",
    type: (api.type as Roster["type"]) ?? "International competitive",

    maxPlayers: api.maxPlayers ?? 5,
    playerCount: api.playerCount ?? 0,
    isActive: api.isActive ?? true,
    createdAt: toDate(api.createdAt),
    updatedAt: toDate(api.updatedAt),
  };
}

export class RosterService {
  async getRosters(
    _organizationId: string,
    _filters?: RosterFilters,
  ): Promise<Roster[]> {
    const res = await apiRequest("/api/rosters", "GET");

    const json = await res.json();
    return (json as any[]).map(toRoster);
  }

  async getRosterById(rosterId: string): Promise<Roster | null> {
    const res = await apiRequest(`/api/rosters/${rosterId}`, "GET");

    const json = await res.json();
    return json ? toRoster(json) : null;
  }

  async createRoster(data: CreateRosterData): Promise<Roster> {
    // Server expects InsertRoster { tenantId, playerId, game, role }.
    // Map best-effort fields and rely on server validation.
    const payload: any = {
      game: data.game,
      role: "player",
      playerId: data.createdBy, // placeholder: caller should provide proper playerId via API in future
    };
    const res = await apiRequest("/api/rosters", "POST", payload);

    const json = await res.json();
    return toRoster(json);
  }

  async updateRoster(
    rosterId: string,
    updates: Partial<Roster>,
  ): Promise<void> {

    // Map client-side Roster fields to server document. The backend allows partial updates.
    // Firestore storage is schemaless, so additional fields like `name`, `description`, `type`, `maxPlayers`
    // can be stored even if not present in the SQL schema. For SQL/Drizzle, unknown fields are ignored.
    const payload: Record<string, any> = {};

    if (typeof updates.game !== "undefined") payload.game = updates.game;
    // Roster "type" is a display/classification; keep it in the document for UI
    if (typeof updates.type !== "undefined") payload.type = updates.type;
    if (typeof updates.name !== "undefined") payload.name = updates.name;
    if (typeof updates.description !== "undefined")
      payload.description = updates.description;
    if (typeof updates.maxPlayers !== "undefined")
      payload.maxPlayers = updates.maxPlayers;
    if (typeof updates.isActive !== "undefined")
      payload.isActive = updates.isActive;
    // Touch updatedAt to reflect changes
    payload.updatedAt = new Date().toISOString();

    await apiRequest(`/api/rosters/${rosterId}`, "PATCH", payload);
  }

  async deleteRoster(rosterId: string): Promise<void> {
    await apiRequest(`/api/rosters/${rosterId}`, "DELETE");
  }

  async getRosterPlayers(rosterId: string): Promise<RosterPlayer[]> {
    const res = await apiRequest(`/api/rosters/${rosterId}/players`, "GET");

    const json = await res.json();
    return (json as any[]).map((p: any) => ({
      id: p.id,
      rosterId,
      playerId: p.playerId,
      role: p.role ?? "player",

      joinedAt: toDate(p.joinedAt),
      isActive: p.isActive ?? true,
    }));
  }

  async assignPlayersToRoster(
    rosterId: string,
    players: PlayerAssignment[],
  ): Promise<void> {
    await apiRequest(`/api/rosters/${rosterId}/players`, "POST", { players });
  }

  async removePlayerFromRoster(
    rosterId: string,
    playerId: string,
  ): Promise<void> {
    await apiRequest(`/api/rosters/${rosterId}/players/${playerId}`, "DELETE");

  }

  async getPlayerRosters(playerId: string): Promise<Roster[]> {
    // Fallback: fetch all and filter client-side
    const all = await this.getRosters("", undefined);
    return all.filter((r) => (r as any).playerId === playerId);

  }
}

export const rosterService = new RosterService();
