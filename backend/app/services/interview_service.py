import os
import json
from typing import List, Dict, Any, Optional
from app.core.config import settings

# Mock AI service - replace with actual Gemini/Groq implementation
class InterviewAIService:
    def __init__(self):
        self.api_key = settings.gemini_api_key or settings.groq_api_key
    
    async def generate_questions(
        self, 
        session_type: str, 
        resume_text: Optional[str] = None, 
        num_questions: int = 5
    ) -> List[str]:
        """
        Generate interview questions based on session type and resume
        """
        # Base questions by type
        question_templates = {
            "general": [
                "Tell me about yourself.",
                "Why are you interested in this position?",
                "What are your greatest strengths?",
                "What is your biggest weakness?",
                "Where do you see yourself in 5 years?",
                "Why should we hire you?",
                "Tell me about a challenging project you worked on.",
                "How do you handle stress and pressure?",
                "What motivates you at work?",
                "Do you have any questions for us?"
            ],
            "technical": [
                "Explain the difference between a list and a tuple in Python.",
                "What is the time complexity of binary search?",
                "How would you optimize a slow database query?",
                "Explain the concept of object-oriented programming.",
                "What is the difference between HTTP and HTTPS?",
                "How do you handle error handling in your code?",
                "Explain what APIs are and how they work.",
                "What is version control and why is it important?",
                "How would you approach debugging a complex issue?",
                "Explain the concept of cloud computing."
            ],
            "behavioral": [
                "Tell me about a time when you had to work with a difficult team member.",
                "Describe a situation where you had to meet a tight deadline.",
                "Give me an example of when you had to learn something new quickly.",
                "Tell me about a time when you made a mistake. How did you handle it?",
                "Describe a situation where you had to persuade others to see your point of view.",
                "Tell me about a time when you received constructive feedback.",
                "Give me an example of when you had to adapt to change.",
                "Describe a situation where you went above and beyond your job responsibilities.",
                "Tell me about a time when you had to resolve a conflict.",
                "Give me an example of when you showed leadership skills."
            ]
        }
        
        base_questions = question_templates.get(session_type, question_templates["general"])
        
        # If resume is provided, try to generate more personalized questions
        if resume_text and len(resume_text) > 100:
            # Extract skills and experience from resume (simplified)
            personalized_questions = await self._generate_personalized_questions(
                resume_text, session_type, num_questions // 2
            )
            
            # Combine personalized and base questions
            selected_questions = personalized_questions + base_questions[:num_questions - len(personalized_questions)]
        else:
            selected_questions = base_questions[:num_questions]
        
        return selected_questions[:num_questions]
    
    async def _generate_personalized_questions(
        self, 
        resume_text: str, 
        session_type: str, 
        num_questions: int
    ) -> List[str]:
        """
        Generate personalized questions based on resume content
        This is a simplified version - in production, use actual AI API
        """
        # Simple keyword extraction for demo
        resume_lower = resume_text.lower()
        
        personalized = []
        
        # Technical questions based on resume keywords
        if session_type == "technical":
            if "python" in resume_lower:
                personalized.append("I see you have Python experience. Can you walk me through a challenging Python project you've worked on?")
            if "javascript" in resume_lower or "react" in resume_lower:
                personalized.append("Tell me about your experience with frontend development and JavaScript frameworks.")
            if "database" in resume_lower or "sql" in resume_lower:
                personalized.append("Describe your experience with database design and optimization.")
            if "api" in resume_lower:
                personalized.append("Can you explain how you've designed and implemented APIs in your previous work?")
        
        # Behavioral questions based on experience
        elif session_type == "behavioral":
            if "manager" in resume_lower or "lead" in resume_lower:
                personalized.append("I see you have leadership experience. Tell me about a time when you had to manage a team through a difficult project.")
            if "startup" in resume_lower:
                personalized.append("You've worked at a startup. How did you handle the fast-paced, changing environment?")
            if "remote" in resume_lower:
                personalized.append("Tell me about your experience working remotely and how you stay productive.")
        
        # General questions based on career progression
        else:
            if "internship" in resume_lower:
                personalized.append("I see you completed an internship. What was the most valuable thing you learned during that experience?")
            if "volunteer" in resume_lower:
                personalized.append("Tell me about your volunteer work and how it has shaped your professional goals.")
        
        return personalized[:num_questions]
    
    async def evaluate_answer(
        self, 
        question: str, 
        answer: str, 
        question_type: str
    ) -> Dict[str, Any]:
        """
        Evaluate an interview answer and provide feedback
        This is a simplified version - in production, use actual AI API
        """
        # Simple evaluation based on answer length and keywords
        answer_length = len(answer.strip())
        
        if answer_length < 20:
            score = 2.0
            feedback = "Your answer is quite brief. Try to provide more detail and specific examples to better demonstrate your experience and thought process."
        elif answer_length < 100:
            score = 5.0
            feedback = "Good start! Consider adding more specific examples or details to make your answer more compelling and comprehensive."
        elif answer_length < 300:
            score = 7.0
            feedback = "Well-structured answer with good detail. You've addressed the question effectively with relevant information."
        else:
            score = 8.5
            feedback = "Excellent comprehensive answer! You've provided detailed information with good structure and relevant examples."
        
        # Adjust score based on question type and content
        answer_lower = answer.lower()
        
        if question_type == "technical":
            # Look for technical keywords
            tech_keywords = ["implement", "algorithm", "optimize", "code", "system", "database", "api"]
            if any(keyword in answer_lower for keyword in tech_keywords):
                score += 0.5
                feedback += " Good use of technical terminology."
            
        elif question_type == "behavioral":
            # Look for STAR method indicators
            star_keywords = ["situation", "task", "action", "result", "challenge", "solution"]
            if any(keyword in answer_lower for keyword in star_keywords):
                score += 0.5
                feedback += " Good structure using specific examples."
        
        # Cap score at 10
        score = min(score, 10.0)
        
        return {
            "score": round(score, 1),
            "feedback": feedback,
            "strengths": self._identify_strengths(answer, question_type),
            "improvements": self._suggest_improvements(answer, question_type, score)
        }
    
    def _identify_strengths(self, answer: str, question_type: str) -> List[str]:
        """Identify strengths in the answer"""
        strengths = []
        answer_lower = answer.lower()
        
        if len(answer) > 200:
            strengths.append("Comprehensive response with good detail")
        
        if any(word in answer_lower for word in ["example", "instance", "experience", "time when"]):
            strengths.append("Used specific examples to illustrate points")
        
        if question_type == "behavioral" and any(word in answer_lower for word in ["learned", "improved", "result", "outcome"]):
            strengths.append("Demonstrated learning and results-oriented thinking")
        
        if question_type == "technical" and any(word in answer_lower for word in ["optimize", "efficient", "scalable"]):
            strengths.append("Showed understanding of technical best practices")
        
        return strengths[:3]  # Limit to top 3 strengths
    
    def _suggest_improvements(self, answer: str, question_type: str, score: float) -> List[str]:
        """Suggest improvements for the answer"""
        improvements = []
        answer_lower = answer.lower()
        
        if len(answer) < 100:
            improvements.append("Provide more detailed explanations and examples")
        
        if question_type == "behavioral" and not any(word in answer_lower for word in ["situation", "result", "outcome"]):
            improvements.append("Use the STAR method (Situation, Task, Action, Result) to structure your response")
        
        if question_type == "technical" and score < 7:
            improvements.append("Include more technical details and explain your reasoning")
        
        if "um" in answer_lower or "uh" in answer_lower:
            improvements.append("Practice speaking more confidently with fewer filler words")
        
        return improvements[:3]  # Limit to top 3 improvements


# Initialize the service
ai_service = InterviewAIService()


async def generate_interview_questions(
    session_type: str, 
    resume_text: Optional[str] = None, 
    num_questions: int = 5
) -> List[str]:
    """Generate interview questions"""
    return await ai_service.generate_questions(session_type, resume_text, num_questions)


async def evaluate_answer(
    question: str, 
    answer: str, 
    question_type: str
) -> Dict[str, Any]:
    """Evaluate an interview answer"""
    return await ai_service.evaluate_answer(question, answer, question_type)


async def generate_final_feedback(questions: List) -> Dict[str, Any]:
    """Generate final interview feedback based on all questions and answers"""
    answered_questions = [q for q in questions if q.user_answer]
    
    if not answered_questions:
        return {
            "overall_score": 0,
            "summary": "No questions were answered.",
            "strengths": [],
            "areas_for_improvement": [],
            "recommendations": []
        }
    
    # Calculate overall score
    total_score = sum(q.score or 0 for q in answered_questions)
    overall_score = round(total_score / len(answered_questions), 1)
    
    # Generate summary
    if overall_score >= 8:
        performance_level = "Excellent"
        summary = "Outstanding interview performance with strong, well-articulated responses."
    elif overall_score >= 6:
        performance_level = "Good"
        summary = "Solid interview performance with room for minor improvements."
    elif overall_score >= 4:
        performance_level = "Fair"
        summary = "Adequate performance with several areas for improvement."
    else:
        performance_level = "Needs Improvement"
        summary = "Performance indicates significant preparation needed for future interviews."
    
    # Aggregate strengths and improvements
    all_strengths = []
    all_improvements = []
    
    for question in answered_questions:
        if question.ai_feedback:
            # Extract strengths and improvements from feedback (simplified)
            feedback_lower = question.ai_feedback.lower()
            if "good" in feedback_lower or "well" in feedback_lower or "excellent" in feedback_lower:
                all_strengths.append(f"Strong response to: {question.question_text[:50]}...")
            if "improve" in feedback_lower or "consider" in feedback_lower or "try" in feedback_lower:
                all_improvements.append(f"Could improve response to: {question.question_text[:50]}...")
    
    # Generate recommendations
    recommendations = [
        "Practice the STAR method for behavioral questions",
        "Prepare specific examples from your experience",
        "Research the company and role thoroughly",
        "Practice technical explanations in simple terms",
        "Prepare thoughtful questions to ask the interviewer"
    ]
    
    return {
        "overall_score": overall_score,
        "performance_level": performance_level,
        "summary": summary,
        "questions_answered": len(answered_questions),
        "total_questions": len(questions),
        "strengths": all_strengths[:5],
        "areas_for_improvement": all_improvements[:5],
        "recommendations": recommendations[:3]
    }
