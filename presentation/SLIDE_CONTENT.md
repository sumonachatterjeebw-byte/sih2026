# SIH 2026 idea presentation — slide content

Copy-paste content for `SIH2026-IDEA-Presentation-Format.pptx`, six slides.

**Every number here was measured by the code in this repository**, not estimated. Where a figure
differs from the original blueprint, the measured one is used and the difference is stated.
Regenerate any of them with `python -m src.cli` or `python -m scripts.train`.

---

## Slide 1 — Title

- **Problem Statement ID:** 26059
- **Title:** AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory, and Navigation Decision Support System
- **Theme:** Transportation & Logistics
- **Category:** Software
- **Organisation:** Ministry of Earth Sciences (MoES) — National Centre for Polar and Ocean Research (NCPOR)
- **Solution name:** **POLAR-NAV AI**
- **Team name:** `[fill in]`
- **Team ID:** `[fill in]`

---

## Slide 2 — Proposed solution

**The problem, concretely.** Every austral summer NCPOR sends the Indian Scientific Expedition to
Antarctica to relieve **Maitri** and **Bharati**. The sailing window is about 90 days. Ice charts
are largely manual and 12 to 24 hours old. Getting it wrong means burning fuel ramming ice,
missing a relief window, or being beset — trapped as the ice closes around the hull.

**What POLAR-NAV AI does.** It plans **two** routes and sails both through identical physics: the
route a ship would take with no ice information, and the route the system recommends. The
difference between them is the benefit — measured, not asserted.

**Three engines, one decision:**

1. **Sea-ice forecasting** — concentration, thermodynamic thickness, drift, and the divergence
   field that predicts when a lead will close behind you.
2. **Iceberg trajectory** — RK4 momentum balance with deterioration and perturbed ensembles,
   giving an uncertainty envelope and closest-point-of-approach against the planned track.
3. **Risk-constrained routing** — IMO POLARIS as a hard constraint, Lindqvist ice resistance for
   the speed the ship can actually make, and a bridge console that re-plans when conditions change.

**What makes it different**

- **The saving is a measurement.** Two independent plans, one physics model, one subtraction. It
  is allowed to come out negative, and sometimes does.
- **Speed is an output, not an assumption.** Every route segment solves the power and propeller
  thrust balance for the speed that hull can achieve in that ice.
- **It works with no internet.** No map tiles, no cloud, no API keys — because below 60°S there
  is no geostationary coverage.

---

## Slide 3 — Technical approach

**Stack.** Python 3.11 · FastAPI · Pydantic v2 · NumPy · SciPy · scikit-learn · SQLite ·
React 18 · Vite · TypeScript · Tailwind · custom EPSG:3031 canvas map engine.

**Why these.** The polar science ecosystem is Python, so ingesting real ERA5 and OSI-SAF products
later means staying there. No GPU appears anywhere: the target hardware is a rugged PC on a
ship's bridge. And the map is written by hand because **Web Mercator is unusable at 70°S** and a
tile server is unreachable at sea.

```
        SATELLITE / REANALYSIS INPUTS
   Sentinel-1 SAR · AMSR2 · ERA5 · CMEMS · USNIC
                     |
        +------------+------------+
        v            v            v
     Sea ice     Weather      Icebergs
        |            |            |
        +------------+------------+
                     v
          PHYSICS + TRAINED MODELS
   ice forecast | RK4 drift | Lindqvist resistance
                     v
              IMO POLARIS RISK
                     v
        RISK-CONSTRAINED A* OPTIMISER
                     v
     ROUTE  +  RIO  +  ETA  +  FUEL  +  CO2
                     v
              BRIDGE CONSOLE
          alerts | re-route | ECDIS export
```

**Measured performance.** 106 automated tests. Route planning 12 s. Voyage tick 169 ms.
25,000 land-mask queries per second.

---

## Slide 4 — Feasibility and viability

**Technical.** Every production input is a mature, free, operationally-supported product:
OSI-SAF OSI-401-b, AMSR2, Sentinel-1, ECMWF ERA5/HRES, Copernicus Marine, USNIC. Nothing depends
on a commercial feed. CPU-only.

**Operational.** Regulation forbids installing unapproved software inside a type-approved ECDIS,
so the console runs on separate hardware and exports **GPX 1.1, GeoJSON and an S-411-shaped ice
overlay** over the ship's LAN as a read-only overlay.

**Communications.** Measured at **23.4 KB/day** against a 50 KB Iridium Certus budget — both
payloads are built, gzipped and the byte counts read, not estimated.

| Risk | What the build actually does |
| :--- | :--- |
| Polar night, cloud | SAR and passive microwave only; no optical product in the critical path |
| Bandwidth below 60°S | Contours and deltas, measured at 23.4 KB/day |
| A lead closes behind the ship | Drift divergence → compression index → route penalty and alert |
| Growlers invisible to satellites | Near-field radar layer that reports its own misses |
| Forecast wrong on arrival | Conditions resampled at actual arrival time; re-plan on constraint violation |
| Thickness unmeasurable tactically | Freezing-degree-day thermodynamics plus dynamic ridging |

---

## Slide 5 — Impact and benefits

**Measured across three legs** — each planned twice and both routes sailed through identical physics:

| Leg | Fuel saved | Transit time saved | Minimum RIO |
| :--- | ---: | ---: | :--- |
| Cape Town → Bharati | **+2.8%** | **413 h (17.2 days)** | 6 → **12** |
| Cape Town → Maitri | −8.0% | 169 h (7.0 days) | 5 → **10** |
| Hobart → Bharati | −2.4% | 151 h (6.3 days) | 9 → **12** |

**The honest headline is time and safety, not fuel.** On two of three legs the safe route burns
*more* fuel, because going around the ice adds distance. What it consistently buys is 6 to 17
days inside a 90-day window, and a better risk margin on every leg. Charter time is the dominant
cost of a polar resupply, so days are worth more than tonnes.

**Safety.** The optimiser will not route through ice POLARIS prohibits, or where the ship cannot
make way. In testing it lifted the closest approach to a 32 km tabular berg from 3.0 nm — inside
the berg — to 160 nm.

**A quantified case for India's own polar vessel.** Same passage, three hulls, in 1.5 m ice at
6/10 concentration:

| Vessel | Attainable speed |
| :--- | ---: |
| ORV Sagar Nidhi (NIOT, ice-strengthened) | **0.0 kn — beset** |
| MV Vasiliy Golovnin (current charter) | 2.6 kn |
| Notional Indian Polar Research Vessel (PC4) | **4.2 kn** |

**Environmental and strategic.** CO₂ reported per voyage at 3.206 kg per kg MGO; shorter transits
mean less time in Antarctic Specially Protected Areas. Open, auditable, offline-capable, no
foreign commercial dependency — supporting India's obligations under the **Antarctic Act, 2022**.

---

## Slide 6 — Research and references

**Open operational datasets**
- EUMETSAT OSI SAF **OSI-401-b** sea-ice concentration
- **AMSR2** (JAXA GCOM-W1) / University of Bremen ASI, 3.125 km
- ESA **Sentinel-1** C-band SAR, Level-1 GRD, Extra Wide swath
- ECMWF **ERA5** reanalysis and HRES forecasts
- Copernicus Marine **GLOBAL_ANALYSISFORECAST_PHY_001_024**
- **US National Ice Center** Antarctic iceberg database; BYU Center for Remote Sensing

**Standards and law**
- IMO **MSC.385(94)** — Polar Code
- IMO **MSC.1/Circ.1519** — POLARIS
- IHO **S-411** sea-ice product specification
- **Indian Antarctic Act, 2022**

**Literature**
1. Lindqvist, G. (1989). "A straightforward method for calculation of ice resistance of ships." *POAC 89*.
2. Bigg, G. R. et al. (1997). "Modelling the dynamics and thermodynamics of icebergs." *Cold Regions Sci. Tech.*
3. Rackow, T. et al. (2017). "A simulation of small to giant Antarctic iceberg evolution and drift." *JGR Oceans*.
4. Andersson, T. R. et al. (2021). "Seasonal Arctic sea ice forecasting with probabilistic deep learning (IceNet)." *Nature Communications*.
5. Timco, G. W. & Weeks, W. F. (2010). "A review of the engineering properties of sea ice." *Cold Regions Sci. Tech.*

---

## If a judge asks "what is actually AI here?"

Answer directly: **three models trained, one works.**

- **Growler vs sea-clutter classifier: works.** F1 **0.989**, ROC-AUC 0.999, against 0.702 for an
  SNR threshold. Used in the serving path.
- **Sea-ice forecaster: ties persistence, stays ~7% behind our physics forecast.** Not used — the
  API serves the physics.
- **Iceberg drift residual corrector: marginal** (+1.3% mean, −12.9% median). Not used.

Then say why that is the right answer: the physics is strong enough to carry the product, the
pipeline is real and retrains on Copernicus data by swapping a loader, and a team claiming three
working AI engines when one works should not be trusted with a ship.

**And state the limitation before you are asked:** the sea-ice and weather fields are *simulated*
stand-ins for ERA5/CMEMS/OSI-SAF. The physics, POLARIS tables, coastline and geodesy are real,
and every API response labels which is which.
