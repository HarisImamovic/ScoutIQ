from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.parse import quote
from xml.sax.saxutils import escape as xml_escape

from fastapi.responses import Response
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from app.models.player import Player
from app.models.report import ScoutingReport
from app.utils.age import calc_age

logger = logging.getLogger(__name__)

_FONTS_DIR = Path(__file__).parent / "assets" / "fonts"
_fonts_registered = False
FONT_BODY = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
FONT_ITALIC = "Helvetica-Oblique"
FONT_MONO = "Courier"


def _register_fonts() -> None:
    # Base-14 PDF fonts (Helvetica/Courier) only support WinAnsi encoding, which
    # excludes Latin Extended-A letters used in Bosnian/Croatian/Serbian names
    # (č, ć, đ, š, ž) — they render as a missing-glyph box. DejaVu Sans has full
    # Unicode coverage, so registering it as a TrueType font fixes that.
    global _fonts_registered, FONT_BODY, FONT_BOLD, FONT_ITALIC, FONT_MONO
    if _fonts_registered:
        return
    try:
        pdfmetrics.registerFont(TTFont("DejaVuSans", str(_FONTS_DIR / "DejaVuSans.ttf")))
        pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(_FONTS_DIR / "DejaVuSans-Bold.ttf")))
        pdfmetrics.registerFont(TTFont("DejaVuSans-Oblique", str(_FONTS_DIR / "DejaVuSans-Oblique.ttf")))
        pdfmetrics.registerFont(TTFont("DejaVuSansMono", str(_FONTS_DIR / "DejaVuSansMono.ttf")))
        FONT_BODY, FONT_BOLD, FONT_ITALIC, FONT_MONO = (
            "DejaVuSans", "DejaVuSans-Bold", "DejaVuSans-Oblique", "DejaVuSansMono",
        )
    except Exception:
        logger.warning("Bundled TTF fonts not found; falling back to base-14 PDF fonts (no diacritic support).")
    _fonts_registered = True

PRIMARY_EMERALD = colors.HexColor("#10B981")
SECONDARY_BLUE = colors.HexColor("#3B82F6")
TEXT_DARK = colors.HexColor("#0F172A")
TEXT_MUTED = colors.HexColor("#64748B")
BORDER_GRAY = colors.HexColor("#E2E8F0")
DESTRUCTIVE_RED = colors.HexColor("#EF4444")
ROW_ALT = colors.HexColor("#F8FAFC")
WHITE = colors.white

_STATUS_HEX = {
    "draft": "#64748B",
    "submitted": "#3B82F6",
    "approved": "#10B981",
    "rejected": "#EF4444",
}

_STATS_ROWS = [
    ("Age", "date_of_birth"),
    ("Nationality", "nationality"),
    ("Market Value", "market_value"),
    ("Minutes Played", "minutes_played"),
    ("Goals", "goals"),
    ("Assists", "assists"),
    ("Defensive Contributions", "defensive_contributions"),
    ("Saves", "saves"),
    ("Chances Created", "chances_created"),
    ("Dribbles", "dribbles"),
]


def _safe_filename_part(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9 _-]", "", name or "").strip()
    cleaned = re.sub(r"\s+", "_", cleaned)
    return cleaned[:60] or "report"


def build_pdf_filename(report: ScoutingReport) -> str:
    return f"scouting_report_{_safe_filename_part(report.player_name)}_{str(report.id)[:8]}.pdf"


def build_pdf_response(report: ScoutingReport, pdf_bytes: bytes) -> Response:
    ascii_name = build_pdf_filename(report)
    pretty_name = f"scouting_report_{(report.player_name or 'report').strip()}_{str(report.id)[:8]}.pdf"
    disposition = f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{quote(pretty_name)}'
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": disposition},
    )


def _header_footer(canvas, doc) -> None:
    canvas.saveState()
    page_w, page_h = A4

    canvas.setFillColor(PRIMARY_EMERALD)
    canvas.rect(0, page_h - 2.2 * cm, page_w, 2.2 * cm, stroke=0, fill=1)
    canvas.setFillColor(WHITE)
    canvas.setFont(FONT_BOLD, 14)
    canvas.drawString(2 * cm, page_h - 1.35 * cm, "ScoutIQ")
    canvas.setFont(FONT_BODY, 9)
    canvas.drawRightString(page_w - 2 * cm, page_h - 1.35 * cm, "Scouting Report")

    canvas.setStrokeColor(BORDER_GRAY)
    canvas.line(2 * cm, 1.6 * cm, page_w - 2 * cm, 1.6 * cm)
    canvas.setFillColor(TEXT_MUTED)
    canvas.setFont(FONT_BODY, 8)
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    canvas.drawString(2 * cm, 1.2 * cm, f"Generated {generated} · ScoutIQ")
    canvas.drawRightString(page_w - 2 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


def _stat_value(player: Player, field: str) -> str:
    if field == "date_of_birth":
        age = calc_age(player.date_of_birth)
        return str(age) if age is not None else "—"
    if field == "market_value":
        return f"€{player.market_value:,}" if player.market_value is not None else "—"
    value = getattr(player, field, None)
    if value is None or value == "":
        return "—"
    return str(value)


def generate_report_pdf(report: ScoutingReport, player: Player | None, scout_name: str) -> bytes:
    _register_fonts()
    buf = BytesIO()
    doc = BaseDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2.8 * cm,
        bottomMargin=2 * cm,
        title=f"Scouting Report - {report.player_name}",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")
    doc.addPageTemplates([PageTemplate(id="report", frames=[frame], onPage=_header_footer)])

    title_style = ParagraphStyle(
        "Title", fontName=FONT_BOLD, fontSize=22, leading=27, textColor=TEXT_DARK, spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "Sub", fontName=FONT_BODY, fontSize=10, leading=14, textColor=TEXT_MUTED, spaceAfter=14,
    )
    h2_style = ParagraphStyle(
        "H2", fontName=FONT_BOLD, fontSize=12, leading=15, textColor=SECONDARY_BLUE, spaceBefore=14, spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "Body", fontName=FONT_BODY, fontSize=10, textColor=TEXT_DARK, leading=14, alignment=TA_LEFT,
    )
    italic_style = ParagraphStyle(
        "Italic", fontName=FONT_ITALIC, fontSize=9.5, textColor=TEXT_MUTED, leading=13,
    )

    # report.player_name / .position / .notes and scout_name are free-text
    # user input (scout-entered report fields, scout's own account name) with
    # no character restrictions — they must be XML-escaped before going into
    # Paragraph markup, since ReportLab's Paragraph parses a real HTML-like
    # tag subset (<b>, <font>, <a href>, ...) and would otherwise let one
    # user's report inject formatting/links into a PDF another user downloads.
    safe_player_name = xml_escape(report.player_name)
    safe_position = xml_escape(report.position)
    safe_scout_name = xml_escape(scout_name)

    status_hex = _STATUS_HEX.get(report.status, "#64748B")
    subtitle = (
        f"{safe_position} &nbsp;·&nbsp; Rating {report.rating}/100 &nbsp;·&nbsp; "
        f"<font color='{status_hex}'>{report.status.capitalize()}</font> "
        f"&nbsp;·&nbsp; Scout: {safe_scout_name}"
    )

    dates = f"<b>Created:</b> {report.created_at:%Y-%m-%d %H:%M}"
    if report.updated_at:
        dates += f" &nbsp;&nbsp; <b>Updated:</b> {report.updated_at:%Y-%m-%d %H:%M}"

    notes_html = xml_escape(report.notes).replace("\n", "<br/>") if report.notes else "<i>No notes added.</i>"

    story = [
        Paragraph(safe_player_name, title_style),
        Paragraph(subtitle, subtitle_style),
        Paragraph("Report Details", h2_style),
        Paragraph(dates, body_style),
        Spacer(1, 8),
        Paragraph("Scout Notes", h2_style),
        Paragraph(notes_html, body_style),
        Paragraph("Player Statistics", h2_style),
    ]

    if player is not None:
        table_data = [["Metric", "Value"]] + [
            [label, _stat_value(player, field)] for label, field in _STATS_ROWS
        ]
        stats_table = Table(table_data, colWidths=[9 * cm, 6 * cm])
        stats_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
            ("FONTNAME", (0, 1), (0, -1), FONT_BODY),
            ("FONTNAME", (1, 1), (1, -1), FONT_MONO),
            ("FONTSIZE", (0, 0), (-1, -1), 9.5),
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_EMERALD),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, ROW_ALT]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(stats_table)
    else:
        story.append(Paragraph(
            "The linked player record no longer exists — showing report data only.",
            italic_style,
        ))

    doc.build(story)
    return buf.getvalue()
