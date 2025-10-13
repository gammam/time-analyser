# Personal Meeting Trend Analyzer - Design Guidelines

## Design Approach
**Design System**: Modern productivity dashboard inspired by Linear, Notion, and Asana
**Rationale**: This is a data-intensive productivity tool requiring clarity, efficiency, and visual hierarchy. The design prioritizes information density while maintaining clean aesthetics.

---

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**
- Background: 220 15% 10% (deep slate)
- Surface: 220 12% 15% (elevated panels)
- Border: 220 10% 25% (subtle separation)
- Text Primary: 220 5% 95%
- Text Secondary: 220 5% 70%

**Score Indicators**
- High Score (80-100): 142 70% 50% (vibrant green)
- Medium Score (60-79): 45 90% 55% (amber/orange)
- Low Score (<60): 0 70% 55% (coral red)
- Neutral/Unscored: 220 10% 50% (muted slate)

**Accent Colors**
- Primary Action: 217 91% 60% (bright blue)
- Data Visualization: Use a cohesive 5-color palette (217 91% 60%, 142 70% 50%, 280 70% 60%, 45 90% 55%, 340 70% 55%)

### B. Typography
- **Primary Font**: Inter (Google Fonts) - modern, readable at all sizes
- **Monospace**: JetBrains Mono - for numerical data and scores
- **Headings**: 
  - H1: text-3xl font-bold (dashboard title)
  - H2: text-2xl font-semibold (section headers)
  - H3: text-lg font-medium (card titles)
- **Body**: text-sm and text-base with leading-relaxed
- **Data/Metrics**: text-2xl to text-4xl font-bold (score displays)

### C. Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, and 16
- Component padding: p-4 to p-6
- Section gaps: gap-6 to gap-8
- Page margins: px-6, py-8 (mobile) to px-12, py-12 (desktop)
- Card spacing: p-6 with gap-4 internally

**Grid Structure**:
- Main dashboard: 12-column grid on desktop
- Score cards: 3-column grid (lg:grid-cols-3)
- Meeting list: Single column with max-w-4xl
- Responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

### D. Component Library

**Dashboard Header**
- Full-width navigation bar (h-16) with subtle border-b
- Left: Logo + "Meeting Analyzer" title
- Center: Date range selector with subtle background
- Right: User avatar + settings icon

**Score Display Cards**
- Elevated surface with rounded-xl borders
- Large numeric score (text-5xl font-bold) with color-coded indicator
- Score category label (text-sm text-secondary)
- Subtle progress ring or bar visualization
- Micro-trend indicator (↑↓ with percentage change)

**Meeting List Items**
- Compact card design (p-4) with hover:bg-surface-elevated
- Left: Time badge (text-xs monospace)
- Center: Meeting title (font-medium) + participants count
- Right: Circular score badge with color
- Expandable to show score breakdown on click

**Trend Charts**
- Use recharts or similar library
- Line charts for score trends over time
- Bar charts for score category breakdown
- Consistent color scheme matching score indicators
- Minimal grid lines, clean axis labels
- Tooltips on hover with detailed data

**Score Breakdown Panel**
- 5 horizontal progress bars, one per criteria
- Each bar: Label (left), score (right), colored fill
- Icons for each criterion (calendar, users, clock, checkbox, eye)
- Total score prominently displayed at top

**Calendar Integration View**
- Month/week view toggle
- Meeting events with score badge overlay
- Color-coded by score threshold
- Click to see meeting details sidebar

**Filters & Controls**
- Pill-style filter buttons (rounded-full px-4 py-2)
- Date range picker with preset options (7d, 30d, custom)
- Sort dropdown with subtle styling
- Search bar with icon (magnifying glass)

### E. Visual Hierarchy

**Information Architecture**:
1. Top: Daily aggregate score (hero metric)
2. Mid-top: 7-day trend chart (quick insights)
3. Mid: Today's meetings list with scores
4. Bottom: Detailed analytics and historical data

**Card Elevation System**:
- Base cards: subtle shadow-sm
- Interactive cards: shadow-md on hover
- Modal/drawer overlays: shadow-2xl
- Use border instead of heavy shadows for cleaner look

**Interactive States**:
- Hover: Increase brightness by 5%, subtle scale (scale-[1.02])
- Active: Slight opacity reduction (opacity-90)
- Focus: 2px ring in primary color
- Disabled: opacity-50 with cursor-not-allowed

### F. Data Visualization

**Chart Specifications**:
- Background: Transparent or subtle surface color
- Grid: Minimal, opacity-20
- Line thickness: 2-3px for trend lines
- Data points: 6-8px circles on hover
- Tooltips: Dark card with white text, shadow-xl
- Animation: Gentle fade-in (300ms ease)

**Score Indicators**:
- Circular progress rings for individual scores
- Stacked bar for criteria breakdown
- Heatmap calendar view for monthly overview
- Sparklines for quick trends in list items

### G. Responsive Behavior

**Mobile (< 768px)**:
- Stack all cards vertically
- Simplified chart views (show key metrics only)
- Collapsible meeting details
- Bottom navigation bar for key actions
- Full-width score displays

**Tablet (768px - 1024px)**:
- 2-column layout for score cards
- Side-by-side chart and meeting list
- Sticky header with condensed controls

**Desktop (> 1024px)**:
- Full 3-column dashboard layout
- Sidebar for detailed analytics
- Multi-chart views side by side
- Expanded data tables

### H. Micro-interactions
- Score number count-up animation on load
- Chart data entrance (stagger by 50ms per element)
- Smooth transitions (transition-all duration-200)
- Success states: Brief green glow on score update
- Loading states: Skeleton screens matching card layouts

---

## Images
**No hero image required** - This is a dashboard application focused on data display. Use icons from Heroicons for all UI elements (calendar, users, clock, check-circle, eye for attention points, chart-bar, etc.)

---

## Key Design Principles
1. **Clarity First**: Data should be immediately understandable
2. **Progressive Disclosure**: Show summary, reveal details on interaction
3. **Consistent Scoring Visual Language**: Always use the same color coding
4. **Performance Indicators**: Visual cues for improving/declining trends
5. **Contextual Actions**: Show relevant actions based on score thresholds