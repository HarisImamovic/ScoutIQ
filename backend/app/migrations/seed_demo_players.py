"""
Run from the backend directory:
    python -m app.migrations.seed_demo_players

Adds demo players to every existing active club that currently has no players.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from datetime import date
from app.database import SessionLocal
import app.models.club  # noqa: F401
import app.models.league  # noqa: F401
import app.models.user  # noqa: F401
import app.models.player  # noqa: F401
import app.models.player_contract  # noqa: F401
import app.models.player_view  # noqa: F401
import app.models.report  # noqa: F401
import app.models.saved_prospect  # noqa: F401
import app.models.password_reset_token  # noqa: F401
from app.models.club import Club
from app.models.player import Player

_DEMO_SQUADS: dict[str, list[dict]] = {
    "default": [
        {"first_name": "Marco", "last_name": "Romano", "position": "GK", "nationality": "Italian", "date_of_birth": date(1992, 3, 14), "market_value": 2_000_000},
        {"first_name": "Diego", "last_name": "Fernández", "position": "CB", "nationality": "Spanish", "date_of_birth": date(1994, 7, 22), "market_value": 8_000_000},
        {"first_name": "James", "last_name": "Clarke", "position": "CB", "nationality": "English", "date_of_birth": date(1996, 11, 5), "market_value": 6_000_000},
        {"first_name": "Lucas", "last_name": "Silva", "position": "LB", "nationality": "Brazilian", "date_of_birth": date(1998, 4, 18), "market_value": 5_000_000},
        {"first_name": "Yusuf", "last_name": "Özdemir", "position": "RB", "nationality": "Turkish", "date_of_birth": date(1999, 9, 30), "market_value": 4_500_000},
        {"first_name": "Tomáš", "last_name": "Novák", "position": "CDM", "nationality": "Czech", "date_of_birth": date(1993, 6, 12), "market_value": 10_000_000},
        {"first_name": "Kevin", "last_name": "Müller", "position": "CM", "nationality": "German", "date_of_birth": date(1995, 2, 28), "market_value": 12_000_000},
        {"first_name": "Antoine", "last_name": "Dupont", "position": "CAM", "nationality": "French", "date_of_birth": date(1997, 8, 15), "market_value": 18_000_000},
        {"first_name": "Aleksandr", "last_name": "Petrov", "position": "LW", "nationality": "Russian", "date_of_birth": date(2000, 1, 7), "market_value": 7_000_000},
        {"first_name": "Mohamed", "last_name": "Al-Rashid", "position": "RW", "nationality": "Moroccan", "date_of_birth": date(2001, 5, 23), "market_value": 9_000_000},
        {"first_name": "Carlos", "last_name": "Mendez", "position": "ST", "nationality": "Argentine", "date_of_birth": date(1996, 12, 3), "market_value": 22_000_000},
    ]
}

_COUNTRY_SQUADS: dict[str, list[dict]] = {
    "spain": [
        {"first_name": "Alejandro", "last_name": "García", "position": "GK", "nationality": "Spanish", "date_of_birth": date(1991, 4, 10), "market_value": 3_000_000},
        {"first_name": "Roberto", "last_name": "Martínez", "position": "CB", "nationality": "Spanish", "date_of_birth": date(1994, 8, 22), "market_value": 9_000_000},
        {"first_name": "Pablo", "last_name": "Rodríguez", "position": "CB", "nationality": "Spanish", "date_of_birth": date(1996, 2, 14), "market_value": 7_500_000},
        {"first_name": "Sergio", "last_name": "López", "position": "LB", "nationality": "Spanish", "date_of_birth": date(1998, 6, 30), "market_value": 5_500_000},
        {"first_name": "Adrián", "last_name": "Torres", "position": "RB", "nationality": "Spanish", "date_of_birth": date(1999, 11, 5), "market_value": 5_000_000},
        {"first_name": "Iker", "last_name": "Sánchez", "position": "CDM", "nationality": "Spanish", "date_of_birth": date(1993, 3, 18), "market_value": 11_000_000},
        {"first_name": "Javier", "last_name": "Gómez", "position": "CM", "nationality": "Spanish", "date_of_birth": date(1995, 7, 25), "market_value": 14_000_000},
        {"first_name": "Mikel", "last_name": "Arteta", "position": "AM", "nationality": "Spanish", "date_of_birth": date(1997, 9, 11), "market_value": 16_000_000},
        {"first_name": "Álvaro", "last_name": "Moreno", "position": "LW", "nationality": "Spanish", "date_of_birth": date(2000, 4, 3), "market_value": 8_000_000},
        {"first_name": "Fernando", "last_name": "Ruiz", "position": "RW", "nationality": "Spanish", "date_of_birth": date(2001, 12, 17), "market_value": 10_000_000},
        {"first_name": "Luis", "last_name": "Hernández", "position": "ST", "nationality": "Spanish", "date_of_birth": date(1996, 5, 28), "market_value": 25_000_000},
    ],
    "england": [
        {"first_name": "Oliver", "last_name": "Smith", "position": "GK", "nationality": "English", "date_of_birth": date(1992, 6, 15), "market_value": 4_000_000},
        {"first_name": "Harry", "last_name": "Wilson", "position": "CB", "nationality": "English", "date_of_birth": date(1994, 10, 8), "market_value": 10_000_000},
        {"first_name": "Jack", "last_name": "Thompson", "position": "CB", "nationality": "English", "date_of_birth": date(1996, 3, 21), "market_value": 8_500_000},
        {"first_name": "Aaron", "last_name": "Davies", "position": "LB", "nationality": "Welsh", "date_of_birth": date(1998, 7, 14), "market_value": 6_000_000},
        {"first_name": "Ryan", "last_name": "Johnson", "position": "RB", "nationality": "English", "date_of_birth": date(1999, 1, 27), "market_value": 5_500_000},
        {"first_name": "Mason", "last_name": "Taylor", "position": "CDM", "nationality": "English", "date_of_birth": date(1993, 5, 9), "market_value": 13_000_000},
        {"first_name": "Callum", "last_name": "Evans", "position": "CM", "nationality": "English", "date_of_birth": date(1995, 9, 30), "market_value": 15_000_000},
        {"first_name": "Liam", "last_name": "Roberts", "position": "AM", "nationality": "English", "date_of_birth": date(1997, 11, 16), "market_value": 19_000_000},
        {"first_name": "Theo", "last_name": "Walker", "position": "LW", "nationality": "English", "date_of_birth": date(2000, 2, 4), "market_value": 9_000_000},
        {"first_name": "Marcus", "last_name": "Clarke", "position": "RW", "nationality": "English", "date_of_birth": date(2001, 8, 19), "market_value": 12_000_000},
        {"first_name": "Dominic", "last_name": "Hughes", "position": "ST", "nationality": "English", "date_of_birth": date(1997, 4, 7), "market_value": 28_000_000},
    ],
    "germany": [
        {"first_name": "Manuel", "last_name": "Fischer", "position": "GK", "nationality": "German", "date_of_birth": date(1991, 8, 20), "market_value": 5_000_000},
        {"first_name": "Niklas", "last_name": "Schmidt", "position": "CB", "nationality": "German", "date_of_birth": date(1993, 12, 6), "market_value": 11_000_000},
        {"first_name": "Fabian", "last_name": "Meyer", "position": "CB", "nationality": "German", "date_of_birth": date(1996, 4, 17), "market_value": 9_000_000},
        {"first_name": "Jonas", "last_name": "Koch", "position": "LB", "nationality": "German", "date_of_birth": date(1998, 9, 3), "market_value": 7_000_000},
        {"first_name": "Leon", "last_name": "Wagner", "position": "RB", "nationality": "German", "date_of_birth": date(1999, 3, 25), "market_value": 6_500_000},
        {"first_name": "Florian", "last_name": "Becker", "position": "CDM", "nationality": "German", "date_of_birth": date(1993, 7, 11), "market_value": 14_000_000},
        {"first_name": "Thomas", "last_name": "Richter", "position": "CM", "nationality": "German", "date_of_birth": date(1995, 1, 28), "market_value": 16_000_000},
        {"first_name": "Julian", "last_name": "Braun", "position": "CAM", "nationality": "German", "date_of_birth": date(1997, 6, 14), "market_value": 20_000_000},
        {"first_name": "Kai", "last_name": "Hoffmann", "position": "LW", "nationality": "German", "date_of_birth": date(2000, 10, 22), "market_value": 10_000_000},
        {"first_name": "Marco", "last_name": "Klein", "position": "RW", "nationality": "German", "date_of_birth": date(2001, 2, 8), "market_value": 13_000_000},
        {"first_name": "Serge", "last_name": "Wolf", "position": "ST", "nationality": "German", "date_of_birth": date(1996, 7, 19), "market_value": 30_000_000},
    ],
    "italy": [
        {"first_name": "Gianluigi", "last_name": "Conti", "position": "GK", "nationality": "Italian", "date_of_birth": date(1992, 5, 11), "market_value": 3_500_000},
        {"first_name": "Giorgio", "last_name": "Ferrari", "position": "CB", "nationality": "Italian", "date_of_birth": date(1994, 9, 27), "market_value": 10_500_000},
        {"first_name": "Leonardo", "last_name": "Rossi", "position": "CB", "nationality": "Italian", "date_of_birth": date(1996, 1, 15), "market_value": 9_500_000},
        {"first_name": "Luca", "last_name": "Bruno", "position": "LB", "nationality": "Italian", "date_of_birth": date(1998, 8, 7), "market_value": 6_500_000},
        {"first_name": "Matteo", "last_name": "Colombo", "position": "RB", "nationality": "Italian", "date_of_birth": date(1999, 4, 20), "market_value": 6_000_000},
        {"first_name": "Andrea", "last_name": "Ricci", "position": "CDM", "nationality": "Italian", "date_of_birth": date(1993, 2, 3), "market_value": 12_500_000},
        {"first_name": "Davide", "last_name": "Marini", "position": "CM", "nationality": "Italian", "date_of_birth": date(1995, 6, 18), "market_value": 15_500_000},
        {"first_name": "Niccolò", "last_name": "Gatti", "position": "AM", "nationality": "Italian", "date_of_birth": date(1997, 10, 4), "market_value": 17_000_000},
        {"first_name": "Federico", "last_name": "Serra", "position": "LW", "nationality": "Italian", "date_of_birth": date(2000, 3, 16), "market_value": 9_500_000},
        {"first_name": "Alessandro", "last_name": "Greco", "position": "RW", "nationality": "Italian", "date_of_birth": date(2001, 11, 29), "market_value": 11_500_000},
        {"first_name": "Ciro", "last_name": "Esposito", "position": "ST", "nationality": "Italian", "date_of_birth": date(1996, 8, 12), "market_value": 26_000_000},
    ],
    "france": [
        {"first_name": "Hugo", "last_name": "Dumont", "position": "GK", "nationality": "French", "date_of_birth": date(1992, 7, 8), "market_value": 4_500_000},
        {"first_name": "Raphaël", "last_name": "Bernard", "position": "CB", "nationality": "French", "date_of_birth": date(1994, 11, 24), "market_value": 12_000_000},
        {"first_name": "Clément", "last_name": "Leroy", "position": "CB", "nationality": "French", "date_of_birth": date(1996, 5, 7), "market_value": 10_000_000},
        {"first_name": "Benjamin", "last_name": "Petit", "position": "LB", "nationality": "French", "date_of_birth": date(1998, 10, 19), "market_value": 7_500_000},
        {"first_name": "Théo", "last_name": "Moreau", "position": "RB", "nationality": "French", "date_of_birth": date(1999, 6, 2), "market_value": 7_000_000},
        {"first_name": "Maxime", "last_name": "Simon", "position": "CDM", "nationality": "French", "date_of_birth": date(1993, 4, 15), "market_value": 15_000_000},
        {"first_name": "Rayan", "last_name": "Girard", "position": "CM", "nationality": "French", "date_of_birth": date(1995, 8, 28), "market_value": 17_000_000},
        {"first_name": "Florian", "last_name": "Martin", "position": "CAM", "nationality": "French", "date_of_birth": date(1997, 12, 13), "market_value": 22_000_000},
        {"first_name": "Amine", "last_name": "Diallo", "position": "LW", "nationality": "French", "date_of_birth": date(2000, 5, 25), "market_value": 11_000_000},
        {"first_name": "Kingsley", "last_name": "Traoré", "position": "RW", "nationality": "French", "date_of_birth": date(2001, 9, 10), "market_value": 14_000_000},
        {"first_name": "Ousmane", "last_name": "Coulibaly", "position": "ST", "nationality": "French", "date_of_birth": date(1996, 3, 6), "market_value": 32_000_000},
    ],
}


def run():
    db = SessionLocal()
    try:
        clubs = db.query(Club).filter(Club.deleted_at.is_(None)).all()
        if not clubs:
            print("No clubs found in the database. Add clubs first, then run this script.")
            return

        total_created = 0
        for club in clubs:
            existing = db.query(Player).filter(Player.club_id == club.id).count()
            if existing > 0:
                print(f"  Skipping '{club.name}' — already has {existing} player(s).")
                continue

            country_key = (club.country or "").strip().lower()
            squad_template = _COUNTRY_SQUADS.get(country_key, _DEMO_SQUADS["default"])

            for p in squad_template:
                db.add(Player(
                    first_name=p["first_name"],
                    last_name=p["last_name"],
                    position=p["position"],
                    nationality=p["nationality"],
                    date_of_birth=p["date_of_birth"],
                    club_id=club.id,
                    market_value=p["market_value"],
                    status="active",
                ))
                total_created += 1

            print(f"  Added {len(squad_template)} players to '{club.name}'.")

        db.commit()
        print(f"\nDone. Created {total_created} demo player(s) across {len(clubs)} club(s).")
    finally:
        db.close()


if __name__ == "__main__":
    run()
