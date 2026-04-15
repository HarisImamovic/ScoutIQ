import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import date, datetime, timezone, timedelta
from app.database import SessionLocal
from app.models.club import Club
from app.models.league import League
from app.models.player import Player
from app.models.report import ScoutingReport
from app.models.user import User
from app.security import hash_password


def seed():
    db = SessionLocal()
    try:
        _seed_leagues(db)
        _seed_clubs(db)
        _seed_users(db)
        _seed_players(db)
        _seed_reports(db)
        db.commit()
        print("Seed complete.")
    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


def _seed_leagues(db):
    if db.query(League).count() > 0:
        print("Leagues already seeded, skipping.")
        return

    leagues = [
        League(name="Bundesliga",     country="Germany"),
        League(name="La Liga",        country="Spain"),
        League(name="Premier League", country="England"),
        League(name="Ligue 1",        country="France"),
        League(name="Serie A",        country="Italy"),
    ]
    db.add_all(leagues)
    db.flush()
    print(f"Inserted {len(leagues)} leagues.")


def _seed_clubs(db):
    if db.query(Club).count() > 0:
        print("Clubs already seeded, skipping.")
        return

    leagues = {lg.name: lg for lg in db.query(League).all()}

    def lg(name):
        return leagues.get(name)

    clubs = [
        Club(name="Bayern Munich",     short_name="FCB", country="Germany", league_id=lg("Bundesliga").id     if lg("Bundesliga")     else None, status="active"),
        Club(name="FC Barcelona",      short_name="BAR", country="Spain",   league_id=lg("La Liga").id        if lg("La Liga")        else None, status="active"),
        Club(name="Manchester City",   short_name="MCI", country="England", league_id=lg("Premier League").id if lg("Premier League") else None, status="active"),
        Club(name="PSG",               short_name="PSG", country="France",  league_id=lg("Ligue 1").id        if lg("Ligue 1")        else None, status="pending"),
        Club(name="SC Freiburg",       short_name="SCF", country="Germany", league_id=lg("Bundesliga").id     if lg("Bundesliga")     else None, status="active"),
        Club(name="Arsenal",           short_name="ARS", country="England", league_id=lg("Premier League").id if lg("Premier League") else None, status="active"),
        Club(name="Real Madrid",       short_name="RMA", country="Spain",   league_id=lg("La Liga").id        if lg("La Liga")        else None, status="active"),
        Club(name="Bayer Leverkusen",  short_name="B04", country="Germany", league_id=lg("Bundesliga").id     if lg("Bundesliga")     else None, status="active"),
        Club(name="Liverpool",         short_name="LIV", country="England", league_id=lg("Premier League").id if lg("Premier League") else None, status="active"),
        Club(name="Atletico Madrid",   short_name="ATM", country="Spain",   league_id=lg("La Liga").id        if lg("La Liga")        else None, status="active"),
        Club(name="Borussia Dortmund", short_name="BVB", country="Germany", league_id=lg("Bundesliga").id     if lg("Bundesliga")     else None, status="suspended"),
    ]
    db.add_all(clubs)
    db.flush()
    print(f"Inserted {len(clubs)} clubs.")


def _seed_users(db):
    seed_emails = [
        "m.weber@scoutiq.com",
        "c.mendez@scoutiq.com",
        "j.wright@scoutiq.com",
        "l.fischer@scoutiq.com",
        "j.pereira@scoutiq.com",
        "r.makinen@scoutiq.com",
        "a.kovac@scoutiq.com",
        "alex@scoutiq.com",
        "e.collins@scoutiq.com",
        "s.klein@scoutiq.com",
    ]
    existing = {u.email for u in db.query(User.email).all()}
    to_create = [e for e in seed_emails if e not in existing]

    if not to_create:
        print("Seed users already exist, skipping.")
        return

    pw_hash = hash_password("Scout1234!")
    clubs = {c.name: c for c in db.query(Club).all()}

    profiles = [
        ("Marcus",  "Weber",   "scout",      "Bayern Munich"),
        ("Carlos",  "Mendez",  "scout",      "FC Barcelona"),
        ("James",   "Wright",  "scout",      "Manchester City"),
        ("Lena",    "Fischer", "club_admin", "Bayer Leverkusen"),
        ("João",    "Pereira", "scout",      "PSG"),
        ("Riku",    "Mäkinen", "scout",      "Manchester City"),
        ("Ana",     "Kovač",   "scout",      "FC Barcelona"),
        ("Alex",    "Johnson", "player",     "SC Freiburg"),
        ("Emma",    "Collins", "player",     "Arsenal"),
        ("Sarah",   "Klein",   "club_admin", "Bayern Munich"),
    ]

    created = 0
    for email, (first, last, role, club_name) in zip(to_create, profiles):
        club = clubs.get(club_name)
        db.add(User(
            email=email,
            password_hash=pw_hash,
            first_name=first,
            last_name=last,
            role=role,
            club_id=club.id if club else None,
            status="active",
        ))
        created += 1

    db.flush()
    print(f"Inserted {created} users.")


def _seed_players(db):
    if db.query(Player).count() > 0:
        print("Players already seeded, skipping.")
        return

    clubs = {c.name: c for c in db.query(Club).all()}

    def c(name):
        return clubs.get(name)

    players = [
        Player(first_name="Lamine",   last_name="Yamal",      date_of_birth=date(2007, 7, 13),  nationality="Spain",   position="RW",  club_id=c("FC Barcelona").id    if c("FC Barcelona")    else None, market_value=220_000_000, status="active"),
        Player(first_name="Florian",  last_name="Wirtz",      date_of_birth=date(2003, 5, 3),   nationality="Germany", position="AM",  club_id=c("Bayer Leverkusen").id if c("Bayer Leverkusen") else None, market_value=180_000_000, status="active"),
        Player(first_name="Endrick",  last_name="Felipe",     date_of_birth=date(2006, 7, 21),  nationality="Brazil",  position="ST",  club_id=c("Real Madrid").id     if c("Real Madrid")     else None, market_value=90_000_000,  status="active"),
        Player(first_name="Mathys",   last_name="Tel",        date_of_birth=date(2005, 4, 27),  nationality="France",  position="CF",  club_id=c("Bayern Munich").id   if c("Bayern Munich")   else None, market_value=60_000_000,  status="active"),
        Player(first_name="Gavi",     last_name="Páez",       date_of_birth=date(2004, 8, 5),   nationality="Spain",   position="CM",  club_id=c("FC Barcelona").id    if c("FC Barcelona")    else None, market_value=100_000_000, status="injured"),
        Player(first_name="Jude",     last_name="Bellingham", date_of_birth=date(2003, 6, 29),  nationality="England", position="AM",  club_id=c("Real Madrid").id     if c("Real Madrid")     else None, market_value=180_000_000, status="active"),
        Player(first_name="Bukayo",   last_name="Saka",       date_of_birth=date(2001, 9, 5),   nationality="England", position="RW",  club_id=c("Arsenal").id         if c("Arsenal")         else None, market_value=150_000_000, status="active"),
        Player(first_name="Phil",     last_name="Foden",      date_of_birth=date(2000, 5, 28),  nationality="England", position="AM",  club_id=c("Manchester City").id  if c("Manchester City")  else None, market_value=130_000_000, status="active"),
        Player(first_name="Pedri",    last_name="González",   date_of_birth=date(2002, 11, 25), nationality="Spain",   position="CM",  club_id=c("FC Barcelona").id    if c("FC Barcelona")    else None, market_value=120_000_000, status="active"),
        Player(first_name="Vinícius", last_name="Júnior",     date_of_birth=date(2000, 7, 12),  nationality="Brazil",  position="LW",  club_id=c("Real Madrid").id     if c("Real Madrid")     else None, market_value=200_000_000, status="active"),
        Player(first_name="Erling",   last_name="Haaland",    date_of_birth=date(2000, 7, 21),  nationality="Norway",  position="ST",  club_id=c("Manchester City").id  if c("Manchester City")  else None, market_value=200_000_000, status="active"),
    ]
    db.add_all(players)
    db.flush()
    print(f"Inserted {len(players)} players.")


def _seed_reports(db):
    if db.query(ScoutingReport).count() > 0:
        print("Reports already seeded, skipping.")
        return

    scouts = {
        f"{u.first_name} {u.last_name}": u
        for u in db.query(User).filter(User.role == "scout").all()
    }
    players_map = {
        f"{p.first_name} {p.last_name}": p
        for p in db.query(Player).all()
    }

    now = datetime.now(timezone.utc)

    reports_data = [
        ("Lamine Yamal",      "RW", "Carlos Mendez",  91, "approved",  "Exceptional dribbling and vision. Recommended for acquisition.",           now - timedelta(days=32)),
        ("Florian Wirtz",     "AM", "Marcus Weber",   89, "approved",  "World-class technical ability. Contract situation needs watching.",          now - timedelta(days=37)),
        ("Jude Bellingham",   "AM", "Carlos Mendez",  93, "submitted", "Dominant in all phases. Goals and assists at a historic rate for position.", now - timedelta(days=22)),
        ("Gavi Páez",         "CM", "Carlos Mendez",  85, "draft",     "Still recovering from injury. Talent undeniable but fitness concerns remain.", now - timedelta(days=14)),
        ("Pedri González",    "CM", "João Pereira",   88, "approved",  "Full recovery from injury. Back to best form and leading midfield.",         now - timedelta(days=44)),
        ("Bukayo Saka",       "RW", "James Wright",   90, "approved",  "Consistent performer across all metrics. Key player for the season.",        now - timedelta(days=52)),
        ("Erling Haaland",    "ST", "Riku Mäkinen",   95, "submitted", "Unstoppable in the box. Movement and finishing are elite-level.",            now - timedelta(days=18)),
        ("Vinícius Júnior",   "LW", "Ana Kovač",      94, "approved",  "Pace, skill and end product at the highest level. Generational talent.",    now - timedelta(days=27)),
        ("Phil Foden",        "AM", "James Wright",   90, "submitted", "Creative hub for the team. Vision and touch exceptional under pressure.",    now - timedelta(days=10)),
        ("Endrick Felipe",    "ST", "Carlos Mendez",  80, "draft",     "Needs more adaptation time to European game. Revisit in six months.",        now - timedelta(days=41)),
        ("Mathys Tel",        "CF", "Marcus Weber",   79, "draft",     "Rotation role limiting development. Loan move could accelerate growth.",     now - timedelta(days=7)),
    ]

    created = 0
    for player_name, position, scout_name, rating, status, notes, created_at in reports_data:
        s = scouts.get(scout_name)
        p = players_map.get(player_name)
        if not s:
            print(f"  Scout '{scout_name}' not found, skipping report.")
            continue
        db.add(ScoutingReport(
            scout_id=s.id,
            player_id=p.id if p else None,
            player_name=player_name,
            position=position,
            rating=rating,
            status=status,
            notes=notes,
            created_at=created_at,
        ))
        created += 1

    db.flush()
    print(f"Inserted {created} reports.")


if __name__ == "__main__":
    seed()
