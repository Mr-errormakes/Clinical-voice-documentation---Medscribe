from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas
from database import get_db
import bcrypt

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

@router.post("/signup")
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        name=user.name,
        role=user.role,
        org_name=user.org_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "token": "dummy-token-" + str(new_user.id),
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "role": new_user.role,
            "org_name": new_user.org_name
        }
    }

class UserLogin(schemas.BaseModel):
    email: schemas.EmailStr
    password: str

@router.post("/login")
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    # Simple login without OAuth2 for now, just matching email/password
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    # In a real app, generate JWT here
    return {
        "token": "dummy-token-" + str(user.id),
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "org_name": user.org_name
        }
    }
