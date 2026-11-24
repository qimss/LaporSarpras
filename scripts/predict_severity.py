import sys
import os
import json

def fallback_classify(text):
    t = (text or "").lower()
    critical_kw = [
        'meletup', 'api', 'terbakar', 'gosong', 'hangus', 'nyetrum', 'sengatan',
        'konslet', 'korslet', 'kabel terbuka', 'plafon jebol', 'plafon roboh',
        'pipa pecah', 'banjir', 'asap', 'kaca pecah', 'roboh', 'darurat'
    ]
    medium_kw = [
        'panas', 'gerah', 'pengap', 'bocor', 'menetes', 'netes', 'tidak dingin',
        'mati', 'buram', 'rusak', 'mampet', 'tersumbat', 'audio', 'mic'
    ]
    for kw in critical_kw:
        if kw in t:
            return {"text": text, "prioritas": "Tinggi", "skor_keyakinan": 0.95}
    for kw in medium_kw:
        if kw in t:
            return {"text": text, "prioritas": "Sedang", "skor_keyakinan": 0.89}
    return {"text": text, "prioritas": "Rendah", "skor_keyakinan": 0.85}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided"}))
        sys.exit(1)

    raw_arg = sys.argv[1]
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

    # Attempt joblib model inference if available
    try:
        import joblib
        import numpy as np
        base_dir = os.path.dirname(__file__)
        model_path = os.path.join(base_dir, '..', 'data', 'trained_model.joblib')
        if os.path.exists(model_path):
            pipeline = joblib.load(model_path)
            predictions = pipeline.predict(texts)
            probabilities = pipeline.predict_proba(texts)
            results = []
            for t_item, pred, prob in zip(texts, predictions, probabilities):
                confidence = float(np.max(prob))
                results.append({
                    "text": t_item,
                    "prioritas": str(pred),
                    "skor_keyakinan": round(confidence, 3)
                })
            print(json.dumps(results if is_list else results[0]))
            return
    except Exception:
        pass

    # Safe built-in fallback classifier
    results = [fallback_classify(t) for t in texts]
    print(json.dumps(results if is_list else results[0]))

if __name__ == '__main__':
    main()
