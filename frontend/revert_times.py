import re
import sys

def revert_times(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # We want to replace new Date(var + ((var || '').endsWith('Z') ? '' : 'Z')) back to new Date(var)
    pattern = r"new Date\(([a-zA-Z0-9_\.\?]+)\s*\+\s*\(\(\1\s*\|\|\s*''\)\.endsWith\('Z'\)\s*\?\s*''\s*:\s*'Z'\)\)"
    replacement = r"new Date(\1)"
    
    new_content = re.sub(pattern, replacement, content)

    with open(filename, 'w') as f:
        f.write(new_content)
    print(f"Reverted {filename}")

revert_times('/Users/abijithgkaimal/Documents/RootfinBrynexTestenv/frontend/src/pages/Datewisedaybook.jsx')
revert_times('/Users/abijithgkaimal/Documents/RootfinBrynexTestenv/frontend/src/pages/BillWiseIncome.jsx')
