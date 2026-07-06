from sqlalchemy import text
from app.database import engine


def run():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS mfa_methods (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                method VARCHAR(10) NOT NULL,
                secret_encrypted TEXT,
                phone_number VARCHAR(20),
                confirmed BOOLEAN NOT NULL DEFAULT FALSE,
                last_used_counter BIGINT,
                confirmed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT uq_mfa_user_method UNIQUE (user_id, method)
            )
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_mfa_methods_user_id ON mfa_methods(user_id)
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                code_hash VARCHAR(64) NOT NULL UNIQUE,
                used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_mfa_recovery_codes_user_id ON mfa_recovery_codes(user_id)
        """))

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS mfa_challenges (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                method VARCHAR(10) NOT NULL,
                purpose VARCHAR(10) NOT NULL,
                code_hash VARCHAR(64) NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0,
                consumed BOOLEAN NOT NULL DEFAULT FALSE,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_mfa_challenges_user_id ON mfa_challenges(user_id)
        """))

        conn.commit()


if __name__ == "__main__":
    run()
