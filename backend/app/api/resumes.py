from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.resume_parser import parse_resume
from app.models.resume import ResumeData, UploadResponse

router = APIRouter()

@router.post("/upload", response_model=UploadResponse)
async def upload_resume(file: UploadFile = File(...)):
    """
    Uploads a resume file (PDF or Docx), parses it, and returns the extracted text.
    """
    if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF or Docx file.")

    try:
        extracted_text = await parse_resume(file)

        if not extracted_text:
            raise HTTPException(status_code=500, detail="Could not extract text from the resume.")

        resume_data = ResumeData(text=extracted_text)
        
        return UploadResponse(
            filename=file.filename,
            content_type=file.content_type,
            data=resume_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
