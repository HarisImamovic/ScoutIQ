import threading
import time
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models.user import User


def _run_inactivity_check() -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    with SessionLocal() as db:
        db.query(User).filter(
            User.status == "active",
            User.last_login_at.isnot(None),
            User.last_login_at < cutoff,
            User.deleted_at.is_(None),
        ).update({"status": "inactive"}, synchronize_session=False)
        db.commit()


def start_background_tasks() -> None:
    def loop() -> None:
        while True:
            try:
                _run_inactivity_check()
            except Exception:
                pass
            time.sleep(3600)

    thread = threading.Thread(target=loop, daemon=True)
    thread.start()
