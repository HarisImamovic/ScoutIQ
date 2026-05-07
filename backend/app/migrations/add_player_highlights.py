"""
Run from the backend directory:
    python -m app.migrations.add_player_highlights

Adds the player_highlights table.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text

from app.database import engine


def run():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS player_highlights (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
                title       VARCHAR(200),
                url         TEXT NOT NULL,
                embed_url   TEXT NOT NULL,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_player_highlights_player_id
                ON player_highlights(player_id);
        """))
        conn.commit()
    print("player_highlights table created successfully.")


if __name__ == "__main__":
    run()
