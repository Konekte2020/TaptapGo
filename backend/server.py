from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional, Dict, Any, Tuple
import uuid
from datetime import datetime, timedelta
import random
import jwt
import bcrypt
import base64
from supabase import create_client, Client
import json
import math
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from services.build_service import BuildService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


def _load_politik_content() -> str:
    """Charge la politique de confidentialité depuis le fichier texte."""
    try:
        p = ROOT_DIR / "support_politik_content.txt"
        if p.exists():
            return p.read_text(encoding="utf-8")
    except Exception:
        pass
    return "Politik Konfidansyalite — TapTapGo\n\nKontni pa konfigirasyon."

# Configuration requise (pas de valeurs par défaut en production)
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
JWT_SECRET = os.environ.get('JWT_SECRET')
if not all([SUPABASE_URL, SUPABASE_KEY, JWT_SECRET]):
    raise RuntimeError(
        "Variables d'environnement manquantes: SUPABASE_URL, SUPABASE_KEY, JWT_SECRET. "
        "Voir backend/.env.example et définir un fichier .env."
    )
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')

# CORS: en production définir CORS_ORIGINS (ex: https://app.example.com,https://admin.example.com)
_cors_raw = (os.environ.get('CORS_ORIGINS') or '*').strip()
CORS_ORIGINS = ['*'] if _cors_raw == '*' else [o.strip() for o in _cors_raw.split(',') if o.strip()]

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Build Service
build_service = BuildService(supabase)

# Create the main app
app = FastAPI(title="TapTapGo API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Règles de retrait (wallet chauffeur)
REGLES_RETRAIT = {
    "montant_minimum": 500,
    "seuil_automatique": 1000,
    "delai_entre_retraits_heures": 24,
    "frais_retrait": 0,
}

def create_notification(user_id: str, user_type: str, title: str, body: str):
    """Create an in-app notification"""
    try:
        supabase.table("notifications").insert({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_type": user_type,
            "title": title,
            "body": body
        }).execute()
    except Exception as e:
        logger.error(f"Notification error: {e}")


def _get_or_create_wallet(chauffeur_id: str) -> dict:
    """Get or create driver_wallets row; sync balance from drivers.wallet_balance if new."""
    r = supabase.table("driver_wallets").select("*").eq("chauffeur_id", chauffeur_id).execute()
    if r.data and len(r.data) > 0:
        return r.data[0]
    driver = supabase.table("drivers").select("wallet_balance").eq("id", chauffeur_id).execute()
    initial = float(driver.data[0].get("wallet_balance") or 0) if driver.data else 0
    row = {
        "chauffeur_id": chauffeur_id,
        "balance": initial,
        "balance_en_attente": 0,
        "total_gagne": initial,
        "total_retire": 0,
        "updated_at": datetime.utcnow().isoformat(),
    }
    supabase.table("driver_wallets").insert(row).execute()
    return row


def _credit_driver_wallet_after_ride(ride_id: str, driver_id: str, final_price: float, city: Optional[str], admin_id: Optional[str]) -> None:
    """After ride completed: apply commission, credit driver wallet, insert driver_transaction."""
    try:
        commission_pct = 15.0
        if city:
            city_row = supabase.table("cities").select("system_commission").eq("name", city).limit(1).execute()
            if city_row.data:
                commission_pct = float(city_row.data[0].get("system_commission") or 15)
        if admin_id:
            admin_row = supabase.table("admins").select("commission_rate").eq("id", admin_id).limit(1).execute()
            if admin_row.data and admin_row.data[0].get("commission_rate") is not None:
                commission_pct = float(admin_row.data[0]["commission_rate"])
        commission_htg = round(final_price * (commission_pct / 100), 2)
        gain_chauffeur = round(final_price - commission_htg, 2)
        wallet = _get_or_create_wallet(driver_id)
        new_balance = float(wallet.get("balance") or 0) + gain_chauffeur
        new_total_gagne = float(wallet.get("total_gagne") or 0) + gain_chauffeur
        supabase.table("driver_wallets").update({
            "balance": new_balance,
            "total_gagne": new_total_gagne,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("chauffeur_id", driver_id).execute()
        supabase.table("drivers").update({
            "wallet_balance": new_balance,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", driver_id).execute()
        supabase.table("driver_transactions").insert({
            "chauffeur_id": driver_id,
            "ride_id": ride_id,
            "type_txn": "course_completed",
            "montant": gain_chauffeur,
            "montant_total": final_price,
            "commission_taptapgo": commission_htg,
            "gain_chauffeur": gain_chauffeur,
            "statut": "ok",
        }).execute()
        create_notification(
            driver_id,
            "driver",
            "Revni ajoute",
            f"+{gain_chauffeur:.0f} HTG ajoute nan wallet ou. Balans: {new_balance:.0f} HTG.",
        )
    except Exception as e:
        logger.error(f"Credit driver wallet after ride error: {e}")


def calculate_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine distance in km for nearby matching"""
    r = 6371
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def estimate_eta_minutes(distance_km: float) -> int:
    """Simple ETA estimate"""
    return max(2, int(round(distance_km * 3)))


def generate_contact_code() -> str:
    return ''.join(str(random.randint(0, 9)) for _ in range(6))


def resolve_admin_id(admin_id: Optional[str]) -> Optional[str]:
    if not admin_id:
        return None
    result = supabase.table("admins").select("id,is_active").eq("id", admin_id).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Admin pa jwenn")
    if not result.data[0].get("is_active", True):
        raise HTTPException(status_code=400, detail="Admin inaktif")
    return admin_id

# ============== PYDANTIC MODELS ==============

# Auth Models
class UserRegisterPassenger(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    city: str
    password: str
    profile_photo: Optional[str] = None  # base64
    admin_id: Optional[str] = None

class UserRegisterDriver(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    city: str
    vehicle_type: str  # 'moto' or 'car'
    vehicle_brand: str
    vehicle_model: str
    vehicle_color: Optional[str] = None
    plate_number: str
    vehicle_photo: Optional[str] = None  # base64
    license_photo: Optional[str] = None  # base64
    vehicle_papers: Optional[str] = None  # base64
    casier_judiciaire: Optional[str] = None  # base64 — obligatwa pou pase an liy
    profile_photo: Optional[str] = None  # base64
    password: str
    admin_id: Optional[str] = None

class AdminDriverCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    city: str
    vehicle_type: str
    vehicle_brand: str
    vehicle_model: str
    vehicle_color: Optional[str] = None
    plate_number: str
    vehicle_photo: Optional[str] = None
    license_photo: Optional[str] = None
    vehicle_papers: Optional[str] = None
    profile_photo: Optional[str] = None
    password: str

class LoginRequest(BaseModel):
    phone_or_email: str
    password: str
    user_type: str  # 'passenger', 'driver', 'admin', 'superadmin'

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    code: str

class PasswordResetRequest(BaseModel):
    identifier: str  # phone or email
    channel: str  # 'phone' or 'email'
    user_type: str  # 'passenger', 'driver', 'admin', 'subadmin', 'superadmin'

class DriverVehicleCreate(BaseModel):
    vehicle_type: str  # 'moto' or 'car'
    vehicle_brand: str
    vehicle_model: str
    plate_number: str
    vehicle_color: Optional[str] = None

class PasswordResetConfirm(BaseModel):
    identifier: str
    channel: str
    user_type: str
    code: str
    new_password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class PricingUpdate(BaseModel):
    base_fare: Optional[float] = None
    price_per_km: Optional[float] = None
    price_per_min: Optional[float] = None
    base_fare_moto: Optional[float] = None
    base_fare_car: Optional[float] = None
    price_per_km_moto: Optional[float] = None
    price_per_km_car: Optional[float] = None
    price_per_min_moto: Optional[float] = None
    price_per_min_car: Optional[float] = None
    commission_rate: Optional[float] = None

class AdminCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    address: Optional[str] = None
    force_password_change: Optional[bool] = True
    cities: List[str] = []  # Cities this admin manages
    brand_name: Optional[str] = None
    logo: Optional[str] = None  # base64
    primary_color: Optional[str] = "#E53935"
    secondary_color: Optional[str] = "#1E3A5F"
    tertiary_color: Optional[str] = "#F4B400"

class AdminUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    force_password_change: Optional[bool] = None
    cities: Optional[List[str]] = None
    brand_name: Optional[str] = None
    logo: Optional[str] = None  # base64
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    tertiary_color: Optional[str] = None
    commission_rate: Optional[float] = None
    is_active: Optional[bool] = None

class AdminPricingUpdate(BaseModel):
    base_fare: Optional[float] = None
    price_per_km: Optional[float] = None
    price_per_min: Optional[float] = None
    base_fare_moto: Optional[float] = None
    base_fare_car: Optional[float] = None
    price_per_km_moto: Optional[float] = None
    price_per_km_car: Optional[float] = None
    price_per_min_moto: Optional[float] = None
    price_per_min_car: Optional[float] = None
    surge_multiplier: float = 1.0
    commission_rate: float = 0

class AdminPaymentMethodsUpdate(BaseModel):
    moncash_enabled: bool = False
    moncash_phone: Optional[str] = None
    natcash_enabled: bool = False
    natcash_phone: Optional[str] = None
    bank_enabled: bool = False
    bank_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    default_method: Optional[str] = None

class DriverReminderRequest(BaseModel):
    driver_id: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None

class BuildRequest(BaseModel):
    brand_id: str
    company_name: str
    logo: str  # base64
    primary_color: str
    secondary_color: str
    tertiary_color: str
    local_only: Optional[bool] = False
    build_mode: Optional[str] = "local"  # local | cloud


class BuildSubmitRequest(BaseModel):
    build_id: str
    track: Optional[str] = "internal"  # internal | alpha | beta | production

class ComplaintCreate(BaseModel):
    target_user_type: str  # 'driver' or 'passenger'
    target_user_id: str
    message: str
    ride_id: Optional[str] = None

class SubAdminCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    force_password_change: Optional[bool] = True

class SuperAdminCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str

# City & Pricing Models
class CityCreate(BaseModel):
    name: str
    base_fare_moto: float = 50.0  # HTG
    base_fare_car: float = 100.0  # HTG
    price_per_km_moto: float = 25.0
    price_per_km_car: float = 50.0
    price_per_min_moto: float = 5.0
    price_per_min_car: float = 10.0
    surge_multiplier: float = 1.0
    system_commission: float = 15.0  # percentage
    is_active: bool = True

class CityUpdate(BaseModel):
    name: Optional[str] = None
    base_fare_moto: Optional[float] = None
    base_fare_car: Optional[float] = None
    price_per_km_moto: Optional[float] = None
    price_per_km_car: Optional[float] = None
    price_per_min_moto: Optional[float] = None
    price_per_min_car: Optional[float] = None
    surge_multiplier: Optional[float] = None
    system_commission: Optional[float] = None
    is_active: Optional[bool] = None

# Ride Models
class RideRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    pickup_address: str
    destination_lat: float
    destination_lng: float
    destination_address: str
    vehicle_type: str  # 'moto' or 'car'
    estimated_distance: float  # km
    estimated_duration: float  # minutes
    estimated_price: float
    scheduled_at: Optional[str] = None
    payment_method: Optional[str] = "cash"

class RideStatusUpdate(BaseModel):
    status: str  # 'accepted', 'arrived', 'started', 'completed', 'cancelled'
    reason: Optional[str] = None

class RideRating(BaseModel):
    rating: int  # 1-5
    comment: Optional[str] = None


class WithdrawRequest(BaseModel):
    montant: float
    methode: str  # 'moncash' | 'natcash' | 'bank'

class TestRideRequest(BaseModel):
    driver_id: Optional[str] = None
    admin_id: Optional[str] = None
    vehicle_type: Optional[str] = None  # 'moto' or 'car'
    city: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    pickup_address: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    destination_address: Optional[str] = None

# Location Update
class LocationUpdate(BaseModel):
    lat: float
    lng: float

# Vehicle Brands for Haiti
VEHICLE_BRANDS = {
    "Toyota": ["Corolla", "Camry", "RAV4", "Hilux", "Land Cruiser", "Yaris", "4Runner", "Tacoma"],
    "Honda": ["Civic", "Accord", "CR-V", "Pilot", "HR-V", "Fit"],
    "Nissan": ["Sentra", "Altima", "Rogue", "Pathfinder", "Frontier", "Versa"],
    "Hyundai": ["Elantra", "Sonata", "Tucson", "Santa Fe", "Accent", "Kona"],
    "Kia": ["Rio", "Optima", "Sportage", "Sorento", "Seltos", "Forte"],
    "Mazda": ["Mazda3", "Mazda6", "CX-5", "CX-9"],
    "Suzuki": ["Swift", "Vitara", "Jimny", "Alto"],
    "Mitsubishi": ["Lancer", "Outlander", "Pajero", "L200"],
    "Ford": ["Focus", "Fusion", "Escape", "Explorer", "F-150", "Ranger"],
    "Chevrolet": ["Cruze", "Malibu", "Equinox", "Silverado"],
    "Jeep": ["Wrangler", "Cherokee", "Grand Cherokee", "Compass"],
    "Isuzu": ["D-Max", "MU-X", "NHR", "NKR"]
}

MOTO_BRANDS = {
    "Honda": ["CG 125", "CG 150", "Wave", "CB 125", "XR 150", "Navi"],
    "Yamaha": ["YBR 125", "FZ 150", "Crypton", "BWS"],
    "Suzuki": ["GN 125", "AX 100", "GSX 125"],
    "TVS": ["Apache", "Star City", "Sport", "XL 100"],
    "Bajaj": ["Boxer", "Pulsar", "Discover", "Platina"],
    "Hero": ["Splendor", "Passion", "HF Deluxe"],
    "Lifan": ["LF 125", "LF 150", "LF 200"],
    "Haojue": ["HJ 125", "HJ 150"]
}

# ============== HELPER FUNCTIONS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, user_type: str, admin_id: Optional[str] = None) -> str:
    payload = {
        'user_id': user_id,
        'user_type': user_type,
        'admin_id': admin_id,
        'exp': datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = decode_token(credentials.credentials)
    return token_data

def generate_otp() -> str:
    """Generate mock OTP for development"""
    return "123456"  # Mock OTP

def calculate_ride_price(
    city_data: dict,
    distance_km: float,
    duration_min: float,
    pricing_data: Optional[dict] = None,
    vehicle_type: str = "moto",
) -> dict:
    """Calculate ride price. vehicle_type: 'moto' or 'car'. Uses moto/car fields when present."""
    is_car = (vehicle_type or "moto").lower() == "car"
    surge = pricing_data.get("surge_multiplier", city_data.get("surge_multiplier", 1.0)) if pricing_data else city_data.get("surge_multiplier", 1.0)

    if pricing_data:
        if is_car:
            base = float(pricing_data.get("base_fare_car") if pricing_data.get("base_fare_car") is not None else pricing_data.get("base_fare", 0))
            per_km = float(pricing_data.get("price_per_km_car") if pricing_data.get("price_per_km_car") is not None else pricing_data.get("price_per_km", 0))
            per_min = float(pricing_data.get("price_per_min_car") if pricing_data.get("price_per_min_car") is not None else pricing_data.get("price_per_min", 0))
        else:
            base = float(pricing_data.get("base_fare_moto") if pricing_data.get("base_fare_moto") is not None else pricing_data.get("base_fare", 0))
            per_km = float(pricing_data.get("price_per_km_moto") if pricing_data.get("price_per_km_moto") is not None else pricing_data.get("price_per_km", 0))
            per_min = float(pricing_data.get("price_per_min_moto") if pricing_data.get("price_per_min_moto") is not None else pricing_data.get("price_per_min", 0))
    else:
        base = float(city_data.get("base_fare_car", 100) if is_car else city_data.get("base_fare_moto", 50))
        per_km = float(city_data.get("price_per_km_car", 50) if is_car else city_data.get("price_per_km_moto", 25))
        per_min = float(city_data.get("price_per_min_car", 10) if is_car else city_data.get("price_per_min_moto", 5))

    subtotal = base + (per_km * distance_km) + (per_min * duration_min)
    total = subtotal * surge
    return {
        "base_fare": base,
        "distance_fare": per_km * distance_km,
        "time_fare": per_min * duration_min,
        "surge_multiplier": surge,
        "subtotal": subtotal,
        "total": round(total, 2),
    }

def generate_test_coords(base_lat: float, base_lng: float, min_km: float = 1.0, max_km: float = 4.0) -> Tuple[float, float]:
    """Generate random coordinates within a radius in km"""
    distance_km = random.uniform(min_km, max_km)
    bearing = random.uniform(0, 2 * math.pi)
    dlat = (distance_km / 111) * math.cos(bearing)
    dlng = (distance_km / (111 * math.cos(math.radians(base_lat)))) * math.sin(bearing)
    return base_lat + dlat, base_lng + dlng

# ============== INITIALIZE DATABASE ==============

@api_router.post("/init-database")
async def init_database():
    """Initialize database tables"""
    try:
        # Create tables using Supabase SQL
        # Note: In production, use migrations
        tables_sql = """
        -- Users table (passengers)
        CREATE TABLE IF NOT EXISTS passengers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            city TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            profile_photo TEXT,
            wallet_balance DECIMAL DEFAULT 0,
            is_verified BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            admin_id UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Drivers table
        CREATE TABLE IF NOT EXISTS drivers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            city TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            vehicle_brand TEXT NOT NULL,
            vehicle_model TEXT NOT NULL,
            plate_number TEXT UNIQUE NOT NULL,
            vehicle_photo TEXT,
            license_photo TEXT,
            vehicle_papers TEXT,
            profile_photo TEXT,
            status TEXT DEFAULT 'pending',
            document_status TEXT DEFAULT 'pending',
            rejection_reason TEXT,
            is_online BOOLEAN DEFAULT FALSE,
            is_verified BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            current_lat DECIMAL,
            current_lng DECIMAL,
            rating DECIMAL DEFAULT 5.0,
            total_rides INTEGER DEFAULT 0,
            wallet_balance DECIMAL DEFAULT 0,
            admin_id UUID,
            verified_at TIMESTAMP,
            verified_by UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Driver verifications history
        CREATE TABLE IF NOT EXISTS driver_verifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            driver_id UUID NOT NULL,
            status TEXT NOT NULL,
            reason TEXT,
            verified_by UUID,
            created_at TIMESTAMP DEFAULT NOW()
        );

        -- Driver vehicles (plusieurs véhicules par chauffeur: machin + moto)
        CREATE TABLE IF NOT EXISTS driver_vehicles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
            vehicle_type TEXT NOT NULL,
            vehicle_brand TEXT NOT NULL,
            vehicle_model TEXT NOT NULL,
            plate_number TEXT NOT NULL,
            vehicle_color TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );

        -- Notifications table (in-app)
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            user_type TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Admins table (white-label)
        CREATE TABLE IF NOT EXISTS admins (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            address TEXT,
            force_password_change BOOLEAN DEFAULT TRUE,
            cities TEXT[] DEFAULT '{}',
            brand_name TEXT,
            logo TEXT,
            primary_color TEXT DEFAULT '#E53935',
            secondary_color TEXT DEFAULT '#1E3A5F',
            tertiary_color TEXT DEFAULT '#F4B400',
            commission_rate DECIMAL DEFAULT 10,
            base_fare DECIMAL DEFAULT 0,
            price_per_km DECIMAL DEFAULT 0,
            price_per_min DECIMAL DEFAULT 0,
            surge_multiplier DECIMAL DEFAULT 1.0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Ensure admin pricing columns exist (moto + machin)
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS base_fare DECIMAL DEFAULT 0;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS price_per_km DECIMAL DEFAULT 0;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS price_per_min DECIMAL DEFAULT 0;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS base_fare_moto DECIMAL DEFAULT 0;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS base_fare_car DECIMAL DEFAULT 0;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS price_per_km_moto DECIMAL DEFAULT 0;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS price_per_km_car DECIMAL DEFAULT 0;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS price_per_min_moto DECIMAL DEFAULT 0;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS price_per_min_car DECIMAL DEFAULT 0;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS surge_multiplier DECIMAL DEFAULT 1.0;

        -- SubAdmins table (admin assistants)
        CREATE TABLE IF NOT EXISTS subadmins (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            admin_id UUID NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            force_password_change BOOLEAN DEFAULT TRUE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- SuperAdmins table
        CREATE TABLE IF NOT EXISTS superadmins (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Cities table
        CREATE TABLE IF NOT EXISTS cities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT UNIQUE NOT NULL,
            base_fare_moto DECIMAL DEFAULT 50,
            base_fare_car DECIMAL DEFAULT 100,
            price_per_km_moto DECIMAL DEFAULT 25,
            price_per_km_car DECIMAL DEFAULT 50,
            price_per_min_moto DECIMAL DEFAULT 5,
            price_per_min_car DECIMAL DEFAULT 10,
            surge_multiplier DECIMAL DEFAULT 1.0,
            system_commission DECIMAL DEFAULT 15,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Pricing settings (platform vs white-label) — moto + machin
        CREATE TABLE IF NOT EXISTS pricing_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            scope TEXT UNIQUE NOT NULL,
            base_fare DECIMAL DEFAULT 0,
            price_per_km DECIMAL DEFAULT 0,
            price_per_min DECIMAL DEFAULT 0,
            commission_rate DECIMAL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT NOW()
        );
        ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS base_fare_moto DECIMAL DEFAULT 0;
        ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS base_fare_car DECIMAL DEFAULT 0;
        ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS price_per_km_moto DECIMAL DEFAULT 0;
        ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS price_per_km_car DECIMAL DEFAULT 0;
        ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS price_per_min_moto DECIMAL DEFAULT 0;
        ALTER TABLE pricing_settings ADD COLUMN IF NOT EXISTS price_per_min_car DECIMAL DEFAULT 0;

        -- Admin payment methods (global, per admin)
        CREATE TABLE IF NOT EXISTS admin_payment_methods (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            admin_id UUID UNIQUE NOT NULL,
            moncash_enabled BOOLEAN DEFAULT FALSE,
            moncash_phone TEXT,
            natcash_enabled BOOLEAN DEFAULT FALSE,
            natcash_phone TEXT,
            bank_enabled BOOLEAN DEFAULT FALSE,
            bank_name TEXT,
            bank_account_name TEXT,
            bank_account_number TEXT,
            default_method TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        ALTER TABLE admin_payment_methods ADD COLUMN IF NOT EXISTS default_method TEXT;

        -- Complaints
        CREATE TABLE IF NOT EXISTS complaints (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ride_id UUID,
            admin_id UUID,
            from_user_type TEXT NOT NULL,
            from_user_id UUID NOT NULL,
            target_user_type TEXT NOT NULL,
            target_user_id UUID NOT NULL,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'open',
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Rides table
        CREATE TABLE IF NOT EXISTS rides (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            passenger_id UUID REFERENCES passengers(id),
            driver_id UUID REFERENCES drivers(id),
            pickup_lat DECIMAL NOT NULL,
            pickup_lng DECIMAL NOT NULL,
            pickup_address TEXT NOT NULL,
            destination_lat DECIMAL NOT NULL,
            destination_lng DECIMAL NOT NULL,
            destination_address TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            estimated_distance DECIMAL,
            estimated_duration DECIMAL,
            estimated_price DECIMAL,
            final_price DECIMAL,
            payment_method TEXT DEFAULT 'cash',
            passenger_rating INTEGER,
            driver_rating INTEGER,
            passenger_comment TEXT,
            driver_comment TEXT,
            city TEXT,
            admin_id UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            cancelled_at TIMESTAMP,
            cancel_reason TEXT
        );
        
        -- OTP table
        CREATE TABLE IF NOT EXISTS otp_codes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            phone TEXT NOT NULL,
            code TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Favorite addresses table
        CREATE TABLE IF NOT EXISTS favorite_addresses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            user_type TEXT NOT NULL,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            lat DECIMAL NOT NULL,
            lng DECIMAL NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Transactions table
        CREATE TABLE IF NOT EXISTS transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            user_type TEXT NOT NULL,
            amount DECIMAL NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            ride_id UUID,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """
        
        # Execute via Supabase RPC or direct SQL
        # For now, return success message
        return {"message": "Database initialization requested. Please run SQL migrations in Supabase dashboard."}
    except Exception as e:
        logger.error(f"Database init error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== AUTH ENDPOINTS ==============

@api_router.get("/")
async def root():
    return {"message": "TapTapGo API v1.0", "status": "running"}


@api_router.get("/health")
async def health():
    """Health check pour load balancers et surveillance (uptime)."""
    return {"status": "ok"}


@api_router.post("/otp/send")
async def send_otp(request: OTPRequest):
    """Send OTP to phone (Mock for development)"""
    try:
        otp_code = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # Store OTP in database
        otp_data = {
            "id": str(uuid.uuid4()),
            "phone": request.phone,
            "code": otp_code,
            "expires_at": expires_at.isoformat(),
            "is_used": False
        }
        
        try:
            supabase.table("otp_codes").insert(otp_data).execute()
        except Exception as e:
            logger.warning(f"Could not save OTP to database: {e}")
        
        # In production, send SMS here
        logger.info(f"OTP for {request.phone}: {otp_code}")
        
        return {
            "success": True,
            "message": "OTP sent successfully",
            "otp": otp_code  # Only in development!
        }
    except Exception as e:
        logger.error(f"OTP send error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/otp/verify")
async def verify_otp(request: OTPVerify):
    """Verify OTP code (Mock: accepts 123456)"""
    # Mock verification - accept 123456
    if request.code == "123456":
        return {"success": True, "message": "OTP verified successfully"}
    
    try:
        result = supabase.table("otp_codes").select("*").eq("phone", request.phone).eq("code", request.code).eq("is_used", False).order("created_at", desc=True).limit(1).execute()
        
        if result.data:
            otp = result.data[0]
            if datetime.fromisoformat(otp['expires_at'].replace('Z', '')) > datetime.utcnow():
                # Mark as used
                supabase.table("otp_codes").update({"is_used": True}).eq("id", otp['id']).execute()
                return {"success": True, "message": "OTP verified successfully"}
    except Exception as e:
        logger.warning(f"OTP verification error: {e}")
    
    raise HTTPException(status_code=400, detail="Invalid or expired OTP")

@api_router.post("/auth/password-reset/request")
async def request_password_reset(data: PasswordResetRequest):
    """Request password reset by phone"""
    try:
        if data.channel not in {"phone", "email"}:
            raise HTTPException(status_code=400, detail="Invalid channel")

        table_map = {
            'passenger': 'passengers',
            'driver': 'drivers',
            'admin': 'admins',
            'subadmin': 'subadmins',
            'superadmin': 'superadmins'
        }
        table = table_map.get(data.user_type)
        if not table:
            raise HTTPException(status_code=400, detail="Invalid user type")

        lookup_field = "phone" if data.channel == "phone" else "email"
        result = supabase.table(table).select("id,phone,email").eq(lookup_field, data.identifier).execute()
        resolved_type = data.user_type

        if not result.data and data.user_type == 'admin':
            table = table_map.get('subadmin')
            result = supabase.table(table).select("id,phone,email").eq(lookup_field, data.identifier).execute()
            if result.data:
                resolved_type = 'subadmin'

        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")

        otp_code = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        otp_data = {
            "id": str(uuid.uuid4()),
            "phone": data.identifier,
            "code": otp_code,
            "expires_at": expires_at.isoformat(),
            "is_used": False
        }

        try:
            supabase.table("otp_codes").insert(otp_data).execute()
        except Exception as e:
            logger.warning(f"Could not save OTP to database: {e}")

        logger.info(f"OTP for {data.identifier}: {otp_code}")

        return {
            "success": True,
            "message": "OTP sent successfully",
            "user_type": resolved_type,
            "channel": data.channel,
            "otp": otp_code  # Only in development!
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset request error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/password-reset/confirm")
async def confirm_password_reset(data: PasswordResetConfirm):
    """Confirm password reset with OTP"""
    try:
        if data.channel not in {"phone", "email"}:
            raise HTTPException(status_code=400, detail="Invalid channel")

        table_map = {
            'passenger': 'passengers',
            'driver': 'drivers',
            'admin': 'admins',
            'subadmin': 'subadmins',
            'superadmin': 'superadmins'
        }
        table = table_map.get(data.user_type)
        if not table:
            raise HTTPException(status_code=400, detail="Invalid user type")

        lookup_field = "phone" if data.channel == "phone" else "email"
        result = supabase.table(table).select("id,phone,email").eq(lookup_field, data.identifier).execute()
        resolved_type = data.user_type

        if not result.data and data.user_type == 'admin':
            table = table_map.get('subadmin')
            result = supabase.table(table).select("id,phone,email").eq(lookup_field, data.identifier).execute()
            if result.data:
                resolved_type = 'subadmin'

        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")

        await verify_otp(OTPVerify(phone=data.identifier, code=data.code))

        supabase.table(table).update({
            "password_hash": hash_password(data.new_password),
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", result.data[0]["id"]).execute()

        return {"success": True, "message": "Password updated", "user_type": resolved_type, "channel": data.channel}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset confirm error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/register/passenger")
async def register_passenger(data: UserRegisterPassenger):
    """Register a new passenger"""
    try:
        admin_id = resolve_admin_id(data.admin_id)
        # Check if phone/email exists
        existing = supabase.table("passengers").select("id").or_(f"phone.eq.{data.phone},email.eq.{data.email}").execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Phone or email already registered")
        
        passenger_data = {
            "id": str(uuid.uuid4()),
            "full_name": data.full_name,
            "phone": data.phone,
            "email": data.email,
            "city": data.city,
            "password_hash": hash_password(data.password),
            "profile_photo": data.profile_photo,
            "wallet_balance": 0,
            "is_verified": True,  # Set to True after OTP in production
            "is_active": True,
            "admin_id": admin_id
        }
        
        result = supabase.table("passengers").insert(passenger_data).execute()
        
        if result.data:
            user = result.data[0]
            token = create_token(user['id'], 'passenger')
            return {
                "success": True,
                "message": "Registration successful",
                "token": token,
                "user": {
                    "id": user['id'],
                    "full_name": user['full_name'],
                    "phone": user['phone'],
                    "email": user['email'],
                    "city": user['city'],
                    "profile_photo": user['profile_photo'],
                    "user_type": "passenger"
                }
            }
        raise HTTPException(status_code=500, detail="Registration failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Passenger registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/register/driver")
async def register_driver(data: UserRegisterDriver):
    """Register a new driver"""
    try:
        admin_id = resolve_admin_id(data.admin_id)
        # Check if phone/email exists
        existing = supabase.table("drivers").select("id").or_(f"phone.eq.{data.phone},email.eq.{data.email}").execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Phone or email already registered")
        
        driver_data = {
            "id": str(uuid.uuid4()),
            "full_name": data.full_name,
            "phone": data.phone,
            "email": data.email,
            "city": data.city,
            "password_hash": hash_password(data.password),
            "vehicle_type": data.vehicle_type,
            "vehicle_brand": data.vehicle_brand,
            "vehicle_model": data.vehicle_model,
            "vehicle_color": data.vehicle_color,
            "plate_number": data.plate_number,
            "vehicle_photo": data.vehicle_photo,
            "license_photo": data.license_photo,
            "vehicle_papers": data.vehicle_papers,
            "casier_judiciaire": data.casier_judiciaire,
            "profile_photo": data.profile_photo,
            "status": "pending",  # Needs admin approval
            "is_online": False,
            "is_verified": False,
            "is_active": True,
            "rating": 5.0,
            "total_rides": 0,
            "wallet_balance": 0,
            "admin_id": admin_id
        }
        
        result = supabase.table("drivers").insert(driver_data).execute()
        
        if result.data:
            user = result.data[0]
            token = create_token(user['id'], 'driver')
            return {
                "success": True,
                "message": "Registration successful. Pending admin approval.",
                "token": token,
                "user": {
                    "id": user['id'],
                    "full_name": user['full_name'],
                    "phone": user['phone'],
                    "email": user['email'],
                    "city": user['city'],
                    "vehicle_type": user['vehicle_type'],
                    "status": user['status'],
                    "user_type": "driver"
                }
            }
        raise HTTPException(status_code=500, detail="Registration failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Driver registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/login")
async def login(data: LoginRequest):
    """Login for all user types"""
    try:
        table_map = {
            'passenger': 'passengers',
            'driver': 'drivers',
            'admin': 'admins',
            'subadmin': 'subadmins',
            'superadmin': 'superadmins'
        }
        
        table = table_map.get(data.user_type)
        if not table:
            raise HTTPException(status_code=400, detail="Invalid user type")
        
        # Find user by phone or email
        result = supabase.table(table).select("*").or_(f"phone.eq.{data.phone_or_email},email.eq.{data.phone_or_email}").execute()
        
        if not result.data and data.user_type == 'admin':
            table = table_map.get('subadmin')
            result = supabase.table(table).select("*").or_(f"phone.eq.{data.phone_or_email},email.eq.{data.phone_or_email}").execute()
            if result.data:
                data.user_type = 'subadmin'
        
        if not result.data:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user = result.data[0]
        
        if not verify_password(data.password, user['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not user.get('is_active', True):
            raise HTTPException(status_code=403, detail="Account is disabled")
        
        admin_id = (
            user.get('admin_id') if data.user_type in ['driver', 'subadmin']
            else (user.get('id') if data.user_type == 'admin' else None)
        )
        token = create_token(user['id'], data.user_type, admin_id)
        
        # Remove sensitive data
        user.pop('password_hash', None)
        user['user_type'] = data.user_type
        
        return {
            "success": True,
            "message": "Login successful",
            "token": token,
            "user": user
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== SUPERADMIN ENDPOINTS ==============

@api_router.post("/superadmin/create")
async def create_superadmin(data: SuperAdminCreate):
    """Create a superadmin (first time setup)"""
    try:
        # Check if any superadmin exists
        existing = supabase.table("superadmins").select("id").execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="SuperAdmin already exists. Contact system administrator.")
        
        superadmin_data = {
            "id": str(uuid.uuid4()),
            "full_name": data.full_name,
            "phone": data.phone,
            "email": data.email,
            "password_hash": hash_password(data.password),
            "is_active": True
        }
        
        result = supabase.table("superadmins").insert(superadmin_data).execute()
        
        if result.data:
            user = result.data[0]
            token = create_token(user['id'], 'superadmin')
            return {
                "success": True,
                "message": "SuperAdmin created successfully",
                "token": token,
                "user": {
                    "id": user['id'],
                    "full_name": user['full_name'],
                    "email": user['email'],
                    "user_type": "superadmin"
                }
            }
        raise HTTPException(status_code=500, detail="Creation failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SuperAdmin creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/superadmin/admins")
async def create_admin(data: AdminCreate, current_user: dict = Depends(get_current_user)):
    """Create a new admin (white-label)"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can create admins")
    
    try:
        admin_data = {
            "id": str(uuid.uuid4()),
            "full_name": data.full_name,
            "phone": data.phone,
            "email": data.email,
            "password_hash": hash_password(data.password),
            "address": data.address,
            "force_password_change": data.force_password_change if data.force_password_change is not None else True,
            "cities": data.cities,
            "brand_name": data.brand_name,
            "logo": data.logo,
            "primary_color": data.primary_color,
            "secondary_color": data.secondary_color,
            "tertiary_color": data.tertiary_color,
            "is_active": True
        }
        
        result = supabase.table("admins").insert(admin_data).execute()
        
        if result.data:
            admin = result.data[0]
            admin.pop('password_hash', None)
            return {"success": True, "admin": admin}
        raise HTTPException(status_code=500, detail="Creation failed")
    except HTTPException:
        raise
    except Exception as e:
        err = str(e).lower()
        logger.error(f"Admin creation error: {e}")
        if "unique" in err or "duplicate" in err or "already exists" in err:
            if "email" in err or "admins_email" in err:
                raise HTTPException(status_code=400, detail="Imèl sa a deja itilize. Chwazi yon lòt imèl.")
            if "phone" in err or "admins_phone" in err:
                raise HTTPException(status_code=400, detail="Nimewo telefòn sa a deja itilize. Chwazi yon lòt nimewo.")
            raise HTTPException(status_code=400, detail="Imèl oswa nimewo telefòn sa a deja itilize pou yon lòt mak.")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/subadmins")
async def create_subadmin(data: SubAdminCreate, current_user: dict = Depends(get_current_user)):
    """Create a subadmin (admin assistant)"""
    if current_user['user_type'] != 'admin':
        raise HTTPException(status_code=403, detail="Only Admin can create subadmins")
    
    try:
        subadmin_data = {
            "id": str(uuid.uuid4()),
            "admin_id": current_user['user_id'],
            "full_name": data.full_name,
            "phone": data.phone,
            "email": data.email,
            "password_hash": hash_password(data.password),
            "force_password_change": data.force_password_change if data.force_password_change is not None else True,
            "is_active": True
        }
        result = supabase.table("subadmins").insert(subadmin_data).execute()
        if result.data:
            subadmin = result.data[0]
            subadmin.pop('password_hash', None)
            return {"success": True, "subadmin": subadmin}
        raise HTTPException(status_code=500, detail="Creation failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Subadmin creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/subadmins")
async def get_subadmins(current_user: dict = Depends(get_current_user)):
    """Get subadmins for current admin"""
    if current_user['user_type'] != 'admin':
        raise HTTPException(status_code=403, detail="Only Admin can view subadmins")
    
    try:
        result = supabase.table("subadmins").select("*").eq("admin_id", current_user['user_id']).execute()
        subadmins = result.data or []
        for s in subadmins:
            s.pop('password_hash', None)
        return {"subadmins": subadmins}
    except Exception as e:
        logger.error(f"Get subadmins error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/subadmins/{subadmin_id}/status")
async def set_subadmin_status(subadmin_id: str, is_active: bool, current_user: dict = Depends(get_current_user)):
    """Enable/disable a subadmin"""
    if current_user['user_type'] != 'admin':
        raise HTTPException(status_code=403, detail="Only Admin can change status")
    
    try:
        result = supabase.table("subadmins").update({
            "is_active": is_active,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", subadmin_id).eq("admin_id", current_user['user_id']).execute()
        if result.data:
            return {"success": True, "is_active": is_active}
        raise HTTPException(status_code=404, detail="Subadmin not found")
    except Exception as e:
        logger.error(f"Subadmin status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/subadmins/{subadmin_id}")
async def delete_subadmin(subadmin_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a subadmin"""
    if current_user['user_type'] != 'admin':
        raise HTTPException(status_code=403, detail="Only Admin can delete subadmins")
    
    try:
        result = supabase.table("subadmins").delete().eq("id", subadmin_id).eq("admin_id", current_user['user_id']).execute()
        if result.data:
            return {"success": True}
        raise HTTPException(status_code=404, detail="Subadmin not found")
    except Exception as e:
        logger.error(f"Subadmin delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/superadmin/admins")
async def get_all_admins(current_user: dict = Depends(get_current_user)):
    """Get all admins"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view all admins")
    
    try:
        result = supabase.table("admins").select("*").execute()
        admins = result.data or []
        for admin in admins:
            admin.pop('password_hash', None)
        return {"admins": admins}
    except Exception as e:
        logger.error(f"Get admins error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/superadmin/admins/{admin_id}")
async def update_admin(admin_id: str, data: AdminUpdate, current_user: dict = Depends(get_current_user)):
    """Update an admin"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can update admins")
    
    try:
        update_data = data.dict(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        update_data["updated_at"] = datetime.utcnow().isoformat()
        result = supabase.table("admins").update(update_data).eq("id", admin_id).execute()
        if result.data:
            admin = result.data[0]
            admin.pop('password_hash', None)
            return {"success": True, "admin": admin}
        raise HTTPException(status_code=404, detail="Admin not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/superadmin/admins/{admin_id}/status")
async def set_admin_status(admin_id: str, is_active: bool, current_user: dict = Depends(get_current_user)):
    """Enable/disable an admin"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can change status")
    
    try:
        result = supabase.table("admins").update({
            "is_active": is_active,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", admin_id).execute()
        if result.data:
            return {"success": True, "is_active": is_active}
        raise HTTPException(status_code=404, detail="Admin not found")
    except Exception as e:
        logger.error(f"Admin status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/superadmin/admins/{admin_id}")
async def delete_admin(admin_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an admin"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can delete admins")
    
    try:
        admin_lookup = supabase.table("admins").select("id,brand_name").eq("id", admin_id).execute()
        if not admin_lookup.data:
            raise HTTPException(status_code=404, detail="Admin not found")

        admin_brand_name = admin_lookup.data[0].get("brand_name")

        # If it's a white-label brand, remove everything linked to it.
        if admin_brand_name:
            drivers = supabase.table("drivers").select("id").eq("admin_id", admin_id).execute()
            passengers = supabase.table("passengers").select("id").eq("admin_id", admin_id).execute()
            driver_ids = [d.get("id") for d in (drivers.data or []) if d.get("id")]
            passenger_ids = [p.get("id") for p in (passengers.data or []) if p.get("id")]

            if driver_ids:
                supabase.table("driver_verifications").delete().in_("driver_id", driver_ids).execute()
                supabase.table("notifications").delete().in_("user_id", driver_ids).execute()

            if passenger_ids:
                supabase.table("notifications").delete().in_("user_id", passenger_ids).execute()

            supabase.table("rides").delete().eq("admin_id", admin_id).execute()
            if driver_ids:
                supabase.table("rides").delete().in_("driver_id", driver_ids).execute()
            if passenger_ids:
                supabase.table("rides").delete().in_("passenger_id", passenger_ids).execute()

            supabase.table("complaints").delete().eq("admin_id", admin_id).execute()
            if driver_ids:
                supabase.table("complaints").delete().in_("from_user_id", driver_ids).execute()
                supabase.table("complaints").delete().in_("target_user_id", driver_ids).execute()
            if passenger_ids:
                supabase.table("complaints").delete().in_("from_user_id", passenger_ids).execute()
                supabase.table("complaints").delete().in_("target_user_id", passenger_ids).execute()
            supabase.table("notifications").delete().eq("user_id", admin_id).execute()

            supabase.table("admin_payment_methods").delete().eq("admin_id", admin_id).execute()
            supabase.table("subadmins").delete().eq("admin_id", admin_id).execute()
            supabase.table("drivers").delete().eq("admin_id", admin_id).execute()
            supabase.table("passengers").delete().eq("admin_id", admin_id).execute()

        result = supabase.table("admins").delete().eq("id", admin_id).execute()
        if result.data:
            return {"success": True}
        raise HTTPException(status_code=404, detail="Admin not found")
    except Exception as e:
        logger.error(f"Admin delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/superadmin/stats")
async def get_superadmin_stats(current_user: dict = Depends(get_current_user)):
    """Get system-wide statistics"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view stats")
    
    try:
        passengers = supabase.table("passengers").select("id", count="exact").execute()
        drivers = supabase.table("drivers").select("id", count="exact").execute()
        admins = supabase.table("admins").select("id", count="exact").execute()
        cities = supabase.table("cities").select("id", count="exact").execute()
        rides = supabase.table("rides").select("id,final_price,status,driver_id,admin_id,city,created_at,completed_at").execute()
        drivers_list = supabase.table("drivers").select("id,admin_id,status").execute().data or []
        admins_list = supabase.table("admins").select("id,full_name,brand_name").execute().data or []
        
        driver_admin_map = {d.get('id'): d.get('admin_id') for d in drivers_list}
        admin_name_map = {
            a.get('id'): (a.get('brand_name') or a.get('full_name') or 'Admin')
            for a in admins_list
        }
        completed_rides = 0
        direct_revenue = 0
        admin_revenue = 0
        city_revenue = {}
        admin_revenue_map = {}
        now = datetime.utcnow()
        daily_30 = {}
        
        for ride in (rides.data or []):
            if ride.get('status') != 'completed':
                continue
            completed_rides += 1
            price = ride.get('final_price', 0) or 0
            admin_id = ride.get('admin_id') or driver_admin_map.get(ride.get('driver_id'))
            if admin_id:
                admin_revenue += price
                admin_revenue_map[admin_id] = admin_revenue_map.get(admin_id, 0) + price
            else:
                direct_revenue += price
            
            city = ride.get('city')
            if city:
                city_revenue[city] = city_revenue.get(city, 0) + price
            
            date_str = None
            if ride.get('completed_at'):
                try:
                    date_str = ride.get('completed_at')[:10]
                except Exception:
                    date_str = None
            if not date_str and ride.get('created_at'):
                try:
                    date_str = ride.get('created_at')[:10]
                except Exception:
                    date_str = None
            
            if date_str:
                daily_30[date_str] = daily_30.get(date_str, 0) + price
        
        total_revenue = direct_revenue + admin_revenue
        pending_drivers = len([d for d in drivers_list if d.get('status') == 'pending'])

        def build_daily_series(days: int):
            series = []
            for i in range(days - 1, -1, -1):
                day = (now - timedelta(days=i)).strftime('%Y-%m-%d')
                series.append({
                    "date": day,
                    "revenue": round(daily_30.get(day, 0), 2)
                })
            return series

        top_cities = sorted(
            [{"city": c, "revenue": round(v, 2)} for c, v in city_revenue.items()],
            key=lambda x: x["revenue"],
            reverse=True
        )[:5]

        top_admins = sorted(
            [{"admin_id": aid, "name": admin_name_map.get(aid, "Admin"), "revenue": round(v, 2)}
             for aid, v in admin_revenue_map.items()],
            key=lambda x: x["revenue"],
            reverse=True
        )[:5]
        
        return {
            "total_passengers": passengers.count or 0,
            "total_drivers": drivers.count or 0,
            "total_admins": admins.count or 0,
            "total_cities": cities.count or 0,
            "total_rides": len(rides.data or []),
            "completed_rides": completed_rides,
            "pending_drivers": pending_drivers,
            "total_revenue": total_revenue,
            "direct_revenue": direct_revenue,
            "admin_revenue": admin_revenue,
            "revenue_7d": build_daily_series(7),
            "revenue_30d": build_daily_series(30),
            "top_cities": top_cities,
            "top_admins": top_admins
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== CITY MANAGEMENT ==============

@api_router.post("/cities")
async def create_city(data: CityCreate, current_user: dict = Depends(get_current_user)):
    """Create a new city"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        city_data = {
            "id": str(uuid.uuid4()),
            **data.dict()
        }
        
        result = supabase.table("cities").insert(city_data).execute()
        if result.data:
            return {"success": True, "city": result.data[0]}
        raise HTTPException(status_code=500, detail="Creation failed")
    except Exception as e:
        logger.error(f"City creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cities")
async def get_cities():
    """Get all active cities"""
    try:
        result = supabase.table("cities").select("*").eq("is_active", True).execute()
        return {"cities": result.data or []}
    except Exception as e:
        logger.error(f"Get cities error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/cities/{city_id}")
async def delete_city(city_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a city"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        result = supabase.table("cities").delete().eq("id", city_id).execute()
        if result.data:
            return {"success": True}
        raise HTTPException(status_code=404, detail="City not found")
    except Exception as e:
        logger.error(f"City delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/pricing")
async def get_pricing(scope: str = Query(...), current_user: dict = Depends(get_current_user)):
    """Get pricing settings by scope (direct/admin)"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Not authorized")
    if scope not in ['direct', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid scope")
    
    try:
        result = supabase.table("pricing_settings").select("*").eq("scope", scope).execute()
        raw = result.data[0] if result.data else {}
        def _v(key, fallback=None, default=0):
            val = raw.get(key)
            if val is not None:
                return float(val)
            if fallback and raw.get(fallback) is not None:
                return float(raw[fallback])
            return default
        pricing = {
            "scope": scope,
            "base_fare": _v("base_fare", default=0),
            "price_per_km": _v("price_per_km", default=0),
            "price_per_min": _v("price_per_min", default=0),
            "base_fare_moto": _v("base_fare_moto", "base_fare", 0),
            "base_fare_car": _v("base_fare_car", "base_fare", 0),
            "price_per_km_moto": _v("price_per_km_moto", "price_per_km", 0),
            "price_per_km_car": _v("price_per_km_car", "price_per_km", 0),
            "price_per_min_moto": _v("price_per_min_moto", "price_per_min", 0),
            "price_per_min_car": _v("price_per_min_car", "price_per_min", 0),
            "commission_rate": _v("commission_rate", default=0),
        }
        return {"pricing": pricing}
    except Exception as e:
        logger.error(f"Pricing get error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/pricing")
async def update_pricing(scope: str = Query(...), data: PricingUpdate = None, current_user: dict = Depends(get_current_user)):
    """Update pricing settings by scope (direct/admin)"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Not authorized")
    if scope not in ['direct', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid scope")
    
    try:
        if data is None:
            raise HTTPException(status_code=400, detail="Pricing data required")
        def _check(v, name):
            if v is not None and v < 0:
                raise HTTPException(status_code=400, detail=f"{name} must be >= 0")
        for k in ("base_fare", "price_per_km", "price_per_min", "base_fare_moto", "base_fare_car",
                  "price_per_km_moto", "price_per_km_car", "price_per_min_moto", "price_per_min_car"):
            _check(getattr(data, k, None), k)
        if data.commission_rate is not None and (data.commission_rate < 0 or data.commission_rate > 100):
            raise HTTPException(status_code=400, detail="Commission must be between 0 and 100")
        payload = {"scope": scope, "updated_at": datetime.utcnow().isoformat()}
        for key in ("base_fare", "price_per_km", "price_per_min", "base_fare_moto", "base_fare_car",
                    "price_per_km_moto", "price_per_km_car", "price_per_min_moto", "price_per_min_car", "commission_rate"):
            v = getattr(data, key, None)
            if v is not None:
                payload[key] = v
            elif key == "commission_rate":
                payload[key] = data.commission_rate if data.commission_rate is not None else 0
        result = supabase.table("pricing_settings").upsert(payload, on_conflict="scope").execute()
        pricing = result.data[0] if result.data else payload
        return {"pricing": pricing}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pricing update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/pricing")
async def get_admin_pricing(current_user: dict = Depends(get_current_user)):
    """Get admin pricing (global): moto + machin (base, per km, per min)"""
    if current_user['user_type'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        result = supabase.table("admins").select(
            "base_fare,price_per_km,price_per_min,base_fare_moto,base_fare_car,price_per_km_moto,price_per_km_car,price_per_min_moto,price_per_min_car,surge_multiplier,commission_rate"
        ).eq("id", current_user['user_id']).execute()
        raw = result.data[0] if result.data else {}
        def _v(key: str, fallback_key: Optional[str] = None, default: float = 0):
            val = raw.get(key)
            if val is not None:
                return float(val)
            if fallback_key:
                v2 = raw.get(fallback_key)
                return float(v2) if v2 is not None else default
            return default
        pricing = {
            "base_fare": _v("base_fare", default=0),
            "price_per_km": _v("price_per_km", default=0),
            "price_per_min": _v("price_per_min", default=0),
            "base_fare_moto": _v("base_fare_moto", "base_fare", 0),
            "base_fare_car": _v("base_fare_car", "base_fare", 0),
            "price_per_km_moto": _v("price_per_km_moto", "price_per_km", 0),
            "price_per_km_car": _v("price_per_km_car", "price_per_km", 0),
            "price_per_min_moto": _v("price_per_min_moto", "price_per_min", 0),
            "price_per_min_car": _v("price_per_min_car", "price_per_min", 0),
            "surge_multiplier": _v("surge_multiplier", default=1.0),
            "commission_rate": _v("commission_rate", default=0),
        }
        return {"pricing": pricing}
    except Exception as e:
        logger.error(f"Admin pricing get error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/pricing")
async def update_admin_pricing(data: AdminPricingUpdate, current_user: dict = Depends(get_current_user)):
    """Update admin pricing (global): moto + machin (base, per km, per min)"""
    if current_user['user_type'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    def _check(v, name):
        if v is not None and v < 0:
            raise HTTPException(status_code=400, detail=f"{name} must be >= 0")
    for k in ("base_fare", "price_per_km", "price_per_min", "base_fare_moto", "base_fare_car",
              "price_per_km_moto", "price_per_km_car", "price_per_min_moto", "price_per_min_car"):
        _check(getattr(data, k, None), k)
    if data.commission_rate is not None and (data.commission_rate < 0 or data.commission_rate > 100):
        raise HTTPException(status_code=400, detail="Commission must be between 0 and 100")
    if data.surge_multiplier < 1:
        raise HTTPException(status_code=400, detail="Surge must be >= 1")
    try:
        payload = {"updated_at": datetime.utcnow().isoformat()}
        for key in ("base_fare", "price_per_km", "price_per_min", "base_fare_moto", "base_fare_car",
                    "price_per_km_moto", "price_per_km_car", "price_per_min_moto", "price_per_min_car",
                    "surge_multiplier", "commission_rate"):
            v = getattr(data, key, None)
            if v is not None:
                payload[key] = v
        result = supabase.table("admins").update(payload).eq("id", current_user['user_id']).execute()
        if result.data:
            return {"pricing": result.data[0]}
        raise HTTPException(status_code=404, detail="Admin not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin pricing update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/payment-methods")
async def get_admin_payment_methods(current_user: dict = Depends(get_current_user)):
    """Get admin payment methods"""
    if current_user['user_type'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        result = supabase.table("admin_payment_methods").select("*").eq("admin_id", current_user['user_id']).execute()
        if result.data:
            methods = result.data[0]
        else:
            # Create default record
            payload = {
                "admin_id": current_user['user_id'],
                "moncash_enabled": False,
                "natcash_enabled": False,
                "bank_enabled": False
            }
            created = supabase.table("admin_payment_methods").insert(payload).execute()
            methods = created.data[0] if created.data else payload
        return {"payment_methods": methods}
    except Exception as e:
        logger.error(f"Admin payment methods get error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/payment-methods")
async def update_admin_payment_methods(data: AdminPaymentMethodsUpdate, current_user: dict = Depends(get_current_user)):
    """Update admin payment methods"""
    if current_user['user_type'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    if data.moncash_enabled and not (data.moncash_phone and data.moncash_phone.strip()):
        raise HTTPException(status_code=400, detail="MonCash phone required")
    if data.natcash_enabled and not (data.natcash_phone and data.natcash_phone.strip()):
        raise HTTPException(status_code=400, detail="NatCash phone required")
    if data.bank_enabled:
        if not (data.bank_name and data.bank_name.strip()):
            raise HTTPException(status_code=400, detail="Bank name required")
        if not (data.bank_account_name and data.bank_account_name.strip()):
            raise HTTPException(status_code=400, detail="Account name required")
        if not (data.bank_account_number and data.bank_account_number.strip()):
            raise HTTPException(status_code=400, detail="Account number required")
    if data.default_method:
        if data.default_method not in ['moncash', 'natcash', 'bank']:
            raise HTTPException(status_code=400, detail="Invalid default method")
        if data.default_method == 'moncash' and not data.moncash_enabled:
            raise HTTPException(status_code=400, detail="MonCash must be enabled for default")
        if data.default_method == 'natcash' and not data.natcash_enabled:
            raise HTTPException(status_code=400, detail="NatCash must be enabled for default")
        if data.default_method == 'bank' and not data.bank_enabled:
            raise HTTPException(status_code=400, detail="Bank must be enabled for default")
    try:
        payload = {
            "moncash_enabled": data.moncash_enabled,
            "moncash_phone": data.moncash_phone,
            "natcash_enabled": data.natcash_enabled,
            "natcash_phone": data.natcash_phone,
            "bank_enabled": data.bank_enabled,
            "bank_name": data.bank_name,
            "bank_account_name": data.bank_account_name,
            "bank_account_number": data.bank_account_number,
            "default_method": data.default_method,
            "updated_at": datetime.utcnow().isoformat()
        }
        result = supabase.table("admin_payment_methods").update(payload).eq("admin_id", current_user['user_id']).execute()
        if result.data:
            return {"payment_methods": result.data[0]}
        # create if missing
        payload["admin_id"] = current_user['user_id']
        created = supabase.table("admin_payment_methods").insert(payload).execute()
        return {"payment_methods": created.data[0] if created.data else payload}
    except Exception as e:
        logger.error(f"Admin payment methods update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/cities/{city_id}")
async def update_city(city_id: str, data: CityUpdate, current_user: dict = Depends(get_current_user)):
    """Update city pricing"""
    if current_user['user_type'] not in ['superadmin', 'admin', 'subadmin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        result = supabase.table("cities").update(update_data).eq("id", city_id).execute()
        if result.data:
            return {"success": True, "city": result.data[0]}
        raise HTTPException(status_code=404, detail="City not found")
    except Exception as e:
        logger.error(f"City update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== DRIVER MANAGEMENT ==============

@api_router.get("/drivers")
async def get_drivers(status: Optional[str] = None, city: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get drivers (filtered by admin's cities if admin)"""
    try:
        query = supabase.table("drivers").select("*")

        admin_id = None
        admin_cities: List[str] = []
        admin_brand_name = None
        if current_user['user_type'] in ['admin', 'subadmin']:
            admin_id = current_user['admin_id'] if current_user['user_type'] == 'subadmin' else current_user['user_id']
            admin = supabase.table("admins").select("cities,brand_name").eq("id", admin_id).execute()
            if admin.data:
                admin_cities = admin.data[0].get('cities', []) or []
                admin_brand_name = admin.data[0].get('brand_name')

        if status:
            query = query.eq("status", status)
        if city:
            query = query.eq("city", city)

        if admin_cities:
            query = query.in_("city", admin_cities)

        result = query.execute()
        drivers = result.data or []

        if current_user['user_type'] in ['admin', 'subadmin']:
            # White-label admins only see their own drivers.
            # TapTapGo admins see unassigned drivers and those assigned to them.
            if admin_brand_name:
                drivers = [d for d in drivers if d.get('admin_id') == admin_id]
            else:
                drivers = [d for d in drivers if (not d.get('admin_id')) or d.get('admin_id') == admin_id]

        if current_user['user_type'] == 'superadmin':
            admins = supabase.table("admins").select("id,full_name,brand_name,cities").execute().data or []
            admin_map = {a["id"]: a for a in admins if a.get("id")}
            for d in drivers:
                admin = admin_map.get(d.get("admin_id")) if d.get("admin_id") else None
                d["admin_name"] = admin.get("full_name") if admin else None
                d["admin_brand"] = admin.get("brand_name") if admin else None
                d["admin_cities"] = admin.get("cities") if admin else None

        for driver in drivers:
            driver.pop('password_hash', None)
        
        return {"drivers": drivers}
    except Exception as e:
        logger.error(f"Get drivers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/drivers/remind-missing-docs")
async def remind_drivers_missing_docs(payload: DriverReminderRequest, current_user: dict = Depends(get_current_user)):
    """Send reminder notifications to drivers with missing documents"""
    if current_user['user_type'] not in ['superadmin', 'admin', 'subadmin']:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        query = supabase.table("drivers").select(
            "id,full_name,phone,email,city,admin_id,status,license_photo,vehicle_photo,vehicle_papers"
        )

        admin_id = None
        admin_cities: List[str] = []
        admin_brand_name = None
        if current_user['user_type'] in ['admin', 'subadmin']:
            admin_id = current_user['admin_id'] if current_user['user_type'] == 'subadmin' else current_user['user_id']
            admin = supabase.table("admins").select("cities,brand_name").eq("id", admin_id).execute()
            if admin.data:
                admin_cities = admin.data[0].get('cities', []) or []
                admin_brand_name = admin.data[0].get('brand_name')

        if payload.status:
            query = query.eq("status", payload.status)
        if payload.driver_id:
            query = query.eq("id", payload.driver_id)
        if admin_cities:
            query = query.in_("city", admin_cities)

        result = query.execute()
        drivers = result.data or []

        if current_user['user_type'] in ['admin', 'subadmin']:
            if admin_brand_name:
                drivers = [d for d in drivers if d.get('admin_id') == admin_id]
            else:
                drivers = [d for d in drivers if (not d.get('admin_id')) or d.get('admin_id') == admin_id]

        missing = [
            d for d in drivers
            if not d.get('license_photo') or not d.get('vehicle_photo') or not d.get('vehicle_papers')
        ]

        notified = 0
        message = (payload.message or "").strip() or "Tanpri fini enskripsyon ou epi telechaje dokiman ki manke yo."
        for driver in missing:
            create_notification(
                driver.get("id"),
                "driver",
                "Dokiman obligatwa",
                message
            )
            notified += 1

        return {"success": True, "notified": notified}
    except Exception as e:
        logger.error(f"Driver reminder error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/drivers/{driver_id}/approve")
async def approve_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    """Approve a driver (after document verification)"""
    if current_user['user_type'] not in ['superadmin', 'admin', 'subadmin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        driver_result = supabase.table("drivers").select(
            "license_photo,vehicle_photo,vehicle_papers,city,admin_id"
        ).eq("id", driver_id).execute()
        if not driver_result.data:
            raise HTTPException(status_code=404, detail="Driver not found")
        driver = driver_result.data[0]
        if not driver.get('license_photo') or not driver.get('vehicle_photo') or not driver.get('vehicle_papers'):
            raise HTTPException(status_code=400, detail="Missing driver documents")

        admin_id = None
        if current_user['user_type'] == 'admin':
            admin_id = current_user['user_id']
        if current_user['user_type'] == 'subadmin':
            admin_id = current_user.get('admin_id')

        if current_user['user_type'] in ['admin', 'subadmin']:
            admin = supabase.table("admins").select("cities,brand_name").eq("id", admin_id).execute()
            admin_cities = admin.data[0].get("cities", []) if admin.data else []
            admin_brand_name = admin.data[0].get("brand_name") if admin.data else None
            if admin_cities and driver.get("city") not in admin_cities:
                raise HTTPException(status_code=403, detail="Driver not in your cities")
            if admin_brand_name and not driver.get("admin_id"):
                raise HTTPException(status_code=403, detail="Driver belongs to TapTapGo")
            if driver.get("admin_id") and driver.get("admin_id") != admin_id:
                raise HTTPException(status_code=403, detail="Driver belongs to another admin")

        update_data = {
            "status": "approved",
            "is_verified": True,
            "document_status": "approved",
            "rejection_reason": None,
            "admin_id": admin_id,
            "verified_at": datetime.utcnow().isoformat(),
            "verified_by": current_user['user_id']
        }
        
        result = supabase.table("drivers").update(update_data).eq("id", driver_id).execute()
        if result.data:
            supabase.table("driver_verifications").insert({
                "id": str(uuid.uuid4()),
                "driver_id": driver_id,
                "status": "approved",
                "reason": None,
                "verified_by": current_user['user_id']
            }).execute()
            create_notification(
                driver_id,
                "driver",
                "Dokiman apwouve",
                "Dokiman ou yo apwouve. Ou kapab kòmanse fè kous."
            )
            return {"success": True, "message": "Driver approved"}
        raise HTTPException(status_code=404, detail="Driver not found")
    except Exception as e:
        logger.error(f"Driver approval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/drivers/{driver_id}/reject")
async def reject_driver(
    driver_id: str,
    reason: str = Query(..., min_length=5),
    current_user: dict = Depends(get_current_user)
):
    """Reject a driver (with reason)"""
    if current_user['user_type'] not in ['superadmin', 'admin', 'subadmin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        result = supabase.table("drivers").update({
            "status": "rejected",
            "document_status": "rejected",
            "rejection_reason": reason,
            "verified_at": datetime.utcnow().isoformat(),
            "verified_by": current_user['user_id'],
            "is_online": False,
        }).eq("id", driver_id).execute()
        if result.data:
            supabase.table("driver_verifications").insert({
                "id": str(uuid.uuid4()),
                "driver_id": driver_id,
                "status": "rejected",
                "reason": reason,
                "verified_by": current_user['user_id']
            }).execute()
            create_notification(
                driver_id,
                "driver",
                "Dokiman rejte",
                f"Dokiman ou yo rejte. Rezon: {reason}"
            )
            return {"success": True, "message": "Driver rejected", "reason": reason}
        raise HTTPException(status_code=404, detail="Driver not found")
    except Exception as e:
        logger.error(f"Driver rejection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/drivers/{driver_id}/status")
async def update_driver_online_status(driver_id: str, is_online: bool, current_user: dict = Depends(get_current_user)):
    """Update driver online/offline status"""
    if current_user['user_type'] != 'driver' or current_user['user_id'] != driver_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        if is_online:
            driver_lookup = supabase.table("drivers").select("status,casier_judiciaire").eq("id", driver_id).execute()
            if not driver_lookup.data:
                raise HTTPException(status_code=404, detail="Driver not found")
            driver = driver_lookup.data[0]
            if driver.get("status") != "approved":
                raise HTTPException(
                    status_code=403,
                    detail="Kont ou an poko apwouve. Kontakte sèvis sipò si ou panse tan an twòp."
                )
            casier = driver.get("casier_judiciaire")
            if not casier or not str(casier).strip():
                raise HTTPException(
                    status_code=403,
                    detail="Ou dwe ajoute kasye jidisyè w (casier judiciaire) nan Dokiman avan w ka pase an liy. Ale nan Profil > Dokiman."
                )
        result = supabase.table("drivers").update({"is_online": is_online}).eq("id", driver_id).execute()
        if result.data:
            return {"success": True, "is_online": is_online}
        raise HTTPException(status_code=404, detail="Driver not found")
    except Exception as e:
        logger.error(f"Status update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/drivers/{driver_id}/location")
async def update_driver_location(driver_id: str, location: LocationUpdate, current_user: dict = Depends(get_current_user)):
    """Update driver location"""
    if current_user['user_type'] != 'driver' or current_user['user_id'] != driver_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        result = supabase.table("drivers").update({
            "current_lat": location.lat,
            "current_lng": location.lng
        }).eq("id", driver_id).execute()
        
        if result.data:
            return {"success": True}
        raise HTTPException(status_code=404, detail="Driver not found")
    except Exception as e:
        logger.error(f"Location update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/drivers")
async def create_driver_by_admin(data: AdminDriverCreate, current_user: dict = Depends(get_current_user)):
    """Admin creates a driver manually"""
    if current_user['user_type'] != 'admin':
        raise HTTPException(status_code=403, detail="Only Admin can create drivers")
    
    try:
        existing = supabase.table("drivers").select("id").or_(f"phone.eq.{data.phone},email.eq.{data.email}").execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Phone or email already registered")
        
        driver_data = {
            "id": str(uuid.uuid4()),
            "full_name": data.full_name,
            "phone": data.phone,
            "email": data.email,
            "city": data.city,
            "password_hash": hash_password(data.password),
            "vehicle_type": data.vehicle_type,
            "vehicle_brand": data.vehicle_brand,
            "vehicle_model": data.vehicle_model,
            "vehicle_color": data.vehicle_color,
            "plate_number": data.plate_number,
            "vehicle_photo": data.vehicle_photo,
            "license_photo": data.license_photo,
            "vehicle_papers": data.vehicle_papers,
            "profile_photo": data.profile_photo,
            "status": "pending",
            "is_online": False,
            "is_verified": False,
            "is_active": True,
            "rating": 5.0,
            "total_rides": 0,
            "wallet_balance": 0,
            "admin_id": current_user['user_id']
        }
        
        result = supabase.table("drivers").insert(driver_data).execute()
        if result.data:
            driver = result.data[0]
            driver.pop('password_hash', None)
            return {"success": True, "driver": driver}
        raise HTTPException(status_code=500, detail="Driver creation failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin create driver error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/drivers/{driver_id}/verifications")
async def get_driver_verifications(driver_id: str, current_user: dict = Depends(get_current_user)):
    """Get driver verification history"""
    if current_user['user_type'] not in ['superadmin', 'admin', 'subadmin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        result = supabase.table("driver_verifications").select("*").eq("driver_id", driver_id).order("created_at", desc=True).execute()
        return {"verifications": result.data or []}
    except Exception as e:
        logger.error(f"Driver verifications error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get current user notifications"""
    try:
        result = supabase.table("notifications").select("*").eq("user_id", current_user['user_id']).eq("user_type", current_user['user_type']).order("created_at", desc=True).execute()
        return {"notifications": result.data or []}
    except Exception as e:
        logger.error(f"Notifications error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/notifications/mark-read")
async def mark_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read for current user"""
    try:
        supabase.table("notifications").update({"is_read": True}).eq("user_id", current_user['user_id']).eq("user_type", current_user['user_type']).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Mark notifications read error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== PASSENGER ENDPOINTS ==============

@api_router.get("/passengers")
async def get_passengers(
    city: Optional[str] = None,
    admin_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get passengers"""
    if current_user['user_type'] not in ['superadmin', 'admin', 'subadmin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        query = supabase.table("passengers").select("*")

        admin_owner_id = None
        admin_brand_name = None
        if current_user['user_type'] in ['admin', 'subadmin']:
            admin_owner_id = current_user['admin_id'] if current_user['user_type'] == 'subadmin' else current_user['user_id']
            admin = supabase.table("admins").select("brand_name").eq("id", admin_owner_id).execute()
            if admin.data:
                admin_brand_name = admin.data[0].get("brand_name")

        if current_user['user_type'] == 'admin':
            if admin_brand_name:
                query = query.eq("admin_id", current_user['user_id'])
            else:
                query = query.or_("admin_id.is.null,admin_id.eq.{0}".format(current_user['user_id']))
        elif current_user['user_type'] == 'subadmin':
            if admin_brand_name:
                query = query.eq("admin_id", current_user.get('admin_id'))
            else:
                query = query.or_("admin_id.is.null,admin_id.eq.{0}".format(current_user.get('admin_id')))
        elif admin_id:
            query = query.eq("admin_id", admin_id)
        
        if city:
            query = query.eq("city", city)
        
        result = query.execute()
        passengers = result.data or []
        
        for p in passengers:
            p.pop('password_hash', None)
        
        return {"passengers": passengers}
    except Exception as e:
        logger.error(f"Get passengers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/passengers/{passenger_id}/status")
async def set_passenger_status(
    passenger_id: str,
    is_active: bool,
    current_user: dict = Depends(get_current_user)
):
    """Enable/disable a passenger"""
    if current_user['user_type'] not in ['superadmin', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        passenger = supabase.table("passengers").select("id,admin_id").eq("id", passenger_id).execute()
        if not passenger.data:
            raise HTTPException(status_code=404, detail="Passenger not found")
        if current_user['user_type'] in ['admin', 'subadmin']:
            admin_id = current_user['user_id'] if current_user['user_type'] == 'admin' else current_user.get('admin_id')
            if passenger.data[0].get("admin_id") != admin_id:
                raise HTTPException(status_code=403, detail="Not authorized")
        
        result = supabase.table("passengers").update({
            "is_active": is_active,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", passenger_id).execute()
        if result.data:
            title = "Kont ou aktive" if is_active else "Kont ou sispann"
            body = "Kont ou aktive ankò." if is_active else "Kont ou sispann pou kounye a."
            create_notification(passenger_id, "passenger", title, body)
            return {"success": True, "is_active": is_active}
        raise HTTPException(status_code=404, detail="Passenger not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Passenger status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/passengers/{passenger_id}")
async def delete_passenger(passenger_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a passenger"""
    if current_user['user_type'] not in ['superadmin', 'admin', 'subadmin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        passenger = supabase.table("passengers").select("id,admin_id").eq("id", passenger_id).execute()
        if not passenger.data:
            raise HTTPException(status_code=404, detail="Passenger not found")
        if current_user['user_type'] in ['admin', 'subadmin']:
            admin_id = current_user['user_id'] if current_user['user_type'] == 'admin' else current_user.get('admin_id')
            if passenger.data[0].get("admin_id") != admin_id:
                raise HTTPException(status_code=403, detail="Not authorized")
        result = supabase.table("passengers").delete().eq("id", passenger_id).execute()
        if result.data:
            return {"success": True}
        raise HTTPException(status_code=404, detail="Passenger not found")
    except Exception as e:
        logger.error(f"Passenger delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/passengers/{passenger_id}/warn")
async def warn_passenger(
    passenger_id: str,
    payload: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Send warning message to passenger"""
    if current_user['user_type'] not in ['superadmin', 'admin', 'subadmin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    message = (payload or {}).get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    try:
        passenger = supabase.table("passengers").select("id,admin_id").eq("id", passenger_id).execute()
        if not passenger.data:
            raise HTTPException(status_code=404, detail="Passenger not found")
        if current_user['user_type'] in ['admin', 'subadmin']:
            admin_id = current_user['user_id'] if current_user['user_type'] == 'admin' else current_user.get('admin_id')
            if passenger.data[0].get("admin_id") != admin_id:
                raise HTTPException(status_code=403, detail="Not authorized")
        
        create_notification(
            passenger_id,
            "passenger",
            "Avertisman",
            message
        )
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Passenger warn error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== COMPLAINTS ==============

@api_router.post("/complaints")
async def create_complaint(data: ComplaintCreate, current_user: dict = Depends(get_current_user)):
    """Create a complaint (driver/passenger only)"""
    if current_user['user_type'] not in ['driver', 'passenger']:
        raise HTTPException(status_code=403, detail="Not authorized")
    if data.target_user_type not in ['driver', 'passenger']:
        raise HTTPException(status_code=400, detail="Invalid target type")
    if data.target_user_type == current_user['user_type']:
        raise HTTPException(status_code=400, detail="Target must be different user type")
    message = (data.message or '').strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    try:
        target_table = "drivers" if data.target_user_type == "driver" else "passengers"
        target = supabase.table(target_table).select("id,admin_id").eq("id", data.target_user_id).execute()
        if not target.data:
            raise HTTPException(status_code=404, detail="Target user not found")
        admin_id = target.data[0].get("admin_id")
        
        payload = {
            "id": str(uuid.uuid4()),
            "ride_id": data.ride_id,
            "admin_id": admin_id,
            "from_user_type": current_user['user_type'],
            "from_user_id": current_user['user_id'],
            "target_user_type": data.target_user_type,
            "target_user_id": data.target_user_id,
            "message": message,
            "status": "open"
        }
        result = supabase.table("complaints").insert(payload).execute()
        if result.data:
            return {"complaint": result.data[0]}
        raise HTTPException(status_code=500, detail="Complaint creation failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Complaint create error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/complaints")
async def get_complaints(current_user: dict = Depends(get_current_user)):
    """Get complaints for admin/superadmin/subadmin"""
    if current_user['user_type'] not in ['superadmin', 'admin', 'subadmin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        query = supabase.table("complaints").select("*").order("created_at", desc=True)
        if current_user['user_type'] == 'admin':
            query = query.eq("admin_id", current_user['user_id'])
        if current_user['user_type'] == 'subadmin':
            query = query.eq("admin_id", current_user.get('admin_id'))
        result = query.execute()
        complaints = result.data or []
        if current_user['user_type'] == 'superadmin' and complaints:
          admins = supabase.table("admins").select("id,brand_name,full_name").execute()
          admin_map = {a["id"]: (a.get("brand_name") or a.get("full_name") or "Mak Pèsonèl") for a in (admins.data or [])}
          for c in complaints:
              c["admin_name"] = admin_map.get(c.get("admin_id"))
        return {"complaints": complaints}
    except Exception as e:
        logger.error(f"Complaints get error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/complaints/{complaint_id}/resolve")
async def resolve_complaint(
    complaint_id: str,
    payload: Optional[Dict[str, Any]] = None,
    current_user: dict = Depends(get_current_user)
):
    """Resolve a complaint"""
    if current_user['user_type'] not in ['superadmin', 'admin', 'subadmin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        complaint = supabase.table("complaints").select("id,admin_id,from_user_id,from_user_type").eq("id", complaint_id).execute()
        if not complaint.data:
            raise HTTPException(status_code=404, detail="Complaint not found")
        if current_user['user_type'] in ['admin', 'subadmin']:
            admin_id = current_user['user_id'] if current_user['user_type'] == 'admin' else current_user.get('admin_id')
            if complaint.data[0].get("admin_id") != admin_id:
                raise HTTPException(status_code=403, detail="Not authorized")
        result = supabase.table("complaints").update({
            "status": "resolved"
        }).eq("id", complaint_id).execute()
        if result.data:
            message = (payload or {}).get("message", "").strip()
            create_notification(
                complaint.data[0]["from_user_id"],
                complaint.data[0]["from_user_type"],
                "Plent rezoud",
                message or "Plent ou a rezoud. Mesi."
            )
            return {"complaint": result.data[0]}
        raise HTTPException(status_code=404, detail="Complaint not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Complaint resolve error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== RIDE ENDPOINTS ==============

@api_router.get("/rides/nearby-drivers")
async def get_nearby_drivers(lat: float, lng: float, vehicle_type: str, city: str):
    """Get nearby available drivers (inclut chauffeurs avec véhicule principal ou additionnel du type demandé)"""
    try:
        # Chauffeurs dont le véhicule principal correspond
        query = supabase.table("drivers").select("*").eq("is_online", True).eq("status", "approved").eq("vehicle_type", vehicle_type).eq("city", city)
        result = query.execute()
        drivers = list(result.data or [])
        driver_ids_from_primary = {d.get("id") for d in drivers if d.get("id")}
        # Chauffeurs qui ont un véhicule additionnel du type demandé
        extra = supabase.table("driver_vehicles").select("driver_id").eq("vehicle_type", vehicle_type).execute()
        extra_driver_ids = [r["driver_id"] for r in (extra.data or []) if r.get("driver_id")]
        if extra_driver_ids:
            more = supabase.table("drivers").select("*").eq("is_online", True).eq("status", "approved").eq("city", city).in_("id", extra_driver_ids).execute()
            for d in (more.data or []):
                if d.get("id") and d.get("id") not in driver_ids_from_primary:
                    drivers.append(d)
                    driver_ids_from_primary.add(d.get("id"))

        driver_ids = [d.get('id') for d in drivers if d.get('id')]
        busy_driver_ids = set()
        if driver_ids:
            busy_rides = (
                supabase.table("rides")
                .select("driver_id")
                .in_("driver_id", driver_ids)
                .in_("status", ["pending", "accepted", "arrived", "started"])
                .execute()
            )
            busy_driver_ids = {r.get('driver_id') for r in (busy_rides.data or []) if r.get('driver_id')}
        
        # Calculate distance and filter (simple distance calculation)
        nearby = []
        for driver in drivers:
            if driver.get('id') in busy_driver_ids:
                continue
            if driver.get('current_lat') and driver.get('current_lng'):
                # Simple distance calculation (not accurate for large distances)
                distance = calculate_distance_km(lat, lng, float(driver['current_lat']), float(driver['current_lng']))
                
                if distance <= 10:  # Within 10km
                    driver['distance'] = round(distance, 2)
                    driver.pop('password_hash', None)
                    nearby.append(driver)
        
        # Sort by distance
        nearby.sort(key=lambda x: x.get('distance', 999))
        
        return {"drivers": nearby[:10]}  # Return max 10 nearby drivers
    except Exception as e:
        logger.error(f"Nearby drivers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/rides/estimate")
async def estimate_ride(
    data: RideRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
):
    """Get ride price estimate"""
    try:
        current_user = None
        if credentials:
            try:
                current_user = decode_token(credentials.credentials)
            except Exception:
                current_user = None

        # Get city pricing
        city_result = supabase.table("cities").select("*").execute()
        cities = city_result.data or []
        
        # Use default pricing if city not found
        city_data = cities[0] if cities else {
            'base_fare_moto': 50,
            'base_fare_car': 100,
            'price_per_km_moto': 25,
            'price_per_km_car': 50,
            'price_per_min_moto': 5,
            'price_per_min_car': 10,
            'surge_multiplier': 1.0
        }

        pricing_data = None
        if current_user and current_user.get('user_type') == 'passenger':
            passenger = supabase.table("passengers").select("admin_id").eq("id", current_user['user_id']).execute()
            admin_id = passenger.data[0].get('admin_id') if passenger.data else None
            if admin_id:
                admin_pricing = supabase.table("admins").select(
                    "base_fare,price_per_km,price_per_min,base_fare_moto,base_fare_car,price_per_km_moto,price_per_km_car,price_per_min_moto,price_per_min_car,surge_multiplier"
                ).eq("id", admin_id).execute()
                if admin_pricing.data:
                    pricing_data = admin_pricing.data[0]
            else:
                pricing_result = supabase.table("pricing_settings").select("*").eq("scope", "direct").execute()
                if pricing_result.data:
                    pricing_data = pricing_result.data[0]
        
        pricing = calculate_ride_price(
            city_data,
            data.estimated_distance,
            data.estimated_duration,
            pricing_data,
            data.vehicle_type,
        )
        
        return {
            "success": True,
            "estimate": pricing
        }
    except Exception as e:
        logger.error(f"Estimate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/rides")
async def create_ride(data: RideRequest, current_user: dict = Depends(get_current_user)):
    """Create a new ride request"""
    if current_user['user_type'] != 'passenger':
        raise HTTPException(status_code=403, detail="Only passengers can request rides")
    
    try:
        passenger = supabase.table("passengers").select("admin_id,city").eq("id", current_user['user_id']).execute()
        admin_id = passenger.data[0].get('admin_id') if passenger.data else None
        passenger_city = passenger.data[0].get('city') if passenger.data else None
        matched_driver = None
        eta_minutes = None
        contact_code = None
        is_scheduled = bool(data.scheduled_at)

        try:
            if is_scheduled:
                raise Exception("Scheduled ride - skip auto assignment")
            driver_query = (
                supabase.table("drivers")
                .select("*")
                .eq("is_online", True)
                .eq("status", "approved")
                .eq("vehicle_type", data.vehicle_type)
            )
            if passenger_city:
                driver_query = driver_query.eq("city", passenger_city)
            driver_result = driver_query.execute()
            drivers = driver_result.data or []

            driver_ids = [d.get('id') for d in drivers if d.get('id')]
            busy_driver_ids = set()
            if driver_ids:
                busy_rides = (
                    supabase.table("rides")
                    .select("driver_id")
                    .in_("driver_id", driver_ids)
                    .in_("status", ["pending", "accepted", "arrived", "started"])
                    .execute()
                )
                busy_driver_ids = {r.get('driver_id') for r in (busy_rides.data or []) if r.get('driver_id')}

            nearby = []
            for driver in drivers:
                if driver.get('id') in busy_driver_ids:
                    continue
                if driver.get('current_lat') and driver.get('current_lng'):
                    distance = calculate_distance_km(
                        data.pickup_lat,
                        data.pickup_lng,
                        float(driver['current_lat']),
                        float(driver['current_lng'])
                    )
                    if distance <= 10:
                        driver['distance'] = distance
                        nearby.append(driver)

            nearby.sort(key=lambda x: x.get('distance', 999))
            if nearby:
                matched_driver = nearby[0]
                eta_minutes = estimate_eta_minutes(float(matched_driver.get('distance', 0)))
                contact_code = generate_contact_code()
        except Exception as e:
            logger.warning(f"Auto-assign driver failed: {e}")

        payment_method = data.payment_method or "cash"
        if payment_method not in ["cash", "moncash", "natcash", "bank"]:
            raise HTTPException(status_code=400, detail="Invalid payment method")
        ride_data = {
            "id": str(uuid.uuid4()),
            "passenger_id": current_user['user_id'],
            "pickup_lat": data.pickup_lat,
            "pickup_lng": data.pickup_lng,
            "pickup_address": data.pickup_address,
            "destination_lat": data.destination_lat,
            "destination_lng": data.destination_lng,
            "destination_address": data.destination_address,
            "vehicle_type": data.vehicle_type,
            "estimated_distance": data.estimated_distance,
            "estimated_duration": data.estimated_duration,
            "estimated_price": data.estimated_price,
            "status": "scheduled" if is_scheduled else "pending",
            "payment_method": payment_method,
            "admin_id": admin_id,
            "scheduled_at": data.scheduled_at
        }

        if matched_driver and not is_scheduled:
            ride_data.update({
                "driver_id": matched_driver.get('id'),
                "assigned_at": datetime.utcnow().isoformat(),
                "driver_eta_minutes": eta_minutes,
                "contact_code": contact_code,
                "contact_active": True
            })
        
        result = supabase.table("rides").insert(ride_data).execute()
        if result.data:
            if matched_driver and not is_scheduled:
                driver_name = matched_driver.get('full_name', 'Chofè')
                vehicle_brand = matched_driver.get('vehicle_brand') or ''
                vehicle_model = matched_driver.get('vehicle_model') or ''
                vehicle_color = matched_driver.get('vehicle_color') or 'Pa disponib'
                eta_text = f"{eta_minutes} min" if eta_minutes is not None else "Byen vit"
                create_notification(
                    current_user['user_id'],
                    "passenger",
                    "Chofè jwenn",
                    f"{driver_name} ap rive nan {eta_text}. Veyikil: {vehicle_brand} {vehicle_model} (Koulè: {vehicle_color}). Kòd apèl: {contact_code}."
                )
                create_notification(
                    matched_driver.get('id'),
                    "driver",
                    "Nouvo kous",
                    f"Pickup: {data.pickup_address}. Destinasyon: {data.destination_address}. Kòd apèl: {contact_code}."
                )
                return {
                    "success": True,
                    "ride": result.data[0],
                    "assigned_driver": {
                        "id": matched_driver.get('id'),
                        "full_name": driver_name,
                        "vehicle_type": matched_driver.get('vehicle_type'),
                        "vehicle_brand": vehicle_brand,
                        "vehicle_model": vehicle_model,
                        "vehicle_color": vehicle_color
                    },
                    "eta_minutes": eta_minutes,
                    "contact_code": contact_code
                }
            return {"success": True, "ride": result.data[0]}
        raise HTTPException(status_code=500, detail="Ride creation failed")
    except Exception as e:
        logger.error(f"Ride creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/rides")
async def get_rides(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get rides based on user type"""
    try:
        query = supabase.table("rides").select("*")
        
        if current_user['user_type'] == 'passenger':
            query = query.eq("passenger_id", current_user['user_id'])
        elif current_user['user_type'] == 'driver':
            driver_info = supabase.table("drivers").select("admin_id,vehicle_type").eq("id", current_user['user_id']).execute()
            driver_data = driver_info.data[0] if driver_info.data else {}
            driver_admin_id = driver_data.get("admin_id")
            driver_vehicle = driver_data.get("vehicle_type")

            if status and status != "pending":
                query = query.eq("driver_id", current_user['user_id']).eq("status", status)
            else:
                if driver_admin_id:
                    scope_clause = f"and(status.eq.pending,driver_id.is.null,admin_id.eq.{driver_admin_id},vehicle_type.eq.{driver_vehicle})"
                else:
                    scope_clause = f"and(status.eq.pending,driver_id.is.null,admin_id.is.null,vehicle_type.eq.{driver_vehicle})"
                if status == "pending":
                    query = query.or_(f"and(driver_id.eq.{current_user['user_id']},status.eq.pending),{scope_clause}")
                else:
                    query = query.or_(f"driver_id.eq.{current_user['user_id']},{scope_clause}")
        
        if status and current_user['user_type'] != 'driver':
            query = query.eq("status", status)
        
        result = query.order("created_at", desc=True).execute()
        rides = result.data or []

        if current_user['user_type'] == 'driver' and rides:
            passenger_ids = list({r.get("passenger_id") for r in rides if r.get("passenger_id")})
            if passenger_ids:
                passengers = (
                    supabase.table("passengers")
                    .select("id,full_name,phone")
                    .in_("id", passenger_ids)
                    .execute()
                    .data
                    or []
                )
                passenger_map = {p["id"]: p for p in passengers}
                for ride in rides:
                    passenger = passenger_map.get(ride.get("passenger_id"))
                    if passenger:
                        ride["passenger_name"] = passenger.get("full_name")
                        ride["passenger_phone"] = passenger.get("phone")

        return {"rides": rides}
    except Exception as e:
        logger.error(f"Get rides error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _create_test_ride_for_driver(driver_id: str):
    try:
        driver_result = supabase.table("drivers").select(
            "id,full_name,vehicle_type,city,admin_id,current_lat,current_lng"
        ).eq("id", driver_id).execute()
        if not driver_result.data:
            raise HTTPException(status_code=404, detail="Driver not found")
        driver = driver_result.data[0]

        active_check = (
            supabase.table("rides")
            .select("id")
            .eq("driver_id", driver_id)
            .in_("status", ["pending", "accepted", "arrived", "started"])
            .execute()
        )
        if active_check.data:
            return {"success": False, "message": "Driver already has an active ride"}

        base_lat = float(driver.get("current_lat") or 18.5944)
        base_lng = float(driver.get("current_lng") or -72.3074)
        pickup_lat, pickup_lng = generate_test_coords(base_lat, base_lng, 0.5, 2.0)
        dest_lat, dest_lng = generate_test_coords(base_lat, base_lng, 1.5, 5.0)

        distance_km = calculate_distance_km(pickup_lat, pickup_lng, dest_lat, dest_lng)
        duration_min = max(5, distance_km * 3)

        cities = supabase.table("cities").select("*").execute().data or []
        city_name = driver.get("city") or ""
        city_data = next(
            (c for c in cities if str(c.get("name", "")).lower() == str(city_name).lower()),
            cities[0] if cities else {
                'base_fare_moto': 50,
                'base_fare_car': 100,
                'price_per_km_moto': 25,
                'price_per_km_car': 50,
                'price_per_min_moto': 5,
                'price_per_min_car': 10,
                'surge_multiplier': 1.0
            }
        )

        vehicle_type = driver.get("vehicle_type") or "car"
        pricing = calculate_ride_price(city_data, distance_km, duration_min, None)

        ride_data = {
            "id": str(uuid.uuid4()),
            "passenger_id": None,
            "driver_id": driver_id,
            "pickup_lat": pickup_lat,
            "pickup_lng": pickup_lng,
            "pickup_address": f"Pickup Test ({city_name or 'TapTapGo'})",
            "destination_lat": dest_lat,
            "destination_lng": dest_lng,
            "destination_address": f"Destination Test ({city_name or 'TapTapGo'})",
            "vehicle_type": vehicle_type,
            "status": "pending",
            "estimated_distance": round(distance_km, 2),
            "estimated_duration": round(duration_min, 2),
            "estimated_price": pricing.get("total", 0),
            "payment_method": "cash",
            "city": city_name or None,
            "admin_id": driver.get("admin_id")
        }

        result = supabase.table("rides").insert(ride_data).execute()
        if result.data:
            create_notification(
                driver_id,
                "driver",
                "Kous tès",
                "Yon kous tès disponib pou ou."
            )
            return {"success": True, "ride": result.data[0]}
        raise HTTPException(status_code=500, detail="Test ride creation failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create test ride error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _create_test_ride_for_scope(
    admin_id: Optional[str],
    city_name: Optional[str],
    vehicle_type: str,
    pickup_lat: Optional[float] = None,
    pickup_lng: Optional[float] = None,
    pickup_address: Optional[str] = None,
    destination_lat: Optional[float] = None,
    destination_lng: Optional[float] = None,
    destination_address: Optional[str] = None
):
    try:
        base_lat = 18.5944
        base_lng = -72.3074
        if pickup_lat is None or pickup_lng is None:
            pickup_lat, pickup_lng = generate_test_coords(base_lat, base_lng, 0.5, 2.0)
        if destination_lat is None or destination_lng is None:
            destination_lat, destination_lng = generate_test_coords(base_lat, base_lng, 1.5, 5.0)

        distance_km = calculate_distance_km(pickup_lat, pickup_lng, destination_lat, destination_lng)
        duration_min = max(5, distance_km * 3)

        cities = supabase.table("cities").select("*").execute().data or []
        city_data = next(
            (c for c in cities if str(c.get("name", "")).lower() == str(city_name or "").lower()),
            cities[0] if cities else {
                'base_fare_moto': 50,
                'base_fare_car': 100,
                'price_per_km_moto': 25,
                'price_per_km_car': 50,
                'price_per_min_moto': 5,
                'price_per_min_car': 10,
                'surge_multiplier': 1.0
            }
        )

        pricing = calculate_ride_price(city_data, distance_km, duration_min, None)

        ride_data = {
            "id": str(uuid.uuid4()),
            "passenger_id": None,
            "driver_id": None,
            "pickup_lat": pickup_lat,
            "pickup_lng": pickup_lng,
            "pickup_address": pickup_address or f"Pickup Test ({city_name or 'TapTapGo'})",
            "destination_lat": destination_lat,
            "destination_lng": destination_lng,
            "destination_address": destination_address or f"Destination Test ({city_name or 'TapTapGo'})",
            "vehicle_type": vehicle_type,
            "status": "pending",
            "estimated_distance": round(distance_km, 2),
            "estimated_duration": round(duration_min, 2),
            "estimated_price": pricing.get("total", 0),
            "payment_method": "cash",
            "city": city_name or None,
            "admin_id": admin_id
        }

        result = supabase.table("rides").insert(ride_data).execute()
        if result.data:
            return result.data[0]
        raise HTTPException(status_code=500, detail="Test ride creation failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create test ride scope error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/rides/test")
async def create_test_ride_admin(payload: TestRideRequest, current_user: dict = Depends(get_current_user)):
    """Create a test ride for a specific driver (admin/superadmin)"""
    if current_user['user_type'] not in ['admin', 'subadmin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    if payload.driver_id:
        return await _create_test_ride_for_driver(payload.driver_id)

    admin_id = None
    admin_city = None
    admin_brand_name = None
    if current_user['user_type'] == 'superadmin':
        admin_id = payload.admin_id
    elif current_user['user_type'] in ['admin', 'subadmin']:
        admin_id = current_user['admin_id'] if current_user['user_type'] == 'subadmin' else current_user['user_id']
        admin = supabase.table("admins").select("cities,brand_name").eq("id", admin_id).execute()
        if admin.data:
            admin_city = (admin.data[0].get("cities") or [None])[0]
            admin_brand_name = admin.data[0].get("brand_name")

    city_name = payload.city or admin_city
    vehicle_type = payload.vehicle_type
    created = []

    if vehicle_type:
        created.append(await _create_test_ride_for_scope(
            admin_id,
            city_name,
            vehicle_type,
            pickup_lat=payload.pickup_lat,
            pickup_lng=payload.pickup_lng,
            pickup_address=payload.pickup_address,
            destination_lat=payload.destination_lat,
            destination_lng=payload.destination_lng,
            destination_address=payload.destination_address
        ))
    else:
        for vtype in ["moto", "car"]:
            created.append(await _create_test_ride_for_scope(
                admin_id,
                city_name,
                vtype,
                pickup_lat=payload.pickup_lat,
                pickup_lng=payload.pickup_lng,
                pickup_address=payload.pickup_address,
                destination_lat=payload.destination_lat,
                destination_lng=payload.destination_lng,
                destination_address=payload.destination_address
            ))

    return {"success": True, "created": len(created), "rides": created}

@api_router.get("/rides/test/active")
async def list_active_test_rides(
    admin_id: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List active (pending) test rides for admin/superadmin"""
    if current_user['user_type'] not in ['admin', 'subadmin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        scoped_admin_id = admin_id
        if current_user['user_type'] in ['admin', 'subadmin']:
            scoped_admin_id = current_user['admin_id'] if current_user['user_type'] == 'subadmin' else current_user['user_id']

        query = supabase.table("rides").select(
            "id,admin_id,vehicle_type,city,pickup_address,destination_address,status,created_at"
        ).eq("status", "pending").is_("passenger_id", None)

        if scoped_admin_id:
            query = query.eq("admin_id", scoped_admin_id)
        else:
            query = query.is_("admin_id", None)

        if vehicle_type:
            query = query.eq("vehicle_type", vehicle_type)

        result = query.order("created_at", desc=True).execute()
        return {"rides": result.data or []}
    except Exception as e:
        logger.error(f"List test rides error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/rides/test/auto")
async def create_test_ride_driver(current_user: dict = Depends(get_current_user)):
    """Create a test ride for the current driver"""
    if current_user['user_type'] != 'driver':
        raise HTTPException(status_code=403, detail="Not authorized")
    return await _create_test_ride_for_driver(current_user['user_id'])

@api_router.put("/rides/{ride_id}/accept")
async def accept_ride(ride_id: str, current_user: dict = Depends(get_current_user)):
    """Driver accepts a ride"""
    if current_user['user_type'] != 'driver':
        raise HTTPException(status_code=403, detail="Only drivers can accept rides")
    
    try:
        ride_lookup = supabase.table("rides").select("id,driver_id,status").eq("id", ride_id).execute()
        if not ride_lookup.data:
            raise HTTPException(status_code=404, detail="Ride not found")
        ride = ride_lookup.data[0]
        if ride.get('driver_id') and ride.get('driver_id') != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Not authorized for this ride")

        busy_check = (
            supabase.table("rides")
            .select("id")
            .eq("driver_id", current_user['user_id'])
            .in_("status", ["accepted", "arrived", "started"])
            .execute()
        )
        if busy_check.data:
            raise HTTPException(status_code=400, detail="Driver already has an active ride")

        result = supabase.table("rides").update({
            "driver_id": current_user['user_id'],
            "status": "accepted"
        }).eq("id", ride_id).eq("status", "pending").execute()
        
        if result.data:
            return {"success": True, "ride": result.data[0]}
        raise HTTPException(status_code=404, detail="Ride not found or already accepted")
    except Exception as e:
        logger.error(f"Accept ride error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/rides/{ride_id}/status")
async def update_ride_status(ride_id: str, data: RideStatusUpdate, current_user: dict = Depends(get_current_user)):
    """Update ride status"""
    try:
        update_data = {"status": data.status}
        
        if data.status == 'started':
            update_data['started_at'] = datetime.utcnow().isoformat()
        elif data.status == 'completed':
            update_data['completed_at'] = datetime.utcnow().isoformat()
            update_data['contact_active'] = False
        elif data.status == 'cancelled':
            update_data['cancelled_at'] = datetime.utcnow().isoformat()
            update_data['contact_active'] = False
            if data.reason:
                update_data['cancel_reason'] = data.reason
        
        ride_query = supabase.table("rides").select("id,passenger_id,driver_id,status,city,admin_id,estimated_price,final_price").eq("id", ride_id)
        ride_result = ride_query.execute()
        if not ride_result.data:
            raise HTTPException(status_code=404, detail="Ride not found")
        ride = ride_result.data[0]
        was_completed = ride.get("status") == "completed"

        if current_user['user_type'] == 'passenger':
            if ride.get('passenger_id') != current_user['user_id']:
                raise HTTPException(status_code=403, detail="Not authorized")
            if data.status == 'cancelled' and ride.get('status') not in ['pending', 'scheduled']:
                raise HTTPException(status_code=400, detail="Only pending or scheduled rides can be cancelled")
        elif current_user['user_type'] == 'driver':
            if ride.get('driver_id') != current_user['user_id']:
                raise HTTPException(status_code=403, detail="Not authorized")
        elif current_user['user_type'] not in ['admin', 'subadmin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Not authorized")

        if data.status == 'completed':
            estimated_price = ride.get('estimated_price') or 0
            final_price = ride.get('final_price') or estimated_price
            update_data['final_price'] = final_price

        result = supabase.table("rides").update(update_data).eq("id", ride_id).execute()
        
        if result.data:
            if data.status == "completed" and not was_completed:
                driver_id = ride.get("driver_id")
                if driver_id:
                    fp = float(result.data[0].get("final_price") or ride.get("estimated_price") or 0)
                    _credit_driver_wallet_after_ride(
                        ride_id, driver_id, fp,
                        ride.get("city"), ride.get("admin_id"),
                    )
            return {"success": True, "ride": result.data[0]}
        raise HTTPException(status_code=404, detail="Ride not found")
    except Exception as e:
        logger.error(f"Update ride status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/rides/{ride_id}/rate")
async def rate_ride(ride_id: str, data: RideRating, current_user: dict = Depends(get_current_user)):
    """Rate a completed ride"""
    try:
        if current_user['user_type'] == 'passenger':
            update_data = {
                "driver_rating": data.rating,
                "passenger_comment": data.comment
            }
        else:
            update_data = {
                "passenger_rating": data.rating,
                "driver_comment": data.comment
            }
        
        result = supabase.table("rides").update(update_data).eq("id", ride_id).execute()
        
        if result.data:
            return {"success": True}
        raise HTTPException(status_code=404, detail="Ride not found")
    except Exception as e:
        logger.error(f"Rate ride error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== WALLET & RETRAITS (chauffeur + admin) ==============

@api_router.get("/wallet")
async def get_wallet(current_user: dict = Depends(get_current_user)):
    """Driver: get wallet balance and withdrawal eligibility."""
    if current_user["user_type"] != "driver":
        raise HTTPException(status_code=403, detail="Driver only")
    chauffeur_id = current_user["user_id"]
    try:
        wallet = _get_or_create_wallet(chauffeur_id)
        balance = float(wallet.get("balance") or 0)
        balance_en_attente = float(wallet.get("balance_en_attente") or 0)
        total_gagne = float(wallet.get("total_gagne") or 0)
        total_retire = float(wallet.get("total_retire") or 0)

        # Dernier retrait (demande) pour délai 24h
        dernier = (
            supabase.table("retraits")
            .select("date_demande,date_traitement")
            .eq("chauffeur_id", chauffeur_id)
            .in_("statut", ["en_attente", "traite"])
            .order("date_demande", desc=True)
            .limit(1)
            .execute()
        )
        dernier_retrait_ts = None
        if dernier.data:
            dt = dernier.data[0].get("date_traitement") or dernier.data[0].get("date_demande")
            if dt:
                try:
                    dernier_retrait_ts = datetime.fromisoformat(dt.replace("Z", "+00:00")).timestamp()
                except Exception:
                    pass

        possible = True
        raison = None
        prochain_retrait = None
        if balance < REGLES_RETRAIT["montant_minimum"]:
            possible = False
            raison = f"Balans minimum: {REGLES_RETRAIT['montant_minimum']} HTG"
        elif dernier_retrait_ts:
            heures_depuis = (datetime.utcnow().timestamp() - dernier_retrait_ts) / 3600
            if heures_depuis < REGLES_RETRAIT["delai_entre_retraits_heures"]:
                possible = False
                restant = REGLES_RETRAIT["delai_entre_retraits_heures"] - heures_depuis
                raison = f"Pwochen retrait posib nan {int(restant)}h"
                prochain_retrait = dernier_retrait_ts + REGLES_RETRAIT["delai_entre_retraits_heures"] * 3600

        type_retrait = "automatique_disponible" if balance >= REGLES_RETRAIT["seuil_automatique"] else "manuel_seulement"
        message = "Retrait disponib kounye a" if type_retrait == "automatique_disponible" else f"Retrait manuel (Oto a pati de {REGLES_RETRAIT['seuil_automatique']} HTG)"

        return {
            "wallet": {
                "balance": balance,
                "balance_en_attente": balance_en_attente,
                "total_gagne": total_gagne,
                "total_retire": total_retire,
            },
            "retrait_possible": possible,
            "raison": raison,
            "prochain_retrait_ts": prochain_retrait,
            "type_retrait": type_retrait,
            "message": message,
            "regles": REGLES_RETRAIT,
        }
    except Exception as e:
        logger.error(f"Get wallet error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/wallet/transactions")
async def get_wallet_transactions(
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """Driver: transaction history."""
    if current_user["user_type"] != "driver":
        raise HTTPException(status_code=403, detail="Driver only")
    chauffeur_id = current_user["user_id"]
    try:
        r = (
            supabase.table("driver_transactions")
            .select("id,ride_id,retrait_id,type_txn,montant,montant_total,gain_chauffeur,methode,reference,created_at")
            .eq("chauffeur_id", chauffeur_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        retraits = (
            supabase.table("retraits")
            .select("id,montant,methode,statut,date_demande,date_traitement")
            .eq("chauffeur_id", chauffeur_id)
            .order("date_demande", desc=True)
            .limit(limit)
            .execute()
        )
        out = []
        for t in r.data or []:
            out.append({
                "id": t.get("id"),
                "type": t.get("type_txn"),
                "montant": float(t.get("montant") or 0),
                "montant_total": t.get("montant_total") and float(t["montant_total"]),
                "gain_chauffeur": t.get("gain_chauffeur") and float(t["gain_chauffeur"]),
                "methode": t.get("methode"),
                "reference": t.get("reference"),
                "date": t.get("created_at"),
                "ride_id": t.get("ride_id"),
            })
        for ret in retraits.data or []:
            out.append({
                "id": ret.get("id"),
                "type": "retrait_demande" if ret.get("statut") == "en_attente" else "retrait_traite" if ret.get("statut") == "traite" else "retrait_annule",
                "montant": -float(ret.get("montant") or 0),
                "methode": ret.get("methode"),
                "date": ret.get("date_traitement") or ret.get("date_demande"),
                "retrait_id": ret.get("id"),
                "statut": ret.get("statut"),
            })
        out.sort(key=lambda x: (x.get("date") or ""), reverse=True)
        return {"transactions": out[:limit]}
    except Exception as e:
        logger.error(f"Wallet transactions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/wallet/withdraw")
async def request_withdraw(data: WithdrawRequest, current_user: dict = Depends(get_current_user)):
    """Driver: request withdrawal."""
    if current_user["user_type"] != "driver":
        raise HTTPException(status_code=403, detail="Driver only")
    if data.methode not in ("moncash", "natcash", "bank"):
        raise HTTPException(status_code=400, detail="Methode dwe moncash, natcash oswa bank")
    chauffeur_id = current_user["user_id"]
    montant = round(float(data.montant), 2)
    if montant < REGLES_RETRAIT["montant_minimum"]:
        raise HTTPException(status_code=400, detail=f"Montan minimum: {REGLES_RETRAIT['montant_minimum']} HTG")

    try:
        wallet = _get_or_create_wallet(chauffeur_id)
        balance = float(wallet.get("balance") or 0)
        if montant > balance:
            raise HTTPException(status_code=400, detail="Montan pi gran pase balans disponib")

        # Délai 24h
        dernier = (
            supabase.table("retraits")
            .select("date_traitement,date_demande")
            .eq("chauffeur_id", chauffeur_id)
            .in_("statut", ["en_attente", "traite"])
            .order("date_demande", desc=True)
            .limit(1)
            .execute()
        )
        if dernier.data:
            dt = dernier.data[0].get("date_traitement") or dernier.data[0].get("date_demande")
            if dt:
                try:
                    ts = datetime.fromisoformat(dt.replace("Z", "+00:00")).timestamp()
                    heures = (datetime.utcnow().timestamp() - ts) / 3600
                    if heures < REGLES_RETRAIT["delai_entre_retraits_heures"]:
                        restant = int(REGLES_RETRAIT["delai_entre_retraits_heures"] - heures)
                        raise HTTPException(status_code=400, detail=f"Pwochen retrait nan {restant}h")
                except HTTPException:
                    raise
                except Exception:
                    pass

        driver = supabase.table("drivers").select("full_name,phone,moncash_phone,natcash_phone,bank_name,bank_account_number,admin_id").eq("id", chauffeur_id).execute()
        if not driver.data:
            raise HTTPException(status_code=404, detail="Chofè pa jwenn")
        d = driver.data[0]
        numero_compte = None
        if data.methode == "moncash":
            numero_compte = (d.get("moncash_phone") or "").strip() or None
            if not numero_compte:
                raise HTTPException(status_code=400, detail="Antre nimewo MonCash nan profil ou")
        elif data.methode == "natcash":
            numero_compte = (d.get("natcash_phone") or "").strip() or None
            if not numero_compte:
                raise HTTPException(status_code=400, detail="Antre nimewo NatCash nan profil ou")
        elif data.methode == "bank":
            numero_compte = (d.get("bank_account_number") or "").strip() or None
            if not numero_compte:
                raise HTTPException(status_code=400, detail="Antre nimewo kont bank nan profil ou")

        type_retrait = "automatique_disponible" if balance >= REGLES_RETRAIT["seuil_automatique"] else "manuel_seulement"
        retrait_id = str(uuid.uuid4())
        supabase.table("retraits").insert({
            "id": retrait_id,
            "chauffeur_id": chauffeur_id,
            "admin_id": d.get("admin_id"),
            "montant": montant,
            "methode": data.methode,
            "numero_compte": numero_compte,
            "statut": "en_attente",
            "type_retrait": type_retrait,
        }).execute()

        new_balance = balance - montant
        new_attente = float(wallet.get("balance_en_attente") or 0) + montant
        supabase.table("driver_wallets").update({
            "balance": new_balance,
            "balance_en_attente": new_attente,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("chauffeur_id", chauffeur_id).execute()
        supabase.table("drivers").update({"wallet_balance": new_balance, "updated_at": datetime.utcnow().isoformat()}).eq("id", chauffeur_id).execute()

        create_notification(
            chauffeur_id,
            "driver",
            "Demann retrait anrejistre",
            f"{montant:.0f} HTG an kous de tretman. Ou ap resevwa yon notifikasyon le peyeman an fèt.",
        )
        return {
            "success": True,
            "retrait_id": retrait_id,
            "message": "Demann ou an kous de tretman. Ou ap resevwa yon notifikasyon le peyeman an fèt.",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Withdraw request error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/retraits")
async def list_retraits_admin(
    statut: Optional[str] = Query(None),
    methode: Optional[str] = Query(None),
    min_montant: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Admin/Superadmin: list withdrawal requests."""
    if current_user["user_type"] not in ("admin", "superadmin", "subadmin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        query = supabase.table("retraits").select(
            "id,chauffeur_id,admin_id,montant,methode,numero_compte,statut,type_retrait,date_demande,date_traitement,traite_par"
        )
        if statut:
            query = query.eq("statut", statut)
        else:
            query = query.eq("statut", "en_attente")
        if methode:
            query = query.eq("methode", methode)
        if min_montant is not None:
            query = query.gte("montant", min_montant)
        if current_user["user_type"] == "admin":
            query = query.eq("admin_id", current_user["user_id"])
        elif current_user["user_type"] == "subadmin" and current_user.get("admin_id"):
            query = query.eq("admin_id", current_user["admin_id"])
        r = query.order("date_demande", desc=True).execute()
        rows = r.data or []
        driver_ids = list({x["chauffeur_id"] for x in rows if x.get("chauffeur_id")})
        drivers = {}
        if driver_ids:
            dr = supabase.table("drivers").select(
                "id,full_name,phone,moncash_phone,natcash_phone,bank_name,bank_account_name,bank_account_number"
            ).in_("id", driver_ids).execute()
            for d in dr.data or []:
                drivers[d["id"]] = d
        out = []
        for row in rows:
            d = drivers.get(row["chauffeur_id"]) or {}
            out.append({
                **row,
                "chauffeur_nom": d.get("full_name"),
                "chauffeur_phone": d.get("phone"),
                "bank_name": d.get("bank_name"),
                "bank_account_name": d.get("bank_account_name"),
            })
        # Stats
        pending_count = len([x for x in out if x.get("statut") == "en_attente"])
        pending_total = sum(float(x.get("montant") or 0) for x in out if x.get("statut") == "en_attente")
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        traites_query = supabase.table("retraits").select("id,montant").eq("statut", "traite").gte("date_traitement", today_start)
        if current_user["user_type"] == "admin":
            traites_query = traites_query.eq("admin_id", current_user["user_id"])
        elif current_user["user_type"] == "subadmin" and current_user.get("admin_id"):
            traites_query = traites_query.eq("admin_id", current_user["admin_id"])
        traites_today = traites_query.execute()
        return {
            "retraits": out,
            "stats": {
                "en_attente_count": pending_count,
                "en_attente_total": round(pending_total, 2),
                "traites_aujourdhui_count": len(traites_today.data or []),
                "traites_aujourdhui_total": round(sum(float(x.get("montant") or 0) for x in (traites_today.data or [])), 2),
            },
        }
    except Exception as e:
        logger.error(f"List retraits error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/retraits/{retrait_id}/traiter")
async def traiter_retrait(retrait_id: str, current_user: dict = Depends(get_current_user)):
    """Mark withdrawal as paid."""
    if current_user["user_type"] not in ("admin", "superadmin", "subadmin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        ret = supabase.table("retraits").select("*").eq("id", retrait_id).execute()
        if not ret.data:
            raise HTTPException(status_code=404, detail="Retrait pa jwenn")
        row = ret.data[0]
        if row.get("statut") != "en_attente":
            raise HTTPException(status_code=400, detail="Retrait la pa an attant")
        chauffeur_id = row["chauffeur_id"]
        montant = float(row.get("montant") or 0)
        wallet = _get_or_create_wallet(chauffeur_id)
        attente = float(wallet.get("balance_en_attente") or 0) - montant
        total_retire = float(wallet.get("total_retire") or 0) + montant
        supabase.table("driver_wallets").update({
            "balance_en_attente": max(0, attente),
            "total_retire": total_retire,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("chauffeur_id", chauffeur_id).execute()
        supabase.table("retraits").update({
            "statut": "traite",
            "date_traitement": datetime.utcnow().isoformat(),
            "traite_par": current_user["user_id"],
        }).eq("id", retrait_id).execute()
        supabase.table("driver_transactions").insert({
            "chauffeur_id": chauffeur_id,
            "retrait_id": retrait_id,
            "type_txn": "retrait_traite",
            "montant": -montant,
            "methode": row.get("methode"),
            "reference": retrait_id,
            "statut": "ok",
        }).execute()
        create_notification(
            chauffeur_id,
            "driver",
            "Retrait efektue",
            f"{montant:.0f} HTG voye nan {row.get('methode', '').upper()}.",
        )
        return {"success": True, "message": "Retrait make kòm peye"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Traiter retrait error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/retraits/{retrait_id}/annuler")
async def annuler_retrait(retrait_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel withdrawal and refund driver wallet."""
    if current_user["user_type"] not in ("admin", "superadmin", "subadmin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        ret = supabase.table("retraits").select("*").eq("id", retrait_id).execute()
        if not ret.data:
            raise HTTPException(status_code=404, detail="Retrait pa jwenn")
        row = ret.data[0]
        if row.get("statut") != "en_attente":
            raise HTTPException(status_code=400, detail="Retrait la pa an attant")
        chauffeur_id = row["chauffeur_id"]
        montant = float(row.get("montant") or 0)
        wallet = _get_or_create_wallet(chauffeur_id)
        new_balance = float(wallet.get("balance") or 0) + montant
        attente = float(wallet.get("balance_en_attente") or 0) - montant
        supabase.table("driver_wallets").update({
            "balance": new_balance,
            "balance_en_attente": max(0, attente),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("chauffeur_id", chauffeur_id).execute()
        supabase.table("drivers").update({"wallet_balance": new_balance, "updated_at": datetime.utcnow().isoformat()}).eq("id", chauffeur_id).execute()
        supabase.table("retraits").update({
            "statut": "annule",
            "date_traitement": datetime.utcnow().isoformat(),
            "traite_par": current_user["user_id"],
        }).eq("id", retrait_id).execute()
        create_notification(
            chauffeur_id,
            "driver",
            "Retrait anile",
            f"{montant:.0f} HTG remet nan balans ou.",
        )
        return {"success": True, "message": "Retrait anile"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Annuler retrait error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== VEHICLE DATA ==============

@api_router.get("/vehicles/brands")
async def get_vehicle_brands(vehicle_type: str = 'car'):
    """Get vehicle brands"""
    if vehicle_type == 'moto':
        return {"brands": list(MOTO_BRANDS.keys())}
    return {"brands": list(VEHICLE_BRANDS.keys())}

@api_router.get("/vehicles/models/{brand}")
async def get_vehicle_models(brand: str, vehicle_type: str = 'car'):
    """Get vehicle models for a brand"""
    if vehicle_type == 'moto':
        models = MOTO_BRANDS.get(brand, [])
    else:
        models = VEHICLE_BRANDS.get(brand, [])
    return {"models": models}

# ============== ADMIN ENDPOINTS ==============

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    """Get admin statistics for their cities"""
    if current_user['user_type'] not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        if current_user['user_type'] == 'admin':
            admin = supabase.table("admins").select("cities,brand_name").eq("id", current_user['user_id']).execute()
            admin_cities = admin.data[0].get('cities', []) if admin.data else []
            admin_brand_name = admin.data[0].get('brand_name') if admin.data else None

            drivers_query = supabase.table("drivers").select("id,status")
            passengers_query = supabase.table("passengers").select("id")
            rides_query = supabase.table("rides").select("id,final_price,status")

            if admin_brand_name:
                drivers_query = drivers_query.eq("admin_id", current_user['user_id'])
                passengers_query = passengers_query.eq("admin_id", current_user['user_id'])
                rides_query = rides_query.eq("admin_id", current_user['user_id'])
            else:
                drivers_query = drivers_query.or_("admin_id.is.null,admin_id.eq.{0}".format(current_user['user_id']))
                passengers_query = passengers_query.or_("admin_id.is.null,admin_id.eq.{0}".format(current_user['user_id']))
                rides_query = rides_query.or_("admin_id.is.null,admin_id.eq.{0}".format(current_user['user_id']))

            if admin_cities:
                drivers_query = drivers_query.in_("city", admin_cities)
                passengers_query = passengers_query.in_("city", admin_cities)
                rides_query = rides_query.in_("city", admin_cities)

            drivers = drivers_query.execute()
            passengers = passengers_query.execute()
            rides = rides_query.execute()
        else:
            drivers = supabase.table("drivers").select("id,status").execute()
            passengers = supabase.table("passengers").select("id").execute()
            rides = supabase.table("rides").select("id,final_price,status").execute()
        
        driver_list = drivers.data or []
        ride_list = rides.data or []
        
        return {
            "total_drivers": len(driver_list),
            "pending_drivers": len([d for d in driver_list if d.get('status') == 'pending']),
            "approved_drivers": len([d for d in driver_list if d.get('status') == 'approved']),
            "total_passengers": len(passengers.data or []),
            "total_rides": len(ride_list),
            "completed_rides": len([r for r in ride_list if r.get('status') == 'completed']),
            "total_revenue": sum(r.get('final_price', 0) or 0 for r in ride_list if r.get('status') == 'completed')
        }
    except Exception as e:
        logger.error(f"Admin stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== USER PROFILE ==============

@api_router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    try:
        table_map = {
            'passenger': 'passengers',
            'driver': 'drivers',
            'admin': 'admins',
            'subadmin': 'subadmins',
            'superadmin': 'superadmins'
        }
        
        table = table_map.get(current_user['user_type'])
        result = supabase.table(table).select("*").eq("id", current_user['user_id']).execute()
        
        if result.data:
            user = result.data[0]
            user.pop('password_hash', None)
            user['user_type'] = current_user['user_type']
            return {"user": user}
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        logger.error(f"Get profile error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/profile/password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    """Change current user password"""
    try:
        table_map = {
            'passenger': 'passengers',
            'driver': 'drivers',
            'admin': 'admins',
            'subadmin': 'subadmins',
            'superadmin': 'superadmins'
        }
        table = table_map.get(current_user['user_type'])
        result = supabase.table(table).select("password_hash").eq("id", current_user['user_id']).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        hashed = result.data[0].get('password_hash')
        if not verify_password(data.current_password, hashed):
            raise HTTPException(status_code=400, detail="Invalid current password")
        supabase.table(table).update({
            "password_hash": hash_password(data.new_password),
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", current_user['user_id']).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change password error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/profile")
async def update_profile(data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    """Update current user profile"""
    try:
        table_map = {
            'passenger': 'passengers',
            'driver': 'drivers',
            'admin': 'admins',
            'superadmin': 'superadmins'
        }
        table = table_map.get(current_user['user_type'])
        allowed_fields = {'full_name', 'email', 'phone'}
        if current_user['user_type'] in {'passenger', 'driver'}:
            allowed_fields.update({'profile_photo', 'city'})
        if current_user['user_type'] == 'driver':
            allowed_fields.update({
                'vehicle_type',
                'vehicle_brand',
                'vehicle_model',
                'vehicle_color',
                'plate_number',
                'vehicle_photo',
                'license_photo',
                'vehicle_papers',
                'casier_judiciaire'
            })
        if current_user['user_type'] == 'passenger':
            allowed_fields.update({'moncash_enabled', 'moncash_phone', 'natcash_enabled', 'natcash_phone'})
        if current_user['user_type'] == 'driver':
            allowed_fields.update({
                'moncash_enabled',
                'moncash_phone',
                'natcash_enabled',
                'natcash_phone',
                'bank_enabled',
                'bank_name',
                'bank_account_name',
                'bank_account_number',
                'default_method'
            })
        if current_user['user_type'] == 'admin':
            allowed_fields.update({'logo', 'brand_name', 'primary_color', 'secondary_color', 'tertiary_color', 'cities'})
        update_data = {k: v for k, v in (data or {}).items() if k in allowed_fields}
        if current_user['user_type'] == 'admin' and 'cities' in update_data:
            if not isinstance(update_data['cities'], list):
                raise HTTPException(status_code=400, detail="Cities must be an array")
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        required_fields = {'full_name', 'email', 'phone'}
        if current_user['user_type'] in {'passenger', 'driver'}:
            required_fields.add('city')
        for key in required_fields:
            if key in update_data:
                value = update_data.get(key)
                if value is None or (isinstance(value, str) and not value.strip()):
                    raise HTTPException(status_code=400, detail=f"{key} is required")
        if current_user['user_type'] == 'passenger':
            if update_data.get('moncash_enabled'):
                if not (update_data.get('moncash_phone') and str(update_data.get('moncash_phone')).strip()):
                    raise HTTPException(status_code=400, detail="MonCash phone required")
            if update_data.get('natcash_enabled'):
                if not (update_data.get('natcash_phone') and str(update_data.get('natcash_phone')).strip()):
                    raise HTTPException(status_code=400, detail="NatCash phone required")
        if current_user['user_type'] == 'driver':
            if update_data.get('moncash_enabled'):
                if not (update_data.get('moncash_phone') and str(update_data.get('moncash_phone')).strip()):
                    raise HTTPException(status_code=400, detail="MonCash phone required")
            if update_data.get('natcash_enabled'):
                if not (update_data.get('natcash_phone') and str(update_data.get('natcash_phone')).strip()):
                    raise HTTPException(status_code=400, detail="NatCash phone required")
            if update_data.get('bank_enabled'):
                if not (update_data.get('bank_name') and str(update_data.get('bank_name')).strip()):
                    raise HTTPException(status_code=400, detail="Bank name required")
                if not (update_data.get('bank_account_name') and str(update_data.get('bank_account_name')).strip()):
                    raise HTTPException(status_code=400, detail="Account name required")
                if not (update_data.get('bank_account_number') and str(update_data.get('bank_account_number')).strip()):
                    raise HTTPException(status_code=400, detail="Account number required")
            if 'default_method' in update_data and update_data.get('default_method'):
                if update_data['default_method'] not in ['moncash', 'natcash', 'bank']:
                    raise HTTPException(status_code=400, detail="Invalid default method")
                if update_data['default_method'] == 'moncash' and not update_data.get('moncash_enabled'):
                    raise HTTPException(status_code=400, detail="MonCash must be enabled for default")
                if update_data['default_method'] == 'natcash' and not update_data.get('natcash_enabled'):
                    raise HTTPException(status_code=400, detail="NatCash must be enabled for default")
                if update_data['default_method'] == 'bank' and not update_data.get('bank_enabled'):
                    raise HTTPException(status_code=400, detail="Bank must be enabled for default")
        update_data["updated_at"] = datetime.utcnow().isoformat()
        result = supabase.table(table).update(update_data).eq("id", current_user['user_id']).execute()
        if result.data:
            user = result.data[0]
            user.pop('password_hash', None)
            user['user_type'] = current_user['user_type']
            return {"user": user}
        raise HTTPException(status_code=404, detail="User not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update profile error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== DRIVER VEHICLES (plusieurs véhicules par chauffeur) ==============

@api_router.get("/drivers/me/vehicles")
async def get_my_vehicles(current_user: dict = Depends(get_current_user)):
    """Liste des véhicules du chauffeur (véhicule principal + véhicules additionnels)"""
    if current_user['user_type'] != 'driver':
        raise HTTPException(status_code=403, detail="Driver only")
    driver_id = current_user['user_id']
    try:
        driver_row = supabase.table("drivers").select(
            "id,vehicle_type,vehicle_brand,vehicle_model,plate_number,vehicle_color"
        ).eq("id", driver_id).execute()
        primary = None
        if driver_row.data and len(driver_row.data) > 0:
            d = driver_row.data[0]
            primary = {
                "id": str(d["id"]),
                "is_primary": True,
                "vehicle_type": d.get("vehicle_type") or "car",
                "vehicle_brand": d.get("vehicle_brand") or "",
                "vehicle_model": d.get("vehicle_model") or "",
                "plate_number": d.get("plate_number") or "",
                "vehicle_color": d.get("vehicle_color"),
            }
        extra = supabase.table("driver_vehicles").select(
            "id,vehicle_type,vehicle_brand,vehicle_model,plate_number,vehicle_color,created_at"
        ).eq("driver_id", driver_id).order("created_at").execute()
        extra_list = []
        for row in (extra.data or []):
            extra_list.append({
                "id": str(row["id"]),
                "is_primary": False,
                "vehicle_type": row.get("vehicle_type") or "car",
                "vehicle_brand": row.get("vehicle_brand") or "",
                "vehicle_model": row.get("vehicle_model") or "",
                "plate_number": row.get("plate_number") or "",
                "vehicle_color": row.get("vehicle_color"),
                "created_at": row.get("created_at"),
            })
        return {"vehicles": [primary] + extra_list if primary else extra_list}
    except Exception as e:
        logger.error(f"Get my vehicles error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/drivers/me/vehicles")
async def add_my_vehicle(data: DriverVehicleCreate, current_user: dict = Depends(get_current_user)):
    """Ajouter un véhicule (moto ou machin)"""
    if current_user['user_type'] != 'driver':
        raise HTTPException(status_code=403, detail="Driver only")
    driver_id = current_user['user_id']
    if not data.vehicle_type or data.vehicle_type not in ("moto", "car"):
        raise HTTPException(status_code=400, detail="vehicle_type must be moto or car")
    if not (data.vehicle_brand and data.vehicle_brand.strip()):
        raise HTTPException(status_code=400, detail="vehicle_brand required")
    if not (data.vehicle_model and data.vehicle_model.strip()):
        raise HTTPException(status_code=400, detail="vehicle_model required")
    if not (data.plate_number and data.plate_number.strip()):
        raise HTTPException(status_code=400, detail="plate_number required")
    try:
        existing = supabase.table("drivers").select("plate_number").eq("id", driver_id).execute()
        plates = {existing.data[0].get("plate_number")} if existing.data else set()
        extra = supabase.table("driver_vehicles").select("plate_number").eq("driver_id", driver_id).execute()
        for r in (extra.data or []):
            plates.add(r.get("plate_number"))
        if data.plate_number.strip().upper() in {p.upper() for p in plates if p}:
            raise HTTPException(status_code=400, detail="Nimewo plak sa a egziste deja")
        vehicle_color_val = (data.vehicle_color or "").strip() or None
        row = {
            "driver_id": driver_id,
            "vehicle_type": data.vehicle_type.strip().lower(),
            "vehicle_brand": data.vehicle_brand.strip(),
            "vehicle_model": data.vehicle_model.strip(),
            "plate_number": data.plate_number.strip(),
            "vehicle_color": vehicle_color_val,
        }
        result = supabase.table("driver_vehicles").insert(row).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Insert failed")
        out = result.data[0]
        return {
            "vehicle": {
                "id": str(out["id"]),
                "is_primary": False,
                "vehicle_type": out.get("vehicle_type"),
                "vehicle_brand": out.get("vehicle_brand"),
                "vehicle_model": out.get("vehicle_model"),
                "plate_number": out.get("plate_number"),
                "vehicle_color": out.get("vehicle_color"),
                "created_at": out.get("created_at"),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add vehicle error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/drivers/me/vehicles/{vehicle_id}")
async def update_my_vehicle(
    vehicle_id: str, data: Dict[str, Any], current_user: dict = Depends(get_current_user)
):
    """Modifier un véhicule (principal sur drivers, ou dans driver_vehicles)"""
    if current_user['user_type'] != 'driver':
        raise HTTPException(status_code=403, detail="Driver only")
    driver_id = current_user['user_id']
    allowed = {"vehicle_type", "vehicle_brand", "vehicle_model", "plate_number", "vehicle_color"}
    update_data = {k: v for k, v in (data or {}).items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "vehicle_type" in update_data and update_data["vehicle_type"] not in ("moto", "car"):
        raise HTTPException(status_code=400, detail="vehicle_type must be moto or car")
    try:
        if vehicle_id == driver_id:
            result = supabase.table("drivers").update(update_data).eq("id", driver_id).execute()
            if not result.data:
                raise HTTPException(status_code=404, detail="User not found")
            return {"vehicle": {**result.data[0], "id": driver_id, "is_primary": True}}
        row = supabase.table("driver_vehicles").select("id").eq("id", vehicle_id).eq("driver_id", driver_id).execute()
        if not row.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        result = supabase.table("driver_vehicles").update(update_data).eq("id", vehicle_id).eq("driver_id", driver_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        out = result.data[0]
        return {"vehicle": {**out, "is_primary": False}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update vehicle error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/drivers/me/vehicles/{vehicle_id}")
async def delete_my_vehicle(vehicle_id: str, current_user: dict = Depends(get_current_user)):
    """Supprimer un véhicule additionnel (pas le véhicule principal)"""
    if current_user['user_type'] != 'driver':
        raise HTTPException(status_code=403, detail="Driver only")
    driver_id = current_user['user_id']
    if vehicle_id == driver_id:
        raise HTTPException(status_code=400, detail="Ou pa ka efase veyikil prensipal la")
    try:
        result = supabase.table("driver_vehicles").delete().eq("id", vehicle_id).eq("driver_id", driver_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete vehicle error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Build APK routes (SuperAdmin)
@api_router.post("/superadmin/builds/generate")
async def generate_build(data: BuildRequest, current_user: dict = Depends(get_current_user)):
    """Générer un build APK pour une marque"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can generate builds")

    try:
        brand = supabase.table("admins").select("*").eq("id", data.brand_id).execute()
        if not brand.data:
            raise HTTPException(status_code=404, detail="Brand not found")

        build_id = await build_service.create_build(data.brand_id, data.dict())
        return {"success": True, "build_id": build_id, "message": "Build started successfully"}
    except HTTPException:
        raise
    except Exception as e:
        err = str(e)
        if "Gen yon build" in err or "build k ap mache" in err:
            raise HTTPException(status_code=409, detail=err)
        logger.error(f"Build generation error: {e}")
        raise HTTPException(status_code=500, detail=err)


@api_router.post("/superadmin/builds/{build_id}/cancel")
async def cancel_build(build_id: str, current_user: dict = Depends(get_current_user)):
    """Anile yon build k ap mache."""
    if current_user.get("user_type") != "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Se SuperAdmin sèlman ki ka anile yon build.",
        )
    try:
        build_service.request_cancel(build_id)
        return {"success": True, "message": "Demann anilasyon voye. Build la ap sispann byento."}
    except Exception as e:
        logger.error(f"Cancel build error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/superadmin/builds/status/{build_id}")
async def get_build_status(build_id: str, current_user: dict = Depends(get_current_user)):
    """Obtenir le statut d'un build"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view builds")

    try:
        status = build_service.get_build_status(build_id)
        if not status:
            raise HTTPException(status_code=404, detail="Build not found")
        return {"build": status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get build status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/superadmin/builds")
async def list_builds(brand_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Lister tous les builds"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view builds")

    try:
        builds = build_service.list_builds(brand_id)
        return {"builds": builds}
    except Exception as e:
        logger.error(f"List builds error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/superadmin/builds/download/{build_id}")
async def download_build(build_id: str, current_user: dict = Depends(get_current_user)):
    """Télécharger l'APK d'un build"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can download builds")

    try:
        status = build_service.get_build_status(build_id)
        if not status:
            raise HTTPException(status_code=404, detail="Build not found")
        if status.get("status") != "success":
            raise HTTPException(status_code=400, detail=f"Build not ready. Status: {status.get('status')}")

        apk_path = Path(status.get("apk_path", ""))
        if not apk_path.exists():
            raise HTTPException(status_code=404, detail="APK file not found on server")

        return FileResponse(
            path=str(apk_path),
            media_type="application/vnd.android.package-archive",
            filename=apk_path.name,
            headers={"Content-Disposition": f"attachment; filename={apk_path.name}"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download build error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/superadmin/builds/submit")
async def submit_build_to_play_store(data: BuildSubmitRequest, current_user: dict = Depends(get_current_user)):
    """Soumèt un build EAS (cloud) nan Google Play Store"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can submit builds")
    try:
        result = build_service.submit_build_to_play_store(data.build_id, data.track or "internal")
        return {"success": True, **result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Submit build error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/superadmin/builds/cache/clear")
async def clear_build_cache(current_user: dict = Depends(get_current_user)):
    """Netwaye cache build pou SuperAdmin"""
    if current_user.get('user_type') != 'superadmin':
        raise HTTPException(
            status_code=403,
            detail="Se SuperAdmin sèlman ki ka netwaye cache build la. Konekte kòm SuperAdmin."
        )
    try:
        result = build_service.clear_build_cache()
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"Clear build cache error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/superadmin/builds/failed")
async def clear_failed_builds(brand_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Supprimer les builds échoués"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can clear failed builds")
    try:
        result = build_service.clear_failed_builds(brand_id)
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"Clear failed builds error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== LANDING PAGE (SuperAdmin gère tout) ==============

LANDING_DEFAULTS = {
    "hero_title": "Transpò <span class=\"highlight\">Rapid</span><br>Pou Tout <span class=\"highlight\">Ayiti</span>",
    "hero_subtitle": "Mande yon moto oswa machin kounye a. Pri klè, trajè rapid, chofè verifye. TapTapGo se sèvis transpò ki fèt pou nou!",
    "hero_btn1": "Telechaje Kounye A",
    "hero_btn2": "Mande Marque Pwop Ou",
    "sou_nou_content": "🚗 SOU NOU — Transpò Ki Fèt Pou Ayiti\n\n═══════════════════════════════════════\n\n🏆 ISTWA NOU : YON RÈV KI VIN REYALITE\n\nAne 2024, nou te wè yon pwoblèm ki afekte tout Ayisyen chak jou :\n❌ Pri transpò pa klè — ou pa janm konnen konbyen w ap peye\n❌ Sekirite pa asire — ou pa konnen ki moun k ap mennen w\n❌ Tan pèdi — 30 minit, 1 èdtan pou jwenn yon machin\n❌ Chofè san rekonpans jis pou travay yo\n\nNou te di : \"Sa dwe chanje.\" ✊\n\nJodi a, TapTapGo se platfòm pou transpò sekirize nan Ayiti. Nou ap grandi chak jou pou bay pi bon sèvis.\n\n═══════════════════════════════════════\n\n⚡ SA NOU FÈ — TRANSPÒ MODÈN NAN MEN W\n\nYon sèl app, tout solisyon :\n\n🎯 POU PASAJÈ :\n   ✓ Mande yon tras an 30 segonn\n   ✓ Wè pri FIX AVAN w monte (0 sipriz)\n   ✓ Suiv chofè w an TAN REYÈL sou kat la\n   ✓ Peye jan w vle : MonCash, NatCash, Cash, Kart Kredi\n   ✓ Siyal SOS an ka ijans\n\n🎯 POU CHOFÈ :\n   ✓ Aksepte kliyan 24/7 san bezwen tann nan lari\n   ✓ Touche lajan w dirèk, pa gen entèmedyè\n   ✓ Wè itinirè a avan w aksepte\n   ✓ Asirans ak sipò legal inkli\n\n═══════════════════════════════════════\n\n🛡️ SEKIRITE — PWIORITÉ NIMEWO 1\n\nNou pa jwe ak sekirite w :\n\n✅ TOUT chofè verifye (ID, Kasye Jidisyè, Fòmasyon)\n✅ Sistèm nòt 5 zetwal\n✅ Bouton SOS konekte ak fòs lòd\n✅ Tout tras anrejistre pou sekirite w\n✅ Sipò 24/7 si gen nenpòt pwoblèm\n\n═══════════════════════════════════════\n\n💰 TRANPARENS TOTAL — 0 KACH, 0 SIPRIZ\n\nAvan w monte, ou konnen EGZAKTEMAN :\n→ Konbyen w ap peye (pa gen ogmantasyon misteryez)\n→ Konbyen tan tras la ap pran\n→ Ki moun k ap mennen w (foto + non)\n→ Ki machin k ap vin pran w (plak + koulè)\n\n═══════════════════════════════════════\n\n🌟 POUKISA AYISYEN FÈ NOU KONFYANS\n\n\"Anvan, mwen te pè pran machin nan lari. Avèk TapTapGo, mwen ka voye pitit mwen lekòl an sekirite.\"\n— Marie J., Pòtoprens\n\n\"Mwen genyen plis kliyan kounye a. TapTapGo chanje lavi m.\"\n— Jean C., Chofè\n\n═══════════════════════════════════════\n\n🇭🇹 FÈT POU AYITI, PA AYISYEN\n\nNou pa se yon kopi aplikasyon etranje — nou konstwi TapTapGo spesyalman pou reyalite Ayiti :\n\n✓ Konpatib ak TOUT telefòn (pa bezwen iPhone)\n✓ Sipò nan 3 lang : Kreyòl, Fransè, Anglè\n✓ Peye ak lajan kach aksepte\n✓ Ekip sipò ki pale KREYÒL ak konprann kilti nou\n\n═══════════════════════════════════════\n\n🎁 KÒMANSE JODI A — 0 FRÈK\n\n📱 Telechaje app la GRATIS\n🎉 Premye tras ou : -20% avèk kòd BYENVINI\n🚀 Enskripsyon pran 2 minit\n\n═══════════════════════════════════════\n\n💬 KONTAKTE NOU\n\n📞 WhatsApp : [+509 XXXX XXXX]\n📧 Email : support@taptapgo.ht\n📍 Biwo : [Adrès]\n🕐 Disponib : 24/7\n\nPaske deplase pa dwe yon kalvè — li dwe yon dwa. 🇭🇹✨",
    "problem_title": "Rezon Ki Fè Ou Bezwen TapTapGo",
    "problem_subtitle": "Nou konprann pwoblèm transpò nan peyi a. Se pou sa nou kreye yon solisyon ki travay pou ou.",
    "problem_text": "Deplase nan Ayiti difisil. Ou pa konnen konbyen w ap peye, ou tann lontan, epi ou pa janm santi ou an sekirite. Pri yo pa klè, chofè yo pa disponib, epi transpò pa òganize byen.",
    "solution_text": "Ak TapTapGo, ou wè pri a avan w konfime, ou suiv chofè a an tan reyèl, epi ou peye avèk MonCash, NatCash oswa kach. Tout bagay klè, rapid, epi an sekirite. Transpò ki fèt pou Ayiti!",
    "features_title": "Sa Ou Ka Fè Ak TapTapGo",
    "features_subtitle": "Dekouvri tout fonksyonalite ki fè TapTapGo diferan",
    "feature_1_title": "Moto oswa Machin",
    "feature_1_text": "Chwazi ant moto pou trajè rapid oswa machin pou plis konfò. Ou deside!",
    "feature_2_title": "Pri Transparan",
    "feature_2_text": "Wè konbyen w ap peye avan w konfime kous la. Pa gen sipriz, tout bagay klè.",
    "feature_3_title": "Suiv An Tan Reyèl",
    "feature_3_text": "Gade kote chofè a ye sou kat la ak konbyen tan l ap pran pou rive jwenn ou.",
    "feature_4_title": "Plizyè Metòd Peman",
    "feature_4_text": "Peye avèk MonCash, NatCash, Bank oswa kach. Chwazi sa ki pi bon pou ou.",
    "feature_5_title": "Pwograme Kous Ou",
    "feature_5_text": "Mande yon kous kounye a oswa pwograme youn pou demen. Planifye deplasman w!",
    "feature_6_title": "Chofè Verifye",
    "feature_6_text": "Tout chofè yo pase nan yon pwosesis apwobasyon. Sekirite w se priyorite nou.",
    "how_title": "Kòman Sa Mache?",
    "how_subtitle": "Kòmanse vwayaje an 4 etap senp",
    "step_1_title": "Telechaje App La",
    "step_1_text": "Pran TapTapGo sou App Store oswa Play Store. Gratis nèt!",
    "step_2_title": "Enskri Ou",
    "step_2_text": "Kreye kont ou avèk nimewo telefòn w oswa imèl. Rapid e fasil.",
    "step_3_title": "Mande Kous Ou",
    "step_3_text": "Chwazi kote w ye ak kote w prale. Konfime pri a.",
    "step_4_title": "Vwayaje!",
    "step_4_text": "Chofè a ap vin pran w. Suiv li sou kat la epi anjoye trajè a!",
    "apps_title": "Telechaje Aplikasyon An",
    "apps_subtitle": "Yon app pou pasajè, yon lòt pou chofè",
    "app_passenger_title": "App Pasajè",
    "app_passenger_text": "Mande moto oswa machin nan nenpòt kote nan peyi a. Wè pri a, suiv chofè a, epi peye jan w vle.",
    "app_driver_title": "App Chofè",
    "app_driver_text": "Vin travay ak TapTapGo! Enskri ou, aksepte kous yo, epi touche lajan w. Jere revni w, gade istorik trajè w.",
    "app_unified_title": "Yon app, tout moun",
    "app_unified_text": "Si w vle mande kous, ouvri app la kòm pasajè. Si w vle vin chofè, chwazi mòd chofè. Mande moto oswa machin, suiv trajè a, peye fasil — oswa enskri ou kòm chofè, aksepte kous yo, epi touche lajan w. Tout bagay nan menm aplikasyon an.",
    "white_label_title": "Mande Solisyon Marque Pwop Ou (White-Label)",
    "white_label_intro": "Vil ou oswa antrepriz ou vle gen pwòp aplikasyon transpò li? Ak TapTapGo White-Label, ou ka gen non w, koulè w, ak zòn w. Ranpli fòmilè sa a pou nou kontakte w!",
    "why_title": "Poukisa Chwazi TapTapGo?",
    "why_subtitle": "Sa ki fè nou diferan",
    "benefit_1_title": "Sekirite",
    "benefit_1_text": "Chofè verifye, trajè suiv, sipò 24/7",
    "benefit_2_title": "Pri Klè",
    "benefit_2_text": "Wè pri a avan w konfime, pa gen frè kache",
    "benefit_3_title": "Fèt Pou Ayiti",
    "benefit_3_text": "Sistèm adapte pou reyalite ayisyen an",
    "benefit_4_title": "Rapid",
    "benefit_4_text": "Chofè yo toupre w, tan datant kout",
    "vehicle_images_title": "Transpò Nou Yo",
    "vehicle_images_subtitle": "Chwazi moto pou rapid oswa machin pou konfò. Chofè verifye, sekirite garanti.",
    "footer_text": "Transpò rapid, sekirize, ak pri klè pou tout Ayiti. Moto ak machin disponib 24/7.",
    "footer_copyright": "© 2026 TapTapGo. Tout dwa rezève. Fèt ak ❤️ pou Ayiti.",
}

# Structure du footer (colonnes + liens) pour contrôle total SuperAdmin
FOOTER_DEFAULTS = {
    "brand_title": "TapTapGo",
    "brand_text": "Transpò rapid, sekirize, ak pri klè pou tout Ayiti. Moto ak machin disponib 24/7.",
    "copyright": "© 2026 TapTapGo. Tout dwa rezève. Fèt ak ❤️ pou Ayiti.",
    "play_store_url": "https://play.google.com/store/apps/details?id=com.taptapgo.app",
    "app_store_url": "https://apps.apple.com/app/taptapgo",
    "direct_apk_url": "",
    "whitelabel_confirm_subject": "TapTapGo — Nou resevwa demann ou (Marque Pwop Ou)",
    "whitelabel_confirm_body": "Bonjou {{name}},\n\nMèsi paske ou te voye demann ou pou {{company}} ({{zone}}).\n\nNou resevwa li byen. Yon nan ekspè nou nan depatman an ap kontakte w pou yon kout diskisyon.\n\nNou ap reponn ou byento!\n\nBonjou,\nEkip TapTapGo",
    "support_sant_ed_content": "🆘 SANT ED — REPONS RAPID POU KESYON W\n\n═══════════════════════════════════════\n\n📱 SÈVI AK APP LA\n\n❓ Kijan mwen mande yon kous?\n✅ Ouvri app TapTapGo, antre adrès ou ak kote w prale. Konfime pri a epi chofè a ap vin pran w.\n\n❓ Kijan mwen ka anile yon kous?\n✅ Klike sou bouton \"Anile Kous\" avan chofè a rive. Si w anile apre 2 minit, ka gen yon ti frè anilasyon.\n\n❓ Èske mwen ka planifye yon kous pou pita?\n✅ Wi! Chwazi \"Planifye Kous\" epi seleksyone lè ak dat ou vle pati. Chofè a ap vin nan lè egzat.\n\n❓ Kijan mwen ka suiv chofè a?\n✅ Yon fwa w mande kous la, ou ap wè machin nan sou kat la an tan reyèl. Ou ka pataje trajè w ak fanmi w tou.\n\n❓ Èske mwen bezwen entènèt pou sèvi ak app la?\n✅ Ou bezwen entènèt pou mande kous la, men GPS la fonksyone ofline pou montre wout la.\n\n═══════════════════════════════════════\n\n💳 KESYON SOU PEMAN\n\n❓ Kijan mwen peye?\n✅ Ou kapab peye avèk MonCash, NatCash, kach oswa lòt metòd disponib nan app la.\n\n❓ Èske mwen ka peye apre kous la?\n✅ Wi! Si w chwazi \"Peye an Kach\", w ap peye chofè a dirèk apre kous la fini.\n\n❓ Èske gen frè kache?\n✅ NON! Pri ou wè avan w monte se pri total. 0 sipriz, 0 frè adisyonèl.\n\n❓ Èske mwen ka bay poubwa?\n✅ Wi! Ou ka bay poubwa an kach oswa ajoute l nan app la apre kous la.\n\n❓ Kijan mwen jwenn resi mwen?\n✅ Ale nan \"Istwa Kous\" epi klike sou kous la. Ou ka telechaje resi a oswa resevwa l pa imèl.\n\n═══════════════════════════════════════\n\n🛡️ SEKIRITE AK PWOTEKSYON\n\n❓ Kijan mwen konnen chofè a verifye?\n✅ TOUT chofè pase verifikasyon : ID nasyonal, kasye jidisyè, entèvyou, ak fòmasyon. Ou wè foto yo ak nòt yo nan app la.\n\n❓ Sa pou m fè si m santi m pa an sekirite?\n✅ Klike sou bouton SOS WOUJ la nan app la. Sa ap kontakte fòs lòd ak fanmi w otomatikman.\n\n❓ Èske fanmi m ka suiv kous mwen?\n✅ Wi! Ou ka pataje kous la an DIRÈK avèk moun ou fè konfyans. Yo ap wè egzakteman kote w ye.\n\n❓ Sa pase si m bliye yon bagay nan machin nan?\n✅ Kontakte nou imedyatman (24/7). Nou ap pale ak chofè a epi ede w jwenn bagay ou a.\n\n❓ Kijan mwen rapòte yon pwoblèm?\n✅ Ale nan \"Istwa Kous\", chwazi kous la, epi klike \"Rapòte Pwoblèm\". Nou ap reponn nan mwens pase 24 èdtan.\n\n═══════════════════════════════════════\n\n🚗 POU CHOFÈ YO\n\n❓ Kijan mwen vin chofè?\n✅ Ouvri app la, chwazi mòd chofè, epi ranpli fòmilè enskripsyon an. Ekip nou an ap verifye enfòmasyon w epi apwouve w.\n\n❓ Ki dokiman mwen bezwen?\n✅ ID nasyonal, pèmi kondi, kat gri machin nan, kat asirans, ak 2 foto pasepò.\n\n❓ Konbyen tan li pran pou yo apwouve m?\n✅ Si tout dokiman w kòrèk, apwobasyon an pran 24-48 èdtan.\n\n❓ Èske mwen peye pou enskripsyon?\n✅ NON! Enskripsyon an 100% GRATIS. Nou pa mande okenn frè davans.\n\n❓ Konbyen mwen ka fè pa jou?\n✅ Sa depann de konbyen kous ou aksepte. Chofè nou yo fè ant 1,500-5,000 goud pa jou an mwayèn.\n\n❓ Kilè mwen resevwa lajan mwen?\n✅ Lajan pou chak kous transfere OTOMATIKMAN chak jou oswa chak semèn selon preferans ou.\n\n❓ Èske mwen ka refize yon kous?\n✅ Wi! Ou ka aksepte oswa refize nenpòt kous. Men atansyon, si w refize twòp, sa ka afekte nòt ou.\n\n═══════════════════════════════════════\n\n⚙️ PWOBLÈM TEKNIK\n\n❓ App la pa ouvè — sa pou m fè?\n✅ 1) Verifye si ou gen dènye vèsyon an\n   2) Redémarre telefòn ou\n   3) Si sa pa mache, kontakte nou\n\n❓ Kijan mwen mete ajou app la?\n✅ Ale nan Play Store (Android) oswa App Store (iPhone), chèche \"TapTapGo\", epi klike \"Mete Ajou\".\n\n❓ App la manje twòp batri — poukisa?\n✅ GPS la itilize batri. Mete \"Mode Ekonomi Batri\" nan Settings pou redui sa.\n\n❓ Mwen pa resevwa notifikasyon — poukisa?\n✅ Ale nan Settings telefòn ou → Aplikasyon → TapTapGo → Notifikasyon epi aktive yo.\n\n❓ Kijan mwen chanje enfòmasyon mwen?\n✅ Ale nan \"Pwofil\" → \"Modifye Enfòmasyon\" → Fè chanjman yo → Anrejistre.\n\n═══════════════════════════════════════\n\n📞 GEN YON PWOBLÈM?\n\nKontakte nou pa telefòn, WhatsApp oswa imèl (gade \"Kontakte Nou\"). \n\n🕐 Nou la pou ede w 24/7!\n\n📱 WhatsApp : [+509 XXXX XXXX]\n📧 Email : support@taptapgo.ht\n💬 Chat Live : Nan app la\n\n═══════════════════════════════════════\n\n❓ PA JWENN REPONS OU?\n\n[BOUTON : PALE AK YON AJAN]\n[BOUTON : GADE VIDEYO EKSPLIKASYON]\n\nNou la pou ou, chak jou, chak èdtan! 💚",
    "support_kontak_content": "TapTapGo — Kontakte Nou\n\n• Telefòn sipò: +509 XX XX XX XX\n• WhatsApp: +509 XX XX XX XX\n• Imèl: sipò@taptapgoht.com\n\nLè nou ouvri: 24/7\n\nPou demann White-Label (marque pwop ou), ranpli fòmilè a sou paj sa a. Ekip nou an ap kontakte w byento.\n\nPou chofè ak pasajè: Ouvri app la epi ale nan \"Èd & Sipò\" pou jwenn lyen dirèk pou rele oswa WhatsApp.",
    "support_politik_content": _load_politik_content(),
    "support_video_url": "",
    "image_ride_url": "",
    "image_moto_url": "",
    "image_auto_url": "",
    "columns": [
        {
            "title": "Aplikasyon",
            "links": [
                {"label": "App Pasajè", "href": "#aplikasyon"},
                {"label": "App Chofè", "href": "#aplikasyon"},
                {"label": "Marque Pwop Ou", "href": "#marque-pwop"},
            ],
        },
        {
            "title": "Konpayi",
            "links": [
                {"label": "Fonksyonalite", "href": "#fonksyonalite"},
                {"label": "Sou Nou", "href": "#sou-nou"},
            ],
        },
        {
            "title": "Sipò",
            "links": [
                {"label": "Sant Èd", "href": "#sant-ed"},
                {"label": "Kontakte Nou", "href": "#kontakte-nou"},
                {"label": "Politik Konfidansyalite", "href": "#politik"},
            ],
        },
    ],
}


def _get_footer_merged() -> Dict[str, Any]:
    """Merge stored footer with defaults."""
    try:
        r = supabase.table("landing_content").select("value").eq("key", "footer").execute()
        stored = (r.data[0]["value"] or {}) if r.data else {}
    except Exception:
        stored = {}
    result = dict(FOOTER_DEFAULTS)
    if stored.get("brand_title") is not None:
        result["brand_title"] = stored["brand_title"]
    if stored.get("brand_text") is not None:
        result["brand_text"] = stored["brand_text"]
    if stored.get("copyright") is not None:
        result["copyright"] = stored["copyright"]
    if stored.get("play_store_url") is not None:
        result["play_store_url"] = stored["play_store_url"] or ""
    if stored.get("app_store_url") is not None:
        result["app_store_url"] = stored["app_store_url"] or ""
    if stored.get("direct_apk_url") is not None:
        result["direct_apk_url"] = stored["direct_apk_url"] or ""
    if stored.get("whitelabel_confirm_subject") is not None:
        result["whitelabel_confirm_subject"] = stored["whitelabel_confirm_subject"] or ""
    if stored.get("whitelabel_confirm_body") is not None:
        result["whitelabel_confirm_body"] = stored["whitelabel_confirm_body"] or ""
    # Utiliser le contenu stocké seulement s'il contient la version complète (ex: "SANT ED" ou "POU CHOFÈ YO")
    # Sinon garder FOOTER_DEFAULTS (version complète) pour corriger l'ancienne version tronquée en DB
    stored_sant_ed = stored.get("support_sant_ed_content") or ""
    if stored_sant_ed and ("SANT ED" in stored_sant_ed or "POU CHOFÈ YO" in stored_sant_ed or len(stored_sant_ed) > 1500):
        result["support_sant_ed_content"] = stored_sant_ed
    if stored.get("support_kontak_content") is not None:
        result["support_kontak_content"] = stored.get("support_kontak_content") or ""
    stored_politik = stored.get("support_politik_content") or ""
    if stored_politik and ("ENTWODIKSYON" in stored_politik or "REZIME RAPID" in stored_politik or len(stored_politik) > 2000):
        result["support_politik_content"] = stored_politik
    if stored.get("support_video_url") is not None:
        result["support_video_url"] = stored.get("support_video_url") or ""
    if stored.get("image_ride_url") is not None:
        result["image_ride_url"] = stored.get("image_ride_url") or ""
    if stored.get("image_moto_url") is not None:
        result["image_moto_url"] = stored.get("image_moto_url") or ""
    if stored.get("image_auto_url") is not None:
        result["image_auto_url"] = stored.get("image_auto_url") or ""
    if isinstance(stored.get("columns"), list) and len(stored["columns"]) > 0:
        result["columns"] = stored["columns"]
    return result


def _get_landing_merged() -> Dict[str, str]:
    """Merge stored content with defaults."""
    try:
        r = supabase.table("landing_content").select("value").eq("key", "sections").execute()
        stored = (r.data[0]["value"] or {}) if r.data else {}
    except Exception:
        stored = {}
    result = dict(LANDING_DEFAULTS)
    for k, v in stored.items():
        if v is not None and str(v).strip():
            result[k] = str(v)
    return result


@api_router.get("/landing")
async def get_landing_content():
    """Public - get landing page content + footer (merge defaults + stored)."""
    try:
        return {"content": _get_landing_merged(), "footer": _get_footer_merged()}
    except Exception as e:
        logger.error(f"Get landing error: {e}")
        return {"content": LANDING_DEFAULTS, "footer": FOOTER_DEFAULTS}


class WhiteLabelRequestCreate(BaseModel):
    company: str
    name: str
    phone: str
    email: EmailStr
    zone: str
    message: Optional[str] = None
    website: Optional[str] = None
    drivers: Optional[int] = None


class WhiteLabelRequestProcess(BaseModel):
    status: str = "processed"
    admin_notes: Optional[str] = None


class SupportMessageCreate(BaseModel):
    name: str
    phone: str
    email: str  # Validation souple — aksepte fòma tankou user@domain (pa mande TLD)
    message: str

    @field_validator("email")
    @classmethod
    def email_contains_at(cls, v: str) -> str:
        v = (v or "").strip()
        if not v or "@" not in v:
            raise ValueError("Imèl la dwe gen @ — egzanp: non@imel.com")
        if len(v) < 5:
            raise ValueError("Imèl la twò kout")
        return v


def _send_email_smtp(to_email: str, subject: str, body: str) -> None:
    """Envoie un email via SMTP. Lève une exception si SMTP non configuré ou échec."""
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    smtp_from = os.environ.get("SMTP_FROM") or smtp_user
    if not all([smtp_host, smtp_user, smtp_pass]):
        raise RuntimeError("SMTP non configuré (SMTP_HOST, SMTP_USER, SMTP_PASS)")
    msg = MIMEMultipart()
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain", "utf-8"))
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, to_email, msg.as_string())


@api_router.post("/landing/whitelabel-request")
async def create_whitelabel_request(data: WhiteLabelRequestCreate):
    """Public - soumettre une demande White-Label depuis le formulaire landing."""
    try:
        row = {
            "company": data.company.strip(),
            "name": data.name.strip(),
            "phone": data.phone.strip(),
            "email": data.email.strip(),
            "zone": data.zone.strip(),
            "message": (data.message or "").strip() or None,
            "website": (data.website or "").strip() or None,
            "drivers_estimate": data.drivers,
            "status": "pending",
        }
        r = supabase.table("white_label_requests").insert(row).execute()
        rid = r.data[0]["id"] if r.data else None
        footer = _get_footer_merged()
        subj = (footer.get("whitelabel_confirm_subject") or "").strip()
        body = (footer.get("whitelabel_confirm_body") or "").strip()
        if subj and body:
            subj = subj.replace("{{name}}", data.name).replace("{{company}}", data.company).replace("{{zone}}", data.zone)
            body = body.replace("{{name}}", data.name).replace("{{company}}", data.company).replace("{{zone}}", data.zone)
            try:
                _send_email_smtp(data.email.strip(), subj, body)
            except Exception as mail_err:
                logger.warning(f"Whitelabel auto-confirm email failed (request saved): {mail_err}")
        return {"success": True, "id": rid}
    except Exception as e:
        logger.error(f"Create whitelabel request error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/landing/whitelabel-requests")
async def list_whitelabel_requests(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = Query(None, description="Filtrer: pending, processed, archived"),
):
    """SuperAdmin only - lister les demandes White-Label."""
    if current_user.get("user_type") != "superadmin":
        raise HTTPException(status_code=403, detail="Se SuperAdmin sèlman")
    try:
        q = supabase.table("white_label_requests").select("*").order("created_at", desc=True)
        if status:
            q = q.eq("status", status)
        r = q.execute()
        return {"requests": r.data or []}
    except Exception as e:
        logger.error(f"List whitelabel requests error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.patch("/landing/whitelabel-requests/{request_id}")
async def process_whitelabel_request(
    request_id: str,
    data: WhiteLabelRequestProcess,
    current_user: dict = Depends(get_current_user),
):
    """SuperAdmin only - marquer une demande comme traitée."""
    if current_user.get("user_type") != "superadmin":
        raise HTTPException(status_code=403, detail="Se SuperAdmin sèlman")
    try:
        update = {
            "status": data.status,
            "admin_notes": data.admin_notes or None,
            "processed_at": datetime.utcnow().isoformat(),
            "processed_by": current_user.get("id"),
            "updated_at": datetime.utcnow().isoformat(),
        }
        r = supabase.table("white_label_requests").update(update).eq("id", request_id).execute()
        if not r.data:
            raise HTTPException(status_code=404, detail="Demann pa jwenn")
        return {"success": True, "request": r.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Process whitelabel request error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/landing/whitelabel-requests/{request_id}")
async def delete_whitelabel_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
):
    """SuperAdmin only - supprimer une demande White-Label."""
    if current_user.get("user_type") != "superadmin":
        raise HTTPException(status_code=403, detail="Se SuperAdmin sèlman ki ka efase.")
    try:
        supabase.table("white_label_requests").delete().eq("id", request_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete whitelabel request error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class WhitelabelSendEmail(BaseModel):
    subject: str
    message: str


@api_router.post("/landing/whitelabel-requests/{request_id}/send-email")
async def send_whitelabel_email(
    request_id: str,
    data: WhitelabelSendEmail,
    current_user: dict = Depends(get_current_user),
):
    """SuperAdmin only - envoyer un email au demandant depuis le modal."""
    if current_user.get("user_type") != "superadmin":
        raise HTTPException(status_code=403, detail="Se SuperAdmin sèlman")
    try:
        r = supabase.table("white_label_requests").select("email, name, company").eq("id", request_id).execute()
        if not r.data:
            raise HTTPException(status_code=404, detail="Demann pa jwenn")
        to_email = r.data[0]["email"]
        subject = (data.subject or "").strip() or "TapTapGo - Demann Marque Pwop Ou"
        body = (data.message or "").strip() or ""
        if not body:
            raise HTTPException(status_code=400, detail="Mesaj la pa ka vid.")
        _send_email_smtp(to_email, subject, body)
        return {"success": True, "detail": "Imèl la voye."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send whitelabel email error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/landing/support-message")
async def create_support_message(data: SupportMessageCreate):
    """Public - soumettre un message support depuis Sant Èd (bouton Pale Ak Yon Ajan)."""
    try:
        row = {
            "name": data.name.strip(),
            "phone": data.phone.strip(),
            "email": data.email.strip(),
            "message": (data.message or "").strip() or "",
        }
        r = supabase.table("support_messages").insert(row).execute()
        rid = r.data[0]["id"] if r.data else None
        return {"success": True, "id": rid}
    except Exception as e:
        logger.error(f"Create support message error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/support-messages")
async def list_support_messages(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = Query(None, description="pending, read, replied, archived"),
):
    """SuperAdmin et Admin - lister les messages support."""
    ut = current_user.get("user_type")
    if ut not in ("superadmin", "admin", "subadmin"):
        raise HTTPException(status_code=403, detail="Ou pa gen dwa pou wè mesaj sipò yo")
    try:
        q = supabase.table("support_messages").select("*").order("created_at", desc=True)
        if status:
            q = q.eq("status", status)
        r = q.execute()
        return {"messages": r.data or []}
    except Exception as e:
        logger.error(f"List support messages error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SupportMessageUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None


@api_router.patch("/support-messages/{message_id}")
async def update_support_message(
    message_id: str,
    data: SupportMessageUpdate,
    current_user: dict = Depends(get_current_user),
):
    """SuperAdmin et Admin - modifier un message support (statut, nòt)."""
    ut = current_user.get("user_type")
    if ut not in ("superadmin", "admin", "subadmin"):
        raise HTTPException(status_code=403, detail="Ou pa gen dwa pou modifye mesaj sipò")
    try:
        update = {"updated_at": datetime.utcnow().isoformat()}
        if data.status is not None:
            update["status"] = data.status
        if data.admin_notes is not None:
            update["admin_notes"] = data.admin_notes
        r = supabase.table("support_messages").update(update).eq("id", message_id).execute()
        if not r.data:
            raise HTTPException(status_code=404, detail="Mesaj pa jwenn")
        return {"success": True, "message": r.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update support message error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SupportMessageSendEmail(BaseModel):
    subject: Optional[str] = ""
    message: Optional[str] = ""


@api_router.post("/support-messages/{message_id}/send-email")
async def send_support_message_email(
    message_id: str,
    data: SupportMessageSendEmail,
    current_user: dict = Depends(get_current_user),
):
    """SuperAdmin et Admin - voye imèl bay moun ki voye mesaj sipò."""
    ut = current_user.get("user_type")
    if ut not in ("superadmin", "admin", "subadmin"):
        raise HTTPException(status_code=403, detail="Ou pa gen dwa pou voye imèl")
    try:
        r = supabase.table("support_messages").select("email, name, message").eq("id", message_id).execute()
        if not r.data:
            raise HTTPException(status_code=404, detail="Mesaj pa jwenn")
        to_email = r.data[0]["email"]
        subject = (data.subject or "").strip() or "TapTapGo — Repons pou mesaj ou"
        body = (data.message or "").strip() or ""
        if not body:
            raise HTTPException(status_code=400, detail="Mesaj la pa ka vid.")
        _send_email_smtp(to_email, subject, body)
        supabase.table("support_messages").update(
            {"status": "replied", "updated_at": datetime.utcnow().isoformat()}
        ).eq("id", message_id).execute()
        return {"success": True, "detail": "Imèl la voye."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send support message email error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class LandingUpdate(BaseModel):
    content: Dict[str, Optional[str]] = {}
    footer: Optional[Dict[str, Any]] = None


@api_router.put("/landing")
async def update_landing(data: LandingUpdate, current_user: dict = Depends(get_current_user)):
    """SuperAdmin only - update landing page content et/ou footer."""
    if current_user.get("user_type") != "superadmin":
        raise HTTPException(status_code=403, detail="Se SuperAdmin sèlman ki ka modifye landing la")
    try:
        if data.content is not None:
            stored = {}
            for k, v in data.content.items():
                if k in LANDING_DEFAULTS:
                    stored[k] = v if v is not None and str(v).strip() else None
            supabase.table("landing_content").upsert(
                {"key": "sections", "value": stored, "updated_at": datetime.utcnow().isoformat()},
                on_conflict="key",
            ).execute()
        if data.footer is not None:
            supabase.table("landing_content").upsert(
                {"key": "footer", "value": data.footer, "updated_at": datetime.utcnow().isoformat()},
                on_conflict="key",
            ).execute()
        return {"success": True, "content": _get_landing_merged(), "footer": _get_footer_merged()}
    except Exception as e:
        logger.error(f"Update landing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/landing")
async def reset_landing(current_user: dict = Depends(get_current_user)):
    """SuperAdmin only - reset landing et footer aux valeurs par défaut."""
    if current_user.get("user_type") != "superadmin":
        raise HTTPException(status_code=403, detail="Se SuperAdmin sèlman ki ka reyinite landing la")
    try:
        supabase.table("landing_content").upsert(
            {"key": "sections", "value": {}, "updated_at": datetime.utcnow().isoformat()},
            on_conflict="key",
        ).execute()
        supabase.table("landing_content").upsert(
            {"key": "footer", "value": {}, "updated_at": datetime.utcnow().isoformat()},
            on_conflict="key",
        ).execute()
        return {"success": True, "content": LANDING_DEFAULTS, "footer": FOOTER_DEFAULTS}
    except Exception as e:
        logger.error(f"Reset landing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Dossier landing (à la racine du projet)
LANDING_DIR = ROOT_DIR.parent / "landing"


@app.get("/landing", response_class=HTMLResponse)
def serve_landing(request: Request):
    """Sert la page landing. En localhost, remplace les liens domaine par localhost:8081."""
    index_path = LANDING_DIR / "index.html"
    if not index_path.is_file():
        raise HTTPException(status_code=404, detail="Landing page not found")
    html = index_path.read_text(encoding="utf-8")
    # En localhost, faire pointer les liens vers l'app front (8081)
    host = request.headers.get("host", "")
    if "localhost" in host or "127.0.0.1" in host:
        front_origin = "http://localhost:8081"
        html = html.replace("https://taptapgoht.com", front_origin)
    # Faire pointer les assets vers le backend
    html = html.replace('src="images/', 'src="/landing-assets/images/')
    html = html.replace('href="images/', 'href="/landing-assets/images/')
    html = html.replace("url('images/", "url('/landing-assets/images/")
    html = html.replace('url("images/', 'url("/landing-assets/images/')
    return HTMLResponse(html)


app.mount("/landing-assets", StaticFiles(directory=str(LANDING_DIR)), name="landing-assets")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down TapTapGo API")
