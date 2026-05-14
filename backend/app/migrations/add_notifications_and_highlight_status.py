from sqlalchemy import text
from app.database import engine


def run():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE player_highlights
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending'
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                icon_type VARCHAR(20) NOT NULL,
                title VARCHAR(200) NOT NULL,
                body VARCHAR(500) NOT NULL,
                action_data JSONB,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))

        conn.execute(text("""
            ALTER TABLE notifications
            ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_notifications_user_id
            ON notifications(user_id)
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_notifications_created_at
            ON notifications(created_at)
        """))

        conn.commit()


if __name__ == "__main__":
    run()
