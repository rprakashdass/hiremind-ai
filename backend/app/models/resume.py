from pydantic import BaseModel
from typing import List

class ResumeData(BaseModel):
    """Schema for the parsed resume data."""
    text: str
    # We can add more structured fields later, like:
    # name: str
    # email: str
    # phone: str
    # skills: List[str]

class UploadResponse(BaseModel):
    """Response schema after a resume is successfully uploaded and parsed."""
    filename: str
    content_type: str
    data: ResumeData
