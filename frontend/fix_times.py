import re
import sys

def fix_times(filename):
    with open(filename, 'r') as f:
        content = f.read()

    pattern = r"new Date\(([a-zA-Z0-9_\.\?]+)\)\.toLocaleTimeString"
    # Ensure we don't accidentally double-replace if run twice
    def repl(m):
        var = m.group(1)
        if "endsWith" in var:
            return m.group(0)
        return f"new Date({var} + (({var} || '').endsWith('Z') ? '' : 'Z')).toLocaleTimeString"
    
    new_content = re.sub(pattern, repl, content)

    with open(filename, 'w') as f:
        f.write(new_content)
    print(f"Fixed {filename}")

fix_times('/Users/abijithgkaimal/Documents/RootfinBrynexTestenv/frontend/src/pages/Datewisedaybook.jsx')
fix_times('/Users/abijithgkaimal/Documents/RootfinBrynexTestenv/frontend/src/pages/BillWiseIncome.jsx')
