import re
import sys

# Ensure UTF-8 printing on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open("c:/Users/akash/OneDrive/Desktop/Project/src/index.css", "r", encoding="utf-8") as f:
    content = f.read()

# Let's find rules containing color properties that have hardcoded values
# excluding those inside comments or inside keyframes
color_matches = re.finditer(r'([^{]*)\{[^}]*color:\s*([^;}]+)[^}]*\}', content)

print("--- Hardcoded colors in selectors ---")
for match in color_matches:
    selector = match.group(1).strip()
    color_val = match.group(2).strip()
    
    # We only care about colors that are hardcoded hex or rgba, not var(--...)
    if 'var(' not in color_val and not selector.startswith('@keyframes') and '{' not in selector:
        try:
            print(f"Selector: {selector} => Color: {color_val}")
        except Exception:
            pass

print("\n--- Hardcoded backgrounds in selectors ---")
bg_matches = re.finditer(r'([^{]*)\{[^}]*(?:background|background-color):\s*([^;}]+)[^}]*\}', content)
for match in bg_matches:
    selector = match.group(1).strip()
    bg_val = match.group(2).strip()
    if 'var(' not in bg_val and not selector.startswith('@keyframes') and '{' not in selector and ('rgba(15' in bg_val or '#0' in bg_val or '#1' in bg_val or 'rgba(8' in bg_val or 'black' in bg_val):
        try:
            print(f"Selector: {selector} => Background: {bg_val}")
        except Exception:
            pass
