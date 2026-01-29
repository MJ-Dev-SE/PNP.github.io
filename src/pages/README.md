# Pages Folder Documentation

## Overview

The `pages/` folder contains all the main route components for the **PNP Inventory Management System**. Each page represents a distinct section of the application with its own data flow, business logic, and UI.

---

## File Structure & Purpose

### 📊 **Dashboard.tsx**

**Purpose:** Main landing/overview page for the inventory system

- Displays aggregate statistics across all sectors
- Shows quick access to different stations and inventory categories
- Provides high-level insights into inventory status

---

### 🏢 **SectorDashboard.tsx**

**Purpose:** Dashboard for a specific sector (regional/office division)

- Lists all stations within a selected sector
- Shows sector-level aggregated data (total SKUs, units, costs)
- Provides navigation to individual station inventory pages

**Data Flow:**

- Receives sector parameter from URL
- Fetches data from Supabase for that sector
- Routes to StationInventory when user selects a station

---

### 📦 **StationInventory.tsx** ⭐ (Primary File - Recently Organized)

**Purpose:** Detailed inventory management for a specific station

- Full CRUD operations on inventory items (Create, Read, Update, Delete)
- Filter, search, and sort capabilities
- CSV import/export functionality
- Image upload and management per item
- Real-time data synchronization with Supabase

**Key Features:**

1. **Add Items:** Form with image uploads, validation, and activity logging
2. **View Items:** Paginated table with sorting, filtering, and search
3. **Edit Items:** Modal-based editing with image management
4. **Delete Items:** Confirmation dialogs with activity logging
5. **CSV Operations:** Import station/quicklook CSVs or export current data
6. **Image Viewer:** Modal with keyboard navigation for reviewing item photos
7. **Activity Audit:** All changes logged to `inventory_activity_log` table

**Data Structure:**

```typescript
type Item = {
  id: string;
  sector: string;
  station: string;
  equipment: string;
  type: string;
  make: string;
  serialNo: string;
  propertyNo: string;
  acquisitionDate: string | number;
  acquisitionCost: number;
  costOfRepair: number;
  currentOrDepreciated: string;
  status: { svc, uns, ber };        // Service status counts
  source: { procured, donated, ... }; // Equipment sourcing breakdown
  whereabouts: { userOffice, userName }; // Current location info
  imageUrls?: string[];
  createdAt: string;
}
```

**Component Organization:**

```
┌─ CONSTANTS & CONFIGURATION
├─ TYPE DEFINITIONS
├─ UTILITY FUNCTIONS
│  ├─ Misc (sleep, modal controls)
│  ├─ Validation & Data Parsing
│  ├─ Image Handling
│  └─ CSV Import/Export
├─ STATE MANAGEMENT
│  ├─ Data Management
│  ├─ Filters & Sorting
│  └─ UI & Modals
├─ LIFECYCLE (Effects)
├─ MEMOIZED VALUES (Filtering, Pagination, Totals)
├─ VALIDATION RULES
├─ EVENT HANDLERS
│  └─ CRUD Operations
│  └─ UI Interactions
└─ RENDER (JSX Layout)
```

---

### 🔍 **QuicklookInventory.tsx**

**Purpose:** Alternative inventory view/entry system for quick lookups

- Faster data entry with minimal required fields
- Alternative UI optimized for speed over detail
- Different data schema focused on essential equipment info

---

### ✏️ **QuicklooktEntryForm.tsx**

**Purpose:** Modal form component for Quicklook inventory entries

- Separate entry mechanism from station inventory
- Can be opened independently or seeded with CSV data
- Provides streamlined data capture for specific equipment types

---

### 🎨 **QuicklookInventoryt.tsx**

**Purpose:** (Appears to be variant/alternative of QuicklookInventory)

- Possibly legacy or alternative implementation

---

### 📋 **QL.css**

**Purpose:** Styling for Quicklook components

- Custom CSS for Quicklook-specific UI elements
- Complements Tailwind classes in components

---

## Data Flow Architecture

```
Dashboard
    ↓
SectorDashboard (select sector)
    ↓
StationInventory (select station)
    ├─ Fetch items from Supabase
    ├─ CRUD Operations
    ├─ CSV Import → routes to QuicklookEntryForm if Quicklook CSV
    ├─ CSV Export
    └─ Image Management

QuicklookInventory ←→ QuicklooktEntryForm
    └─ Alternative entry/view system
```

---

## Key Concepts

### 1. **Nested Hierarchy**

- **Sector** = Regional/office division
- **Station** = Individual location within sector
- **Item** = Equipment/asset at that station

### 2. **Status Tracking** (from `Item.status`)

- **SVC (Serviceable):** Equipment in working condition
- **UNS (Unserviceable):** Equipment needing repair
- **BER (Beyond Economic Repair):** Equipment beyond cost-effective repair

### 3. **Source Tracking** (from `Item.source`)

- **Procured:** Purchased equipment
- **Donated:** Received donations
- **Found at Station:** Already present equipment
- **Loaned:** Borrowed items

### 4. **Activity Logging**

- All CRUD operations logged to `inventory_activity_log` table
- Stores user, department, timestamp, and action type
- Includes snapshot of the affected record

### 5. **CSV Workflow**

Two CSV formats supported:

- **Station Inventory CSV:** Standard format for bulk uploads
- **Quicklook CSV:** Alternative format for streamlined entries

---

## Recent Refactoring (StationInventory.tsx)

### Changes Made:

1. **Removed Unused Code:**
   - `loading` state (unused)
   - `normalizeCode` function (unused)
   - `pick` function (unused)

2. **Organized into Clear Sections:**
   - Imports and constants grouped
   - Types defined separately
   - Utility functions by category
   - State variables organized by purpose
   - useEffect hooks grouped
   - Memoized values clearly marked
   - Handlers organized by function

3. **Enhanced Documentation:**
   - Added JSDoc comments explaining the purpose and process
   - Section headers for navigation
   - Learning-oriented comments about design decisions

4. **Code Quality:**
   - Removed duplicate function definitions
   - Consistent naming conventions
   - Clear separation of concerns

### File Structure Pattern:

```typescript
// ============================================================================
// SECTION NAME
// ============================================================================

/**
 * Descriptive comment explaining what this does and why
 * Includes process details useful for learning
 */
const functionOrVariable = ...;
```

---

## Database Tables Referenced

### `station_inventory`

Main table storing inventory items

- Columns map to `Item` type structure
- snake_case naming convention in DB
- Supports image URL arrays

### `inventory_activity_log`

Audit trail for all changes

- Records action (ADD, UPDATE, DELETE, CSV_IMPORT)
- Stores user and department info
- Snapshots full record state
- Enables rollback/audit capabilities

---

## Best Practices in This Codebase

1. **Data Transformation:** Always use `mapRowToItem` to convert Supabase rows to app types
2. **Validation First:** Validate before uploading images or modifying database
3. **Activity Logging:** Log all mutations for audit trail
4. **Error Handling:** Use SweetAlert2 for user-friendly error messages
5. **Loading States:** Enforce minimum loading time for better UX
6. **Keyboard Navigation:** Image viewer supports arrow keys and escape
7. **Memoization:** Use `useMemo` to prevent unnecessary recalculations
8. **Cleanup:** Remove event listeners in useEffect cleanup functions

---

## Development Notes

- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS + custom CSS
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage for images
- **Alerts:** SweetAlert2 for dialogs
- **Routing:** React Router (useParams, useNavigate)
- **State:** React Hooks (useState, useEffect, useMemo)

---

## Common Workflows

### Adding a New Station

1. Admin navigates to SectorDashboard
2. Creates new station record in database
3. Station becomes available in list

### Adding Items to Station

1. User navigates to StationInventory
2. Fills Add Item form with required fields
3. Uploads image(s)
4. System validates and inserts to database
5. Activity log records the addition

### Bulk Import

1. Prepare CSV in correct format
2. Click "Import CSV" button
3. Select CSV file
4. System validates format and inserts all rows
5. Page filtered to show only imported items
6. Activity logs created for each import

---

## Future Enhancement Ideas

- Batch operations (multi-select delete, update)
- Advanced reporting/analytics
- Mobile-optimized view
- Barcode scanning integration
- Maintenance schedule tracking
- Cost tracking and depreciation calculations
