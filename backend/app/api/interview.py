from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
import json
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.database import User, InterviewSession, InterviewQuestion, Resume
from app.schemas.schemas import (
    InterviewSessionCreate, 
    InterviewSessionResponse, 
    InterviewQuestionResponse,
    InterviewAnswerSubmit,
    MessageResponse
)
from app.services.interview_service import (
    generate_interview_questions,
    evaluate_answer,
    generate_final_feedback
)

router = APIRouter()


@router.post("/sessions", response_model=InterviewSessionResponse)
async def create_interview_session(
    session_data: InterviewSessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new interview session
    """
    # Validate resume if provided
    if session_data.resume_id:
        resume = db.query(Resume).filter(
            Resume.id == session_data.resume_id,
            Resume.user_id == current_user.id
        ).first()
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
    
    # Create interview session
    session = InterviewSession(
        user_id=current_user.id,
        resume_id=session_data.resume_id,
        session_type=session_data.session_type,
        status="active"
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Generate initial questions based on session type and resume
    try:
        resume_text = None
        if session_data.resume_id:
            resume = db.query(Resume).filter(Resume.id == session_data.resume_id).first()
            resume_text = resume.extracted_text if resume else None
        
        questions = await generate_interview_questions(
            session_type=session_data.session_type,
            resume_text=resume_text,
            num_questions=5
        )
        
        # Save questions to database
        for i, question_text in enumerate(questions):
            question = InterviewQuestion(
                session_id=session.id,
                question_text=question_text,
                question_type=session_data.session_type
            )
            db.add(question)
        
        session.total_questions = len(questions)
        db.commit()
        db.refresh(session)
        
        # Load questions for response
        session_questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.session_id == session.id
        ).all()
        
        return InterviewSessionResponse(
            id=session.id,
            user_id=session.user_id,
            resume_id=session.resume_id,
            session_type=session.session_type,
            status=session.status,
            total_questions=session.total_questions,
            questions_answered=session.questions_answered,
            overall_score=session.overall_score,
            feedback=json.loads(session.feedback) if session.feedback else None,
            started_at=session.started_at,
            completed_at=session.completed_at,
            questions=[
                InterviewQuestionResponse(
                    id=q.id,
                    session_id=q.session_id,
                    question_text=q.question_text,
                    question_type=q.question_type,
                    user_answer=q.user_answer,
                    ai_feedback=q.ai_feedback,
                    score=q.score,
                    asked_at=q.asked_at,
                    answered_at=q.answered_at
                ) for q in session_questions
            ]
        )
        
    except Exception as e:
        # Clean up session if question generation fails
        db.delete(session)
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate interview questions: {str(e)}"
        )


@router.get("/sessions", response_model=List[InterviewSessionResponse])
async def get_user_interview_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    limit: int = 10,
    offset: int = 0
):
    """
    Get all interview sessions for the current user
    """
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).offset(offset).limit(limit).all()
    
    result = []
    for session in sessions:
        questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.session_id == session.id
        ).all()
        
        result.append(InterviewSessionResponse(
            id=session.id,
            user_id=session.user_id,
            resume_id=session.resume_id,
            session_type=session.session_type,
            status=session.status,
            total_questions=session.total_questions,
            questions_answered=session.questions_answered,
            overall_score=session.overall_score,
            feedback=json.loads(session.feedback) if session.feedback else None,
            started_at=session.started_at,
            completed_at=session.completed_at,
            questions=[
                InterviewQuestionResponse(
                    id=q.id,
                    session_id=q.session_id,
                    question_text=q.question_text,
                    question_type=q.question_type,
                    user_answer=q.user_answer,
                    ai_feedback=q.ai_feedback,
                    score=q.score,
                    asked_at=q.asked_at,
                    answered_at=q.answered_at
                ) for q in questions
            ]
        ))
    
    return result


@router.get("/sessions/{session_id}", response_model=InterviewSessionResponse)
async def get_interview_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific interview session by ID
    """
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    questions = db.query(InterviewQuestion).filter(
        InterviewQuestion.session_id == session.id
    ).all()
    
    return InterviewSessionResponse(
        id=session.id,
        user_id=session.user_id,
        resume_id=session.resume_id,
        session_type=session.session_type,
        status=session.status,
        total_questions=session.total_questions,
        questions_answered=session.questions_answered,
        overall_score=session.overall_score,
        feedback=json.loads(session.feedback) if session.feedback else None,
        started_at=session.started_at,
        completed_at=session.completed_at,
        questions=[
            InterviewQuestionResponse(
                id=q.id,
                session_id=q.session_id,
                question_text=q.question_text,
                question_type=q.question_type,
                user_answer=q.user_answer,
                ai_feedback=q.ai_feedback,
                score=q.score,
                asked_at=q.asked_at,
                answered_at=q.answered_at
            ) for q in questions
        ]
    )


@router.post("/sessions/{session_id}/answer", response_model=InterviewQuestionResponse)
async def submit_answer(
    session_id: int,
    answer_data: InterviewAnswerSubmit,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Submit an answer to an interview question
    """
    # Verify session belongs to user
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "active"
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active interview session not found"
        )
    
    # Verify question belongs to session
    question = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == answer_data.question_id,
        InterviewQuestion.session_id == session_id
    ).first()
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found in this session"
        )
    
    if question.user_answer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question already answered"
        )
    
    try:
        # Evaluate the answer using AI
        evaluation = await evaluate_answer(
            question=question.question_text,
            answer=answer_data.user_answer,
            question_type=question.question_type
        )
        
        # Update question with answer and feedback
        question.user_answer = answer_data.user_answer
        question.ai_feedback = evaluation.get("feedback", "")
        question.score = evaluation.get("score", 0)
        question.answered_at = datetime.utcnow()
        
        # Update session progress
        session.questions_answered += 1
        
        # Check if session is complete
        if session.questions_answered >= session.total_questions:
            session.status = "completed"
            session.completed_at = datetime.utcnow()
            
            # Generate final feedback
            all_questions = db.query(InterviewQuestion).filter(
                InterviewQuestion.session_id == session_id
            ).all()
            
            final_feedback = await generate_final_feedback(all_questions)
            session.feedback = json.dumps(final_feedback)
            session.overall_score = final_feedback.get("overall_score", 0)
        
        db.commit()
        db.refresh(question)
        
        return InterviewQuestionResponse(
            id=question.id,
            session_id=question.session_id,
            question_text=question.question_text,
            question_type=question.question_type,
            user_answer=question.user_answer,
            ai_feedback=question.ai_feedback,
            score=question.score,
            asked_at=question.asked_at,
            answered_at=question.answered_at
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to evaluate answer: {str(e)}"
        )


@router.post("/sessions/{session_id}/complete", response_model=MessageResponse)
async def complete_interview_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Manually complete an interview session
    """
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "active"
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active interview session not found"
        )
    
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    
    # Generate final feedback for answered questions
    answered_questions = db.query(InterviewQuestion).filter(
        InterviewQuestion.session_id == session_id,
        InterviewQuestion.user_answer.isnot(None)
    ).all()
    
    if answered_questions:
        try:
            final_feedback = await generate_final_feedback(answered_questions)
            session.feedback = json.dumps(final_feedback)
            session.overall_score = final_feedback.get("overall_score", 0)
        except Exception as e:
            # If feedback generation fails, still complete the session
            session.feedback = json.dumps({"error": f"Failed to generate feedback: {str(e)}"})
    
    db.commit()
    
    return MessageResponse(message="Interview session completed successfully")


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def delete_interview_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete an interview session and all its questions
    """
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )
    
    db.delete(session)
    db.commit()
    
    return MessageResponse(message="Interview session deleted successfully")
