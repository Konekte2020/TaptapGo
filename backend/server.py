from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
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
from services.build_service import BuildService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://puncojujdabpljgbzkxg.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1bmNvanVqZGFicGxqZ2J6a3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODExMzEsImV4cCI6MjA4NTY1NzEzMX0.-hjhJL4ySnArNLE1QCCqdVtA9XFw_aGSpgm_LIjpHho')
JWT_SECRET = os.environ.get('JWT_SECRET', 'taptapgo-secret-key-2025')
JWT_ALGORITHM = 'HS256'

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
    base_fare: float
    price_per_km: float
    price_per_min: float
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
    base_fare: float
    price_per_km: float
    price_per_min: float
    surge_multiplier: float = 1.0
    commission_rate: float

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

def calculate_ride_price(city_data: dict, distance_km: float, duration_min: float, pricing_data: Optional[dict] = None) -> dict:
    """Calculate ride price based on pricing settings"""
    if pricing_data:
        base = pricing_data.get('base_fare', 0)
        per_km = pricing_data.get('price_per_km', 0)
        per_min = pricing_data.get('price_per_min', 0)
        surge = pricing_data.get('surge_multiplier', city_data.get('surge_multiplier', 1.0))
    else:
        base = city_data.get('base_fare_moto', 50)
        per_km = city_data.get('price_per_km_moto', 25)
        per_min = city_data.get('price_per_min_moto', 5)
        surge = city_data.get('surge_multiplier', 1.0)
    
    subtotal = base + (per_km * distance_km) + (per_min * duration_min)
    total = subtotal * surge
    
    return {
        'base_fare': base,
        'distance_fare': per_km * distance_km,
        'time_fare': per_min * duration_min,
        'surge_multiplier': surge,
        'subtotal': subtotal,
        'total': round(total, 2)
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

        -- Ensure admin pricing columns exist
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS base_fare DECIMAL DEFAULT 0;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS price_per_km DECIMAL DEFAULT 0;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS price_per_min DECIMAL DEFAULT 0;
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

        -- Pricing settings (platform vs white-label)
        CREATE TABLE IF NOT EXISTS pricing_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            scope TEXT UNIQUE NOT NULL,
            base_fare DECIMAL DEFAULT 0,
            price_per_km DECIMAL DEFAULT 0,
            price_per_min DECIMAL DEFAULT 0,
            commission_rate DECIMAL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT NOW()
        );

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
        logger.error(f"Admin creation error: {e}")
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
        pricing = result.data[0] if result.data else {
            "scope": scope,
            "base_fare": 0,
            "price_per_km": 0,
            "price_per_min": 0,
            "commission_rate": 0
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
        if data.base_fare < 0 or data.price_per_km < 0 or data.price_per_min < 0:
            raise HTTPException(status_code=400, detail="Prices must be >= 0")
        if data.commission_rate is not None and (data.commission_rate < 0 or data.commission_rate > 100):
            raise HTTPException(status_code=400, detail="Commission must be between 0 and 100")
        payload = {
            "scope": scope,
            "base_fare": data.base_fare,
            "price_per_km": data.price_per_km,
            "price_per_min": data.price_per_min,
            "commission_rate": data.commission_rate if data.commission_rate is not None else 0,
            "updated_at": datetime.utcnow().isoformat()
        }
        result = supabase.table("pricing_settings").upsert(payload, on_conflict="scope").execute()
        pricing = result.data[0] if result.data else payload
        return {"pricing": pricing}
    except Exception as e:
        logger.error(f"Pricing update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/pricing")
async def get_admin_pricing(current_user: dict = Depends(get_current_user)):
    """Get admin pricing (global, not per city)"""
    if current_user['user_type'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        result = supabase.table("admins").select(
            "base_fare,price_per_km,price_per_min,surge_multiplier,commission_rate"
        ).eq("id", current_user['user_id']).execute()
        pricing = result.data[0] if result.data else {
            "base_fare": 0,
            "price_per_km": 0,
            "price_per_min": 0,
            "surge_multiplier": 1.0,
            "commission_rate": 0
        }
        return {"pricing": pricing}
    except Exception as e:
        logger.error(f"Admin pricing get error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/pricing")
async def update_admin_pricing(data: AdminPricingUpdate, current_user: dict = Depends(get_current_user)):
    """Update admin pricing (global, not per city)"""
    if current_user['user_type'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    if data.base_fare < 0 or data.price_per_km < 0 or data.price_per_min < 0:
        raise HTTPException(status_code=400, detail="Prices must be >= 0")
    if data.commission_rate < 0 or data.commission_rate > 100:
        raise HTTPException(status_code=400, detail="Commission must be between 0 and 100")
    if data.surge_multiplier < 1:
        raise HTTPException(status_code=400, detail="Surge must be >= 1")
    try:
        payload = {
            "base_fare": data.base_fare,
            "price_per_km": data.price_per_km,
            "price_per_min": data.price_per_min,
            "surge_multiplier": data.surge_multiplier,
            "commission_rate": data.commission_rate,
            "updated_at": datetime.utcnow().isoformat()
        }
        result = supabase.table("admins").update(payload).eq("id", current_user['user_id']).execute()
        if result.data:
            return {"pricing": result.data[0]}
        raise HTTPException(status_code=404, detail="Admin not found")
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
            "verified_by": current_user['user_id']
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
            status_lookup = supabase.table("drivers").select("status").eq("id", driver_id).execute()
            if not status_lookup.data:
                raise HTTPException(status_code=404, detail="Driver not found")
            driver_status = status_lookup.data[0].get("status")
            if driver_status != "approved":
                raise HTTPException(
                    status_code=403,
                    detail="Kont ou an poko apwouve. Kontakte sèvis sipò si ou panse tan an twòp."
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
    """Get nearby available drivers"""
    try:
        query = supabase.table("drivers").select("*").eq("is_online", True).eq("status", "approved").eq("vehicle_type", vehicle_type).eq("city", city)
        result = query.execute()
        drivers = result.data or []

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
                    "base_fare,price_per_km,price_per_min,surge_multiplier"
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
            pricing_data
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
        
        ride_query = supabase.table("rides").select("id,passenger_id,driver_id,status").eq("id", ride_id)
        ride_result = ride_query.execute()
        if not ride_result.data:
            raise HTTPException(status_code=404, detail="Ride not found")
        ride = ride_result.data[0]

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
                'vehicle_papers'
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
        logger.error(f"Build generation error: {e}")
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


@api_router.post("/superadmin/builds/cache/clear")
async def clear_build_cache(current_user: dict = Depends(get_current_user)):
    """Netwaye cache build pou SuperAdmin"""
    if current_user['user_type'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Only SuperAdmin can clear build cache")
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down TapTapGo API")
