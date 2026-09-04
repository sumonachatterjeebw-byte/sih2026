# POLAR-NAV AI

**AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory and Navigation Decision Support System**

[![SIH 2026](https://img.shields.io/badge/SIH-2026-blue.svg)](https://www.sih.gov.in/)
[![Problem ID](https://img.shields.io/badge/Problem%20Statement-26059-orange.svg)](https://www.sih.gov.in/)
[![Organisation](https://img.shields.io/badge/MoES-NCPOR-green.svg)](https://ncpor.res.in/)
[![IMO POLARIS](https://img.shields.io/badge/IMO-MSC.1%2FCirc.1519-brightgreen.svg)](https://www.imo.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)

A working decision-support system for the ships that resupply India's Antarctic stations,
**Maitri** and **Bharati**. It forecasts sea ice, predicts iceberg drift, and plans a route that
is provably safe under the IMO Polar Code while burning less fuel and arriving sooner.

---

## Read this first: what is real and what is simulated

This is the part most prototypes are vague about, so it goes at the top.

| Layer | Status | Detail |
| :--- | :--- | :--- |
| Ship ice-resistance physics | **Real** | Lindqvist (1989), validated against published results to within a few percent |
| IMO POLARIS risk tables | **Real** | Transcribed from MSC.1/Circ.1519, all 12 ice classes x 11 ice types |
| Antarctic coastline | **Real** | Natural Earth 1:50m, 97 polygons, used as the hard land mask |
| Station coordinates | **Real** | Published NCPOR positions |
| Iceberg identities and origins | **Real** | US National Ice Center naming (D-28, A-23A, A-74, …) |
| Geodesy and EPSG:3031 projection | **Real** | Exact WGS84 ellipsoidal projection, inverse-verified |
| Iceberg drift equations | **Real** | RK4 on the Bigg et al. (1997) momentum balance |
| **Sea-ice concentration and thickness fields** | **Simulated** | Stands in for OSI-SAF OSI-401-b, AMSR2, Sentinel-1 SAR |
| **Wind, current, temperature, wave fields** | **Simulated** | Stands in for ECMWF ERA5/HRES and Copernicus Marine CMEMS |
| **Radar returns** | **Simulated** | Radar-equation model standing in for a real X-band PPI |

**The models are real; the weather is simulated.** Every API response carrying a simulated field
sets `is_synthetic: true` and names the product it stands in for. Switching to live data is a
data-loader change, not a model change — the interfaces already match the real products.

---

## Quickstart

Two terminals, two commands each.

```bash
# 1. Backend
pip install -r requirements.txt
uvicorn src.api.main:app --reload --port 8000        # http://localhost:8000/docs

# 2. Frontend
cd frontend && npm install && npm run dev            # http://localhost:5173
```

No API keys. No map tile provider. No network calls at runtime. It runs on a laptop in
aeroplane mode, which is the point: the target user is on a ship below 60°S.

**Terminal-only demonstration** (no browser needed):

```bash
python -m src.cli                 # full run: POLARIS, Lindqvist, ice, icebergs, route, voyage
python -m src.cli --quick         # skip the voyage simulation
python -m src.cli --list          # available legs, vessels and stations
python -m pytest tests/ -q        # the test suite
```

---

## What the system actually does

### The problem

Every austral summer NCPOR sends the Indian Antarctic Expedition from Cape Town or Goa across
the Southern Ocean. Ships meet seasonal pack ice, katabatic storms, closing leads and calved
tabular icebergs. Getting it wrong means burning millions of litres of marine gas oil ramming
ice, missing a resupply window, or being beset — trapped in ice that has closed around the hull.
Ice charts today are largely manual and 12 to 24 hours old.

### The answer, in one screen

Plan a passage from Cape Town to Bharati. The system computes **two** routes and sails both
through identical physics:

```
Route                                       Distance    Time     Fuel   min RIO
Ice-blind shortest navigable route             2853 nm    718 h    301 t       6
POLARIS-constrained optimised route            3140 nm    302 h    299 t      12

Time saved   416 h  (17.3 days)
Fuel saved   0.36 %
Distance     +287 nm — the safe route is longer, and still faster
```

That result is the whole argument. The optimised route sails **287 nautical miles further** and
arrives **17 days sooner**, because it goes around the thick ice instead of grinding through it,
and its worst-case POLARIS risk index is 12 instead of 6.

On a different leg the trade lands differently. Cape Town to Maitri saves almost no time but
lifts the minimum RIO from 1 to 9. **The system reports whichever is true.** There is no fixed
percentage anywhere in the codebase.

---

## Technology stack, and why each piece

### Backend

| Choice | Why this and not the obvious alternative |
| :--- | :--- |
| **Python 3.11** | The polar science ecosystem (xarray, NetCDF4, GDAL, Copernicus toolboxes) is Python. Ingesting real ERA5 and OSI-SAF products later means staying where those libraries live. |
| **FastAPI** | Pydantic v2 models give a typed schema and an OpenAPI document for free, so the frontend generates its types from the running server instead of guessing. WebSocket support is native, which the live voyage stream needs. |
| **Pydantic v2** | Validation at the boundary, and the same models serialise to the wire. An ice concentration above 1.0 or a negative thickness is rejected at the edge rather than corrupting a route. |
| **NumPy** | Every field is evaluated on grids of thousands of points. Vectorising the ice model took route planning from 24 seconds to 6. |
| **SciPy** | `cKDTree` for distance-to-coast over 1698 coastline vertices. |
| **scikit-learn** | Trains in seconds on a CPU. A laptop demo cannot depend on a GPU, and a bridge PC does not have one. See the training section for why this was the right size of tool. |
| **SQLite** | The shipboard console is one rugged PC on a bridge with no infrastructure behind it. A file-backed database with WAL works there unchanged and works at NCPOR headquarters too. |
| **No PyTorch** | Considered and rejected. The trained models here are tabular; a deep network would add a heavy dependency, a GPU expectation and an ONNX export step for no measured gain. When the pipeline moves to real satellite rasters, a U-Net becomes the right call — that is documented as future work, not claimed as done. |

### Frontend

| Choice | Why |
| :--- | :--- |
| **React 18 + Vite + TypeScript (strict)** | Fast iteration, and strict typing against generated API types means a backend field rename breaks the build instead of the demo. |
| **Tailwind CSS** | A dense instrument panel needs consistent spacing and colour tokens more than it needs bespoke CSS. |
| **Custom `<canvas>` map engine** | **The most important decision in the frontend.** Mapbox, MapLibre and Leaflet all assume Web Mercator and a tile server. Web Mercator is unusable at 70°S, and a tile server is unreachable at sea. So the map is written from scratch: WGS84 projected to **EPSG:3031 Antarctic Polar Stereographic** in TypeScript, mirroring the backend projection exactly, drawing coastline vectors and the ice raster served by our own API. The result works offline, is correct at the pole, and renders our own model output rather than someone else's basemap. |
| **Zustand + TanStack Query** | Server state (slow, cacheable route plans) and client state (layer toggles, playback) are genuinely different problems and get different tools. |
| **Recharts** | Charts as React components, so the analytics screen stays declarative. |

### What we deliberately did not use

- **No map tile provider** — offline capability is a hard requirement below 60°S.
- **No cloud services, no external APIs, no keys** — a clean checkout must run.
- **No Docker requirement** — `pip install` and `npm install` are fewer moving parts for a judge.

---

## Where we trained, what, and how

**Short answer:** three models are trained, by one command, on data generated from this
repository's own physics environment. One is a clear win and is used in production. The other
two do not beat the physics they were meant to improve, so the physics is what ships. Those
results are reported here rather than hidden.

```bash
python -m scripts.train          # trains all three, writes models/ and models/metrics.json
python -m scripts.train --quick  # fast smoke run
```

Full details, feature lists and per-lead-time tables are in **[docs/ML_MODELS.md](docs/ML_MODELS.md)**;
every number is also machine-readable in **`models/metrics.json`**.

### The training data

There is no public labelled dataset for "correct Antarctic route", so the training data is
**generated by the physics environment in this repository** — `src/core/environment.py`,
`src/core/sea_ice.py` and `src/core/iceberg_tracker.py`. These stand in for ERA5/CMEMS forcing,
OSI-SAF/AMSR2 concentration, and USNIC/BYU iceberg tracks.

**This must not be read as operational forecast skill.** It is skill inside a simulated world.
What it demonstrates is that the pipeline — feature extraction, time-based splitting, training,
honest baseline comparison — is real and runs, so that pointing it at Copernicus data is a
data-loader change.

Splits are **time-based and embargoed**, never random: nearby samples share the same noise
field, so a random split would leak the answer and report a fictitious score.

### The three models

All figures below are from the **full** training run (`python -m scripts.train`, 252 s wall
time on a laptop CPU), measured on the held-out **test** split.

**1. Sea-ice concentration forecaster** — `HistGradientBoostingRegressor`, 21 features
(concentration and its two spatial gradients, position, season, wind, current, drift,
divergence, compression, coast distance, ice-edge latitude, lead time), predicting concentration
at +24 to +168 h. Trained on 44,800 rows; 11,900 validation, 20,300 test.

| Model | Test RMSE | Skill vs this |
| :--- | ---: | ---: |
| Learned model | 0.105 | — |
| Persistence | 0.104 | −0.006 |
| Climatology | 0.147 | **+0.285** |
| Physics forecast (semi-Lagrangian) | 0.098 | −0.072 |

> **Verdict: it ties persistence, comfortably beats climatology, and stays about 7% behind the
> physics forecast at every lead time. So the API serves the physics forecast.**
> More data helped a great deal — at 2,800 rows it was 22% behind persistence, at 44,800 rows it
> is level with it — but it never overtakes the advection scheme. That is the expected result and
> not a disappointing one: in a world whose ice patterns are *generated* by advection, a
> semi-Lagrangian back-trajectory is close to the correct answer, and a gradient-boosted tree on
> tabular features cannot do better than the generating process. On real satellite rasters, where
> the true dynamics are far richer than any advection scheme captures, this is exactly where a
> learned model earns its place — which is why the pipeline is built and kept.

**2. Iceberg drift residual corrector** — an MLP learning the velocity error of the RK4 momentum
balance against perturbed "observed" tracks. 300 training bergs, 140 test bergs, disjoint in both
identity and time window.

| 72-hour position error | Mean | Median |
| :--- | ---: | ---: |
| Physics alone | 6.95 km | — |
| Physics + learned residual | 6.86 km | — |
| Improvement | **+1.3%** | **−12.9%** |

> **Verdict: marginal and inconsistent — it helps the mean slightly and hurts the typical berg,
> so it is not used in the serving path.** The honest explanation is that the "observations" are
> generated by perturbing the *same* momentum balance, so the residual is close to unstructured
> noise with little for the model to learn. On real USNIC and BYU tracks, where the physics has
> genuine systematic bias from unknown keel geometry and unresolved sub-surface currents, a
> residual learner is a sound idea with real signal to find.
> This is also why the module is described as a **residual corrector on a physics core, not a
> physics-informed neural network**: the governing equation is not part of the loss function, and
> calling it a PINN would be a false claim.

**3. Growler and sea-clutter classifier** — `RandomForestClassifier` on radar-return features
(radar cross-section, range, significant wave height, blob area, aspect ratio, Doppler signature,
ice concentration, SNR). 1,600 simulated sweeps, 18,268 returns, split by scene.

| Model | F1 | ROC-AUC |
| :--- | ---: | ---: |
| Random forest | **0.989** | **0.999** |
| SNR threshold baseline | 0.701 | 0.607 |

> **Verdict: a clear win, and it is used.** It supplies the detection-confidence value on radar
> contacts. Separating a small ice target from a sea-clutter spike depends on the *combination*
> of blob shape, Doppler and sea state — aspect ratio alone carries 46% of the feature
> importance — which is precisely the kind of decision a hand-tuned SNR threshold cannot make.

### Why report the failures at all

Because a judge will ask, and because a system claiming three working AI engines when one works
is a system nobody should trust with a ship. The physics is strong enough to carry the product.
The machine learning is kept where it measurably helps, and the pipeline is kept everywhere else
so that retraining on real Copernicus and USNIC data is a data-loader change rather than a
research project.

---

## How it works

```
                    +--------------------------------------------------+
                    |  BRIDGE CONSOLE  (React, EPSG:3031 canvas map)   |
                    |  5 screens, offline-capable, no tile server      |
                    +---------------+------------------+---------------+
                          REST      |                  |  WebSocket
                                    v                  v
                    +--------------------------------------------------+
                    |  FastAPI service                                 |
                    |  geo | env | ice | risk | resistance | icebergs  |
                    |  route | voyage | radar | export | telemetry     |
                    +---------------+----------------------------------+
                                    v
    +---------------------------------------------------------------------------+
    |  PHYSICS CORE                                                             |
    |                                                                           |
    |  environment.py   westerlies, katabatic outflow, ACC, synoptic lows       |
    |  sea_ice.py       concentration, Stefan thickness, drift, divergence,     |
    |                   semi-Lagrangian forecast, verification harness          |
    |  polaris_risk.py  IMO MSC.1/Circ.1519 risk index                          |
    |  lindqvist_model  crushing + bending + submergence, attainable speed      |
    |  iceberg_tracker  RK4 momentum balance, melt, perturbed ensembles, CPA    |
    |  route_optimizer  risk-constrained A*, honest baseline comparison         |
    |  growler_radar    X-band PPI with real misses and false alarms            |
    |  voyage.py        hour-by-hour simulation, alerts, re-routing             |
    +---------------------------------------------------------------------------+
                                    v
    +---------------------------------------------------------------------------+
    |  DATA: Natural Earth coastline | NCPOR stations | USNIC bergs | SQLite    |
    +---------------------------------------------------------------------------+
```

### The five things that make it credible

**1. Speed is an output, not an assumption.** Every route edge solves the Lindqvist power and
propeller-thrust balance for the speed the ship can actually make. In 1.0 m ice at 6/10
concentration the *Vasiliy Golovnin* makes 6.2 knots on 5.3 MW. In 2.0 m ice at 8/10 she is
beset, and the planner routes around it.

**2. The saving is measured, not multiplied.** The v0.1 prototype computed
`baseline = optimised × 1.22` and reported "22% saved" — a constant dressed as a result. Now two
routes are planned and both are sailed through identical physics. The difference is the saving,
and it varies from 0.4% to 13% across legs, which is what an honest measurement looks like.

**3. The land mask is real.** 97 Natural Earth polygons answer 25,000 point-in-polygon queries
per second. A waypoint cannot be placed on the continent. Because Maitri is 80 km inland, each
station carries a validated seaward **anchorage** — ships route to India Bay, not to the station.

**4. The forecast is verified against persistence.** Any forecast must beat "assume nothing
changes" or it is not a forecast. Ours does, from 24 hours out:

| Lead | Forecast RMSE | Persistence RMSE | Skill | IIEE |
| ---: | ---: | ---: | ---: | ---: |
| 24 h | 0.081 | 0.088 | +0.076 | 0.046 |
| 48 h | 0.110 | 0.128 | +0.146 | 0.054 |
| 72 h | 0.126 | 0.151 | +0.164 | 0.050 |
| 120 h | 0.138 | 0.166 | +0.173 | 0.050 |
| 168 h | 0.152 | 0.182 | +0.164 | 0.058 |

**5. The bandwidth claim is measured.** Both payloads are built, serialised and gzipped, and the
byte counts are real: a full raster is 66 KB, the contour payload is **6.2 KB**, and four updates
a day total **23.4 KB** against the 50 KB Iridium Certus budget.

### Answers to the questions judges actually ask

**"How do you know ice thickness without altimetry?"** CryoSat-2 and ICESat-2 have narrow swaths
and long repeat cycles, so they cannot support tactical navigation. Thickness comes from
**Stefan's Law growth on accumulated Freezing Degree Days**, plus a dynamic ridging term where
the drift field converges. That is what operational ice services do. Pure Stefan growth diverges
as √FDD and would predict 3 to 4 m by late season, which is wrong for the Antarctic, so growth
saturates near 1.55 m where oceanic heat flux balances conduction through the ice and its snow.

**"What if a lead closes behind us?"** The drift field's divergence `∇·v` is computed by central
differences and mapped to a **compression index**. Convergent regimes are penalised in the route
cost and raise a `COMPRESSION_BESETTING` alert during a voyage.

**"What about growlers the satellites miss?"** A separate near-field layer. The simulated X-band
radar reports **misses**: a representative pack-ice sweep has 39 real targets, paints 13, and
misses 26 — one of them inside the 3 nm alert perimeter. Growler detection range collapses from
3.0 nm in calm water to 0.6 nm in saturated clutter. Reporting that honestly is the point.

**"You cannot install software in a certified ECDIS."** Correct. This runs on a separate console
and exports **GPX 1.1**, GeoJSON and an S-411-shaped ice overlay over the ship's LAN, which the
ECDIS loads read-only. The S-411 export is explicitly labelled a representative subset, not a
certified encoding.

---

## Repository layout

```
src/
  core/
    constants.py        every physical constant, with citations
    geo.py              haversine, bearings, EPSG:3031 forward and inverse
    noise.py            seeded Perlin noise for realistic field structure
    environment.py      synthetic Southern Ocean atmosphere and ocean
    sea_ice.py          concentration, thickness, drift, divergence, forecast, verification
    polaris_risk.py     IMO MSC.1/Circ.1519 risk index
    lindqvist_model.py  ice resistance, powering, attainable speed, vessel presets
    iceberg_tracker.py  RK4 drift, deterioration, ensembles, closest approach
    route_optimizer.py  risk-constrained A* and the honest baseline
    growler_radar.py    X-band PPI simulation with misses and false alarms
    voyage.py           hour-by-hour voyage engine and alerting
  ml/                   trained models, datasets, registry
  data/                 coastline, stations, iceberg catalogue, land mask
  services/             SQLite store, exporters, bandwidth measurement
  api/                  FastAPI app and routers
  cli.py                terminal demonstration
frontend/               React bridge console
scripts/train.py        trains every model, writes models/metrics.json
docs/                   architecture, POLARIS manual, datasets, ML models, build spec
tests/                  pytest suite
```

---

## API

Interactive documentation at `http://localhost:8000/docs`.

| Method | Path | Purpose |
| :--- | :--- | :--- |
| GET | `/api/v1/health` | model versions, data provenance, ML status |
| GET | `/api/v1/geo/coastline` | Antarctic land polygons (the planner's land mask) |
| GET | `/api/v1/geo/stations` | stations, ports and their navigable anchorages |
| GET | `/api/v1/env/sample` · `/env/field` | wind, current, temperature, sea state |
| GET | `/api/v1/ice/point` · `/ice/field` | concentration, thickness, drift, compression |
| GET | `/api/v1/ice/forecast-skill` | RMSE, IIEE and skill against persistence |
| POST | `/api/v1/risk/polaris` | Risk Index Outcome with per-component arithmetic |
| GET | `/api/v1/risk/matrix` | the full POLARIS risk-value table |
| POST | `/api/v1/resistance/calculate` | Lindqvist resistance, power, fuel, CO₂ |
| GET | `/api/v1/resistance/attainable-speed` | the speed the ship can actually make |
| GET | `/api/v1/vessels` | vessel presets |
| GET | `/api/v1/icebergs` | catalogue, optionally drift-propagated |
| POST | `/api/v1/icebergs/predict-drift` | RK4 ensemble drift with uncertainty |
| POST | `/api/v1/route/optimize` | full plan plus the measured baseline comparison |
| POST | `/api/v1/route/compare` | optimised, ice-blind and great-circle side by side |
| POST | `/api/v1/voyage` | create a voyage |
| POST | `/api/v1/voyage/{id}/step` | advance simulated hours |
| POST | `/api/v1/voyage/{id}/reroute` | re-plan from the present position |
| WS | `/api/v1/ws/voyage/{id}` | live tick and alert stream |
| GET | `/api/v1/export/{id}.{geojson,gpx,csv,s411}` | ECDIS-ready exports |
| GET | `/api/v1/telemetry/bandwidth` | the measured satellite budget |

Backwards compatible: every v0.1 endpoint and request body still works.

---

## Honest limitations

1. **Environmental fields are synthetic.** Skill figures are simulated-environment figures.
2. **Two of three trained models lose to their physics baselines** and are not used in the
   serving path. See above; the reasoning is in `docs/ML_MODELS.md`.
3. **Route optimality is approximate in time.** Edge costs depend on arrival time, and each node
   carries the arrival time of the best path found so far — standard in weather routing, but a
   label-correcting approximation rather than a proof of optimality.
4. **Forecasts are clamped at 240 hours.** Longer passages use climatology beyond that, which is
   correct — nobody can forecast ice 30 days out — but it means very slow baseline routes are
   evaluated against climatology in their later legs.
5. **The S-411 export is not certified.** It is a representative attribute subset.
6. **Vessel hull angles, block coefficients and SFOC are engineering estimates**, marked as such
   in the source. Principal dimensions and installed power are published figures.
7. **The measured fuel saving (0.4% to 13%) is below the 15–22% figure** in the original
   blueprint. That figure came from the literature, not from this system. Ours is what our models
   measure, and on several legs the real benefit is transit time and safety margin rather than
   fuel.

---

## References

1. IMO Resolution MSC.385(94) — *International Code for Ships Operating in Polar Waters*.
2. IMO MSC.1/Circ.1519 — *Polar Operational Limit Assessment Risk Indexing System (POLARIS)*.
3. Lindqvist, G. (1989). "A straightforward method for calculation of ice resistance of ships."
   *POAC 89*, Luleå, 722–735.
4. Fan, T. et al. (2019). "Comparative analysis of ice resistance prediction methods."
   *Advances in Polar Science*, 30(4).
5. Bigg, G. R. et al. (1997). "Modelling the dynamics and thermodynamics of icebergs."
   *Cold Regions Science and Technology*, 26(2), 113–135.
6. Rackow, T. et al. (2017). "A simulation of small to giant Antarctic iceberg evolution and drift."
   *JGR Oceans*, 122(4), 3170–3190.
7. El-Tahan, M. et al. (1987). "Estimation of iceberg deterioration." *Cold Regions Science and Technology*.
8. Andersson, T. R. et al. (2021). "Seasonal Arctic sea ice forecasting with probabilistic deep
   learning." *Nature Communications*, 12, 5124.
9. Timco, G. W. & Weeks, W. F. (2010). "A review of the engineering properties of sea ice."
   *Cold Regions Science and Technology*, 60(2), 107–129.
10. Anderson, D. L. (1961). "Growth rate of sea ice." *Journal of Glaciology*, 3(30), 1170–1172.

---

Built for **Smart India Hackathon 2026**, problem statement 26059, for the Ministry of Earth
Sciences and the National Centre for Polar and Ocean Research.
