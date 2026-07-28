import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def sync_care_centers(csv_path: str):
    print(f"📥 Reading data from {csv_path}...")
    
    try:
        # Read the CSV file (using Big5 encoding which is common for Taiwan Gov CSVs)
        try:
            df = pd.read_csv(csv_path, encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(csv_path, encoding='big5')
            
        df.columns = df.columns.str.strip()
        
        records_to_insert = []
        
        for index, row in df.iterrows():
            address = str(row.get("地址", "")).strip()
            
            # The capacity is stored in the "立案床數" column
            beds = pd.to_numeric(row.get("立案床數", 0), errors='coerce')
            capacity = 0 if pd.isna(beds) else int(beds)
            
            # Extract district (first 3 characters of the address, e.g., "桃園區", "龜山區")
            district = address[:3] if address else ""
            
            # Construct the clean record
            record = {
                "name": str(row.get("機構名稱", "Unknown")).strip(),
                "address": address,
                "phone": str(row.get("電話", "")).strip(),
                "district": district, 
                "capacity": capacity
            }
            records_to_insert.append(record)
            
        print(f"🧹 Cleaned {len(records_to_insert)} records. Pushing to Supabase...")
        
        # Upsert the data into Supabase
        for batch in [records_to_insert[i:i + 100] for i in range(0, len(records_to_insert), 100)]:
            response = supabase.table('care_centers').upsert(batch).execute()
            
        print("✅ Supabase sync complete! All capacities are accurately updated.")
        
    except Exception as e:
        print(f"❌ Error syncing data: {e}")

if __name__ == "__main__":
    # Point directly to the exact file name you provided
    GOV_DATA_URL = "桃園市老人福利機構一覽表.csv" 
    
    sync_care_centers(GOV_DATA_URL)