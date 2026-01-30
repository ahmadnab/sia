# Sia - Student Inclusive Analysis

An AI-driven educational technology platform designed to bridge the communication gap between students and academic administration.

## Features

### Student Portal (Mobile-First, Dark Mode)
- **Sia AI Chat**: Context-aware chatbot that adjusts advice based on student's academic milestone
- **Anonymous Surveys**: Submit feedback with complete anonymity (double-blind architecture)
- **Privacy Assurance**: Visual feedback during submission showing data being anonymized

### Admin Dashboard (Desktop-First, Light Mode)
- **Real-time Analytics**: Live sentiment gauge, response tracking, and trend visualization
- **AI-Powered Summaries**: Automated analysis of student feedback with key themes and action items
- **Student Roster**: View and manage students with risk level indicators
- **Survey Manager**: Create surveys manually or generate questions with AI

## Tech Stack

- **Frontend**: React 19 (Vite), Tailwind CSS v4
- **Database**: Firebase Firestore (real-time)
- **Auth**: Firebase Anonymous Auth
- **AI**: DeepSeek API (Chat & Reasoner models)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Routing**: React Router DOM

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project with Firestore enabled
- DeepSeek API key (get from [platform.deepseek.com](https://platform.deepseek.com/api_keys))

### Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Create a `.env` file from the example:
```bash
cp .env.example .env
```

3. Add your Firebase and DeepSeek credentials to `.env`:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key
```

4. Start the development server:
```bash
npm run dev
```

### Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database in "Test Mode"
3. Copy your web app configuration to `.env`

### Firestore Collections

The app expects these collections (created automatically):

- **students**: Student roster with name, email, gpa, milestone, riskLevel, portfolioLink
- **surveys**: Survey definitions with title, questions array, status, createdAt
- **responses**: Anonymous responses with surveyId, answers, sentimentScore, aiSummaryTags (NO user identifiers)

## Usage

### Role Switching
Click the floating button at the bottom-right to switch between Student and Admin views.

### Demo Mode
If Firebase/DeepSeek credentials are not configured, the app runs in demo mode with limited functionality.

### Import Mock Data
In Admin > Students, click "Import Mock Data" to populate 10 sample students.

## Architecture: Double-Blind Anonymity

Survey responses are completely anonymous:
1. The `responses` collection stores NO user identifiers
2. Only the survey answers, sentiment scores, and AI-generated tags are stored
3. Even database administrators cannot link responses to students

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

MIT
