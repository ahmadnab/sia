# Sia - Student Inclusive Analysis

**Sia** is an AI-driven educational technology platform designed to bridge the communication gap between students and academic administration. It uses advanced sentiment analysis to provide real-time insights into student wellbeing while offering students a private, supportive companion for their academic journey.

## ✨ Key Features

### 🎓 Student Portal (Mobile-First)
Designed for engagement and ease of use on mobile devices.
- **Sia AI Companion**: A context-aware chatbot that acts as a supportive peer, adjusting advice based on the student's academic milestone.
- **Anonymous Wall**: A safe community space to share thoughts and concerns with peers, featuring sentiment-aware moderation.
- **Surveys & Responses**: Interactive surveys with an intuitive interface to provide feedback on courses and campus life.
- **Direct Messages**: Private communication channel with course coordinators.
- **Glass & Gradient UI**: A modern, premium aesthetic featuring blurred glass effects, vibrant gradients, and smooth animations.
- **Dark/Light Mode**: Seamless theme switching with persistent preferences.
 
<img width="1239" height="779" alt="Screenshot 2026-02-02 at 12 33 58 AM" src="https://github.com/user-attachments/assets/37d6fb96-842a-4d62-b3b3-7ecbb17d196a" />

### 📊 Admin Dashboard (Desktop-First)
A powerful command center for academic staff.
- **Real-time Analytics**: Live gauges for student sentiment, response rates, and trend visualization.
- **AI-Powered Insights**: Automated summarization of student feedback, identifying key themes, sentiment distribution, and actionable recommendations.
- **Student Roster**: Comprehensive view of student cohorts with risk level indicators and easy management.
- **Survey Manager**: Create and distribute surveys manually or generate optimized questions using AI.
- **Chat Monitoring**: Privacy-conscious oversight of AI interactions to identify at-risk students.
- **Cohort Management**: Easy tools to organize students, utilizing bulk CSV import/export.

<img width="1503" height="776" alt="Screenshot 2026-02-02 at 12 34 29 AM" src="https://github.com/user-attachments/assets/ead6fc96-6c1a-47a5-8376-0cc0904142ef" />


## 🛠 Tech Stack

- **Frontend**: React 19 (Vite), Tailwind CSS v4
- **Database**: Firebase Firestore (Real-time updates)
- **Authentication**: Firebase Anonymous Auth & Custom Role Management
- **AI Engine**: DeepSeek API (Reasoner & Chat models)
    - *Note: Integration is handled in `src/services/gemini.js` (legacy filename).*
- **Visualization**: Recharts for analytics data
- **Icons**: Lucide React
- **Animations**: Framer Motion for UI transitions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Firebase Project (Firestore enabled)
- DeepSeek API Key

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-org/sia.git
    cd sia
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    VITE_FIREBASE_API_KEY=your_firebase_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    VITE_DEEPSEEK_API_KEY=your_deepseek_api_key
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

## 📂 Project Structure

- **`src/pages/student`**: Student-facing components (Home, Chat, Survey, Wall).
- **`src/pages/admin`**: Admin dashboard views (Analytics, Roster, Surveys).
- **`src/components`**: Reusable UI elements (ThemeToggle, LoadingSpinner).
- **`src/services`**: API integrations for Firebase and AI Providers.
- **`src/context`**: Global state management (Auth, Theme).

## 🛡 Privacy & Security

Sia is built with a "Privacy First" architecture:
- **Double-Blind Anonymity**: Survey responses are decoupled from user identities. Even admins cannot trace specific feedback back to a student.
- **Input Sanitization**: Rigorous checks to prevent prompt injection and XSS attacks.
- **Crisis Detection**: The AI is trained to detect signs of severe distress and redirect students to professional help resources immediately.

## 👥 Usage Guide

### Switching Roles
- **Student View**: The default view. Access features via the bottom navigation bar or dashboard cards.
- **Admin View**: Click the **Switch to Admin** button (users icon) in the header of any student page to access the restricted dashboard.

### Demo Mode
If no API keys are provided, the application runs in a limited **Demo Mode** with mock data, allowing you to explore the UI and basic interactions without backend connectivity.

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
