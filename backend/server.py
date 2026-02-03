from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
import base64
from supabase import create_client, Client
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://puncojujdabpljgbzkxg.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1bmNvanVqZGFicGxqZ2J6a3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODExMzEsImV4cCI6MjA4NTY1NzEzMX0.-hjhJL4ySnArNLE1QCCqdVtA9XFw_aGSpgm_LIjpHho')
JWT_SECRET = os.environ.get('JWT_SECRET', 'taptapgo-secret-key-2025')
JWT_ALGORITHM = 'HS256'

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

# ============== PYDANTIC MODELS ==============

# Auth Models
class UserRegisterPassenger(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    city: str
    password: str
    profile_photo: Optional[str] = None  # base64

class UserRegisterDriver(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    city: str
    vehicle_type: str  # 'moto' or 'car'
    vehicle_brand: str
    vehicle_model: str
    plate_number: str
    vehicle_photo: Optional[str] = None  # base64
    license_photo: Optional[str] = None  # base64
    vehicle_papers: Optional[str] = None  # base64
    profile_photo: Optional[str] = None  # base64
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

class AdminCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    cities: List[str] = []  # Cities this admin manages
    brand_name: Optional[str] = None
    logo: Optional[str] = None  # base64
    primary_color: Optional[str] = "#E53935"
    secondary_color: Optional[str] = "#1E3A5F"

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

class RideStatusUpdate(BaseModel):
    status: str  # 'accepted', 'arrived', 'started', 'completed', 'cancelled'

class RideRating(BaseModel):
    rating: int  # 1-5
    comment: Optional[str] = None

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

def calculate_ride_price(city_data: dict, vehicle_type: str, distance_km: float, duration_min: float) -> dict:
    """Calculate ride price based on city pricing"""
    if vehicle_type == 'moto':
        base = city_data.get('base_fare_moto', 50)
        per_km = city_data.get('price_per_km_moto', 25)
        per_min = city_data.get('price_per_min_moto', 5)
    else:
        base = city_data.get('base_fare_car', 100)
        per_km = city_data.get('price_per_km_car', 50)
        per_min = city_data.get('price_per_min_car', 10)
    
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
            is_online BOOLEAN DEFAULT FALSE,
            is_verified BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            current_lat DECIMAL,
            current_lng DECIMAL,
            rating DECIMAL DEFAULT 5.0,
            total_rides INTEGER DEFAULT 0,
            wallet_balance DECIMAL DEFAULT 0,
            admin_id UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Admins table (white-label)
        CREATE TABLE IF NOT EXISTS admins (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            cities TEXT[] DEFAULT '{}',
            brand_name TEXT,
            logo TEXT,
            primary_color TEXT DEFAULT '#E53935',
            secondary_color TEXT DEFAULT '#1E3A5F',
            commission_rate DECIMAL DEFAULT 10,
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

@api_router.post("/auth/register/passenger")
async def register_passenger(data: UserRegisterPassenger):
    """Register a new passenger"""
    try:
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
            "is_active": True
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
            "wallet_balance": 0
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
            'superadmin': 'superadmins'
        }
        
        table = table_map.get(data.user_type)
        if not table:
            raise HTTPException(status_code=400, detail="Invalid user type")
        
        # Find user by phone or email
        result = supabase.table(table).select("*").or_(f"phone.eq.{data.phone_or_email},email.eq.{data.phone_or_email}").execute()
        
        if not result.data:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user = result.data[0]
        
        if not verify_password(data.password, user['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not user.get('is_active', True):
            raise HTTPException(status_code=403, detail="Account is disabled")
        
        # For drivers, check approval status
        if data.user_type == 'driver' and user.get('status') != 'approved':
            return {
                "success": False,
                "message": f"Account is {user.get('status')}. Please wait for admin approval.",
                "status": user.get('status')
            }
        
        admin_id = user.get('admin_id') if data.user_type == 'driver' else (user.get('id') if data.user_type == 'admin' else None)
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
            "cities": data.cities,
            "brand_name": data.brand_name,
            "logo": data.logo,
            "primary_color": data.primary_color,
            "secondary_color": data.secondary_color,
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
        rides = supabase.table("rides").select("id,final_price,status").execute()
        
        total_revenue = sum(r.get('final_price', 0) or 0 for r in (rides.data or []) if r.get('status') == 'completed')
        completed_rides = len([r for r in (rides.data or []) if r.get('status') == 'completed'])
        pending_drivers = len([d for d in supabase.table("drivers").select("status").execute().data or [] if d.get('status') == 'pending'])
        
        return {
            "total_passengers": passengers.count or 0,
            "total_drivers": drivers.count or 0,
            "total_admins": admins.count or 0,
            "total_cities": cities.count or 0,
            "total_rides": len(rides.data or []),
            "completed_rides": completed_rides,
            "pending_drivers": pending_drivers,
            "total_revenue": total_revenue
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== CITY MANAGEMENT ==============

@api_router.post("/cities")
async def create_city(data: CityCreate, current_user: dict = Depends(get_current_user)):
    """Create a new city"""
    if current_user['user_type'] not in ['superadmin', 'admin']:
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

@api_router.put("/cities/{city_id}")
async def update_city(city_id: str, data: CityUpdate, current_user: dict = Depends(get_current_user)):
    """Update city pricing"""
    if current_user['user_type'] not in ['superadmin', 'admin']:
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
        
        if current_user['user_type'] == 'admin':
            # Get admin's cities
            admin = supabase.table("admins").select("cities").eq("id", current_user['user_id']).execute()
            if admin.data:
                admin_cities = admin.data[0].get('cities', [])
                if admin_cities:
                    query = query.in_("city", admin_cities)
        
        if status:
            query = query.eq("status", status)
        if city:
            query = query.eq("city", city)
        
        result = query.execute()
        drivers = result.data or []
        
        for driver in drivers:
            driver.pop('password_hash', None)
        
        return {"drivers": drivers}
    except Exception as e:
        logger.error(f"Get drivers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/drivers/{driver_id}/approve")
async def approve_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    """Approve a driver"""
    if current_user['user_type'] not in ['superadmin', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        update_data = {
            "status": "approved",
            "is_verified": True,
            "admin_id": current_user['user_id'] if current_user['user_type'] == 'admin' else None
        }
        
        result = supabase.table("drivers").update(update_data).eq("id", driver_id).execute()
        if result.data:
            return {"success": True, "message": "Driver approved"}
        raise HTTPException(status_code=404, detail="Driver not found")
    except Exception as e:
        logger.error(f"Driver approval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/drivers/{driver_id}/reject")
async def reject_driver(driver_id: str, reason: str = "Documents not valid", current_user: dict = Depends(get_current_user)):
    """Reject a driver"""
    if current_user['user_type'] not in ['superadmin', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        result = supabase.table("drivers").update({"status": "rejected"}).eq("id", driver_id).execute()
        if result.data:
            return {"success": True, "message": "Driver rejected"}
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

# ============== PASSENGER ENDPOINTS ==============

@api_router.get("/passengers")
async def get_passengers(city: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get passengers"""
    if current_user['user_type'] not in ['superadmin', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        query = supabase.table("passengers").select("*")
        
        if current_user['user_type'] == 'admin':
            admin = supabase.table("admins").select("cities").eq("id", current_user['user_id']).execute()
            if admin.data:
                admin_cities = admin.data[0].get('cities', [])
                if admin_cities:
                    query = query.in_("city", admin_cities)
        
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

# ============== RIDE ENDPOINTS ==============

@api_router.get("/rides/nearby-drivers")
async def get_nearby_drivers(lat: float, lng: float, vehicle_type: str, city: str):
    """Get nearby available drivers"""
    try:
        query = supabase.table("drivers").select("*").eq("is_online", True).eq("status", "approved").eq("vehicle_type", vehicle_type).eq("city", city)
        result = query.execute()
        drivers = result.data or []
        
        # Calculate distance and filter (simple distance calculation)
        nearby = []
        for driver in drivers:
            if driver.get('current_lat') and driver.get('current_lng'):
                # Simple distance calculation (not accurate for large distances)
                dlat = float(driver['current_lat']) - lat
                dlng = float(driver['current_lng']) - lng
                distance = (dlat**2 + dlng**2)**0.5 * 111  # rough km conversion
                
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
async def estimate_ride(data: RideRequest):
    """Get ride price estimate"""
    try:
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
        
        pricing = calculate_ride_price(
            city_data,
            data.vehicle_type,
            data.estimated_distance,
            data.estimated_duration
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
            "status": "pending",
            "payment_method": "cash"
        }
        
        result = supabase.table("rides").insert(ride_data).execute()
        if result.data:
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
            query = query.eq("driver_id", current_user['user_id'])
        
        if status:
            query = query.eq("status", status)
        
        result = query.order("created_at", desc=True).execute()
        return {"rides": result.data or []}
    except Exception as e:
        logger.error(f"Get rides error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/rides/{ride_id}/accept")
async def accept_ride(ride_id: str, current_user: dict = Depends(get_current_user)):
    """Driver accepts a ride"""
    if current_user['user_type'] != 'driver':
        raise HTTPException(status_code=403, detail="Only drivers can accept rides")
    
    try:
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
        elif data.status == 'cancelled':
            update_data['cancelled_at'] = datetime.utcnow().isoformat()
        
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
            admin = supabase.table("admins").select("cities").eq("id", current_user['user_id']).execute()
            admin_cities = admin.data[0].get('cities', []) if admin.data else []
            
            drivers = supabase.table("drivers").select("id,status").in_("city", admin_cities).execute()
            passengers = supabase.table("passengers").select("id").in_("city", admin_cities).execute()
            rides = supabase.table("rides").select("id,final_price,status").in_("city", admin_cities).execute()
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
