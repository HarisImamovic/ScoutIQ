"""
Run from the backend directory:
    python -m app.migrations.add_player_stats_and_history

Adds:
  - players.user_id FK (links player accounts to player profiles)
  - players stats columns (minutes_played, goals, assists, etc.)
  - player_market_value_history table
  - Makes players.position nullable (auto-created profiles may not have a position)
  - Seeds dummy stats and market value history for existing players
"""

import os
import random
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text

from app.database import SessionLocal, engine

_GK = {"GK"}
_DEF = {"CB", "LB", "RB", "LWB", "RWB", "SW", "CDM"}
_MID = {"CM", "CAM", "AM", "LM", "RM"}


def _rand(lo: int, hi: int) -> int:
    return random.randint(lo, hi)


def _stats_for(position: str | None) -> dict:
    pos = (position or "").upper()
    if pos in _GK:
        return dict(minutes_played=_rand(2200, 3420), goals=_rand(0, 1), assists=_rand(0, 2),
                    saves=_rand(60, 130), defensive_contributions=None, chances_created=None, dribbles=None)
    if pos in _DEF:
        return dict(minutes_played=_rand(1600, 3150), goals=_rand(1, 6), assists=_rand(1, 7),
                    saves=None, defensive_contributions=_rand(45, 130), chances_created=None, dribbles=None)
    if pos in _MID:
        return dict(minutes_played=_rand(1400, 2800), goals=_rand(3, 14), assists=_rand(4, 16),
                    saves=None, defensive_contributions=None, chances_created=_rand(28, 85), dribbles=None)
    return dict(minutes_played=_rand(1300, 2750), goals=_rand(6, 26), assists=_rand(2, 12),
                saves=None, defensive_contributions=None, chances_created=None, dribbles=_rand(28, 95))


def _mv_history(current_value: int, now: datetime) -> list[dict]:
    points = []
    base = current_value * 0.75
    for i in range(8, 0, -1):
        recorded_at = now - timedelta(days=30 * i)
        t = (8 - i) / 7.0
        noise = random.uniform(0.93, 1.07)
        value = max(int((base + t * (current_value - base)) * noise), 100_000)
        points.append({"value": value, "recorded_at": recorded_at})
    points.append({"value": current_value, "recorded_at": now})
    return points


def run():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE players
                ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS minutes_played INTEGER,
                ADD COLUMN IF NOT EXISTS goals INTEGER,
                ADD COLUMN IF NOT EXISTS assists INTEGER,
                ADD COLUMN IF NOT EXISTS defensive_contributions INTEGER,
                ADD COLUMN IF NOT EXISTS saves INTEGER,
                ADD COLUMN IF NOT EXISTS chances_created INTEGER,
                ADD COLUMN IF NOT EXISTS dribbles INTEGER;
        """))
        conn.execute(text("ALTER TABLE players ALTER COLUMN position DROP NOT NULL;"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS player_market_value_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
                value INTEGER NOT NULL,
                recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_pmvh_player_id
                ON player_market_value_history(player_id);
        """))
        conn.commit()
    print("DDL complete.")

    db = SessionLocal()
    try:
        import app.models.club  # noqa: F401
        import app.models.league  # noqa: F401
        import app.models.notification  # noqa: F401
        import app.models.password_reset_token  # noqa: F401
        import app.models.player_contract  # noqa: F401
        import app.models.player_highlight  # noqa: F401
        import app.models.player_market_value_history  # noqa: F401
        import app.models.player_view  # noqa: F401
        import app.models.report  # noqa: F401
        import app.models.saved_prospect  # noqa: F401
        import app.models.user  # noqa: F401
        from app.models.player import Player

        players = db.query(Player).all()
        now = datetime.now(timezone.utc)
        seeded = 0

        for p in players:
            if p.minutes_played is not None:
                continue

            stats = _stats_for(p.position)
            p.minutes_played = stats["minutes_played"]
            p.goals = stats["goals"]
            p.assists = stats["assists"]
            p.saves = stats["saves"]
            p.defensive_contributions = stats["defensive_contributions"]
            p.chances_created = stats["chances_created"]
            p.dribbles = stats["dribbles"]

            if p.market_value:
                for point in _mv_history(p.market_value, now):
                    db.execute(text("""
                        INSERT INTO player_market_value_history (id, player_id, value, recorded_at)
                        VALUES (gen_random_uuid(), :player_id, :value, :recorded_at)
                    """), {"player_id": str(p.id), **point})

            seeded += 1

        db.commit()
        print(f"Seeded stats and market value history for {seeded} player(s).")
    finally:
        db.close()


if __name__ == "__main__":
    run()
