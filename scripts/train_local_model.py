import os
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

def train_facility_model():
    base_dir = os.path.dirname(__file__)
    csv_path = os.path.join(base_dir, '..', 'data', 'campus_complaints_396.csv')
    
    print("=========================================================")
    print("🤖 TRAINING MACHINE LEARNING MODEL - LAPORSARPRAS AI")
    print("=========================================================")
    print(f"📖 Membaca dataset: {csv_path}")
    
    df = pd.read_csv(csv_path)
    print(f"📊 Total baris data: {len(df)}")
    
    # Filter data yang valid
    df = df.dropna(subset=['Complaint_Description', 'Severity']).copy()
    
    # Mapping Severity ke Standar Sistem (Tinggi / Sedang / Rendah)
    def map_severity_id(sev):
        s = str(sev).strip().lower()
        if s in ['urgent', 'high']:
            return 'Tinggi'
        elif s == 'medium':
            return 'Sedang'
        elif s == 'low':
            return 'Rendah'
        return 'Sedang'

    df['prioritas'] = df['Severity'].apply(map_severity_id)
    
    # Kombinasi aspek fasilitas + deskripsi untuk akurasi optimal
    df['text_input'] = df.apply(
        lambda r: f"{r['Aspects'] if pd.notna(r['Aspects']) else ''} {r['Complaint_Description']}",
        axis=1
    )
    
    X = df['text_input']
    y = df['prioritas']
    
    print("\n📈 Distribusi Kelas Prioritas:")
    print(df['prioritas'].value_counts())
    
    # Split 80% Train, 20% Test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"\n✂️ Data Train: {len(X_train)} | Data Test: {len(X_test)}")
    
    # Uji 3 Algoritma Terbaik
    algorithms = {
        "Logistic Regression (L-BFGS)": LogisticRegression(max_iter=1000, C=1.5),
        "Multinomial Naive Bayes": MultinomialNB(alpha=0.5),
        "Random Forest Classifier": RandomForestClassifier(n_estimators=100, random_state=42)
    }
    
    best_name = None
    best_acc = 0.0
    best_pipeline = None
    best_report = None
    best_cm = None
    
    print("\n🔍 Memulai Evaluasi Algoritma:")
    for name, clf in algorithms.items():
        pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(max_features=2500, ngram_range=(1, 2), stop_words='english')),
            ('clf', clf)
        ])
        
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        
        print(f"  • {name:<30} -> Akurasi: {acc * 100:.2f}%")
        
        if acc > best_acc:
            best_acc = acc
            best_name = name
            best_pipeline = pipeline
            best_report = classification_report(y_test, y_pred, zero_division=0)
            best_cm = confusion_matrix(y_test, y_pred, labels=['Tinggi', 'Sedang', 'Rendah'])
            
    print("\n" + "="*55)
    print(f"🏆 MODEL TERBAIK: {best_name}")
    print(f"🎯 AKURASI FINAL PADA DATA UJI: {best_acc * 100:.2f}%")
    print("="*55)
    print("\n📋 Classification Report:")
    print(best_report)
    print("🔢 Confusion Matrix (Baris: Aktual [Tinggi, Sedang, Rendah], Kolom: Prediksi):")
    print(best_cm)
    
    # Simpan Model Terlatih ke folder data/
    model_output_path = os.path.join(base_dir, '..', 'data', 'trained_model.joblib')
    joblib.dump(best_pipeline, model_output_path)
    print(f"\n💾 Model berhasil disimpan ke: {model_output_path}")
    
    # Simpan rekap laporan evaluasi untuk Bab VII
    report_file = os.path.join(base_dir, '..', 'data', 'model_evaluation_report.txt')
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(f"MODEL CLASSIFIER EVALUATION REPORT - LAPORSARPRAS AI\n")
        f.write(f"Algorithm: {best_name}\n")
        f.write(f"Accuracy: {best_acc * 100:.2f}%\n\n")
        f.write("Classification Report:\n")
        f.write(best_report)
        f.write("\nConfusion Matrix:\n")
        f.write(str(best_cm))
        
    print(f"📝 Rekap evaluasi akademik Bab VII disimpan ke: {report_file}")
    
    # Uji Coba Cepat (Inference Demo)
    sample_texts = [
        "AC di ruang 204 mati total gerah dan panas",
        "Stopkontak korslet meletup ada api bau hangus terbakar",
        "Baut sandaran kursi copot goyang sedikit"
    ]
    print("\n🧪 Uji Prediksi Nyata:")
    for text in sample_texts:
        pred = best_pipeline.predict([text])[0]
        prob = np.max(best_pipeline.predict_proba([text]))
        print(f"  • Input : \"{text}\"")
        print(f"    Hasil : [{pred}] (Keyakinan: {prob * 100:.1f}%)\n")
        
    return best_acc

if __name__ == '__main__':
    train_facility_model()
