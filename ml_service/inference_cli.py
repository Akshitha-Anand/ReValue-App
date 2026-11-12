"""
CLI interface for Python waste inference
Allows the Node.js backend to invoke inference directly without requiring a separate server daemon.
Usage: python ml_service/inference_cli.py <image_path> [hint_text]
"""

import sys
import json
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from inference import classify_waste_image

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Missing image file path"}))
        sys.exit(1)

    image_path = sys.argv[1]
    hint = sys.argv[2] if len(sys.argv) > 2 else ""

    if not os.path.exists(image_path):
        print(json.dumps({"success": False, "error": f"Image file not found: {image_path}"}))
        sys.exit(1)

    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        result = classify_waste_image(image_bytes, hint_text=hint)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
