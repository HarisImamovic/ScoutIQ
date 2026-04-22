CREATE TABLE IF NOT EXISTS saved_prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scout_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_saved_prospect UNIQUE (scout_id, player_id)
);

CREATE INDEX IF NOT EXISTS ix_saved_prospects_scout_id ON saved_prospects(scout_id);
CREATE INDEX IF NOT EXISTS ix_saved_prospects_player_id ON saved_prospects(player_id);

CREATE TABLE IF NOT EXISTS player_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scout_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_player_views_scout_id ON player_views(scout_id);
CREATE INDEX IF NOT EXISTS ix_player_views_player_id ON player_views(player_id);
CREATE INDEX IF NOT EXISTS ix_player_views_scout_viewed ON player_views(scout_id, viewed_at DESC);
