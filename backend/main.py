from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, engine
from app.models.database import Base
from app.api import auth, ats, resumes, career_coach, interview, realtime_interview

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="A comprehensive career preparation platform with AI-powered features",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Health check endpoint
@app.get("/")
def read_root():
    return {
        "message": f"Welcome to {settings.app_name} API",
        "version": "2.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint to verify API and database connectivity"""
    try:
        # Test database connection
        db.execute("SELECT 1")
        return {
            "status": "healthy",
            "database": "connected",
            "api": "operational"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(ats.router, prefix="/api/ats", tags=["ATS Analysis"])
app.include_router(interview.router, prefix="/api/interview", tags=["Interview"])
app.include_router(realtime_interview.router, prefix="/api/interview", tags=["Realtime Interview"])
app.include_router(resumes.router, prefix="/api/resumes", tags=["Resumes"])
app.include_router(career_coach.router, prefix="/api/career-coach", tags=["Career Coach"])

# Global exception handler
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_code": "HTTP_ERROR"}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation Error",
            "errors": exc.errors(),
            "error_code": "VALIDATION_ERROR"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
