export const env = {
  baseUrl: process.env.BASE_URL ?? "http://localhost:8080",
  adminEmail: process.env.TEST_ADMIN_EMAIL ?? "",
  adminPassword: process.env.TEST_ADMIN_PASSWORD ?? "",
  clubAdminEmail: process.env.TEST_CLUB_ADMIN_EMAIL ?? "",
  clubAdminPassword: process.env.TEST_CLUB_ADMIN_PASSWORD ?? "",
  scoutEmail: process.env.TEST_SCOUT_EMAIL ?? "",
  scoutPassword: process.env.TEST_SCOUT_PASSWORD ?? "",
  playerEmail: process.env.TEST_PLAYER_EMAIL ?? "",
  playerPassword: process.env.TEST_PLAYER_PASSWORD ?? "",
};
