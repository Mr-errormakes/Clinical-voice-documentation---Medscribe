from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
import models
from database import get_db

router = APIRouter(prefix="/api/patients", tags=["Medications"])


class MedIn(BaseModel):
    name:          str
    dosage:        Optional[str] = None
    frequency:     Optional[str] = None
    route:         Optional[str] = "Oral"
    started_on:    Optional[str] = None
    review_after:  Optional[str] = None
    prescribed_by: Optional[str] = None
    notes:         Optional[str] = None


class MedUpdate(BaseModel):
    dosage:        Optional[str] = None
    frequency:     Optional[str] = None
    route:         Optional[str] = None
    review_after:  Optional[str] = None
    prescribed_by: Optional[str] = None
    notes:         Optional[str] = None


class DiscontinueIn(BaseModel):
    stopped_on:  Optional[str] = None
    stop_reason: Optional[str] = None


class MedOut(BaseModel):
    id:            int
    patient_id:    int
    name:          str
    dosage:        Optional[str]
    frequency:     Optional[str]
    route:         Optional[str]
    started_on:    Optional[str]
    review_after:  Optional[str]
    status:        str
    stopped_on:    Optional[str]
    stop_reason:   Optional[str]
    prescribed_by: Optional[str]
    notes:         Optional[str]
    created_at:    datetime
    updated_at:    Optional[datetime]

    class Config:
        from_attributes = True


@router.get("/{patient_id}/medications")
def list_medications(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    meds = (
        db.query(models.Medication)
        .filter(models.Medication.patient_id == patient_id)
        .order_by(models.Medication.status, models.Medication.created_at.desc())
        .all()
    )
    return meds


@router.post("/{patient_id}/medications", response_model=MedOut)
def add_medication(patient_id: int, data: MedIn, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    med = models.Medication(patient_id=patient_id, **data.dict())
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


@router.put("/{patient_id}/medications/{med_id}", response_model=MedOut)
def update_medication(patient_id: int, med_id: int, data: MedUpdate, db: Session = Depends(get_db)):
    med = db.query(models.Medication).filter(
        models.Medication.id == med_id,
        models.Medication.patient_id == patient_id,
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(med, k, v)
    db.commit()
    db.refresh(med)
    return med


@router.put("/{patient_id}/medications/{med_id}/discontinue", response_model=MedOut)
def discontinue_medication(patient_id: int, med_id: int, data: DiscontinueIn, db: Session = Depends(get_db)):
    med = db.query(models.Medication).filter(
        models.Medication.id == med_id,
        models.Medication.patient_id == patient_id,
        models.Medication.status == "active",
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Active medication not found")
    med.status = "discontinued"
    if data.stopped_on:
        med.stopped_on = data.stopped_on
    if data.stop_reason:
        med.stop_reason = data.stop_reason
    db.commit()
    db.refresh(med)
    return med


@router.put("/{patient_id}/medications/{med_id}/reactivate", response_model=MedOut)
def reactivate_medication(patient_id: int, med_id: int, db: Session = Depends(get_db)):
    med = db.query(models.Medication).filter(
        models.Medication.id == med_id,
        models.Medication.patient_id == patient_id,
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    med.status = "active"
    med.stopped_on = None
    med.stop_reason = None
    db.commit()
    db.refresh(med)
    return med


@router.delete("/{patient_id}/medications/{med_id}")
def delete_medication(patient_id: int, med_id: int, db: Session = Depends(get_db)):
    med = db.query(models.Medication).filter(
        models.Medication.id == med_id,
        models.Medication.patient_id == patient_id,
    ).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    db.delete(med)
    db.commit()
    return {"message": "Deleted"}
