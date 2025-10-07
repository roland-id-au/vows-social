# Vows Social - Design System & UX Patterns

**Version**: 2.0 - Premium Wedding Marketplace Experience
**Last Updated**: 2025-10-08
**Inspiration**: The Knot, WeddingWire, Zola, Style Me Pretty

---

## Design Philosophy

### Core Principles

1. **Immersive & Aspirational**
   - Large, beautiful imagery that inspires couples
   - Let the venues and vendors be the heroes
   - Minimal UI interference with visual content

2. **Trust & Credibility**
   - Social proof prominent (reviews, ratings, verified badges)
   - Real photos from real weddings
   - Transparent pricing and policies

3. **Effortless Discovery**
   - Intuitive navigation and filtering
   - Personalized recommendations
   - Save and compare functionality

4. **Mobile-First**
   - 70%+ of users browse on mobile
   - Touch-optimized interactions
   - Fast loading on all connections

---

## Page Layouts

### 1. Venue Detail Page (Premium Experience)

#### Hero Section - Full-Width Gallery
```
┌─────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│           FULL-WIDTH IMAGE GALLERY              │
│              (No header visible)                │
│                                                 │
│        [< >] navigation dots  [View All]        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Features**:
- **Height**: 60vh on desktop, 50vh on mobile
- **Images**: High-quality, optimized for web
- **Controls**:
  - Arrow navigation (left/right)
  - Dot indicators showing position
  - "View All Photos" button (opens lightbox)
  - Pinch to zoom on mobile
- **No Header**: Header appears on scroll (sticky)
- **Overlay Info**: Venue name + location in bottom-left corner (semi-transparent)

#### Sticky Header (Appears on Scroll)
```
┌─────────────────────────────────────────────────┐
│ Logo    Venue Name               [Save] [Share] │
│ ────────────────────────────────────────────── │
│ Photos | Details | Pricing | Reviews | Contact │
└─────────────────────────────────────────────────┘
```

**Features**:
- Appears when user scrolls down 100px
- Smooth slide-down animation
- Venue name always visible
- Quick action buttons (Save, Share, Contact)
- Tab navigation to page sections
- Transparent background with blur effect

#### Content Layout
```
┌──────────────────────────────┬──────────────┐
│                              │              │
│  Main Content (8 cols)       │ Sidebar (4)  │
│                              │              │
│  - Venue Title & Location    │ - Price      │
│  - Key Details (capacity)    │ - Inquiry    │
│  - Description               │ - Vendor     │
│  - Amenities                 │   Info       │
│  - Packages                  │ - Quick      │
│  - Reviews                   │   Facts      │
│  - FAQ                       │              │
│  - Similar Venues            │ [Sticky]     │
│                              │              │
└──────────────────────────────┴──────────────┘
```

**Desktop**: 2-column layout (main + sidebar)
**Mobile**: Single column, sidebar moves below main content

---

## Component Specifications

### Hero Gallery Component

#### Desktop Behavior
```typescript
<HeroGallery>
  - Full viewport width
  - 60vh height
  - Swipeable carousel
  - Lazy load images
  - Preload first 3 images
  - Infinite loop
  - Auto-advance (optional, 5s interval)
  - Pause on hover
  - Keyboard navigation (arrow keys)
</HeroGallery>
```

#### Image Overlay
```
Position: absolute bottom-left
Background: linear-gradient(transparent, rgba(0,0,0,0.7))
Padding: 40px
Content:
  - Venue Category Badge (small, uppercase)
  - Venue Name (large, bold, white)
  - Location (medium, white with opacity)
  - Rating Stars + Review Count
```

#### Gallery Controls
```
Left/Right Arrows:
  - Position: Absolute, centered vertically
  - Background: White circle, semi-transparent
  - Icon: SVG arrow, gray
  - Hover: Full opacity, shadow

Dot Indicators:
  - Position: Absolute bottom center
  - Style: Small circles, white with opacity
  - Active: Solid white, slightly larger
  - Click: Jump to image

"View All Photos" Button:
  - Position: Top-right corner
  - Style: White button, rounded
  - Icon: Grid icon + count (e.g., "24 Photos")
  - Opens: Lightbox modal
```

---

### Sticky Navigation Component

#### HTML Structure
```html
<div class="sticky-header opacity-0 -translate-y-full transition-all">
  <div class="container mx-auto">
    <div class="flex items-center justify-between">
      <!-- Left: Logo + Venue Name -->
      <div class="flex items-center gap-4">
        <img src="/logo.svg" class="h-8" />
        <h2 class="font-semibold text-lg">Venue Name</h2>
      </div>

      <!-- Center: Section Nav -->
      <nav class="hidden md:flex gap-6">
        <a href="#photos">Photos</a>
        <a href="#details">Details</a>
        <a href="#pricing">Pricing</a>
        <a href="#reviews">Reviews</a>
      </nav>

      <!-- Right: Actions -->
      <div class="flex items-center gap-3">
        <button class="btn-ghost">
          <HeartIcon /> Save
        </button>
        <button class="btn-ghost">
          <ShareIcon /> Share
        </button>
        <button class="btn-primary">
          Contact Venue
        </button>
      </div>
    </div>
  </div>
</div>
```

#### Behavior
```javascript
// Show/hide on scroll
const handleScroll = () => {
  const shouldShow = window.scrollY > 100;
  header.classList.toggle('opacity-100', shouldShow);
  header.classList.toggle('translate-y-0', shouldShow);
};

// Smooth scroll to sections
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(link.hash);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
```

---

### Inquiry Form Component (Sidebar)

#### Design
```
┌─────────────────────────────┐
│  Starting at $8,500         │
│  ─────────────────────────  │
│                             │
│  [Event Date Picker]        │
│  [Guest Count Dropdown]     │
│                             │
│  ──────────────────────────│
│                             │
│  [Name Input]               │
│  [Email Input]              │
│  [Phone Input]              │
│  [Message Textarea]         │
│                             │
│  [Request Pricing] (CTA)    │
│                             │
│  ✓ Response within 24hrs    │
│  ✓ No obligation quote      │
│                             │
└─────────────────────────────┘
```

#### Features
- **Sticky**: Stays in view as user scrolls
- **Progressive Disclosure**: Start with date + guests, expand to full form
- **Validation**: Real-time, helpful error messages
- **Trust Signals**: Response time, no obligation
- **CTA**: Clear, action-oriented button text

---

### Review Component

#### Layout
```
┌────────────────────────────────────────┐
│ ⭐⭐⭐⭐⭐ 5.0 (128 reviews)           │
│                                        │
│ ─────────────────────────────────────│
│                                        │
│ ┌─────────────────────────────────┐  │
│ │ ⭐⭐⭐⭐⭐  Sarah M.   Verified    │  │
│ │                                   │  │
│ │ "Absolutely stunning venue! The   │  │
│ │ team was incredible and made our  │  │
│ │ day perfect."                     │  │
│ │                                   │  │
│ │ 📷 📷 📷 [3 photos]                │  │
│ │                                   │  │
│ │ Helpful (12) | Report             │  │
│ └─────────────────────────────────┘  │
│                                        │
│ [Load More Reviews]                   │
│                                        │
└────────────────────────────────────────┘
```

#### Features
- **Verification Badges**: "Verified", "Real Wedding", "Vendor Response"
- **Photos**: User-submitted photos from real events
- **Helpful Votes**: Social proof
- **Filters**: Sort by rating, date, verified
- **Vendor Responses**: Shows vendor is engaged

---

## Typography

### Font Stack
```css
--font-display: 'Yeseva One', Georgia, serif;  /* Headings, hero text */
--font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', monospace;  /* Code, numbers */
```

### Scale
```css
--text-xs: 0.75rem;      /* 12px - captions, labels */
--text-sm: 0.875rem;     /* 14px - body small */
--text-base: 1rem;       /* 16px - body */
--text-lg: 1.125rem;     /* 18px - large body */
--text-xl: 1.25rem;      /* 20px - section headers */
--text-2xl: 1.5rem;      /* 24px - page headers */
--text-3xl: 1.875rem;    /* 30px - hero subheading */
--text-4xl: 2.25rem;     /* 36px - hero heading */
--text-5xl: 3rem;        /* 48px - large display */
```

### Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## Color Palette

### Primary Colors
```css
--primary-50: #eff6ff;   /* Lightest blue */
--primary-100: #dbeafe;
--primary-200: #bfdbfe;
--primary-300: #93c5fd;
--primary-400: #60a5fa;
--primary-500: #3b82f6;  /* Primary blue */
--primary-600: #2563eb;
--primary-700: #1d4ed8;
--primary-800: #1e40af;
--primary-900: #1e3a8a;  /* Darkest blue */
```

### Neutral Colors
```css
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

### Accent Colors
```css
--rose-500: #f43f5e;     /* Love, favorites */
--amber-500: #f59e0b;    /* Ratings, stars */
--emerald-500: #10b981;  /* Success, verified */
--red-500: #ef4444;      /* Errors, warnings */
```

### Semantic Colors
```css
--success: var(--emerald-500);
--warning: var(--amber-500);
--error: var(--red-500);
--info: var(--primary-500);
```

---

## Spacing Scale

### Tailwind-based Scale
```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

---

## Buttons

### Primary Button
```css
.btn-primary {
  background: var(--primary-600);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--primary-700);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
```

### Secondary Button
```css
.btn-secondary {
  background: white;
  color: var(--gray-700);
  border: 1px solid var(--gray-300);
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
}

.btn-secondary:hover {
  background: var(--gray-50);
  border-color: var(--gray-400);
}
```

### Ghost Button
```css
.btn-ghost {
  background: transparent;
  color: var(--gray-700);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
}

.btn-ghost:hover {
  background: var(--gray-100);
}
```

---

## Cards

### Venue Card (Grid)
```css
.venue-card {
  background: white;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.venue-card:hover {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}

.venue-card-image {
  aspect-ratio: 4/3;
  object-fit: cover;
  width: 100%;
}
```

### Info Card (Sidebar)
```css
.info-card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
```

---

## Icons

### Icon Library
Use **Heroicons** (MIT licensed, designed by Tailwind team)

```typescript
import {
  HeartIcon,      // Save/favorite
  ShareIcon,      // Share
  MapPinIcon,     // Location
  UsersIcon,      // Capacity
  CalendarIcon,   // Date
  CurrencyDollarIcon, // Price
  StarIcon,       // Rating
  PhotoIcon,      // Gallery
  CheckCircleIcon, // Verified
  XMarkIcon,      // Close
  ChevronLeftIcon, // Previous
  ChevronRightIcon, // Next
} from '@heroicons/react/24/outline';
```

### Icon Sizes
```css
--icon-xs: 1rem;    /* 16px */
--icon-sm: 1.25rem; /* 20px */
--icon-md: 1.5rem;  /* 24px */
--icon-lg: 2rem;    /* 32px */
--icon-xl: 3rem;    /* 48px */
```

---

## Animations

### Transitions
```css
--transition-fast: 150ms ease-in-out;
--transition-base: 200ms ease-in-out;
--transition-slow: 300ms ease-in-out;
```

### Common Animations
```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale in */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

---

## Responsive Breakpoints

```css
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
--breakpoint-2xl: 1536px; /* Extra large */
```

### Grid Layout
```css
/* Mobile: 1 column */
@media (max-width: 639px) {
  .venue-grid { grid-template-columns: 1fr; }
}

/* Tablet: 2 columns */
@media (min-width: 640px) and (max-width: 1023px) {
  .venue-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Desktop: 3 columns */
@media (min-width: 1024px) {
  .venue-grid { grid-template-columns: repeat(3, 1fr); }
}

/* Large desktop: 4 columns */
@media (min-width: 1280px) {
  .venue-grid { grid-template-columns: repeat(4, 1fr); }
}
```

---

## Accessibility

### Focus States
```css
*:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
  border-radius: 0.25rem;
}

button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
```

### ARIA Labels
```html
<!-- Image carousel -->
<button aria-label="Previous image">
  <ChevronLeftIcon />
</button>

<!-- Save button -->
<button aria-label="Save venue to favorites">
  <HeartIcon />
  <span>Save</span>
</button>

<!-- Rating -->
<div aria-label="5 out of 5 stars">
  <StarIcon /> <StarIcon /> <StarIcon /> <StarIcon /> <StarIcon />
</div>
```

### Keyboard Navigation
- Tab order follows visual hierarchy
- Arrow keys navigate through image gallery
- Escape key closes modals
- Enter/Space activate buttons

---

## Performance

### Image Optimization
```typescript
// Use Next.js Image component
<Image
  src="/venue-photo.jpg"
  width={1200}
  height={800}
  quality={85}
  loading="lazy"
  placeholder="blur"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### Code Splitting
```typescript
// Lazy load components
const Lightbox = dynamic(() => import('@/components/Lightbox'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const Reviews = dynamic(() => import('@/components/Reviews'));
```

### Metrics
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **Time to Interactive**: < 3.5s

---

## Mobile Considerations

### Touch Targets
- Minimum 44x44px (Apple HIG)
- Minimum 48x48px (Material Design)
- Spacing between targets: 8px minimum

### Mobile Navigation
```
┌─────────────────────────────────┐
│ ≡  Logo          [Save] [Share] │  <- Sticky
└─────────────────────────────────┘

[Full-width hero gallery]

[Content - single column]

┌─────────────────────────────────┐
│    [Contact Venue]  (Fixed)     │  <- Fixed bottom CTA
└─────────────────────────────────┘
```

### Gestures
- Swipe left/right: Navigate gallery
- Pinch: Zoom images
- Pull to refresh: Refresh content
- Long press: Share/save options

---

## Implementation Checklist

### Phase 1: Hero & Navigation
- [ ] Full-width hero gallery component
- [ ] Sticky header with scroll behavior
- [ ] Image lightbox modal
- [ ] Mobile-optimized gallery

### Phase 2: Content & Layout
- [ ] 2-column desktop layout
- [ ] Sidebar inquiry form
- [ ] Key details section
- [ ] Amenities grid

### Phase 3: Social Features
- [ ] Save/favorite functionality
- [ ] Share functionality
- [ ] Reviews & ratings
- [ ] Similar venues

### Phase 4: Polish
- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Animations & transitions
- [ ] SEO optimization
- [ ] Performance optimization

---

**Next Steps**: Start implementing the new venue detail page design, beginning with the hero gallery component.
