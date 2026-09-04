"""
IMO POLARIS (Polar Operational Limit Assessment Risk Indexing System) Module.
Reference: IMO Circular MSC.1/Circ.1519.
Calculates Risk Index Outcome (RIO) for ice classes PC1-PC7 and Category vessels.
"""
from enum import Enum
from typing import List, Dict
from pydantic import BaseModel, Field

class IceClass(str, Enum):
    PC1 = "PC1"
    PC2 = "PC2"
    PC3 = "PC3"
    PC4 = "PC4"
    PC5 = "PC5"
    PC6 = "PC6"
    PC7 = "PC7"
    ARC4 = "Arc4"
    ARC5 = "Arc5"
    ARC7 = "Arc7"
    CATEGORY_A = "Category_A"
    CATEGORY_B = "Category_B"
    CATEGORY_C = "Category_C"

class IceType(str, Enum):
    ICE_FREE = "Ice_Free"
    OPEN_WATER = "Open_Water"
    BERGY_WATER = "Bergy_Water"
    VERY_THIN_FIRST_YEAR = "Very_Thin_First_Year"          # 30-50 cm
    THIN_FIRST_YEAR_1 = "Thin_First_Year_Stage_1"           # 50-70 cm
    THIN_FIRST_YEAR_2 = "Thin_First_Year_Stage_2"           # 70-120 cm
    MEDIUM_FIRST_YEAR = "Medium_First_Year"                 # 120-200 cm
    THICK_FIRST_YEAR = "Thick_First_Year"                   # >200 cm
    SECOND_YEAR = "Second_Year"
    MULTI_YEAR = "Multi_Year"

RISK_VALUE_MATRIX: Dict[IceClass, Dict[IceType, int]] = {
    IceClass.PC1: {
        IceType.ICE_FREE: 3, IceType.OPEN_WATER: 3, IceType.BERGY_WATER: 3,
        IceType.VERY_THIN_FIRST_YEAR: 3, IceType.THIN_FIRST_YEAR_1: 3, IceType.THIN_FIRST_YEAR_2: 3,
        IceType.MEDIUM_FIRST_YEAR: 3, IceType.THICK_FIRST_YEAR: 3, IceType.SECOND_YEAR: 3, IceType.MULTI_YEAR: 3
    },
    IceClass.PC2: {
        IceType.ICE_FREE: 3, IceType.OPEN_WATER: 3, IceType.BERGY_WATER: 3,
        IceType.VERY_THIN_FIRST_YEAR: 3, IceType.THIN_FIRST_YEAR_1: 3, IceType.THIN_FIRST_YEAR_2: 3,
        IceType.MEDIUM_FIRST_YEAR: 3, IceType.THICK_FIRST_YEAR: 3, IceType.SECOND_YEAR: 2, IceType.MULTI_YEAR: 1
    },
    IceClass.PC3: {
        IceType.ICE_FREE: 3, IceType.OPEN_WATER: 3, IceType.BERGY_WATER: 3,
        IceType.VERY_THIN_FIRST_YEAR: 3, IceType.THIN_FIRST_YEAR_1: 3, IceType.THIN_FIRST_YEAR_2: 3,
        IceType.MEDIUM_FIRST_YEAR: 3, IceType.THICK_FIRST_YEAR: 2, IceType.SECOND_YEAR: 1, IceType.MULTI_YEAR: -1
    },
    IceClass.PC4: {
        IceType.ICE_FREE: 3, IceType.OPEN_WATER: 3, IceType.BERGY_WATER: 3,
        IceType.VERY_THIN_FIRST_YEAR: 3, IceType.THIN_FIRST_YEAR_1: 3, IceType.THIN_FIRST_YEAR_2: 2,
        IceType.MEDIUM_FIRST_YEAR: 2, IceType.THICK_FIRST_YEAR: 1, IceType.SECOND_YEAR: -1, IceType.MULTI_YEAR: -2
    },
    IceClass.PC5: {
        IceType.ICE_FREE: 3, IceType.OPEN_WATER: 3, IceType.BERGY_WATER: 3,
        IceType.VERY_THIN_FIRST_YEAR: 3, IceType.THIN_FIRST_YEAR_1: 2, IceType.THIN_FIRST_YEAR_2: 1,
        IceType.MEDIUM_FIRST_YEAR: 1, IceType.THICK_FIRST_YEAR: -1, IceType.SECOND_YEAR: -2, IceType.MULTI_YEAR: -3
    },
    IceClass.PC6: {
        IceType.ICE_FREE: 3, IceType.OPEN_WATER: 3, IceType.BERGY_WATER: 3,
        IceType.VERY_THIN_FIRST_YEAR: 2, IceType.THIN_FIRST_YEAR_1: 1, IceType.THIN_FIRST_YEAR_2: 0,
        IceType.MEDIUM_FIRST_YEAR: -1, IceType.THICK_FIRST_YEAR: -2, IceType.SECOND_YEAR: -3, IceType.MULTI_YEAR: -4
    },
    IceClass.PC7: {
        IceType.ICE_FREE: 3, IceType.OPEN_WATER: 3, IceType.BERGY_WATER: 3,
        IceType.VERY_THIN_FIRST_YEAR: 1, IceType.THIN_FIRST_YEAR_1: 0, IceType.THIN_FIRST_YEAR_2: -1,
        IceType.MEDIUM_FIRST_YEAR: -2, IceType.THICK_FIRST_YEAR: -3, IceType.SECOND_YEAR: -4, IceType.MULTI_YEAR: -5
    },
    IceClass.ARC7: {
        IceType.ICE_FREE: 3, IceType.OPEN_WATER: 3, IceType.BERGY_WATER: 3,
        IceType.VERY_THIN_FIRST_YEAR: 3, IceType.THIN_FIRST_YEAR_1: 3, IceType.THIN_FIRST_YEAR_2: 2,
        IceType.MEDIUM_FIRST_YEAR: 2, IceType.THICK_FIRST_YEAR: 1, IceType.SECOND_YEAR: 0, IceType.MULTI_YEAR: -2
    },
    IceClass.CATEGORY_C: {
        IceType.ICE_FREE: 3, IceType.OPEN_WATER: 2, IceType.BERGY_WATER: 1,
        IceType.VERY_THIN_FIRST_YEAR: -2, IceType.THIN_FIRST_YEAR_1: -3, IceType.THIN_FIRST_YEAR_2: -4,
        IceType.MEDIUM_FIRST_YEAR: -5, IceType.THICK_FIRST_YEAR: -6, IceType.SECOND_YEAR: -7, IceType.MULTI_YEAR: -8
    }
}

class IceRegimeComponent(BaseModel):
    ice_type: IceType
    concentration_tenths: int = Field(ge=0, le=10, description="Concentration in tenths (0 to 10)")

class POLARISAssessmentResult(BaseModel):
    vessel_ice_class: IceClass
    total_concentration_tenths: int
    rio: int
    status: str
    is_operation_permitted: bool
    is_speed_restricted: bool
    max_recommended_speed_knots: float
    advisory_notes: str

def calculate_rio(ice_class: IceClass, components: List[IceRegimeComponent]) -> POLARISAssessmentResult:
    """Calculates Risk Index Outcome (RIO) per IMO POLARIS standard."""
    rv_map = RISK_VALUE_MATRIX.get(ice_class, RISK_VALUE_MATRIX[IceClass.PC5])
    
    total_conc = sum(c.concentration_tenths for c in components)
    if total_conc > 10:
        raise ValueError(f"Total ice concentration cannot exceed 10 tenths. Provided: {total_conc}")
    
    rem_tenths = 10 - total_conc
    rio = 0
    for c in components:
        rv = rv_map.get(c.ice_type, -3)
        rio += c.concentration_tenths * rv
    
    if rem_tenths > 0:
        rv_open = rv_map.get(IceType.OPEN_WATER, 3)
        rio += rem_tenths * rv_open
        total_conc = 10
        
    if rio >= 0:
        status = "NORMAL_OPERATION"
        is_permitted = True
        is_speed_restricted = False
        max_speed = 14.0
        advisory = "Safe for normal operations. Proceed with standard polar watchkeeping."
    elif -10 <= rio < 0:
        status = "ELEVATED_OPERATIONAL_RISK"
        is_permitted = True
        is_speed_restricted = True
        max_speed = 6.0
        advisory = "Elevated risk. Reduce vessel speed, avoid compressive leads, verify ice navigator standby."
    else:
        status = "OPERATION_PROHIBITED"
        is_permitted = False
        is_speed_restricted = True
        max_speed = 0.0
        advisory = "CRITICAL DANGER: Severe risk of structural damage or besetting. Entry prohibited."
        
    return POLARISAssessmentResult(
        vessel_ice_class=ice_class,
        total_concentration_tenths=total_conc,
        rio=rio,
        status=status,
        is_operation_permitted=is_permitted,
        is_speed_restricted=is_speed_restricted,
        max_recommended_speed_knots=max_speed,
        advisory_notes=advisory
    )
