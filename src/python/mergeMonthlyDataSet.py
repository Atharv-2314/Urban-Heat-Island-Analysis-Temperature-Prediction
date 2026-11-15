
import pandas as pd
from pathlib import Path

# --------------------------------------------------
# 1. FOLDER PATH
# --------------------------------------------------

folder_path = Path(
    r"C:\Users\Atharv Kumar\OneDrive - Chargepal\Desktop\College\3rd Year\5th sem\Data Science\Project\UHI_MontlyDataset"
)

# --------------------------------------------------
# 2. FIND ALL YEARLY CSV FILES
# --------------------------------------------------

csv_files = sorted(
    file for file in folder_path.glob("*.csv")
    if "merged" not in file.stem.lower()
)

if not csv_files:
    raise FileNotFoundError("No CSV files found in the specified folder.")

# --------------------------------------------------
# 3. READ AND MERGE FILES
# --------------------------------------------------

dataframes = []

print("YEARLY FILE DETAILS")
print("-" * 50)

for file in csv_files:
    df = pd.read_csv(file)

    print(f"{file.name}: {len(df)} rows")

    dataframes.append(df)

merged_df = pd.concat(dataframes, ignore_index=True)

# --------------------------------------------------
# 4. SORT DATA
# --------------------------------------------------

if {"Year", "Month"}.issubset(merged_df.columns):
    merged_df = merged_df.sort_values(
        by=["Year", "Month", "City"],
        kind="stable"
    ).reset_index(drop=True)

# --------------------------------------------------
# 5. REMOVE DUPLICATE ROWS
# --------------------------------------------------

initial_rows = len(merged_df)

merged_df = merged_df.drop_duplicates().reset_index(drop=True)

duplicates_removed = initial_rows - len(merged_df)

# --------------------------------------------------
# 6. SAVE MERGED DATASET
# --------------------------------------------------

output_path = folder_path / "UHI_MonthlyDataset_Merged.csv"

merged_df.to_csv(output_path, index=False)

# --------------------------------------------------
# 7. SUMMARY
# --------------------------------------------------

print("\nMERGING SUMMARY")
print("-" * 50)

print("Files merged:", len(csv_files))
print("Rows before duplicate removal:", initial_rows)
print("Duplicates removed:", duplicates_removed)
print("Final rows:", len(merged_df))
print("Total columns:", len(merged_df.columns))
print("Output file:", output_path)

if "Year" in merged_df.columns:
    print("\nYear-wise row counts:")
    print(merged_df["Year"].value_counts().sort_index())

print("\nDataset merged successfully!")