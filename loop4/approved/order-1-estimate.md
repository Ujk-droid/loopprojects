# Kamran Steel Works — Estimate for practice-orders/order-1.txt (Window + Gate + Grill)

Reviewed and approved 2026-08-18. Passed all four review rules: live rates, flagged assumptions, owner-set profit, reconciled arithmetic.

## 1. Rates (fetched live via `get_material_rate`, mwpbnp.com/pricing, 2026-08-18)

| Material | Site rate |
|---|---|
| 2" x 2" Square Pipe | Rs 2,500 / 20 RFT (18 SWG) |
| 1" x 2" Rectangular Pipe | Rs 2,051 / 20 RFT (18 SWG) |
| 1‑1/2" x 1‑1/2" Square Pipe | Rs 2,051 / 20 RFT (18 SWG) |
| 1/2" Square Bar | Rs 265/kg |
| MS Sheet/Plate (18 SWG) | Rs 7,904 / 8'x4' panel → Rs 247.00/sq ft |

⚠️ **ASSUMPTION**: 18 SWG used for all pipes — the order doesn't specify gauge; chosen to match the "18 Gauge" the order itself states for the gate sheet.

## 2. Material cost

| Item | Rate | Qty | Cost |
|---|---|---|---|
| 2"x2" pipe (Window frame 18' + Gate outer frame 34') | Rs 125.00/ft | 52 ft | Rs 6,500.00 |
| 1"x2" pipe (Window sash, 27'-4") | Rs 102.55/ft | 27.33 ft | Rs 2,803.03 |
| 1‑1/2"x1‑1/2" pipe (Gate inner frame) | Rs 102.55/ft | 46 ft | Rs 4,717.30 |
| 1/2" sq bar (Window grill 42 + Gate vertical 154 + Gate horizontal 60 + Grill 94) | Rs 102.267570/ft | 350 ft | Rs 35,793.65 |
| — of which Gate horizontal bars | Rs 102.267570/ft | 60 ft | Rs 6,136.05 |
| 18G Sheet (Gate face) | Rs 247.00/sq ft | 70 sq ft | Rs 17,290.00 |
| **MATERIAL SUBTOTAL** | | | **Rs 67,103.98** |

⚠️ **ASSUMPTION**: 1/2" square bar per-foot rate (Rs 102.267570/ft) is not a scraped rate — it's derived from the live Rs 265/kg rate via the standard mild-steel weight formula (kg/m = 0.00785 × diameter_mm² → kg/ft → × Rs/kg). Shown at full precision so this line reconciles exactly with its stated cost.

⚠️ **ASSUMPTION**: Gate horizontal bars — order's item 4 has no footage given; assumed 6 pcs @ 10'-0", based on the vertical-bar spacing pattern (22 pcs @ 7'-0").

⚠️ **ASSUMPTION**: 18G Sheet area — assumed full 10'x7' gate face (70 sq ft); size not stated in the order.

**Excluded entirely** (no data to assume from): hardware — hinges, aldrop, lock, handle.

## 3. Labour and electricity

| | |
|---|---|
| Labour days (Window 1 + Gate 2.5 + Grill 0.5) | 4 days |
| Daily rate | Rs 3,000/day |
| **Labour cost** | **Rs 12,000.00** |
| Electricity | **Rs 800.00** |

⚠️ **ASSUMPTION**: Labour days (4 days total) — estimated by job scope: Window 1 day, Gate 2.5 days, Grill 0.5 day.

⚠️ **ASSUMPTION**: Electricity Rs 800 — rough estimate (~Rs 200/day × 4 days) for welding/grinding power draw over the job.

## 4. Subtotal before profit

**Rs 79,903.98** (Material Rs 67,103.98 + Labour Rs 12,000.00 + Electricity Rs 800.00)

## 5. Profit (owner-set)

Owner-confirmed rate for this order: **37% of subtotal**
Profit = Rs 79,903.98 × 0.37 = **Rs 29,564.47**

## 6. Final total

**Rs 109,468.45**

## 7. Comparison to historical estimate

Historical: Rs 92,000 → Fresh total / Historical = **118.99%** (Rs 17,468.45 / 18.99% above historical)

The gap is largely explained by the two assumed items (gate horizontal bars + sheet, ~Rs 23,400 combined material before profit) that had no footage/size in the original order, plus hardware that isn't priced here at all — if the historical Rs 92,000 included a lighter sheet spec or fewer hardware items, that would account for most of the difference.
