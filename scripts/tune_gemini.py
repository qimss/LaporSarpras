import os
import csv
import json
import time
from google import genai
from google.genai import types

def load_api_key():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if not os.path.exists(env_path):
        raise FileNotFoundError('.env file not found!')
    
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('GEMINI_API_KEY='):
                return line.strip().split('=', 1)[1]
    raise ValueError('GEMINI_API_KEY not found in .env')

def map_severity(severity_str):
    s = (severity_str or '').strip().lower()
    if s in ['urgent', 'high']:
        return 'Tinggi'
    elif s == 'medium':
        return 'Sedang'
    elif s == 'low':
        return 'Rendah'
    return 'Sedang'

def prepare_dataset(csv_path):
    examples = []
    print(f"📖 Membaca dataset dari: {csv_path}")
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            desc = row.get('Complaint_Description', '').strip()
            aspects = row.get('Aspects', '').strip()
            severity_raw = row.get('Severity', '').strip()
            dept = row.get('Primary_Department', '').strip()
            
            if not desc or not severity_raw:
                continue
            
            prioritas = map_severity(severity_raw)
            
            # Format Input untuk Gemini
            input_text = f"Fasilitas: {aspects if aspects else 'Umum'}. Keluhan Kerusakan: {desc}"
            
            # Format Output JSON yang diharapkan dari Gemini
            output_obj = {
                "prioritas": prioritas,
                "tingkat_urgensi_asli": severity_raw,
                "fasilitas": aspects if aspects else "Umum",
                "departemen": dept if dept else "Sarpras",
                "alasan": f"Masalah fasilitas {aspects} dengan tingkat keparahan {prioritas} berdasarkan laporan mahasiswa."
            }
            output_text = json.dumps(output_obj, ensure_ascii=False)
            
            examples.append(types.TuningExample(
                text_input=input_text,
                output=output_text
            ))
            
    print(f"✅ Berhasil menyiapkan {len(examples)} data contoh pelatihan!")
    return examples

def start_tuning():
    api_key = load_api_key()
    client = genai.Client(api_key=api_key)
    
    csv_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'campus_complaints_396.csv')
    examples = prepare_dataset(csv_path)
    
    print("\n🚀 Memulai proses tuning model ke Google Gemini API...")
    print("Base Model: models/gemini-1.5-flash-001-tuning")
    print("Nama Model Hasil: laporsarpras-gemini-v1")
    
    try:
        # Panggil API Tuning resmi Google GenAI
        tuning_job = client.tunings.tune(
            base_model="models/gemini-1.5-flash-001-tuning",
            training_dataset=types.TuningDataset(examples=examples),
            config=types.CreateTuningJobConfig(
                tuned_model_display_name="laporsarpras-gemini-v1",
                epoch_count=5,
                batch_size=4,
                learning_rate=0.001
            )
        )
        
        print("\n🎉 TUNING JOB BERHASIL DIBUAT DI GOOGLE CLOUD!")
        print(f"📋 Job Name: {tuning_job.name}")
        print(f"🔄 Status Saat Ini: {tuning_job.state}")
        print(f"🎯 Target Model ID: {tuning_job.tuned_model.name if tuning_job.tuned_model else 'Sedang dialokasikan...'}")
        print("\nℹ️ Server Google sedang melatih model di cloud. Silakan tunggu beberapa menit.")
        return tuning_job

    except Exception as e:
        print("\n⚠️ Catatan saat memanggil API Tuning:")
        print(f"Pesan: {e}")
        return None

if __name__ == '__main__':
    start_tuning()
