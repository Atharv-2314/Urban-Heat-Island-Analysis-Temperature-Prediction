
import pandas as pd
from pathlib import Path
import re

# ------------------------------------------------------------
# 1. FOLDER PATHS
# ------------------------------------------------------------

input_folder = Path(
    r"C:\Users\Atharv Kumar\OneDrive - Chargepal\Desktop\College\3rd Year\5th sem\Data Science\Project\UHI_PixelDataset\UHI_Pixel_Data"
)

output_folder = input_folder.parent / "uhi_pixel_citywise_dataset"

# Create output folder if it does not exist
output_folder.mkdir(parents=True, exist_ok=True)


# ------------------------------------------------------------
# 2. CITY NAMES
# ------------------------------------------------------------

cities = [
    "Ahmedabad", "Jaipur", "Jodhpur", "Gandhinagar",
    "Mumbai", "Chennai", "Kochi", "Mangaluru",
    "Bengaluru", "Hyderabad", "Pune", "Mysuru",
    "Delhi", "Lucknow", "Kanpur", "Patna",
    "Kolkata", "Bhubaneswar", "Guwahati", "Siliguri",
    "Nagpur", "Indore", "Bhopal", "Udaipur",

    "Cairo", "Riyadh", "Madrid", "London",
    "Beijing", "Tokyo", "New York", "Los Angeles",
    "Mexico City", "Sao Paulo", "Nairobi", "Sydney",
    "Seoul", "Dhaka", "Sapporo", "Budapest",
    "Helsinki", "Montreal"
]


# Remove spaces and special characters for matching filenames
def normalize_name(name):
    return re.sub(r"[^a-zA-Z0-9]", "", name).lower()


# Map normalized city names to their original names
city_lookup = {
    normalize_name(city): city
    for city in cities
}


# ------------------------------------------------------------
# 3. FIND AND GROUP YEARLY FILES
# ------------------------------------------------------------

city_files = {city: [] for city in cities}

csv_files = list(input_folder.glob("*.csv"))

print("TOTAL CSV FILES FOUND:", len(csv_files))
print("-" * 60)

unrecognized_files = []

for file in csv_files:

    # Expected filename:
    # UHI_Grid_CityName_2016.csv
    # UHI_Grid_NewYork_2016.csv

    filename = file.stem

    match = re.match(
        r"^UHI_Grid_(.+)_(20\d{2})$",
        filename,
        flags=re.IGNORECASE
    )

    if not match:
        unrecognized_files.append(file.name)
        continue

    city_part = match.group(1)
    year = int(match.group(2))

    normalized_city = normalize_name(city_part)

    if normalized_city in city_lookup:

        city = city_lookup[normalized_city]

        city_files[city].append((year, file))

    else:
        unrecognized_files.append(file.name)


# ------------------------------------------------------------
# 4. MERGE ALL YEARS FOR EACH CITY
# ------------------------------------------------------------

print("\nCITY-WISE MERGING")
print("=" * 60)

successful_cities = 0
total_rows = 0

for city, files in city_files.items():

    if not files:
        print(f"\n{city}: No files found")
        continue

    # Sort files chronologically
    files.sort(key=lambda x: x[0])

    dataframes = []

    print(f"\nProcessing: {city}")

    for year, file in files:

        df = pd.read_csv(file)

        dataframes.append(df)

        print(
            f"  {year}: {len(df):,} rows - {file.name}"
        )

    # Combine all yearly datasets
    merged_df = pd.concat(
        dataframes,
        ignore_index=True,
        sort=False
    )

    # Sort by Year and Month
    sort_columns = [
        col for col in ["Year", "Month"]
        if col in merged_df.columns
    ]

    if sort_columns:
        merged_df = merged_df.sort_values(
            by=sort_columns,
            kind="stable"
        ).reset_index(drop=True)

    # Output filename without spaces
    city_filename = normalize_name(city)

    output_path = output_folder / (
        f"UHI_{city_filename}_AllYears.csv"
    )

    # Save merged dataset
    merged_df.to_csv(output_path, index=False)

    successful_cities += 1
    total_rows += len(merged_df)

    print(f"  Final rows: {len(merged_df):,}")
    print(f"  Saved: {output_path.name}")


# ------------------------------------------------------------
# 5. FINAL SUMMARY
# ------------------------------------------------------------

print("\n")
print("=" * 60)
print("CITY-WISE DATASET MERGING COMPLETED")
print("=" * 60)

print("Input CSV files:", len(csv_files))
print("Cities successfully merged:", successful_cities)
print("Total rows across all output files:", f"{total_rows:,}")

print("\nOutput folder:")
print(output_folder)

if unrecognized_files:
    print("\nWARNING: These files were not recognized:")
    for filename in unrecognized_files:
        print(" -", filename)

print("\nAll available city datasets have been processed.")
