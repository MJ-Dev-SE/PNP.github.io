# TODO: Modify QuicklookInventoryt.tsx to use cstation_inventory

## Steps to Complete

- [x] Update fetch query to use "cstation_inventory" table, select appropriate columns, order by "sector" then "station"
- [x] Map fetched data to InventoryItem structure with correct field mappings
- [x] Update saveInlineEdit function to use "cstation_inventory" and correct field names
- [x] Update delete functionality to use "cstation_inventory" and "id" field
- [x] Update handleEditSave function to use "cstation_inventory" and correct field mappings
- [x] Modify toggleValidation to only update local state (no DB update for validation)
- [x] Verify all other features remain intact (filters, search, export, summary)
