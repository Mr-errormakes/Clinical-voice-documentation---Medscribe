from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from routers.auth import get_current_user, get_user_from_token, oauth2_scheme
import os
from fastapi.responses import FileResponse
from fpdf import FPDF
from datetime import datetime

router = APIRouter(prefix="/api/notes", tags=["Notes"])


# ── Colour palette ──────────────────────────────────────────────────────────
C_GREEN_DARK  = (20,  83, 45)   # #14532d  – header/footer band
C_GREEN_MID   = (22, 163, 74)   # #16a34a  – section accent
C_GREEN_LIGHT = (240, 253, 244)  # #f0fdf4  – section bg tint
C_BLUE        = (37,  99, 235)   # #2563eb  – OPD accent
C_BLUE_LIGHT  = (239, 246, 255)  # #eff6ff
C_PURPLE      = (124, 58, 237)   # #7c3aed
C_PURPLE_LIGHT= (237, 233, 254)  # #ede9fe
C_AMBER       = (217, 119, 6)    # #d97706
C_AMBER_LIGHT = (254, 243, 199)  # #fef3c7
C_RED         = (220, 38, 38)    # #dc2626
C_RED_LIGHT   = (254, 226, 226)  # #fee2e2
C_GRAY_DARK   = (15, 23, 42)     # #0f172a  – primary text
C_GRAY_MID    = (71, 85, 105)    # #475569
C_GRAY_LIGHT  = (241, 245, 249)  # #f1f5f9  – row alt
C_WHITE       = (255, 255, 255)
C_BORDER      = (212, 232, 208)  # #d4e8d0

# Template colour maps  { key: (header_rgb, bg_rgb) }
SOAP_COLORS = {
    "chief_complaint":             (C_BLUE,   C_BLUE_LIGHT),
    "history_of_present_illness":  (C_BLUE,   C_BLUE_LIGHT),
    "assessment":                  (C_AMBER,  C_AMBER_LIGHT),
    "plan":                        (C_GREEN_MID, C_GREEN_LIGHT),
}
OPD_COLORS = {
    "presentation":   (C_BLUE,      C_BLUE_LIGHT),
    "vitals":         (C_GREEN_MID, C_GREEN_LIGHT),
    "investigations": (C_PURPLE,    C_PURPLE_LIGHT),
    "treatment_plan": (C_AMBER,     C_AMBER_LIGHT),
}
ABDM_COLORS = {
    "clinical_findings":    (C_BLUE,      C_BLUE_LIGHT),
    "diagnosis":            (C_RED,       C_RED_LIGHT),
    "medication_prescribed":(C_PURPLE,    C_PURPLE_LIGHT),
    "advice":               (C_GREEN_MID, C_GREEN_LIGHT),
}
TEMPLATE_COLOR_MAP = {"soap": SOAP_COLORS, "hospital_opd": OPD_COLORS, "abdm": ABDM_COLORS}

TEMPLATE_FULL_NAME = {
    "soap":         "SOAP Clinical Note",
    "hospital_opd": "Hospital OPD Report",
    "abdm":         "ABDM Compliant Clinical Record",
}

SECTION_LABELS = {
    "chief_complaint":            "S - Chief Complaint",
    "history_of_present_illness": "S - History of Present Illness",
    "assessment":                 "A - Assessment",
    "plan":                       "P - Plan",
    "presentation":               "Presentation",
    "vitals":                     "Vitals (from note)",
    "investigations":             "Investigations",
    "treatment_plan":             "Treatment Plan",
    "clinical_findings":          "Clinical Findings",
    "diagnosis":                  "Diagnosis",
    "medication_prescribed":      "Medication Prescribed",
    "advice":                     "Advice & Instructions",
}

# Characters the AI commonly produces that fall outside Latin-1
_UNICODE_MAP = {
    "—": "-",    # em dash
    "–": "-",    # en dash
    "‘": "'",    # left single quote
    "’": "'",    # right single quote
    "“": '"',    # left double quote
    "”": '"',    # right double quote
    "•": "-",    # bullet
    "…": "...",  # ellipsis
    "°": " deg", # degree
    "±": "+/-",  # plus-minus
    "×": "x",    # multiplication
    "→": "->",   # right arrow
    "←": "<-",   # left arrow
    "≤": "<=",   # less-equal
    "≥": ">=",   # greater-equal
    "≠": "!=",   # not equal
    "é": "e",    # é
    "è": "e",    # è
    "ê": "e",    # ê
    "à": "a",    # à
    "â": "a",    # â
    "ù": "u",    # ù
    "û": "u",    # û
}


def safe(text: str) -> str:
    """Replace known Unicode chars with ASCII equivalents, then encode to latin-1."""
    if not text:
        return ""
    for uc, asc in _UNICODE_MAP.items():
        text = text.replace(uc, asc)
    return text.encode("latin-1", errors="replace").decode("latin-1")


def fmt_date(dt) -> str:
    if not dt:
        return "—"
    if isinstance(dt, str):
        return dt
    return dt.strftime("%d %b %Y  %H:%M")


def fmt_date_only(dt) -> str:
    if not dt:
        return "—"
    if isinstance(dt, str):
        try:
            return datetime.fromisoformat(dt).strftime("%d %b %Y")
        except Exception:
            return dt
    return dt.strftime("%d %b %Y")


class ClinicalPDF(FPDF):
    """Professional A4 clinical report PDF."""

    def __init__(self, org_name="", doctor_name="", template_label=""):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.org_name     = org_name
        self.doctor_name  = doctor_name
        self.template_lbl = template_label
        self.set_auto_page_break(auto=True, margin=20)
        self.set_margins(18, 18, 18)

    # ── Header ──────────────────────────────────────────────────────────────
    def header(self):
        # Dark green top band
        self.set_fill_color(*C_GREEN_DARK)
        self.rect(0, 0, 210, 22, "F")

        # App name
        self.set_xy(18, 5)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*C_WHITE)
        self.cell(100, 7, "Namma ScribeCare", ln=False)

        # Right: org + doctor
        self.set_font("Helvetica", "", 8)
        self.set_x(110)
        self.cell(0, 7, safe(f"{self.org_name}  |  {self.doctor_name}"), align="R", ln=True)

        # Template label strip
        self.set_fill_color(*C_GREEN_MID)
        self.rect(0, 22, 210, 7, "F")
        self.set_xy(0, 23)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*C_WHITE)
        self.cell(210, 5, self.template_lbl.upper(), align="C")

        self.set_text_color(*C_GRAY_DARK)
        self.ln(12)

    # ── Footer ───────────────────────────────────────────────────────────────
    def footer(self):
        self.set_y(-14)
        self.set_draw_color(*C_GREEN_DARK)
        self.set_line_width(0.4)
        self.line(18, self.get_y(), 192, self.get_y())
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*C_GRAY_MID)
        self.cell(0, 8,
                  "Confidential Clinical Record  |  Generated by Namma ScribeCare AI  |  "
                  f"Page {self.page_no()}",
                  align="C")

    # ── Helpers ───────────────────────────────────────────────────────────────
    def section_header(self, label: str, header_color, bg_color):
        """Coloured section heading bar."""
        self.set_fill_color(*header_color)
        self.set_text_color(*C_WHITE)
        self.set_font("Helvetica", "B", 9)
        self.cell(0, 7, f"  {safe(label).upper()}", fill=True, ln=True)
        self.set_text_color(*C_GRAY_DARK)

    def two_col_row(self, label: str, value: str, fill=False):
        """One info row with label on left, value on right."""
        if fill:
            self.set_fill_color(*C_GRAY_LIGHT)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*C_GRAY_MID)
        self.cell(44, 6.5, f"  {safe(label)}", border="B", fill=fill)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*C_GRAY_DARK)
        self.cell(0, 6.5, f"  {safe(value)}", border="B", fill=fill, ln=True)

    def body_text(self, text: str, bg_color):
        """Multi-line body text with light tinted background."""
        self.set_fill_color(*bg_color)
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(*C_GRAY_DARK)
        self.multi_cell(0, 6, safe(f"  {text}"), fill=True)
        self.ln(2)

    def divider(self):
        self.set_draw_color(*C_BORDER)
        self.set_line_width(0.3)
        self.line(18, self.get_y(), 192, self.get_y())
        self.ln(3)

    def vital_chip(self, label: str, value: str, x: float, y: float, w=42):
        """Draw a small vital sign box."""
        self.set_xy(x, y)
        self.set_fill_color(*C_GREEN_LIGHT)
        self.set_draw_color(*C_GREEN_MID)
        self.set_line_width(0.4)
        self.rect(x, y, w, 12, "FD")
        self.set_xy(x + 1, y + 1.5)
        self.set_font("Helvetica", "B", 7)
        self.set_text_color(*C_GREEN_MID)
        self.cell(w - 2, 4, label, ln=True)
        self.set_xy(x + 1, y + 6)
        self.set_font("Helvetica", "B", 9.5)
        self.set_text_color(*C_GRAY_DARK)
        self.cell(w - 2, 5, safe(value))
        self.set_text_color(*C_GRAY_DARK)


# ── Core PDF builder ──────────────────────────────────────────────────────────
def build_clinical_pdf(note, patient, vitals, db) -> str:
    """Build a complete clinical PDF and return its file path."""
    template  = (note.template or "soap").lower()
    color_map = TEMPLATE_COLOR_MAP.get(template, SOAP_COLORS)
    tmpl_name = TEMPLATE_FULL_NAME.get(template, "Clinical Note")

    # Clinician info
    doctor_name = "—"
    org_name    = "Namma ScribeCare"
    if note.clinician:
        doctor_name = f"Dr. {note.clinician.name}"
        if note.clinician.org_name:
            org_name = note.clinician.org_name

    pdf = ClinicalPDF(org_name=org_name, doctor_name=doctor_name, template_label=tmpl_name)
    pdf.add_page()

    # ── Patient + Visit Info ──────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*C_GREEN_DARK)
    pdf.cell(0, 7, "CONSULTATION REPORT", ln=True)
    pdf.set_text_color(*C_GRAY_DARK)
    pdf.ln(2)

    # Two-column info grid (patient left, visit right)
    left_x = pdf.get_x()
    top_y  = pdf.get_y()
    col_w  = 85

    def info_block(title, rows, x, y):
        pdf.set_xy(x, y)
        pdf.set_fill_color(*C_GREEN_DARK)
        pdf.set_text_color(*C_WHITE)
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(col_w, 6, f"  {title}", fill=True, ln=False)
        cy = y + 6
        for i, (lbl, val) in enumerate(rows):
            pdf.set_xy(x, cy)
            fill = i % 2 == 0
            pdf.set_fill_color(*C_GRAY_LIGHT if fill else C_WHITE)
            pdf.set_font("Helvetica", "B", 7.5)
            pdf.set_text_color(*C_GRAY_MID)
            pdf.cell(32, 6, f"  {safe(lbl)}", fill=fill, border="B")
            pdf.set_font("Helvetica", "", 8.5)
            pdf.set_text_color(*C_GRAY_DARK)
            pdf.cell(col_w - 32, 6, f"  {safe(val)}", fill=fill, border="B")
            cy += 6
        return cy

    age_str = "—"
    if patient and patient.dob:
        try:
            dob = datetime.fromisoformat(str(patient.dob))
            age_str = f"{(datetime.now() - dob).days // 365} yrs"
        except Exception:
            age_str = str(patient.dob)

    patient_rows = [
        ("Full Name",    patient.name if patient else "—"),
        ("MRN",          patient.mrn if patient else "—"),
        ("Age / Gender", f"{age_str} / {patient.gender or '—'}" if patient else "—"),
        ("Blood Group",  patient.blood_group or "—" if patient else "—"),
        ("Phone",        patient.phone or "—" if patient else "—"),
        ("Aadhaar",      f"xxxx {patient.aadhaar_last4}" if patient and patient.aadhaar_last4 else "—"),
    ]
    visit_rows = [
        ("Date",       fmt_date(note.created_at)),
        ("Note Type",  tmpl_name),
        ("Status",     note.status.capitalize()),
        ("Note ID",    f"#SCB-{note.id:05d}"),
        ("Clinician",  doctor_name),
        ("Org",        org_name),
    ]

    end_left  = info_block("PATIENT INFORMATION", patient_rows, left_x, top_y)
    end_right = info_block("CONSULTATION DETAILS", visit_rows, left_x + col_w + 4, top_y)
    pdf.set_y(max(end_left, end_right) + 4)

    # ── Vital Signs ──────────────────────────────────────────────────────────
    if vitals:
        pdf.set_fill_color(*C_GREEN_DARK)
        pdf.set_text_color(*C_WHITE)
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(0, 6, "  VITAL SIGNS  (Auto-Extracted by AI from Clinical Reports)", fill=True, ln=True)
        pdf.ln(2)

        chips = []
        v = vitals
        if v.bp_systolic and v.bp_diastolic:
            chips.append(("Blood Pressure", f"{v.bp_systolic}/{v.bp_diastolic} mmHg"))
        if v.pulse_rate:
            chips.append(("Pulse Rate", f"{v.pulse_rate} bpm"))
        if v.temperature:
            chips.append(("Temperature", f"{v.temperature} °F"))
        if v.spo2:
            chips.append(("SpO2", f"{v.spo2} %"))
        if v.respiratory_rate:
            chips.append(("Resp. Rate", f"{v.respiratory_rate} /min"))
        if v.blood_glucose:
            chips.append(("Blood Glucose", f"{v.blood_glucose} mg/dL"))
        if v.weight:
            chips.append(("Weight", f"{v.weight} kg"))
        if v.height:
            chips.append(("Height", f"{v.height} cm"))

        # Draw in rows of 4
        x_start = pdf.get_x()
        y_start = pdf.get_y()
        chip_w  = 42
        gap     = 3
        cols    = 4
        for idx, (label, val) in enumerate(chips):
            col = idx % cols
            row = idx // cols
            cx  = x_start + col * (chip_w + gap)
            cy  = y_start + row * 15
            pdf.vital_chip(label, val, cx, cy, chip_w)

        rows_needed = (len(chips) + cols - 1) // cols
        pdf.set_y(y_start + rows_needed * 15 + 4)
        pdf.set_text_color(*C_GRAY_DARK)
    else:
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(*C_GRAY_MID)
        pdf.cell(0, 6, "  No vital readings recorded for this consultation.", ln=True)

    pdf.ln(3)

    # ── Clinical Note Sections ────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*C_GREEN_DARK)
    pdf.cell(0, 7, "CLINICAL NOTE", ln=True)
    pdf.set_text_color(*C_GRAY_DARK)
    pdf.ln(1)

    if note.note_content:
        for key, value in note.note_content.items():
            colors = color_map.get(key, (C_GRAY_MID, C_GRAY_LIGHT))
            h_col, bg_col = colors
            display_label = SECTION_LABELS.get(key, key.replace("_", " ").title())
            pdf.section_header(display_label, h_col, bg_col)
            pdf.body_text(str(value) if value else "—", bg_col)
    else:
        pdf.set_font("Helvetica", "I", 9)
        pdf.cell(0, 8, "No clinical note content available.", ln=True)

    pdf.ln(3)

    # ── Transcript ──────────────────────────────────────────────────────────
    if note.transcript:
        pdf.section_header("Audio Transcript  (AI Transcribed)", C_GRAY_MID, C_GRAY_LIGHT)
        transcript_preview = note.transcript[:600]
        if len(note.transcript) > 600:
            transcript_preview += "\n... [Transcript continues — full version in digital records]"
        pdf.body_text(transcript_preview, C_GRAY_LIGHT)
        pdf.ln(3)

    # ── Signature Block ──────────────────────────────────────────────────────
    if pdf.get_y() > 230:
        pdf.add_page()

    pdf.ln(8)
    pdf.set_draw_color(*C_GREEN_MID)
    pdf.set_line_width(0.5)

    sig_x = 18
    sig_w = 78
    # Left signature box
    pdf.line(sig_x, pdf.get_y(), sig_x + sig_w, pdf.get_y())
    pdf.set_xy(sig_x, pdf.get_y() + 2)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(*C_GRAY_DARK)
    pdf.cell(sig_w, 5, safe(doctor_name))
    pdf.ln(4)
    pdf.set_xy(sig_x, pdf.get_y())
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*C_GRAY_MID)
    pdf.cell(sig_w, 5, safe(org_name))

    # Right: date + note
    pdf.set_xy(140, pdf.get_y() - 9)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*C_GRAY_DARK)
    pdf.cell(0, 5, f"Date: {fmt_date_only(note.created_at)}", align="L")
    pdf.set_xy(140, pdf.get_y() + 4)
    pdf.set_font("Helvetica", "I", 7.5)
    pdf.set_text_color(*C_GRAY_MID)
    pdf.cell(0, 4, "AI-Assisted Documentation  |  For Medical Use Only")

    # Save
    os.makedirs("exports", exist_ok=True)
    path = os.path.join("exports", f"clinical_note_{note.id}.pdf")
    pdf.output(path)
    return path


# ── Routes ────────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[schemas.Note])
def get_notes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Note)
        .filter(models.Note.clinician_id == current_user.id)
        .order_by(models.Note.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/patient/{patient_id}", response_model=List[schemas.Note])
def get_patient_notes(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Note)
        .filter(
            models.Note.patient_id == patient_id,
            models.Note.clinician_id == current_user.id,
        )
        .order_by(models.Note.created_at.desc())
        .all()
    )


@router.get("/{note_id}", response_model=schemas.Note)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.clinician_id == current_user.id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/{note_id}/approve", response_model=schemas.Note)
def approve_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.clinician_id == current_user.id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.status = "approved"
    db.commit()
    db.refresh(note)
    return note


@router.put("/{note_id}", response_model=schemas.Note)
def update_note(
    note_id: int,
    update_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.clinician_id == current_user.id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if "content" in update_data:
        note.note_content = update_data["content"]
    db.commit()
    db.refresh(note)
    return note


@router.get("/{note_id}/pdf")
def export_pdf(
    note_id: int,
    token: str | None = None,
    bearer_token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    current_user = get_user_from_token(token or bearer_token, db)
    note = db.query(models.Note).filter(
        models.Note.id == note_id,
        models.Note.clinician_id == current_user.id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    patient = note.patient

    # Fetch the most recent vitals linked to this consultation
    vitals = (
        db.query(models.VitalReading)
        .filter(models.VitalReading.consultation_id == note.consultation_id)
        .order_by(models.VitalReading.recorded_at.desc())
        .first()
    )
    # Fallback: latest vitals for this patient
    if not vitals and patient:
        vitals = (
            db.query(models.VitalReading)
            .filter(models.VitalReading.patient_id == patient.id)
            .order_by(models.VitalReading.recorded_at.desc())
            .first()
        )

    pdf_path = build_clinical_pdf(note, patient, vitals, db)
    fname    = f"NammaScribeCare_{patient.name if patient else note_id}_Report.pdf"
    return FileResponse(path=pdf_path, filename=fname, media_type="application/pdf")
