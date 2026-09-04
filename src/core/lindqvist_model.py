"""
Lindqvist (1989) Ice Resistance Model.
Calculates continuous ice resistance (crushing, bending, submergence)
and required engine power / fuel consumption in Antarctic pack ice.
"""
import math
from pydantic import BaseModel, Field

class VesselParameters(BaseModel):
    name: str = "MV Polar Explorer"
    length_m: float = Field(default=167.0, description="Vessel length overall in meters")
    beam_m: float = Field(default=22.6, description="Vessel waterline breadth/beam in meters")
    draft_m: float = Field(default=8.5, description="Vessel design draft in meters")
    stem_angle_deg: float = Field(default=25.0, description="Stem inclination angle in degrees")
    waterline_angle_deg: float = Field(default=30.0, description="Waterline entrance angle in degrees")
    flare_angle_deg: float = Field(default=55.0, description="Bow flare angle in degrees")
    hull_friction_coeff: float = Field(default=0.15, description="Friction coefficient between ice and hull")
    propulsion_efficiency: float = Field(default=0.65, description="Propulsive efficiency in ice")
    sfoc_g_per_kwh: float = Field(default=195.0, description="Specific fuel oil consumption in g/kWh")

class ResistanceResult(BaseModel):
    velocity_knots: float
    ice_thickness_m: float
    ice_concentration: float
    crushing_resistance_kn: float
    bending_resistance_kn: float
    submergence_resistance_kn: float
    total_resistance_kn: float
    required_power_kw: float
    fuel_burn_rate_kg_per_hour: float

def calculate_ice_resistance(
    vessel: VesselParameters,
    velocity_knots: float,
    ice_thickness_m: float,
    ice_concentration: float = 1.0,
    flexural_strength_kpa: float = 500.0,
    elastic_modulus_mpa: float = 2000.0
) -> ResistanceResult:
    """
    Computes ship propulsion resistance using Lindqvist (1989) model.
    Scales with ice concentration (exponential factor).
    """
    if ice_thickness_m <= 0.0 or ice_concentration <= 0.01:
        v_ms = velocity_knots * 0.514444
        r_open = 0.5 * 1025.0 * (vessel.beam_m * vessel.draft_m * 0.15) * (v_ms ** 2) * 0.003
        r_kn = max(10.0, r_open / 1000.0)
        power_kw = (r_kn * 1000.0 * v_ms) / vessel.propulsion_efficiency / 1000.0
        fuel_rate = (power_kw * vessel.sfoc_g_per_kwh) / 1000.0
        return ResistanceResult(
            velocity_knots=velocity_knots,
            ice_thickness_m=0.0,
            ice_concentration=0.0,
            crushing_resistance_kn=0.0,
            bending_resistance_kn=0.0,
            submergence_resistance_kn=0.0,
            total_resistance_kn=round(r_kn, 2),
            required_power_kw=round(power_kw, 2),
            fuel_burn_rate_kg_per_hour=round(fuel_rate, 2)
        )

    v_ms = max(0.1, velocity_knots * 0.514444)
    phi = math.radians(vessel.stem_angle_deg)
    alpha = math.radians(vessel.waterline_angle_deg)
    psi = math.radians(vessel.flare_angle_deg)
    mu = vessel.hull_friction_coeff
    h = ice_thickness_m
    b = vessel.beam_m
    t = vessel.draft_m
    l = vessel.length_m
    sigma_b = flexural_strength_kpa * 1000.0
    e = elastic_modulus_mpa * 1e6
    rho_w = 1025.0
    rho_i = 917.0
    g = 9.81

    # Crushing
    rc_n = 0.5 * sigma_b * (h ** 2) * ((math.tan(phi) + (mu * math.cos(phi) / math.sin(alpha))) / math.cos(alpha))

    # Bending
    rb_n = 0.003 * e * (h ** 1.5) * b * (math.tan(psi) / math.cos(phi))

    # Submergence
    delta_rho = rho_w - rho_i
    rs_n = (delta_rho * g * h * b * t * ((b + t) / (b + 2.0 * t)) * (1.0 + 2.0 * mu * (l / b)))

    r_level_n = (rc_n + rb_n + rs_n) * (1.0 + 0.4 * (v_ms / math.sqrt(g * h)))
    c_factor = ice_concentration ** 1.8
    r_total_kn = (r_level_n * c_factor) / 1000.0

    power_kw = (r_total_kn * 1000.0 * v_ms) / vessel.propulsion_efficiency / 1000.0
    fuel_rate = (power_kw * vessel.sfoc_g_per_kwh) / 1000.0

    return ResistanceResult(
        velocity_knots=velocity_knots,
        ice_thickness_m=h,
        ice_concentration=ice_concentration,
        crushing_resistance_kn=round((rc_n * c_factor) / 1000.0, 2),
        bending_resistance_kn=round((rb_n * c_factor) / 1000.0, 2),
        submergence_resistance_kn=round((rs_n * c_factor) / 1000.0, 2),
        total_resistance_kn=round(r_total_kn, 2),
        required_power_kw=round(power_kw, 2),
        fuel_burn_rate_kg_per_hour=round(fuel_rate, 2)
    )
