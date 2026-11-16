import sys
import os
import json
import joblib
import numpy as np

def main():
    base_dir = os.path.dirname(__file__)
    model_path = os.path.join(base_dir, '..', 'data', 'trained_model.joblib')
    
    if not os.path.exists(model_path):
        print(json.dumps({"error": "Model file not found"}))
        sys.exit(1)
        
    try:
        pipeline = joblib.load(model_path)
    except Exception as e:
        print(json.dumps({"error": f"Failed to load model: {str(e)}"}))
        sys.exit(1)
        
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided"}))
        sys.exit(1)
        
    raw_arg = sys.argv[1]
    
    # Try parsing as JSON array/object, or treat as plain text
    try:
        payload = json.loads(raw_arg)
        if isinstance(payload, list):
            texts = payload
            is_list = True
        elif isinstance(payload, dict):
            texts = [payload.get("text", "")]
            is_list = False
        else:
            texts = [str(payload)]
            is_list = False
    except Exception:
        texts = [raw_arg]
        is_list = False
        
    try:
        predictions = pipeline.predict(texts)
        probabilities = pipeline.predict_proba(texts)
        
        results = []
        for text, pred, prob in zip(texts, predictions, probabilities):
            confidence = float(np.max(prob))
            results.append({
                "text": text,
                "prioritas": str(pred),
                "skor_keyakinan": round(confidence, 3)
            })
            
        print(json.dumps(results if is_list else results[0]))
    except Exception as e:
        print(json.dumps({"error": f"Inference failed: {str(e)}"}))
        sys.exit(1)

if __name__ == '__main__':
    main()
