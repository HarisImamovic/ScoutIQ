from sqlalchemy import text
from app.database import engine


def run():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50)
        """))

        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS telegram_link_code VARCHAR(100)
        """))

        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS telegram_link_code_expires_at TIMESTAMPTZ
        """))

        conn.commit()


if __name__ == "__main__":
    run()
