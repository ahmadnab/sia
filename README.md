# Sia - Student Inclusive Analysis

An AI-driven educational technology platform designed to bridge the communication gap between students and academic administration.

## Features

### Student Portal (Mobile-First)
- **Sia AI Chat**: Context-aware chatbot that adjusts advice based on student's academic milestone, with persistent chat history
- **Anonymous Surveys**: Submit feedback with complete anonymity (double-blind architecture)
- **Anonymous Wall**: Share thoughts and concerns anonymously with the community
- **Privacy Assurance**: Visual feedback during submission showing data being anonymized
- **Dark/Light Mode**: Theme toggle available across all student pages

### Admin Dashboard (Desktop-First)
- **Real-time Analytics**: Live sentiment gauge, response tracking, trend visualization, and sentiment distribution
- **AI-Powered Summaries**: Automated analysis of student feedback with key themes, sentiment scores, and action items
- **Student Roster**: View and manage students with risk level indicators
- **Survey Manager**: Create surveys manually or generate questions with AI
- **Student Chats**: View student chat histories with AI-generated summaries, concerns, and recommendations
- **Anonymous Wall Admin**: Monitor anonymous wall posts with sentiment analysis
- **Cohort Management**: Organize students into cohorts for targeted surveys
- **Dark/Light Mode**: Full dark mode support across the admin interface

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

- **students**: Student roster with name, email, gpa, milestone, riskLevel, cohortId, portfolioLink
- **cohorts**: Student cohorts with name, year, createdAt
- **surveys**: Survey definitions with title, questions array, cohortId, status, createdAt
- **responses**: Anonymous responses with surveyId, answers, sentimentScore, aiSummaryTags (NO user identifiers)
- **survey_status**: Vote tracking with surveyId and visitorId hash (double-blind - cannot link to students)
- **anonymous_wall**: Anonymous posts with content, sentimentScore, tags (NO user identifiers)
- **chat_history**: Student chat messages with email, role, content, timestamp
- **summary_cache**: Cached AI-generated survey summaries
- **chat_summary_cache**: Cached AI-generated chat summaries per student

## Usage

### Role Switching
Click the floating button at the bottom-right to switch between Student and Admin views.

### Demo Mode
If Firebase/DeepSeek credentials are not configured, the app runs in demo mode with limited functionality. A banner at the top indicates demo mode status.

### Seed Test Data
In Admin Dashboard, expand the "Demo Data Management" section to:
- **Seed Test Data**: Populate the database with sample cohorts, students, surveys, and responses
- **Clear Test Data**: Remove all seeded data to start fresh

### Theme Toggle
Use the toggle switch in the top-right corner (student pages) or sidebar (admin pages) to switch between light and dark mode. The preference is saved to localStorage.

## Architecture: Double-Blind Anonymity

Survey responses are completely anonymous:
1. The `responses` collection stores NO user identifiers
2. Only the survey answers, sentiment scores, and AI-generated tags are stored
3. Even database administrators cannot link responses to students
4. Vote tracking uses a hashed visitor ID to prevent duplicate submissions without identifying users

## Security

The application includes several security measures:

- **XSS Protection**: URL sanitization in markdown rendering blocks `javascript:` and `data:` protocols
- **Prompt Injection Prevention**: User inputs to AI are sanitized to prevent prompt injection attacks
- **Input Validation**: Email validation, input length limits, and proper error handling
- **Security Headers**: Netlify configuration includes X-Frame-Options, X-XSS-Protection, and CSP headers
- **Safe localStorage Access**: Try-catch wrappers prevent errors in private browsing modes

## Deployment

### Netlify (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Connect the repository to Netlify
3. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Add environment variables in Netlify dashboard (Site settings > Environment variables)
5. Deploy!

A `netlify.toml` configuration file is included with:
- SPA routing redirects
- Security headers
- Asset caching

See `NETLIFY_DEPLOYMENT.md` for detailed deployment instructions.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

MIT
