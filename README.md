# Tail Spend Manager - AI-Powered Procurement Analytics

An advanced, AI-driven dashboard for analyzing and optimizing Tail Spend, Savings Leakage, and Demand Forecasting.

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine.

### 1. Prerequisites
Ensure you have the following installed:
*   **Node.js** (v18 or higher): [Download here](https://nodejs.org/)
*   **Python** (v3.9 or higher): [Download here](https://www.python.org/)
*   **Groq API Key**: [Get it here](https://console.groq.com/)

---

### 2. Frontend Setup (React + Vite)
1.  Open a terminal in the root directory.
2.  Install Javascript dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:5173`.

---

### 3. Backend Setup (Python + FastAPI)
1.  Navigate to the `backend` folder:
    ```bash
    cd backend
    ```
2.  Create a virtual environment (optional but recommended):
    ```bash
    python -m venv venv
    venv\Scripts\activate
    ```
3.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Configure Environment Variables**:
    *   Create a file named `.env` in the `backend/` folder.
    *   Add your Groq API Key:
        ```text
        GROQ_API_KEY=your_key_here
        ```
5.  **Google Sheets Integration**:
    *   Ensure your `credentials.json` for the Google Sheets API is placed in the `backend/` folder.
    *   The `SHEET_ID` is pre-configured in `config.py`.

6.  Start the backend server:
    ```bash
    python main.py
    ```
    The backend will be available at `http://localhost:8000`.

---

## 🛠 Project Structure
*   `backend/config.py`: The control center for all business logic, thresholds, and AI weights.
*   `backend/agent.py`: Contains the AI Reasoning Agents (Intake, Optimization, Dashboard).
*   `backend/data_processor.py`: The core DataEngine that processes Google Sheets data into analytics.
*   `src/components/AdminTabs/`: React components for each dashboard tab (Savings, Demand, Consolidation).

## 💡 Key Features
*   **Savings Leakage**: Identifies Maverick spend and root causes.
*   **Demand Forecast**: AI-driven supply planning and supplier recommendations.
*   **Consolidation**: Strategic vendor reduction to maximize volume leverage.
*   **Dynamic AI Agent**: Real-time contextual advice powered by Groq Llama 3.1 8B.

## ⚙️ Customization
You can tune the system's "intelligence" by editing `backend/config.py`. You can change:
*   Savings factors (e.g., 12% consolidation saving).
*   AI weights for supplier scoring (Price vs. Risk vs. Lead Time).
*   Alert thresholds for spend leakage.

---
*Created with ❤️ for Advanced Procurement Teams.*
