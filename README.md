# 🍌 Banana Billing & Invoice Management System

A premium, highly interactive billing and invoice management terminal tailored for Banana Commission Agents and District Admins. Features include multi-variety weighing entries, automatic calculation engine with net-weight deductions, incremental payments recording, interactive dashboard metrics, session security timeouts, and native mobile PDF/WhatsApp bill sharing.

---

## 🛠️ Tech Stack
- **Frontend**: React, Vite, Ant Design (`antd`), HSL glassmorphism styling theme, Custom Canvas Confetti.
- **Backend**: Django, Django REST Framework, PostgreSQL database.
- **Tools**: jsPDF & html2canvas (in-browser PDF rendering).

---

## 📂 Project Structure
```
Banana Billing and Invoice Management/
├── frontend/             # React + Vite Frontend App
│   ├── src/              # Page layouts and components
│   ├── public/           # Static assets
│   ├── vercel.json       # Vercel SPA routing rewrite rules
│   ├── package.json      # Dependencies and scripts
│   └── .env.example      # Environment variables template
├── backend/              # Django Python Backend REST API
│   ├── banana_backend/   # Project core configuration
│   ├── billing/          # App models, views, and controllers
│   ├── seed.py           # Seed script for initial db setup
│   └── manage.py         # Django administration CLI
└── .gitignore            # Main Git ignore config
```

---

## 💻 Local Setup & Execution

### 1. Backend Setup
1. Open terminal and navigate to backend:
   ```bash
   cd backend
   ```
2. Create and activate Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up database configurations and execute migrations:
   ```bash
   python manage.py migrate
   ```
5. Seed initial banana rates and demo records:
   ```bash
   python seed.py
   ```
6. Spin up local development server:
   ```bash
   python manage.py runserver
   ```
   *The backend will run on `http://127.0.0.1:8000/`*

### 2. Frontend Setup
1. In a new terminal window, navigate to frontend:
   ```bash
   cd frontend
   ```
2. Install node dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The frontend will run on `http://localhost:5173/`*

---

## 🚀 Pushing to GitHub

To push your project repository to GitHub, follow these step-by-step terminal commands:

1. **Initialize Git Repository** (in workspace root):
   ```bash
   git init
   ```
2. **Add all files**:
   ```bash
   git add .
   ```
3. **Commit your changes**:
   ```bash
   git commit -m "feat: implement mobile drawer navigation, inactivity logout, credentials clearance, and bill sharing options"
   ```
4. **Create a new repository** on [GitHub](https://github.com/new). Do not initialize it with a README or gitignore.
5. **Link to remote repository** (replace URL with your GitHub link):
   ```bash
   git remote add origin https://github.com/your-username/banana-billing.git
   ```
6. **Rename default branch and push**:
   ```bash
   git branch -M main
   git push -u origin main
   ```

---

## ☁️ Production Hosting Deployment

### 1. Frontend Hosting (Vercel)
Vercel is ideal for static react apps:
1. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
2. Select your imported **GitHub Repository**.
3. Configure the Project Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add **Environment Variables**:
   - `VITE_API_URL` = `https://your-production-backend.com/api` (URL of your deployed backend)
5. Click **Deploy**. Vercel will process it and provide a live URL!

*Note: The `vercel.json` already placed in the `frontend` folder handles internal routes mapping to prevent 404 errors.*

### 2. Backend Hosting (Render / Railway)
Django requires a Python execution container (which Vercel does not support natively for full servers):
1. Log in to [Render](https://render.com) or [Railway](https://railway.app).
2. Create a **PostgreSQL Database** service first and note the Connection string.
3. Create a new **Web Service** and link it to your GitHub Repository.
4. Configure Web Service Settings:
   - **Root Directory**: `backend`
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt && python manage.py migrate`
   - **Start Command**: `gunicorn banana_backend.wsgi:application`
5. Set **Environment Variables** in Render/Railway settings:
   - `DATABASE_URL` = Your PostgreSQL connection string.
   - `DJANGO_SETTINGS_MODULE` = `banana_backend.settings`
   - `SECRET_KEY` = A random secret key.
   - `ALLOWED_HOSTS` = `your-backend-domain.com,localhost`
6. Click **Deploy**. Use the resulting backend URL inside your Vercel frontend config!
