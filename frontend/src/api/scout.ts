import client from "./client";

export interface ScoutDashboardStats {
  players_viewed: number;
  saved_prospects: number;
  reports_written: number;
}

export interface RecentPlayerItem {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  nationality: string | null;
  club_name: string | null;
  age: number | null;
  market_value: number | null;
  last_viewed: string;
}

export interface SavedProspectSummary {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  nationality: string | null;
  club_name: string | null;
  age: number | null;
  saved_at: string;
}

export interface ScoutDashboardResponse {
  stats: ScoutDashboardStats;
  recently_viewed: RecentPlayerItem[];
  saved_prospects: SavedProspectSummary[];
}

export interface ScoutPlayerItem {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  age: number | null;
  nationality: string | null;
  club_id: string | null;
  club_name: string | null;
  market_value: number | null;
  status: string;
  is_saved: boolean;
}

export interface ScoutPlayersResponse {
  items: ScoutPlayerItem[];
  total: number;
  page: number;
  pages: number;
}

export interface ScoutSavedProspectItem {
  id: string;
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  age: number | null;
  nationality: string | null;
  club_name: string | null;
  market_value: number | null;
  saved_at: string;
}

export interface ScoutReportItem {
  id: string;
  player_id: string | null;
  player_name: string;
  position: string;
  rating: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface PlayersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  position?: string;
  club_id?: string;
}

export interface PlayerDropdownItem {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
}

export interface CreateReportPayload {
  player_id?: string;
  player_name: string;
  position: string;
  rating: number;
  status: string;
  notes?: string;
}

export interface UpdateReportPayload extends CreateReportPayload {}

export const scoutApi = {
  getDashboard: (): Promise<ScoutDashboardResponse> =>
    client.get("/scout/dashboard").then((r) => r.data),

  getPlayersForDropdown: (): Promise<PlayerDropdownItem[]> =>
    client.get("/scout/players/dropdown").then((r) => r.data),

  getPlayers: (params: PlayersQueryParams = {}): Promise<ScoutPlayersResponse> =>
    client.get("/scout/players", { params }).then((r) => r.data),

  recordView: (playerId: string): Promise<void> =>
    client.post(`/scout/players/${playerId}/view`).then(() => undefined),

  getSavedProspects: (): Promise<ScoutSavedProspectItem[]> =>
    client.get("/scout/saved-prospects").then((r) => r.data),

  saveProspect: (playerId: string): Promise<void> =>
    client.post(`/scout/saved-prospects/${playerId}`).then(() => undefined),

  unsaveProspect: (playerId: string): Promise<void> =>
    client.delete(`/scout/saved-prospects/${playerId}`).then(() => undefined),

  getReports: (): Promise<ScoutReportItem[]> =>
    client.get("/scout/reports").then((r) => r.data),

  createReport: (data: CreateReportPayload): Promise<ScoutReportItem> =>
    client.post("/scout/reports", data).then((r) => r.data),

  updateReport: (id: string, data: UpdateReportPayload): Promise<ScoutReportItem> =>
    client.put(`/scout/reports/${id}`, data).then((r) => r.data),

  deleteReport: (id: string): Promise<void> =>
    client.delete(`/scout/reports/${id}`).then(() => undefined),
};
