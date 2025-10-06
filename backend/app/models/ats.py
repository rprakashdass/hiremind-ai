from pydantic import BaseModel
from typing import List

class AtsAnalysisResult(BaseModel):
    """Defines the structure for the ATS analysis result."""
    score: float
    matching_keywords: List[str]
    missing_keywords: List[str]
    suggestions: str

class AtsAnalysisResponse(BaseModel):
    """Defines the response model for an ATS analysis request."""
    filename: str
    analysis: AtsAnalysisResult
