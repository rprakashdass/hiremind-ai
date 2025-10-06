import spacy
from sentence_transformers import SentenceTransformer
from keybert import KeyBERT
from sentence_transformers.util import pytorch_cos_sim

# --- Model Loading ---
# Load models once when the module is imported.
# This is more efficient than loading them on each API call.
try:
    nlp = spacy.load("en_core_web_sm")
    sbert_model = SentenceTransformer('all-MiniLM-L6-v2')
    keybert_model = KeyBERT(model=sbert_model)
    print("AI models loaded successfully.")
except Exception as e:
    print(f"Error loading AI models: {e}")
    # Depending on the application's needs, you might want to handle this more gracefully.
    # For now, we'll let it raise an exception if the models can't be loaded.
    nlp = sbert_model = keybert_model = None

def preprocess_text(text: str) -> str:
    """
    Cleans and preprocesses text by converting to lowercase, lemmatizing,
    and removing stopwords and punctuation.
    """
    if not nlp:
        raise RuntimeError("spaCy model is not loaded.")
    
    doc = nlp(text.lower())
    tokens = [token.lemma_ for token in doc if not token.is_stop and not token.is_punct]
    return " ".join(tokens)

def extract_keywords(text: str) -> list[str]:
    """
    Extracts key phrases and keywords from the text using KeyBERT.
    """
    if not keybert_model:
        raise RuntimeError("KeyBERT model is not loaded.")
        
    keywords = keybert_model.extract_keywords(
        text, 
        keyphrase_ngram_range=(1, 2), 
        stop_words='english', 
        top_n=100
    )
    return [kw[0] for kw in keywords]

def calculate_similarity(text1: str, text2: str) -> float:
    """
    Calculates the semantic similarity between two texts using Sentence-BERT.
    """
    if not sbert_model:
        raise RuntimeError("SentenceTransformer model is not loaded.")
        
    embeddings = sbert_model.encode([text1, text2], convert_to_tensor=True)
    similarity_score = pytorch_cos_sim(embeddings[0], embeddings[1])
    return similarity_score.item()

def analyze_resume_against_job(resume_text: str, job_description: str) -> dict:
    """
    Performs an advanced ATS analysis using semantic similarity and keyword extraction.
    """
    # Preprocess both the resume and job description
    clean_resume = preprocess_text(resume_text)
    clean_job_description = preprocess_text(job_description)
    
    # Extract keywords to compare skills
    resume_keywords = extract_keywords(clean_resume)
    job_keywords = extract_keywords(clean_job_description)
    
    # Calculate similarity scores
    # 1. Skill Similarity: How well do the keywords match?
    skill_similarity = calculate_similarity(" ".join(resume_keywords), " ".join(job_keywords))
    
    # 2. Overall Similarity: How well does the overall text match?
    overall_similarity = calculate_similarity(clean_resume, clean_job_description)
    
    # Weighted scoring to combine the different metrics
    # The weights can be tuned based on what's considered more important.
    # Here, skill similarity is weighted highest.
    ats_score = (0.6 * skill_similarity) + (0.4 * overall_similarity)
    
    # Ensure score is within 0-100 range
    final_score = max(0, min(100, ats_score * 100))

    # Find matching and missing keywords for feedback
    matching_keywords = list(set(resume_keywords) & set(job_keywords))
    missing_keywords = list(set(job_keywords) - set(resume_keywords))

    # Generate dynamic suggestions as a list
    suggestions = []
    if final_score >= 85:
        suggestions.append("Excellent match! Your resume is highly aligned with the job description.")
    elif final_score >= 65:
        suggestions.append("Good match. Your resume aligns well, but could be tailored further.")
        if missing_keywords:
            suggestions.append(f"Consider incorporating keywords like: {', '.join(missing_keywords[:3])}.")
    else:
        suggestions.append("Needs improvement. Your resume is not a strong match for this role.")
        if missing_keywords:
            suggestions.append(f"Focus on adding relevant skills and keywords from the job description, such as: {', '.join(missing_keywords[:5])}.")

    return {
        "ats_score": round(final_score, 2),
        "matched_keywords": matching_keywords,
        "missing_keywords": missing_keywords,
        "suggestions": suggestions,
        "strengths": [],  # Add empty strengths for now
        "weaknesses": [],  # Add empty weaknesses for now
    }
