# AI & ML Pipeline

TerraGuard uses a hybrid AI approach, combining a lightweight deterministic/statistical machine learning model for risk scoring with IBM watsonx.ai for generative, human-readable insights.

This pipeline is specifically designed to be hackathon-feasible while remaining technically credible.

## 1. Feature Ingestion & Preprocessing
The model expects a tabular array of features representing the environmental health of a specific geographic region over a 30-day window.

**Inputs:**
*   `ndvi_current`: Current Normalized Difference Vegetation Index (0.0 to 1.0).
*   `ndvi_historical`: 30-day historical average NDVI.
*   `rainfall_30d_mm`: Cumulative rainfall over the last 30 days.
*   `temp_avg_c`: Average temperature over the last 30 days.
*   `soil_moisture`: Average soil moisture index.

**Preprocessing Pipeline:**
*   **Imputation**: Missing values are filled using historical median values.
*   **Normalization**: Continuous variables like temperature and rainfall are scaled using a `StandardScaler`.
*   **Feature Engineering**: 
    *   `ndvi_delta` = `ndvi_current` - `ndvi_historical` (A negative delta strongly correlates with crop stress).

## 2. Risk Prediction Model (Scikit-Learn)
Because deep learning models require vast amounts of labeled agricultural data (which is difficult to source perfectly for a 2-day hackathon), we utilize a **Random Forest Classifier** or **Logistic Regression**.

*   **Training**: The model is pre-trained on a synthetic/historical dataset representing various drought and healthy conditions.
*   **Inference**: Given the preprocessed features, the model outputs a probability score `P(Stress)`.
*   **Output**: 
    *   `Risk Level`: "Low", "Moderate", "High", "Critical".
    *   `Confidence Score`: 0-100%.

## 3. IBM watsonx.ai Integration (Generative Layer)
Numbers and risk levels alone are not actionable enough for end-users. We leverage **IBM watsonx.ai (Granite 13B Chat)** to translate the data into a narrative.

**Prompt Architecture:**
```text
You are an expert agronomist AI. Analyze the following regional data and provide a 2-sentence actionable insight for a local farmer.
Data:
- Current NDVI: 0.35 (Historical: 0.55, Delta: -0.20)
- 30-Day Rainfall: 12mm (Extremely Low)
- Avg Temp: 34C
- Risk Level: Critical

Insight:
```

**Output:**
> "The region is experiencing a critical drop in vegetation health driven by a severe 30-day lack of rainfall and high temperatures. Immediate irrigation intervention is highly recommended to prevent total crop failure."

## 4. (Bonus/Future) IBM/NASA Prithvi Geospatial Foundation Model
To show deep IBM alignment, the architecture supports incorporating the IBM/NASA Prithvi model.

*   **How it works**: Prithvi is a temporal Vision Transformer trained on Harmonized Landsat Sentinel-2 data.
*   **Implementation Strategy**: Instead of fine-tuning the 100M+ parameter model, we would freeze the encoder and use it strictly as a feature extractor.
*   **Workflow**: 
    1. Pass a sequence of 6 GeoTIFFs (time-series) through the Prithvi encoder.
    2. Extract the embeddings.
    3. Pass the embeddings into a lightweight Multi-Layer Perceptron (MLP) classification head to predict the "Crop Stress Score."

*Note: For the live demo, this is kept as an architectural blueprint while the Scikit-Learn model handles live inference to guarantee speed and stability.*
