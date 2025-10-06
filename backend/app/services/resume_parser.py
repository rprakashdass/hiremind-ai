import cv2
import pytesseract
from pdf2image import convert_from_path
import numpy as np
import tempfile
import os
import pdfplumber
from fastapi import UploadFile
import docx
from PyPDF2 import PdfReader
import io

async def extract_text_from_docx(file_content: bytes) -> str:
    """Extracts text from a DOCX file."""
    try:
        doc = docx.Document(io.BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting text from DOCX: {str(e)}")
        return ""


async def extract_text_from_pdf_pypdf2(file_content: bytes) -> str:
    """Extracts text from a PDF using PyPDF2."""
    try:
        pdf_reader = PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting text with PyPDF2: {str(e)}")
        return ""


async def extract_text_from_pdf_upload(file_path: str) -> str:
    """Extracts text from a PDF using pdfplumber."""
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
    except Exception as e:
        print(f"Error extracting text with pdfplumber: {str(e)}")
        return ""
    return text.strip()

async def extract_text_from_pdf_ocr(file_path: str) -> str:
    """Extracts text from a PDF using OCR if it's an image-based PDF."""
    text = ""
    try:
        images = convert_from_path(file_path)
        for image in images:
            image_np = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
            text += pytesseract.image_to_string(gray) + "\n"
    except Exception as e:
        print(f"Error extracting text using OCR: {str(e)}")
        return ""
    return text.strip()

async def parse_resume(file: UploadFile) -> str:
    """
    Parses the resume file, supporting PDF and DOCX formats.
    """
    # Read file content
    content = await file.read()
    
    # Reset file position for potential re-reading
    await file.seek(0)
    
    # Get file extension
    file_extension = os.path.splitext(file.filename.lower())[1] if file.filename else ""
    
    text = ""
    
    try:
        if file_extension == '.docx':
            # Handle DOCX files
            print(f"Processing DOCX file: {file.filename}")
            text = await extract_text_from_docx(content)
            
        elif file_extension == '.pdf':
            # Handle PDF files
            print(f"Processing PDF file: {file.filename}")
            
            # Try PyPDF2 first (faster)
            text = await extract_text_from_pdf_pypdf2(content)
            
            # If PyPDF2 fails or returns little text, try pdfplumber
            if not text or len(text.strip()) < 50:
                print("PyPDF2 extraction failed or insufficient. Trying pdfplumber.")
                
                # Use temporary file for pdfplumber
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                    tmp_file.write(content)
                    tmp_file_path = tmp_file.name
                
                try:
                    text = await extract_text_from_pdf_upload(tmp_file_path)
                    
                    # If still no good text, try OCR as last resort
                    if not text or len(text.strip()) < 50:
                        print("Direct text extraction failed. Falling back to OCR.")
                        text = await extract_text_from_pdf_ocr(tmp_file_path)
                finally:
                    # Clean up the temporary file
                    if os.path.exists(tmp_file_path):
                        os.unlink(tmp_file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_extension}. Supported formats: .pdf, .docx")
    
    except Exception as e:
        print(f"Error parsing resume {file.filename}: {str(e)}")
        raise ValueError(f"Could not extract text from the resume: {str(e)}")

    if not text or not text.strip():
        raise ValueError("Could not extract any text from the provided resume. The file might be corrupted or empty.")

    print(f"Successfully extracted {len(text)} characters from {file.filename}")
    return text.strip()
