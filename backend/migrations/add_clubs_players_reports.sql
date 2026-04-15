CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    country VARCHAR(100) NOT NULL,
    league VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    nationality VARCHAR(100),
    position VARCHAR(10) NOT NULL,
    club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
    market_value INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_players_club_id ON players(club_id);

CREATE TABLE IF NOT EXISTS scouting_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scout_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    player_name VARCHAR(200) NOT NULL,
    position VARCHAR(10) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 100),
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_scouting_reports_scout_id ON scouting_reports(scout_id);
CREATE INDEX IF NOT EXISTS ix_scouting_reports_player_id ON scouting_reports(player_id);
