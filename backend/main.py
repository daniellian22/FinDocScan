import os
import re
import cv2
import json
import pytesseract
import firebase_admin
from flask import Flask, request, jsonify
from flask import send_from_directory 
from flask_cors import CORS
from firebase_admin import credentials, firestore, storage
from pdf2image import convert_from_path
from gmm_text import extract_text_regions  # Use GMM segmentation for images
from openai import OpenAI  # Updated OpenAI import
from dotenv import load_dotenv
from datetime import datetime  # Add this import at the top

load_dotenv()


client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# Firebase Setup
cred = credentials.Certificate("firebase-key.json")  # Ensure this file exists
firebase_admin.initialize_app(cred, {
    'storageBucket': 'findocscan.appspot.com'  # Replace with your actual bucket name
})

db = firestore.client()
bucket = storage.bucket()

# Flask App Setup
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # Ensure uploads folder exists

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)  # Fix CORS issue
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Convert PDFs to Images
def convert_pdf_to_images(pdf_path):
    """Converts PDF pages into images for OCR processing."""
    try:
        print(f"Converting PDF: {pdf_path}")  # Debugging

        # 🔹 Set Poppler path (Mac/Linux/Windows)
        poppler_path = "/opt/homebrew/bin"  # Adjust for Windows if needed
        images = convert_from_path(pdf_path, poppler_path=poppler_path)

        if not images:
            print(" PDF conversion failed")
            return []

        image_paths = []
        for i, image in enumerate(images):
            image_path = f"{pdf_path}_page_{i}.png"
            image.save(image_path, "PNG")
            print(f"Saved: {image_path}")  # Debugging
            image_paths.append(image_path)

        return image_paths

    except Exception as e:
        print(f"Error converting PDF: {e}")  # Debugging
        return []

# Clean extracted text
def clean_text(text):
    """Removes extra symbols and corrects common OCR mistakes."""
    text = re.sub(r"\n{2,}", "\n", text)  # Remove extra newlines
    text = re.sub(r"[^\x00-\x7F]+", " ", text)  # Remove non-ASCII characters
    text = re.sub(r"(?i)mimiddiyyyy", "MM/DD/YYYY", text)  # Correct placeholder dates
    return text.strip()

# OCR Text Extraction
def extract_text(image_path):
    """Enhance image and extract structured text using OCR."""
    image = cv2.imread(image_path)

    # Convert to grayscale for better OCR
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply adaptive thresholding to enhance text
    processed = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)

    # Resize image to improve OCR accuracy
    processed = cv2.resize(processed, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    # Apply denoising
    processed = cv2.fastNlMeansDenoising(processed, h=30)

    # OCR extraction with better settings
    text = pytesseract.image_to_string(processed, config="--psm 6")  # Use Page Segmentation Mode 6 for better structure
    cleaned_text = clean_text(text)

    return cleaned_text

# Extract structured invoice data
def extract_invoice_data(text):
    """Sends extracted text to OpenAI for structured invoice extraction."""
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Extract structured invoice details and return a JSON object."},
                {"role": "user", "content": f"Extract the invoice details from this text:\n{text}"}
            ],
            temperature=0,
            response_format={"type": "json_object"}  # Corrected format to 'json_object'
        )

        # Parse JSON safely
        structured_data = response.choices[0].message.content
        return json.loads(structured_data)

    except json.JSONDecodeError:
        return {"error": "Invalid JSON format from OpenAI"}
    except Exception as e:
        return {"error": str(e)}
# Process uploaded documents
@app.route("/process", methods=["POST"])
def process_document():
    """Process document upload and extract structured text."""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    user_email = request.form.get("user_email", "unknown_user")
    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"  # Unique filename
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)  # Save file locally in 'uploads/' folder

    try:
        # 🔹 If the file is a PDF, convert it to images first
        if filename.lower().endswith(".pdf"):
            image_paths = convert_pdf_to_images(file_path)
            if not image_paths:
                return jsonify({"error": "PDF processing failed"}), 500
        else:
            image_paths = [file_path]  # Treat it as a single image

        extracted_texts = []
        for image_path in image_paths:
            processed_path = extract_text_regions(image_path)  # Use GMM
            extracted_texts.append(extract_text(processed_path))

        # Combine text from all PDF pages
        extracted_text = "\n".join(extracted_texts)

        # Extract structured data
        structured_data = extract_invoice_data(extracted_text)

        # Save extracted text & local file URL in Firestore
        file_url = f"http://127.0.0.1:5000/uploads/{filename}"  # Flask serves file here

        doc_ref = db.collection("users").document(user_email).collection("documents").document(filename)
        doc_ref.set({
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "filename": filename,
            "text": extracted_text,
            "structured_data": structured_data,
            "file_url": file_url  # Store local file URL instead of Firebase Storage URL
        })

        return jsonify({
            "message": "Processing complete",
            "processed_images": image_paths,
            "extracted_text": extracted_text,
            "structured_data": structured_data,
            "file_url": file_url  # Return file URL for frontend
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    
@app.route("/uploads/<path:filename>")
def serve_file(filename):
    """Serves uploaded files from local storage."""
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/delete_document", methods=["POST"])
def delete_document():
    data = request.json
    user_email = data.get("user_email")
    filename = data.get("filename")

    try:
        # Delete from Firestore
        db.collection("users").document(user_email).collection("documents").document(filename).delete()

        # Delete from local uploads
        local_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        if os.path.exists(local_path):
            os.remove(local_path)

        return jsonify({"message": f"{filename} deleted."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/delete_all_documents", methods=["POST"])
def delete_all_documents():
    data = request.json
    user_email = data.get("user_email")

    try:
        docs_ref = db.collection("users").document(user_email).collection("documents")
        docs = docs_ref.stream()
        for doc in docs:
            doc.reference.delete()
        return jsonify({"message": "All documents deleted."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

# Run Flask app
if __name__ == "__main__":
    app.run(debug=True)