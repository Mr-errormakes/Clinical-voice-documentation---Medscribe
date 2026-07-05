from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from routers.auth import get_current_user

router = APIRouter(
    prefix="/api/patients",
    tags=["Patients"],
)

@router.get("/", response_model=List[schemas.Patient])
def get_patients(
    search: str = "",
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Patient)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                models.Patient.name.ilike(term),
                models.Patient.mrn.ilike(term),
                models.Patient.phone.ilike(term),
                models.Patient.aadhaar_last4.ilike(term),
            )
        )
    return query.order_by(models.Patient.created_at.desc()).offset(skip).limit(limit).all()

@router.post("/", response_model=schemas.Patient)
def create_patient(
    patient: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_patient = db.query(models.Patient).filter(models.Patient.mrn == patient.mrn).first()
    if db_patient:
        raise HTTPException(status_code=400, detail="Patient with this MRN already exists")
    
    new_patient = models.Patient(**patient.dict())
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient

@router.get("/{patient_id}", response_model=schemas.Patient)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.get("/{patient_id}/details", response_model=schemas.PatientDetails)
def get_patient_details(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient
