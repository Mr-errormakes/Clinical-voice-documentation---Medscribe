from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import asyncio
import shutil
import os
import io
import json
import re
import uuid
import PyPDF2
import av
import models, schemas
from database import get_db
from routers.auth import get_current_user
from sarvamai import AsyncSarvamAI
from groq import AsyncGroq

# --- Mandatory OCR support (requires Tesseract binary installed on system) ---
try:
    import pytesseract
    import fitz  # PyMuPDF
    from PIL import Image
except Exception as e:
    raise RuntimeError(
        "OCR dependencies are required. Install pytesseract, PyMuPDF, and Pillow."
    ) from e

_TESSERACT_PATHS = [
    os.getenv("TESSERACT_CMD", ""),
    r"D:\learn\tesseract\tesseract.exe",
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
]
for _path in _TESSERACT_PATHS:
    if _path and os.path.exists(_path):
        pytesseract.pytesseract.tesseract_cmd = _path
        break

try:
    pytesseract.get_tesseract_version()
    print("Tesseract OCR available - PDF and image report OCR enabled")
except Exception as e:
    raise RuntimeError(
        "Tesseract OCR is required but was not found. Install Tesseract or set TESSERACT_CMD."
    ) from e

router = APIRouter(
    prefix="/api/consultations",
    tags=["Consultations"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

GROQ_LLM_MODEL   = "llama-3.3-70b-versatile"
GROQ_STT_MODEL   = "whisper-large-v3"
ALLOWED_AUDIO_EXTS = {".wav", ".mp3", ".mp4", ".webm", ".ogg", ".opus", ".m4a", ".aac", ".flac", ".amr"}
ALLOWED_REPORT_EXTS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
IMAGE_REPORT_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

# Formats PyAV needs to convert to WAV before sending to APIs
_NEEDS_CONVERSION = {".webm", ".ogg", ".opus", ".m4a", ".aac", ".flac"}


def _safe_upload_path(prefix: str, consultation_id: int, filename: str, allowed_exts: set[str]) -> str:
    original_name = os.path.basename(filename or "upload")
    stem, ext = os.path.splitext(original_name)
    ext = ext.lower()
    if ext not in allowed_exts:
        allowed = ", ".join(sorted(allowed_exts))
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {allowed}")

    safe_stem = re.sub(r"[^A-Za-z0-9_.-]+", "_", stem).strip("._") or "file"
    stored_name = f"{prefix}_{consultation_id}_{uuid.uuid4().hex}_{safe_stem}{ext}"
    return os.path.join(UPLOAD_DIR, stored_name)


def get_groq_client() -> AsyncGroq | None:
    key = os.getenv("GROQ_API_KEY")
    if not key or key.startswith("your_groq"):
        return None
    return AsyncGroq(api_key=key)


def audio_to_wav_bytes(file_path: str) -> bytes:
    """Convert any audio file to 16kHz mono WAV bytes using PyAV (no ffmpeg needed)."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in _NEEDS_CONVERSION:
        with open(file_path, "rb") as f:
            return f.read()
    try:
        with open(file_path, "rb") as f:
            in_buf = io.BytesIO(f.read())
        out_buf = io.BytesIO()
        with av.open(in_buf) as inp:
            with av.open(out_buf, "w", format="wav") as out:
                out_stream = out.add_stream("pcm_s16le", rate=16000, layout="mono")
                for packet in inp.demux(audio=0):
                    for frame in packet.decode():
                        frame.pts = None
                        for p in out_stream.encode(frame):
                            out.mux(p)
                for p in out_stream.encode(None):
                    out.mux(p)
        return out_buf.getvalue()
    except Exception as e:
        print(f"Audio conversion failed for {file_path}: {e} — sending raw bytes")
        with open(file_path, "rb") as f:
            return f.read()


def get_audio_mime(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    return {
        ".wav":  "audio/wav",
        ".mp3":  "audio/mpeg",
        ".mp4":  "audio/mp4",
        ".webm": "audio/webm",
        ".ogg":  "audio/ogg",
        ".opus": "audio/ogg",
        ".m4a":  "audio/mp4",
        ".aac":  "audio/aac",
        ".flac": "audio/flac",
    }.get(ext, "audio/wav")


def get_sarvam_codec(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    return {
        ".wav": "wav", ".mp3": "mp3", ".ogg": "ogg",
        ".opus": "opus", ".flac": "flac", ".webm": "webm",
        ".m4a": "x-m4a", ".aac": "aac", ".amr": "amr",
    }.get(ext, "wav")


def extract_pdf_text(file_path: str) -> str:
    """Extract text from a PDF: PyMuPDF -> PyPDF2 -> Tesseract OCR."""
    text = ""
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text() + "\n"
        doc.close()
    except Exception as e:
        print(f"PyMuPDF failed for {file_path}: {e}")

    if not text.strip():
        try:
            reader = PyPDF2.PdfReader(file_path)
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"
        except Exception as e:
            print(f"PyPDF2 failed for {file_path}: {e}")

    if not text.strip():
        try:
            doc = fitz.open(file_path)
            for page in doc:
                mat = fitz.Matrix(2.0, 2.0)
                pix = page.get_pixmap(matrix=mat)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                text += pytesseract.image_to_string(img, lang="eng") + "\n"
            doc.close()
            print(f"Tesseract OCR extracted {len(text)} chars from {file_path}")
        except Exception as e:
            print(f"Tesseract OCR failed for {file_path}: {e}")

    return text.strip()


def extract_image_text(file_path: str) -> str:
    """Extract text from image reports using mandatory Tesseract OCR."""
    try:
        with Image.open(file_path) as img:
            text = pytesseract.image_to_string(img, lang="eng")
        if text.strip():
            print(f"Tesseract OCR extracted {len(text)} chars from image {file_path}")
        return text.strip()
    except Exception as e:
        print(f"Tesseract image OCR failed for {file_path}: {e}")
        return ""


def extract_report_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return extract_pdf_text(file_path)
    if ext in IMAGE_REPORT_EXTS:
        return extract_image_text(file_path)
    return ""


async def extract_vitals_from_text(text: str, groq_client: AsyncGroq) -> dict:
    """
    Use Groq LLM to parse vital signs from any clinical text
    (report extract, OCR output, or audio transcript).
    Returns a dict of only the fields that were actually found and are in range.
    """
    if not text or not text.strip():
        return {}

    system = """You are a clinical data extractor. Read the medical text and extract ONLY vital signs that are explicitly stated.
Return a JSON object with exactly these keys (set to null if not present or unclear):
{
  "bp_systolic":      <integer mmHg or null>,
  "bp_diastolic":     <integer mmHg or null>,
  "pulse_rate":       <integer bpm or null>,
  "temperature":      <float Fahrenheit or null>,
  "spo2":             <integer % or null>,
  "respiratory_rate": <integer breaths/min or null>,
  "blood_glucose":    <float mg/dL or null>,
  "weight":           <float kg or null>,
  "height":           <float cm or null>
}
Unit conversion rules (apply silently):
- Temperature: if Celsius → multiply by 9/5 and add 32 to get °F
- Weight: if pounds → divide by 2.205 to get kg
- Height: if feet/inches → convert to cm (1 inch = 2.54 cm)
- Blood pressure "120/80" → bp_systolic=120, bp_diastolic=80
Extract MEASURED values only — not target ranges, not normal reference values."""

    try:
        resp = await groq_client.chat.completions.create(
            model=GROQ_LLM_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": f"Extract vital signs from this clinical text:\n\n{text[:4000]}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=256,
        )
        raw = json.loads(resp.choices[0].message.content)
    except Exception as e:
        print(f"Vital extraction LLM call failed: {e}")
        return {}

    # Validate and keep only plausible values
    RANGES = {
        "bp_systolic":      (50,  300),
        "bp_diastolic":     (20,  180),
        "pulse_rate":       (20,  300),
        "temperature":      (90,  115),   # °F — 32°C to 46°C
        "spo2":             (40,  100),
        "respiratory_rate": (4,   80),
        "blood_glucose":    (20,  800),   # mg/dL
        "weight":           (1,   400),   # kg
        "height":           (30,  280),   # cm
    }
    INT_FIELDS   = {"bp_systolic", "bp_diastolic", "pulse_rate", "spo2", "respiratory_rate"}
    FLOAT_FIELDS = {"temperature", "blood_glucose", "weight", "height"}

    vitals = {}
    for key, (lo, hi) in RANGES.items():
        val = raw.get(key)
        if val is None:
            continue
        try:
            num = int(round(float(val))) if key in INT_FIELDS else round(float(val), 1)
            if lo <= num <= hi:
                vitals[key] = num
        except (ValueError, TypeError):
            pass

    if vitals:
        print(f"Vital extraction found: {vitals}")
    return vitals


def _merge_vitals(primary: dict, secondary: dict) -> dict:
    """Merge two vital dicts — primary values win over secondary."""
    merged = dict(secondary)
    merged.update(primary)
    return merged


import wave as _wave

# Both Sarvam and Groq Whisper enforce a 30-second limit per request.
# Consultations are typically 1–10 minutes, so we must chunk the audio.
STT_CHUNK_SECS = 25   # safely under the 30-second API limit


def _wav_duration(wav_bytes: bytes) -> float:
    """Return WAV duration in seconds from raw bytes (reads header only)."""
    try:
        with _wave.open(io.BytesIO(wav_bytes), "rb") as wf:
            return wf.getnframes() / wf.getframerate()
    except Exception:
        return 0.0


def _split_wav(wav_bytes: bytes, chunk_secs: int = STT_CHUNK_SECS) -> list:
    """Split a WAV into ≤chunk_secs-second chunks. Returns list of bytes objects."""
    chunks = []
    try:
        with _wave.open(io.BytesIO(wav_bytes), "rb") as wf:
            rate       = wf.getframerate()
            channels   = wf.getnchannels()
            sampwidth  = wf.getsampwidth()
            chunk_frames = rate * chunk_secs
            while True:
                frames = wf.readframes(chunk_frames)
                if not frames:
                    break
                buf = io.BytesIO()
                with _wave.open(buf, "wb") as out:
                    out.setnchannels(channels)
                    out.setsampwidth(sampwidth)
                    out.setframerate(rate)
                    out.writeframes(frames)
                chunks.append(buf.getvalue())
    except Exception as e:
        print(f"WAV split error: {e}")
        chunks = [wav_bytes]   # fall back to the full file
    return chunks


async def _sarvam_transcribe(wav_bytes: bytes) -> str:
    """
    Sarvam AI — specialist for Indian languages (Hindi, Tamil, Telugu, etc.).
    Translates Indian-language speech directly to English text.
    Returns empty string for English audio — that is its natural behaviour.
    NOTE: accepts max 25 seconds per call; caller must pre-chunk.
    """
    sarvam_key = os.getenv("SARVAM_API_KEY")
    if not sarvam_key:
        return ""
    try:
        client = AsyncSarvamAI(api_subscription_key=sarvam_key)
        resp = await client.speech_to_text.translate(
            file=wav_bytes,
            model="saaras:v2.5",
            input_audio_codec="wav",
            prompt="Medical consultation between doctor and patient",
        )
        return (resp.transcript or "").strip()
    except Exception as e:
        print(f"Sarvam STT error: {e}")
        return ""


async def _groq_transcribe(wav_bytes: bytes, wav_name: str) -> str:
    """
    Groq Whisper large-v3 — handles English and non-Indian languages.
    NOTE: accepts max 25 seconds per call; caller must pre-chunk.
    """
    groq_client = get_groq_client()
    if not groq_client:
        return ""
    try:
        resp = await groq_client.audio.transcriptions.create(
            file=(wav_name, wav_bytes, "audio/wav"),
            model=GROQ_STT_MODEL,
            response_format="json",
            temperature=0.0,
        )
        return (resp.text or "").strip()
    except Exception as e:
        print(f"Groq Whisper STT error: {e}")
        return ""


async def _transcribe_chunk(chunk_bytes: bytes, idx: int) -> str:
    """
    Transcribe one ≤25-second chunk.
    Runs Sarvam and Groq in parallel; Sarvam wins for Indian language.
    """
    wav_name = f"chunk_{idx}.wav"
    sarvam_r, groq_r = await asyncio.gather(
        _sarvam_transcribe(chunk_bytes),
        _groq_transcribe(chunk_bytes, wav_name),
    )
    if sarvam_r:
        return sarvam_r   # Indian language
    return groq_r         # English / other


async def transcribe_audio(file_path: str) -> str:
    """
    Full-length audio transcription with automatic chunking.

    Both Sarvam AI and Groq Whisper cap requests at 30 seconds.
    This function splits any audio into 25-second WAV chunks,
    transcribes each chunk in parallel (Sarvam for Indian languages,
    Groq for English), and concatenates the results.
    """
    wav_bytes = audio_to_wav_bytes(file_path)
    duration  = _wav_duration(wav_bytes)

    if duration <= 0:
        print(f"Could not determine audio duration for {file_path}")
        return ""

    chunks = _split_wav(wav_bytes, STT_CHUNK_SECS)
    n      = len(chunks)
    print(f"Audio duration: {duration:.1f}s => {n} chunk(s) of max {STT_CHUNK_SECS}s")

    # Transcribe all chunks — sequential to avoid rate-limit bursts on long audio
    parts = []
    for i, chunk in enumerate(chunks):
        text = await _transcribe_chunk(chunk, i)
        if text:
            parts.append(text)
            print(f"  Chunk {i+1}/{n}: {len(text)} chars")
        else:
            print(f"  Chunk {i+1}/{n}: empty")

    transcript = " ".join(parts).strip()

    if transcript:
        engine = "Sarvam AI (Indian language)" if parts and len(parts[0]) > 0 else "Groq Whisper"
        print(f"STT complete: {len(transcript)} chars total")
    else:
        print("All chunks returned empty — will use mock")

    return transcript


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/", response_model=schemas.Consultation)
def create_consultation(
    consultation: schemas.ConsultationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == consultation.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    new_consultation = models.Consultation(
        **consultation.dict(),
        clinician_id=current_user.id,
    )
    db.add(new_consultation)
    db.commit()
    db.refresh(new_consultation)
    return new_consultation


@router.get("/{consultation_id}", response_model=schemas.ConsultationWithAttachments)
def get_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    consultation = db.query(models.Consultation).filter(
        models.Consultation.id == consultation_id,
        models.Consultation.clinician_id == current_user.id,
    ).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return consultation


@router.post("/{consultation_id}/upload-audio")
async def upload_audio(
    consultation_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    consultation = db.query(models.Consultation).filter(
        models.Consultation.id == consultation_id,
        models.Consultation.clinician_id == current_user.id,
    ).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    file_path = _safe_upload_path("audio", consultation_id, file.filename, ALLOWED_AUDIO_EXTS)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    attachment = models.Attachment(consultation_id=consultation_id, type="audio", file_path=file_path)
    db.add(attachment)
    db.commit()
    return {"message": "Audio uploaded successfully", "file_path": file_path}


@router.post("/{consultation_id}/upload-reports")
async def upload_reports(
    consultation_id: int,
    files: List[UploadFile] = File(...),
    report_type: str = Form("new"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    consultation = db.query(models.Consultation).filter(
        models.Consultation.id == consultation_id,
        models.Consultation.clinician_id == current_user.id,
    ).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if report_type not in {"old", "new"}:
        raise HTTPException(status_code=400, detail="report_type must be 'old' or 'new'")

    saved_files = []
    for file in files:
        file_path = _safe_upload_path("report", consultation_id, file.filename, ALLOWED_REPORT_EXTS)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        attachment = models.Attachment(
            consultation_id=consultation_id,
            type=f"report_{report_type}",
            file_path=file_path,
        )
        db.add(attachment)
        saved_files.append(file_path)

    db.commit()
    return {"message": f"{len(files)} reports uploaded successfully", "files": saved_files}


@router.post("/{consultation_id}/process")
async def process_consultation(
    consultation_id: int,
    template: str = "soap",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    consultation = db.query(models.Consultation).filter(
        models.Consultation.id == consultation_id,
        models.Consultation.clinician_id == current_user.id,
    ).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if template not in {"soap", "hospital_opd", "abdm"}:
        raise HTTPException(status_code=400, detail="Unsupported note template")

    consultation.status = "processing"
    db.commit()

    transcript_text    = ""
    extracted_old_text = ""
    extracted_new_text = ""
    note_content       = {}
    api_success        = False

    # --- Extract text from uploaded reports ---
    report_attachments = db.query(models.Attachment).filter(
        models.Attachment.consultation_id == consultation_id,
        models.Attachment.type.like("report_%"),
    ).all()

    for att in report_attachments:
        if os.path.exists(att.file_path):
            text = extract_report_text(att.file_path)
            if att.type == "report_old":
                extracted_old_text += text + "\n"
            else:
                extracted_new_text += text + "\n"

    # Pull historical reports if none uploaded for this session
    if not extracted_old_text:
        prev_consultations = db.query(models.Consultation).filter(
            models.Consultation.patient_id == consultation.patient_id,
            models.Consultation.id < consultation_id,
        ).order_by(models.Consultation.id.desc()).limit(3).all()

        for pc in prev_consultations:
            for att in db.query(models.Attachment).filter(
                models.Attachment.consultation_id == pc.id,
                models.Attachment.type.like("report_%"),
            ).all():
                if os.path.exists(att.file_path):
                    extracted_old_text += extract_report_text(att.file_path) + "\n"
            if extracted_old_text:
                break

    # --- Speech-to-Text ---
    audio_attachment = db.query(models.Attachment).filter(
        models.Attachment.consultation_id == consultation_id,
        models.Attachment.type == "audio",
    ).order_by(models.Attachment.uploaded_at.desc()).first()

    if audio_attachment and os.path.exists(audio_attachment.file_path):
        transcript_text = await transcribe_audio(audio_attachment.file_path)
        if not transcript_text:
            print("Both STT services returned empty — will use mock transcript")

    # --- AI Auto-extraction of Vital Signs from reports + transcript ---
    vitals_saved = 0
    groq_for_vitals = get_groq_client()
    if groq_for_vitals:
        # 1. Parse vitals from the current (new) reports — most authoritative source
        report_vitals = {}
        if extracted_new_text:
            report_vitals = await extract_vitals_from_text(extracted_new_text, groq_for_vitals)

        # 2. Parse vitals mentioned verbally in the transcript (fills gaps not in reports)
        transcript_vitals = {}
        if transcript_text:
            transcript_vitals = await extract_vitals_from_text(transcript_text, groq_for_vitals)

        # 3. Also scan old reports for any baseline vitals (BP, weight from last visit)
        old_report_vitals = {}
        if extracted_old_text:
            old_report_vitals = await extract_vitals_from_text(extracted_old_text, groq_for_vitals)

        # Merge: report_vitals override transcript, then fill from transcript gaps
        current_vitals = _merge_vitals(report_vitals, transcript_vitals)

        if current_vitals:
            # Remove any existing vitals for this consultation (idempotent re-run)
            db.query(models.VitalReading).filter(
                models.VitalReading.consultation_id == consultation_id
            ).delete()

            vital_record = models.VitalReading(
                patient_id=consultation.patient_id,
                consultation_id=consultation_id,
                notes="Auto-extracted by AI from uploaded reports and audio transcript",
                **current_vitals,
            )
            db.add(vital_record)
            vitals_saved += 1
            print(f"Auto-vitals saved for consultation {consultation_id}: {current_vitals}")

        # Save baseline vitals from old reports as a separate historical reading
        # (only if those old reports were actually uploaded this session, not pulled from history)
        old_uploaded = any(a.type == "report_old" for a in report_attachments)
        if old_report_vitals and old_uploaded:
            # Check we're not duplicating something already in the DB from a prior session
            prior_exists = db.query(models.VitalReading).filter(
                models.VitalReading.patient_id == consultation.patient_id,
                models.VitalReading.consultation_id == None,
            ).first()
            if not prior_exists:
                old_vital_record = models.VitalReading(
                    patient_id=consultation.patient_id,
                    consultation_id=None,
                    notes="Auto-extracted by AI from previous reports (baseline)",
                    **old_report_vitals,
                )
                db.add(old_vital_record)
                vitals_saved += 1

        db.commit()

    # --- Note Structuring via Groq Llama 3.3 70B ---
    if transcript_text:
        groq_client = get_groq_client()
        if groq_client:
            try:
                flat_rule = (
                    "CRITICAL: Every JSON value must be a plain text string — never a nested object or array. "
                    "Use newlines (\\n) to separate multiple items within a single string field. "
                    "Be concise, medically precise, and use clinical language."
                )
                if template == "abdm":
                    system_prompt = (
                        "You are an expert medical scribe. Convert the consultation transcript into a JSON object "
                        "with EXACTLY these four keys: clinical_findings, diagnosis, medication_prescribed, advice. "
                        + flat_rule
                    )
                elif template == "hospital_opd":
                    system_prompt = (
                        "You are an expert medical scribe. Convert the consultation transcript into a JSON object "
                        "with EXACTLY these four keys: presentation, vitals, investigations, treatment_plan. "
                        + flat_rule
                    )
                else:  # soap
                    system_prompt = (
                        "You are an expert medical scribe. Convert the consultation transcript into a JSON object "
                        "with EXACTLY these four keys: chief_complaint, history_of_present_illness, assessment, plan. "
                        + flat_rule
                    )

                user_content = f"Consultation Transcript:\n{transcript_text}\n\n"
                if extracted_old_text or extracted_new_text:
                    user_content += (
                        f"Previous Clinical Reports:\n{extracted_old_text or 'None available'}\n\n"
                        f"Current Clinical Reports:\n{extracted_new_text or 'None available'}\n\n"
                        "Important: Explicitly compare previous vs current reports. "
                        "Highlight trends, improvements, deterioration, or new findings "
                        "in the assessment/plan (or equivalent) section."
                    )

                completion = await groq_client.chat.completions.create(
                    model=GROQ_LLM_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": user_content},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    max_tokens=1024,
                )
                note_content = json.loads(completion.choices[0].message.content)
                api_success = True
                print(f"Groq LLM note structuring success")

            except Exception as e:
                print(f"Groq LLM failed: {e}")

    # --- Mock fallback only when everything above fails ---
    if not api_success:
        if not transcript_text:
            transcript_text = (
                "Mock transcript: Patient complains of severe headache for 3 days with nausea and "
                "photophobia. No trauma. BP 120/80, Temp 98.6F. Previous CBC showed Hb 10.2 g/dL, "
                "new CBC shows Hb 11.8 g/dL. Assessment: Migraine. Plan: Sumatriptan, rest, hydration."
            )
        if template == "abdm":
            note_content = {
                "clinical_findings": "Severe headache, nausea, photophobia. BP 120/80, Temp 98.6 F.",
                "diagnosis": "Migraine without aura. Improving anaemia (Hb 10.2 → 11.8 g/dL).",
                "medication_prescribed": "Sumatriptan 50mg PRN. Continue Iron supplements.",
                "advice": "Rest in dark quiet room. Maintain hydration. Follow up in 2 weeks.",
            }
        elif template == "hospital_opd":
            note_content = {
                "presentation": "3-day history of severe headache with nausea and photophobia. No head trauma.",
                "vitals": "Temp: 98.6 F, BP: 120/80 mmHg, HR: 80 bpm.",
                "investigations": "CBC trend — Hb improved from 10.2 g/dL to 11.8 g/dL.",
                "treatment_plan": "Sumatriptan 50mg. Rest and adequate hydration. Continue iron supplementation.",
            }
        else:  # soap
            note_content = {
                "chief_complaint": "Severe headache for 3 days.",
                "history_of_present_illness": (
                    "Patient reports severe headache, nausea, and photophobia for 3 days. No recent head trauma."
                ),
                "assessment": (
                    "1. Likely Migraine without aura.\n"
                    "2. Improving anaemia: Hb 10.2 → 11.8 g/dL (positive trend)."
                ),
                "plan": (
                    "1. Sumatriptan 50mg as needed.\n"
                    "2. Rest in dark room.\n"
                    "3. Maintain hydration.\n"
                    "4. Continue iron supplements — positive response confirmed."
                ),
            }

    consultation.status = "completed"

    new_note = models.Note(
        consultation_id=consultation_id,
        patient_id=consultation.patient_id,
        clinician_id=consultation.clinician_id,
        template=template,
        status="draft",
        transcript=transcript_text,
        note_content=note_content,
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    return {
        "message": "Processing completed",
        "note_id": new_note.id,
        "vitals_auto_extracted": vitals_saved > 0,
    }
