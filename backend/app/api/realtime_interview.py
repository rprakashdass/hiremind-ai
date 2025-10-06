from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from typing import Dict, Any
import json
import uuid
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.database import User, InterviewSession
from app.schemas.schemas import MessageResponse
from app.services.realtime_interview_service import realtime_interview_manager

router = APIRouter()


@router.post("/realtime/create", response_model=Dict[str, str])
async def create_realtime_interview_session(
    session_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new real-time interview session and return WebSocket token
    """
    # Create regular interview session first
    session = InterviewSession(
        user_id=current_user.id,
        resume_id=session_data.get("resume_id"),
        session_type=session_data.get("session_type", "general"),
        status="active"
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Create real-time session
    session_token = await realtime_interview_manager.create_session(
        session_id=session.id,
        user_id=current_user.id,
        session_type=session_data.get("session_type", "general"),
        resume_text=session_data.get("resume_text")
    )
    
    return {
        "session_token": session_token,
        "session_id": str(session.id),
        "websocket_url": f"/api/interview/realtime/ws/{session_token}"
    }


@router.websocket("/realtime/ws/{session_token}")
async def websocket_interview_endpoint(websocket: WebSocket, session_token: str):
    """
    WebSocket endpoint for real-time interview communication
    """
    await websocket.accept()
    
    try:
        # Validate session token
        session = realtime_interview_manager.get_session(session_token)
        if not session:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Invalid session token"
            }))
            await websocket.close()
            return
        
        # Handle the WebSocket connection
        await realtime_interview_manager.handle_websocket_connection(websocket, session_token)
        
    except WebSocketDisconnect:
        print(f"Client disconnected from session {session_token}")
    except Exception as e:
        print(f"Error in WebSocket endpoint: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "Connection error occurred"
        }))
    finally:
        # Cleanup on disconnect
        pass


@router.get("/realtime/session/{session_token}", response_model=Dict[str, Any])
async def get_realtime_session_status(session_token: str):
    """
    Get current status of a real-time interview session
    """
    session = realtime_interview_manager.get_session(session_token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return {
        "status": session["status"],
        "current_question_index": session["current_question_index"],
        "total_questions": len(session["questions"]),
        "conversation_length": len(session["conversation_history"]),
        "started_at": session["started_at"].isoformat() if session["started_at"] else None
    }


@router.post("/realtime/end/{session_token}", response_model=MessageResponse)
async def end_realtime_interview_session(session_token: str):
    """
    End a real-time interview session
    """
    session = realtime_interview_manager.get_session(session_token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    await realtime_interview_manager.end_interview(session_token)
    
    return MessageResponse(message="Interview session ended successfully")


@router.get("/realtime/test")
async def get_test_page():
    """
    Get a test page for WebSocket connection (development only)
    """
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Real-time Interview Test</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .chat-container { border: 1px solid #ccc; height: 400px; overflow-y: scroll; padding: 10px; margin: 10px 0; }
            .message { margin: 10px 0; padding: 8px; border-radius: 5px; }
            .user-message { background-color: #e3f2fd; text-align: right; }
            .ai-message { background-color: #f5f5f5; }
            .controls { margin: 10px 0; }
            input[type="text"] { width: 70%; padding: 8px; }
            button { padding: 8px 16px; margin: 0 5px; }
            .status { font-weight: bold; color: #666; }
        </style>
    </head>
    <body>
        <h1>Real-time Interview Test</h1>
        
        <div>
            <label>Session Token: </label>
            <input type="text" id="sessionToken" placeholder="Enter session token">
            <button onclick="connect()">Connect</button>
            <button onclick="disconnect()">Disconnect</button>
        </div>
        
        <div class="status" id="status">Disconnected</div>
        
        <div class="chat-container" id="chatContainer"></div>
        
        <div class="controls">
            <input type="text" id="messageInput" placeholder="Type your message here..." onkeypress="handleKeyPress(event)">
            <button onclick="sendMessage()">Send</button>
            <button onclick="requestNextQuestion()">Next Question</button>
            <button onclick="endInterview()">End Interview</button>
        </div>
        
        <script>
            let ws = null;
            
            function connect() {
                const token = document.getElementById('sessionToken').value;
                if (!token) {
                    alert('Please enter a session token');
                    return;
                }
                
                ws = new WebSocket(`ws://localhost:8000/api/interview/realtime/ws/${token}`);
                
                ws.onopen = function(event) {
                    document.getElementById('status').textContent = 'Connected';
                    document.getElementById('status').style.color = 'green';
                    
                    // Send connection ready message
                    ws.send(JSON.stringify({
                        type: 'connection_ready'
                    }));
                };
                
                ws.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    handleMessage(data);
                };
                
                ws.onclose = function(event) {
                    document.getElementById('status').textContent = 'Disconnected';
                    document.getElementById('status').style.color = 'red';
                };
                
                ws.onerror = function(error) {
                    console.error('WebSocket error:', error);
                    document.getElementById('status').textContent = 'Error';
                    document.getElementById('status').style.color = 'red';
                };
            }
            
            function disconnect() {
                if (ws) {
                    ws.close();
                    ws = null;
                }
            }
            
            function handleMessage(data) {
                const chatContainer = document.getElementById('chatContainer');
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message';
                
                switch(data.type) {
                    case 'ai_message':
                        messageDiv.className += ' ai-message';
                        messageDiv.innerHTML = `<strong>AI:</strong> ${data.content}`;
                        break;
                    case 'typing_indicator':
                        if (data.is_typing) {
                            messageDiv.className += ' ai-message';
                            messageDiv.innerHTML = '<strong>AI:</strong> <em>typing...</em>';
                            messageDiv.id = 'typing-indicator';
                        } else {
                            const typingIndicator = document.getElementById('typing-indicator');
                            if (typingIndicator) {
                                typingIndicator.remove();
                            }
                            return;
                        }
                        break;
                    case 'session_status':
                        messageDiv.innerHTML = `<strong>System:</strong> ${data.message}`;
                        break;
                    case 'interview_completed':
                        messageDiv.innerHTML = `<strong>System:</strong> ${data.message}`;
                        if (data.feedback) {
                            messageDiv.innerHTML += `<br><strong>Feedback:</strong> Score: ${data.feedback.overall_score}/10`;
                        }
                        break;
                    case 'error':
                        messageDiv.innerHTML = `<strong>Error:</strong> ${data.message}`;
                        messageDiv.style.color = 'red';
                        break;
                    default:
                        messageDiv.innerHTML = `<strong>Unknown:</strong> ${JSON.stringify(data)}`;
                }
                
                chatContainer.appendChild(messageDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
            
            function sendMessage() {
                const input = document.getElementById('messageInput');
                const message = input.value.trim();
                
                if (!message || !ws) return;
                
                // Display user message
                const chatContainer = document.getElementById('chatContainer');
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message user-message';
                messageDiv.innerHTML = `<strong>You:</strong> ${message}`;
                chatContainer.appendChild(messageDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;
                
                // Send to AI
                ws.send(JSON.stringify({
                    type: 'user_text',
                    text: message
                }));
                
                input.value = '';
            }
            
            function requestNextQuestion() {
                if (ws) {
                    ws.send(JSON.stringify({
                        type: 'request_next_question'
                    }));
                }
            }
            
            function endInterview() {
                if (ws) {
                    ws.send(JSON.stringify({
                        type: 'end_interview'
                    }));
                }
            }
            
            function handleKeyPress(event) {
                if (event.key === 'Enter') {
                    sendMessage();
                }
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
