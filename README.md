# AnimalBase — Full Stack Android App
### 100% PostgreSQL · No Firebase · No Paid Services

---

## NOTIFICATION ARCHITECTURE (Zero Cost)

```
┌─────────────┐  WebSocket (OkHttp)   ┌──────────────────────────────┐
│ Android App │ ◄──────────────────── │  Node.js backend (ws)        │
│             │                        │  ws://host:3000/ws?token=JWT │
│ WorkManager │ ──HTTP poll (15 min)──►│  GET /api/notifications      │
│             │                        │  PostgreSQL notifications    │
└─────────────┘                        └──────────────────────────────┘
```

**Real-time (app open):** OkHttp WebSocket → Android NotificationManager  
**Background fallback:** WorkManager PeriodicWork → REST poll → Android NotificationManager  
**Storage:** PostgreSQL `notifications` table (already in schema)  
**Cost:** $0 — no Firebase, no APNs, no third-party accounts

---

## PROJECT STRUCTURE

```
AnimalBase/
├── backend/           ← Node.js + Express + WebSocket (ws)
│   └── src/
│       ├── config/
│       │   ├── database.js     PostgreSQL pool
│       │   └── websocket.js    WS server (replaces Firebase Admin)
│       ├── middleware/
│       │   ├── auth.js         JWT verification
│       │   ├── upload.js       Multer file upload
│       │   └── validation.js   express-validator error handler
│       └── routes/             auth, users, pets, missing-pets,
│                               sightings, adoptions, encyclopedia,
│                               notifications
├── android/           ← Kotlin, Android Studio Panda 1
│   └── app/src/main/
│       ├── java/com/animalbase/app/
│       │   ├── utils/
│       │   │   ├── WebSocketManager.kt       real-time push
│       │   │   ├── NotificationPollingWorker.kt  background poll
│       │   │   ├── NotificationHelper.kt     local Android notifications
│       │   │   ├── SessionManager.kt         JWT storage
│       │   │   ├── ImageLoader.kt            Glide wrapper
│       │   │   ├── ValidationUtils.kt        form checkers
│       │   │   └── Extensions.kt             Kotlin helpers
│       │   ├── api/     Retrofit + OkHttp
│       │   ├── models/  Kotlin data classes
│       │   └── ui/      all screens
│       └── res/         layouts, drawables, values
├── database/schema.sql
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

**No Firebase account needed.**  
**No google-services.json needed.**

---

## STEP 1 — DATABASE SETUP (PostgreSQL)

```bash
# Create database
psql -U postgres -c "CREATE DATABASE animalbase;"

# Run schema
psql -U postgres -d animalbase -f database/schema.sql
```

Or open `database/schema.sql` in pgAdmin Query Tool and Execute.

---

## STEP 2 — BACKEND SETUP (Node.js)

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=animalbase
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
JWT_SECRET=change_this_to_a_long_random_string
BASE_URL=http://10.0.2.2:3000      # emulator
# BASE_URL=http://192.168.x.x:3000  # physical device
```

```bash
# Start server
npm start        # production
npm run dev      # dev (auto-reload with nodemon)

# Verify
curl http://localhost:3000/api/health
# → {"success":true,"notifications":"WebSocket + PostgreSQL (no Firebase)"}
```

The server exposes:
- **REST API** on `http://HOST:3000/api/...`
- **WebSocket** on `ws://HOST:3000/ws?token=JWT`

---

## STEP 3 — ANDROID SETUP (Android Studio Panda 1)

### A. Open the project
1. `File` → `Open` → select the `android/` folder
2. Wait for Gradle sync (first sync downloads dependencies — needs internet)

### B. Set backend URL
Open `android/app/build.gradle` — **two** values to set (lines ~20–28):

```gradle
// REST API (line 20)
buildConfigField "String", "BASE_URL", '"http://10.0.2.2:3000"'

// WebSocket (line 27 — same host, different scheme)
buildConfigField "String", "WS_URL", '"ws://10.0.2.2:3000/ws"'
```

| Environment | BASE_URL | WS_URL |
|-------------|----------|--------|
| Emulator | `http://10.0.2.2:3000` | `ws://10.0.2.2:3000/ws` |
| Physical device (same WiFi) | `http://192.168.x.x:3000` | `ws://192.168.x.x:3000/ws` |
| Production | `https://yourdomain.com` | `wss://yourdomain.com/ws` |

### C. Google Maps API Key (only for the map screen)
1. Go to https://console.cloud.google.com/
2. APIs & Services → Create Key → Enable **Maps SDK for Android**
3. In `android/app/build.gradle` (line ~33):
   ```gradle
   resValue "string", "google_maps_key", "YOUR_ACTUAL_KEY_HERE"
   ```

### D. Run
- Select an AVD or connect a device → click **Run ▶**

**No `google-services.json` needed.  No Firebase plugin.  No FCM token.**

---

## HOW NOTIFICATIONS WORK (no Firebase)

### When the app is open (foreground)
`MainActivity.onStart()` → `WebSocketManager.connect()` → OkHttp opens a persistent WebSocket  
Backend sends a JSON frame → `WebSocketManager` receives it → `NotificationHelper.show()` posts a local Android notification.

### When the app is in the background
`WorkManager` runs `NotificationPollingWorker` every **15 minutes** (Android minimum).  
It calls `GET /api/notifications`, finds unread items, and posts local notifications.

### When the user opens the Notifications screen
It calls `GET /api/notifications` directly and shows the full list from PostgreSQL.

---

## HOW TO CHANGE PLACEHOLDER IMAGES

| What | Where | Line |
|------|-------|------|
| Pet image placeholder | `utils/ImageLoader.kt` | 22 |
| Profile image placeholder | `utils/ImageLoader.kt` | 34 |
| Splash / Login logo | `res/layout/activity_splash.xml` | 20 |
| App launcher icon | `res/mipmap-*/ic_launcher.xml` | replace files |

---

## HOW TO CHANGE ICONS

| Icon | File |
|------|------|
| Home tab | `res/drawable/ic_home.xml` |
| Adopt tab | `res/drawable/ic_adopt.xml` |
| Missing tab | `res/drawable/ic_missing.xml` |
| Encyclopedia tab | `res/drawable/ic_book.xml` |
| Center "+" FAB | `res/drawable/ic_add.xml` |
| Notification tray | `res/drawable/ic_notification.xml` |
| Back arrow | `res/drawable/ic_back.xml` |

Replace any `.xml` file with your own SVG-path vector drawable,  
OR use **Android Studio → File → New → Vector Asset**.

---

## HOW TO CHANGE COLORS

`res/values/colors.xml`:

| Name | Purpose | Default |
|------|---------|---------|
| `primary` | Main brand color | `#4CAF50` |
| `secondary` | Accent | `#FF8F00` |
| `background` | Screen backgrounds | `#F5F5F5` |
| `status_available` | Available badge | `#4CAF50` |
| `status_pending` | Pending badge | `#FF9800` |
| `status_rejected` | Rejected badge | `#F44336` |
| `fab_background` | Center "+" FAB | `#4CAF50` |

---

## API ENDPOINTS

All authenticated endpoints require: `Authorization: Bearer JWT`

### Auth
| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/api/auth/register` | `full_name, email, password, phone_number?` |
| POST | `/api/auth/login` | `email, password` |
| POST | `/api/auth/forgot-password` | `email` |

### Users
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/users/profile` | ✓ |
| PUT | `/api/users/profile` | ✓ |
| POST | `/api/users/profile-photo` | ✓ multipart |
| PUT | `/api/users/change-password` | ✓ |
| GET | `/api/users/my-reports` | ✓ |

### Pets
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/pets` | `?type=Dog&status=Available&search=text` |
| GET | `/api/pets/:id` | |
| PUT | `/api/pets/:id/status` | `Available` / `Pending` / `Adopted` |

### Missing Pets
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/missing-pets` | |
| GET | `/api/missing-pets/:id` | |
| POST | `/api/missing-pets` | ✓ multipart (up to 5 photos) |
| PUT | `/api/missing-pets/:id/status` | ✓ |

### Sightings
| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/api/sightings` | multipart; auto-notifies pet owner via WS + DB |
| GET | `/api/sightings` | `?missing_pet_id=N` |

### Adoptions
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/adoptions` | ✓ sets pet→Pending, notifies applicant |
| GET | `/api/adoptions/my-applications` | ✓ |
| GET | `/api/adoptions/:id` | ✓ |
| PUT | `/api/adoptions/:id/review` | ✓ sets pet→Adopted/Available, notifies applicant |

### Encyclopedia
| GET | `/api/encyclopedia` | `?category=Mammals&search=text` |
| GET | `/api/encyclopedia/:id` | |
| POST | `/api/encyclopedia/favorites/:id` | ✓ |
| DELETE | `/api/encyclopedia/favorites/:id` | ✓ |

### Notifications
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/notifications` | ✓ |
| PUT | `/api/notifications/:id/read` | ✓ |
| PUT | `/api/notifications/read-all` | ✓ |

### WebSocket
```
ws://HOST:3000/ws?token=JWT

Server → client frame:
{
  "type": "notification",
  "title": "New Sighting Report!",
  "message": "Someone spotted your pet near...",
  "related_id": 42
}
```

---

## TROUBLESHOOTING

**Cannot connect to backend from emulator:**  
Use `http://10.0.2.2:3000` (not `localhost`).

**Cannot connect from physical device:**  
Use your PC's LAN IP: `http://192.168.x.x:3000`.  
Both devices must be on the same WiFi.

**WebSocket not receiving notifications:**  
Check `WS_URL` in `app/build.gradle` (line ~27) matches your backend host.

**WorkManager not triggering:**  
Minimum interval is 15 min. Use Android Studio's **Background Task Inspector** to verify the job is enqueued.

**Gradle sync fails:**  
`File` → `Invalidate Caches and Restart`. Check internet connection.

**Maps not showing:**  
Verify Google Maps API key in `build.gradle` line ~33 and enable Maps SDK for Android in Google Cloud Console.
