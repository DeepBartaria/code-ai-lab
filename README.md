<div align="center">
  
# 🧪 Code AI Lab: Auditable Content Pipeline
  
<p align="center">
  A transparent, multi-agent AI pipeline running entirely in the browser for generating, reviewing, and refining educational content.
</p>

![UI Preview](https://img.shields.io/badge/UI-Premium_SaaS-0B0F19?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-10B981?style=for-the-badge)

</div>

---

## ⚡ Overview

The **Code AI Lab** implements a self-healing, auditable multi-agent workflow. Unlike standard chat interfaces where an AI generates text in a black box, this architecture splits the workload into specialized agents that act as checks and balances against each other, ensuring high-quality, deterministic JSON outputs.

The entire pipeline executes directly in the client using the OpenRouter API, providing a real-time visualizer so users can trace exactly how their content was synthesized and evaluated.

---

## 🌍 Real-World Problem & Solution

### The Problem in EdTech AI
1. **Dangerous Hallucinations:** General-purpose LLMs often hallucinate facts, use vocabulary that is vastly inappropriate for a student's grade level, or generate flawed quizzes (e.g., the correct answer isn't in the options). This makes raw AI output fundamentally unsafe for direct student consumption.
2. **The "Black Box" Trust Issue:** Educators and administrators cannot trust AI because they cannot see *how* a curriculum was generated. If a mistake occurs, there is no audit trail to understand why the AI made that decision.
3. **Fragile Integrations:** Developers struggle to force LLMs to consistently output complex, highly structured data (like arrays of MCQs) without breaking the application's JSON parser.

### The Code AI Lab Solution
1. **Governed Multi-Agent System:** Instead of relying on a single prompt, the workload is divided. A `Generator` agent drafts the content, but a completely isolated `Gatekeeper` agent aggressively reviews it *specifically* for grade-level appropriateness, clarity, and conceptual accuracy before it ever reaches the student.
2. **Self-Healing Refinement Loops:** If the Gatekeeper spots a flaw (e.g., "Sentence 3 is too complex for a 5th grader"), the pipeline doesn't just fail. It automatically pipes that exact critique back to the Generator, forcing the AI to self-correct in a loop until it passes the rigorous standards.
3. **Strict Validation & Full Auditability:** Code-level schema validation (Zod) ensures structural integrity (e.g., forcing exactly 4 options). More importantly, the **Execution Trace UI** logs every single iteration, validation failure, and AI critique visually. This gives educators 100% transparency into the AI's "thought process" and ensures total accountability.

## 🛠️ Technology Stack

| Technology | Name | Description |
| :---: | :--- | :--- |
| <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" width="24" height="24" /> | **React 18** | UI Framework for the frontend visualizer |
| <img src="https://upload.wikimedia.org/wikipedia/commons/f/f1/Vitejs-logo.svg" width="24" height="24" /> | **Vite** | Lightning-fast build tool and dev server |
| <img src="https://upload.wikimedia.org/wikipedia/commons/9/99/Unofficial_JavaScript_logo_2.svg" width="24" height="24" /> | **JavaScript (ES6+)** | Core agent logic and orchestrator |
| <img src="https://img.shields.io/badge/OpenRouter-%23000000.svg?style=flat&logo=openai&logoColor=white" height="24" /> | **OpenRouter API** | Model aggregation (Default: `openrouter/free`) |
| <img src="https://zod.dev/logo.svg" width="24" height="24" /> | **Zod** | TypeScript-first schema declaration and validation |
| <img src="https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png" width="24" height="24" /> | **Vercel** | Seamless production deployment platform |

---

## 🏗️ The Auditable Pipeline Architecture

This system relies on a **Deterministic Multi-Agent Loop** to guarantee output quality:

1. 📝 **Generator Agent:** Takes the user's Grade and Topic and synthesizes draft educational content. It is strictly prompted to return a specific JSON schema (Explanations + MCQs).
2. 🛡️ **Schema Validator (Zod):** Instantly intercepts the Generator's output. If the JSON is malformed or invalid (e.g., correct answer doesn't match options), it instantly triggers a refinement loop with exact error paths.
3. ⚖️ **Gatekeeper (Reviewer) Agent:** A secondary AI model tasked solely with criticizing the Generator's draft based on age-appropriateness, conceptual correctness, and clarity. 
4. 🔄 **Refinement Loop:** If the Gatekeeper flags flaws, its feedback is piped directly back into the Generator, forcing the AI to fix its own mistakes before presenting the final result.
5. 📊 **Audit Trail:** Every single iteration, feedback string, and pass/fail state is visually logged in the UI's Execution Trace.

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository / Navigate to the directory:**
   \`\`\`bash
   cd deployment_source/src
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configure Environment Variables:**
   Create a \`.env\` file in the root of the project and add your OpenRouter API key:
   \`\`\`env
   VITE_OPENROUTER_API_KEY=your_api_key_here
   \`\`\`

4. **Start the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`
   
5. **View the app:**
   Open \`http://localhost:5173\` (or the port specified by Vite) in your browser.

## ☁️ Deployment

This project is optimized for deployment on **Vercel**. 

1. Ensure your code is pushed to a GitHub repository.
2. Import the project in your Vercel Dashboard.
3. Add the \`VITE_OPENROUTER_API_KEY\` to the Vercel Environment Variables settings.
4. Click **Deploy**.

---
<div align="center">
  <i>Built for transparency, reliability, and governed AI generation.</i>
</div>
