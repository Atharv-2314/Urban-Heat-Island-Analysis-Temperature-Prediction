
import pandas as pd
from pathlib import Path
import re
import sys

# ============================================================
# UHI PROJECT - DATASET VERIFICATION
#
# 1. Verify merged monthly-level dataset (42 cities)
# 2. Verify all 42 city-wise pixel-level datasets
# 3. Check schemas, city names, years, months and empty files
# ============================================================


# ------------------------------------------------------------
# 1. CONFIGURATION
# ------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]

MONTHLY_FILE = (
    PROJECT_ROOT
    / "data"
    / "interim"
    / "monthly_level"
    / "UHI_MonthlyDataset_Merged.csv"
)

PIXEL_FOLDER = (
    PROJECT_ROOT
    / "data"
    / "interim"
    / "pixel_level"
    / "citywise_dataset"
)

START_YEAR = 2016
END_YEAR = 2025

EXPECTED_CITIES = [
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

REQUIRED_COLUMNS = {"City", "Year", "Month"}


# ------------------------------------------------------------
# 2. HELPER FUNCTIONS
# ------------------------------------------------------------

def normalize_columns(df):
    """Standardize column names regardless of capitalization or spaces."""

    df.columns = (
        df.columns.astype(str)
        .str.replace("\ufeff", "", regex=False)
        .str.strip()
    )

    column_mapping = {
        "city": "City",
        "year": "Year",
        "month": "Month"
    }

    df.rename(
        columns={
            col: column_mapping[col.lower()]
            for col in df.columns
            if col.lower() in column_mapping
        },
        inplace=True
    )

    return df
    
def normalize_name(name):
    """Normalize city names for filename and data comparison."""
    return re.sub(r"[^a-zA-Z0-9]", "", str(name)).lower()


def check_date_columns(df, filename, errors, warnings):
    """Check whether Year and Month contain valid values."""

    for column in ["Year", "Month"]:

        values = pd.to_numeric(df[column], errors="coerce")

        if values.isna().any():
            errors.append(
                f"{filename}: Invalid or missing values in {column}"
            )
            continue

        if column == "Year":
            invalid = ~values.between(START_YEAR, END_YEAR)

        else:
            invalid = ~values.between(1, 12)

        if invalid.any():
            errors.append(
                f"{filename}: Invalid {column} values found"
            )

    if not errors:
        years = pd.to_numeric(df["Year"], errors="coerce")
        available_years = set(years.dropna().astype(int).unique())

        missing_years = sorted(
            set(range(START_YEAR, END_YEAR + 1)) - available_years
        )

        if missing_years:
            warnings.append(
                f"{filename}: No records found for years {missing_years}"
            )

        return available_years

    return set()


# ------------------------------------------------------------
# 3. INITIALIZE VERIFICATION
# ------------------------------------------------------------

errors = []
warnings = []

total_pixel_rows = 0
pixel_schema = None

print("\n" + "=" * 70)
print("             UHI PROJECT - DATASET VERIFICATION")
print("=" * 70)


# ------------------------------------------------------------
# 4. VERIFY MONTHLY-LEVEL DATASET
# ------------------------------------------------------------

print("\n[1/2] VERIFYING MONTHLY-LEVEL DATASET")
print("-" * 70)

if not MONTHLY_FILE.exists():

    errors.append(f"Monthly dataset not found: {MONTHLY_FILE}")

    print("[FAILED] Monthly dataset does not exist.")

else:

    try:
        monthly_df = pd.read_csv(
            MONTHLY_FILE,
            low_memory=False
        )

        monthly_df = normalize_columns(monthly_df)

        print(f"File: {MONTHLY_FILE.name}")
        print(f"Rows: {len(monthly_df):,}")
        print(f"Columns: {len(monthly_df.columns)}")

        if monthly_df.empty:
            errors.append("Monthly dataset is empty.")

        missing_columns = REQUIRED_COLUMNS - set(monthly_df.columns)

        if missing_columns:
            errors.append(
                f"Monthly dataset missing columns: {missing_columns}"
            )

        if monthly_df.columns.duplicated().any():
            errors.append("Monthly dataset has duplicate column names.")

        if not missing_columns and not monthly_df.empty:

            check_date_columns(
                monthly_df,
                MONTHLY_FILE.name,
                errors,
                warnings
            )

            actual_cities = {
                normalize_name(city)
                for city in monthly_df["City"].dropna().unique()
            }

            expected_cities = {
                normalize_name(city)
                for city in EXPECTED_CITIES
            }

            missing_cities = expected_cities - actual_cities
            unexpected_cities = actual_cities - expected_cities

            if missing_cities:
                errors.append(
                    "Monthly dataset missing cities: "
                    + ", ".join(sorted(missing_cities))
                )

            if unexpected_cities:
                warnings.append(
                    "Unexpected city names in monthly dataset: "
                    + ", ".join(sorted(unexpected_cities))
                )

            print(
                f"Cities found: {len(actual_cities)} / "
                f"{len(EXPECTED_CITIES)}"
            )

            print(
                f"Years found: "
                f"{sorted(pd.to_numeric(monthly_df['Year'], errors='coerce').dropna().astype(int).unique())}"
            )

        print("[IMPORTED] Monthly dataset read successfully.")

    except Exception as e:
        errors.append(
            f"Could not read monthly dataset: {e}"
        )


# ------------------------------------------------------------
# 5. VERIFY ALL 42 PIXEL-LEVEL DATASETS
# ------------------------------------------------------------

print("\n[2/2] VERIFYING PIXEL-LEVEL CITY DATASETS")
print("-" * 70)

if not PIXEL_FOLDER.exists():

    errors.append(f"Pixel dataset folder not found: {PIXEL_FOLDER}")

    print("[FAILED] Pixel dataset folder does not exist.")

else:

    imported_cities = 0

    for city in EXPECTED_CITIES:

        filename = (
            f"UHI_{normalize_name(city)}_AllYears.csv"
        )

        file_path = PIXEL_FOLDER / filename

        if not file_path.exists():

            errors.append(
                f"{city}: File missing ({filename})"
            )

            print(f"[MISSING] {city}: {filename}")
            continue

        try:

            df = pd.read_csv(
                file_path,
                low_memory=False
            )

            df = normalize_columns(df)

            if df.empty:

                errors.append(
                    f"{city}: Dataset is empty."
                )

                print(f"[FAILED] {city}: Empty dataset")
                continue

            if df.columns.duplicated().any():

                errors.append(
                    f"{city}: Duplicate column names."
                )

            missing_columns = REQUIRED_COLUMNS - set(df.columns)

            if missing_columns:

                errors.append(
                    f"{city}: Missing columns {missing_columns}"
                )

                print(
                    f"[FAILED] {city}: Missing required columns"
                )
                continue

            # Verify city identity
            actual_cities = {
                normalize_name(value)
                for value in df["City"].dropna().unique()
            }

            expected_city = normalize_name(city)

            if actual_cities != {expected_city}:

                errors.append(
                    f"{city}: Incorrect city values found: "
                    f"{actual_cities}"
                )

            # Verify consistent column structure
            current_schema = set(df.columns)

            if pixel_schema is None:

                pixel_schema = current_schema

            elif current_schema != pixel_schema:

                errors.append(
                    f"{city}: Column structure differs from other "
                    "pixel datasets."
                )

            # Verify dates
            check_date_columns(
                df,
                filename,
                errors,
                warnings
            )

            years = sorted(
                pd.to_numeric(
                    df["Year"],
                    errors="coerce"
                ).dropna().astype(int).unique()
            )

            total_pixel_rows += len(df)
            imported_cities += 1

            print(
                f"[IMPORTED] {city:<15} | "
                f"{len(df):>10,} rows | "
                f"{len(df.columns):>2} columns | "
                f"Years: {years}"
            )

        except Exception as e:

            errors.append(
                f"{city}: Could not read {filename}: {e}"
            )

            print(f"[FAILED] {city}: {e}")


# ------------------------------------------------------------
# 6. FINAL VERIFICATION REPORT
# ------------------------------------------------------------

print("\n" + "=" * 70)
print("                    FINAL VERIFICATION REPORT")
print("=" * 70)

print(f"Expected cities:                 {len(EXPECTED_CITIES)}")
print(f"Pixel datasets imported:         {imported_cities if PIXEL_FOLDER.exists() else 0}")
print(f"Total pixel-level rows:          {total_pixel_rows:,}")

if MONTHLY_FILE.exists():
    print("Monthly dataset:                 Checked")
else:
    print("Monthly dataset:                 Missing")

print(f"Verification errors:             {len(errors)}")
print(f"Coverage warnings:               {len(warnings)}")

if warnings:

    print("\nWARNINGS:")
    for warning in warnings:
        print(" -", warning)

if errors:

    print("\nERRORS:")
    for error in errors:
        print(" -", error)

    print("\n" + "=" * 70)
    print("              DATASET VERIFICATION FAILED")
    print("=" * 70)

    sys.exit(1)

else:

    print("\n" + "=" * 70)
    print("       ALL DATASETS IMPORTED AND VERIFIED SUCCESSFULLY")
    print("=" * 70)

    print("Monthly merged dataset:          SUCCESS")
    print("All 42 pixel-level datasets:     SUCCESS")
    print("Required columns:                SUCCESS")
    print("City identity checks:            SUCCESS")
    print("Pixel schema consistency:        SUCCESS")
    print("Year and month validation:       SUCCESS")

    print("\nYour datasets are ready for the next stage.")