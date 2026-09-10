# Phase 7: Predictive AI Layer

This is the FastAPI microservice for Phase 7. It provides the AI capabilities for the Smart Chennai ICCC.

## Features
- **Congestion Prediction:** Uses ARIMA (with a fallback to Weighted Moving Average) to predict vehicles per hour.
- **Flood Risk:** Deterministic scoring based on Phase 5 water thresholds and rainfall.
- **Anomaly Detection:** Flags anomalies using a +2 Standard Deviation rule on historical data.

## Setup & Run

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

The server will automatically connect to the local PostgreSQL database using the `DATABASE_URL` environment variable if present.

## Endpoints
- `GET /health`
- `POST /predict/congestion`
- `POST /predict/flood-risk`
- `POST /predict/anomaly`
