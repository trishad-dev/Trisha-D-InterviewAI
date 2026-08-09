import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const MIN_QUESTIONS = 8;
const MIN_DISTINCT_DAYS = 4;

// ── Types ────────────────────────────────────────────────────────────

interface HistoryMessage {
  role: "agent" | "candidate";
  text: string;
}

interface TurnRequestBody {
  sessionId: string;
  candidateId: string;
  userMessage: string;
  history: HistoryMessage[];
}

interface Mission {
  day: number;
  title: string;
  passed?: boolean;
  attempts?: number;
  skipped?: boolean;
}

interface Candidate {
  member: {
    id: string;
    name: string;
    jobRole: string;
    yearsExperience: number;
    education: string;
    status: string;
  };
  missions: Mission[];
  signals: { commitDays: number; missionsCompleted: number; missionsFirstTry: number };
}

interface CurriculumDay {
  day: number;
  title: string;
  type: string;
  tools: string[];
  objectives: string[];
}

// ── Curriculum data (mirrors src/data/curriculum.json) ─────────────────

const CURRICULUM: CurriculumDay[] = [
  { day: 1, title: "VS Code & Python Environment Setup", type: "SETUP", tools: ["VS Code", "Python", "Python Extension", "Pylance", "Virtual Environment"], objectives: ["Install VS Code and Python on your machine", "Configure the Python extension and Pylance", "Create and activate a project virtual environment (.venv)", "Run and debug your first Python program inside VS Code", "Verify the development environment is ready for the remaining course"] },
  { day: 2, title: "Local LLM & AI Coding Assistant Setup", type: "SETUP", tools: ["Ollama", "Qwen2.5-Coder", "GitHub Copilot", "Cline"], objectives: ["Install Ollama and download a local coding model", "Verify the local model works through the Ollama CLI", "Connect VS Code to the local model using GitHub Copilot or Cline", "Generate code using the local AI assistant", "Confirm the complete AI coding workflow works offline"] },
  { day: 3, title: "First AI Project, React Frontend & GitHub", type: "BUILD", tools: ["Python", "Ollama", "FastAPI", "React", "Vite", "Git", "GitHub"], objectives: ["Build a command-line chatbot powered by your local Ollama model", "Scaffold a FastAPI backend with a health endpoint", "Create a React application using Vite", "Connect the React frontend with the FastAPI backend", "Initialize Git, commit the project, and publish it to GitHub"] },
  { day: 4, title: "Reading & Processing Structured Data", type: "BUILD", tools: ["Pandas", "SQLite", "SQL", "SQLAlchemy"], objectives: ["Create synthetic healthcare plans and claims datasets", "Load and clean structured CSV data using Pandas", "Store the processed data in a SQLite database", "Write SQL queries to answer common healthcare questions", "Document reusable SQL queries for later chatbot integration"] },
  { day: 5, title: "Reading & Processing Unstructured Data", type: "BUILD", tools: ["pdfplumber", "PyPDF", "python-docx", "Tesseract OCR", "BeautifulSoup", "Requests"], objectives: ["Extract text from healthcare PDFs and Word documents", "Perform OCR on scanned enrollment forms", "Scrape useful content from a public healthcare webpage", "Clean and normalize extracted text from multiple sources", "Store the processed text files for knowledge-base creation"] },
  { day: 6, title: "Building the Knowledge Base", type: "BUILD", tools: ["LangChain Text Splitters", "JSONL", "Python"], objectives: ["Convert structured and unstructured healthcare data into a unified knowledge base", "Split long documents into retrieval-friendly chunks", "Attach metadata such as source, plan type, and document section to every chunk", "Export all processed records into a knowledge_base.jsonl file", "Validate chunk quality before using them for embeddings"] },
  { day: 7, title: "Embeddings Explained", type: "AI_CORE", tools: ["Sentence Transformers", "OpenAI Embeddings", "Scikit-learn", "Matplotlib"], objectives: ["Understand how text is converted into vector embeddings", "Generate embeddings for every knowledge base chunk", "Store embeddings alongside the original documents", "Visualize embedding clusters using PCA", "Analyze whether similar healthcare concepts cluster together"] },
  { day: 8, title: "Vector Databases Overview", type: "BUILD", tools: ["ChromaDB", "Pinecone"], objectives: ["Learn the role of vector databases in RAG applications", "Set up a local Chroma vector database", "Create a cloud-based Pinecone index for comparison", "Compare local and managed vector database solutions", "Select the most suitable database for the chatbot project"] },
  { day: 9, title: "Building & Populating the Vector Database", type: "BUILD", tools: ["ChromaDB", "Sentence Transformers"], objectives: ["Load knowledge base embeddings into the vector database", "Store documents together with metadata for filtering", "Verify that every knowledge base chunk has been indexed", "Test semantic search with healthcare-related questions", "Evaluate retrieval quality and metadata filtering"] },
  { day: 10, title: "The Retrieval & Matching Engine", type: "SHIP_IT", tools: ["SQLite", "ChromaDB", "Python"], objectives: ["Build a query router that decides between SQL, vector search, or hybrid retrieval", "Implement structured data lookup for plans and claims", "Implement semantic retrieval from the vector database", "Merge and deduplicate results from multiple retrieval sources", "Evaluate retrieval accuracy using a diverse set of healthcare questions"] },
  { day: 11, title: "RAG End-to-End & LLM API Basics", type: "BUILD", tools: ["OpenAI SDK", "Ollama", "Groq", "Python"], objectives: ["Connect the retrieval engine to an LLM to build a complete RAG pipeline", "Configure a local or hosted LLM provider using the OpenAI-compatible SDK", "Create a grounded prompt that answers only from retrieved context", "Generate answers using retrieved knowledge", "Evaluate chatbot responses against the retrieval-only baseline"] },
  { day: 12, title: "Prompt Engineering Fundamentals", type: "LEARN", tools: ["LLMs", "Prompt Templates"], objectives: ["Understand zero-shot, few-shot, and chain-of-thought prompting", "Design multiple system prompt variations for the chatbot", "Compare prompts based on accuracy, compliance, and tone", "Evaluate prompt performance using a fixed question set", "Finalize the production-ready system prompt"] },
  { day: 13, title: "Advanced Prompting: Function Calling & Structured Outputs", type: "BUILD", tools: ["OpenAI Function Calling", "Pydantic", "Python"], objectives: ["Define tool schemas for healthcare-related chatbot functions", "Implement LLM function calling with automatic tool execution", "Validate structured outputs using Pydantic models", "Log tool calls for debugging and auditing", "Test different user queries to verify correct tool selection"] },
  { day: 14, title: "Fine-Tuning: Concepts & When to Use It", type: "LEARN", tools: ["JSONL", "OpenAI", "LoRA", "QLoRA"], objectives: ["Understand when fine-tuning is more appropriate than prompting or RAG", "Identify chatbot issues that fine-tuning can solve", "Create a high-quality fine-tuning dataset", "Validate and organize the dataset into training and test sets", "Prepare the project for model fine-tuning"] },
  { day: 15, title: "Fine-Tuning: Hands-On with LoRA & QLoRA", type: "SHIP_IT", tools: ["PEFT", "Transformers", "BitsAndBytes", "OpenAI Fine-Tuning", "LoRA"], objectives: ["Train or fine-tune an LLM using LoRA or the OpenAI fine-tuning workflow", "Load and evaluate the fine-tuned model", "Compare the base model and fine-tuned model on unseen test cases", "Measure improvements in tone, consistency, and response quality", "Document whether fine-tuning provides measurable benefits for the chatbot"] },
  { day: 16, title: "Chatbot Backend & API Integration", type: "BUILD", tools: ["FastAPI", "SQLite", "Python"], objectives: ["Create a /chat API endpoint for the healthcare chatbot", "Integrate retrieval, function calling, and LLM response generation", "Implement session-based conversation management", "Build a conversation history endpoint", "Test the complete backend API using Postman or cURL"] },
  { day: 17, title: "Chatbot Frontend Development", type: "BUILD", tools: ["Streamlit", "Requests", "UUID"], objectives: ["Build an interactive chat interface for the chatbot", "Connect the frontend to the backend chat API", "Maintain conversation history across user interactions", "Add a healthcare plan selector and new conversation option", "Validate end-to-end communication between frontend and backend"] },
  { day: 18, title: "Full-Stack Integration & Streaming Responses", type: "BUILD", tools: ["FastAPI", "StreamingResponse", "Server-Sent Events", "Streamlit"], objectives: ["Implement real-time streaming responses from the LLM", "Display generated tokens incrementally in the chat interface", "Add loading indicators for a better user experience", "Handle interrupted or failed streaming requests gracefully", "Verify smooth end-to-end streaming between backend and frontend"] },
  { day: 19, title: "Response Formatting & Rich Outputs", type: "BUILD", tools: ["Pydantic", "Markdown", "Streamlit"], objectives: ["Add citations to chatbot responses using retrieved knowledge", "Create structured cards for claims and coverage summaries", "Render Markdown content with tables, lists, and formatting", "Validate structured outputs before displaying them", "Improve chatbot readability and response trustworthiness"] },
  { day: 20, title: "Conversation Memory & Context Management", type: "SHIP_IT", tools: ["SQLite", "FastAPI", "LLM", "Token Management"], objectives: ["Persist conversation history across multiple user sessions", "Build context-aware conversations using previous messages", "Implement automatic conversation summarization for long chats", "Manage token limits while preserving important context", "Ensure the chatbot remembers user preferences throughout a conversation"] },
  { day: 21, title: "Agentic Frameworks: LangChain Agents & Tool Use", type: "BUILD", tools: ["LangChain", "LangChain Agents", "ReAct", "Python"], objectives: ["Convert function-calling workflows into a reasoning agent", "Wrap chatbot capabilities as reusable LangChain tools", "Build a ReAct agent capable of selecting the correct tool automatically", "Analyze reasoning traces to understand agent decision making", "Evaluate whether the agent chooses the right tools for healthcare queries"] },
  { day: 22, title: "Multi-Agent Orchestration", type: "BUILD", tools: ["CrewAI", "LangGraph", "Python"], objectives: ["Create specialized agents for different healthcare domains", "Build a router agent that delegates requests to the correct specialist", "Implement a complete multi-agent workflow", "Compare multi-agent performance with a single-agent architecture", "Identify scenarios where multiple agents provide measurable benefits"] },
  { day: 23, title: "Model Context Protocol (MCP)", type: "BUILD", tools: ["MCP Python SDK", "Claude Desktop", "Cline", "Python"], objectives: ["Understand the purpose of the Model Context Protocol", "Build an MCP server exposing healthcare chatbot tools", "Connect the MCP server to an MCP-compatible client", "Expose multiple chatbot capabilities through standardized MCP tools", "Verify successful tool execution through live MCP interactions"] },
  { day: 24, title: "Agentic Chatbot Integration", type: "SHIP_IT", tools: ["LangChain", "MCP", "FastAPI", "Python"], objectives: ["Integrate agents, MCP tools, retrieval, and conversation memory", "Replace mock tools with live MCP-powered tool calls", "Implement retries, timeouts, and graceful error handling", "Perform failure testing to validate chatbot reliability", "Build a production-style agentic chatbot pipeline"] },
  { day: 25, title: "Chatbot Evaluation & Testing", type: "SHIP_IT", tools: ["Python", "Evaluation Dataset", "Automated Testing"], objectives: ["Create a benchmark dataset covering representative healthcare questions", "Evaluate chatbot responses for accuracy, grounding, and consistency", "Measure retrieval quality and end-to-end response performance", "Identify common failure cases and document improvement areas", "Establish baseline metrics before production deployment"] },
  { day: 26, title: "Performance Optimization & Cost Management", type: "OPTIMIZE", tools: ["tiktoken", "Python", "FastAPI"], objectives: ["Measure token usage across the chatbot pipeline", "Optimize retrieval and prompt size to reduce latency and cost", "Implement response caching for repeated queries", "Benchmark response time before and after optimization", "Document performance improvements using measurable metrics"] },
  { day: 27, title: "Security, Privacy & Guardrails", type: "BUILD", tools: ["FastAPI", "Python", "Authentication", "Input Validation"], objectives: ["Secure chatbot APIs against unauthorized access", "Validate and sanitize user inputs before processing", "Protect sensitive healthcare information throughout the pipeline", "Implement prompt-injection and jailbreak safeguards", "Test common security scenarios and document mitigation strategies"] },
  { day: 28, title: "Docker & Kubernetes Deployment", type: "SHIP_IT", tools: ["Docker", "Kubernetes", "FastAPI", "React"], objectives: ["Containerize the chatbot backend and frontend using Docker", "Deploy the application to a Kubernetes cluster", "Configure health checks and environment variables", "Verify the deployed chatbot functions correctly", "Prepare the application for production hosting"] },
  { day: 29, title: "Monitoring, Logging & Observability", type: "BUILD", tools: ["Python Logging", "Prometheus", "Grafana"], objectives: ["Add structured logging throughout the chatbot pipeline", "Monitor API performance and chatbot usage", "Track failures, latency, and tool execution metrics", "Build dashboards for production observability", "Use monitoring insights to improve chatbot reliability"] },
  { day: 30, title: "Production Readiness & Final Testing", type: "SHIP_IT", tools: ["FastAPI", "Docker", "Kubernetes", "Python"], objectives: ["Perform complete end-to-end testing of the chatbot", "Validate retrieval, agent workflows, and frontend integration", "Fix production issues discovered during testing", "Complete deployment and operational documentation", "Prepare the chatbot for real-world production usage"] },
  { day: 31, title: "Capstone Project & Final Demo", type: "CAPSTONE", tools: ["FastAPI", "React", "LangChain", "MCP", "Docker", "Kubernetes"], objectives: ["Demonstrate the complete enterprise healthcare chatbot", "Showcase retrieval, RAG, agents, MCP, and conversation memory", "Present the deployed application with production architecture", "Evaluate the chatbot using real-world scenarios", "Publish the final project with source code and documentation"] },
];

// ── Candidate data (mirrors src/data/candidates.json) ──────────────────

const CANDIDATES: Candidate[] = [
  { member: { id: "CAND-001", name: "Sarah Johnson", jobRole: "Senior Data Engineer", yearsExperience: 9, education: "MS Computer Science", status: "COMPLETED" }, missions: [{ day: 7, title: "Embeddings Explained", passed: true, attempts: 1 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 1 }, { day: 10, title: "Retrieval & Matching Engine", passed: true, attempts: 2 }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 4 }, { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 1 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 2 }, { day: 23, title: "Model Context Protocol (MCP)", passed: true, attempts: 2 }, { day: 28, title: "Docker & Kubernetes Deployment", passed: true, attempts: 3 }, { day: 29, title: "Monitoring, Logging & Observability", skipped: true }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 1 }], signals: { commitDays: 28, missionsCompleted: 30, missionsFirstTry: 20 } },
  { member: { id: "CAND-002", name: "Alex Turner", jobRole: "Backend Software Engineer", yearsExperience: 5, education: "B.Tech Computer Science", status: "COMPLETED" }, missions: [{ day: 7, title: "Embeddings Explained", passed: true, attempts: 3 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 2 }, { day: 10, title: "Retrieval & Matching Engine", passed: true, attempts: 4 }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 5 }, { day: 13, title: "Function Calling & Structured Outputs", passed: true, attempts: 4 }, { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 1 }, { day: 18, title: "Streaming Responses", passed: true, attempts: 1 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 3 }, { day: 28, title: "Docker & Kubernetes Deployment", passed: true, attempts: 1 }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 2 }], signals: { commitDays: 22, missionsCompleted: 29, missionsFirstTry: 10 } },
  { member: { id: "CAND-003", name: "Emily Chen", jobRole: "AI Engineer", yearsExperience: 6, education: "MS Artificial Intelligence", status: "COMPLETED" }, missions: [{ day: 7, title: "Embeddings Explained", passed: true, attempts: 1 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 1 }, { day: 10, title: "Retrieval & Matching Engine", passed: true, attempts: 1 }, { day: 11, title: "RAG End-to-End & LLM API Basics", passed: true, attempts: 1 }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 1 }, { day: 13, title: "Function Calling & Structured Outputs", passed: true, attempts: 1 }, { day: 21, title: "LangChain Agents", passed: true, attempts: 1 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 1 }, { day: 23, title: "Model Context Protocol (MCP)", passed: true, attempts: 1 }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 1 }], signals: { commitDays: 31, missionsCompleted: 31, missionsFirstTry: 30 } },
  { member: { id: "CAND-004", name: "David Miller", jobRole: "Business Analyst", yearsExperience: 8, education: "MBA", status: "COMPLETED" }, missions: [{ day: 7, title: "Embeddings Explained", passed: true, attempts: 4 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 5 }, { day: 10, title: "Retrieval & Matching Engine", passed: true, attempts: 5 }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 3 }, { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 2 }, { day: 20, title: "Conversation Memory & Context Management", passed: true, attempts: 3 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 4 }, { day: 23, title: "Model Context Protocol (MCP)", passed: true, attempts: 5 }, { day: 28, title: "Docker & Kubernetes Deployment", skipped: true }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 2 }], signals: { commitDays: 18, missionsCompleted: 28, missionsFirstTry: 6 } },
  { member: { id: "CAND-005", name: "Michael Brown", jobRole: "DevOps Engineer", yearsExperience: 10, education: "B.Tech Information Technology", status: "COMPLETED" }, missions: [{ day: 7, title: "Embeddings Explained", passed: true, attempts: 2 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 2 }, { day: 10, title: "Retrieval & Matching Engine", passed: true, attempts: 2 }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 4 }, { day: 18, title: "Streaming Responses", passed: true, attempts: 1 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 2 }, { day: 23, title: "Model Context Protocol (MCP)", passed: true, attempts: 3 }, { day: 28, title: "Docker & Kubernetes Deployment", passed: true, attempts: 1 }, { day: 29, title: "Monitoring, Logging & Observability", passed: true, attempts: 1 }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 1 }], signals: { commitDays: 30, missionsCompleted: 31, missionsFirstTry: 22 } },
  { member: { id: "CAND-006", name: "Wendy Foster", jobRole: "Marketing Manager", yearsExperience: 12, education: "BA Marketing", status: "COMPLETED" }, missions: [{ day: 1, title: "VS Code & Python Environment Setup", passed: true, attempts: 3 }, { day: 7, title: "Embeddings Explained", passed: true, attempts: 5 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 5 }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 4 }, { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 4 }, { day: 17, title: "Chatbot Frontend Development", passed: true, attempts: 2 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 5 }, { day: 27, title: "Security, Privacy & Guardrails", skipped: true }, { day: 28, title: "Docker & Kubernetes Deployment", skipped: true }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 3 }], signals: { commitDays: 19, missionsCompleted: 24, missionsFirstTry: 2 } },
  { member: { id: "CAND-007", name: "Ethan Brooks", jobRole: "Computer Science Intern", yearsExperience: 0, education: "BS Computer Science (in progress)", status: "COMPLETED" }, missions: [{ day: 1, title: "VS Code & Python Environment Setup", passed: true, attempts: 1 }, { day: 3, title: "First AI Project, React Frontend & GitHub", passed: true, attempts: 1 }, { day: 7, title: "Embeddings Explained", passed: true, attempts: 2 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 1 }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 1 }, { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 1 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 1 }, { day: 27, title: "Security, Privacy & Guardrails", skipped: true }, { day: 28, title: "Docker & Kubernetes Deployment", skipped: true }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 2 }], signals: { commitDays: 26, missionsCompleted: 27, missionsFirstTry: 22 } },
  { member: { id: "CAND-008", name: "Harold Whitfield", jobRole: "Distinguished Engineer", yearsExperience: 28, education: "BS Computer Science", status: "COMPLETED" }, missions: [{ day: 1, title: "VS Code & Python Environment Setup", passed: true, attempts: 1 }, { day: 4, title: "Reading & Processing Structured Data", passed: true, attempts: 1 }, { day: 5, title: "Reading & Processing Unstructured Data", passed: true, attempts: 1 }, { day: 14, title: "Fine-Tuning: Concepts & When to Use It", skipped: true }, { day: 15, title: "Fine-Tuning: Hands-On with LoRA & QLoRA", skipped: true }, { day: 21, title: "LangChain Agents", passed: true, attempts: 5 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 4 }, { day: 23, title: "Model Context Protocol (MCP)", passed: true, attempts: 5 }, { day: 27, title: "Security, Privacy & Guardrails", passed: true, attempts: 1 }, { day: 28, title: "Docker & Kubernetes Deployment", passed: true, attempts: 1 }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 2 }], signals: { commitDays: 25, missionsCompleted: 27, missionsFirstTry: 15 } },
  { member: { id: "CAND-009", name: "Zara Ahmadi", jobRole: "AI Engineer", yearsExperience: 1, education: "BS Computer Science", status: "COMPLETED" }, missions: [{ day: 7, title: "Embeddings Explained", passed: true, attempts: 1 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 1 }, { day: 10, title: "Retrieval & Matching Engine", passed: true, attempts: 1 }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 1 }, { day: 13, title: "Function Calling & Structured Outputs", passed: true, attempts: 1 }, { day: 21, title: "LangChain Agents", passed: true, attempts: 1 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 1 }, { day: 23, title: "Model Context Protocol (MCP)", passed: true, attempts: 1 }, { day: 27, title: "Security, Privacy & Guardrails", passed: true, attempts: 1 }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 1 }], signals: { commitDays: 31, missionsCompleted: 31, missionsFirstTry: 29 } },
  { member: { id: "CAND-010", name: "Gerald Combs", jobRole: "IT Support Specialist", yearsExperience: 20, education: "AAS Information Technology", status: "COMPLETED" }, missions: [{ day: 1, title: "VS Code & Python Environment Setup", passed: true, attempts: 2 }, { day: 7, title: "Embeddings Explained", passed: true, attempts: 5 }, { day: 8, title: "Vector Databases Overview", passed: false, attempts: 4 }, { day: 10, title: "Retrieval & Matching Engine", passed: false, attempts: 3 }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 5 }, { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 4 }, { day: 22, title: "Multi-Agent Orchestration", passed: false, attempts: 3 }, { day: 27, title: "Security, Privacy & Guardrails", skipped: true }, { day: 28, title: "Docker & Kubernetes Deployment", skipped: true }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 3 }], signals: { commitDays: 22, missionsCompleted: 23, missionsFirstTry: 1 } },
  { member: { id: "CAND-011", name: "Mia Alvarez", jobRole: "UX Researcher", yearsExperience: 6, education: "MA Human-Computer Interaction", status: "COMPLETED" }, missions: [{ day: 1, title: "VS Code & Python Environment Setup", passed: true, attempts: 2 }, { day: 2, title: "Local LLM & AI Coding Assistant Setup", passed: true, attempts: 1 }, { day: 3, title: "First AI Project, React Frontend & GitHub", passed: true, attempts: 3 }, { day: 4, title: "Reading & Processing Structured Data", passed: true, attempts: 2 }, { day: 7, title: "Embeddings Explained", skipped: true }, { day: 8, title: "Vector Databases Overview", skipped: true }, { day: 12, title: "Prompt Engineering Fundamentals", skipped: true }, { day: 16, title: "Chatbot Backend & API Integration", skipped: true }, { day: 22, title: "Multi-Agent Orchestration", skipped: true }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 4 }], signals: { commitDays: 9, missionsCompleted: 14, missionsFirstTry: 5 } },
  { member: { id: "CAND-012", name: "Chen Wei", jobRole: "Mobile App Developer", yearsExperience: 7, education: "BS Computer Engineering", status: "COMPLETED" }, missions: [{ day: 7, title: "Embeddings Explained", passed: true, attempts: 4 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 5 }, { day: 9, title: "Building & Populating the Vector Database", passed: true, attempts: 4 }, { day: 10, title: "Retrieval & Matching Engine", passed: true, attempts: 4 }, { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 1 }, { day: 18, title: "Streaming Responses", passed: true, attempts: 1 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 2 }, { day: 28, title: "Docker & Kubernetes Deployment", passed: true, attempts: 1 }, { day: 30, title: "Production Readiness & Final Testing", passed: true, attempts: 1 }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 1 }], signals: { commitDays: 27, missionsCompleted: 30, missionsFirstTry: 14 } },
  { member: { id: "CAND-013", name: "Ravi Patel", jobRole: "Software Engineer", yearsExperience: 15, education: "MS Computer Science", status: "COMPLETED" }, missions: [{ day: 1, title: "VS Code & Python Environment Setup", passed: true, attempts: 3 }, { day: 4, title: "Reading & Processing Structured Data", passed: true, attempts: 2 }, { day: 7, title: "Embeddings Explained", passed: true, attempts: 3 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 2 }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 3 }, { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 2 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 2 }, { day: 27, title: "Security, Privacy & Guardrails", passed: true, attempts: 1 }, { day: 28, title: "Docker & Kubernetes Deployment", passed: true, attempts: 1 }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 1 }], signals: { commitDays: 27, missionsCompleted: 30, missionsFirstTry: 13 } },
  { member: { id: "CAND-014", name: "Bethany Cole", jobRole: "HR Manager", yearsExperience: 10, education: "BA Human Resources", status: "COMPLETED" }, missions: [{ day: 1, title: "VS Code & Python Environment Setup", passed: true, attempts: 4 }, { day: 7, title: "Embeddings Explained", passed: true, attempts: 5 }, { day: 8, title: "Vector Databases Overview", skipped: true }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 5 }, { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 4 }, { day: 20, title: "Conversation Memory & Context Management", passed: true, attempts: 3 }, { day: 22, title: "Multi-Agent Orchestration", skipped: true }, { day: 27, title: "Security, Privacy & Guardrails", skipped: true }, { day: 28, title: "Docker & Kubernetes Deployment", skipped: true }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 4 }], signals: { commitDays: 17, missionsCompleted: 20, missionsFirstTry: 1 } },
  { member: { id: "CAND-015", name: "Noah Kim", jobRole: "Principal Architect", yearsExperience: 20, education: "MS Computer Science", status: "COMPLETED" }, missions: [{ day: 1, title: "VS Code & Python Environment Setup", passed: true, attempts: 1 }, { day: 7, title: "Embeddings Explained", passed: true, attempts: 1 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 1 }, { day: 14, title: "Fine-Tuning: Concepts & When to Use It", skipped: true }, { day: 15, title: "Fine-Tuning: Hands-On with LoRA & QLoRA", skipped: true }, { day: 21, title: "LangChain Agents", passed: true, attempts: 1 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 1 }, { day: 23, title: "Model Context Protocol (MCP)", passed: true, attempts: 1 }, { day: 27, title: "Security, Privacy & Guardrails", passed: true, attempts: 1 }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 1 }], signals: { commitDays: 29, missionsCompleted: 29, missionsFirstTry: 27 } },
  { member: { id: "CAND-016", name: "Isabella Rossi", jobRole: "Software Engineer", yearsExperience: 5, education: "BS Computer Science", status: "COMPLETED" }, missions: [{ day: 1, title: "VS Code & Python Environment Setup", passed: true, attempts: 2 }, { day: 7, title: "Embeddings Explained", passed: false, attempts: 4 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 3 }, { day: 12, title: "Prompt Engineering Fundamentals", passed: false, attempts: 5 }, { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 2 }, { day: 22, title: "Multi-Agent Orchestration", passed: false, attempts: 4 }, { day: 27, title: "Security, Privacy & Guardrails", skipped: true }, { day: 28, title: "Docker & Kubernetes Deployment", skipped: true }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 2 }], signals: { commitDays: 19, missionsCompleted: 21, missionsFirstTry: 2 } },
  { member: { id: "CAND-017", name: "Tyler Brooks", jobRole: "Junior Developer", yearsExperience: 0, education: "GED + Coding Bootcamp Certificate", status: "COMPLETED" }, missions: [{ day: 1, title: "VS Code & Python Environment Setup", passed: true, attempts: 3 }, { day: 3, title: "First AI Project, React Frontend & GitHub", passed: true, attempts: 5 }, { day: 7, title: "Embeddings Explained", passed: true, attempts: 5 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 5 }, { day: 10, title: "Retrieval & Matching Engine", passed: true, attempts: 5 }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 5 }, { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 4 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 5 }, { day: 28, title: "Docker & Kubernetes Deployment", passed: true, attempts: 4 }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 3 }], signals: { commitDays: 30, missionsCompleted: 31, missionsFirstTry: 1 } },
  { member: { id: "CAND-018", name: "Diane Foster", jobRole: "AI Engineer", yearsExperience: 4, education: "MS Computer Science", status: "COMPLETED" }, missions: [{ day: 7, title: "Embeddings Explained", passed: true, attempts: 1 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 1 }, { day: 10, title: "Retrieval & Matching Engine", passed: true, attempts: 1 }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 1 }, { day: 13, title: "Function Calling & Structured Outputs", passed: true, attempts: 1 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 1 }, { day: 23, title: "Model Context Protocol (MCP)", passed: true, attempts: 1 }, { day: 27, title: "Security, Privacy & Guardrails", passed: true, attempts: 1 }, { day: 28, title: "Docker & Kubernetes Deployment", passed: true, attempts: 1 }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 1 }], signals: { commitDays: 31, missionsCompleted: 31, missionsFirstTry: 31 } },
  { member: { id: "CAND-019", name: "Frank DeLuca", jobRole: "Legacy Systems Engineer", yearsExperience: 25, education: "BS Computer Science", status: "COMPLETED" }, missions: [{ day: 1, title: "VS Code & Python Environment Setup", passed: true, attempts: 2 }, { day: 4, title: "Reading & Processing Structured Data", passed: true, attempts: 1 }, { day: 7, title: "Embeddings Explained", passed: true, attempts: 4 }, { day: 8, title: "Vector Databases Overview", passed: true, attempts: 3 }, { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 1 }, { day: 17, title: "Chatbot Frontend Development", passed: true, attempts: 5 }, { day: 19, title: "Response Formatting & Rich Outputs", passed: true, attempts: 4 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 3 }, { day: 28, title: "Docker & Kubernetes Deployment", passed: true, attempts: 1 }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 2 }], signals: { commitDays: 26, missionsCompleted: 29, missionsFirstTry: 11 } },
  { member: { id: "CAND-020", name: "Priyanka Sharma", jobRole: "Software Engineer", yearsExperience: 5, education: "BS Computer Science", status: "COMPLETED" }, missions: [{ day: 1, title: "VS Code & Python Environment Setup", passed: true, attempts: 1 }, { day: 3, title: "First AI Project, React Frontend & GitHub", passed: true, attempts: 1 }, { day: 4, title: "Reading & Processing Structured Data", skipped: true }, { day: 7, title: "Embeddings Explained", passed: false, attempts: 2 }, { day: 8, title: "Vector Databases Overview", skipped: true }, { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 1 }, { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 1 }, { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 1 }, { day: 27, title: "Security, Privacy & Guardrails", passed: true, attempts: 1 }, { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 1 }], signals: { commitDays: 24, missionsCompleted: 27, missionsFirstTry: 19 } },
];

// ── Topic prioritization ──────────────────────────────────────────────

interface PrioritizedDay {
  day: CurriculumDay;
  weight: number;
  reason: string;
}

function prioritizeTopics(candidate: Candidate): PrioritizedDay[] {
  const prioritized: PrioritizedDay[] = [];

  for (const day of CURRICULUM) {
    let weight = 0;
    const reasons: string[] = [];

    const mission = candidate.missions.find((m) => m.day === day.day);

    if (mission?.skipped) {
      weight += 6;
      reasons.push("skipped (probe lightly)");
    }
    if (mission?.passed) {
      weight += 10;
      reasons.push("completed");
    }
    const attempts = mission?.attempts ?? 0;
    if (attempts > 1) {
      weight += attempts * 2;
      reasons.push(`${attempts} attempts (struggled)`);
    } else if (attempts === 1 && mission?.passed) {
      weight += 3;
      reasons.push("first-try pass");
    }

    if (weight > 0) {
      prioritized.push({ day, weight, reason: reasons.join(", ") });
    }
  }

  prioritized.sort((a, b) => b.weight - a.weight);
  return prioritized;
}

// ── Gemini API call ──────────────────────────────────────────────────

interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

async function callGemini(
  systemPrompt: string,
  history: HistoryMessage[],
  userMessage: string,
  isFeedback: boolean
): Promise<string> {
  const contents: GeminiContent[] = [];

  for (const msg of history) {
    contents.push({
      role: msg.role === "agent" ? "model" : "user",
      parts: [{ text: msg.text }],
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: isFeedback ? 0.4 : 0.7,
      topP: 0.95,
      maxOutputTokens: isFeedback ? 2048 : 1024,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no content");
  }
  return text;
}

// ── System prompt builder ─────────────────────────────────────────────

function buildInterviewSystemPrompt(candidate: Candidate, questionCount: number): string {
  const prioritized = prioritizeTopics(candidate);
  const topicList = prioritized
    .map(
      (p) =>
        `Day ${p.day.day}: ${p.day.title} (Type: ${p.day.type}) — Priority: ${p.reason}\n   Objectives: ${p.day.objectives.join("; ")}`
    )
    .join("\n\n");

  const passedDays = candidate.missions.filter((m) => m.passed).map((m) => m.day).join(", ") || "none";
  const skippedDays = candidate.missions.filter((m) => m.skipped).map((m) => m.day).join(", ") || "none";
  const failedDays = candidate.missions.filter((m) => m.passed === false).map((m) => `Day ${m.day} (${m.attempts}x failed)`).join(", ") || "none";
  const struggledDays = candidate.missions.filter((m) => m.passed && (m.attempts ?? 0) > 1).map((m) => `Day ${m.day} (${m.attempts}x)`).join(", ") || "none";

  const profileSummary = `Candidate: ${candidate.member.name} (${candidate.member.jobRole})
Experience: ${candidate.member.yearsExperience} years — Education: ${candidate.member.education}
Completed days: ${passedDays}
Skipped days: ${skippedDays}
Failed missions: ${failedDays}
Struggled missions (passed but multiple attempts): ${struggledDays}
Signals: ${candidate.signals.commitDays} commit days, ${candidate.signals.missionsCompleted} missions completed, ${candidate.signals.missionsFirstTry} first-try passes
Questions asked so far: ${questionCount}`;

  return `You are an expert technical interviewer conducting a realistic, adaptive technical interview for an AI engineering role.

${profileSummary}

CURRICULUM TOPICS (ordered by priority — probe high-weight topics first, but adapt based on the conversation):
${topicList}

INTERVIEW RULES:
1. Ask a minimum of ${MIN_QUESTIONS} questions spanning at least ${MIN_DISTINCT_DAYS} different curriculum days before concluding.
2. After each candidate response, evaluate their answer and decide: ask a follow-up on the SAME topic (to go deeper or clarify), or move to a NEW topic. This decision must be genuinely conditional on what the candidate said — not a fixed script.
3. If the candidate gives a one-word or off-topic answer, naturally redirect them back to the topic without being harsh.
4. Be conversational and professional — like a real interviewer, not a quiz bot. Ask one question at a time.
5. Probe topics the candidate struggled with (high attempt counts or failed missions) slightly more deeply.
6. For skipped topics, probe lightly — the candidate may not have deep knowledge.
7. Don't reveal the total number of questions or that you're counting.
8. Keep your messages concise — typically 2-4 sentences including the question.

OUTPUT FORMAT:
You must respond with valid JSON only, no markdown fences. Use this exact schema:

{
  "agentMessage": "your message to the candidate (the question or follow-up)",
  "isComplete": false,
  "currentTopic": "Day X: Topic Name",
  "topicsCovered": ["Day X: Topic Name", ...],
  "questionCount": <number of questions asked so far including this one>,
  "evaluation": {
    "day": <day number or null if none yet>,
    "understanding": "strong" | "developing" | "weak" | null,
    "note": "brief assessment of the candidate's last answer"
  }
}

Set "isComplete" to true ONLY when you have asked at least ${MIN_QUESTIONS} questions across at least ${MIN_DISTINCT_DAYS} different curriculum days AND you have enough signal to assess. When isComplete is true, set "agentMessage" to a brief closing statement (e.g., "That wraps up our interview. Let me compile your feedback...") and include a "finalAssessment" object:

{
  "agentMessage": "...",
  "isComplete": true,
  "finalAssessment": {
    "strengths": ["...", "..."],
    "gaps": ["...", "..."],
    "topicBreakdown": [
      { "day": 3, "topic": "Retrieval-Augmented Generation (RAG)", "understanding": "strong" },
      ...
    ],
    "overallSummary": "2-3 sentence summary of the candidate's performance"
  }
}

The topicBreakdown should cover every curriculum day you touched during the interview.`;
}

function buildFeedbackSystemPrompt(candidate: Candidate): string {
  const prioritized = prioritizeTopics(candidate);
  const topicList = prioritized.map((p) => `Day ${p.day.day}: ${p.day.title}`).join("\n");

  return `You are compiling final interview feedback. Based on the full conversation history, produce structured feedback.

Candidate: ${candidate.member.name} (${candidate.member.jobRole})
Topics that were in scope:
${topicList}

Respond with valid JSON only, no markdown fences:
{
  "strengths": ["specific strength 1", "specific strength 2", ...],
  "gaps": ["specific gap 1", "specific gap 2", ...],
  "topicBreakdown": [
    { "day": 3, "topic": "Retrieval-Augmented Generation (RAG)", "understanding": "strong" },
    { "day": 5, "topic": "Prompt Engineering Fundamentals", "understanding": "developing" }
  ],
  "overallSummary": "2-3 sentence professional summary"
}

Include every topic that was discussed. Use "strong", "developing", or "weak" for understanding. Be specific and constructive.`;
}

// ── Session persistence ───────────────────────────────────────────────

function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

async function loadSession(supabase: ReturnType<typeof getSupabaseClient>, sessionId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("interview_sessions")
    .select("messages, question_count, is_complete")
    .eq("id", sessionId)
    .maybeSingle();
  return data;
}

async function saveSession(
  supabase: ReturnType<typeof getSupabaseClient>,
  sessionId: string,
  candidateId: string,
  candidateName: string,
  messages: HistoryMessage[],
  questionCount: number,
  isComplete: boolean
) {
  if (!supabase) return;
  await supabase.from("interview_sessions").upsert({
    id: sessionId,
    candidate_id: candidateId,
    candidate_name: candidateName,
    messages,
    question_count: questionCount,
    is_complete: isComplete,
    updated_at: new Date().toISOString(),
  });
}

// ── Main handler ─────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as TurnRequestBody;
    const { sessionId, candidateId, userMessage, history } = body;

    if (!sessionId || !candidateId) {
      return new Response(
        JSON.stringify({ error: "Missing sessionId or candidateId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidate = CANDIDATES.find((c) => c.member.id === candidateId);
    if (!candidate) {
      return new Response(
        JSON.stringify({ error: "Candidate not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getSupabaseClient();
    const session = await loadSession(supabase, sessionId);

    // Use persisted session data if available, otherwise use provided history
    const effectiveHistory: HistoryMessage[] = session?.messages ?? history ?? [];
    const serverQuestionCount: number = session?.question_count ?? 0;

    // Completion guard: if session already marked complete, return early
    if (session?.is_complete) {
      return new Response(
        JSON.stringify({
          agentMessage: "This interview has already concluded. Start a new session to interview again.",
          isComplete: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildInterviewSystemPrompt(candidate, serverQuestionCount);
    const rawResponse = await callGemini(systemPrompt, effectiveHistory, userMessage, false);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      return new Response(
        JSON.stringify({
          agentMessage: rawResponse.slice(0, 500),
          isComplete: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agentMessage = String(parsed.agentMessage ?? "");
    const isComplete = Boolean(parsed.isComplete);
    const newQuestionCount = typeof parsed.questionCount === "number"
      ? parsed.questionCount
      : serverQuestionCount + 1;

    // Build updated history for persistence
    const updatedHistory: HistoryMessage[] = [
      ...effectiveHistory,
      { role: "candidate", text: userMessage },
      { role: "agent", text: agentMessage },
    ];

    await saveSession(
      supabase,
      sessionId,
      candidateId,
      candidate.member.name,
      updatedHistory,
      newQuestionCount,
      isComplete
    );

    if (isComplete) {
      try {
        const feedbackPrompt = buildFeedbackSystemPrompt(candidate);
        const feedbackRaw = await callGemini(
          feedbackPrompt,
          updatedHistory,
          "Please compile the final structured feedback now.",
          true
        );
        const feedback = JSON.parse(feedbackRaw);

        return new Response(
          JSON.stringify({
            agentMessage,
            isComplete: true,
            feedback,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({
            agentMessage,
            isComplete: true,
            feedback: {
              strengths: ["Unable to generate detailed feedback at this time."],
              gaps: [],
              topicBreakdown: [],
              overallSummary: "The interview concluded, but feedback generation encountered an error.",
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        agentMessage,
        isComplete: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
