import firebase_admin
from firebase_admin import credentials, firestore, storage

cred = credentials.Certificate("firebase-key.json")

firebase_admin.initialize_app(cred, {
    'storageBucket': 'findocscan.firebasestorage.app'
})

db = firestore.client()
bucket = storage.bucket()

def save_text_to_firebase(user_id, text):
    """Saves extracted text to Firestore."""
    doc_ref = db.collection("extracted_text").document(user_id)
    doc_ref.set({"text": text})
    print(f"Extracted text saved for {user_id}")

def upload_image_to_firebase(local_path, remote_path):
    """Uploads processed image to Firebase Storage."""
    blob = bucket.blob(remote_path)
    blob.upload_from_filename(local_path)
    print(f"Uploaded {local_path} to Firebase Storage at {remote_path}")