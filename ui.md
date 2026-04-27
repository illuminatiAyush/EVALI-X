# 🎨 Evalix AI — Design System (Material UI • Production Spec)

---

# 0. PURPOSE

This document defines **non-negotiable UI rules** for Evalix AI.

Goals:

* Consistent UI across all pages
* Minimal custom CSS
* Fast development using Material UI
* Non-generic, academic + AI aesthetic

---

# 1. DESIGN PRINCIPLES

1. **Clarity over decoration**
2. **Action-first hierarchy**
3. **Data readability > visual flair**
4. **Consistency > creativity**

---

# 2. TECH STACK RULES

Use:

* Material UI (core components)
* `sx` prop for styling
* Theme overrides

Avoid:

* External CSS files
* Inline random styles
* Multiple UI libraries

---

# 3. THEME (SINGLE SOURCE OF TRUTH)

## 3.1 Palette

```js
primary: #22C55E     // learning / success
secondary: #38BDF8   // AI / intelligence

background.default: #0F172A
background.paper: #1E293B

text.primary: #E2E8F0
text.secondary: #94A3B8

error: #EF4444
warning: #F59E0B
```

---

## 3.2 Typography

| Type     | Font          | Rules                   |
| -------- | ------------- | ----------------------- |
| Headings | Sora          | letter-spacing: -0.02em |
| Body     | IBM Plex Sans | default                 |
| Data     | IBM Plex Mono | numbers only            |

---

## 3.3 Shape

* Border radius: **10px**
* No extreme rounding

---

# 4. SPACING SYSTEM

## Scale (MANDATORY)

| Token | Value |
| ----- | ----- |
| 1     | 8px   |
| 2     | 16px  |
| 3     | 24px  |
| 4     | 32px  |

---

## Rules

* Use only these values
* No arbitrary spacing like `13px`, `22px`
* Layout spacing = multiples of 8

---

# 5. LAYOUT SYSTEM

## Structure

* Sidebar → `Drawer`
* Topbar → `AppBar`
* Content → `Box`

---

## Content Rules

* Max width: **1200px**
* Padding: `p: 3`
* Vertical gap: `gap: 3`

---

## Grid Rules

Allowed:

* 6 + 6
* 8 + 4
* 4 + 4 + 4

Avoid:

* Random spans
* Perfect uniform repetition everywhere

---

# 6. COMPONENT SYSTEM

---

## 6.1 BUTTON

### Variants

| Variant   | MUI           | Usage        |
| --------- | ------------- | ------------ |
| Primary   | contained     | Main action  |
| Secondary | outlined      | Supporting   |
| Tertiary  | text          | Low emphasis |
| Danger    | color="error" | Destructive  |

---

### Rules

* Max 1 primary button per section
* Do not stack primary buttons
* Button height: default MUI

---

### States

| State    | Behavior         |
| -------- | ---------------- |
| hover    | slight elevation |
| active   | slight press     |
| disabled | opacity 0.6      |

---

## 6.2 CARD

### Usage

* Group related content
* Never for decoration

---

### Rules

* Padding: `p: 3`
* Border: `1px solid #334155`
* No shadow (default removed)

---

### DO NOT

* Nest cards inside cards
* Use cards as layout wrappers

---

## 6.3 INPUT

### Components

* TextField
* Select
* Autocomplete

---

### Rules

* Always include label
* Size: medium (default)

---

### States

| State    | Style       |
| -------- | ----------- |
| focus    | cyan border |
| error    | red border  |
| disabled | opacity 0.6 |

---

## 6.4 TABLE

### Rules

* Use minimal borders
* Align numbers right
* Highlight row on hover

---

### Structure

* Header → bold
* Rows → clean spacing
* No heavy gridlines

---

## 6.5 ALERT / FEEDBACK

Use:

* Snackbar → success messages
* Alert → errors/warnings
* CircularProgress → loading

---

# 7. SIGNATURE COMPONENT

## Join Code Input

### Structure

* 2 inputs + separator
* Fixed width
* Monospace font

---

### Implementation Rules

* Max length: 4
* Letter spacing: 0.2em
* Center aligned

---

# 8. COLOR USAGE RULES

## Primary (Green)

* Buttons
* Success states

## Secondary (Cyan)

* Focus states
* Highlights

---

## Avoid

* Multiple accent colors
* Random color usage
* Gradient abuse

---

# 9. MOTION SYSTEM

## Allowed

* Fade
* Subtle scale
* Duration: 150–240ms

---

## Not Allowed

* Bounce
* Elastic animations
* Over-animation

---

# 10. BACKGROUND

Use:

```css
radial-gradient(circle at 20% 30%, rgba(56,189,248,0.08), transparent 40%)
```

---

## Rules

* Subtle only
* No loud gradients

---

# 11. UX RULES

---

## Always Visible

* Current batch
* Test status
* Timer

---

## Hierarchy

1. Action
2. Status
3. Details

---

## Empty States

Must include:

* Title
* Description
* CTA button

---

## Feedback

Every action must:

* Confirm success
* Show errors clearly

---

# 12. PAGE BLUEPRINTS

---

## Teacher Dashboard

* Stats (top row)
* Batches (cards)
* Tests (list/table)

---

## Student Dashboard

* Available tests (priority)
* Joined batches
* History

---

## Test Page

* Full focus mode
* Minimal UI
* Large timer

---

## Analytics

* Data-first
* Tables + charts

---

# 13. DO / DON’T

## DO

* Keep layouts breathable
* Use consistent spacing
* Highlight primary action clearly

---

## DON’T

* Use default MUI styling blindly
* Add unnecessary shadows
* Mix UI libraries
* Use more than 2 accent colors

---

# 14. FINAL VALIDATION CHECK

Before shipping ANY screen:

1. Is the primary action obvious?
2. Is spacing consistent (8px scale)?
3. Are there unnecessary elements?
4. Does it feel like a serious tool?

If any answer = NO → fix it.

---

# 15. CORE PRINCIPLE

Material UI = structure
Design system = identity

Do not confuse them.

---
