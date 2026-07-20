import axios from "axios";
import client from "./client";
import type { ScoutPlayersResponse } from "./scout";
import type { PlayerStats } from "./player";
import { extractFilename } from "@/lib/download";

export function isNoClubError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    error.response?.status === 400 &&
    typeof error.response?.data?.detail === "string" &&
    error.response.data.detail.includes("not associated with a club")
  );
}

export function isConflictError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 409;
}

export interface ClubInfo {
  id: string;
  name: string;
  short_name: string | null;
  country: string | null;
  league_name: string | null;
  stadium_name: string | null;
  stadium_capacity: number | null;
  primary_color: string | null;
  logo_url: string | null;
}

export interface ClubDashboardStats {
  squad_count: number;
  scout_count: number;
  pending_reports: number;
  approved_reports: number;
  rejected_reports: number;
}

export interface ClubScoutPerformance {
  scout_id: string;
  name: string;
  report_count: number;
}

export interface ClubReportSummary {
  id: string;
  player_name: string;
  position: string;
  scout_name: string;
  rating: number;
  status: string;
  created_at: string;
}

export interface ClubDashboardResponse {
  club: ClubInfo;
  stats: ClubDashboardStats;
  scouts: ClubScoutPerformance[];
  recent_reports: ClubReportSummary[];
}

export interface ClubPlayerItem {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  age: number | null;
  nationality: string | null;
  market_value: number | null;
  status: string;
  stats: PlayerStats;
}

export interface UpdatePlayerStatsPayload {
  minutes_played: number | null;
  goals: number | null;
  assists: number | null;
  saves: number | null;
  defensive_contributions: number | null;
  chances_created: number | null;
  dribbles: number | null;
}

export interface ClubReportItem {
  id: string;
  player_name: string;
  position: string;
  scout_id: string;
  scout_name: string;
  rating: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ContractItem {
  id: string;
  player_id: string;
  club_id: string;
  player_name: string;
  position: string | null;
  age: number | null;
  weekly_salary: number;
  start_date: string | null;
  contract_until: string | null;
  availability_status: string;
  created_at: string;
  updated_at: string | null;
}

export interface CreateContractPayload {
  player_id: string;
  weekly_salary: number;
  start_date: string;
  contract_until: string;
  availability_status: string;
}

export interface UpdateContractPayload {
  weekly_salary: number;
  start_date: string;
  contract_until: string;
  availability_status: string;
}

export interface PlayersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  position?: string;
}

export const clubAdminApi = {
  getDashboard: (): Promise<ClubDashboardResponse> =>
    client.get("/club/dashboard").then((r) => r.data),

  getSquad: (params: { search?: string; position?: string } = {}): Promise<ClubPlayerItem[]> =>
    client.get("/club/players", { params }).then((r) => r.data),

  updatePlayerStats: (id: string, data: UpdatePlayerStatsPayload): Promise<PlayerStats> =>
    client.patch(`/club/players/${id}/stats`, data).then((r) => r.data),

  browsePlayers: (params: PlayersQueryParams = {}): Promise<ScoutPlayersResponse> =>
    client.get("/club/players/browse", { params }).then((r) => r.data),

  getReports: (): Promise<ClubReportItem[]> =>
    client.get("/club/reports").then((r) => r.data),

  updateReportStatus: (id: string, status: "approved" | "rejected"): Promise<ClubReportItem> =>
    client.put(`/club/reports/${id}/status`, { status }).then((r) => r.data),

  exportReportPdf: (id: string): Promise<{ blob: Blob; filename: string }> =>
    client.get(`/club/reports/${id}/export`, { responseType: "blob" }).then((r) => ({
      blob: r.data as Blob,
      filename: extractFilename(r.headers["content-disposition"]) ?? `scouting_report_${id}.pdf`,
    })),

  getContracts: (): Promise<ContractItem[]> =>
    client.get("/club/contracts").then((r) => r.data),

  createContract: (data: CreateContractPayload): Promise<ContractItem> =>
    client.post("/club/contracts", data).then((r) => r.data),

  updateContract: (id: string, data: UpdateContractPayload): Promise<ContractItem> =>
    client.put(`/club/contracts/${id}`, data).then((r) => r.data),

  deleteContract: (id: string): Promise<void> =>
    client.delete(`/club/contracts/${id}`).then(() => undefined),
};
