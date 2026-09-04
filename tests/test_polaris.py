"""Unit tests for IMO POLARIS engine."""
from src.core.polaris_risk import IceClass, IceType, IceRegimeComponent, calculate_rio

def test_open_water_rio():
    comp = [IceRegimeComponent(ice_type=IceType.OPEN_WATER, concentration_tenths=10)]
    res = calculate_rio(IceClass.PC5, comp)
    assert res.rio == 30
    assert res.status == "NORMAL_OPERATION"
    assert res.is_operation_permitted is True

def test_heavy_ice_prohibited_rio():
    comp = [IceRegimeComponent(ice_type=IceType.MULTI_YEAR, concentration_tenths=10)]
    res = calculate_rio(IceClass.PC7, comp)
    assert res.rio == -50
    assert res.status == "OPERATION_PROHIBITED"
    assert res.is_operation_permitted is False

def test_mixed_regime():
    comp = [
        IceRegimeComponent(ice_type=IceType.THIN_FIRST_YEAR_1, concentration_tenths=4),
        IceRegimeComponent(ice_type=IceType.OPEN_WATER, concentration_tenths=6)
    ]
    res = calculate_rio(IceClass.PC5, comp)
    assert res.rio > 0
    assert res.is_operation_permitted is True
