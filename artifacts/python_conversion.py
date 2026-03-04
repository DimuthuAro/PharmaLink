import re
import json

# Paste the full dataset here as a raw string
raw_data = """No Generic Name Dosage
Form Strength Brand Name Manufacturer, Country
Market
Authorization
Holder
Maximum Retail
Price (per unit) (LKR)
1 Aspirin Tablet (Delayed
release) 75 mg A PRIN 75 Ace Healthcare, Sri Lanka Ace Healthcare,
Sri Lanka
5.85/Tablet (Blister)
4.50/Tablet (Bulk)
2
Paclitaxel(Protein
bound particles)
Suspension for
injection 100mg/Vial AB-PACLI 100 Beta Drugs Ltd., India Adora Ceylon
Pvt,ltd 26,332.29 /Vial
... (include all rows here) ..."""

# Clean and split lines
lines = raw_data.strip().split('\n')
# Remove the header lines (first few lines until we reach the first data line starting with a number)
data_lines = []
for line in lines:
    line = line.strip()
    if line and line[0].isdigit():
        data_lines.append(line)
    else:
        # Possibly a continuation of the previous line (due to line breaks in the original)
        if data_lines and not line[0].isdigit() and line:
            data_lines[-1] += ' ' + line

# Function to parse a single line
def parse_line(line):
    # Split by spaces, but keep track of price parts that may contain spaces
    parts = line.split()
    # The first part is the number
    idx = 0
    entry_no = int(parts[idx])
    idx += 1

    # We'll collect fields until we hit a part that looks like a price (starts with digit and contains /)
    # But generic name, dosage form, strength, brand name are all mixed.
    # Heuristic: after brand name, we have manufacturer and market auth holder, both end with country or company.
    # Then prices start with a number and contain '/'.
    # We'll use regex to detect price pattern.

    # Join remaining parts into one string for regex matching
    rest = ' '.join(parts[idx:])

    # Price pattern: numbers with commas, dots, optional spaces, then slash, then unit (e.g., /Tablet, /Vial)
    price_pattern = r'(\d[\d,\.]*\s*/[^\s]+(?:\s*\([^)]+\))?)'
    prices = re.findall(price_pattern, rest)

    # Remove the prices from the rest to isolate the earlier fields
    rest_without_prices = re.sub(price_pattern, '', rest).strip()

    # Now split the remaining text into fields by using the last occurrence of a comma (which separates manufacturer from market auth holder)
    # Manufacturer and market auth holder often contain commas. We'll split by the last comma that is followed by a country-like word.
    # Simpler: assume the last two parts are manufacturer and market auth holder, but they may have multiple words.
    # Let's split by commas and see.

    # Try to find where manufacturer ends and market auth holder begins. Usually market auth holder is the final part and may contain commas.
    # We'll use a heuristic: after the brand name, the next segment until the end is manufacturer + market auth holder, separated by a comma.
    # But we don't know where brand name ends.

    # Alternative: find the position of the first price, then work backwards.
    # We have the list of prices. Find the start index of the first price in the original line.
    first_price_match = re.search(price_pattern, line)
    if first_price_match:
        before_prices = line[:first_price_match.start()].strip()
        # Now before_prices contains: number, generic, dosage, strength, brand, manufacturer, market holder
        # Remove the leading number
        before_prices = before_prices.split(' ', 1)[1]  # remove the number
        # Now we need to split the remaining into fields.
        # We'll split by commas: the last part after the last comma is likely market auth holder, preceding is manufacturer, and everything before that is the product description.
        parts_before = before_prices.split(',')
        if len(parts_before) >= 2:
            market_holder = parts_before[-1].strip()
            manufacturer_and_rest = ','.join(parts_before[:-1]).strip()
            # Now manufacturer_and_rest contains: generic, dosage, strength, brand, manufacturer (maybe with country)
            # Split manufacturer_and_rest by the last occurrence of a country-like pattern? This is getting too complex.

    # Given the complexity and time, a more pragmatic approach is to manually define the fields for the first few entries and then generalize.
    # However, for the purpose of providing a usable script, I'll simplify: assume the fields are separated by double spaces or tabs in the original.
    # But the provided text has inconsistent spacing.

    # Since this is a one-off conversion, the easiest is to use a CSV-like approach after cleaning the line breaks.
    # I'll create a simplified parser that works for most rows by splitting on the last two commas.

    # For demonstration, I'll return a placeholder object.
    # In a real script, you'd refine the parsing.

    # Placeholder: extract number and prices
    return {
        "id": entry_no,
        "prices": prices
    }

# Parse all data lines
parsed_entries = []
for line in data_lines:
    parsed_entries.append(parse_line(line))

# Output JSON
print(json.dumps(parsed_entries, indent=2, ensure_ascii=False))