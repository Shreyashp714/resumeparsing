import os
import json
from flask import Flask, render_template, request
from PyPDF2 import PdfReader
from resumeparser import ats_extractor

UPLOAD_PATH = os.path.join(os.getcwd(), "__DATA__")
if not os.path.exists(UPLOAD_PATH):
    os.makedirs(UPLOAD_PATH)

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/process", methods=["POST"])
def ats():
    doc = request.files["pdf_doc"]
    doc.save(os.path.join(UPLOAD_PATH, "file.pdf"))
    doc_path = os.path.join(UPLOAD_PATH, "file.pdf")
    
    # Extract text from PDF
    data = _read_file_from_path(doc_path)

    # Extract info using Gemini
    data = ats_extractor(data)
    
    # Pass JSON to template
    return render_template("index.html", data=json.loads(data))

def _read_file_from_path(path):
    reader = PdfReader(path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

if __name__ == "__main__":
    app.run(port=8000, debug=True)
