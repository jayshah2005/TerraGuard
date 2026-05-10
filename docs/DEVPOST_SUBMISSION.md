# Devpost Submission

*This is the template to copy/paste into your Devpost submission.*

## Inspiration
Smallholder farmers produce 30% of the world's food, yet they are the most vulnerable to climate change. We saw firsthand how an unexpected dry spell could wipe out a family's income for the year. We realized that while satellite data and AI exist, they are locked behind enterprise paywalls or academic interfaces. We built GrowSpot to democratize climate resilience.

## What it does
GrowSpot is an AI-powered Crop Failure Early Warning System. A user simply clicks on a farming region on our interactive map. Instantly, our system:
1. Ingests 30 days of historical weather data (Open-Meteo) and geospatial vegetation indices (NDVI).
2. Processes this through our custom Machine Learning Risk Engine to generate a "Crop Stress Probability" score.
3. Feeds this data into **IBM watsonx.ai (Granite)** to generate a plain-text, actionable insight—explaining *why* the risk is high and *what* to do about it.

## How we built it
We optimized for speed, scalability, and UX.
*   **Frontend**: Next.js, Tailwind CSS, and Mapbox GL JS for a premium, snappy 3D map experience.
*   **Backend**: A decoupled Python FastAPI microservice architecture.
*   **AI/ML**: We utilized Scikit-Learn for fast, deterministic tabular risk scoring, and **IBM watsonx.ai** for the generative NLP layer. We also designed the architecture to support the **IBM/NASA Prithvi** foundation model for future high-resolution segmentation.
*   **Data**: Open-Meteo API for live weather, and cached high-resolution GeoTIFFs to ensure a flawless demo presentation.

## Challenges we ran into
Handling raw geospatial data is incredibly complex. Aligning temporal weather data (daily) with satellite flyovers (every 5-10 days) required building a custom aggregation pipeline. Furthermore, ensuring the application ran blazingly fast required caching strategies so the map UI wouldn't block during inference.

## Accomplishments that we're proud of
1.  **The UI/UX**: It feels like a real, funded startup product, not a weekend hack.
2.  **The AI Pipeline**: Bridging deterministic ML risk scoring with Generative AI (watsonx.ai) creates a UX that is both mathematically sound and emotionally resonant.

## What we learned
We learned the incredible power of IBM's Granite models. Prompting the LLM with an array of raw floats `[0.34, 12, 35]` and getting back a perfectly reasoned, empathetic agricultural recommendation was a lightbulb moment for the team.

## What's next for GrowSpot
*   **SMS Integration**: Automatically sending the watsonx.ai generated warnings to farmers via SMS (Twilio).
*   **Prithvi Integration**: Moving from simulated GeoTIFFs to live Hugging Face inference using the IBM/NASA geospatial foundation model for hyper-local 30m resolution crop mapping.
*   **Market Launch**: Piloting the system with local agricultural NGOs.
