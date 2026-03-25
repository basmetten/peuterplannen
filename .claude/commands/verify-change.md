Quick verification after a single change. Lighter than /visual-qa — focuses on "does it still look right" rather than full test suite.

## Steps

### 1. Dev server
Check if running: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8771/app.html`
If not 200, start it: `cd /Users/basmetten/peuterplannen && npx serve -l 8771 --no-clipboard . &` and wait 2 seconds.

### 2. Mobile screenshot (390x844)
1. Resize browser to 390x844
2. Navigate to $ARGUMENTS or http://localhost:8771/app.html
3. Wait for content to load (cards visible or map rendered)
4. Take screenshot → save as `verify-mobile.png`
5. DESCRIBE what you see: layout, visible components, any anomalies

### 3. Desktop screenshot (1280x800)
1. Resize browser to 1280x800
2. Navigate to the same URL
3. Wait for content to load
4. Take screenshot → save as `verify-desktop.png`
5. DESCRIBE what you see: layout, visible components, any anomalies

### 4. Component-specific verification
Based on what you just edited, do ONE of these:
- **CSS change**: Compare mobile + desktop — does layout hold? No overflow? No clipping?
- **Sheet change**: Click to trigger sheet state changes, screenshot each state
- **Filter change**: Click a filter chip, verify the list updates
- **Card change**: Scroll the card list, verify rendering
- **Map change**: Switch to map tab, verify clusters/markers load
- **Layout change**: Test both mobile and desktop, verify responsive breakpoint

### 5. Judgment
Look at your screenshots and answer honestly:
- Does the UI look correct and polished?
- Is there any visual regression from the change?
- Would a user notice anything wrong?

If YES to all → report done.
If NO to any → describe the issue, fix it, re-verify.

### 6. Gemini second opinion (if uncertain)
If you are unsure about a visual issue, run:
```bash
curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Compare these two screenshots of a Dutch toddler activities app (mobile 390px and desktop 1280px). Check for: layout issues, overflow, clipping, spacing problems, broken elements, text readability. Is this UI production-ready?"},{"inlineData":{"mimeType":"image/png","data":"'"$(base64 -i verify-mobile.png)"'"}}]}]}'
```

Do NOT skip this command if you have any doubt.
