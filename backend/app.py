import os
from flask import Flask, request, jsonify
from flask_cors import CORS  # <--- MAKE SURE THIS IMPORT IS HERE
from werkzeug.utils import secure_filename
from rag_service import process_and_index_pdf, get_rag_response

# Create an 'uploads' directory if it doesn't exist
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- THIS IS THE FIX ---
# This line tells your backend to accept requests from any origin.
# For production, you might want to restrict it to your actual frontend domain.
# --- MODIFICATION FOR DEBUGGING ---
print("="*50)
print("Flask App is starting up...")
print("Attempting to apply CORS settings...")
CORS(app)
print("CORS settings applied successfully! The bouncer is friendly now.")
print("="*50)

# ... the rest of your API endpoints ...

@app.route('/')
def home():
    return jsonify({"message": "RAG Backend is running!"})

@app.route('/api/index', methods=['POST'])
def index_document():
    # ... (your existing code)
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and file.filename.endswith('.pdf'):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        try:
            result = process_and_index_pdf(filepath)
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": f"An error occurred during indexing: {str(e)}"}), 500
    else:
        return jsonify({"error": "Invalid file type. Please upload a PDF."}), 400

@app.route('/api/chat', methods=['POST'])
def chat_with_document():
    # ... (your existing code)
    data = request.get_json()
    if not data or 'query' not in data:
        return jsonify({"error": "Missing 'query' in request body"}), 400
    query = data['query']
    try:
        answer = get_rag_response(query)
        return jsonify({"answer": answer}), 200
    except Exception as e:
        if "not found" in str(e).lower():
            return jsonify({"error": "Document not indexed yet. Please upload a PDF first."}), 404
        return jsonify({"error": f"An error occurred during chat: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)