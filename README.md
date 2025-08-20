CourtCaseFlow
CourtCaseFlow is a secure, cloud-based legal case management web application designed for small and mid-sized law firms in Kenya. It helps lawyers and clients manage cases, upload legal documents, track milestones, and receive automated court hearing notifications all in one simple and affordable platform.

📌 Features
Role-based Authentication (Lawyers & Clients) using Firebase Authentication

Real-time Case Tracking via Firebase Firestore

Secure Document Upload & Retrieval with Firebase Storage

Automated Court Date Notifications via Firebase Functions & Email Service (SendGrid alternative supported)

Client Portal for viewing case status and downloading documents

Responsive, User-Friendly Interface built for accessibility across devices

🛠 Technologies Used
Frontend
JavaScript

React.js

Backend
Firebase Authentication

Firebase Firestore (Database)

Firebase Storage (File Management)

Firebase Cloud Functions (Notifications)

Other Tools
GitHub (Version Control)

Microsoft Project (Project Scheduling)

Figma (UI/UX Design) – View Design Here

📂 Project Structure
csharp
Copy
Edit
CourtCaseFlow/
│
├── public/           # Public assets
├── src/              # Source code
│   ├── components/   # React Components
│   ├── pages/        # App Pages
│   ├── services/     # Firebase Service Functions
│   └── utils/        # Helper Functions
├── .gitignore
├── README.md
└── package.json
⚙ Installation & Setup
Clone the repository

bash
Copy
Edit
git clone https://github.com/your-username/CourtCaseFlow.git
cd CourtCaseFlow
Install dependencies

bash
Copy
Edit
npm install
Configure Firebase

Create a Firebase project in the Firebase Console

Enable Authentication, Firestore, Storage, and Cloud Functions

Add your Firebase config to .env file:

env
Copy
Edit
REACT_APP_API_KEY=your_api_key
REACT_APP_AUTH_DOMAIN=your_auth_domain
REACT_APP_PROJECT_ID=your_project_id
REACT_APP_STORAGE_BUCKET=your_storage_bucket
REACT_APP_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_APP_ID=your_app_id
Run the app

bash
Copy
Edit
npm start
📅 Development Timeline
Week	Task
1-2	Requirement gathering & security plan
3-4	Authentication & user roles
5-6	Case management & documents
7	Email notification setup
8	UI polishing and testing
9	Deployment and documentation

📧 Contact
Developer: Meshack Mutisya
