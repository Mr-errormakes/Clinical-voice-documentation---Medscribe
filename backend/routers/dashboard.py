from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
from database import get_db

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_patients = db.query(models.Patient).count()
    total_consultations = db.query(models.Consultation).count()
    total_notes_generated = db.query(models.Note).count()
    
    return {
        "total_patients": total_patients,
        "total_consultations": total_consultations,
        "total_notes_generated": total_notes_generated,
        "pending_reviews": db.query(models.Note).filter(models.Note.status == "draft").count()
    }
