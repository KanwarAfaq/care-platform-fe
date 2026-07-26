import os
import time
import requests
import re
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

class GeocodingAuditLog:
    def __init__(self):
        self.processed = 0
        self.success = 0
        self.failures = []

    def log_success(self, name, lat, lon):
        self.processed += 1
        self.success += 1
        print(f"[✓] {name[:15]}... mapped successfully.")

    def log_failure(self, name, address, reason):
        self.processed += 1
        self.failures.append(f"{name} ({address}) - {reason}")
        print(f"[X] {name[:15]}... Failed ({reason})")

    def report(self):
        print("\n--- Geocoding Evidence-Audit Log ---")
        print(f"Total Processed: {self.processed}")
        print(f"Successfully Mapped: {self.success}")
        print(f"Failed to Locate: {len(self.failures)}\n")

def clean_taiwan_address(address):
    """Aggressively formats Taiwanese addresses for OpenStreetMap compatibility."""
    # 1. Truncate everything after the building number (removes '3樓', '之2', etc.)
    if '號' in address:
        address = address.split('號')[0] + '號'
        
    # 2. Remove Village (里) and Neighborhood (鄰) markers
    address = re.sub(r'[\u4e00-\u9fa5]+里', '', address) 
    address = re.sub(r'\d+鄰', '', address)
    
    # 3. Strip any weird leading/trailing characters
    return address.strip()

def geocode_database():
    print("Fetching unmapped records from database...")
    response = supabase.table('care_centers').select('id, name, address').is_('latitude', 'null').execute()
    records = response.data
    
    if not records:
        print("All records are already geocoded.")
        return

    audit = GeocodingAuditLog()

    for record in records:
        # A highly specific User-Agent is strictly required by OSM policies
        headers = {'User-Agent': 'TaoyuanCarePlatform_Research_Project/1.0 (contact@example.com)'}
        
        cleaned_address = clean_taiwan_address(record['address'])
        # If the address doesn't already say Taoyuan City, prepend it
        if "桃園市" not in cleaned_address:
            cleaned_address = f"桃園市{cleaned_address}"
            
        api_url = f"https://nominatim.openstreetmap.org/search?q={cleaned_address}&format=json&limit=1"
        
        try:
            res = requests.get(api_url, headers=headers, timeout=10)
            
            # Prevent JSON crash if API blocks us
            if res.status_code != 200:
                audit.log_failure(record['name'], cleaned_address, f"HTTP Block: {res.status_code}")
                time.sleep(3) # Back off if rate limited
                continue
                
            try:
                data = res.json()
            except Exception:
                audit.log_failure(record['name'], cleaned_address, "Failed to parse API response.")
                time.sleep(2)
                continue
            
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                
                supabase.table('care_centers').update({
                    'latitude': lat, 
                    'longitude': lon
                }).eq('id', record['id']).execute()
                
                audit.log_success(record['name'], lat, lon)
            else:
                audit.log_failure(record['name'], cleaned_address, "Not found in OSM DB")
                
        except Exception as e:
            audit.log_failure(record['name'], cleaned_address, f"Connection Error: {str(e)}")
            
        # Strict 1.5-second delay to guarantee we stay under the OSM rate limit
        time.sleep(1.5)

    audit.report()

if __name__ == "__main__":
    geocode_database()