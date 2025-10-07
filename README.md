# HireMind AI - Restructured Version 2.0

A complete career preparation platform with AI-powered features including resume analysis, mock interviews, and personalized feedback.

## Architecture Overview

### Backend (FastAPI)
- **Authentication**: JWT-based authentication with user registration/login
- **Database**: PostgreSQL with SQLAlchemy ORM
- **AI Services**: Gemini/Groq integration for resume analysis and interview feedback
- **File Management**: Secure file upload and storage for resumes
- **Modular Structure**: Separated routers for different features

### Frontend (Next.js)
- **Authentication Flow**: Login/Register pages with protected routes
- **State Management**: Zustand for global state management
- **UI Components**: Custom UI components with Tailwind CSS
- **API Integration**: Axios-based API client with automatic authentication

## Features

### 🔐 User Authentication
- User registration and login
- JWT token-based authentication
- Protected routes and API endpoints
- Password hashing and security

### 📄 ATS Resume Analyzer
- Upload resume files (PDF, DOCX)
- AI-powered analysis against job descriptions
- ATS compatibility scoring
- Keyword matching and suggestions
- Historical analysis tracking

### 🎤 Interactive Mock Interviewer
- AI-generated interview questions
- Real-time answer evaluation
- Personalized feedback and scoring
- Interview session management
- Progress tracking

### 📊 Centralized Dashboard
- User analytics and progress tracking
- Recent activity overview
- Performance metrics
- Quick action buttons

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- PostgreSQL database
- API keys for Gemini or Groq

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment configuration:**
   ```bash
   cp .env.example .env
   ```

5. **Database setup:**
   ```bash
   python migrate.py create
   ```

6. **Start the server:**
   ```bash
   chmod +x start.sh
   ./start.sh
   # Or manually: uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment configuration:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API base URL
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/change-password` - Change password

### ATS Analysis
- `POST /api/ats/analyze` - Analyze resume against job description
- `GET /api/ats/analyses` - Get user's analysis history
- `GET /api/ats/analyses/{id}` - Get specific analysis
- `DELETE /api/ats/analyses/{id}` - Delete analysis

### Interview
- `POST /api/interview/sessions` - Create interview session
- `GET /api/interview/sessions` - Get user's interview sessions
- `GET /api/interview/sessions/{id}` - Get specific session
- `POST /api/interview/sessions/{id}/answer` - Submit answer
- `POST /api/interview/sessions/{id}/complete` - Complete session

## Frontend Pages

### Public Pages
- `/` - Landing page
- `/auth/login` - Login page
- `/auth/register` - Registration page

### Protected Pages
- `/dashboard` - Main dashboard
- `/ats-checker` - Resume analysis tool
- `/interview` - Mock interview interface
- `/report` - Progress reports and analytics
- `/settings` - User settings

## Key Components

### Backend
- **Authentication Router** (`app/api/auth.py`): User management
- **ATS Router** (`app/api/ats.py`): Resume analysis
- **Interview Router** (`app/api/interview.py`): Mock interviews
- **Database Models** (`app/models/database.py`): SQLAlchemy models
- **Schemas** (`app/schemas/schemas.py`): Pydantic models
- **Security** (`app/core/security.py`): JWT and password handling

### Frontend
- **Auth Store** (`store/auth-store.ts`): Authentication state management
- **API Client** (`lib/api-client.ts`): HTTP client with authentication
- **Protected Route** (`components/protected-route.tsx`): Route protection
- **Dashboard Layout** (`components/dashboard-layout.tsx`): Main app layout

## Database Schema

### Users
- User authentication and profile information
- One-to-many relationships with resumes, analyses, and interviews

### Resumes
- Uploaded resume files and extracted text
- File metadata and storage paths

### Job Descriptions
- Job posting information for analysis

### Analysis Results
- ATS analysis results with scores and feedback
- Keyword matching and suggestions

### Interview Sessions
- Mock interview session management
- Questions, answers, and AI feedback

## Security Features

- **Password Hashing**: Bcrypt for secure password storage
- **JWT Tokens**: Secure authentication with expiration
- **CORS Protection**: Configured for specific origins
- **Input Validation**: Pydantic schemas for API validation
- **File Upload Security**: File type and size validation

## Deployment

### Backend Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Deploy with Docker or cloud service
5. Set up HTTPS and domain

### Frontend Deployment
1. Build the Next.js application
2. Configure environment variables
3. Deploy to Vercel, Netlify, or similar
4. Update CORS settings in backend

## Development Workflow

1. **Backend Changes**: Update models, add endpoints, test with FastAPI docs
2. **Frontend Changes**: Update components, test authentication flow
3. **Database Changes**: Create migrations, update models
4. **Testing**: Test API endpoints and frontend integration

## Troubleshooting

### Common Issues
- **Database Connection**: Check PostgreSQL service and connection string
- **Authentication Errors**: Verify JWT secret key and token expiration
- **CORS Issues**: Update backend CORS settings for frontend URL
- **File Upload**: Check file permissions and upload directory

### Development Tips
- Use FastAPI automatic docs at `http://localhost:8000/docs`
- Monitor browser network tab for API calls
- Check browser console for frontend errors
- Use database client to inspect data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper tests
4. Submit a pull request
5. Update documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details.
