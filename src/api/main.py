"""
POLAR-NAV AI REST and WebSocket service.

Serves the Antarctic navigation decision-support models to the bridge console and to any client
that speaks HTTP. Everything is computed on request from the physics core; there are no canned
responses anywhere in this service.

Run it with:

    uvicorn src.api.main:app --reload --port 8000

and open http://localhost:8000/docs for the interactive schema.
"""
from __future__ import annotations

import time
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.constants import (
    DATA_PROVENANCE,
    DEPARTMENT,
    MODEL_VERSIONS,
    ORGANIZATION,
    PROBLEM_STATEMENT_ID,
    SYSTEM_NAME,
    SYSTEM_VERSION,
)
from src.api.routers import environment as environment_router
from src.api.routers import geo as geo_router
from src.api.routers import navigation as navigation_router
from src.api.routers import physics as physics_router
from src.api.routers import voyages as voyages_router

_STARTED_AT = time.time()

app = FastAPI(
    title=f"{SYSTEM_NAME}: Antarctic Navigation Decision Support",
    description=(
        "Sea-ice forecasting, iceberg drift, IMO POLARIS risk indexing, Lindqvist ice resistance "
        "and risk-constrained route optimisation for Indian Antarctic Expedition vessels. "
        "Smart India Hackathon 2026, problem statement 26059, for MoES / NCPOR.\n\n"
        "**Honesty note.** The physics, the POLARIS tables and the coastline are real. The "
        "atmospheric, oceanographic and sea-ice fields are synthetic stand-ins for ERA5, CMEMS "
        "and OSI-SAF products; every response carrying them says so in an `is_synthetic` field."
    ),
    version=SYSTEM_VERSION,
)

# The bridge console is served from a separate origin during development, and on a ship it is a
# local device on the same LAN. Neither case benefits from origin restrictions here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(geo_router.router)
app.include_router(environment_router.router)
app.include_router(physics_router.router)
app.include_router(navigation_router.router)
app.include_router(voyages_router.router)


@app.get("/", tags=["meta"])
def read_root() -> Dict[str, Any]:
    """Service identity. The v0.1 response shape is preserved."""
    return {
        "system": f"{SYSTEM_NAME} Decision Support System",
        "problem_statement_id": PROBLEM_STATEMENT_ID,
        "organization": f"{ORGANIZATION} / NCPOR",
        "status": "OPERATIONAL",
        "version": SYSTEM_VERSION,
        "docs_url": "/docs",
        "health_url": "/api/v1/health",
    }


@app.get("/api/v1/health", tags=["meta"])
def health() -> Dict[str, Any]:
    """
    Liveness, model versions and data provenance.

    The provenance block is the important part: it states, per data layer, whether it is real or
    simulated and what it stands in for. A reviewer should be able to answer "which of these
    numbers came from the world?" without reading any code.
    """
    ml_status: Dict[str, Any]
    try:
        from src.ml.registry import ml_status as _ml_status

        ml_status = _ml_status()
    except Exception:
        # The machine-learning layer is optional. The physics path never depends on it.
        ml_status = {"available": False, "reason": "ML package not installed or no trained models found"}

    return {
        "status": "ok",
        "system": SYSTEM_NAME,
        "version": SYSTEM_VERSION,
        "problem_statement_id": PROBLEM_STATEMENT_ID,
        "organization": ORGANIZATION,
        "department": DEPARTMENT,
        "uptime_seconds": round(time.time() - _STARTED_AT, 1),
        "model_versions": MODEL_VERSIONS,
        "data_provenance": DATA_PROVENANCE,
        "machine_learning": ml_status,
        "external_network_calls": False,
        "api_keys_required": False,
    }


@app.get("/api/v1/visualize/antarctica-grid", tags=["meta"])
def antarctica_grid() -> Dict[str, Any]:
    """
    Stations and tracked icebergs as a GeoJSON FeatureCollection.

    Retained from v0.1 so existing clients keep working. New clients should prefer
    `/api/v1/geo/stations`, `/api/v1/geo/coastline` and `/api/v1/icebergs`, which carry far more.
    """
    from src.data.icebergs import get_iceberg_catalogue
    from src.data.stations import get_stations

    features = []
    for station in get_stations():
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [station["longitude"], station["latitude"]]},
                "properties": {
                    "type": "Research_Station",
                    "name": station["name"],
                    "region": station["region"],
                    "country": station["country"],
                    "anchorage": [station["anchorage_lat"], station["anchorage_lon"]],
                },
            }
        )
    for berg in get_iceberg_catalogue():
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [berg["longitude"], berg["latitude"]]},
                "properties": {
                    "type": "Tracked_Iceberg",
                    "berg_id": berg["berg_id"],
                    "length_m": berg["length_m"],
                    "origin": berg["origin"],
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}
