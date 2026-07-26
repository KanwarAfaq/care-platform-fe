import pandas as pd

# Load the file we already downloaded
try:
    df = pd.read_csv("live_gov_data.csv", encoding='utf-8')
except UnicodeDecodeError:
    try:
        df = pd.read_csv("live_gov_data.csv", encoding='big5')
    except UnicodeDecodeError:
        df = pd.read_csv("live_gov_data.csv", encoding='cp950')

print("\n--- EXACT COLUMN HEADERS ---")
print(df.columns.tolist())
print("\n--- FIRST ROW OF RAW DATA ---")
print(df.head(1).to_dict('records')[0])
print("-----------------------------\n")