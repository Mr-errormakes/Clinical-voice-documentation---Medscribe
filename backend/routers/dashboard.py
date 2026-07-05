from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import models
from database import get_db
from routers.auth import get_current_user

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    total_patients = db.query(models.Patient).count()
    total_consultations = (
        db.query(models.Consultation)
        .filter(models.Consultation.clinician_id == current_user.id)
        .count()
    )
    total_notes_generated = (
        db.query(models.Note)
        .filter(models.Note.clinician_id == current_user.id)
        .count()
    )
    pending_reviews = (
        db.query(models.Note)
        .filter(
            models.Note.clinician_id == current_user.id,
            models.Note.status == "draft",
        )
        .count()
    )
    recent_notes = (
        db.query(models.Note)
        .filter(models.Note.clinician_id == current_user.id)
        .order_by(models.Note.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "total_patients": total_patients,
        "total_consultations": total_consultations,
        "total_notes_generated": total_notes_generated,
        "pending_reviews": pending_reviews,
        "recent_notes": [
            {
                "id": note.id,
                "patient_name": note.patient.name if note.patient else None,
                "mrn": note.patient.mrn if note.patient else None,
                "template": note.template,
                "status": note.status,
                "date": note.created_at,
                "preview": next(iter((note.note_content or {}).values()), note.transcript or ""),
            }
            for note in recent_notes
        ],
    }
