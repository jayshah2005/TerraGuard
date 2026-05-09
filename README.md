# TerraGuard: Crop Failure Early Warning System

![TerraGuard](https://img.shields.io/badge/TerraGuard-AI_for_Climate-blue) ![IBM watsonx](https://img.shields.io/badge/Powered_by-IBM_watsonx-blue) ![UN SDG 2 & 13](https://img.shields.io/badge/UN_SDG-2_%26_13-green)

TerraGuard is an AI-powered Crop Failure Early Warning System designed for small farms in developing nations. Built for the **IBM x UNSA Hackathon**, it leverages environmental data, machine learning, and IBM watsonx.ai to predict agricultural vulnerability and generate actionable insights.

## 🌍 The Problem
Smallholder farmers in developing nations are disproportionately vulnerable to climate change. Unpredictable rainfall and rising temperatures lead to devastating crop failures. Existing systems are often too expensive, too complex, or lack hyper-local insights.

## 💡 The Solution
TerraGuard democratizes environmental intelligence. By analyzing satellite imagery, weather data, and temperature trends, it provides an intuitive, map-first dashboard that warns users of impending drought stress and crop failure risks.

## ⚙️ Architecture Overview
*   **Frontend**: Next.js, Tailwind CSS, Mapbox GL JS
*   **Backend**: FastAPI (Python)
*   **Data Sources**: Open-Meteo API (Weather), Simulated GeoTIFFs (NDVI for demo stability)
*   **AI/ML**: Lightweight Scikit-Learn classifiers for risk assessment, **IBM watsonx.ai (Granite)** for generative insights.

For a deep dive, see [SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md).

## 🚀 Quick Start
### Prerequisites
*   Node.js (v18+)
*   Python 3.10+
*   Mapbox API Key (Free tier)
*   IBM watsonx.ai API Key

### Setup
1.  **Clone the repository**:
    ```bash
    git clone <repo-url>
    cd TerraGuard
    ```

2.  **Environment Variables**:
    Create a `.env` file in the root directory (see `.env.example`).
    ```env
    MAPBOX_ACCESS_TOKEN=your_mapbox_token
    IBM_CLOUD_API_KEY=your_ibm_api_key
    WATSONX_PROJECT_ID=your_watsonx_project_id
    ```

3.  **Backend (FastAPI)**:
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    uvicorn app.main:app --reload
    ```

4.  **Frontend (Next.js)**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

5.  **Open your browser**:
    Navigate to `http://localhost:3000`.

## 📖 Documentation Directory
*   [System Architecture](docs/SYSTEM_ARCHITECTURE.md)
*   [AI Pipeline](docs/AI_PIPELINE.md)
*   [API Documentation](docs/API_DOCUMENTATION.md)
*   [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
*   [Devpost Submission](docs/DEVPOST_SUBMISSION.md)
*   [Demo Script](docs/DEMO_SCRIPT.md)
*   [Future Roadmap](docs/FUTURE_ROADMAP.md)

## 🎯 Alignment with UN SDGs
*   **Goal 2: Zero Hunger**: By predicting crop failure, TerraGuard helps secure food supply chains and aids agricultural resilience.
*   **Goal 13: Climate Action**: Provides critical data to mitigate the effects of climate-induced drought.

## 🤝 IBM Integration
TerraGuard relies on **IBM watsonx.ai** and its foundational Granite models to translate complex, multi-dimensional environmental data arrays into plain-language, actionable insights that any farmer or local official can understand.
