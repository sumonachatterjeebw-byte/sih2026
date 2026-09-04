# IMO POLARIS Risk Assessment System Manual

## 1. Background
The **Polar Operational Limit Assessment Risk Indexing System (POLARIS)** was established by the International Maritime Organization (IMO Circular MSC.1/Circ.1519) to provide a standardized approach for evaluating ship operations in ice-covered waters under the Polar Code.

## 2. Risk Index Outcome (RIO) Formulation
RIO = sum_{i=1}^N (C_i * RV_i)

Where:
* C_i: Concentration of ice type i in tenths (integer 1 to 10, total sum <= 10).
* RV_i: Risk Value from the POLARIS Risk Value Matrix corresponding to the ship's Ice Class and ice type.

## 3. Polar Classes (IACS)
* **PC1:** Year-round operation in all polar waters
* **PC2:** Year-round operation in moderate multi-year ice conditions
* **PC3:** Year-round operation in second-year ice which may include multi-year ice inclusions
* **PC4:** Year-round operation in thick first-year ice which may include old ice inclusions
* **PC5:** Year-round operation in medium first-year ice which may include old ice inclusions
* **PC6:** Summer/autumn operation in medium first-year ice which may include old ice inclusions
* **PC7:** Summer/autumn operation in thin first-year ice which may include old ice inclusions

## 4. Operational Criteria
* **Normal Operation (RIO >= 0):** Ship may operate freely without icebreaker assistance.
* **Elevated Operational Risk (-10 <= RIO < 0):** Permitted only with reduced transit speed and ice navigator authorization.
* **Operation Prohibited (RIO < -10):** Extreme structural risk. Entry into the ice regime is legally prohibited.
