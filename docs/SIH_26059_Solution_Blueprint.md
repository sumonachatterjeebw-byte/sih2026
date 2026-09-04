# POLAR-NAV AI: Decision Support System for Antarctic Sea-Ice, Iceberg Trajectory & Navigation
**Smart India Hackathon 2026 — Comprehensive Solution Blueprint & Technical Documentation**

---

> ## ADDENDUM: measured results supersede the projected figures below
>
> This blueprint was written before the system was built. The prototype now exists, it runs, and
> it measures its own performance. **Where a number below disagrees with a number the code
> produces, the code is right and this document is out of date.** Present the measured figures.
>
> | Claim in this blueprint | What the built system actually measures |
> | :--- | :--- |
> | 15–22% bunker fuel reduction | **Not reproduced. Measured fuel saving is +2.8% to −8.0% depending on the leg, and on two of three legs the safe route burns MORE fuel than the ice-blind one.** The figure is now derived by planning two routes and sailing both through identical physics, then differencing, so it is allowed to come out negative. The real, consistent benefit is **151 to 413 hours of transit time saved** and a better minimum RIO on every leg. Present time and safety, not fuel. |
> | 2–4 days saved per leg | **Understated, and this is the strongest measured result.** Cape Town to Bharati saves 413 hours (17.2 days), Cape Town to Maitri 169 hours (7.0 days), Hobart to Bharati 151 hours (6.3 days). Minimum RIO improves on every leg: 6→12, 5→10, 9→12. |
> | Zero besetting events | The planner enforces `RIO >= -10` and rejects any cell where the ship cannot make way. It cannot promise zero besetting in the real world, and it should not be presented as doing so. |
> | Physics-Informed Neural Network for iceberg drift | **Implemented as a residual corrector on an RK4 physics core, not a PINN** — the governing equation is not part of the loss function. It is also currently a *negative result*: it does not reliably improve on pure physics. See `docs/ML_MODELS.md`. |
> | Conv-U-Net / IceNet-architecture SIC forecaster | **Not built.** The shipped forecaster is a semi-Lagrangian physics scheme that beats persistence by +0.08 to +0.17 across 24–168 h. A gradient-boosted learned model was trained and *does not beat it*, and is not used. A U-Net becomes the right tool when real satellite rasters replace the synthetic fields. |
> | Edge YOLO growler detection | **Implemented as a trained tabular classifier on radar-return features** (F1 0.989 against 0.701 for an SNR threshold), not a YOLO detector on imagery. The distinction is stated rather than blurred. |
> | `<50 KB/day` over Iridium Certus | **Confirmed by measurement: 23.4 KB/day.** Both payloads are serialised and gzipped, and the byte counts are real. |
>
> **What is real, and what is simulated.** The ship physics, the IMO POLARIS risk tables, the
> Antarctic coastline, the station coordinates and the geodesy are real. The sea-ice, wind,
> current and wave fields are physically-shaped *simulations* standing in for OSI-SAF, AMSR2,
> Sentinel-1, ERA5 and CMEMS. Every API response carrying a simulated field says so. All
> reported skill is therefore simulated-environment skill, and must be described that way.
>
> See `README.md` for the full picture and `docs/ML_MODELS.md` for the training detail.

---

## 1. Problem Statement & Operational Context

| Parameter | Details |
| :--- | :--- |
| **Problem Statement ID** | `26059` |
| **Problem Statement Title** | AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory, and Navigation Decision Support System |
| **Organization** | Ministry of Earth Sciences (MoES) |
| **Department** | National Centre for Polar and Ocean Research (NCPOR) |
| **Category** | Software |
| **Theme** | Transportation & Logistics |
| **Target Vessel Profile** | Polar Research & Logistics Vessels (e.g., *MV Vasiliy Golovnin*, Arc7 / PC5–PC7 ice-strengthened) |
| **Mission Destinations** | **Maitri Station** (Schirmacher Oasis, Princess Astrid Coast) & **Bharati Station** (Larsemann Hills, Prydz Bay) |

### Real-World Operational Context
Every austral summer (November to April), NCPOR dispatches the Indian Antarctic Expedition from Cape Town / Goa across the Southern Ocean (Roaring Forties, Furious Fifties, Screaming Sixties). Ships encounter seasonal pack ice, severe katabatic storms, dynamic leads, compressive ice pressure, and calved tabular icebergs from the Amery and surrounding ice shelves. Unplanned detours, ice besetting (getting trapped), or slow continuous ram-breaking consume millions of litres of Marine Gas Oil (MGO), risk hull compromise, and delay critical personnel/cargo transfer to India's stations.

---

## 2. Official SIH Slide-by-Slide Presentation Content

The following sections are formatted specifically for direct insertion into `SIH2026-IDEA-Presentation-Format.pptx` (Slides 1 to 6).

### SLIDE 1: TITLE PAGE
* **Problem Statement ID:** 26059
* **Problem Statement Title:** AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory, and Navigation Decision Support System
* **Theme:** Transportation & Logistics
* **Category:** Software
* **Proposed Solution Name:** **POLAR-NAV AI** *(Polar Ocean Logistics, Iceberg-Tracking & Autonomous Routing Intelligence System)*
* **Organization:** Ministry of Earth Sciences (MoES) — National Centre for Polar and Ocean Research (NCPOR)
* **Team ID:** `[Your Team ID]`
* **Team Name:** `[Your Registered Team Name]`

---

### SLIDE 2: PROPOSED SOLUTION (Idea / Solution / Prototype)

#### 1. Detailed Explanation of the Proposed Solution
* **Dual-Tier Architecture:** A high-throughput **Cloud Geospatial AI Pipeline** (at NCPOR HQ) coupled with an offline-capable **Shipboard Edge Decision Console** installed on the vessel's bridge.
* **Three Synchronized AI Engines:**
  1. **Sea-Ice Concentration (SIC) & Dynamics Forecaster:** Generates 24-hour to 168-hour spatiotemporal forecasts of ice edge, leads, and concentration grids at 1–3 km spatial resolution.
  2. **Physics-Informed Iceberg Drift Engine:** Tracks tabular and fragmenting icebergs, estimating 72-hour drift trajectories using hydrodynamic and aerodynamic forcing coupled with Kalman filtering.
  3. **POLARIS-Compliant Route Optimizer:** Computes multi-objective Pareto-optimal paths balancing safety, fuel burn, mechanical wear, and transit time.

#### 2. How It Addresses the Problem
* **Eliminates Analysis Latency:** Replaces 12-to-24-hour manual ice-chart generation with automated 15-minute near-real-time (NRT) satellite inference.
* **Prevents Vessel Besetting:** Forecasts convergent ice pressure fields to prevent ships from entering closing leads.
* **Solves Polar Connectivity Bottlenecks:** Operates seamlessly over low-bandwidth satellite links (Iridium Certus) via an edge-first delta-compression protocol (<50 KB/day).

#### 3. Innovation and Uniqueness
* **Physics-Informed Neural Network (PINN) for Icebergs:** Melds Navier-Stokes/Lagrangian drift mechanics with deep learning to handle missing satellite observations during heavy weather.
* **Native IMO POLARIS Integration:** Embedded calculation of Risk Index Outcomes (RIO) directly inside the Dijkstra/$A^*$ cost function.
* **Dual-Horizon Safety:** Bridges macro-scale satellite routing (1,000 km transit) with micro-scale shipboard radar/thermal growler detection (3 nautical miles).

---

### SLIDE 3: TECHNICAL APPROACH

#### 1. Technology Stack
* **AI & Numerical Modeling:** PyTorch, PyTorch Geometric, ConvLSTM / Temporal Fusion Transformer / U-Net (IceNet architecture), SciPy, ONNX Runtime (INT8/FP16 quantized).
* **Geospatial & Polar Data Engine:** GDAL, Rasterio, Xarray, NetCDF4, GeoPandas, Cartopy (Antarctic Polar Stereographic projection: `EPSG:3031`).
* **Backend, APIs & Optimization:** C++17 / Rust (Core $A^*$ graph search), Python FastAPI, Celery, Redis, Docker, SQLite/Zarr local database.
* **Visualization & Bridge UI:** React.js, Deck.gl, CesiumJS (4D polar terrain & sea-ice rendering), Mapbox GL, TailwindCSS.
* **Maritime Protocols & Comms:** IHO S-411 / S-100 formats, NMEA-0183/2000 sensor ingestion, MQTT over Iridium Certus.

#### 2. System Architecture & Methodology Flow

```
+-----------------------------------------------------------------------------------+
|                           1. MULTI-MODAL DATA INGESTION                           |
|  - ESA Sentinel-1 C-Band SAR (GRD, NRT orbit-to-hub ~2h, day/night penetrating)   |
|  - AMSR2 / SSMIS Passive Microwave (Daily polar coverage at 3.125 - 10 km)       |
|  - ECMWF ERA5 & GFS (10m wind vectors, surface air temp, mean sea-level pressure) |
|  - Copernicus Marine CMEMS / HYCOM (Subsurface currents, sea surface temp)        |
|  - US National Ice Center (USNIC) & Sentinel SAR Iceberg Logs                     |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                  2. HARMONIZATION & POLAR PROJECTION (EPSG:3031)                  |
|  - Radiometric calibration, speckle filtering, landmasking, temporal alignment   |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                            3. TRI-CORE AI ENGINE                                  |
|  [Module A: Spatiotemporal SIC Forecaster]                                        |
|   - Multi-scale Conv-U-Net + Temporal Attention (24h - 168h forecast grids)       |
|  [Module B: Physics-Informed Lagrangian Iceberg Drift]                            |
|   - F_total = F_air_drag + F_water_drag + F_coriolis + F_slope + F_wave           |
|  [Module C: Polar Risk Calculator (IMO POLARIS)]                                  |
|   - Evaluates Ice Numerals (IN) & Risk Index Outcome: RIO = sum(C_i * RV_i) >= 0  |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|               4. MULTI-OBJECTIVE WEATHER & ICE ROUTE OPTIMIZER                    |
|  - Risk-Constrained 3D A* / Genetic Algorithm                                      |
|  - Ice Resistance Penalty: Lindqvist Empirical Formulation                        |
|  - Minimizes: Objective = w1*(Fuel_Burn) + w2*(Time) + w3*(Ice_Risk_Penalty)      |
+------------------------------------------+----------------------------------------+
                                           |
                    +----------------------+----------------------+
                    v                                             v
+--------------------------------------+      +-------------------------------------+
|      HQ SHORE COMMAND (CLOUD)        |      |    SHIPBOARD BRIDGE CONSOLE (EDGE)  |
|  - Fleet-wide strategic monitoring   |      |  - Local offline routing & what-ifs |
|  - Full-resolution hindcast/forecast |      |  - ECDIS S-411 overlay integration  |
|  - Expedition planning analytics     |      |  - Compressed delta sync (<50 KB)   |
+--------------------------------------+      +-------------------------------------+
```

---

### SLIDE 4: FEASIBILITY AND VIABILITY

#### 1. Feasibility Analysis
* **Technical Feasibility:** Relies exclusively on mature, freely accessible open data streams (Copernicus, NSIDC, ECMWF) with guaranteed operational uptime. Models are quantized via ONNX Runtime to execute on rugged marine bridge PCs without heavy GPU racks.
* **Operational Feasibility:** Seamlessly produces standard IHO S-411 / S-100 format vector overlays and GPX/GeoJSON waypoints that load into primary Electronic Chart Display and Information Systems (ECDIS).
* **Economic Feasibility:** Eliminates recurrent commercial weather routing subscriptions (typically \$30,000–\$60,000 per voyage) and uses an open-source software stack.

#### 2. Potential Challenges, Risks, and Mitigations

| Risk / Challenge | Operational Impact | Technical Mitigation Strategy |
| :--- | :--- | :--- |
| **Polar Night & Cloud Cover** | Blind optical sensors (MODIS/Sentinel-2) for months. | **Primary reliance on Sentinel-1 C-band SAR and AMSR2 microwave**, unaffected by cloud cover, blizzards, or 24h darkness. |
| **Severe Bandwidth Limits (<60°S)** | Iridium Certus at 128 kbps makes downloading raster maps impossible. | **Edge-native computing:** Send only compressed mathematical vector contours and waypoint coordinates (<50 KB/day); shipboard PC computes local routes offline. |
| **Undetected "Growlers" (<5m)** | Small ice blocks submerge below satellite resolution; risk hull puncturing. | **Macro-to-Micro fusion:** Macro satellite guidance routed to bridge; onboard X-band marine radar and optical/thermal sensors run edge YOLO detection for immediate 3-mile perimeter. |
| **Rapid Lead Closing (Pressure)** | Compressive ice forces can crush or beset vessels in 30 minutes. | **Ice Divergence Criterion ($\nabla \cdot \vec{v}_{\text{ice}}$):** Route planner explicitly penalizes convergent ice regimes where onshore/katabatic winds create compressive pressure. |

---

### SLIDE 5: IMPACT AND BENEFITS

#### 1. Direct Impact on Target Audience
* **National Centre for Polar and Ocean Research (NCPOR / MoES):** Mission assurance for annual Indian Antarctic Expeditions; guaranteed logistics delivery windows to Maitri and Bharati.
* **Expedition Leaders & Ice Navigators:** Replaces subjective visual lookout and stale ice charts with quantitative probabilistic risk maps and optimized course recommendations.

#### 2. Multi-Dimensional Benefits

```
+-----------------------------------------------------------------------------------+
|                               KEY METRIC HIGHLIGHTS                               |
|   15% - 22% Fuel Reduction  |  2 - 4 Days Saved per Leg  |  Zero Besetting Events |
+-----------------------------------------------------------------------------------+
```

* **Economic Benefits:**
  * **Bunker Fuel Savings:** Saves 15–22% in Marine Gas Oil (MGO) consumption by identifying natural open water leads and polynyas, avoiding fuel-intensive ice ramming.
  * **Financial ROI:** Estimated savings of **₹1.2 to ₹2.5 Crores per expedition** in fuel burn, vessel charter demurrage charges, and potential hull repairs.
* **Environmental & Regulatory Benefits:**
  * **Emission Cuts:** Mitigates hundreds of tonnes of $CO_2$, $SO_x$, and toxic black carbon emissions in pristine Antarctic Specially Protected Areas (ASPAs).
  * **Mandatory Compliance:** Adheres strictly to the Antarctic Treaty Environmental Protocol and the IMO Polar Code heavy fuel oil (HFO) carriage ban.
* **National & Strategic Value:**
  * Secures the lives of scientific wintering teams by guaranteeing timely autumn extraction and spring resupply.
  * Bolsters India's technological autonomy and polar research credentials under the **Indian Antarctic Act, 2022**.

---

### SLIDE 6: RESEARCH AND REFERENCES

#### 1. Open Operational Datasets
* **Copernicus Marine Service (CMEMS):** Global Ocean Physics Analysis & Forecasting (0.083° resolution), Sea Ice Concentration (OSI-SAF OSI-401-b).
* **ESA Copernicus Open Access Data Hub:** Sentinel-1 Synthetic Aperture Radar (SAR) Level-1 GRD products.
* **NASA / NSIDC:** Nimbus-7 SMMR & DMSP SSMIS Passive Microwave Daily Sea Ice Concentration grids.
* **ECMWF Reanalysis v5 (ERA5):** Hourly atmospheric wind vectors ($u_{10}, v_{10}$), 2-meter air temperature, sea surface temperature (SST).
* **US National Ice Center (USNIC):** Antarctic Iceberg Tracking Database (tabular bergs $\ge 10$ nautical miles).

#### 2. Regulatory Codes & Standards
* **IMO Resolution MSC.385(94) / MEPC.264(68):** *International Code for Ships Operating in Polar Waters (Polar Code)*.
* **IMO MSC.1/Circ.1519:** *Polar Operational Limit Assessment Risk Indexing System (POLARIS)*.
* **International Hydrographic Organization (IHO):** *S-411 Sea Ice Product Specification* for ECDIS.

#### 3. Foundational Literature
* Andersson, T. R., et al. (2021). "Seasonal Arctic sea ice forecasting with probabilistic deep learning." *Nature Communications*, 12(1), 5124.
* Rackow, T., et al. (2018). "A simulation of small to giant Antarctic iceberg evolution and drift." *Journal of Geophysical Research: Oceans*, 123(4), 2756-2770.
* Lindqvist, G. (1989). "A straightforward method for calculation of ice resistance of ships." *POAC 89*, Luleå, Sweden, pp. 722-735.
* Riska, K., et al. (1997). "Performance of merchant vessels in ice in the Baltic." *Winter Navigation Research Board*, Research Report No. 52.

---

## 3. Deep-Dive Mathematical & Algorithmic Formulations

### 3.1 Sea-Ice Resistance Model (Lindqvist Formulation)
When a vessel navigates through level or broken sea-ice, the total resistance $R_{\text{ice}}$ opposing the ship's propulsion is expressed as:
$$R_{\text{ice}} = R_c + R_b + R_s$$
Where:
* $R_c$: Resistance due to crushing at the stem:
  $$R_c = 0.5 \cdot \sigma_b \cdot H_{\text{ice}}^2 \cdot \frac{\tan \phi + \mu \cos \phi / \sin \alpha}{\cos \alpha}$$
* $R_b$: Resistance due to bending and breaking the ice sheet:
  $$R_b = 0.003 \cdot E \cdot H_{\text{ice}}^{1.5} \cdot B \cdot \left( \frac{\tan \psi}{\cos \phi} \right)$$
* $R_s$: Resistance due to submergence of broken ice blocks along the hull:
  $$R_s = (\rho_w - \rho_{\text{ice}}) \cdot g \cdot H_{\text{ice}} \cdot B \cdot T \cdot \left( \frac{B + T}{B + 2T} \right) \cdot \left( 1 + 2\mu \frac{L}{B} \right)$$
* Parameters: $H_{\text{ice}}$ = ice thickness, $\sigma_b$ = flexural strength, $\mu$ = hull friction coefficient, $B$ = beam, $T$ = draft, $L$ = length, $\phi, \alpha, \psi$ = hull angles.

### 3.2 Physics-Informed Lagrangian Iceberg Drift Equation
For an iceberg of mass $M$ and added mass $M_a$, the governing momentum balance is:
$$(M + M_a)\frac{d\vec{v}_{\text{berg}}}{dt} = \vec{F}_a + \vec{F}_w + \vec{F}_c + \vec{F}_p + \vec{F}_r$$
Where:
* **Air Drag ($\vec{F}_a$):** $\frac{1}{2} \rho_a C_a A_a |\vec{v}_{\text{wind}} - \vec{v}_{\text{berg}}|(\vec{v}_{\text{wind}} - \vec{v}_{\text{berg}})$
* **Water Drag ($\vec{F}_w$):** $\frac{1}{2} \rho_w C_w A_w |\vec{v}_{\text{current}} - \vec{v}_{\text{berg}}|(\vec{v}_{\text{current}} - \vec{v}_{\text{berg}})$
* **Coriolis Force ($\vec{F}_c$):** $-(M + M_a) f (\hat{k} \times \vec{v}_{\text{berg}})$, with Coriolis parameter $f = 2\Omega \sin(\text{lat})$
* **Sea Surface Slope ($\vec{F}_p$):** $-M g \nabla \eta$ (driven by geopotential height gradients)
* **Wave Radiation Stress ($\vec{F}_r$):** $\frac{1}{2} \rho_w g a_{\text{wave}}^2 L_{\text{berg}} \cos(\theta_{\text{wave}})$
* **PINN Residual Learning:** The neural network estimates the time-varying, unknown keel area $A_w$, sail area $A_a$, and form drag coefficients $C_w, C_a$ based on observed drift track deltas.

### 3.3 IMO POLARIS Risk Index Outcome (RIO)
For an ice regime consisting of $N$ ice types, the Risk Index Outcome is calculated as:
$$RIO = \sum_{i=1}^N \left( C_i \times RV_i \right)$$
* $C_i$: Ice concentration of ice type $i$ in tenths (1 to 10).
* $RV_i$: Risk Value from the POLARIS matrix corresponding to the vessel's Ice Class (e.g. PC4, PC5, Arc7).
* **Navigation Decision Criteria:**
  * $RIO \ge 0$: Operation permitted without operational restrictions.
  * $-10 \le RIO < 0$: Operation restricted; requires reduced speed and special ice-navigator sign-off.
  * $RIO < -10$: Operation strictly prohibited (extreme structural damage/besetting hazard).

---

## 4. Evaluator Defense Guide: Anticipated Questions & Winning Answers

### Question 1: "How do you know the ice thickness (SIT) if satellite SAR only measures surface backscatter?"
* **Answer:** "Direct altimetry satellites (CryoSat-2 / ICESat-2) have narrow ground swaths and repeat cycles unsuitable for tactical navigation. We resolve this by using a **Thermodynamic Proxy Model**: we integrate **Freezing Degree Days (FDD)** from ERA5 surface temperatures with thermodynamic growth equations (Stefan's Law) and combine it with historical ice-age tracking and numerical sea-ice model outputs from CMEMS. This yields a reliable dynamic mechanical strength and thickness proxy without requiring real-time altimetry."

### Question 2: "What if a lead appears open on a satellite pass, but katabatic winds close it 30 minutes later?"
* **Answer:** "Our path planner does not treat open water leads as static corridors. We compute the **Ice Drift Divergence Field ($\nabla \cdot \vec{v}_{\text{ice}}$)** derived from high-resolution wind stress and ocean current vectors. Paths are strictly penalized if they intersect **convergent ice regimes** ($\nabla \cdot \vec{v} < 0$), where compressive pressure creates rapid lead closure and ridging. The algorithm prioritizes divergent or stable shear zones."

### Question 3: "How do you detect sub-surface growlers that radar clutter and satellites miss?"
* **Answer:** "We implement a **two-tier macro/micro safety buffer**. Satellite and hydrodynamic models provide the strategic macro-route (100–1,000 km) avoiding major ice fields and tabular bergs. For near-field tactical hazards within 3 nautical miles, the shipboard console ingests raw data from the ship's marine X-band radar and bridge optical/thermal sensors, applying edge YOLO computer vision to alert the bridge officer to small growlers with minimal freeboard."

### Question 4: "Maritime regulations forbid installing unauthorized software into an official ECDIS. How does this work on a real bridge?"
* **Answer:** "POLAR-NAV is not installed inside the certified ECDIS computer. It operates on an independent, ruggedized **Auxiliary Tactical Decision Support Console (ECS)** on the navigation bridge. For ECDIS integration, our system exports standardized **IHO S-411 (Sea Ice Data) and S-100 vector layers** via the shipboard LAN, which the primary ECDIS loads natively as a read-only situational overlay in full compliance with IEC 61174 standards."

---

## 5. Development Roadmap for SIH Grand Finale

| Phase | Milestone | Deliverables |
| :--- | :--- | :--- |
| **Phase 1 (Weeks 1–3)** | Data Pipeline & Preprocessing | Automated scripts for Copernicus Sentinel-1, AMSR2, and ERA5 ingestion; EPSG:3031 polar projection pipeline. |
| **Phase 2 (Weeks 4–6)** | Model Training & Validation | Conv-U-Net for SIC prediction; Lagrangian drift model benchmarked against USNIC historical iceberg drift tracks. |
| **Phase 3 (Weeks 7–9)** | Routing Engine & POLARIS Integration | Risk-constrained $A^*$ algorithm in Python/C++; Lindqvist ice resistance cost modeling; S-411 vector export. |
| **Phase 4 (Weeks 10–12)** | Bridge UI & Edge Deployment | CesiumJS/Deck.gl 4D interactive dashboard; ONNX quantization; delta-compression telemetry pipeline demo. |
