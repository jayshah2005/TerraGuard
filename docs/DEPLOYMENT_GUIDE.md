# Deployment Guide

GrowSpot is designed to be easily deployed to IBM Cloud or any standard VPS/Container service.

## Local Deployment (Docker)

The easiest way to run the entire stack locally is using Docker Compose (Recommended for the hackathon presentation if internet is spotty).

1.  Ensure Docker and Docker Compose are installed.
2.  Create your `.env` file in the root directory.
3.  Run:
    ```bash
    docker-compose up --build
    ```
4.  The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:8000`.

## IBM Cloud Deployment (Code Engine)

For a production-like URL, deploy to IBM Cloud Code Engine (serverless container platform).

### Prerequisites
*   IBM Cloud CLI installed (`ibmcloud`).
*   Docker installed.
*   An active IBM Cloud account.

### Steps
1.  **Login to IBM Cloud**:
    ```bash
    ibmcloud login
    ibmcloud target -g Default
    ```

2.  **Containerize the Backend**:
    ```bash
    cd backend
    docker build -t us.icr.io/my_namespace/growspot-api:latest .
    docker push us.icr.io/my_namespace/growspot-api:latest
    ```

3.  **Deploy Backend to Code Engine**:
    ```bash
    ibmcloud ce app create --name growspot-api --image us.icr.io/my_namespace/growspot-api:latest --env-from-secret growspot-secrets
    ```

4.  **Deploy Frontend (Vercel or Code Engine)**:
    *   *Hackathon tip: Next.js is easiest to deploy on Vercel.*
    *   Connect your GitHub repo to Vercel.
    *   Set the `NEXT_PUBLIC_API_URL` environment variable to the IBM Code Engine URL generated in Step 3.
    *   Deploy.
