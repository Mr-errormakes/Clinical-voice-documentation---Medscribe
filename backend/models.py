from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="clinician")
    org_name = Column(String)

    consultations = relationship("Consultation", back_populates="clinician")
    notes = relationship("Note", back_populates="clinician")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    mrn = Column(String, unique=True, index=True)
    name = Column(String, nullable=False)
    dob = Column(String)
    gender = Column(String)
    phone = Column(String)
    aadhaar_last4 = Column(String)
    blood_group = Column(String)
    total_visits = Column(Integer, default=0)
    # Legacy flat string arrays kept for backward compat
    active_medications = Column(JSON, default=list)
    discontinued_medications = Column(JSON, default=list)
    consulting_doctor = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    consultations = relationship("Consultation", back_populates="patient")
    notes = relationship("Note", back_populates="patient")
    vital_readings = relationship("VitalReading", back_populates="patient", order_by="VitalReading.recorded_at.desc()")
    medications = relationship("Medication", back_populates="patient", order_by="Medication.created_at.desc()")


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    clinician_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending")  # pending, processing, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="consultations")
    clinician = relationship("User", back_populates="consultations")
    notes = relationship("Note", back_populates="consultation")
    attachments = relationship("Attachment", back_populates="consultation")
    vital_readings = relationship("VitalReading", back_populates="consultation")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"))
    patient_id = Column(Integer, ForeignKey("patients.id"))
    clinician_id = Column(Integer, ForeignKey("users.id"))
    template = Column(String, default="soap")
    status = Column(String, default="draft")  # draft, approved
    transcript = Column(String)
    note_content = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    consultation = relationship("Consultation", back_populates="notes")
    patient = relationship("Patient", back_populates="notes")
    clinician = relationship("User", back_populates="notes")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id"))
    type = Column(String)
    file_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    consultation = relationship("Consultation", back_populates="attachments")


class VitalReading(Base):
    """One row per clinical visit — secondary readings / EMR vitals."""
    __tablename__ = "vital_readings"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    consultation_id = Column(Integer, ForeignKey("consultations.id"), nullable=True)

    # Vitals
    bp_systolic  = Column(Integer)   # mmHg
    bp_diastolic = Column(Integer)   # mmHg
    temperature  = Column(Float)     # °F
    weight       = Column(Float)     # kg
    height       = Column(Float)     # cm (for BMI)
    blood_glucose = Column(Float)    # mg/dL (fasting)
    spo2         = Column(Integer)   # %
    pulse_rate   = Column(Integer)   # bpm
    respiratory_rate = Column(Integer)  # breaths/min
    notes        = Column(String)    # free text

    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    patient      = relationship("Patient",      back_populates="vital_readings")
    consultation = relationship("Consultation", back_populates="vital_readings")


class Medication(Base):
    """Structured medication record — replaces the flat JSON arrays on Patient."""
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    name          = Column(String, nullable=False)
    dosage        = Column(String)   # "500 mg", "10 mg"
    frequency     = Column(String)   # "Once daily", "Twice daily after meals"
    route         = Column(String, default="Oral")  # Oral / Topical / Injection
    started_on    = Column(String)   # ISO date string
    review_after  = Column(String)   # "1 month", "3 months", "6 months"

    status        = Column(String, default="active")  # active | discontinued
    stopped_on    = Column(String)   # ISO date string when stopped
    stop_reason   = Column(String)   # reason for discontinuation

    prescribed_by = Column(String)
    notes         = Column(String)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    patient = relationship("Patient", back_populates="medications")
