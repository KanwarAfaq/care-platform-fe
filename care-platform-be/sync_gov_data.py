import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def sync_care_centers(csv_url: str):
    print("📥 Fetching latest open data from Government API/CSV...")
    
    try:
        # Fetch and read the dataset (MOHW usually provides Big5 or UTF-8 CSVs)
        # We use pandas to easily handle missing values and columns
        df = pd.read_csv(csv_url)
        
        # Clean column names (strip whitespace)
        df.columns = df.columns.str.strip()
        
        # We assume the official CSV has columns similar to these:
        # "機構名稱", "地址", "聯絡電話", "核定床位", "核定服務人數", "所屬縣市", "所屬行政區"
        
        records_to_insert = []
        
        for index, row in df.iterrows():
            # Check beds first; if missing or 0, check service people
            beds = pd.to_numeric(row.get("核定床位", 0), errors='coerce')
            people = pd.to_numeric(row.get("核定服務人數", 0), errors='coerce')
            
            # Fill NaNs with 0
            beds = 0 if pd.isna(beds) else int(beds)
            people = 0 if pd.isna(people) else int(people)
            
            # The actual capacity is the highest valid number
            actual_capacity = max(beds, people)
            
            # Construct the clean record
            record = {
                "name": str(row.get("機構名稱", "Unknown")),
                "address": str(row.get("地址", "")),
                "phone": str(row.get("聯絡電話", "")),
                "district": str(row.get("所屬行政區", "")), 
                "capacity": actual_capacity
            }
            records_to_insert.append(record)
            
        print(f"🧹 Cleaned {len(records_to_insert)} records. Pushing to Supabase...")
        
        # Upsert the data into Supabase (requires 'name' or 'id' to be unique to avoid duplicates)
        # Using a loop to avoid payload size limits on large datasets
        for batch in [records_to_insert[i:i + 100] for i in range(0, len(records_to_insert), 100)]:
            response = supabase.table('care_centers').upsert(batch).execute()
            
        print("✅ Supabase sync complete! All capacities are accurately updated.")
        
    except Exception as e:
        print(f"❌ Error syncing data: {e}")

if __name__ == "__main__":
    # Replace this URL with the live CSV link from data.gov.tw when you have the exact dataset
    #GOV_DATA_URL = "https://raw.githubusercontent.com/your-repo/sample-care-data.csv" 
    
    # Alternatively, you can point this to a local downloaded CSV file:
    GOV_DATA_URL = "taoyuan_care_centers.csv"
    
    sync_care_centers(GOV_DATA_URL)