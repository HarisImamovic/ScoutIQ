"""
Run from the backend directory:
    python -m app.migrations.redesign_contracts

- Drops 7 orphaned tables that have no SQLAlchemy models and 0 rows
- Drops and recreates player_contracts with a proper player_id FK
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text
from app.database import engine


def run():
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS contracts CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS highlights CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS player_profiles CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS player_season_stats CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS reports CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS suggestions CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS user_settings CASCADE"))

        conn.execute(text("DROP TABLE IF EXISTS player_contracts CASCADE"))
        conn.execute(text("""
            CREATE TABLE player_contracts (
                id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
                club_id             UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
                weekly_salary       INTEGER NOT NULL,
                start_date          DATE,
                contract_until      DATE,
                availability_status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at          TIMESTAMPTZ
            )
        """))
        conn.execute(text(
            "CREATE INDEX ix_player_contracts_player_id ON player_contracts(player_id)"
        ))
        conn.execute(text(
            "CREATE INDEX ix_player_contracts_club_id ON player_contracts(club_id)"
        ))
        conn.commit()

    print("Orphaned tables dropped. player_contracts redesigned.")


if __name__ == "__main__":
    run()
