import re
from typing import Optional

_YT_ID = r"[A-Za-z0-9_-]{11}"

_YT_PATTERNS = [
    re.compile(rf"^https?://(?:www\.)?youtube\.com/watch\?(?:[^#&]*&)*v=({_YT_ID})"),
    re.compile(rf"^https?://youtu\.be/({_YT_ID})"),
    re.compile(rf"^https?://(?:www\.)?youtube\.com/shorts/({_YT_ID})"),
    re.compile(rf"^https?://(?:www\.)?youtube\.com/embed/({_YT_ID})"),
]

_VIMEO_PATTERN = re.compile(r"^https?://(?:www\.)?vimeo\.com/(\d{1,12})(?:[/?#]|$)")

_GDRIVE_PATTERN = re.compile(
    r"^https?://drive\.google\.com/file/d/([A-Za-z0-9_-]{10,200})/"
)


def resolve_embed_url(raw_url: str) -> Optional[str]:
    url = raw_url.strip()

    for pattern in _YT_PATTERNS:
        m = pattern.match(url)
        if m:
            video_id = m.group(1)
            return f"https://www.youtube-nocookie.com/embed/{video_id}"

    m = _VIMEO_PATTERN.match(url)
    if m:
        video_id = m.group(1)
        return f"https://player.vimeo.com/video/{video_id}"

    m = _GDRIVE_PATTERN.match(url)
    if m:
        file_id = m.group(1)
        return f"https://drive.google.com/file/d/{file_id}/preview"

    return None
