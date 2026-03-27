# Fix: Inspection Template Default Selection

## Root Cause Analysis

**Problem**: The "New Inspection" form defaulted to "— No template —", allowing users to create inspections without selecting a template. When submitted without a template selection, inspections were created with `template_id = null`.

**Location Found**:
- **Form component**: `app/dashboard/inspections/InspectionForm.tsx` (line 113)
- **Submit action**: `app/dashboard/inspections/actions.ts` (line 24)

---

## Solution Implemented

### 1. Frontend: Set Default Template Selection
**File**: `app/dashboard/inspections/InspectionForm.tsx` (lines 113-120)

**Change**: Added `defaultValue` to template select element that automatically selects the "Standard Vehicle Inspection" template on page load.

```tsx
<select
  name="template_id"
  className="field-select"
  defaultValue={
    templates.find(t => t.name === 'Standard Vehicle Inspection')?.id ?? ''
  }
>
  <option value="">— No template —</option>
  {templates.map(t => (
    <option key={t.id} value={t.id}>{t.name}</option>
  ))}
</select>
```

**Behavior**:
- If "Standard Vehicle Inspection" template exists, it's pre-selected when the form loads
- User can still override by selecting a different template
- Falls back to empty string if template not found (non-breaking)

---

### 2. Backend: Server-Side Fallback
**File**: `app/dashboard/inspections/actions.ts` (lines 24-40)

**Change**: Added server-side validation that automatically uses "Standard Vehicle Inspection" template if the form submits with an empty template_id.

```typescript
let templateId     = String(formData.get('template_id')   ?? '').trim() || null

// Server-side fallback: If no template provided, use "Standard Vehicle Inspection"
if (!templateId) {
  const { data: defaultTemplate } = await supabase
    .from('inspection_templates')
    .select('id')
    .eq('tenant_id', ctx.tenant.id)
    .eq('name', 'Standard Vehicle Inspection')
    .single()

  if (defaultTemplate) {
    templateId = defaultTemplate.id
  }
}
```

**Behavior**:
- If user somehow submits with empty template (e.g., JavaScript disabled, or bypassing frontend)
- Server automatically looks up "Standard Vehicle Inspection" by name
- Uses that template's ID for the inspection
- Ensures every inspection has the standard template by default

---

## Database Lookup Method

The implementation uses a **name-based lookup** rather than hardcoding a template ID:

```typescript
.eq('name', 'Standard Vehicle Inspection')
```

**Advantages**:
- ✅ No hardcoded UUIDs — works across environments
- ✅ Safe if template gets deleted (won't break other inspections)
- ✅ Automatic if template is recreated
- ✅ Clear intent in code

**Note**: Requires the template named exactly "Standard Vehicle Inspection" to exist in the database.

---

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| `app/dashboard/inspections/InspectionForm.tsx` | 113-120 | Added defaultValue with template lookup |
| `app/dashboard/inspections/actions.ts` | 24-40 | Added server-side fallback validation |

---

## Testing on Localhost

### Step 1: Verify Template Exists
```bash
# Check that "Standard Vehicle Inspection" template exists in DB
# (You should have this already)
```

### Step 2: Test Frontend Default
1. Navigate to `/dashboard/inspections/new`
2. **Expected**: Template dropdown should show "Standard Vehicle Inspection" pre-selected (not "— No template —")
3. Verify you can still select other templates manually

### Step 3: Test Form Submission
1. **Scenario A**: Select a different template manually, submit
   - ✅ Should create inspection with that template

2. **Scenario B**: Leave template on "Standard Vehicle Inspection" (default), submit
   - ✅ Should create inspection with "Standard Vehicle Inspection" template

3. **Scenario C** (Edge case): Manually clear the selection to "— No template —", submit
   - ✅ Server fallback should automatically use "Standard Vehicle Inspection"
   - Verify in DB that created inspection has Standard Vehicle Inspection template_id, not null

### Step 4: Verify Inspection Loads with Full Template
1. Create a new inspection (leaving template as default)
2. Open the created inspection
3. **Expected**: Should show all Standard Vehicle Inspection checklist items (full inspection form with all categories)
4. Should NOT show empty/blank inspection

---

## What This Fixes

| Scenario | Before | After |
|----------|--------|-------|
| User creates inspection without touching template field | Inspection created with `template_id = null` ❌ | Inspection created with Standard VI template ✅ |
| User explicitly selects different template | Works correctly | Still works correctly ✅ |
| JavaScript disabled / frontend bypassed | Inspection created with `template_id = null` ❌ | Server fallback uses Standard VI template ✅ |
| "Standard Vehicle Inspection" not found in DB | Template defaults to empty string, not selected | Falls back gracefully, no error ✅ |

---

## Backend Integration Notes

### Template Name Dependency
The fix depends on a template named exactly: `"Standard Vehicle Inspection"`

If you need to rename it:
1. Update the string in both files:
   - `InspectionForm.tsx` line 116
   - `actions.ts` line 34
2. Or use template ID if name changes frequently

### Database Query Performance
The server-side lookup happens on EVERY form submission where template_id is empty:
```typescript
.from('inspection_templates')
  .select('id')
  .eq('tenant_id', ctx.tenant.id)
  .eq('name', 'Standard Vehicle Inspection')
  .single()
```

**Optimization option** (if needed): Cache template IDs in memory or environment variables.

---

## Verification Checklist

- [ ] Template named "Standard Vehicle Inspection" exists in database
- [ ] Frontend test: Template dropdown pre-selected on `/dashboard/inspections/new`
- [ ] User can still select different templates manually
- [ ] Submit form with default template → inspection created correctly
- [ ] Submit form with different template → uses selected template ✅
- [ ] Edge case: Submit with "— No template —" selected → server fallback works
- [ ] Created inspection opens with full checklist items loaded
- [ ] Database inspection record shows correct template_id (not null)

---

## Rollback Plan

If needed to revert:
```bash
git checkout app/dashboard/inspections/InspectionForm.tsx
git checkout app/dashboard/inspections/actions.ts
```

Changes are isolated to these two files — no database migrations or structural changes.
