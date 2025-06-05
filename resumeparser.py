import google.generativeai as genai
import yaml

# Load API key from config.yaml
with open("config.yaml") as f:
    config = yaml.safe_load(f)

# Configure Gemini client
genai.configure(api_key=config["GEMINI_API_KEY"])

# Use Gemini Pro model (make sure your key has access)
model = genai.GenerativeModel(
    model_name="models/gemini-pro",
    generation_config={
        "temperature": 0.4,
        "top_p": 1,
        "max_output_tokens": 2048
    }
)

def ats_extractor(resume_data):
    prompt = """
You are an AI resume parser. From the provided resume text, extract and return the following fields as a JSON object:
- Full Name
- Email ID
- GitHub Portfolio
- LinkedIn ID
- Employment Details
- Technical Skills
- Soft Skills
Return only a JSON object with these fields.
"""

    response = model.generate_content([prompt, resume_data])
    return response.text
