from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import openai
import os

router = APIRouter()

# Make sure to set your OpenAI API key in your environment variables
openai.api_key = os.getenv("OPENAI_API_KEY")

class CareerCoachRequest(BaseModel):
    resumeText: str
    jobDescription: str
    userMessage: str

@router.post("/")
async def get_career_advice(request: CareerCoachRequest):
    """
    Provides career advice based on a user's resume, a job description, and a specific question.
    """
    if not openai.api_key:
        # This is a fallback for local development if the key isn't set.
        # In a production environment, you should handle this more securely.
        try:
            from dotenv import load_dotenv
            load_dotenv()
            openai.api_key = os.getenv("OPENAI_API_KEY")
            if not openai.api_key:
                raise ValueError("OPENAI_API_KEY not found")
        except (ImportError, ValueError) as e:
            raise HTTPException(status_code=500, detail=f"OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable. Error: {e}")

    system_prompt = f"""
    You are an expert AI Career Coach. You will be given a user's resume and a job description as context.
    Your task is to provide clear, constructive, and actionable advice to help the user achieve their career goals.
    Analyze the resume in relation to the job description and answer the user's specific question.

    Resume Context:
    ---
    {request.resumeText}
    ---

    Job Description Context:
    ---
    {request.jobDescription}
    ---
    """

    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.userMessage},
            ],
            temperature=0.7,
            max_tokens=1000,
            top_p=1.0,
            frequency_penalty=0.0,
            presence_penalty=0.0,
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        return {"response": ai_response}

    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred while communicating with the AI model: {str(e)}")

