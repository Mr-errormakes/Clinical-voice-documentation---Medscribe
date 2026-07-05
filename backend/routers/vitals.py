from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
import models
from database import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/api/patients", tags=["Vitals"])


class VitalIn(BaseModel):
    bp_systolic:      Optional[int]   = None
    bp_diastolic:     Optional[int]   = None
    temperature:      Optional[float] = None
    weight:           Optional[float] = None
    height:           Optional[float] = None
    blood_glucose:    Optional[float] = None
    spo2:             Optional[int]   = None
    pulse_rate:       Optional[int]   = None
    respiratory_rate: Optional[int]   = None
    notes:            Optional[str]   = None
    consultation_id:  Optional[int]   = None


class VitalOut(BaseModel):
    id:               int
    patient_id:       int
    consultation_id:  Optional[int]
    bp_systolic:      Optional[int]
    bp_diastolic:     Optional[int]
    temperature:      Optional[float]
    weight:           Optional[float]
    height:           Optional[float]
    blood_glucose:    Optional[float]
    spo2:             Optional[int]
    pulse_rate:       Optional[int]
    respiratory_rate: Optional[int]
    notes:            Optional[str]
    recorded_at:      datetime

    class Config:
        from_attributes = True


@router.get("/{patient_id}/vitals")
def list_vitals(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    readings = (
        db.query(models.VitalReading)
        .filter(models.VitalReading.patient_id == patient_id)
        .order_by(models.VitalReading.recorded_at.desc())
        .all()
    )
    return readings


@router.post("/{patient_id}/vitals", response_model=VitalOut)
def add_vital(
    patient_id: int,
    data: VitalIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    reading = models.VitalReading(patient_id=patient_id, **data.dict())
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


@router.delete("/{patient_id}/vitals/{vital_id}")
def delete_vital(
    patient_id: int,
    vital_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    reading = db.query(models.VitalReading).filter(
        models.VitalReading.id == vital_id,
        models.VitalReading.patient_id == patient_id,
    ).first()
    if not reading:
        raise HTTPException(status_code=404, detail="Vital reading not found")
    db.delete(reading)
    db.commit()
    return {"message": "Deleted"}
