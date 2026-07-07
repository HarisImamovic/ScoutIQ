from sqlalchemy import text

from app.database import engine


def run():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS ai_access BOOLEAN NOT NULL DEFAULT FALSE
        """))
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0
        """))
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
                actor_email VARCHAR(255),
                action VARCHAR(64) NOT NULL,
                target_type VARCHAR(64),
                target_id VARCHAR(64),
                ip_address VARCHAR(64),
                detail TEXT,
                metadata_json JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_log_actor_id ON audit_log (actor_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_log_action ON audit_log (action)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_log_created_at ON audit_log (created_at)"))
        conn.commit()


if __name__ == "__main__":
    run()
