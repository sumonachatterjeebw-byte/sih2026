"""Unit tests for route optimizer."""
from src.core.route_optimizer import PolarRouteOptimizer
from src.core.polaris_risk import IceClass

def test_route_optimization_savings():
    opt = PolarRouteOptimizer(ice_class=IceClass.PC5)
    summary = opt.optimize_route(
        start_lat=-58.0, start_lon=70.0,
        dest_lat=-69.0, dest_lon=76.0
    )
    assert summary.total_distance_nm > 0.0
    assert summary.fuel_saved_percentage > 10.0
    assert summary.minimum_rio >= -10
