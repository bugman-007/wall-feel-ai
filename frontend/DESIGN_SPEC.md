# Wallfeel AI Visualizer - Design Specification

> Based on analysis of `design.jpeg` (1280x853)

## 1. Color Palette

### Background Colors
| Name | RGB | Hex | Usage |
|------|-----|-----|-------|
| `bg-primary` | RGB(243, 240, 235) | #F3F0EB | Main page background |
| `bg-secondary` | RGB(240, 237, 232) | #F0EDE8 | Card/section backgrounds |
| `bg-tertiary` | RGB(235, 232, 227) | #EBE8E3 | Input fields, nested elements |

### Text Colors
| Name | RGB | Hex | Usage |
|------|-----|-----|-------|
| `text-primary` | RGB(26, 27, 29) | #1A1B1D | Headings, primary text |
| `text-secondary` | RGB(80, 80, 85) | #505055 | Body text, descriptions |
| `text-muted` | RGB(120, 120, 128) | #787880 | Placeholder, captions |

### Accent Colors
| Name | RGB | Hex | Usage |
|------|-----|-----|-------|
| `accent-gold` | RGB(118, 83, 15) | #76530F | Buttons, highlights, CTAs |
| `accent-gold-light` | RGB(160, 115, 25) | #A07319 | Hover states |

### Border Colors
| Name | RGB | Hex | Usage |
|------|-----|-----|-------|
| `border-light` | RGB(220, 215, 210) | #DCD7D2 | Subtle dividers |
| `border-medium` | RGB(180, 175, 170) | #B4AFAA | Input borders |

---

## 2. Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Type Scale
| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| H1 | 48px (3rem) | 700 | 1.2 | -0.02em |
| H2 | 32px (2rem) | 600 | 1.3 | -0.01em |
| H3 | 24px (1.5rem) | 600 | 1.4 | 0 |
| H4 | 20px (1.25rem) | 600 | 1.4 | 0 |
| Body | 16px (1rem) | 400 | 1.6 | 0 |
| Small | 14px (0.875rem) | 400 | 1.5 | 0 |
| Caption | 12px (0.75rem) | 400 | 1.4 | 0.02em |

---

## 3. Layout Structure

### Grid System
- **Max Width**: 1200px
- **Container Padding**: 24px (mobile), 48px (desktop)
- **Column Gap**: 24px
- **Layout**: Centered single-column with potential 2-3 column grids for cards

### Section Spacing
| Section | Spacing |
|---------|---------|
| Between major sections | 80-120px |
| Between subsections | 48-64px |
| Between related elements | 24-32px |

### Header
- **Height**: ~60-80px
- **Layout**: Centered logo/title, navigation items
- **Background**: Light/cream (matches primary background)

---

## 4. Components

### Buttons

#### Primary Button
```css
.btn-primary {
  background: RGB(26, 27, 29);  /* Dark */
  color: RGB(255, 255, 255);
  padding: 14px 28px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  border: none;
  transition: all 0.2s ease;
}
.btn-primary:hover {
  background: RGB(50, 50, 55);
  transform: translateY(-1px);
}
```

#### Secondary Button
```css
.btn-secondary {
  background: transparent;
  color: RGB(26, 27, 29);
  padding: 14px 28px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  border: 1px solid RGB(220, 215, 210);
  transition: all 0.2s ease;
}
.btn-secondary:hover {
  background: RGB(245, 242, 237);
  border-color: RGB(180, 175, 170);
}
```

### Cards
```css
.card {
  background: RGB(255, 255, 255);
  border: 1px solid RGB(230, 225, 220);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}
.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
```

### Input Fields
```css
.input {
  background: RGB(250, 247, 242);
  border: 1px solid RGB(220, 215, 210);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 16px;
  color: RGB(26, 27, 29);
  transition: all 0.2s ease;
}
.input:focus {
  outline: none;
  border-color: RGB(26, 27, 29);
  box-shadow: 0 0 0 3px rgba(26, 27, 29, 0.1);
}
```

### Image Cards (Wallpaper Grid)
```css
.wallpaper-card {
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 1;
  background: RGB(245, 242, 237);
  cursor: pointer;
  transition: all 0.2s ease;
}
.wallpaper-card:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}
.wallpaper-card.selected {
  ring: 3px solid RGB(26, 27, 29);
}
```

---

## 5. Interactive States

### Hover
- Cards: Lift up 2-4px with increased shadow
- Buttons: Slight brightness increase, lift 1-2px
- Links: Underline or color change

### Active/Pressed
- Buttons: Scale down slightly (0.98)
- Increased shadow compression

### Focus
- Inputs: Dark border + subtle shadow ring
- Buttons: Outline ring

### Disabled
- Opacity: 0.5
- Cursor: not-allowed
- No hover effects

---

## 6. Visual Effects

### Shadows
```css
shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.1);
shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.12);
```

### Border Radius
```css
radius-sm: 4px;    /* Small elements */
radius-md: 8px;    /* Buttons, inputs */
radius-lg: 12px;   /* Cards */
radius-xl: 16px;   /* Large containers */
radius-full: 9999px; /* Pills, avatars */
```

---

## 7. Design Principles

1. **Minimalist Elegance**: Clean, uncluttered layouts with generous whitespace
2. **Neutral Foundation**: Cream/warm backgrounds with dark text
3. **Subtle Interactions**: Smooth, understated animations
4. **Consistent Spacing**: 8px grid system throughout
5. **Premium Feel**: High-quality typography and refined details

---

## 8. Implementation Checklist

- [ ] Update `globals.css` with new color tokens
- [ ] Update typography scale
- [ ] Restyle all buttons (primary dark, secondary outlined)
- [ ] Update card components with new borders/shadows
- [ ] Update input fields with new styling
- [ ] Update wallpaper grid cards
- [ ] Update section spacing (80-120px between major sections)
- [ ] Add smooth hover transitions
- [ ] Update header/navigation styling
- [ ] Ensure all text uses new color hierarchy
