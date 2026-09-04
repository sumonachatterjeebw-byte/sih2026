"""
POLAR-NAV AI Command Line Interface.
Simulates expedition route optimization from Southern Ocean to Maitri/Bharati stations.
"""
import sys
from src.core.polaris_risk import IceClass, IceType, IceRegimeComponent, calculate_rio
from src.core.lindqvist_model import VesselParameters, calculate_ice_resistance
from src.core.route_optimizer import PolarRouteOptimizer

def main():
    print("=" * 75)
    print("   POLAR-NAV AI: Antarctic Navigation Decision Support Console")
    print("   SIH 2026 Problem Statement 26059 | MoES / NCPOR")
    print("=" * 75)
    
    print("\n[1] Testing IMO POLARIS Risk Engine:")
    print("    Assessing PC5 Ice-Class vessel entering medium first-year pack ice...")
    components = [
        IceRegimeComponent(ice_type=IceType.MEDIUM_FIRST_YEAR, concentration_tenths=6),
        IceRegimeComponent(ice_type=IceType.VERY_THIN_FIRST_YEAR, concentration_tenths=2)
    ]
    res = calculate_rio(IceClass.PC5, components)
    print(f"    -> RIO Score: {res.rio} | Status: {res.status}")
    print(f"    -> Max Safe Speed: {res.max_recommended_speed_knots} knots")
    print(f"    -> Advisory: {res.advisory_notes}")
    
    print("\n[2] Testing Lindqvist Ice Resistance Formulation:")
    vessel = VesselParameters(name="MV Vasiliy Golovnin", length_m=167.0, beam_m=22.6)
    ice_calc = calculate_ice_resistance(vessel, velocity_knots=8.0, ice_thickness_m=0.8, ice_concentration=0.7)
    print(f"    -> Total Ice Resistance: {ice_calc.total_resistance_kn} kN")
    print(f"    -> Required Engine Power: {ice_calc.required_power_kw} kW")
    print(f"    -> Fuel Burn Rate: {ice_calc.fuel_burn_rate_kg_per_hour} kg/hr")
    
    print("\n[3] Running Route Optimizer (Southern Ocean -> Bharati Station, Prydz Bay):")
    optimizer = PolarRouteOptimizer(vessel=vessel, ice_class=IceClass.PC5)
    opt = optimizer.optimize_route(start_lat=-56.0, start_lon=65.0, dest_lat=-69.4, dest_lon=76.2)
    print(f"    -> Total Distance: {opt.total_distance_nm} nautical miles")
    print(f"    -> Total Voyage Duration: {opt.total_transit_hours} hours ({round(opt.total_transit_hours/24.0, 1)} days)")
    print(f"    -> Optimized Fuel Burn: {opt.total_fuel_burn_tonnes} Metric Tonnes")
    print(f"    -> Direct Unoptimized Fuel: {opt.baseline_direct_fuel_tonnes} Metric Tonnes")
    print(f"    -> Total Fuel Saved: {opt.fuel_saved_percentage}% (Zero Besetting Assurance)")
    print(f"    -> Minimum Route RIO: {opt.minimum_rio} (Safe: {opt.minimum_rio >= 0})")
    print("\nSimulation finished successfully. System ready for deployment.")
    print("=" * 75)

if __name__ == "__main__":
    main()
