# Demo Script (3-5 Minutes)

**Goal:** Emotionally connect, show technical depth, and highlight IBM integration.

## 0:00 - 0:45 | The Hook & The Problem
*(Screen: Pitch Deck Title Slide or a compelling image of a dried farm)*
**Speaker 1:** "Smallholder farmers feed 30% of the world. But right now, climate change is making their livelihoods unpredictable. An unexpected 14-day dry spell can mean a family starves. The data to predict this exists—satellites see it, weather models predict it. But a farmer in a developing nation can't read a raw GeoTIFF or a CSV file. They need answers."

## 0:45 - 1:30 | The Solution & Live Demo
*(Screen: Switch to TerraGuard Live App. The dark-mode Mapbox UI is glowing, showing a global view.)*
**Speaker 1:** "Enter TerraGuard. Our AI-powered Crop Failure Early Warning System. Let's look at a region currently experiencing anomalies."
*(Action: Click on a pre-seeded polygon on the map, e.g., a region in South America).*

*(Screen: The map zooms in smoothly. Heatmap layers load instantly. The sidebar populates with charts.)*
**Speaker 2 (Technical):** "Under the hood, our FastAPI backend just ingested 30 days of weather data from Open-Meteo and aligned it with high-resolution NDVI vegetation data."

## 1:30 - 2:30 | The AI Magic (Highlighting IBM)
*(Screen: Point to the Risk Score and the Insights Text Panel).*
**Speaker 2:** "Our custom Machine Learning pipeline processes these metrics and calculates an 85% Crop Stress Risk. But numbers aren't enough. We need to explain *why*. We pass this multidimensional array into **IBM watsonx.ai** using their Granite foundation model."
*(Action: Read the generated insight on the screen).*
**Speaker 2:** "watsonx.ai analyzed the data and generated this: *'Vegetation health is declining rapidly due to sustained 35°C temperatures and only 12mm of rain over 30 days. Immediate irrigation intervention is required.'* We turned raw data into a human warning."

## 2:30 - 3:00 | Architecture & Scale
*(Screen: Briefly flash the Architecture Diagram from docs).*
**Speaker 2:** "Our architecture is modular. We designed it to seamlessly integrate the **IBM/NASA Prithvi** geospatial foundation model in the future for even higher resolution feature extraction. We deploy on IBM Cloud containers for infinite scalability."

## 3:00 - 3:30 | The Impact (SDGs) & Close
*(Screen: Back to the App UI).*
**Speaker 1:** "TerraGuard directly targets UN SDG 2 (Zero Hunger) and SDG 13 (Climate Action). By democratizing climate intelligence, we aren't just predicting crop failure; we are giving communities the time they need to prevent it. Thank you."
