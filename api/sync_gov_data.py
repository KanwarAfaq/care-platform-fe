import os
import requests
import csv
import io
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. Load your Supabase credentials
load_dotenv()
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def fetch_and_sync_data():
    print("Fetching live CSV data from Taoyuan Open Data platform...")
    
    # 2. Taoyuan City Long-Term Care Open Data CSV URL
    csv_url = "https://opendata.tycg.gov.tw/api/dataset/7e076556-a8f1-4449-b4de-4389954a25da/resource/f4b17e39-0560-4c2d-815d-b50b15a9880d/download"
    
    try:
        # Download the CSV
        response = requests.get(csv_url)
        response.raise_for_status() # Check for download errors
        
        # Decode the CSV content 
        # (Taiwan Govt CSVs often use utf-8 with BOM, 'utf-8-sig' handles this cleanly)
        response.encoding = 'big5' 
        csv_text = response.text
        
        # Parse the CSV text into dictionaries
        reader = csv.DictReader(io.StringIO(csv_text))
        
        # --- NEW DEBUG LINES ---
    
        # -----------------------
        
        formatted_data = []
        
        # 3. Clean and map the data to match your Supabase columns
        # 3. Clean and map the data to match your Supabase columns
        for row in reader:
            # Keys now exactly match the printed headers
            name = row.get("服務單位", "").strip()
            district = row.get("行政區", "").strip()
            address = row.get("地址", "").strip()
            phone = row.get("電話", "").strip()
            
            # Since this specific dataset doesn't have a "核定床位" (capacity) column, 
            # we will safely default it to 0.
            capacity = 0 
            
            # Skip empty rows to prevent database errors
            if not name:
                continue
                
            formatted_data.append({
                "name": name,
                "district": district,
                "address": address,
                "phone": phone,
                "capacity": capacity
            })
            
        print(f"Prepared {len(formatted_data)} records. Upserting to database...")
        
        # 4. Bulk Upsert into Supabase
        if formatted_data:
            response = supabase.table("care_centers").upsert(
                formatted_data, 
                on_conflict="name" 
            ).execute()
            print("✅ Sync complete! Database is up to date with live Taoyuan data.")
        else:
            print("⚠️ No data was parsed. Please check if the government changed their CSV column headers.")

    except Exception as e:
        print(f"❌ Error syncing data: {e}")

if __name__ == "__main__":
    fetch_and_sync_data()