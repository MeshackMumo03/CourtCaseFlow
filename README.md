# CourtCaseFlow

A secure, cloud-based legal case management web application designed for small and mid-sized law firms in Kenya. It helps lawyers and clients manage cases, upload legal documents, track milestones, and receive automated court hearing notifications — all in one simple and affordable platform. This application is built with the Next.js, React, and Firebase stack.

## ✨ Features

*   **Role-based Authentication**: Secure login and registration for both Lawyers and Clients using Firebase Authentication (Email/Password and Google Sign-In).
*   **Case Management**: Lawyers can create, view, update, and manage all their cases. Clients can view the status and details of their assigned cases.
*   **Secure Document Handling**: Upload, store, and retrieve case documents securely using Firebase Storage. Lawyers can also delete unneeded documents.
*   **AI-Powered Document Tagging**: Leverage Generative AI to automatically suggest relevant tags for uploaded legal documents, making organization a breeze.
*   **Client Management**: Lawyers have a dedicated view to see a list of all their clients and the cases associated with each one.
*   **Hearings Schedule**: A dedicated page for both lawyers and clients to view upcoming and past hearing dates.
*   **Real-time Communication**: A case-specific chat log allows for seamless communication between a lawyer and their client.
*   **Admin Verification System**: A special admin dashboard to review and approve/reject Lawyer accounts based on LSK and Law Firm verification details.
*   **Progressive Web App (PWA)**: The application is installable on mobile devices for a native app-like experience and quick access.

## 🛠️ Technologies Used

*   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
*   **UI Library**: [React.js](https://reactjs.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
*   **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Storage)
*   **Generative AI**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)

## 📂 Project Structure

The project follows a standard Next.js App Router structure.

```
CourtCaseFlow/
│
├── public/                 # Public assets, icons, and manifest.json
├── src/
│   ├── app/                # Main application routes and pages
│   │   ├── (app)/          # Authenticated routes (dashboard, cases, etc.)
│   │   └── (auth)/         # Auth routes (login, signup)
│   ├── actions/            # Server Actions for form submissions & mutations
│   ├── ai/                 # Genkit flows for AI features
│   ├── components/         # Reusable React components (UI, layout, features)
│   ├── contexts/           # React context providers (e.g., AuthContext)
│   ├── hooks/              # Custom React hooks (e.g., useAuth)
│   ├── lib/                # Utility functions and library initializations
│   └── types/              # TypeScript type definitions
├── .env                    # Environment variables (for Firebase config)
├── next.config.ts          # Next.js configuration
└── package.json
```

## ⚙️ Installation & Setup

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/CourtCaseFlow.git
cd CourtCaseFlow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Firebase

1.  Create a new project in the [Firebase Console](https://console.firebase.google.com/).
2.  In your project, enable the following services:
    *   **Authentication**: Enable the `Email/Password` and `Google` sign-in providers.
    *   **Firestore Database**: Create a new database.
    *   **Storage**: Create a new storage bucket.
3.  Go to your Project Settings and copy the Firebase configuration object.
4.  Paste your Firebase config into the `src/lib/firebase.ts` file, replacing the placeholder values.

### 4. Run the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.