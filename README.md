# 🏋️ Workout Tracker Pro

A full-featured workout tracking application with cloud synchronization, user authentication, and progress analytics.

## ✨ Features

### 🔐 Authentication & Security
- Secure user registration and login
- Email verification
- Password hashing and secure storage
- Row-level database security
- JWT-based session management

### 📊 Workout Tracking
- Log exercises with sets, reps, and weight
- Date-based workout organization
- Automatic 1RM (One Rep Max) calculation
- Total volume tracking
- Progress charts and statistics

### ☁️ Cloud Storage
- PostgreSQL database via Supabase
- Real-time data synchronization
- Cross-device access
- Automatic backups

### 📱 User Experience
- Responsive design (mobile & desktop)
- Rest timer with notifications
- Data import/export functionality
- Profile management with avatars
- Dark mode ready

## 🚀 Quick Start

### Frontend Setup
1. Clone the repository
2. Open `frontend/config.js` and update:
   - `SUPABASE_URL`: Your Supabase project URL
   - `anonKey`: Your Supabase anon/public key
3. Open `frontend/index.html` in a browser
   - Or use a local server: `python -m http.server 8080`

### Backend Setup (Optional)
1. Navigate to `backend/` folder
2. Copy `.env.example` to `.env` and configure
3. Install dependencies: `npm install`
4. Start server: `npm run dev`

### Database Setup
1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Run the SQL from the setup guide to create tables
4. Enable Email authentication in Supabase dashboard

## 📁 Project Structure
