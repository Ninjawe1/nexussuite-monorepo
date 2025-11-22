# UI Migration Plan: Custom Components to shadcn/ui

## Current State Analysis

### Components Already Using shadcn/ui (✅ Good)
These components are already properly integrated with shadcn/ui:

**Core Components:**
- `bottom-profile.tsx` - Uses Avatar, Button, DropdownMenu, and tweakcn for styling
- `app-sidebar.tsx` - Uses Sidebar components and integrates BottomProfile
- `staff-card.tsx` - Uses Card, Avatar, Badge, Button, DropdownMenu
- `campaign-card.tsx` - Uses Card, Badge components
- `contract-attachments.tsx` - Uses Button, Input components
- `roster-list.tsx` - Uses Card, Badge, Button, Avatar components
- `roster-details-dialog.tsx` - Uses Badge, Button, Avatar, Card, Separator
- `audit-log-entry.tsx` - Uses Avatar, Badge components
- `match-card.tsx` - Uses Card, Badge components
- `contract-row.tsx` - Uses Button, Badge components

**Dialog Components:**
- `match-dialog.tsx` - Uses Input, Button, Textarea
- `campaign-dialog.tsx` - Uses Input, Button, Textarea, Checkbox
- `contract-dialog.tsx` - Uses Input, Button
- `staff-dialog.tsx` - Uses Input, Button, Checkbox
- `payroll-dialog.tsx` - Uses Input, Button
- `tournament-dialog.tsx` - Uses Input, Textarea, Button
- `round-dialog.tsx` - Uses Input, Button
- `player-roster-dialog.tsx` - Uses Dialog, Button, Select, Input
- `social-account-dialog.tsx` - Uses Dialog, Button, Input, Label, Select, Form
- `social-account-dialog-oauth.tsx` - Uses Dialog, Button, Card, Badge, Alert
- `wallet-dialog.tsx` - Uses Button, Input, Checkbox
- `player-add-dialog.tsx` - Uses Input, Checkbox, Button
- `roster-creation-dialog.tsx` - Uses Input, Textarea, Button
- `roster-edit-dialog.tsx` - Uses Button, Form, Input, Textarea, ToggleGroup
- `assign-to-roster-dialog.tsx` - Uses Button, Form, Input, Select
- `player-assignment-dialog.tsx` - Uses Button, Badge, Avatar, Checkbox, ScrollArea, Separator, Card, Input, Alert

**Utility Components:**
- `theme-toggle.tsx` - Uses Button component
- `stat-card.tsx` - Uses Card components

### Components That Need Migration (⚠️ Action Required)

**Custom Styling Issues:**
1. **`bottom-profile.tsx`** - Uses `tweakcn` instead of standard `cn` utility
2. **Various components** - Mix of `tweakcn` and `cn` utilities needs standardization

### Migration Strategy

#### Phase 1: Standardize Utility Functions
**Priority: HIGH**
- Replace all `tweakcn` imports with `cn` from `@/lib/utils`
- Ensure consistent styling approach across all components
- Update `bottom-profile.tsx` to use standard `cn` utility

#### Phase 2: Component-Specific Updates
**Priority: MEDIUM**
1. **Avatar Components**: Standardize Avatar usage patterns
2. **Card Components**: Ensure consistent Card structure
3. **Button Components**: Standardize Button variants and sizes
4. **Form Components**: Ensure proper Form integration

#### Phase 3: Theme Integration
**Priority: MEDIUM**
1. **CSS Variables**: Ensure all components use CSS variables for theming
2. **Dark Mode**: Verify dark mode compatibility
3. **Responsive Design**: Ensure mobile responsiveness

### Key Files to Update

#### Primary Targets:
1. `bottom-profile.tsx` - Replace `tweakcn` with `cn`
2. Standardize import patterns across all components
3. Ensure consistent use of shadcn/ui components

#### Supporting Files:
1. `lib/utils.ts` - Ensure `cn` utility is properly configured
2. `components.json` - Verify shadcn configuration
3. Theme configuration files

### Migration Steps

1. **Backup Completed** ✅
   - Created backup at: `components_backup_20251105_182125`

2. **Standardize Utilities** (Next)
   - Replace `tweakcn` with `cn` in `bottom-profile.tsx`
   - Update import statements
   - Test component functionality

3. **Component Audit** (Ongoing)
   - Review each component for shadcn/ui best practices
   - Identify any custom components that could be replaced
   - Document any custom logic that needs preservation

4. **Theme Integration**
   - Ensure all components support theme switching
   - Test with `/light`, `/dark`, `/nova` theme routes
   - Verify CSS variable usage

### Risk Assessment

**Low Risk:**
- Components already using shadcn/ui just need utility standardization
- Most business logic is preserved

**Medium Risk:**
- Theme switching functionality needs verification
- Some styling may need adjustment after utility changes

**Migration Success Criteria:**
- All components use standard `cn` utility
- Theme switching works consistently
- No breaking changes to existing functionality
- Improved maintainability and consistency