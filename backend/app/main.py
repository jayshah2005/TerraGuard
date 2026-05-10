from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")

app = FastAPI(
    title="GrowSpot API",
    description="Backend for the GrowSpot Crop Failure Early Warning System",
    version="1.0.0",
)

# CORS configuration
origins = [
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "GrowSpot API is running. Access /docs for Swagger UI."}
