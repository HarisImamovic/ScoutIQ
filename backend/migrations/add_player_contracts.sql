CREATE TABLE IF NOT EXISTS player_contracts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    player_name VARCHAR(200) NOT NULL,
    position    VARCHAR(10)  NOT NULL,
    age         INTEGER,
    weekly_salary INTEGER NOT NULL,
    contract_until DATE,
    availability_status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_player_contracts_club_id ON player_contracts(club_id);
