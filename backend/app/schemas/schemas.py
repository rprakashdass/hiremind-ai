from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserInDB(UserResponse):
    hashed_password: str


# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


# Resume Schemas
class ResumeBase(BaseModel):
    original_filename: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None


class ResumeCreate(ResumeBase):
    filename: str
    file_path: str
    extracted_text: Optional[str] = None


class ResumeResponse(ResumeBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    filename: str
    created_at: datetime
    updated_at: Optional[datetime] = None


# Job Description Schemas
class JobDescriptionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    company: Optional[str] = Field(None, max_length=100)
    description_text: str = Field(..., min_length=10)
    requirements: Optional[str] = None


class JobDescriptionCreate(JobDescriptionBase):
    pass


class JobDescriptionResponse(JobDescriptionBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime


# Analysis Schemas
class AnalysisBase(BaseModel):
    ats_score: Optional[float] = Field(None, ge=0, le=100)
    keyword_matches: Optional[List[str]] = []
    missing_keywords: Optional[List[str]] = []
    suggestions: Optional[List[str]] = []
    strengths: Optional[List[str]] = []
    weaknesses: Optional[List[str]] = []


class AnalysisCreate(AnalysisBase):
    resume_id: int
    job_description_id: int


class AnalysisResponse(AnalysisBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    resume_id: int
    job_description_id: int
    created_at: datetime
    
    # Related objects
    resume: Optional[ResumeResponse] = None
    job_description: Optional[JobDescriptionResponse] = None


# Interview Schemas
class InterviewSessionBase(BaseModel):
    session_type: str = Field(default="general", pattern="^(general|technical|behavioral)$")
    resume_id: Optional[int] = None


class InterviewSessionCreate(InterviewSessionBase):
    pass


class InterviewQuestionBase(BaseModel):
    question_text: str = Field(..., min_length=10)
    question_type: Optional[str] = Field(None, pattern="^(technical|behavioral|general)$")


class InterviewQuestionCreate(InterviewQuestionBase):
    session_id: int


class InterviewAnswerSubmit(BaseModel):
    question_id: int
    user_answer: str = Field(..., min_length=1)


class InterviewQuestionResponse(InterviewQuestionBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    session_id: int
    user_answer: Optional[str] = None
    ai_feedback: Optional[str] = None
    score: Optional[float] = Field(None, ge=0, le=10)
    asked_at: datetime
    answered_at: Optional[datetime] = None


class InterviewSessionResponse(InterviewSessionBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    status: str
    total_questions: int
    questions_answered: int
    overall_score: Optional[float] = Field(None, ge=0, le=10)
    feedback: Optional[Dict[str, Any]] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    
    # Related objects
    questions: List[InterviewQuestionResponse] = []


# Generic Response Schemas
class MessageResponse(BaseModel):
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
