from sqlalchemy import text

from app.database import engine


def run():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ai_usage_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                request_count INTEGER NOT NULL DEFAULT 0,
                CONSTRAINT uq_ai_usage_log_user_date UNIQUE (user_id, date)
            )
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_ai_usage_log_user_id ON ai_usage_log (user_id)
        """))
        conn.commit()


if __name__ == "__main__":
    run()
