import os


def save_logo(key: str, ext: str, data: bytes) -> str:
    logos_dir = os.path.join(os.path.dirname(__file__), "..", "static", "logos")
    os.makedirs(logos_dir, exist_ok=True)
    for old_ext in ("png", "jpg", "webp"):
        old_path = os.path.join(logos_dir, f"{key}.{old_ext}")
        if os.path.exists(old_path):
            os.remove(old_path)
    filename = f"{key}.{ext}"
    with open(os.path.join(logos_dir, filename), "wb") as f:
        f.write(data)
    return f"/static/logos/{filename}"
