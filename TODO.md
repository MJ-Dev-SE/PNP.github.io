# Implementation TODO List

## Forgot Password (Option A - Email-based Supabase Auth)

### Phase 1: Supabase Configuration

- [ ] 1. Configure Supabase Auth settings for email/password
- [ ] 2. Update Supabase client to handle auth sessions

### Phase 2: UI Components

- [ ] 3. Create ForgotPasswordModal component
- [ ] 4. Create ResetPasswordPage component
- [ ] 5. Add "Forgot Password?" link to login modal

### Phase 3: Authentication Flow

- [ ] 6. Update login to use email/password
- [ ] 7. Implement password reset email sending
- [ ] 8. Implement password update functionality
- [ ] 9. Map users to departments after login

---

## Bulk Delete

### Phase 1: Quicklook Inventory

- [ ] 10. Add checkbox column to QuicklookTable
- [ ] 11. Add Select All / Deselect All functionality
- [ ] 12. Add bulk delete button to toolbar
- [ ] 13. Implement bulk delete action in actions.ts

### Phase 2: Station Inventory

- [ ] 14. Add checkbox column to StationInventory table
- [ ] 15. Add Select All / Deselect All functionality
- [ ] 16. Add bulk delete button to toolbar
- [ ] 17. Implement bulk delete function in StationInventoryPage

---

## Files to Create:

- src/features/quicklookt/components/ForgotPasswordModal.tsx
- src/pages/ResetPassword.tsx (or in features)

## Files to Modify:

- src/features/quicklookt/components/QuicklookModals.tsx (add forgot password link)
- src/features/quicklookt/components/QuicklookTable.tsx (add checkboxes)
- src/features/quicklookt/actions.ts (add bulk delete)
- src/features/station-inventory/StationInventoryPage.tsx (add bulk delete)
- src/lib/supabase.ts (update if needed)
- src/App.tsx (add routes for reset password)
