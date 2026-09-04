"""
POLAR-NAV AI: FastAPI REST Service.
Provides navigation decision support, POLARIS risk indexing, Lindqvist resistance,
and iceberg drift predictions for shipboard consoles and NCPOR HQ dashboards.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from src.core.polaris_risk import (
    IceClass, IceType, IceRegimeComponent, calculate_rio, POLARISAssessmentResult
)
from src.core.lindqvist_model import (
    VesselParameters, calculate_ice_resistance, ResistanceResult
)
from src.core.iceberg_tracker import (
    IcebergProfile, predict_iceberg_drift, IcebergForecastResult
)
from src.core.route_optimizer import (
    PolarRouteOptimizer, OptimizationSummary
)
from src.data.mock_polar_data import (
    get_antarctic_stations, get_known_active_icebergs, generate_polar_grid_geojson
)

app = FastAPI(
    title="POLAR-NAV AI: Antarctic Decision Support System",
    description="MoES / NCPOR SIH 2026 Problem Statement 26059 Navigation Decision Engine.",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "system": "POLAR-NAV AI Decision Support System",
        "problem_statement_id": "26059",
        "organization": "Ministry of Earth Sciences (MoES) / NCPOR",
        "status": "OPERATIONAL",
        "version": "0.1.0",
        "docs_url": "/docs"
    }

class POLARISRequest(BaseModel):
    ice_class: IceClass = IceClass.PC5
    components: List[IceRegimeComponent]

@app.post("/api/v1/risk/polaris", response_model=POLARISAssessmentResult)
def assess_polaris_risk(req: POLARISRequest):
    try:
        return calculate_rio(req.ice_class, req.components)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class ResistanceRequest(BaseModel):
    vessel: Optional[VesselParameters] = None
    velocity_knots: float = 10.0
    ice_thickness_m: float = 0.8
    ice_concentration: float = 0.7

@app.post("/api/v1/resistance/calculate", response_model=ResistanceResult)
def calculate_resistance(req: ResistanceRequest):
    vessel = req.vessel or VesselParameters()
    return calculate_ice_resistance(
        vessel=vessel,
        velocity_knots=req.velocity_knots,
        ice_thickness_m=req.ice_thickness_m,
        ice_concentration=req.ice_concentration
    )

class IcebergDriftRequest(BaseModel):
    iceberg: IcebergProfile
    wind_speed_ms: float = 15.0
    wind_direction_from_deg: float = 90.0
    current_speed_ms: float = 0.4
    current_direction_to_deg: float = 270.0
    forecast_hours: int = 72

@app.post("/api/v1/icebergs/predict-drift", response_model=IcebergForecastResult)
def predict_iceberg(req: IcebergDriftRequest):
    return predict_iceberg_drift(
        berg=req.iceberg,
        wind_speed_ms=req.wind_speed_ms,
        wind_direction_from_deg=req.wind_direction_from_deg,
        current_speed_ms=req.current_speed_ms,
        current_direction_to_deg=req.current_direction_to_deg,
        forecast_hours=req.forecast_hours
    )

class RouteRequest(BaseModel):
    start_lat: float = -55.0
    start_lon: float = 20.0
    dest_lat: float = -69.41
    dest_lon: float = 76.19
    ice_class: IceClass = IceClass.PC5

@app.post("/api/v1/route/optimize", response_model=OptimizationSummary)
def optimize_route(req: RouteRequest):
    optimizer = PolarRouteOptimizer(ice_class=req.ice_class)
    return optimizer.optimize_route(
        start_lat=req.start_lat,
        start_lon=req.start_lon,
        dest_lat=req.dest_lat,
        dest_lon=req.dest_lon
    )

@app.get("/api/v1/visualize/antarctica-grid")
def get_polar_grid():
    return generate_polar_grid_geojson()
