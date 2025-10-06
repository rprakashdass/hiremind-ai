# HireMe AI - Backend

This directory contains the backend for the HireMe AI application, built with FastAPI.

## Setup and Installation

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create a virtual environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install the required dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

## Running the Server

To run the FastAPI development server, use the following command:

```bash
uvicorn app.main:app --reload
```

The server will be available at `http://127.0.0.1:8000`.

## API Endpoints

### Resume Upload

*   **Endpoint:** `POST /api/resumes/upload`
*   **Description:** Uploads a resume file (PDF or Docx) for parsing.
*   **Response:** Returns the extracted text from the resume in JSON format.
