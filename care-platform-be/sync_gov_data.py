import os
import requests
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

# Load Supabase credentials from a .env file
load_dotenv()
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

class EvidenceAuditLog:
    """Tracks and validates dataset consistency before database insertion."""
    def __init__(self):
        self.errors = []
        self.processed = 0
        self.passed = 0

    def validate_record(self, record: dict, index: int) -> bool:
        self.processed += 1
        
        # Recalculate and verify numerical metrics
        try:
            capacity = int(record.get('立案床數', 0))
            if capacity < 0:
                self.errors.append(f"Row {index} [{record.get('機構名稱')}]: Mathematical inconsistency detected (Negative capacity).")
                return False
        except ValueError:
            self.errors.append(f"Row {index} [{record.get('機構名稱')}]: Capacity is not a valid number.")
            return False

        # Ensure essential fields exist
        if not record.get('機構名稱') or not record.get('地址'):
            self.errors.append(f"Row {index}: Missing critical claims (Name or Address).")
            return False

        self.passed += 1
        return True

    def report(self):
        print("\n--- Data Audit Log Report ---")
        print(f"Total Processed: {self.processed}")
        print(f"Total Passed:    {self.passed}")
        print(f"Total Failed:    {len(self.errors)}")
        if self.errors:
            print("\nError Evidence:")
            for err in self.errors[:5]: # Print first 5 errors
                print(f" - {err}")
            if len(self.errors) > 5:
                print(f"   ... and {len(self.errors) - 5} more.")
        print("-----------------------------\n")

def fetch_and_sync_taoyuan_care_centers():
    # Taoyuan Long-Term Care Open Data CSV endpoint
    # (Using a standard open data proxy link for Taoyuan Social Affairs Bureau)
    csv_url = "https://data.tycg.gov.tw/opendata/datalist/datasetMeta/download?id=f4cc0b12-86ac-40f9-8745-885bddc18c79&rid=541539fb-05dc-42bb-9547-75e18ef5dc04"
    
    print("Downloading dataset...")
    try:
        df = pd.read_csv(csv_url)
    except Exception as e:
        print(f"Failed to fetch data: {e}")
        return

    # Filter for Taoyuan City just in case the dataset contains other regions
    if '鄉鎮市區' in df.columns:
        df = df.dropna(subset=['鄉鎮市區'])

    audit = EvidenceAuditLog()
    valid_records = []

    print("Auditing claims and extracting features...")
    for index, row in df.iterrows():
        record = row.to_dict()
        
        if audit.validate_record(record, index):
            # Map standard open data columns to our database schema
            valid_records.append({
                "name": str(record.get('機構名稱', '')).strip(),
                "district": str(record.get('鄉鎮市區', '')).strip(),
                "address": str(record.get('地址', '')).strip(),
                "phone": str(record.get('電話', '')).strip(),
                "care_type": str(record.get('收容對象', '未分類')).strip(),
                "capacity": int(record.get('立案床數', 0)),
                "evaluation_score": str(record.get('最近1次評鑑成績', '無資料')).strip()
            })

    audit.report()

    if not valid_records:
        print("No valid records to upload. Aborting sync.")
        return

    print("Pushing validated data to Supabase...")
    # Batch insert into Supabase
    try:
        response = supabase.table('care_centers').insert(valid_records).execute()
        print(f"Successfully inserted {len(response.data)} records into the database.")
    except Exception as e:
        print(f"Database insertion failed: {e}")

if __name__ == "__main__":
    fetch_and_sync_taoyuan_care_centers()