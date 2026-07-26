import os
import requests
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("Missing Supabase URL or Key in .env file.")

supabase: Client = create_client(url, key)

class EvidenceAuditLog:
    def __init__(self):
        self.errors = []
        self.processed = 0
        self.passed = 0

    def validate_record(self, record: dict, index: int) -> bool:
        self.processed += 1
        
        if not record.get('name'):
            self.errors.append(f"Row {index}: Missing critical claims (Name).")
            return False
            
        if not record.get('address'):
            self.errors.append(f"Row {index}: Missing critical claims (Address).")
            return False

        self.passed += 1
        return True

    def report(self):
        print("\n--- Live Government Data Audit Log ---")
        print(f"Total Processed: {self.processed}")
        print(f"Total Passed:    {self.passed}")
        print(f"Total Failed:    {len(self.errors)}")
        if self.errors:
            print("\nError Evidence:")
            for err in self.errors[:5]:
                print(f" - {err}")
        print("--------------------------------------\n")

def fetch_and_sync_taoyuan_care_centers():
    csv_url = "https://opendata.tycg.gov.tw/api/dataset/7e076556-a8f1-4449-b4de-4389954a25da/resource/f4b17e39-0560-4c2d-815d-b50b15a9880d/download"
    
    print("Establishing connection to Taoyuan Open Data API...")
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(csv_url, headers=headers, timeout=15)
        response.raise_for_status()
        
        with open("live_gov_data.csv", "wb") as f:
            f.write(response.content)
            
        try:
            df = pd.read_csv("live_gov_data.csv", encoding='utf-8')
        except UnicodeDecodeError:
            try:
                df = pd.read_csv("live_gov_data.csv", encoding='big5')
            except UnicodeDecodeError:
                df = pd.read_csv("live_gov_data.csv", encoding='cp950')
                
    except Exception as e:
        print(f"Fatal Error: Failed to fetch or decode data: {e}")
        return

    audit = EvidenceAuditLog()
    valid_records = []

    print("Executing exact-match feature extraction...")
    for index, row in df.iterrows():
        # Hardcoded mapping using the exact diagnostic headers
        district_val = str(row.get('行政區', '')).strip()
        if district_val and not district_val.endswith('區'):
            district_val += '區'
            
        extracted_features = {
            "name": str(row.get('服務單位', '')).strip(),
            "district": district_val,
            "address": str(row.get('地址', '')).strip(),
            "phone": str(row.get('電話', '')).strip(),
            "care_type": str(row.get('服務項目', '')).strip(),
            "capacity": 0,  # Column not present in this dataset
            "evaluation_score": "無資料" # Column not present in this dataset
        }
        
        # Skip trailing empty rows often found in government CSVs
        if extracted_features["name"] == 'nan' or not extracted_features["name"]:
            continue
            
        if audit.validate_record(extracted_features, index):
            valid_records.append(extracted_features)

    audit.report()

    if not valid_records:
        print("Dataset failed validation. No records inserted.")
        return

    print("Syncing validated dataset to Supabase PostgreSQL...")
    try:
        # Wipe the entire table to remove the ghost "混合型" data
        supabase.table('care_centers').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        
        response = supabase.table('care_centers').insert(valid_records).execute()
        inserted_count = len(response.data) if hasattr(response, 'data') else "unknown number of"
        print(f"Success! {inserted_count} exact records safely pushed.")
    except Exception as e:
        print(f"Database insertion failed: {e}")

if __name__ == "__main__":
    fetch_and_sync_taoyuan_care_centers()