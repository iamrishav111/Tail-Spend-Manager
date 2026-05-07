# 🚀 Tail Spend Manager - Onboarding Guide

Welcome to the **Tail Spend Control Tower**! This project is an advanced, AI-powered dashboard designed to help procurement teams manage "Tail Spend" (high-volume, low-value purchases), find hidden savings, and automate supplier recommendations.

This guide will walk you through setting up the system from scratch, even if you have no technical background.

---

## 📋 1. Prerequisites (What you need to install)

Before running the code, you need two main tools installed on your computer:

1.  **Node.js**: This runs the dashboard interface (the visual part).
    *   [Download and Install Node.js](https://nodejs.org/en/download/) (Choose the "LTS" version).
2.  **Python**: This runs the "brain" of the system (data processing and AI).
    *   [Download and Install Python](https://www.python.org/downloads/) (Version 3.9 or higher).
    *   **Important**: During installation, make sure to check the box that says **"Add Python to PATH"**.

---

## 🔑 2. Setting Up Your API Keys

The system uses **Groq** for AI intelligence and **Google Sheets** for data. You need to tell the code where to find these.

1.  **Get a Groq API Key**:
    *   Go to [Groq Console](https://console.groq.com/).
    *   Create a free account and generate an API key.
2.  **Create your Environment File**:
    *   Inside the project folder, go into the `backend` folder.
    *   Find a file named `.env` (if it doesn't exist, create a new text file and name it exactly `.env`).
    *   Open it in a text editor (like Notepad) and paste your keys like this:
        ```text
        GROQ_API_KEY=your_actual_key_here
        SHEET_ID=1m7xHT4bjK4Hp73TJ_RQaYx18XBW5qjbswO2Td1A7Dpg
        ```
    *   *Note: The SHEET_ID provided above is the default demonstration sheet.*

---

## 🛠️ 3. Installation (One-time Setup)

You need to install the "libraries" the code uses. Follow these steps:

### Part A: Install Dashboard Components (Frontend)
1.  Open a terminal or command prompt in the **main folder** of the project.
2.  Type the following and press Enter:
    ```bash
    npm install
    ```
    *Wait for it to finish. You only need to do this once.*

### Part B: Install Logic Components (Backend)
1.  In the same terminal (or a new one), move into the backend folder:
    ```bash
    cd backend
    ```
2.  Type the following and press Enter:
    ```bash
    pip install -r requirements.txt
    ```
    *This installs all the "brain" components like AI and data tools.*

---

## 🏃 4. How to Run the System

To see the dashboard, you need to have **two terminals** running at the same time (one for the visuals, one for the brain).

### Step 1: Start the Dashboard (Visuals)
1.  Open a terminal in the project's **main folder**.
2.  Type:
    ```bash
    npm run dev
    ```
3.  The terminal will give you a link (usually `http://localhost:5173`). **Keep this terminal open!**

### Step 2: Start the Brain (Backend)
1.  Open a **second terminal** and navigate to the `backend` folder:
    ```bash
    cd backend
    ```
2.  Type:
    ```bash
    python main.py
    ```
3.  You should see "Backend ready." **Keep this terminal open too!**

---

## 📊 5. Using the Dashboard

Now, open your web browser and go to `http://localhost:5173`.

### Key Tabs to Explore:
*   **Overview**: A bird's eye view of your spend. Check out the new **Tail Spend Explorer** at the bottom to filter by Supplier or Category.
*   **Savings Leakage**: See where money is being "leaked" because people aren't using contracts. Look for the **Red Alerts**.
*   **Demand Forecast**: See what you need to buy next and where you can consolidate orders to save money.
*   **Consolidation**: Strategic advice on which suppliers to remove and which to keep.

---

## ⚙️ 6. How to Customize the Business Rules

You don't need to be a coder to change how the dashboard thinks.
1.  Open `backend/config.py` in Notepad.
2.  You can change values like:
    *   `AUTO_APPROVAL_THRESHOLD`: Change the ₹ limit for automatic approval.
    *   `CONSOLIDATION_SAVINGS_FACTOR`: Adjust the estimated % savings (e.g., 0.12 for 12%).
    *   `DASHBOARD_LOOKBACK_DAYS`: Change how many days of history the dashboard shows.

---

## ❓ Troubleshooting
*   **"Python not found"**: Ensure you checked "Add to PATH" during Python installation.
*   **"Blank Dashboard"**: Make sure the **Backend terminal** is running and says "Backend ready."
*   **"API Error"**: Double-check your `GROQ_API_KEY` in the `backend/.env` file.

---
*Developed for advanced procurement optimization.*
