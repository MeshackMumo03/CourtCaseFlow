# CourtCaseFlow

CourtCaseFlow is a modern, secure, and intuitive web application designed to streamline legal case management for small and mid-sized law firms in Kenya. It empowers lawyers to manage cases, handle documents with AI-powered tools, communicate with clients, and track important milestones, all from a single, accessible platform.

## ✨ Key Features

- **Role-Based Access Control**: Separate, tailored experiences for **Lawyers**, **Clients**, and a platform **Admin**.
- **Comprehensive Case Management**: Create, view, edit, and track the status of all your legal cases.
- **Secure Document Handling**: Upload, store, and manage case documents securely using Firebase Storage.
- **AI-Powered Document Tagging**: Leverage Generative AI (via Genkit) to automatically suggest relevant tags for uploaded documents, making organization effortless.
- **Real-time Communication Log**: A dedicated chat-like interface for each case, allowing seamless communication between lawyers and their clients.
- **Client Management**: Lawyers can view a list of all their clients and see all associated cases for each client.
- **Admin Verification System**: An admin dashboard to review and approve/reject lawyers based on their LSK and Law Firm credentials.
- **Progressive Web App (PWA)**: Installable on mobile devices for a native-like experience and quick access from the home screen.
- **Modern, Responsive UI**: Built with shadcn/ui and Tailwind CSS for a professional, accessible, and user-friendly interface that works on all devices.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Storage)
- **Generative AI**: [Genkit](https://firebase.google.com/docs/genkit) with Google's Gemini models.
- **Form Management**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) for validation.

## ⚙️ Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/CourtCaseFlow.git
    cd CourtCaseFlow
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Firebase:**
    - Create a new project in the [Firebase Console](https://console.firebase.google.com/).
    - In your project, enable **Authentication** (with Email/Password and Google providers), **Firestore**, and **Storage**.
    - Navigate to **Project Settings** > **General** and find your Firebase config object for a web app.
    - Copy these credentials into the `firebaseConfig` object in `src/lib/firebase.ts`.

4.  **Set up Environment Variables:**
    - This project uses Genkit for AI features, which requires a Gemini API key.
    - Create a `.env` file in the root of the project.
    - Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
    - Add the API key to your `.env` file:
      ```env
      GEMINI_API_KEY=your_gemini_api_key
      ```

5.  **Run the development server:**
    ```bash
    npm run dev
    ```

    The application should now be running on [http://localhost:9002](http://localhost:9002).
