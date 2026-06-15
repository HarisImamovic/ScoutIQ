import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.environ["DATABASE_URL"])
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
    ALTER TABLE players
    ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) NOT NULL DEFAULT 'free_agent';
""")

print("Migration complete: added availability_status to players.")
cur.close()
conn.close()
