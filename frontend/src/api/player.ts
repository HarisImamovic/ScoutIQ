import client from "./client";

export interface PlayerClubInfo {
  id: string;
  name: string;
  short_name: string | null;
  country: string;
  league_name: string | null;
  primary_color: string | null;
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
  stats: PlayerStats | null;
  market_value_history: MarketValuePoint[];
  scouting_interest: ScoutInterestItem[];
}

export const playerApi = {
  getDashboard: (): Promise<PlayerDashboardData> =>
    client.get("/player/dashboard").then((r) => r.data),
};
