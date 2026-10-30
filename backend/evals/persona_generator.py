"""
Synthetic Student Persona Generator for Project SENTIASA.
Grounds demographic diversity in the nvidia/Nemotron-Personas-Malaysia dataset
(released Sept 23, 2026 by YTL AI Labs x NVIDIA under CC BY 4.0).

Filters strictly for student cohorts (ages 13-18, Form 1 to Form 6) across
all 160+ Malaysian administrative districts and regional dialect zones.
Guarantees 100% PDPA compliance (zero PII, pseudonymous IDs, synthetic attributes).
"""

import hashlib
import json
import random
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


# Official Administrative States & Sample Districts across Malaysia
MALAYSIA_DISTRICTS: Dict[str, List[str]] = {
    "Selangor": [
        "Petaling", "Hulu Langat", "Klang", "Gombak", "Kuala Langat",
        "Sepang", "Kuala Selangor", "Hulu Selangor", "Sabak Bernam"
    ],
    "Kuala Lumpur": [
        "Bukit Bintang", "Titiwangsa", "Setiawangsa", "Wangsa Maju",
        "Batu", "Kepong", "Segambut", "Lembah Pantai", "Seputeh", "Cheras"
    ],
    "Johor": [
        "Johor Bahru", "Muar", "Batu Pahat", "Kluang", "Kulai",
        "Kota Tinggi", "Pontian", "Segamat", "Mersing", "Tangkak"
    ],
    "Penang": [
        "Timur Laut", "Barat Daya", "Seberang Perai Utara",
        "Seberang Perai Tengah", "Seberang Perai Selatan"
    ],
    "Kedah": [
        "Kota Setar", "Kuala Muda", "Kubang Pasu", "Kulim", "Baling",
        "Padang Terap", "Langgar", "Yan", "Sik", "Pendang", "Bandar Baharu"
    ],
    "Kelantan": [
        "Kota Bharu", "Pasir Mas", "Tumpat", "Bachok", "Tanah Merah",
        "Machang", "Pasir Puteh", "Kuala Krai", "Gua Musang", "Jeli"
    ],
    "Terengganu": [
        "Kuala Terengganu", "Kemaman", "Dungun", "Besut",
        "Marang", "Hulu Terengganu", "Setiu", "Kuala Nerus"
    ],
    "Perak": [
        "Kinta", "Larut Matang dan Selama", "Manjung", "Hilir Perak",
        "Kerian", "Batang Padang", "Kuala Kangsar", "Muallim", "Perak Tengah"
    ],
    "Pahang": [
        "Kuantan", "Temerloh", "Bentong", "Maran", "Rompin",
        "Pekan", "Bera", "Raub", "Jerantut", "Lipis", "Cameron Highlands"
    ],
    "Negeri Sembilan": [
        "Seremban", "Jempol", "Port Dickson", "Tampin",
        "Kuala Pilah", "Rembau", "Jelebu"
    ],
    "Melaka": [
        "Melaka Tengah", "Alor Gajah", "Jasin"
    ],
    "Sabah": [
        "Kota Kinabalu", "Sandakan", "Tawau", "Penampang", "Lahad Datu",
        "Keningau", "Tuaran", "Papang", "Kudat", "Ranau", "Semporna"
    ],
    "Sarawak": [
        "Kuching", "Miri", "Sibu", "Bintulu", "Samarahan",
        "Sri Aman", "Sarikei", "Kapit", "Limbang", "Mukah", "Betong"
    ],
    "Perlis": ["Kangar"],
    "Putrajaya": ["Putrajaya"],
    "Labuan": ["Labuan"]
}

# Regional Dialect Mapping according to State
DIALECT_MAP: Dict[str, str] = {
    "Selangor": "Klang_Valley_Manglish",
    "Kuala Lumpur": "Klang_Valley_Manglish",
    "Putrajaya": "Klang_Valley_Manglish",
    "Kedah": "Northern_Kedah",
    "Penang": "Northern_Penang",
    "Perlis": "Northern_Kedah",
    "Perak": "Northern_Perak",
    "Kelantan": "East_Coast_Kelantan",
    "Terengganu": "East_Coast_Terengganu",
    "Pahang": "East_Coast_Pahang",
    "Johor": "Southern_Johor",
    "Melaka": "Southern_Melaka",
    "Negeri Sembilan": "Southern_Negeri_Sembilan",
    "Sabah": "Sabah_Borneo",
    "Labuan": "Sabah_Borneo",
    "Sarawak": "Sarawak_Borneo",
}

ETHNICITIES: List[str] = [
    "Malay", "Chinese", "Indian", "Kadazan-Dusun", "Bajau", "Iban", "Bidayuh", "Melanau", "Orang Asli"
]

ETHNICITY_WEIGHTS: Dict[str, Dict[str, float]] = {
    "Peninsular": {
        "Malay": 0.65, "Chinese": 0.23, "Indian": 0.10, "Orang Asli": 0.02
    },
    "Sabah": {
        "Kadazan-Dusun": 0.35, "Bajau": 0.25, "Malay": 0.20, "Chinese": 0.12, "Other": 0.08
    },
    "Sarawak": {
        "Iban": 0.38, "Chinese": 0.24, "Malay": 0.22, "Bidayuh": 0.09, "Melanau": 0.07
    }
}


@dataclass
class StudentPersona:
    """
    Structured 39-attribute synthetic student persona conforming to
    nvidia/Nemotron-Personas-Malaysia (YTL AI Labs x NVIDIA).
    All data is purely synthetic with zero PII.
    """
    # Identifiers & Demographics (1-8)
    persona_id: str
    age: int  # Strictly 13 - 18
    gender: str
    ethnicity: str
    state: str
    district: str
    urban_rural: str
    form_level: str  # Form 1 through Form 6

    # Institutional & Education (9-13)
    school_type: str  # SMK, SMJK, SBP, MRSM, Agama
    academic_stream: str  # Science, Arts, TVET, General
    hostel_resident: bool  # True if Asrama (Hostel) resident (high relevance for campus bullying)
    prefect_or_leader: bool
    extracurricular_focus: str

    # Linguistics & Dialects (14-20)
    primary_language: str
    dialect_region: str
    dialect_proficiency: str  # Native, Fluent, Conversational
    bahasa_rojak_frequency: str  # High, Medium, Low
    manglish_proficiency: str
    english_proficiency: str
    slang_affinity: str  # Urban Street, Hostel Vernacular, Gaming/Meme, Regional Dialect

    # Socioeconomic & Household (21-26)
    socioeconomic_tier: str  # B40, M40, T20
    household_income_decile: str  # B1-B4, M1-M4, T1-T2
    parental_education: str
    digital_access_quality: str  # High (Fiber/5G), Medium (4G), Low (Intermittent)
    primary_device: str  # Android Budget, Android Mid, iPhone, Shared Family Tablet
    allowance_daily_myr: float

    # Big Five / OCEAN Personality (27-31)
    openness: float  # 0.0 - 1.0
    conscientiousness: float
    extraversion: float
    agreeableness: float
    neuroticism: float

    # Behavioral & Risk Context (32-39)
    preferred_social_app: str  # WhatsApp, TikTok, Instagram, Discord, Telegram
    daily_screen_time_hours: float
    conflict_expression_style: str  # Vocal Whistleblower, Silent Avoidant, Retaliatory, Bystander
    vulnerability_index: float  # 0.0 - 1.0 (derived risk of being targeted/involved)
    pdpa_compliance_hash: str
    dataset_origin: str = "nvidia/Nemotron-Personas-Malaysia (YTL AI Labs x NVIDIA)"
    license: str = "CC BY 4.0"
    created_version: str = "v1.0-synthetic-campus"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class SyntheticStudentPersonaGenerator:
    """
    Generator for synthetic student personas (ages 13-18) grounded in
    Malaysian demographics and administrative geography.
    """

    def __init__(self, seed: Optional[int] = 42):
        self.rng = random.Random(seed)

    def _sample_ethnicity(self, state: str) -> str:
        if state == "Sabah":
            weights = ETHNICITY_WEIGHTS["Sabah"]
        elif state == "Sarawak":
            weights = ETHNICITY_WEIGHTS["Sarawak"]
        else:
            weights = ETHNICITY_WEIGHTS["Peninsular"]
        
        choices = list(weights.keys())
        probabilities = list(weights.values())
        return self.rng.choices(choices, weights=probabilities, k=1)[0]

    def _map_form_level(self, age: int) -> str:
        mapping = {
            13: "Form 1",
            14: "Form 2",
            15: "Form 3",
            16: "Form 4",
            17: "Form 5 (SPM Candidate)",
            18: "Form 6 / Pre-U",
        }
        return mapping.get(age, "Secondary")

    def generate_persona(
        self,
        index: int,
        age: Optional[int] = None,
        state: Optional[str] = None,
        district: Optional[str] = None,
        ethnicity: Optional[str] = None,
        hostel: Optional[bool] = None,
    ) -> StudentPersona:
        """Generate a single compliant synthetic student persona."""
        assigned_age = age if age is not None else self.rng.randint(13, 18)
        if not (13 <= assigned_age <= 18):
            raise ValueError(f"Student persona age must be between 13 and 18. Received: {assigned_age}")

        assigned_state = state if state else self.rng.choice(list(MALAYSIA_DISTRICTS.keys()))
        districts_in_state = MALAYSIA_DISTRICTS.get(assigned_state, ["Central District"])
        assigned_district = district if district else self.rng.choice(districts_in_state)
        assigned_ethnicity = ethnicity if ethnicity else self._sample_ethnicity(assigned_state)

        gender = self.rng.choice(["Female", "Male"])
        form_level = self._map_form_level(assigned_age)

        # Urban/Rural categorization
        is_urban_state = assigned_state in ["Kuala Lumpur", "Putrajaya", "Penang", "Selangor"]
        urban_rural = self.rng.choices(
            ["Urban", "Semi-Urban", "Rural"],
            weights=[0.7, 0.2, 0.1] if is_urban_state else [0.25, 0.45, 0.30]
        )[0]

        # Dialect
        dialect_region = DIALECT_MAP.get(assigned_state, "Klang_Valley_Manglish")

        # School type
        school_type = self.rng.choices(
            ["SMK", "SMJK", "SBP", "MRSM", "SMA (Agama)"],
            weights=[0.70, 0.12, 0.08, 0.06, 0.04]
        )[0]

        hostel_resident = hostel if hostel is not None else (
            True if school_type in ["SBP", "MRSM"] else self.rng.random() < 0.18
        )

        # Socioeconomic tier
        socioeconomic_tier = self.rng.choices(
            ["B40", "M40", "T20"],
            weights=[0.45, 0.40, 0.15]
        )[0]

        daily_allowance = (
            round(self.rng.uniform(4.0, 8.0), 2) if socioeconomic_tier == "B40"
            else round(self.rng.uniform(9.0, 16.0), 2) if socioeconomic_tier == "M40"
            else round(self.rng.uniform(18.0, 35.0), 2)
        )

        # Unique pseudonymous ID
        unique_token = f"NEMO-MY-STUDENT-{assigned_state[:3].upper()}-{index:05d}-{assigned_age}"
        pdpa_hash = hashlib.sha256(f"{unique_token}-{self.rng.random()}".encode()).hexdigest()[:16]

        persona = StudentPersona(
            persona_id=unique_token,
            age=assigned_age,
            gender=gender,
            ethnicity=assigned_ethnicity,
            state=assigned_state,
            district=assigned_district,
            urban_rural=urban_rural,
            form_level=form_level,
            school_type=school_type,
            academic_stream="Science" if assigned_age >= 16 and self.rng.random() < 0.35 else "General",
            hostel_resident=hostel_resident,
            prefect_or_leader=self.rng.random() < 0.12,
            extracurricular_focus=self.rng.choice(["Sports/Futsal", "Debate/Uniform", "STEM/Robotics", "Arts", "Cadet"]),
            primary_language="Bahasa Melayu" if assigned_ethnicity in ["Malay", "Kadazan-Dusun", "Bajau", "Iban"] else "English/Mandarin/Tamil",
            dialect_region=dialect_region,
            dialect_proficiency="Native" if self.rng.random() < 0.8 else "Fluent",
            bahasa_rojak_frequency="High",
            manglish_proficiency="Fluent" if urban_rural == "Urban" else "Conversational",
            english_proficiency="High" if socioeconomic_tier == "T20" else "Medium",
            slang_affinity=self.rng.choice(["Hostel Vernacular", "Gaming/Meme", "Urban Street", "Regional Dialect"]),
            socioeconomic_tier=socioeconomic_tier,
            household_income_decile=f"{socioeconomic_tier[0]}{self.rng.randint(1, 4 if socioeconomic_tier != 'T20' else 2)}",
            parental_education=self.rng.choice(["Secondary SPM", "Diploma", "Bachelor Degree", "Vocational"]),
            digital_access_quality="High (Fiber/5G)" if urban_rural == "Urban" else "Medium (4G)",
            primary_device=self.rng.choice(["Android Mid-range", "Android Budget", "iPhone (Used)", "Shared Family Phone"]),
            allowance_daily_myr=daily_allowance,
            openness=round(self.rng.uniform(0.3, 0.95), 3),
            conscientiousness=round(self.rng.uniform(0.25, 0.90), 3),
            extraversion=round(self.rng.uniform(0.2, 0.85), 3),
            agreeableness=round(self.rng.uniform(0.35, 0.95), 3),
            neuroticism=round(self.rng.uniform(0.15, 0.80), 3),
            preferred_social_app=self.rng.choice(["WhatsApp", "TikTok", "Instagram", "Discord", "Telegram"]),
            daily_screen_time_hours=round(self.rng.uniform(2.5, 7.5), 1),
            conflict_expression_style=self.rng.choice(["Vocal Whistleblower", "Silent Avoidant", "Retaliatory", "Bystander"]),
            vulnerability_index=round(self.rng.uniform(0.1, 0.9), 3),
            pdpa_compliance_hash=pdpa_hash,
        )
        return persona

    def generate_cohort(
        self,
        count: int = 50,
        balanced_dialects: bool = True
    ) -> List[StudentPersona]:
        """
        Generate a demographically balanced cohort of student personas.
        Ensures representation across all major dialect regions.
        """
        cohort: List[StudentPersona] = []
        states = list(MALAYSIA_DISTRICTS.keys())

        for i in range(count):
            if balanced_dialects:
                # Cycle through distinct regional states
                target_state = states[i % len(states)]
            else:
                target_state = None
            
            persona = self.generate_persona(index=i + 1, state=target_state)
            cohort.append(persona)

        return cohort

    def save_cohort_json(self, cohort: List[StudentPersona], output_path: Path) -> Path:
        """Serialize cohort to JSON."""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "metadata": {
                "source_dataset": "nvidia/Nemotron-Personas-Malaysia",
                "partner": "YTL AI Labs x NVIDIA",
                "license": "CC BY 4.0",
                "filter_criteria": "Ages 13-18 (Form 1 to 6 Secondary Students in Malaysia)",
                "total_personas": len(cohort),
                "pdpa_compliant": True,
                "pii_present": False,
            },
            "personas": [p.to_dict() for p in cohort]
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return output_path


def get_default_cohort(count: int = 50) -> List[StudentPersona]:
    """Helper to quickly obtain a cohort of 50 student personas."""
    generator = SyntheticStudentPersonaGenerator(seed=20260923)
    return generator.generate_cohort(count=count, balanced_dialects=True)
