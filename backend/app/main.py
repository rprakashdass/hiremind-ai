from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import resumes, ats, auth, interview, realtime_interview

app = FastAPI(
    title="HireMe AI",
    description="AI-powered recruitment assistant",
    version="0.1.0"
)

# Set up CORS
origins = [
    "http://localhost:3000",
    "http://localhost:3001",  # For development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(resumes.router, prefix="/api/resumes", tags=["resumes"])
app.include_router(ats.router, prefix="/api/ats", tags=["ats"])
app.include_router(interview.router, prefix="/api/interview", tags=["interview"])
app.include_router(realtime_interview.router, prefix="/api/interview", tags=["realtime-interview"])

@app.get("/")
async def read_root():
    """A simple endpoint to check if the server is running."""
    return {"message": "Welcome to HireMe AI"}
