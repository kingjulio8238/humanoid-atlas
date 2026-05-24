# Hardware Compare — data export for designer

Source data for a **Compare mode inside each of the 10 Hardware sub-tabs**. Within a tab, suppliers are
compared via **one flagship part each**. This folder holds one CSV per category (each becomes one Google
Sheet tab on import).

## Scope
- **45 entries** = one flagship part per supplier per category, third-party suppliers only.
- Excluded: in-house OEM parts (e.g. 1X Revo2), raw-material suppliers, AI-model partners, foundries.

## Files
| File | Category | Entries |
|---|---|---|
| 01_sensors_general.csv | Sensors | 9 |
| 02_compute.csv | Compute | 3 |
| 03_batteries.csv | Battery | 6 |
| 04_motors.csv | Motors | 6 |
| 05_reducers.csv | Reducers | 3 |
| 06_bearings.csv | Bearings | 3 |
| 07_actuators_rotary.csv | Actuators | 3 |
| 08_screws.csv | Screws | 3 |
| 09_end_effectors.csv | Hands | 5 |
| 10_pcbs.csv | PCBs | 4 |

## Columns
**Shared (pre-seeded from the Atlas dataset — do not edit):**
`Category`, `Supplier`, `Country`, `Supplier Type`, `Used By (OEMs)`

**To research (validated + sourced):**
`Flagship Part / Model`, category-specific spec columns, `Price (USD)`, `Availability / Status`,
`Source URL(s)`, `Validation Status`, `Notes`

### Per-category spec columns
- **Motors:** Motor Type, Peak Torque (Nm), Continuous Torque (Nm), Voltage / KV, Mass (g), Outer Diameter (mm)
- **Reducers:** Reducer Type, Gear Ratio, Rated Torque (Nm), Backlash (arc-sec), Mass (g)
- **Batteries:** Chemistry, Capacity (Wh), Nominal Voltage (V), Energy Density (Wh/kg), Form Factor
- **Bearings:** Bearing Type, Bore x OD (mm), Dynamic Load Rating (N), Mass (g)
- **Screws:** Screw Type, Lead / Ratio, Max Axial Load (N), Precision Grade, Length (mm)
- **Compute:** AI Perf (TOPS), TOPS/W, Memory, Power (W), Process Node
- **Sensors:** Sensor Type, Resolution / Range, FOV, Frame / Data Rate, Interface
- **Hands:** DOF, # Fingers, Payload (kg), Actuation, Mass (g)
- **Actuators:** Actuator Type, Peak Torque (Nm), Continuous Torque (Nm), Mass (g), Integrated Sensing
- **PCBs:** Function, Key Rating (V/A), Package, Interface

## Validation rules (strict)
1. **Flagship part** = the supplier's most representative real product line/model for humanoid robotics. Must be a documented, citable product.
2. **Every spec cell** must trace to a **primary source** (manufacturer datasheet or official product page) listed in `Source URL(s)`.
3. **Never guess.** If a value can't be validated from a primary source, leave it blank and say so in `Notes`.
4. `Validation Status`: `Validated` (part + all key specs primary-sourced) · `Partial` (some specs unverified — name them) · `Unverified` (part identity uncertain).
5. `Notes`: `Confirmed in <robot>` when a source confirms this exact part ships in a specific humanoid; otherwise `Representative product line`.
6. Keep exactly one row per supplier — do not add or remove rows.

## Status
Research complete (two passes: initial research + gap-closing) — **33 Validated · 12 Partial · 0 Unverified** across 45 parts. See the **Summary** tab in `hardware-compare.xlsx` for the scorecard. Every row has a real, sourced flagship part. The 12 Partial rows are part-validated; their remaining blank cells are specs the manufacturer does not publish (e.g. NPU TOPS/W, cell-level Wh/kg, per-model frameless-motor mass, dexterous-hand payload) — left blank per the strict no-guess rule, never estimated. Images are a later phase.
