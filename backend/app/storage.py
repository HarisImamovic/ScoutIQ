import os

from app.config import get_settings

_LOGO_CONTENT_TYPES = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}
_LOGO_EXTENSIONS = ("png", "jpg", "webp")


def _r2_client():
    import boto3
    from botocore.config import Config as BotoConfig

    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=BotoConfig(signature_version="s3v4"),
        region_name="auto",
    )


def save_logo(key: str, ext: str, data: bytes) -> str:
    settings = get_settings()
    filename = f"{key}.{ext}"

    if settings.r2_bucket_name:
        client = _r2_client()
        for old_ext in _LOGO_EXTENSIONS:
            try:
                client.delete_object(Bucket=settings.r2_bucket_name, Key=f"logos/{key}.{old_ext}")
            except Exception:
                pass
        client.put_object(
            Bucket=settings.r2_bucket_name,
            Key=f"logos/{filename}",
            Body=data,
            ContentType=_LOGO_CONTENT_TYPES[ext],
        )
        base = settings.r2_public_base_url.rstrip("/")
        return f"{base}/logos/{filename}"

    logos_dir = os.path.join(os.path.dirname(__file__), "..", "static", "logos")
    os.makedirs(logos_dir, exist_ok=True)
    for old_ext in _LOGO_EXTENSIONS:
        old_path = os.path.join(logos_dir, f"{key}.{old_ext}")
        if os.path.exists(old_path):
            os.remove(old_path)
    with open(os.path.join(logos_dir, filename), "wb") as f:
        f.write(data)
    return f"/static/logos/{filename}"
