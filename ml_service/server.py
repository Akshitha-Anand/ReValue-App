"""
Flask Inference Microservice for ReValue AI Waste Classifier
Listens on port 5001.
"""

import os
import sys
from flask import Flask, request, jsonify

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from inference import classify_waste_image, CATEGORIES, get_loaded_model

app = Flask(__name__)

@app.route("/health", methods=["GET"])
def health():
    model = get_loaded_model()
    return jsonify({
        "status": "healthy",
        "service": "ReValue Waste Image Classifier",
        "model_loaded": model is not None,
        "categories": CATEGORIES
    })

@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files and "file" not in request.files:
        return jsonify({
            "success": False,
            "error": "No image file provided in request (expected form key 'image' or 'file')"
        }), 400

    file = request.files.get("image") or request.files.get("file")
    hint_text = request.form.get("hint", "")

    try:
        image_bytes = file.read()
        result = classify_waste_image(image_bytes, hint_text=hint_text)
        return jsonify(result), 200
    except ValueError as val_err:
        return jsonify({
            "success": False,
            "error": str(val_err)
        }), 400
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Internal inference error: {str(e)}"
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", 5001))
    print(f"[*] Starting ReValue Waste Classification Service on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
