import asyncio
import json
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime
import aiohttp
import websockets
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.database import InterviewSession, InterviewQuestion, User
from app.services.interview_service import ai_service


class RealTimeInterviewManager:
    """Manages real-time interview sessions with WebSocket connections"""
    
    def __init__(self):
        self.active_sessions: Dict[str, "InterviewSession"] = {}
        self.websocket_connections: Dict[str, Any] = {}
        
    async def create_session(
        self, 
        session_id: int, 
        user_id: int, 
        session_type: str,
        resume_text: Optional[str] = None
    ) -> str:
        """Create a new real-time interview session"""
        session_token = str(uuid.uuid4())
        
        session_data = {
            "session_id": session_id,
            "user_id": user_id,
            "session_type": session_type,
            "resume_text": resume_text,
            "started_at": datetime.utcnow(),
            "current_question_index": 0,
            "questions": [],
            "conversation_history": [],
            "is_ai_speaking": False,
            "is_user_speaking": False,
            "audio_buffer": [],
            "status": "waiting_for_connection"
        }
        
        self.active_sessions[session_token] = session_data
        
        # Generate initial questions
        questions = await ai_service.generate_questions(
            session_type=session_type,
            resume_text=resume_text,
            num_questions=8  # More questions for dynamic interview
        )
        
        session_data["questions"] = questions
        session_data["status"] = "ready"
        
        return session_token
        
    async def handle_websocket_connection(self, websocket, session_token: str):
        """Handle WebSocket connection for real-time interview"""
        if session_token not in self.active_sessions:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Invalid session token"
            }))
            return
            
        session = self.active_sessions[session_token]
        self.websocket_connections[session_token] = websocket
        
        try:
            # Send welcome message
            await self.send_ai_message(
                session_token,
                "Hello! I'm your AI interviewer. I'm excited to chat with you today. Let's start with an introduction - could you tell me a bit about yourself?"
            )
            
            # Handle incoming messages
            async for message in websocket:
                data = json.loads(message)
                await self.handle_message(session_token, data)
                
        except websockets.exceptions.ConnectionClosed:
            print(f"WebSocket connection closed for session {session_token}")
        except Exception as e:
            print(f"Error in WebSocket connection: {e}")
        finally:
            # Cleanup
            if session_token in self.websocket_connections:
                del self.websocket_connections[session_token]
                
    async def handle_message(self, session_token: str, data: Dict[str, Any]):
        """Handle incoming WebSocket messages"""
        message_type = data.get("type")
        session = self.active_sessions[session_token]
        
        if message_type == "user_audio":
            await self.handle_user_audio(session_token, data)
        elif message_type == "user_text":
            await self.handle_user_text(session_token, data)
        elif message_type == "connection_ready":
            await self.handle_connection_ready(session_token)
        elif message_type == "request_next_question":
            await self.ask_next_question(session_token)
        elif message_type == "end_interview":
            await self.end_interview(session_token)
            
    async def handle_user_audio(self, session_token: str, data: Dict[str, Any]):
        """Handle user audio input and convert to text"""
        session = self.active_sessions[session_token]
        
        # In production, use a speech-to-text service like Google Speech-to-Text
        # For now, we'll simulate this
        audio_data = data.get("audio_data")
        
        # Simulate transcription (replace with actual STT service)
        transcribed_text = data.get("transcribed_text", "")
        
        if transcribed_text:
            await self.handle_user_text(session_token, {
                "text": transcribed_text,
                "is_final": data.get("is_final", False)
            })
            
    async def handle_user_text(self, session_token: str, data: Dict[str, Any]):
        """Handle user text input"""
        session = self.active_sessions[session_token]
        user_text = data.get("text", "").strip()
        
        if not user_text or len(user_text) < 5:
            return
            
        # Add to conversation history
        session["conversation_history"].append({
            "role": "user",
            "content": user_text,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Show typing indicator
        await self.send_typing_indicator(session_token, True)
        
        # Generate AI response
        ai_response = await self.generate_ai_response(session_token, user_text)
        
        # Hide typing indicator
        await self.send_typing_indicator(session_token, False)
        
        # Send AI response
        await self.send_ai_message(session_token, ai_response)
        
    async def handle_connection_ready(self, session_token: str):
        """Handle when user connection is ready"""
        session = self.active_sessions[session_token]
        session["status"] = "active"
        
        await self.send_message(session_token, {
            "type": "session_status",
            "status": "active",
            "message": "Connection established. Interview starting..."
        })
        
    async def generate_ai_response(self, session_token: str, user_input: str) -> str:
        """Generate AI interviewer response"""
        session = self.active_sessions[session_token]
        session_type = session["session_type"]
        current_question_index = session["current_question_index"]
        questions = session["questions"]
        conversation_history = session["conversation_history"]
        
        # Analyze user response quality
        if len(conversation_history) > 1:  # Not the first message
            last_question = None
            for msg in reversed(conversation_history[:-1]):
                if msg["role"] == "assistant":
                    last_question = msg["content"]
                    break
                    
            if last_question:
                # Evaluate the answer
                evaluation = await ai_service.evaluate_answer(
                    question=last_question,
                    answer=user_input,
                    question_type=session_type
                )
                
                # Store evaluation (you might want to save this to database)
                session["conversation_history"][-1]["evaluation"] = evaluation
        
        # Determine response strategy
        conversation_length = len([msg for msg in conversation_history if msg["role"] == "user"])
        
        if conversation_length == 1:
            # First response - acknowledge introduction and ask first real question
            if current_question_index < len(questions):
                question = questions[current_question_index]
                session["current_question_index"] += 1
                
                response = f"Thank you for that introduction! {question}"
            else:
                response = "Thank you for sharing. Let's dive into some questions."
        elif conversation_length <= len(questions):
            # Continue with prepared questions, adding follow-ups
            response = await self.generate_contextual_response(session_token, user_input)
        else:
            # Wrap up interview
            response = "Thank you for your thoughtful responses! That concludes our interview. Do you have any questions for me about the role or company?"
            
        # Add AI response to conversation history
        session["conversation_history"].append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return response
        
    async def generate_contextual_response(self, session_token: str, user_input: str) -> str:
        """Generate contextual follow-up or next question"""
        session = self.active_sessions[session_token]
        current_question_index = session["current_question_index"]
        questions = session["questions"]
        session_type = session["session_type"]
        
        # Analyze if we need a follow-up or can move to next question
        should_follow_up = await self.should_ask_followup(user_input, session_type)
        
        if should_follow_up and len(user_input) < 200:
            # Ask for more detail
            follow_ups = [
                "That's interesting! Could you elaborate on that a bit more?",
                "Can you give me a specific example of that?",
                "What was the outcome of that situation?",
                "How did you handle the challenges in that scenario?",
                "What did you learn from that experience?"
            ]
            
            # Choose appropriate follow-up based on context
            import random
            response = random.choice(follow_ups)
            
        elif current_question_index < len(questions):
            # Move to next prepared question
            question = questions[current_question_index]
            session["current_question_index"] += 1
            
            # Add transition phrase
            transitions = [
                "Great answer! Let's move on to the next question. ",
                "Thank you for sharing that. Now, ",
                "Excellent! I'd also like to know: ",
                "That's very insightful. Here's another question: "
            ]
            
            import random
            transition = random.choice(transitions)
            response = f"{transition}{question}"
            
        else:
            # Interview completion
            response = "Wonderful! Those were all my prepared questions. Is there anything else you'd like to share about your experience or qualifications? Or do you have any questions for me?"
            
        return response
        
    async def should_ask_followup(self, user_input: str, session_type: str) -> bool:
        """Determine if a follow-up question is needed"""
        # Simple heuristics - in production, use more sophisticated analysis
        if len(user_input) < 100:
            return True
            
        # Look for vague responses
        vague_indicators = ["kind of", "sort of", "maybe", "probably", "i guess", "not sure"]
        if any(indicator in user_input.lower() for indicator in vague_indicators):
            return True
            
        # For behavioral questions, check for STAR method
        if session_type == "behavioral":
            star_indicators = ["situation", "task", "action", "result"]
            if sum(1 for indicator in star_indicators if indicator in user_input.lower()) < 2:
                return True
                
        return False
        
    async def ask_next_question(self, session_token: str):
        """Ask the next prepared question"""
        session = self.active_sessions[session_token]
        current_question_index = session["current_question_index"]
        questions = session["questions"]
        
        if current_question_index < len(questions):
            question = questions[current_question_index]
            session["current_question_index"] += 1
            await self.send_ai_message(session_token, question)
        else:
            await self.send_ai_message(
                session_token, 
                "We've covered all the main questions. Do you have any questions for me?"
            )
            
    async def send_ai_message(self, session_token: str, message: str):
        """Send AI message to user"""
        await self.send_message(session_token, {
            "type": "ai_message",
            "content": message,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # In production, convert text to speech and send audio
        # For now, we'll just send the text
        
    async def send_typing_indicator(self, session_token: str, is_typing: bool):
        """Send typing indicator"""
        await self.send_message(session_token, {
            "type": "typing_indicator",
            "is_typing": is_typing
        })
        
    async def send_message(self, session_token: str, message: Dict[str, Any]):
        """Send message through WebSocket"""
        if session_token in self.websocket_connections:
            websocket = self.websocket_connections[session_token]
            try:
                await websocket.send(json.dumps(message))
            except websockets.exceptions.ConnectionClosed:
                # Remove closed connection
                if session_token in self.websocket_connections:
                    del self.websocket_connections[session_token]
                    
    async def end_interview(self, session_token: str):
        """End the interview session"""
        session = self.active_sessions[session_token]
        session["status"] = "completed"
        session["completed_at"] = datetime.utcnow()
        
        # Generate final feedback
        feedback = await self.generate_final_feedback(session_token)
        
        await self.send_message(session_token, {
            "type": "interview_completed",
            "feedback": feedback,
            "message": "Thank you for your time! The interview has been completed."
        })
        
    async def generate_final_feedback(self, session_token: str) -> Dict[str, Any]:
        """Generate comprehensive final feedback"""
        session = self.active_sessions[session_token]
        conversation_history = session["conversation_history"]
        
        user_responses = [msg for msg in conversation_history if msg["role"] == "user"]
        
        if not user_responses:
            return {
                "overall_score": 0,
                "summary": "No responses provided",
                "strengths": [],
                "improvements": []
            }
        
        # Calculate average score from evaluations
        evaluations = [msg.get("evaluation", {}) for msg in user_responses if msg.get("evaluation")]
        
        if evaluations:
            avg_score = sum(eval.get("score", 0) for eval in evaluations) / len(evaluations)
        else:
            avg_score = 5.0  # Default score
            
        # Generate comprehensive feedback
        strengths = []
        improvements = []
        
        for eval in evaluations:
            if eval.get("strengths"):
                strengths.extend(eval["strengths"])
            if eval.get("improvements"):
                improvements.extend(eval["improvements"])
        
        # Remove duplicates and limit
        strengths = list(set(strengths))[:5]
        improvements = list(set(improvements))[:5]
        
        return {
            "overall_score": round(avg_score, 1),
            "summary": f"Completed interview with {len(user_responses)} responses",
            "strengths": strengths,
            "improvements": improvements,
            "total_responses": len(user_responses),
            "conversation_duration": (
                datetime.utcnow() - session["started_at"]
            ).total_seconds() / 60  # Duration in minutes
        }
        
    def get_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Get session data"""
        return self.active_sessions.get(session_token)
        
    def cleanup_session(self, session_token: str):
        """Clean up session data"""
        if session_token in self.active_sessions:
            del self.active_sessions[session_token]
        if session_token in self.websocket_connections:
            del self.websocket_connections[session_token]


# Global instance
realtime_interview_manager = RealTimeInterviewManager()
