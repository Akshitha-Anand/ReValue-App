"""
Unit tests for Waste Classification Inference & Validation Pipeline
"""

import io
import unittest
from PIL import Image
import numpy as np

from inference import (
    validate_and_preprocess_image,
    classify_waste_image,
    CATEGORIES
)

class TestWasteClassification(unittest.TestCase):

    def setUp(self):
        # Create a synthetic 100x100 RGB JPEG image
        img = Image.new("RGB", (100, 100), color=(73, 109, 137))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        self.valid_jpeg_bytes = buf.getvalue()

        # Create a synthetic 200x200 PNG image
        img_png = Image.new("RGB", (200, 200), color=(34, 139, 34)) # Forest green
        buf_png = io.BytesIO()
        img_png.save(buf_png, format="PNG")
        self.green_png_bytes = buf_png.getvalue()

    def test_valid_image_preprocessing(self):
        img_array, meta = validate_and_preprocess_image(self.valid_jpeg_bytes)
        self.assertEqual(img_array.shape, (224, 224, 3))
        self.assertEqual(meta["format"], "JPEG")
        self.assertEqual(meta["width"], 100)
        self.assertEqual(meta["height"], 100)

    def test_empty_image_rejection(self):
        with self.assertRaises(ValueError) as ctx:
            validate_and_preprocess_image(b"")
        self.assertIn("empty", str(ctx.exception).lower())

    def test_corrupted_image_rejection(self):
        corrupted_bytes = b"NOT_AN_IMAGE_FILE_DATA_CORRUPTED"
        with self.assertRaises(ValueError) as ctx:
            validate_and_preprocess_image(corrupted_bytes)
        self.assertTrue("corrupted" in str(ctx.exception).lower() or "unsupported" in str(ctx.exception).lower())

    def test_classification_output_structure(self):
        result = classify_waste_image(self.valid_jpeg_bytes)
        self.assertTrue(result["success"])
        self.assertIn(result["suggested_category"], CATEGORIES)
        self.assertTrue(0.0 <= result["confidence"] <= 1.0)
        self.assertIn("recycling_tip", result)
        self.assertIn("top_predictions", result)
        self.assertEqual(len(result["top_predictions"]), 3)

    def test_organic_color_hint(self):
        # Green image should score high on organic
        result = classify_waste_image(self.green_png_bytes)
        self.assertTrue(result["success"])
        self.assertEqual(result["suggested_category"], "organic")

if __name__ == "__main__":
    unittest.main()
