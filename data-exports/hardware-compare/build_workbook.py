#!/usr/bin/env python3
"""Bundle the per-category CSVs into one Google-Sheets-ready .xlsx workbook."""
import csv, glob, os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

HERE = os.path.dirname(os.path.abspath(__file__))
TABS = {
    "01_sensors_general": "Sensors", "02_compute": "Compute", "03_batteries": "Battery",
    "04_motors": "Motors", "05_reducers": "Reducers", "06_bearings": "Bearings",
    "07_actuators_rotary": "Actuators", "08_screws": "Screws",
    "09_end_effectors": "Hands", "10_pcbs": "PCBs",
}
WIDE = {"Flagship Part / Model": 30, "Used By (OEMs)": 40, "Source URL(s)": 55,
        "Notes": 45, "Availability / Status": 22, "Description": 40}
WRAP = {"Used By (OEMs)", "Source URL(s)", "Notes"}
STATUS_FILL = {
    "Validated":  PatternFill("solid", fgColor="C6EFCE"),
    "Partial":    PatternFill("solid", fgColor="FFEB9C"),
    "Unverified": PatternFill("solid", fgColor="FFC7CE"),
}
STATUS_FONT = {
    "Validated":  Font(color="006100"), "Partial": Font(color="9C6500"),
    "Unverified": Font(color="9C0006"),
}
HDR_FILL = PatternFill("solid", fgColor="2F3640")
HDR_FONT = Font(bold=True, color="FFFFFF")
THIN = Side(style="thin", color="D0D0D0")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

wb = Workbook()
wb.remove(wb.active)

# --- Summary tab (built after we read counts) ---
summary = wb.create_sheet("Summary")
totals = {"Validated": 0, "Partial": 0, "Unverified": 0}
per_cat_counts = []
flagged = []  # (category, supplier, status, note)

for stem, tab in TABS.items():
    path = os.path.join(HERE, f"{stem}.csv")
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))
    hdr, body = rows[0], rows[1:]
    ws = wb.create_sheet(tab)
    si = hdr.index("Validation Status")
    sup_i = hdr.index("Supplier"); note_i = hdr.index("Notes")
    cat_counts = {"Validated": 0, "Partial": 0, "Unverified": 0}
    ws.append(hdr)
    for r in body:
        ws.append(r)
        st = (r[si] or "").strip()
        if st in cat_counts:
            cat_counts[st] += 1; totals[st] += 1
        if st in ("Unverified", "Partial"):
            flagged.append((tab, r[sup_i], st, r[note_i]))
    per_cat_counts.append((tab, len(body), cat_counts))
    # style header
    for c in range(1, len(hdr) + 1):
        cell = ws.cell(1, c); cell.fill = HDR_FILL; cell.font = HDR_FONT
        cell.alignment = Alignment(vertical="center")
        ws.column_dimensions[get_column_letter(c)].width = WIDE.get(hdr[c - 1], 16)
    # style body
    for ri in range(2, len(body) + 2):
        for c in range(1, len(hdr) + 1):
            cell = ws.cell(ri, c); cell.border = BORDER
            cell.alignment = Alignment(vertical="top", wrap_text=hdr[c - 1] in WRAP)
        sc = ws.cell(ri, si + 1); st = (sc.value or "").strip()
        if st in STATUS_FILL:
            sc.fill = STATUS_FILL[st]; sc.font = STATUS_FONT[st]
    ws.freeze_panes = "B2"

# --- fill Summary tab ---
title = summary.cell(1, 1, "Humanoid Atlas — Hardware Compare")
title.font = Font(bold=True, size=14)
summary.cell(2, 1, "One flagship part per third-party supplier, per Hardware sub-tab. "
                   "Every spec is primary-sourced; unverifiable cells are left blank.")
summary.cell(4, 1, "Category").font = Font(bold=True)
for j, h in enumerate(["Category", "Parts", "Validated", "Partial", "Unverified"]):
    c = summary.cell(4, j + 1, h); c.font = HDR_FONT; c.fill = HDR_FILL
row = 5
for tab, n, cc in per_cat_counts:
    summary.cell(row, 1, tab); summary.cell(row, 2, n)
    summary.cell(row, 3, cc["Validated"]); summary.cell(row, 4, cc["Partial"])
    summary.cell(row, 5, cc["Unverified"]); row += 1
tcell = [summary.cell(row, 1, "TOTAL"), summary.cell(row, 2, sum(p[1] for p in per_cat_counts)),
         summary.cell(row, 3, totals["Validated"]), summary.cell(row, 4, totals["Partial"]),
         summary.cell(row, 5, totals["Unverified"])]
for c in tcell: c.font = Font(bold=True)
row += 2
summary.cell(row, 1, "Needs attention (Unverified / Partial)").font = Font(bold=True); row += 1
for j, h in enumerate(["Category", "Supplier", "Status", "Note"]):
    c = summary.cell(row, j + 1, h); c.font = HDR_FONT; c.fill = HDR_FILL
row += 1
for cat, sup, st, note in sorted(flagged, key=lambda x: (x[2] != "Unverified", x[0])):
    summary.cell(row, 1, cat); summary.cell(row, 2, sup)
    sc = summary.cell(row, 3, st)
    if st in STATUS_FILL: sc.fill = STATUS_FILL[st]; sc.font = STATUS_FONT[st]
    summary.cell(row, 4, note); row += 1
for col, w in zip("ABCD", (16, 26, 12, 80)):
    summary.column_dimensions[col].width = w
summary.freeze_panes = "A5"

out = os.path.join(HERE, "hardware-compare.xlsx")
wb.save(out)
print("Wrote", out, "with tabs:", ", ".join(["Summary"] + list(TABS.values())))
print("Totals:", totals, "| flagged rows:", len(flagged))
