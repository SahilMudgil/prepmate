# 📚 PrepMate: AI-Powered Study Companion & Test Evaluation System

PrepMate is a full-stack, AI-integrated educational platform that transforms static academic documents into interactive learning experiences. By utilizing an advanced Retrieval-Augmented Generation (RAG) pipeline, PrepMate allows students to upload their notes, chat with their documents, generate targeted practice tests, and receive instant, AI-driven grading and feedback.

## ✨ Features
* **Google OAuth 2.0 Authentication**: Secure, passwordless login using NextAuth.js.
* **Intelligent Document Ingestion**: Multimodal PDF extraction using Gemini 2.5 Flash to preserve complex academic layouts.
* **Vector Semantic Search**: High-resolution 3072-dimensional document chunking and embedding stored in PostgreSQL via `pgvector`.
* **Context-Aware Chatbot**: Chat directly with your textbooks. The bot uses Cosine Similarity to fetch only relevant data, eliminating AI hallucinations.
* **Automated Test Generation**: Dynamically creates custom difficulty tests based on the uploaded materials.
* **AI Evaluation Engine**: Grades tests instantly, provides structured scores, and identifies "Weak Topics" using Zod schema validation.
* **Analytics Dashboard**: Tracks student progress, test scores, and historical data.

## 🛠️ Tech Stack
* **Frontend**: Next.js 14, React, Tailwind CSS
* **Backend**: Next.js API Routes (Serverless)
* **Database**: PostgreSQL (with `pgvector` extension)
* **ORM**: Prisma Client & Raw SQL execution
* **AI / LLMs**: Google Gemini API (`gemini-2.5-flash`, `gemini-embedding-001`)
* **Data Processing**: LangChain (`RecursiveCharacterTextSplitter`), Zod (Structured Output)

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* PostgreSQL database instance (local or hosted via Supabase/Neon)
* A Google Cloud Console project (for OAuth credentials)
* A Google AI Studio API Key (for Gemini)

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/yourusername/prepmate.git
cd prepmate
\`\`\`

### 2. Install dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Environment Variables
Create a `.env` file in the root directory and add the following keys:
\`\`\`env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/prepmate"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate_a_random_secret_string"

# Google OAuth 2.0
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Google Gemini API
GEMINI_API_KEY="your_gemini_api_key"
\`\`\`

### 4. Setup the Database
Push the Prisma schema to your PostgreSQL database to create the tables.
\`\`\`bash
npx prisma db push
\`\`\`

### 5. Run the Application
\`\`\`bash
npm run dev
\`\`\`
Visit `http://localhost:3000` to start studying!

## 👥 Contributors
* Sahil Mudgil
* Rahul Yadav
* Saumil Gupta
* Piyush