import client from "./client";

export interface PlayerClubInfo {
  id: string;
  name: string;
  short_name: string | null;
  country: string;
  league_name: string | null;
  primary_color: string | null;
  logo_url: string | null;
}

export interface PlayerStats {
  minutes_played: number | null;
  goals: number | null;
  assists: number | null;
  saves: number | null;
  defensive_contributions: number | null;
  chances_created: number | null;
  dribbles: number | null;
}

export interface MarketValuePoint {
  value: number;
  recorded_at: string;
}

export interface ScoutInterestItem {
  scout_id: string;
  scout_name: string;
  activity: string;
  timestamp: string;
}

export interface PlayerDashboardData {
  first_name: string;
  last_name: string;
  has_club: boolean;
  club: PlayerClubInfo | null;
  player_id: string | null;
  position: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  age: number | null;
  market_value: number | null;
  status: string;
  availability_status: string;
  stats: PlayerStats | null;
  market_value_history: MarketValuePoint[];
  scouting_interest: ScoutInterestItem[];
}

export interface HighlightItem {
  id: string;
  title: string | null;
  url: string;
  embed_url: string;
  status: string;
  created_at: string;
}

export interface CreateHighlightPayload {
  url: string;
  title?: string;
}

export const playerApi = {
  getDashboard: (): Promise<PlayerDashboardData> =>
    client.get("/player/dashboard").then((r) => r.data),

  getHighlights: (): Promise<HighlightItem[]> =>
    client.get("/player/highlights").then((r) => r.data),

  addHighlight: (data: CreateHighlightPayload): Promise<HighlightItem> =>
    client.post("/player/highlights", data).then((r) => r.data),

  updateHighlight: (id: string, data: CreateHighlightPayload): Promise<HighlightItem> =>
    client.put(`/player/highlights/${id}`, data).then((r) => r.data),

  deleteHighlight: (id: string): Promise<void> =>
    client.delete(`/player/highlights/${id}`).then(() => undefined),

  updateAvailability: (availabilityStatus: string): Promise<void> =>
    client.patch("/player/availability", { availability_status: availabilityStatus }).then(() => undefined),
};
