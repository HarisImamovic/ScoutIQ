import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.user import User
from app.security import hash_password


def run():
    email = os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("ADMIN_PASSWORD")
    first_name = os.environ.get("ADMIN_FIRST_NAME", "Global")
    last_name = os.environ.get("ADMIN_LAST_NAME", "Admin")

    if not email or not password:
        print("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running this script.")
        sys.exit(1)

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            print(f"User {email} already exists, skipping.")
            return

        db.add(User(
            email=email,
            password_hash=hash_password(password),
            first_name=first_name,
            last_name=last_name,
            role="global_admin",
            status="active",
        ))
        db.commit()
        print(f"Created global_admin account for {email}.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
