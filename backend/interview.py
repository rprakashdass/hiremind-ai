import os
from dotenv import load_dotenv
import groq
import re
import json

# Load environment variables
load_dotenv()
API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = "meta-llama/llama-4-scout-17b-16e-instruct"

groq_client = groq.Groq(api_key=API_KEY)

def groq_chat(prompt, system_prompt=None, max_tokens=512, temperature=0.7):
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    response = groq_client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature
    )
    content = response.choices[0].message.content
    return content if content is not None else ""

def generate_questions(resume_info):
    prompt = (
        f"You are a professional talent acquisition specialist conducting an interview for an AI role. "
        f"Given this resume info: {resume_info}, generate 5 technical and behavioral interview questions for a job interview. "
        f"Questions should be short, relevant, and not boring. Return only the questions as a numbered list."
    )
    text = groq_chat(prompt, system_prompt="You are a helpful AI interview assistant.") or ""
    questions = re.findall(r"\d+\.\s*(.*?\?)", text)
    if not questions:
        questions = [q.strip('- ').strip() for q in text.strip().split('\n') if q.strip() and '?' in q]
    return {"questions": questions}

def truncate_feedback(feedback, max_sentences=3):
    sentences = re.split(r'(?<=[.!?]) +', feedback)
    return ' '.join(sentences[:max_sentences]).strip()

def evaluate_answer(payload):
    question = payload.get("question")
    answer = payload.get("answer")
    prompt = (
        f"You are an expert AI interviewer.\n"
        f"Interview Question: {question}\n"
        f"Candidate Answer: {answer}\n"
        "Evaluate ONLY THIS answer for clarity, relevance, and depth. "
        "Provide a score out of 10 and a short feedback string (2-3 sentences). "
        "Respond ONLY with a valid JSON object with keys: score, feedback, strengths, improvements, followUpQuestions. "
        "Do NOT summarize the whole interview. Do NOT generate a report. Do NOT include any extra text, markdown, or a full report."
    )
    text = groq_chat(prompt, system_prompt="You are a helpful AI interview evaluator.", temperature=0.5) or ""
    print('Groq raw response:', text)
    # Try to extract JSON
    result = extract_json_from_text(text)
    if result and 'feedback' in result:
        result['feedback'] = truncate_feedback(result['feedback'])
        return result
    feedback = truncate_feedback(text.strip())
    return {
        "score": None,
        "feedback": feedback,
        "strengths": None,
        "improvements": None,
        "followUpQuestions": None,
        "raw": text.strip()
    }

def extract_json_from_text(text):
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                return None
    return None

def init_cv_question_stream(cv, user_intro, client=None, model=MODEL_NAME):
    prompt = f"""You are professional talent acquisition specialist conducting an interview for an AI role.\nYour task is to start a conversation with the candidate after he introduced himself.\nYou have access to the candidate's CV.\nThe question should be short and not boring.\nThe text you will generate will be read by a text-to-speech engine, so you can add vocalized text if you want.\nYou should not explain the beginning of the conversation or the context of the question.\nTalk directly to the candidate.\nBe kind, nice, helpful, and professional.\nYou need to keep it a natural conversation.\nYou need to be human-like, and to interact with the last thing that the candidate said.\nCandidate Introduction: {user_intro}\nCV: {cv}\n\nConversation Start: """
    return groq_chat(prompt, system_prompt="You are a helpful AI interview assistant.")

def stream_next_cv_question(client=None, model=MODEL_NAME, cv=None, chat_history=None):
    prompt = f"""You are professional talent acquisition specialist conducting an interview for an AI role.\nYour task is to continue the conversation with the candidate after he answered the previous question.\nContinue the conversation and do not begin a new one.\nYou have access to the candidate's CV.\nThe question should be short and not boring.\nThe question should not be long!\nThe text you will generate will be read by a text-to-speech engine, so you can add vocalized text if you want.\nYou should not explain the beginning of the conversation or the context of the question.\nDon't repeat previous questions.\nBefore asking the question, give a natural transition from the previous answer.\nDon't explain anything, and don't give any notes.\nTalk directly to the candidate.\nBe kind, nice, helpful, and professional.\nYou need to keep it a natural conversation.\nChat History: {chat_history}\nCV: {cv}\n\nConversation Continuity: """
    return groq_chat(prompt, system_prompt="You are a helpful AI interview assistant.")

def reformulate_question(client=None, model=MODEL_NAME, question_data=None):
    if not question_data:
        return "No question data provided."
    prompt = f"""You are a professional technical interviewer conducting an interview for an AI role.\nYour task is to reformulate the following technical question to make it more conversational and suitable for a verbal interview.\nThe reformulated question should be clear, concise, and natural sounding when read aloud by a text-to-speech system.\nDo not change the technical content or difficulty of the question.\n\nOriginal Question: {question_data['question']}\n\nTopic: {question_data.get('main_subject', '')}\nDifficulty: {question_data.get('difficulty', '')}\n\nPlease provide only the reformulated question without any additional text, explanations, or context.\n"""
    return groq_chat(prompt, system_prompt="You are a helpful AI interview assistant.")

def generate_interview_questions(resume_text, job_title, job_description):
    prompt = (
        "You are a professional technical interviewer. "
        "Given the following resume, job title, and job description, generate 6 diverse interview questions for a technical interview. "
        "The questions should cover: 1) projects/experience, 2) technical skills, 3) education/background, 4) behavioral/soft skills, 5) problem-solving, 6) motivation/career goals. "
        "The questions must be tailored to the specific job role and the candidate's resume. "
        "Questions should be clear, relevant, and not generic. Return ONLY a JSON array of 6 questions.\n"
        f"Job Title: {job_title}\n"
        f"Job Description: {job_description}\n"
        f"Resume: {resume_text}"
    )
    text = groq_chat(prompt, system_prompt="You are a helpful AI interview assistant.") or ""
    print('Groq raw questions:', text)
    try:
        # Find the JSON array in the response
        json_match = re.search(r'\[.*\]', text, re.DOTALL)
        if json_match:
            questions_str = json_match.group(0)
            questions = json.loads(questions_str)
            if isinstance(questions, list) and all(isinstance(q, str) for q in questions):
                 # Ensure we have exactly 6 questions, trimming or padding if necessary
                final_questions = questions[:6]
                while len(final_questions) < 6:
                    final_questions.append("Can you tell me about a challenging project you've worked on?")
                return final_questions
    except Exception as e:
        print(f"Error parsing JSON from Groq response: {e}")

    # Fallback to parsing numbered or bulleted lists
    lines = re.findall(r'(?:\d+\.|\*|-)\s*(.*)', text)
    if not lines:
        lines = [line.strip() for line in text.split('\n') if '?' in line]

    final_questions = [q.strip() for q in lines if q.strip()][:6]
    while len(final_questions) < 6:
        final_questions.append("Describe a time you had to learn a new technology quickly.")
        
    return final_questions

def evaluate_single_answer(question, answer, resume_text):
    prompt = (
        "You are an expert technical interviewer.\n"
        f"Resume: {resume_text}\n"
        f"Interview Question: {question}\n"
        f"Candidate Answer: {answer}\n"
        "Evaluate ONLY THIS answer for clarity, relevance, and depth. "
        "Provide a score out of 10 and a short feedback string (2-3 sentences). "
        "Respond ONLY with a valid JSON object with keys: score, feedback, strengths, improvements, followUpQuestions. "
        "Do NOT summarize the whole interview. Do NOT generate a report. Do NOT include any extra text, markdown, or a full report."
    )
    text = groq_chat(prompt, system_prompt="You are a helpful AI interview evaluator.", temperature=0.5) or ""
    print('Groq raw evaluation:', text)
    result = extract_json_from_text(text)
    if result and 'feedback' in result:
        result['feedback'] = truncate_feedback(result['feedback'])
        return result
    feedback = truncate_feedback(text.strip())
    return {
        "score": None,
        "feedback": feedback,
        "strengths": None,
        "improvements": None,
        "followUpQuestions": None,
        "raw": text.strip()
    }

def generate_final_report(interview_data, user_name=None):
    prompt = (
        "You are an expert AI interviewer tasked with evaluating a candidate's technical interview performance.\n"
        "Based on the interview questions, expected answers, and the candidate's actual responses, provide a comprehensive evaluation report.\n"
        "Your report should include:\n"
        "1. A concise overall assessment (no repeated words or phrases).\n"
        "2. Specific strengths (bullet points, no repetition).\n"
        "3. Areas for improvement (bullet points, no repetition).\n"
        "4. Detailed feedback on each question (no repeated words or phrases).\n"
        "5. Concrete recommendations for the candidate to improve their knowledge and interview performance.\n"
        "Be professional, direct, and constructive. Do NOT repeat words or phrases. Do NOT include the candidate's name. Avoid any kind of duplication in your response.\n"
        f"Interview Data: {json.dumps(interview_data)}"
    )
    text = groq_chat(prompt, system_prompt="You are a helpful AI interview evaluator.") or ""
    print('Groq raw report:', text)
    return text.strip()

def next_interview_question(resume_text, chat_history, user_intro=None):
    total_questions = 7
    current_question_num = len(chat_history) + 1
    if user_intro and not chat_history:
        intro_part = f"The candidate introduced themselves as: {user_intro}\n"
    else:
        intro_part = ""
    prompt = (
        f"You are a professional technical interviewer conducting a real-time, friendly job interview. "
        f"This interview consists of {total_questions} questions. You are about to ask question number {current_question_num} out of {total_questions}. "
        "Your job is to keep the conversation natural and human-like, as if you are speaking to the candidate in person. "
        "Given the following resume and the previous interview questions and answers, first give a brief, natural, conversational comment on the candidate's most recent answer (if any)—no more than 2 sentences, and do not repeat or over-explain. Then, ask the next interview question. "
        "Make the question flow naturally from the previous conversation, but do not repeat or over-explain. "
        f"{intro_part}"
        f"Ensure that over the course of {total_questions} questions, you cover: 1) projects/experience, 2) technical skills, 3) education/background, 4) behavioral/soft skills, 5) problem-solving, 6) motivation/career goals, 7) wrap-up or closing. "
        "Do NOT repeat topics already covered. "
        "Ask a clear, relevant, and non-generic question. "
        "Return ONLY the brief comment and the next question as plain text, no explanations, no markdown, no JSON.\n"
        f"Resume: {resume_text}\n"
        f"Previous Q&A: {json.dumps(chat_history)}"
    )
    text = groq_chat(prompt, system_prompt="You are a helpful AI interview assistant.") or ""
    print('Groq next question:', text)
    lines = [l.strip('- ').strip() for l in text.split('\n') if l.strip()]
    return '\n'.join(lines) if lines else 'Can you tell me more about your experience?'
