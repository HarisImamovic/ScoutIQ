"""
Add unique constraint on player_contracts(player_id, club_id).
Run from backend directory:
    python -m app.migrations.add_contract_uniqueness
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text
from app.database import engine


def run():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE player_contracts
            ADD CONSTRAINT uq_player_contracts_player_club
            UNIQUE (player_id, club_id)
        """))
        conn.commit()
    print("Unique constraint on player_contracts(player_id, club_id) added.")


if __name__ == "__main__":
    run()
