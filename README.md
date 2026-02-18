# AnimalBase - Full Stack Pet Management App

A complete Android + Node.js app for pet adoption, missing pets reporting, sightings, and animal encyclopedia.

---

## PROJECT STRUCTURE

```
AnimalBase/
├── backend/           ← Node.js + Express REST API
├── android/           ← Android Studio project (Kotlin)
├── database/          ← PostgreSQL schema
└── README.md
```

---

## PREREQUISITES

| Tool | Version |
|------|---------|
| Android Studio | Panda 1 (2024.2.x) |
| Node.js | v24.13.1 |
| PostgreSQL | 12+ |
| JDK | 17+ |

---

## STEP 1: DATABASE SETUP (PostgreSQL)

```bash
# 1. Open pgAdmin or psql
# 2. Create a new database
CREATE DATABASE animalbase;

# 3. Run the schema
psql -U postgres -d animalbase -f database/schema.sql
# OR open database/schema.sql in pgAdmin Query Tool and execute
```

---

## STEP 2: BACKEND SETUP (Node.js)

```bash
cd backend

# Install dependencies
npm install

# Copy env file and edit values
cp .env.example .env
```

### Edit `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=animalbase
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
JWT_SECRET=change_this_to_a_long_random_string
BASE_URL=http://10.0.2.2:3000        # For Android Emulator
# BASE_URL=http://YOUR_PC_IP:3000    # For physical device
GOOGLE_MAPS_API_KEY=YOUR_KEY
```

### Firebase (Push Notifications):
1. Go to https://console.firebase.google.com/
2. Create a project → Add Android app → Package: `com.animalbase.app`
3. Download `google-services.json` → place in `android/app/google-services.json`
4. Go to Project Settings → Service Accounts → Generate new private key
5. Save as `backend/src/config/serviceAccountKey.json`

```bash
# Start the server
npm start
# OR with auto-reload:
npm run dev

# Test:
curl http://localhost:3000/api/health
```

---

## STEP 3: ANDROID SETUP (Android Studio Panda 1)

### A. Open Project
1. Open Android Studio Panda 1
2. `File` → `Open` → select the `android/` folder
3. Wait for Gradle sync

### B. Google Maps API Key
1. Go to https://console.cloud.google.com/
2. Create API key → Enable **Maps SDK for Android** + **Geocoding API**
3. Open `android/app/build.gradle` (line ~27):
   ```gradle
   resValue "string", "google_maps_key", "YOUR_GOOGLE_MAPS_API_KEY"
   ```
   Replace `YOUR_GOOGLE_MAPS_API_KEY` with your key.

### C. Firebase
1. Copy your `google-services.json` (from Firebase) into `android/app/`
2. The push notification setup is done automatically

### D. Set Backend URL
Open `android/app/build.gradle` (line ~20):
```gradle
buildConfigField "String", "BASE_URL", '"http://10.0.2.2:3000"'
```
- **Emulator**: keep `http://10.0.2.2:3000`
- **Physical device**: change to `http://YOUR_PC_LAN_IP:3000`
  (find your IP with `ipconfig` on Windows or `ifconfig` on Mac/Linux)

### E. Run
- Select an AVD or connect device
- Click **Run** ▶

---

## HOW TO CHANGE PLACEHOLDER IMAGES

### App Logo / Splash Screen
- **File**: `android/app/src/main/res/layout/activity_splash.xml` (line ~20)
- **File**: `android/app/src/main/res/layout/activity_login.xml` (line ~20)
- Replace `android:src="@drawable/ic_placeholder_pet"` with your logo drawable

### Pet Placeholder Image
- **File**: `android/app/src/main/java/com/animalbase/app/utils/ImageLoader.kt` (line ~22)
- Change `R.drawable.ic_placeholder_pet` to your drawable
- OR replace `android/app/src/main/res/drawable/ic_placeholder_pet.xml`

### User Profile Placeholder
- **File**: `android/app/src/main/java/com/animalbase/app/utils/ImageLoader.kt` (line ~34)
- Change `R.drawable.ic_placeholder_person` to your drawable
- OR replace `android/app/src/main/res/drawable/ic_placeholder_person.xml`

### App Launcher Icon
- Right-click `res` folder in Android Studio → `New` → `Image Asset`
- Follow wizard to set your icon for all densities
- OR replace files in:
  - `res/mipmap-hdpi/ic_launcher.xml` (72×72)
  - `res/mipmap-mdpi/ic_launcher.xml` (48×48)
  - `res/mipmap-xhdpi/ic_launcher.xml` (96×96)
  - `res/mipmap-xxhdpi/ic_launcher.xml` (144×144)
  - `res/mipmap-xxxhdpi/ic_launcher.xml` (192×192)

---

## HOW TO CHANGE APP ICONS (BOTTOM NAV & TOOLBAR)

| Icon | File | Description |
|------|------|-------------|
| Home Tab | `res/drawable/ic_home.xml` | Bottom nav home |
| Adopt Tab | `res/drawable/ic_adopt.xml` | Bottom nav adopt |
| Missing Tab | `res/drawable/ic_missing.xml` | Bottom nav missing |
| Encyclopedia Tab | `res/drawable/ic_book.xml` | Bottom nav encyclopedia |
| Center "+" FAB | `res/drawable/ic_add.xml` | Floating action button |
| Push Notification | `res/drawable/ic_notification.xml` | Notification tray icon |
| Back Arrow | `res/drawable/ic_back.xml` | Toolbar back button |
| Profile Avatar | `res/drawable/ic_placeholder_person.xml` | Default profile image |

To replace any icon:
1. Open the `.xml` file
2. Replace the `pathData` value with your SVG path
3. OR use Android Studio → `File` → `New` → `Vector Asset`

---

## HOW TO CHANGE APP COLORS

Open `android/app/src/main/res/values/colors.xml`:

| Color Name | Purpose | Default |
|-----------|---------|---------|
| `primary` | Main brand color, buttons, nav bar | `#4CAF50` (green) |
| `primary_dark` | Status bar, dark variant | `#388E3C` |
| `secondary` | Accent color | `#FF8F00` (amber) |
| `background` | Screen backgrounds | `#F5F5F5` |
| `status_available` | Available pet badge | `#4CAF50` |
| `status_pending` | Pending pet badge | `#FF9800` |
| `status_rejected` | Rejected badge | `#F44336` |
| `status_missing` | Missing pet badge | `#F44336` |
| `fab_background` | Center "+" FAB color | `#4CAF50` |
| `nav_bar_selected` | Active nav tab | `#4CAF50` |

---

## API ENDPOINTS REFERENCE

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/forgot-password` | Password reset |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/profile` | ✓ | Get profile |
| PUT | `/api/users/profile` | ✓ | Update profile |
| POST | `/api/users/profile-photo` | ✓ | Upload profile photo |
| PUT | `/api/users/change-password` | ✓ | Change password |
| GET | `/api/users/my-reports` | ✓ | Get my reports |

### Pets (Adoption)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pets` | List available pets (filter: type, status, search) |
| GET | `/api/pets/:id` | Get pet details |
| POST | `/api/pets` | Add pet (admin) |
| PUT | `/api/pets/:id/status` | Update pet status |

### Missing Pets
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/missing-pets` | - | List missing pets |
| GET | `/api/missing-pets/:id` | - | Get details + sightings |
| POST | `/api/missing-pets` | ✓ | Report missing pet |
| PUT | `/api/missing-pets/:id/status` | ✓ | Update status |

### Sightings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sightings` | Submit sighting report |
| GET | `/api/sightings` | List sightings |

### Adoptions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/adoptions` | ✓ | Submit application |
| GET | `/api/adoptions/my-applications` | ✓ | My applications |
| GET | `/api/adoptions/:id` | ✓ | Application details |
| PUT | `/api/adoptions/:id/review` | ✓ | Review application (admin) |

### Encyclopedia
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/encyclopedia` | List animals |
| GET | `/api/encyclopedia/:id` | Animal details |
| POST | `/api/encyclopedia/favorites/:id` | Add favorite |
| DELETE | `/api/encyclopedia/favorites/:id` | Remove favorite |

### Notifications
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | ✓ | List notifications |
| PUT | `/api/notifications/:id/read` | ✓ | Mark read |
| PUT | `/api/notifications/read-all` | ✓ | Mark all read |

---

## FEATURES IMPLEMENTED

- ✅ User registration with format validation (email, password strength, phone)
- ✅ JWT authentication
- ✅ Profile photo upload (Multer)
- ✅ Adoption application with format validation
- ✅ Pet status: Available → Pending → Adopted/Rejected
- ✅ Missing pet report with photos and map location
- ✅ Sighting reports with photos and map
- ✅ Push notifications (Firebase Cloud Messaging)
- ✅ Bottom navigation with center "+" FAB
- ✅ Google Maps integration (pick & view locations)
- ✅ Animal encyclopedia with favorites
- ✅ Full-text search (PostgreSQL GIN indexes)
- ✅ File upload validation (jpg, jpeg, png, gif, webp — max 10MB)
- ✅ Auto-notify pet owner on new sighting
- ✅ Auto-update pet status on application review

---

## TROUBLESHOOTING

**Cannot connect to backend from emulator:**
- Make sure backend is running: `npm start`
- Use `http://10.0.2.2:3000` (not `localhost`) for emulator

**Cannot connect from physical device:**
- Use your PC's LAN IP: `http://192.168.x.x:3000`
- Make sure your phone and PC are on the same WiFi

**Gradle sync fails:**
- `File` → `Invalidate Caches and Restart`
- Check internet connection (Gradle downloads dependencies)

**Maps not showing:**
- Verify Google Maps API key in `build.gradle`
- Enable **Maps SDK for Android** in Google Cloud Console

**Push notifications not working:**
- Verify `google-services.json` is in `android/app/`
- Verify `serviceAccountKey.json` is in `backend/src/config/`
- Test on real device (FCM doesn't work on some emulators)
