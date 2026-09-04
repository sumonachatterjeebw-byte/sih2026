# POLAR-NAV AI: Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System

[![SIH 2026](https://img.shields.io/badge/SIH-2026-blue.svg)](https://www.sih.gov.in/)
[![Problem ID](https://img.shields.io/badge/Problem%20ID-26059-orange.svg)](https://www.sih.gov.in/)
[![Organization](https://img.shields.io/badge/MoES-NCPOR-green.svg)](https://ncpor.res.in/)
[![IMO Polar Code](https://img.shields.io/badge/IMO-POLARIS%20Compliant-brightgreen.svg)](https://www.imo.org/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

An intelligent, physics-informed decision support platform developed for the **Ministry of Earth Sciences (MoES)** and the **National Centre for Polar and Ocean Research (NCPOR)** to safeguard Indian Antarctic Expeditions to **Maitri** and **Bharati** stations.

---

## 📌 Problem Statement Overview
* **Problem Statement ID:** `26059`
* **Title:** AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory, and Navigation Decision Support System
* **Theme:** Transportation & Logistics
* **Category:** Software
* **Organization:** Ministry of Earth Sciences (MoES) | National Centre for Polar and Ocean Research (NCPOR)
* **Target Vessels:** Ice-strengthened Polar Research & Logistics Ships (e.g. *MV Vasiliy Golovnin*, Arc7 / PC5–PC7)

---

## 🚀 Key Features & Capabilities

### 1. Spatiotemporal Sea-Ice Concentration (SIC) & Thickness Forecasting
* Fuses **ESA Sentinel-1 SAR (C-band)**, **AMSR2/SSMIS passive microwave**, and **ECMWF ERA5** atmospheric reanalysis.
* Forecasts 24-hour to 168-hour ice pack drift, lead openings, and coastal polynyas at 1–3 km resolution.

### 2. Physics-Informed Lagrangian Iceberg Drift Predictor (PINN)
* Tracks tabular icebergs and hazardous bergy bits across the Southern Ocean.
* Solves multi-component hydrodynamic & aerodynamic momentum balance:
  $$\\vec{F}_{\\text{total}} = \\vec{F}_{\\text{air drag}} + \\vec{F}_{\\text{water drag}} + \\vec{F}_{\\text{Coriolis}} + \\vec{F}_{\\text{sea surface slope}} + \\vec{F}_{\\text{wave radiation}}$$
* Residual neural network learns submerged keel area and form drag from drift history.

### 3. IMO POLARIS-Compliant Route Optimizer
* Implements the **Polar Operational Limit Assessment Risk Indexing System (IMO MSC.1/Circ.1519)**.
* Evaluates Risk Index Outcome ($RIO = \\sum C_i \\times RV_i$) dynamically inside a multi-objective $A^*$ graph search.
* Enforces hard constraints: $RIO \\ge 0$, eliminating besetting (ice entrapment) risks.

### 4. Lindqvist (1989) Ice Resistance Physics
* Models hull ice crushing ($R_c$), bending ($R_b$), and submergence ($R_s$) resistance based on vessel beam, draft, stem angle, and ice thickness.
* Calculates exact engine power requirements (kW) and fuel burn (kg/hr) to achieve **15% to 22% bunker fuel reduction**.

### 5. Edge-Native Shipboard Architecture (<50 KB/day)
* Operates seamlessly in extreme polar latitudes ($<60^\\circ\\text{S}$) over low-bandwidth **Iridium Certus** links.
* Local edge engine allows ship navigators to simulate tactical "what-if" detours offline.

---

## 🏛️ System Architecture

```
+-----------------------------------------------------------------------------------+
|                        CLOUD GEOSPATIAL PIPELINE (NCPOR HQ)                       |
|  - Ingestion: Sentinel-1 SAR, AMSR2, ERA5 Winds/Temp, CMEMS Ocean Currents        |
|  - AI Engines: Conv-U-Net SIC Forecaster + PINN Iceberg Drift Predictor           |
|  - Strategic Macro-Route Waypoint Generation                                      |
+------------------------------------------+----------------------------------------+
                                           |  Delta Vectors & Tensors (<50 KB / day)
                                           v  via MQTT over Iridium Certus
+-----------------------------------------------------------------------------------+
|                       SHIPBOARD EDGE CONSOLE (VESSEL BRIDGE)                      |
|  - ONNX Quantized Local Routing Engine (Offline capable)                          |
|  - Real-Time POLARIS RIO Calculator & Lindqvist Fuel Estimator                    |
|  - Marine X-Band Radar & Thermal Camera Growler Detection (YOLO Edge)             |
|  - Standard IHO S-411 / S-100 Vector Layers for Ship ECDIS                        |
+-----------------------------------------------------------------------------------+
```

---

## 📂 Repository Structure

```
.
├── README.md                      # Master documentation and quickstart
├── requirements.txt               # Dependencies
├── setup.py                       # Package definition
├── .env.example                   # Environment configuration
├── presentation/                  # SIH presentation slides and assets
│   ├── SIH2026-IDEA-Presentation-Format.pptx
│   ├── problem_statement_details.jpeg
│   └── SLIDE_CONTENT.md           # Slide-by-slide copy-paste content
├── docs/                          # Scientific & engineering documentation
│   ├── SIH_26059_Solution_Blueprint.md
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── POLAR_DATASETS_GUIDE.md
│   └── POLARIS_RISK_MANUAL.md
├── src/                           # Prototype Source Code
│   ├── cli.py                     # Interactive voyage simulator CLI
│   ├── core/                      # Mathematical & AI models
│   │   ├── polaris_risk.py        # IMO POLARIS RIO evaluation engine
│   │   ├── lindqvist_model.py     # Ship ice resistance formulation
│   │   ├── iceberg_tracker.py     # Lagrangian iceberg drift physics
│   │   └── route_optimizer.py     # Risk-constrained A* polar pathfinder
│   ├── data/                      # Geospatial loaders & mock polar fields
│   │   ├── mock_polar_data.py
│   │   └── data_loader.py
│   └── api/                       # REST API backend
│       └── main.py
└── tests/                         # Automated unit & integration tests
    ├── test_polaris.py
    ├── test_lindqvist.py
    ├── test_iceberg.py
    ├── test_route.py
    └── test_api.py
```

---

## 🛠️ Quickstart Guide

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/sumonachatterjeebw-byte/sih2026.git
cd sih2026

# Install dependencies
pip install -r requirements.txt
```

### 2. Run Interactive Expedition Simulation CLI
Simulate an ice-navigation passage from the Southern Ocean to Bharati Station in Prydz Bay:
```bash
python -m src.cli
```

### 3. Run Automated Tests
```bash
pytest tests/ -v
```

### 4. Launch FastAPI REST Server
```bash
uvicorn src.api.main:app --reload --port 8000
```
Open your browser at `http://localhost:8000/docs` for interactive Swagger API documentation.

---

## 📊 Scientific Literature & Standards
1. **IMO Polar Code (MSC.385(94)):** *International Code for Ships Operating in Polar Waters*.
2. **IMO POLARIS (MSC.1/Circ.1519):** *Polar Operational Limit Assessment Risk Indexing System*.
3. **Lindqvist, G. (1989):** *"A straightforward method for calculation of ice resistance of ships."* POAC 89.
4. **Andersson et al. (Nature Communications, 2021):** *"Seasonal Arctic sea ice forecasting with probabilistic deep learning (IceNet)."*
5. **Rackow et al. (JGR Oceans, 2018):** *"A simulation of small to giant Antarctic iceberg evolution and drift."*

---
Developed for **Smart India Hackathon 2026** | Dedicated to Indian Polar Research.
