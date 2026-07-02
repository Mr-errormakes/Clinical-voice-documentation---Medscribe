from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "clinician"
    org_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    class Config:
        from_attributes = True

# --- Patient Schemas ---
class PatientBase(BaseModel):
    mrn: str
    name: str
    dob: str
    gender: str
    phone: str
    aadhaar_last4: str
    blood_group: Optional[str] = None
    total_visits: Optional[int] = 0
    active_medications: Optional[List[str]] = []
    discontinued_medications: Optional[List[str]] = []
    consulting_doctor: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Consultation Schemas ---
class ConsultationBase(BaseModel):
    patient_id: int
    status: str = "pending"

class ConsultationCreate(ConsultationBase):
    pass

class Consultation(ConsultationBase):
    id: int
    clinician_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Attachment(BaseModel):
    id: int
    type: str
    file_path: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class ConsultationWithAttachments(Consultation):
    attachments: List[Attachment] = []

# --- Note Schemas ---
class NoteBase(BaseModel):
    consultation_id: int
    patient_id: int
    template: str = "soap"
    status: str = "draft"
    transcript: Optional[str] = None
    note_content: Optional[Dict[str, Any]] = None

class NoteCreate(NoteBase):
    pass

class Note(NoteBase):
    id: int
    clinician_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    patient: Optional[Patient] = None

    class Config:
        from_attributes = True

class PatientDetails(Patient):
    notes: List[Note] = []
    consultations: List[ConsultationWithAttachments] = []
    
    class Config:
        from_attributes = True
