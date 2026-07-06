from sqlalchemy import text

from app.database import engine


def run():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ai_access_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
                reviewed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ai_access_requests_user_id ON ai_access_requests (user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ai_access_requests_status ON ai_access_requests (status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ai_access_requests_created_at ON ai_access_requests (created_at)"))
        conn.commit()


if __name__ == "__main__":
    run()
