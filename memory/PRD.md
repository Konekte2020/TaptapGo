# TapTapGo - Aplikasyon Transpò pou Ayiti

## Overview
TapTapGo se yon aplikasyon transpò konplè pou Ayiti, menm jan ak Uber. Li gen sipò pou moto ak machin, avèk yon sistèm white-label pou diferan administratè vil yo.

## Features Implemented

### 1. App Pasajè (Mobile)
- ✅ Enskripsyon ak verifikasyon (OTP mock)
- ✅ Login ak telefòn oswa email
- ✅ Wè kat (placeholder pou OpenStreetMap)
- ✅ Mete pickup point ak destinasyon
- ✅ Wè estimasyon pri
- ✅ Chwazi moto oswa machin
- ✅ Mande kous
- ✅ Istorik kous
- ✅ Profil ak wallet

### 2. App Chofè (Mobile)
- ✅ Enskripsyon 3 etap (enfòmasyon, machin, dokiman)
- ✅ Upload foto machin, pèmi, papye
- ✅ Chwazi mak ak modèl machin (liste pou Ayiti)
- ✅ Status an atant apwobasyon
- ✅ Ale ONLINE / OFFLINE
- ✅ Aksepte / Refize kous
- ✅ Istorik kous
- ✅ Revni total ak wallet

### 3. Dashboard Admin (White-Label)
- ✅ Dashboard ak estatistik vil li
- ✅ Apwouve/Rejte chofè
- ✅ Modifye pri kous pa vil
- ✅ Wè chofè nan flot li
- ✅ Brand personalizasyon (koulè, logo)

### 4. Dashboard SuperAdmin
- ✅ Wè tout itilizatè
- ✅ Wè tout chofè
- ✅ Apwouve chofè
- ✅ Wè tout kous
- ✅ Wè tout vil
- ✅ Ajoute vil
- ✅ Modifye pri vil
- ✅ Kreye Admin White-Label
- ✅ Bay vil a Admin
- ✅ Dashboard estatistik total

### 5. Backend API
- ✅ Supabase integration
- ✅ JWT authentication
- ✅ OTP mock pou devlopman
- ✅ Kalkil pri kous otomatik
- ✅ Jesyon chofè (apwouve/rejte)
- ✅ Multi-tenant architecture

## Architecture
- **Frontend**: Expo (React Native) - Cross-platform iOS/Android/Web
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand

## Database Setup Required

⚠️ **IMPORTANT**: Ou dwe kreye tablo yo nan Supabase!

1. Ale nan Supabase Dashboard: https://puncojujdabpljgbzkxg.supabase.co
2. Ale nan SQL Editor
3. Kopye ak kole kontni `/app/database_setup.sql`
4. Ekzekite SQL la

## API Endpoints

### Authentication
- `POST /api/otp/send` - Voye OTP (mock: 123456)
- `POST /api/otp/verify` - Verifye OTP
- `POST /api/auth/register/passenger` - Enskri pasajè
- `POST /api/auth/register/driver` - Enskri chofè
- `POST /api/auth/login` - Login

### Cities
- `GET /api/cities` - Tout vil
- `POST /api/cities` - Kreye vil
- `PUT /api/cities/{id}` - Modifye vil

### Drivers
- `GET /api/drivers` - Tout chofè
- `PUT /api/drivers/{id}/approve` - Apwouve
- `PUT /api/drivers/{id}/reject` - Rejte

### Rides
- `GET /api/rides/nearby-drivers` - Chofè ki pre
- `POST /api/rides/estimate` - Estimasyon pri
- `POST /api/rides` - Kreye kous
- `PUT /api/rides/{id}/accept` - Aksepte kous

## File Structure
```
/app
├── backend/
│   ├── server.py          # FastAPI API
│   └── .env               # Supabase credentials
├── frontend/
│   ├── app/
│   │   ├── index.tsx      # Splash screen
│   │   ├── _layout.tsx    # Root layout
│   │   ├── auth/          # Auth screens
│   │   ├── passenger/     # Passenger app
│   │   ├── driver/        # Driver app
│   │   ├── admin/         # Admin dashboard
│   │   └── superadmin/    # SuperAdmin dashboard
│   └── src/
│       ├── store/         # Zustand stores
│       ├── services/      # API services
│       └── constants/     # Colors, Haiti cities
└── database_setup.sql     # SQL schema
```

## Next Steps
1. Run database_setup.sql in Supabase
2. Test full registration flow
3. Add Google Maps integration (need API key)
4. Add real SMS OTP (Twilio)
5. Add push notifications
6. Add real-time driver tracking
