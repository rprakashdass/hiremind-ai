from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends, status
from typing import Annotated, List
from sqlalchemy.orm import Session
import os
import uuid
import json
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.database import User, Resume, JobDescription, AnalysisResult
from app.schemas.schemas import AnalysisResponse, JobDescriptionCreate, ResumeResponse
from app.services.resume_parser import parse_resume
from app.services.ats_analyzer import analyze_resume_against_job

router = APIRouter()

# File upload configuration
UPLOAD_DIRECTORY = "uploads/resumes"
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Ensure upload directory exists
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_resume_for_ats(
    file: Annotated[UploadFile, File(description="The resume file (PDF or DOCX).")],
    job_title: Annotated[str, Form(description="The job title.")],
    job_description: Annotated[str, Form(description="The job description text.")],
    company: Annotated[str, Form(description="The company name.")] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Analyzes a resume against a job description to provide an ATS-like score and feedback.
    Stores the analysis results in the database for the authenticated user.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No resume file provided.")
    if not job_description:
        raise HTTPException(status_code=400, detail="No job description provided.")
    
    # Validate file
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    file_extension = os.path.splitext(file.filename.lower())[1]
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not supported. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    try:
        # Step 1: Parse the resume text FIRST (before reading for file save)
        resume_text = await parse_resume(file)
        
        # Step 2: Reset file position and save file to disk
        await file.seek(0)  # Reset file pointer to beginning
        file_id = str(uuid.uuid4())
        filename = f"{file_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIRECTORY, filename)
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Step 3: Save resume to database
        resume = Resume(
            user_id=current_user.id,
            filename=filename,
            original_filename=file.filename,
            file_path=file_path,
            extracted_text=resume_text,
            file_size=file.size,
            mime_type=file.content_type
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
        
        # Step 4: Save job description to database
        job_desc = JobDescription(
            title=job_title,
            company=company,
            description_text=job_description
        )
        db.add(job_desc)
        db.commit()
        db.refresh(job_desc)
        
        # Step 5: Analyze the resume against job description
        analysis_results = analyze_resume_against_job(resume_text, job_description)
        
        # Step 6: Save analysis results to database
        analysis = AnalysisResult(
            user_id=current_user.id,
            resume_id=resume.id,
            job_description_id=job_desc.id,
            ats_score=analysis_results.get("ats_score"),
            keyword_matches=json.dumps(analysis_results.get("matched_keywords", [])),
            missing_keywords=json.dumps(analysis_results.get("missing_keywords", [])),
            suggestions=json.dumps(analysis_results.get("suggestions", [])),
            strengths=json.dumps(analysis_results.get("strengths", [])),
            weaknesses=json.dumps(analysis_results.get("weaknesses", []))
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        
        # Step 7: Format and return response
        return AnalysisResponse(
            id=analysis.id,
            user_id=current_user.id,
            resume_id=resume.id,
            job_description_id=job_desc.id,
            ats_score=analysis.ats_score,
            keyword_matches=json.loads(analysis.keyword_matches or "[]"),
            missing_keywords=json.loads(analysis.missing_keywords or "[]"),
            suggestions=json.loads(analysis.suggestions or "[]"),
            strengths=json.loads(analysis.strengths or "[]"),
            weaknesses=json.loads(analysis.weaknesses or "[]"),
            created_at=analysis.created_at
        )

    except Exception as e:
        # Clean up file if analysis fails
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )


@router.get("/analyses", response_model=List[AnalysisResponse])
async def get_user_analyses(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    limit: int = 10,
    offset: int = 0
):
    """
    Get all ATS analyses for the current user
    """
    analyses = db.query(AnalysisResult).filter(
        AnalysisResult.user_id == current_user.id
    ).offset(offset).limit(limit).all()
    
    result = []
    for analysis in analyses:
        result.append(AnalysisResponse(
            id=analysis.id,
            user_id=analysis.user_id,
            resume_id=analysis.resume_id,
            job_description_id=analysis.job_description_id,
            ats_score=analysis.ats_score,
            keyword_matches=json.loads(analysis.keyword_matches or "[]"),
            missing_keywords=json.loads(analysis.missing_keywords or "[]"),
            suggestions=json.loads(analysis.suggestions or "[]"),
            strengths=json.loads(analysis.strengths or "[]"),
            weaknesses=json.loads(analysis.weaknesses or "[]"),
            created_at=analysis.created_at
        ))
    
    return result


@router.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis_by_id(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific analysis by ID (must belong to current user)
    """
    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.id == analysis_id,
        AnalysisResult.user_id == current_user.id
    ).first()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    return AnalysisResponse(
        id=analysis.id,
        user_id=analysis.user_id,
        resume_id=analysis.resume_id,
        job_description_id=analysis.job_description_id,
        ats_score=analysis.ats_score,
        keyword_matches=json.loads(analysis.keyword_matches or "[]"),
        missing_keywords=json.loads(analysis.missing_keywords or "[]"),
        suggestions=json.loads(analysis.suggestions or "[]"),
        strengths=json.loads(analysis.strengths or "[]"),
        weaknesses=json.loads(analysis.weaknesses or "[]"),
        created_at=analysis.created_at
    )


@router.delete("/analyses/{analysis_id}")
async def delete_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a specific analysis by ID (must belong to current user)
    """
    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.id == analysis_id,
        AnalysisResult.user_id == current_user.id
    ).first()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    db.delete(analysis)
    db.commit()
    
    return {"message": "Analysis deleted successfully"}


@router.get("/resumes", response_model=List[ResumeResponse])
async def get_user_resumes(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all resumes for the current user
    """
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
    return resumes
