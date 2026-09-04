# POLAR-NAV AI: System Architecture

This document describes the system **as built**, not as aspired to. Where the shipped design
differs from the original blueprint, the difference is stated and explained.

---

## 1. Deployment shape

The production concept is a dual-tier system: a cloud pipeline at NCPOR headquarters doing the
heavy satellite ingestion and model inference, and an offline-capable console on the ship's
bridge. This prototype implements **both tiers as one process**, because the interesting
engineering is in the models and the split is a deployment detail rather than a design one.

```
+-----------------------------------------------------------------------------------+
|  SHORE TIER (NCPOR HQ)                     - conceptual in this prototype          |
|  Sentinel-1 SAR, AMSR2/SSMIS, ERA5/HRES, CMEMS, USNIC iceberg database             |
|  Harmonisation to EPSG:3031, model inference, contour generation                   |
+---------------------------------+-------------------------------------------------+
                                  |  compressed contours and deltas
                                  |  MEASURED at 23.4 KB/day against a 50 KB budget
                                  v  (Iridium Certus; see src/services/bandwidth.py)
+-----------------------------------------------------------------------------------+
|  SHIP TIER (bridge console)                - fully implemented                     |
|                                                                                    |
|  React bridge console  <--REST/WS-->  FastAPI service  -->  physics core           |
|  EPSG:3031 canvas map                 SQLite voyage store                          |
|                                       GPX / GeoJSON / S-411 export to the ECDIS    |
+-----------------------------------------------------------------------------------+
```

The exports matter for a regulatory reason. Maritime rules do not permit arbitrary software
inside a type-approved ECDIS, so the console runs on separate hardware and hands the ECDIS
standard data over the ship's LAN as a read-only overlay.

---

## 2. Module map

```
src/core/
  constants.py        every physical constant in one auditable place, with citations
  geo.py              haversine, bearings, great circles, EPSG:3031 forward and inverse
  noise.py            seeded Perlin/fBm noise, so fields have realistic spatial structure
  environment.py      synthetic atmosphere and ocean forcing
  sea_ice.py          concentration, thickness, type, drift, divergence, forecast, verification
  polaris_risk.py     IMO MSC.1/Circ.1519 Risk Index Outcome
  lindqvist_model.py  ice resistance, powering, attainable speed
  iceberg_tracker.py  RK4 Lagrangian drift, deterioration, ensembles, closest approach
  growler_radar.py    X-band PPI simulation with misses and false alarms
  route_optimizer.py  risk-constrained multi-objective A*
  voyage.py           hour-by-hour voyage simulation and alerting

src/ml/               trained models, dataset generation, registry (optional layer)
src/data/             coastline, land mask, stations, iceberg catalogue
src/services/         SQLite store, exporters, bandwidth measurement
src/api/              FastAPI app and routers
```

**Dependency direction is strictly one-way.** `core` depends on `data`, never the reverse.
`services` and `api` depend on `core`. `ml` depends on `core` but nothing depends on `ml` — the
physics path runs unchanged if no model has ever been trained.

---

## 3. Data flow for a route request

```
POST /api/v1/route/optimize
        |
        v
  resolve origin and destination to navigable anchorages          (data/stations.py)
        |
        v
  build the search lattice and precompute the field cache          (route_optimizer.FieldCache)
        |   - ice concentration, thickness, compression at 48-hour forecast slices
        |   - POLARIS RIO per cell, vectorised over the whole grid
        |   - attainable speed and fuel rate per cell, from tabulated Lindqvist
        v
  A* run TWICE                                                     (route_optimizer._search)
        |   1. ice-blind: shortest navigable track, land and clearance only
        |   2. ice-aware: full multi-objective cost, all hard constraints
        v
  sail BOTH tracks through identical physics                       (route_optimizer.evaluate)
        |
        v
  saving = baseline - optimised                                    (a measurement, not a factor)
```

The two-search design is the load-bearing idea. A single optimised route produces a number with
nothing to compare it to, which is how the previous prototype ended up multiplying by 1.22 and
calling the product a saving.

---

## 4. Performance, and what had to be done to get it

A naive implementation of this system is unusably slow. The measured costs and the fixes:

| Problem | Naive cost | Fix | Result |
| :--- | ---: | :--- | ---: |
| Land test in the A* inner loop | — | Bounding-box reject plus a memo cache on the quantised lattice | 25,000 queries/s |
| Coast distance on gridded fields | one KD-tree query per point | One batched query into a bilinear lookup grid | 200k samples in 67 ms |
| Ice model re-requesting coast geometry | dozens of times per field | Cache keyed on grid content | route planning 24 s → 6 s |
| Attainable speed per A* edge | a bisection each time | Tabulate over (thickness, concentration) and interpolate | ~1000x |
| Iceberg ensemble integration | member-at-a-time, sampling per RK4 stage | Vectorise the ensemble; refresh forcing every 30 simulated minutes | 109 s → 4 s |
| Voyage tick | re-sampling ice and environment inside the radar sweep | Pass the already-sampled state through | 2340 ms → 169 ms |

Two of these were correctness fixes as much as performance ones. The iceberg integrator used a
fixed timestep, which is stable for a giant tabular berg but **diverges to NaN within a day for a
growler**, whose drag response time is minutes; the timestep is now derived per berg from its own
response timescale. And the route planner originally inverted the power curve directly while the
voyage engine used the full thrust-limited solver, so the planner certified routes that beset the
ship when actually sailed. Both now call one function.

---

## 5. The models

### 5.1 Sea ice (`sea_ice.py`)

- **Concentration**: ice-edge climatology with an austral seasonal cycle, multi-octave noise for
  floes and leads, and coastal polynyas that *emerge* where katabatic wind drives ice offshore
  rather than being drawn in by hand.
- **Material advection**: the floe pattern is sampled in a drifting frame, so a lead is the same
  lead a day later, several tens of kilometres downstream. This is what makes a Lagrangian
  forecast the physically correct method rather than a decorative one.
- **Thickness**: Stefan's Law growth on accumulated Freezing Degree Days, saturating near 1.55 m
  where oceanic heat flux balances conduction through the ice and its snow cover, plus dynamic
  ridging where the drift field converges. Pure Stefan growth diverges as √FDD and would predict
  3 to 4 m by late season, which is wrong for the Antarctic.
- **Forecast**: a three-component blend of persistence, semi-Lagrangian back-trajectory advection
  and climatology, with weights that shift by lead time. This is how operational ice services
  actually combine guidance, and the weights are calibrated against the verification harness
  rather than guessed.
- **Verification**: `verify()` scores the forecast against the analysis valid at the same time,
  with a persistence baseline alongside. The forecast never sees the verifying analysis.

### 5.2 POLARIS (`polaris_risk.py`)

The complete MSC.1/Circ.1519 Risk Value table: 12 ice classes against 11 WMO stages of
development, with Arc and Polar Code category equivalences, the melt-season decayed-ice
allowance, and the elevated-risk speed ceilings. `RIO = Σ Cᵢ × RVᵢ`, and the response exposes
each term so the arithmetic can be checked on screen.

### 5.3 Lindqvist (`lindqvist_model.py`)

Crushing, bending and submergence resistance with the correct velocity corrections, plus
open-water resistance via the ITTC-1957 line so total resistance stays continuous as thickness
approaches zero. `attainable_speed()` takes the lower of the power-balance and propeller-thrust
roots — the thrust limit binds in heavy ice, and ignoring it silently assumes a propeller that
keeps open-water efficiency down to bollard conditions.

### 5.4 Iceberg drift (`iceberg_tracker.py`)

RK4 on `(M + Mₐ) dv/dt = F_air + F_water + F_coriolis + F_pressure + F_wave`, with deterioration
by basal turbulent melt, buoyant convection and wave erosion, and perturbed ensembles giving 50
and 90 percent positional uncertainty per lead time.

### 5.5 Route optimiser (`route_optimizer.py`)

16-way A* on a lat/lon lattice. Hard constraints: land, coastal clearance, `RIO < -10`, iceberg
exclusion zones. Edge cost `w_fuel·fuel + w_time·hours + w_risk·penalty`, with speed from the
physics. The heuristic is remaining great-circle distance times the cheapest conceivable cost per
mile, which never over-estimates, so A* stays optimal with respect to the cost model.

**Documented approximation:** edge costs depend on arrival time, and treating time as part of the
state would multiply the state space. Each node instead carries the arrival time of the best path
found to it so far. This is standard in operational weather routing, and it is a
label-correcting approximation rather than a proof of optimality.

---

## 6. Honest architectural limits

1. The shore tier is conceptual. The satellite ingestion path is designed for and measured
   against, but not implemented — the fields are synthetic.
2. Forecasts clamp at 240 hours; longer passages fall back to climatology in their later legs.
3. The S-411 export is a representative attribute subset, not a certified encoding.
4. Route optimality is approximate in time, as described above.
5. There is no authentication or multi-tenancy. It is a single-console prototype.
