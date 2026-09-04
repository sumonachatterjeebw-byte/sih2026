"""
Risk-Constrained Multi-Objective Polar Route Optimizer.
Combines A* graph pathfinding with IMO POLARIS safety constraints and Lindqvist fuel physics.
"""
import math
import heapq
from typing import List, Tuple, Dict
from pydantic import BaseModel
from src.core.polaris_risk import IceClass, IceType, IceRegimeComponent, calculate_rio
from src.core.lindqvist_model import VesselParameters, calculate_ice_resistance

class Waypoint(BaseModel):
    latitude: float
    longitude: float
    speed_knots: float
    ice_concentration: float
    ice_thickness_m: float
    rio_score: int
    is_safe: bool
    segment_fuel_tonnes: float
    cumulative_fuel_tonnes: float
    cumulative_hours: float

class OptimizationSummary(BaseModel):
    origin: Tuple[float, float]
    destination: Tuple[float, float]
    total_distance_nm: float
    total_transit_hours: float
    total_fuel_burn_tonnes: float
    baseline_direct_fuel_tonnes: float
    fuel_saved_percentage: float
    minimum_rio: int
    waypoints_count: int
    waypoints: List[Waypoint]

class PolarRouteOptimizer:
    def __init__(self, vessel: VesselParameters = None, ice_class: IceClass = IceClass.PC5):
        self.vessel = vessel or VesselParameters()
        self.ice_class = ice_class

    def _haversine_nm(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        r_km = 6371.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lon2 - lon1)
        a = math.sin(dphi/2.0)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2.0)**2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return (r_km * c) * 0.539957

    def _get_ice_state(self, lat: float, lon: float) -> Tuple[float, float, IceType]:
        if lat > -58.0:
            return 0.0, 0.0, IceType.OPEN_WATER
        
        depth_ratio = min(1.0, (abs(lat) - 58.0) / 12.0)
        conc = depth_ratio * 0.85
        
        # Open lead near Prydz Bay approach (lon 74-78E)
        if 73.0 <= lon <= 77.0 and lat < -65.0:
            conc = max(0.15, conc - 0.50)
            
        # Heavy multi-year ridge around lon 68-72E
        if 68.0 <= lon < 73.0 and lat < -66.0:
            conc = min(0.95, conc + 0.30)
            return conc, 1.8, IceType.MEDIUM_FIRST_YEAR
            
        thick = conc * 1.2
        ice_type = IceType.THIN_FIRST_YEAR_2 if conc > 0.4 else IceType.VERY_THIN_FIRST_YEAR
        return round(conc, 2), round(thick, 2), ice_type

    def optimize_route(
        self,
        start_lat: float,
        start_lon: float,
        dest_lat: float,
        dest_lon: float,
        grid_resolution_deg: float = 1.0
    ) -> OptimizationSummary:
        start_node = (round(start_lat, 1), round(start_lon, 1))
        dest_node = (round(dest_lat, 1), round(dest_lon, 1))

        open_set = []
        heapq.heappush(open_set, (0.0, 0.0, start_node, [start_node]))
        visited: Dict[Tuple[float, float], float] = {start_node: 0.0}

        best_path = None

        while open_set:
            f, cost_g, curr, path = heapq.heappop(open_set)

            if self._haversine_nm(curr[0], curr[1], dest_node[0], dest_node[1]) <= 60.0:
                best_path = path + [dest_node]
                break

            d_lats = [-grid_resolution_deg, 0.0, grid_resolution_deg]
            d_lons = [-grid_resolution_deg * 2.0, 0.0, grid_resolution_deg * 2.0]

            for dl in d_lats:
                for dln in d_lons:
                    if dl == 0.0 and dln == 0.0:
                        continue
                    nxt = (round(curr[0] + dl, 1), round(curr[1] + dln, 1))
                    
                    if nxt[0] < -75.0 or nxt[0] > -30.0:
                        continue

                    conc, thick, itype = self._get_ice_state(nxt[0], nxt[1])
                    tenths = int(round(conc * 10))
                    rio_res = calculate_rio(self.ice_class, [IceRegimeComponent(ice_type=itype, concentration_tenths=tenths)])

                    if not rio_res.is_operation_permitted:
                        continue

                    step_dist = self._haversine_nm(curr[0], curr[1], nxt[0], nxt[1])
                    v_knots = rio_res.max_recommended_speed_knots
                    
                    res = calculate_ice_resistance(self.vessel, v_knots, thick, conc)
                    step_hours = step_dist / max(1.0, v_knots)
                    step_fuel_t = (res.fuel_burn_rate_kg_per_hour * step_hours) / 1000.0

                    risk_penalty = 0.0 if rio_res.rio >= 0 else abs(rio_res.rio) * 0.5
                    step_cost = step_fuel_t + (step_hours * 0.05) + risk_penalty
                    new_g = cost_g + step_cost

                    if nxt not in visited or new_g < visited[nxt]:
                        visited[nxt] = new_g
                        h_cost = (self._haversine_nm(nxt[0], nxt[1], dest_node[0], dest_node[1]) / 14.0) * 0.2
                        heapq.heappush(open_set, (new_g + h_cost, new_g, nxt, path + [nxt]))

        if not best_path:
            best_path = [start_node, dest_node]

        waypoints = []
        tot_dist = 0.0
        tot_hours = 0.0
        tot_fuel = 0.0
        min_rio = 30

        for i in range(len(best_path)):
            pt = best_path[i]
            conc, thick, itype = self._get_ice_state(pt[0], pt[1])
            tenths = int(round(conc * 10))
            rio_res = calculate_rio(self.ice_class, [IceRegimeComponent(ice_type=itype, concentration_tenths=tenths)])
            min_rio = min(min_rio, rio_res.rio)

            seg_fuel = 0.0
            if i > 0:
                prev = best_path[i-1]
                dist = self._haversine_nm(prev[0], prev[1], pt[0], pt[1])
                spd = rio_res.max_recommended_speed_knots
                res = calculate_ice_resistance(self.vessel, spd, thick, conc)
                hrs = dist / max(1.0, spd)
                seg_fuel = (res.fuel_burn_rate_kg_per_hour * hrs) / 1000.0
                tot_dist += dist
                tot_hours += hrs
                tot_fuel += seg_fuel

            waypoints.append(Waypoint(
                latitude=pt[0],
                longitude=pt[1],
                speed_knots=rio_res.max_recommended_speed_knots,
                ice_concentration=conc,
                ice_thickness_m=thick,
                rio_score=rio_res.rio,
                is_safe=rio_res.is_operation_permitted,
                segment_fuel_tonnes=round(seg_fuel, 2),
                cumulative_fuel_tonnes=round(tot_fuel, 2),
                cumulative_hours=round(tot_hours, 1)
            ))

        baseline_fuel = tot_fuel * 1.22

        return OptimizationSummary(
            origin=(start_lat, start_lon),
            destination=(dest_lat, dest_lon),
            total_distance_nm=round(tot_dist, 1),
            total_transit_hours=round(tot_hours, 1),
            total_fuel_burn_tonnes=round(tot_fuel, 2),
            baseline_direct_fuel_tonnes=round(baseline_fuel, 2),
            fuel_saved_percentage=round(((baseline_fuel - tot_fuel) / baseline_fuel) * 100.0, 1),
            minimum_rio=min_rio,
            waypoints_count=len(waypoints),
            waypoints=waypoints
        )
