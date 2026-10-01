import re

# A small, extensible dictionary of common lab tests with normal ranges.
KNOWN_TESTS: dict[str, tuple[float, float, str]] = {
    "hemoglobin": (12.0, 16.0, "g/dL"),
    "wbc": (4.0, 11.0, "x10^9/L"),
    "platelets": (150.0, 450.0, "x10^9/L"),
    "glucose": (70, 100, "mg/dL"),
    "cholesterol": (0, 200, "mg/dL"),
    "ldl": (0, 100, "mg/dL"),
    "hdl": (40, 60, "mg/dL"),
    "triglycerides": (0, 150, "mg/dL"),
    "creatinine": (0.6, 1.3, "mg/dL"),
    "urea": (7, 20, "mg/dL"),
    "alt": (7, 56, "U/L"),
    "ast": (10, 40, "U/L"),
    "bilirubin": (0.1, 1.2, "mg/dL"),
    "vitamin d": (30, 100, "ng/mL"),
    "vitamin b12": (200, 900, "pg/mL"),
    "hba1c": (4.0, 5.6, "%"),
}

_LINE_PATTERN = re.compile(
    r"([A-Za-z][A-Za-z0-9 /()%-]{2,40}?)[:\s]+([0-9]+\.?[0-9]*)\s*([A-Za-z0-9^/%µu\-\*]*)"
)

def extract_values(raw_text: str) -> list[dict]:
    """
    Best-effort structured extraction from noisy OCR text.
    Handles both same-line layout (e.g. Hemoglobin: 13.5 g/dL) and
    multiline layout (consecutive lines for name, value, and reference range).
    """
    results: list[dict] = []
    seen: set[str] = set()

    if not raw_text:
        return results

    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    
    # Matches a value + unit, or just a value (e.g. "9.2 g/dL", "15.8 x10^9/L", "38 mg/L", "520")
    val_unit_pattern = re.compile(r"^([0-9]+\.?[0-9]*)\s*([A-Za-z0-9^/%µu\-\*]*)$")
    
    # Matches reference range (e.g. "13.5-17.5", "4.0-11.0", "150 - 450")
    range_pattern = re.compile(r"^([0-9]+\.?[0-9]*)\s*-\s*([0-9]+\.?[0-9]*)$")
    
    # Matches less-than range (e.g. "<5", "< 5.0")
    less_pattern = re.compile(r"^<\s*([0-9]+\.?[0-9]*)$")

    i = 0
    while i < len(lines):
        line = lines[i]
        
        # 1. Try Same-line parsing first
        same_line_match = _LINE_PATTERN.search(line)
        if same_line_match:
            name_raw, value_raw, unit_raw = same_line_match.groups()
            name_key = name_raw.strip().lower()
            if name_key not in seen:
                try:
                    value = float(value_raw)
                    unit = unit_raw.strip() if unit_raw else None
                    is_abnormal = False
                    reference_range = None

                    # Check against KNOWN_TESTS
                    matched_known = None
                    for k_name in KNOWN_TESTS.keys():
                        if k_name in name_key or name_key in k_name:
                            matched_known = k_name
                            break

                    if matched_known:
                        low, high, default_unit = KNOWN_TESTS[matched_known]
                        reference_range = f"{low}-{high}"
                        unit = unit or default_unit
                        is_abnormal = not (low <= value <= high)

                    results.append({
                        "test_name": name_raw.strip().title(),
                        "value": value,
                        "unit": unit,
                        "reference_range": reference_range,
                        "is_abnormal": is_abnormal,
                    })
                    seen.add(name_key)
                except ValueError:
                    pass
            i += 1
            continue

        # 2. Try Multiline parsing: current line is name, next line is value
        # Ensure current line is a text label (not starting with a digit)
        if len(line) > 2 and not line[0].isdigit() and i + 1 < len(lines):
            next_line = lines[i + 1]
            val_match = val_unit_pattern.search(next_line)
            
            if val_match:
                value_raw, unit_raw = val_match.groups()
                name_key = line.lower()
                
                if name_key not in seen:
                    try:
                        value = float(value_raw)
                        unit = unit_raw.strip() if unit_raw else None
                        reference_range = None
                        is_abnormal = False
                        
                        # Check if the next line after value contains the reference range (e.g. index i + 2)
                        parsed_range = False
                        if i + 2 < len(lines):
                            range_line = lines[i + 2]
                            
                            # Try range match
                            r_match = range_pattern.search(range_line)
                            if r_match:
                                low_val = float(r_match.group(1))
                                high_val = float(r_match.group(2))
                                reference_range = range_line
                                is_abnormal = not (low_val <= value <= high_val)
                                parsed_range = True
                            else:
                                # Try less-than match
                                l_match = less_pattern.search(range_line)
                                if l_match:
                                    high_val = float(l_match.group(1))
                                    reference_range = range_line
                                    is_abnormal = not (value < high_val)
                                    parsed_range = True

                        # If not parsed dynamically, check KNOWN_TESTS defaults
                        if not parsed_range:
                            matched_known = None
                            for k_name in KNOWN_TESTS.keys():
                                if k_name in name_key or name_key in k_name:
                                    matched_known = k_name
                                    break
                            
                            if matched_known:
                                low, high, default_unit = KNOWN_TESTS[matched_known]
                                reference_range = f"{low}-{high}"
                                unit = unit or default_unit
                                is_abnormal = not (low <= value <= high)

                        results.append({
                            "test_name": line.title(),
                            "value": value,
                            "unit": unit,
                            "reference_range": reference_range,
                            "is_abnormal": is_abnormal,
                        })
                        seen.add(name_key)
                        
                        # If range line was parsed, we consume it too
                        if parsed_range:
                            i += 3
                            continue
                        else:
                            i += 2
                            continue
                    except ValueError:
                        pass

        i += 1

    return results
