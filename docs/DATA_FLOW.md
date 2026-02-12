# Data Flow Documentation

## Overview

PNP Inventory System uses a **client-side first approach** with localStorage for state management and Supabase for backend integration (currently not fully implemented).

---

## Architecture Layers

```
User Interface (React Components)
        ↓
State Management (localStorage + useState)
        ↓
Utilities Layer (storage.ts, security.ts, validation.ts)
        ↓
Supabase Client (supabase.ts)
        ↓
Backend (Supabase Database)
```

---

## Data Flow Patterns

### 1. **Inventory Items Flow**

#### Storage Pattern

```
localStorage key: inventory_items_v5_{SECTOR}

Example:
  inventory_items_v5_RHQ
  inventory_items_v5_CAVITE
  inventory_items_v5_LAGUNA
```

#### Component Flow

```
Dashboard Component
    ↓
useMemo() calls localStorage.getItem(itemsKey(sector))
    ↓
Parse JSON → Item[]
    ↓
Filter/Sort in memory (client-side)
    ↓
Render UI (MiniStat, Cards)
    ↓
User Action (click, edit)
    ↓
localStorage.setItem() updates state
```

#### Entry Points

- `Dashboard.tsx` — Views aggregate items across all sectors
- `InventoryStation.tsx` — Views/edits items for single station
- `QuicklookInventory.tsx` — Quick search/filter interface
- `QuicklookInventoryt.tsx` — Alternative view (variation), Same table look (Different Data)
- `SectorDashboard.tsx` — Sector-level aggregation
- `StationInventory.tsx` — Station-level management

### 2. **Stations (Locations) Flow**

#### Storage Pattern

```
localStorage key: stations_v1_{SECTOR}

Stored as: JSON array of station names

Example: ["Station A", "Station B", "Depot 1"]
```

#### Data Flow

```
loadStations(sector) from storage.ts
    ↓
Parse JSON or return []
    ↓
Use in dropdowns/filters
    ↓
User adds/removes station
    ↓
saveStations(sector, updatedList)
    ↓
localStorage updates
```

### 3. **Sector Navigation**

#### Sectors Defined

```typescript
SECTORS = ["RHQ", "CAVITE", "LAGUNA", "BATANGAS", "RIZAL", "QUEZON", "RMFB"];
```

#### Sector Data Flow

```
User selects sector (dropdown)
    ↓
Component updates local state
    ↓
Fetch sector-specific data:
  - items: localStorage.getItem(itemsKey(sector))
  - stations: localStorage.getItem(stationsKey(sector))
  - badge image: SECTOR_BADGES[sector]
    ↓
Render sector UI
```

---

## Security Data Flow

### Input Validation Chain

```
User Input
    ↓
Component receives input
    ↓
Validation (if applicable):
  - validateEmail() — for email fields
  - validatePhoneNumber() — for phone fields
  - validateURL() — for URL fields
  - validateAlphanumeric() — for generic alphanumeric
    ↓
Sanitize if needed:
  - sanitizeInput() — prevents XSS
  - sanitizeHtml() — for rich text
    ↓
Store in localStorage
```

### CSRF Protection Flow

```
Component makes request to external API
    ↓
getCSRFToken() from security.ts
    ↓
Add token to request headers:
  - X-CSRF-Token: [token]
  - X-Requested-With: XMLHttpRequest
    ↓
Send via secureFetch()
    ↓
Validation on server-side (future)
```

---

## Current Issues / Missing Implementation

### 🔴 **Critical Gaps**

1. **Empty ErrorHandler**
   - File: `src/utils/errorHandler.ts` (empty)
   - Impact: No centralized error logging or display
   - **Fix needed:** Implement error handler with try-catch wrappers

2. **Empty ErrorBoundary**
   - File: `src/components/ErrorBoundary.tsx` (empty)
   - Impact: Unhandled React component errors crash the app
   - **Fix needed:** Implement React Error Boundary

3. **Supabase Not Fully Integrated**
   - Client initialized in `src/lib/supabase.ts` but rarely used
   - No real authentication flow
   - No database syncing (relies 100% on localStorage)
   - **Fix needed:** Implement Supabase auth + database queries

4. **No Error Handling for localStorage**
   ```
   If localStorage quota exceeded → App silently fails
   If JSON parsing fails → Item data lost
   If network is offline → No sync capability
   ```

### ⚠️ **Design Risks**

| Risk                 | Cause                                       | Impact                                     | Mitigation                        |
| -------------------- | ------------------------------------------- | ------------------------------------------ | --------------------------------- |
| Data Loss            | localStorage is browser-only, not backed up | User data deleted if browser cache cleared | Sync to Supabase regularly        |
| No Multi-Device Sync | Data only on one device                     | Can't access from another device/browser   | Implement Supabase real-time sync |
| No Audit Trail       | No history of changes                       | Can't track who changed what/when          | Add audit logging to Supabase     |
| No Role-Based Access | All users see all sectors                   | No permission control                      | Implement RLS in Supabase         |
| Quota Risk           | localStorage limit ~10MB                    | Large inventories might crash              | Implement pagination/archiving    |

---

## Data State Lifecycle

### Example: Adding an Inventory Item

```
1. User fills form (InventoryStation.tsx)
   └─ Component state: { sku, quantity, station, sector }

2. User clicks "Save"
   └─ Validation runs
   └─ sanitizeInput() cleans strings

3. Create item object
   └─ { id: uuid, sku, quantity, station, sector, timestamp }

4. Load current items from localStorage
   └─ const items = JSON.parse(localStorage.getItem(itemsKey(sector)))

5. Add new item to array
   └─ items.push(newItem)

6. Save back to localStorage
   └─ localStorage.setItem(itemsKey(sector), JSON.stringify(items))

7. UI updates (React state triggers re-render)
   └─ Dashboard shows new item

8. [MISSING] Sync to Supabase
   └─ await supabase.from('items').insert(newItem)
   └─ [Currently not implemented]
```

---

## Environment & Configuration

### Required Environment Variables

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Configuration Entry Point

```
File: src/lib/supabase.ts
Reads: import.meta.env (Vite environment)
Creates: Global supabase client
```

### Error Case

```
If VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing
  └─ supabase client creation fails
  └─ No error message shown to user
  └─ App still loads but external features won't work
```

---

## Storage Constants & Keys

| Constant              | Purpose                                | Current Use                       |
| --------------------- | -------------------------------------- | --------------------------------- |
| `SECTORS`             | List of all sector names               | Dropdown options, loop iterations |
| `SECTOR_BADGES`       | Sector name → Image path mapping       | Display sector icons              |
| `itemsKey(sector)`    | Generate localStorage key for items    | Read/write inventory data         |
| `stationsKey(sector)` | Generate localStorage key for stations | Read/write station lists          |

---

## Future Data Flow (Recommended)

### Phase 1: Add Error Handling

```
Try-catch in all data operations
├─ localStorage failures
├─ JSON parse errors
└─ API request failures
```

### Phase 2: Add Supabase Sync

```
User makes local change
    ↓
Update localStorage (immediate UI update)
    ↓
Queue sync request to Supabase
    ↓
On successful sync, mark as synced
    ↓
On failure, show toast error + retry
```

### Phase 3: Add Real-Time Sync

```
User A updates item on Device 1
    ↓
Supabase broadcasts change
    ↓
User B's app (Device 2) receives update
    ↓
Auto-refresh UI without reload
```

### Phase 4: Add Offline Mode

```
App loads data when online
    ↓
Cache all data locally
    ↓
User goes offline
    ↓
App continues working with cached data
    ↓
User makes changes offline
    ↓
Queue changes in local DB
    ↓
When online, sync queued changes
```

---

## Testing Data Flows

### Manual Test Checklist

- [ ] Add item → Check localStorage in DevTools
- [ ] Refresh page → Data persists
- [ ] Switch sectors → Correct data loads
- [ ] Clear browser cache → App handles missing data gracefully
- [ ] Invalid JSON in localStorage → App doesn't crash
- [ ] Quota exceeded (fill localStorage) → Error message shown
- [ ] No .env.local file → Clear error about missing config

---

## Related Files

- `src/utils/storage.ts` — Storage helpers and sector constants
- `src/utils/security.ts` — Input validation and sanitization
- `src/lib/supabase.ts` — Supabase client initialization
- `src/pages/*.tsx` — All components that display/edit data
- `docs/SECURITY_SUMMARY.md` — Security considerations for data
