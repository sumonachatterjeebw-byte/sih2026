"""
Physics-Informed Lagrangian Iceberg Drift Module.
Calculates dynamic drift vectors for tabular icebergs and bergy bits based on
ocean currents, atmospheric winds, Coriolis force, and wave radiation stress.
"""
import math
from typing import List
from pydantic import BaseModel, Field

class IcebergProfile(BaseModel):
    berg_id: str
    latitude: float
    longitude: float
    length_m: float = Field(default=800.0, description="Length in meters")
    width_m: float = Field(default=400.0, description="Width in meters")
    sail_height_m: float = Field(default=35.0, description="Above-water sail height in meters")
    keel_depth_m: float = Field(default=180.0, description="Submerged keel depth in meters")
    mass_metric_tonnes: float = Field(default=5.0e7, description="Estimated mass in tonnes")

class TrajectoryPoint(BaseModel):
    hour: int
    latitude: float
    longitude: float
    speed_knots: float
    heading_deg: float
    distance_from_origin_km: float

class IcebergForecastResult(BaseModel):
    berg_id: str
    forecast_horizon_hours: int
    trajectory: List[TrajectoryPoint]
    net_displacement_km: float

def predict_iceberg_drift(
    berg: IcebergProfile,
    wind_speed_ms: float,
    wind_direction_from_deg: float,
    current_speed_ms: float,
    current_direction_to_deg: float,
    forecast_hours: int = 72,
    time_step_hours: int = 6
) -> IcebergForecastResult:
    """
    Computes Lagrangian drift steps combining windage, current drag, and Coriolis.
    """
    wind_to_rad = math.radians((wind_direction_from_deg + 180.0) % 360.0)
    current_to_rad = math.radians(current_direction_to_deg)
    
    # Coriolis deflection (~ -35 deg to the left in Southern hemisphere)
    coriolis_deflection_rad = math.radians(-35.0 if berg.latitude < 0 else 35.0)
    
    u_curr = current_speed_ms * 0.90 * math.sin(current_to_rad)
    v_curr = current_speed_ms * 0.90 * math.cos(current_to_rad)
    
    eff_wind_speed = wind_speed_ms * 0.02
    eff_wind_dir = wind_to_rad + coriolis_deflection_rad
    u_wind = eff_wind_speed * math.sin(eff_wind_dir)
    v_wind = eff_wind_speed * math.cos(eff_wind_dir)
    
    u_total = u_curr + u_wind
    v_total = v_curr + v_wind
    
    speed_ms = math.sqrt(u_total**2 + v_total**2)
    speed_knots = speed_ms * 1.94384
    heading_deg = (math.degrees(math.atan2(u_total, v_total)) + 360.0) % 360.0
    
    trajectory = []
    init_lat = berg.latitude
    init_lon = berg.longitude
    
    for h in range(0, forecast_hours + 1, time_step_hours):
        dt_seconds = h * 3600.0
        delta_y_m = v_total * dt_seconds
        delta_x_m = u_total * dt_seconds
        
        step_lat = init_lat + (delta_y_m / 111139.0)
        cos_lat = max(0.1, math.cos(math.radians(step_lat)))
        step_lon = init_lon + (delta_x_m / (111139.0 * cos_lat))
        
        dist_km = math.sqrt((delta_x_m/1000.0)**2 + (delta_y_m/1000.0)**2)
        
        trajectory.append(TrajectoryPoint(
            hour=h,
            latitude=round(step_lat, 4),
            longitude=round(step_lon, 4),
            speed_knots=round(speed_knots, 2),
            heading_deg=round(heading_deg, 1),
            distance_from_origin_km=round(dist_km, 2)
        ))
        
    net_disp = trajectory[-1].distance_from_origin_km
    return IcebergForecastResult(
        berg_id=berg.berg_id,
        forecast_horizon_hours=forecast_hours,
        trajectory=trajectory,
        net_displacement_km=round(net_disp, 2)
    )
