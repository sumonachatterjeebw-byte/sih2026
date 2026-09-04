# POLAR-NAV AI — End-to-End Prototype Build Specification

**Status:** authoritative build contract for the SIH 2026 PS-26059 working prototype.
**Audience:** implementers (human or agent). Everything below is binding: API paths, payload
shapes, module boundaries, and acceptance criteria.

---

## 0. The Brief (the "prompt")

> Build a complete, demonstrable, end-to-end decision-support system for Indian Antarctic
> Expedition vessels. A judge with no context must be able to run two commands, open a browser,
> press **Plan Voyage**, and watch a physically-grounded ship sail from the Southern Ocean to an
> Indian Antarctic station through a forecast sea-ice field, while the system continuously proves
> it is safe (IMO POLARIS), efficient (Lindqvist ice resistance), and aware (iceberg drift plus
> growler radar). Nothing may be a hard-coded number pretending to be a result. Every figure on
> screen must be traceable to a model that runs at request time.

### Non-negotiable principles

| # | Principle | Consequence |
| :-- | :-- | :-- |
| P1 | **No fabricated savings.** | The fuel-saving figure must come from running the *same* physics along an optimised route and along a great-circle baseline, then differencing. A hard-coded 1.22 multiplier is a defect. |
| P2 | **Honest labelling.** | Synthetic environmental fields must be labelled `synthetic` in every API response that carries them, with the real ingestion source named alongside. We simulate the data, not the science. |
| P3 | **Deterministic demo.** | Everything is seeded. The same request yields the same answer, so a demo cannot break on stage. |
| P4 | **Offline-capable.** | Zero external API keys, zero map tile servers, zero network calls at runtime. Coastlines ship with the repo. |
| P5 | **Real geodesy.** | Haversine distance, true bearings, EPSG:3031 polar stereographic rendering, real Antarctic coastline as a land mask. |
| P6 | **Traceable physics.** | Every computed quantity exposes its inputs and intermediate terms so the UI can show the working. |

---

## 1. System Shape

```
      +------------------------------------------------------------------+
      |  FRONTEND - React 18 + Vite + TypeScript + Tailwind              |
      |  "Bridge Console" SPA, custom EPSG:3031 canvas map engine        |
      +---------------+-----------------------------+--------------------+
             REST     |                             |  WebSocket
                      v                             v
      +------------------------------------------------------------------+
      |  BACKEND - FastAPI (Python 3.11), Pydantic v2                    |
      |  routers: geo env ice risk resistance icebergs route voyage      |
      |           radar export telemetry                                  |
      +---------------+--------------------------------------------------+
                      v
      +------------------------------------------------------------------+
      |  CORE MODELS (pure Python + NumPy, no I/O)                       |
      |  environment  sea_ice  polaris_risk  lindqvist_model             |
      |  iceberg_tracker  route_optimizer  growler_radar  voyage         |
      +---------------+--------------------------------------------------+
                      v
      +------------------------------------------------------------------+
      |  DATA - Antarctic coastline (Natural Earth 50m), stations,       |
      |  USNIC-style iceberg catalogue, SQLite voyage store              |
      +------------------------------------------------------------------+
```

---

## 2. Backend Module Contracts

### 2.1 `src/core/geo.py` — geodesy primitives

- `haversine_nm(lat1, lon1, lat2, lon2) -> float`
- `initial_bearing_deg(...) -> float`
- `destination_point(lat, lon, bearing_deg, distance_nm) -> (lat, lon)`
- `great_circle_path(lat1, lon1, lat2, lon2, n) -> list[(lat, lon)]` using spherical slerp.
- `to_epsg3031(lat, lon) -> (x_m, y_m)` and `from_epsg3031(x, y) -> (lat, lon)`, an exact inverse pair.
- `cross_track_distance_nm(p, a, b) -> float` for closest-point-of-approach maths.

### 2.2 `src/data/landmask.py` — real land

- Loads `src/data/antarctica_coast.json`, which holds 97 polygons from Natural Earth 1:50m
  physical land, public domain, simplified to 1698 vertices.
- `is_land(lat, lon) -> bool` by ray-casting point-in-polygon, accelerated with per-polygon
  bounding boxes and a latitude bucket index.
- `distance_to_coast_nm(lat, lon) -> float`, sampled, used for grounding-risk penalties.
- Must answer at least 20 000 queries per second because the A* search depends on it.

### 2.3 `src/core/environment.py` — atmospheric and ocean forcing

Deterministic, seeded, physically-shaped synthetic fields over the Southern Ocean.

- Circumpolar westerlies whose strength peaks near 55S, decaying poleward.
- Katabatic outflow within roughly 200 nm of the coast, offshore-directed, strongest in the lee
  of Queen Maud Land and Prydz Bay, diurnally modulated.
- Antarctic Circumpolar Current flowing eastward at roughly 0.3 to 0.6 m/s near the Polar Front,
  with a westward Antarctic Coastal Current within about 150 nm of the coast.
- Synoptic low-pressure systems advecting eastward with a 3 to 5 day period.
- Interface: `sample(lat, lon, t_hours) -> EnvSample` carrying `u10`, `v10`, `wind_speed_ms`,
  `wind_dir_from_deg`, `uo`, `vo`, `current_speed_ms`, `current_dir_to_deg`, `sst_c`, `t2m_c`,
  `msl_hpa`, `sig_wave_height_m`.
- `field(bbox, resolution_deg, t_hours)` returns gridded arrays for map layers.

### 2.4 `src/core/sea_ice.py` — concentration, thickness, type, drift, divergence, forecast

- **Concentration** combines a latitudinal ice-edge baseline modulated by the austral seasonal
  cycle, multi-octave value noise for floes and leads, named coastal polynyas near both stations,
  and advection by the wind and current driven drift field.
- **Thickness** uses Stefan's Law thermodynamic growth from accumulated Freezing Degree Days plus
  a dynamic ridging term where drift is convergent. This is the documented answer to the question
  "how do you know thickness without altimetry".
- **Type classification** maps thickness to a WMO stage of development, which feeds the POLARIS
  `IceType` enum.
- **Drift** is a 2 percent wind factor plus surface current, deflected left in the Southern
  Hemisphere.
- **Divergence** is computed by central differences to give a `compression_index` in the range 0
  to 1. Convergent regimes flag besetting risk.
- **Forecast**: `forecast(lat, lon, lead_hours)` performs semi-Lagrangian back-trajectory
  advection of the analysis field, blended toward climatology as lead time grows, with a widening
  uncertainty band.
- **Skill**: `verify(lead_hours)` returns RMSE, MAE, bias, and Integrated Ice-Edge Error of the
  forecast against the model's own later analysis, plus a persistence-baseline skill score.
  Reported honestly as simulated-environment skill.

### 2.5 `src/core/polaris_risk.py` — IMO MSC.1/Circ.1519

- Complete Risk Value matrix covering PC1 through PC7, Arc4 through Arc7, IA Super through IC,
  Category A, B and C, and not-ice-strengthened, across all WMO ice types including decayed-ice
  variants.
- `calculate_rio(ice_class, components, decayed=False) -> POLARISAssessmentResult`
- `rio_from_grid(...)` as a vectorised helper for map layers.
- Speed limits follow the circular's elevated-risk table per class, not a flat 6 knots.
- The result exposes `per_component_contributions` so the interface can show the arithmetic.

### 2.6 `src/core/lindqvist_model.py` — ice resistance and powering

- Keeps the three Lindqvist terms, crushing, bending and submergence, with the velocity correction.
- Adds **open-water resistance**, friction plus residuary, so total resistance stays continuous as
  ice thickness approaches zero.
- `attainable_speed(vessel, available_power_kw, h_ice, concentration) -> float` solves the power
  balance by bisection. The route optimiser must use this, so that speed is an output of physics
  and the POLARIS cap, never an assumption.
- Emits `fuel_burn_kg_per_hour`, `co2_kg_per_hour` at 3.206 kg CO2 per kg of marine gas oil, and
  `specific_fuel_per_nm`.
- Vessel presets: MV Vasiliy Golovnin as a PC5-equivalent, a generic Arc7 resupply ship, and an
  RV Himadri-class research vessel.

### 2.7 `src/core/iceberg_tracker.py` — physics-informed Lagrangian drift

- **RK4** integration of the momentum balance
  `(M + M_a) dv/dt = F_air + F_water + F_coriolis + F_pressure + F_wave`,
  with time-varying forcing sampled from `environment.py` at every stage.
- Added mass coefficient of 0.5, with separate sail and keel areas derived from berg geometry.
- **Deterioration**: wave erosion, buoyant convection and basal turbulent melt shrink the berg
  each step. A berg that falls below the size threshold is reclassified bergy bit, then growler.
- **Ensemble**: N perturbed members varying forcing and drag coefficients produce a mean track
  plus 50 and 90 percent positional uncertainty ellipses per lead time.
- **CPA**: `closest_approach(track, route)` returns distance, time and waypoint index, driving
  collision warnings.

### 2.8 `src/core/route_optimizer.py` — risk-constrained multi-objective A*

- Graph: adaptive latitude and longitude lattice with 16-way connectivity, longitude spacing
  scaled by `1/cos(lat)` so cells stay near-square at high latitude.
- **Hard constraints**: land from the real coast polygons, `RIO < -10`, iceberg exclusion radius,
  and a minimum distance to coast.
- **Edge cost**: `w_fuel * fuel_tonnes + w_time * hours + w_risk * risk_penalty`, where the speed
  on an edge is `min(POLARIS cap, attainable_speed(...))` and the risk penalty combines negative
  RIO, the ice compression index, and iceberg proximity.
- **Admissible heuristic**: remaining great-circle distance divided by the maximum possible speed,
  scaled by the minimum achievable per-hour cost. It must never over-estimate so A* stays optimal.
- **Baseline, per P1**: the identical cost model evaluated along the great-circle track. Savings
  equal `(baseline - optimised) / baseline`. If the optimised route is not cheaper, report that.
- Returns per-waypoint state, the totals, and a constraint log carrying `nodes_expanded`,
  `nodes_rejected_land`, `nodes_rejected_rio` and `search_ms`.

### 2.9 `src/core/growler_radar.py` — near-field tactical layer

- Simulates an X-band marine radar plan-position indicator with range rings out to 6 nm and sea
  clutter that grows with sea state, drawing targets from the local ice field.
- Detection probability varies with target size, range and sea state, alongside a
  `detection_confidence` that mimics an edge computer-vision model, including explicit misses at
  high clutter.
- Emits `RadarContact` records carrying bearing, range, size class, confidence, time to closest
  approach, and a threat level.

### 2.10 `src/core/voyage.py` — the simulation engine

- Steps a vessel along a planned route in simulated time, one simulated hour per tick by default.
- Each tick resamples the environment and ice at the current forecast valid time, recomputes
  POLARIS, recomputes attainable speed and fuel, advances the position, runs a radar sweep, and
  raises or clears alerts.
- **Alerts**: `RIO_RESTRICTED`, `RIO_PROHIBITED`, `COMPRESSION_BESETTING`, `ICEBERG_CPA`,
  `GROWLER_CONTACT`, `HEAVY_WEATHER` and `OFF_TRACK`, each with a severity and an advisory.
- **Re-route trigger**: when actual conditions violate a hard constraint the engine re-plans from
  the current position and records the diversion in the voyage log.
- Voyage state persists per tick so the frontend can scrub through history.

### 2.11 `src/services/`

- `store.py` uses SQLite at `data/polarnav.db` for voyages, ticks, alerts and plans, in WAL mode,
  auto-migrating on start.
- `exporters.py` produces a GeoJSON route, a GPX track for ECDIS import, a CSV log, and an
  S-411-shaped ice overlay. The GPX must respect GPX 1.1 element order.
- `bandwidth.py` measures the real byte size of a full raster field against the compressed contour
  and delta payload, proving the under-50-KB-per-day claim with measured numbers rather than an
  assertion.

---

## 3. HTTP API Contract (frozen)

Base URL `http://127.0.0.1:8000`. All responses are JSON. All list endpoints are bounded.

| Method | Path | Purpose |
| :-- | :-- | :-- |
| GET | `/api/v1/health` | liveness, model versions, data provenance |
| GET | `/api/v1/geo/coastline` | Antarctic land polygons as GeoJSON |
| GET | `/api/v1/geo/stations` | Indian and neighbouring Antarctic stations and ports |
| GET | `/api/v1/env/sample` | `?lat&lon&t_hours` returns one `EnvSample` |
| GET | `/api/v1/env/field` | `?bbox&res&t_hours` returns gridded wind, current and sea state |
| GET | `/api/v1/ice/field` | `?bbox&res&lead_hours` returns concentration, thickness, type, drift, divergence |
| GET | `/api/v1/ice/point` | `?lat&lon&lead_hours` returns point ice state and POLARIS type |
| GET | `/api/v1/ice/forecast-skill` | RMSE, IIEE and persistence skill per lead time |
| POST | `/api/v1/risk/polaris` | RIO assessment, back-compatible with the v0.1 payload |
| GET | `/api/v1/risk/matrix` | the full POLARIS Risk Value matrix for the interface table |
| POST | `/api/v1/resistance/calculate` | Lindqvist resistance, power, fuel and CO2 |
| GET | `/api/v1/resistance/speed-power-curve` | curve across speeds and ice thicknesses |
| GET | `/api/v1/vessels` | vessel presets |
| GET | `/api/v1/icebergs` | tracked iceberg catalogue with current positions |
| POST | `/api/v1/icebergs/predict-drift` | ensemble drift forecast with uncertainty, back-compatible |
| POST | `/api/v1/route/optimize` | full plan: waypoints, baseline comparison, search diagnostics |
| POST | `/api/v1/route/compare` | optimised against great-circle and shortest-time, side by side |
| POST | `/api/v1/voyage` | create a voyage from a plan, returns `voyage_id` |
| GET | `/api/v1/voyage/{id}` | voyage state, tick history and alerts |
| POST | `/api/v1/voyage/{id}/step` | advance N simulated hours, works without a WebSocket |
| POST | `/api/v1/voyage/{id}/reroute` | re-plan from the current position |
| GET | `/api/v1/radar/sweep` | `?lat&lon&heading&t_hours` returns contacts and clutter |
| GET | `/api/v1/export/{voyage_id}.{fmt}` | `geojson`, `gpx`, `csv` or `s411` |
| GET | `/api/v1/telemetry/bandwidth` | payload-size budget proof |
| WS | `/ws/voyage/{id}` | live tick stream of `{type: "tick" or "alert" or "done", payload}` |

**Back-compatibility.** The original v0.1 endpoints keep working with their first-release request
bodies so the existing test suite and command-line demo stay green. These are
`/api/v1/risk/polaris`, `/api/v1/resistance/calculate`, `/api/v1/icebergs/predict-drift`,
`/api/v1/route/optimize` and `/api/v1/visualize/antarctica-grid`.

---

## 4. Frontend Specification

**Stack.** React 18, Vite 5, TypeScript in strict mode, Tailwind CSS 3, Zustand for client state,
TanStack Query for server state, Recharts for charts, lucide-react for icons.
**No map tile provider.** The map is a bespoke canvas engine.

### 4.1 The map engine, `src/map/`

- Projects WGS84 to **EPSG:3031** Antarctic Polar Stereographic in TypeScript, mirroring the
  backend implementation exactly.
- Layers painted bottom up: graticule, then the concentration raster, the ice-edge contour, the
  divergence and compression shading, land polygons, the drift vector field, iceberg positions
  with uncertainty ellipses, the planned route, the dashed baseline route, the travelled track,
  the vessel marker with heading, radar range rings, and finally labels.
- Interactions: wheel zoom about the cursor, drag to pan, click to inspect which opens a readout
  of every model value at that coordinate, a hover tooltip, and a fit-to-route control.
- Device-pixel-ratio aware, and smooth at 60 frames per second while the raster animates.

### 4.2 Screens

1. **Bridge Console**, the default. The map, a live vessel status rail carrying speed, heading,
   an RIO gauge, ice state, fuel rate, power and CO2, the alert feed, and the radar scope.
2. **Voyage Planner**. Origin and destination pickers with real presets such as Cape Town, Goa
   and Hobart heading to Maitri or Bharati, vessel and ice-class selection, objective weight
   sliders and a departure date. Shows search diagnostics and the optimised-against-baseline
   comparison.
3. **Ice Forecast**. A lead-time slider from 0 to 168 hours with playback, layer toggles, the
   forecast-skill panel and the POLARIS risk overlay.
4. **Iceberg Tracker**. A catalogue table, per-berg ensemble drift drawn on the map, closest-point
   warnings against the active route, and a deterioration curve.
5. **Analytics**. Fuel and time comparison, the RIO profile along the route, the power breakdown
   into crushing, bending and submergence, emissions saved, and the bandwidth budget proof.

### 4.3 Design language

A dark maritime bridge theme that suits night vision. Near-black ground at `#070B12`, deep navy
panels, a cyan and teal accent, amber for caution and red for prohibited. Data dense but calm.
A monospace face for every numeral and Inter for prose. Every number carries a unit. Panels are
glass-edged cards with one-pixel borders rather than heavy drop shadows. Responsive down to a
1280 pixel bridge display, degrading gracefully on a laptop.

---

## 5. Acceptance Criteria

A build is complete only when all of the following hold.

1. `pytest tests/ -q` passes, including the 10 original tests, unchanged.
2. `uvicorn src.api.main:app` starts and `/api/v1/health` returns 200 with model versions.
3. `npm run build` in `frontend/` completes with zero TypeScript errors.
4. `python -m src.cli` runs a full narrated voyage simulation in the terminal.
5. Planning Cape Town to Bharati returns a route that touches no land polygon, holds RIO at or
   above -10 at every waypoint, and reports a savings figure derived by differencing two real
   model runs, per P1.
6. A voyage can be created, stepped 120 simulated hours, produces at least one alert, and yields
   a GPX export that parses as valid XML.
7. The frontend loads against the running backend and renders the map, a planned route and live
   voyage ticks without a console error.
8. No runtime network calls and no API keys. A clean checkout reaches a working demo in two
   commands.
9. Every synthetic field is labelled as such in its API response, per P2.
10. `README.md` documents the two-command quickstart, the architecture, and explicitly which parts
    are real physics and which parts are simulated data.

---

## 6. Build Order

1. Geodesy, land mask, constants. This is the foundation.
2. Environment and sea-ice models, because everything samples these.
3. POLARIS and Lindqvist upgrades, which are pure and testable.
4. Iceberg RK4 with ensembles, then the growler radar.
5. The route optimiser on the real graph, with the honest baseline.
6. Voyage engine, SQLite store, exporters and the bandwidth proof.
7. FastAPI routers and the WebSocket, freezing the contract in section 3.
8. Frontend, in order: map engine, application shell, then the five screens.
9. Command-line narration, tests, documentation, Docker and run scripts.
