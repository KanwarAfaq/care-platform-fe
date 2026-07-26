from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update for Vercel later
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserProfile(BaseModel):
    cms_level: int
    income_status: str # "general", "mid_low", "low"

@app.post("/api/calculate-subsidy")
def calculate_subsidy(profile: UserProfile):
    # CMS Level 2 to 8 Caps
    care_caps = {2: 10020, 3: 15460, 4: 18580, 5: 24100, 6: 28070, 7: 32090, 8: 36180}
    
    # Co-pay logic
    copay_rates = {"general": 0.16, "mid_low": 0.05, "low": 0.0}
    
    care_cap = care_caps.get(profile.cms_level, 0)
    rate = copay_rates.get(profile.income_status, 0.16)
    
    government_pays = care_cap * (1 - rate)
    user_pays = care_cap * rate
    
    return {
        "monthly_care_cap": care_cap,
        "government_subsidy": round(government_pays),
        "user_copay": round(user_pays),
        "transport_cap_taoyuan": 1840
    }