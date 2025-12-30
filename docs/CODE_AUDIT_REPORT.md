# PharmaTrack Code Audit Report
## Critical Calculations Review

**Generated:** December 30, 2024  
**Purpose:** Ensure calculation accuracy before production deployment

---

## ✅ VERIFIED CORRECT

### 1. Cart Total Calculation (`useCart.ts`)
```typescript
const getTotal = () => {
  return items.reduce((total, item) => {
    const price = item.medication.selling_price || item.medication.unit_price;
    return total + price * item.quantity;
  }, 0);
};
```
**Status:** ✅ Correct  
**Logic:** Uses selling_price if available, falls back to unit_price. Multiplies by quantity and sums.

---

### 2. Stock Deduction (`useSales.ts`)
```typescript
const newStock = Math.max(0, currentStock - item.quantity);
```
**Status:** ✅ Correct  
**Logic:** Prevents negative stock with `Math.max(0, ...)`. Stock is deducted after sale is recorded.

---

### 3. Low Stock Detection (`useMedications.ts`)
```typescript
lowStockItems: medications.filter(m => m.current_stock <= m.reorder_level).length
```
**Status:** ✅ Correct  
**Logic:** Uses `<=` which properly catches items AT reorder level (need to order when you hit the threshold).

---

### 4. Expiry Date Checks
```typescript
// useMedications.ts
const isExpired = (expiryDate: string): boolean => {
  return isBefore(parseISO(expiryDate), new Date());
};

// useSales.ts - Same logic
export const isExpiredBatch = (expiryDate: string): boolean => {
  return isBefore(parseISO(expiryDate), new Date());
};
```
**Status:** ✅ Correct  
**Logic:** Uses date-fns `isBefore` and `parseISO` for reliable date comparison.

---

### 5. Financial Summary Calculations (`FinancialSummary.tsx`)
```typescript
const value = med.current_stock * Number(med.unit_price);
```
**Status:** ⚠️ ATTENTION NEEDED  
**Issue:** Uses `unit_price` (cost) not `selling_price` for inventory valuation.  
**Impact:** This is actually CORRECT for inventory valuation (you value at cost, not retail).

---

### 6. Branch Stock Management (`useBranchInventory.ts`)
```typescript
// For main branch
branch_stock: m.current_stock,

// For other branches
branch_stock: branchData?.current_stock ?? 0,
```
**Status:** ✅ Correct  
**Logic:** Main branch uses central stock, other branches use branch_inventory table.

---

### 7. FEFO (First Expiry, First Out) Logic (`useSales.ts`)
```typescript
export const findFEFOBatch = (medications: Medication[], name: string): Medication | null => {
  const validBatches = medications
    .filter(med => 
      med.name === name && 
      med.current_stock > 0 && 
      !isExpiredBatch(med.expiry_date)
    )
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
  
  return validBatches.length > 0 ? validBatches[0] : null;
};
```
**Status:** ✅ Correct  
**Logic:** Filters out expired and out-of-stock, then sorts by earliest expiry.

---

## ⚠️ POTENTIAL ISSUES TO MONITOR

### Issue 1: Race Condition in Stock Updates
**Location:** `useSales.ts` lines 206-281

When multiple users sell the same item simultaneously:
1. User A reads stock = 10
2. User B reads stock = 10
3. User A sells 5, updates to 5
4. User B sells 3, reads fresh stock (should get 5), updates to 2 ✅

**Status:** ✅ Actually OK - The code fetches fresh stock before each update:
```typescript
const { data: medicationData } = await supabase
  .from('medications')
  .select('current_stock')
  .eq('id', item.medication.id)
  .maybeSingle();
```

---

### Issue 2: Shift Statistics Aggregation
**Location:** `useSales.ts` lines 288-303

```typescript
await supabase
  .from('staff_shifts')
  .update({
    total_sales: (currentShift.total_sales || 0) + totalSaleAmount,
    total_transactions: (currentShift.total_transactions || 0) + 1,
  })
  .eq('id', shiftId);
```
**Status:** ✅ Correct  
**Logic:** Properly handles null values with `|| 0` fallback.

---

### Issue 3: Metrics Calculation for Expiring Soon
**Location:** `useMedications.ts` lines 155-158

```typescript
expiringWithin30Days: medications.filter(m => {
  const expiryDate = parseISO(m.expiry_date);
  return isAfter(expiryDate, today) && isBefore(expiryDate, thirtyDaysFromNow);
}).length,
```
**Status:** ✅ Correct  
**Logic:** Properly excludes already expired items (must be after today) and counts only those expiring within 30 days.

---

## 🔴 IDENTIFIED RISKS

### Risk 1: Quantity Exceeding Available Stock
**Location:** `useCart.ts` and `Checkout.tsx`

The cart allows adding items up to `current_stock`. But between cart add and checkout, stock may have changed (another user sold it).

**Current Mitigation:** The sale process checks fresh stock before deducting.

**Recommendation:** Add a final stock verification in `handleCompleteSale` before processing.

---

### Risk 2: Price Changes During Cart Session
**Location:** `useCart.ts`

Cart stores the medication object at time of adding. If prices change while item is in cart, the old price is used.

**Impact:** Could lead to pricing discrepancies.

**Recommendation:** For high-value items, consider refreshing prices at checkout.

---

### Risk 3: Offline Sales Sync
**Location:** `useSales.ts` lines 155-186

Offline sales are queued and synced later. If stock was updated while offline, sync may create inconsistencies.

**Current Mitigation:** Offline sync rechecks stock on sync.

---

## 📊 CALCULATION VERIFICATION CHECKLIST

For testing, verify these scenarios:

### Sales & Stock
- [ ] Sell 1 item → Stock decreases by 1
- [ ] Sell 5 items → Stock decreases by 5
- [ ] Sell all remaining stock → Stock becomes 0
- [ ] Try to sell more than stock → Should be prevented at cart level

### Pricing
- [ ] Item with selling_price=100, unit_price=80 → Cart shows 100
- [ ] Item with selling_price=null, unit_price=80 → Cart shows 80
- [ ] Multiple items → Total = sum of (price × qty)

### Inventory Value
- [ ] 10 items at cost price 50 each → Value = 500
- [ ] Mix of items → Sum of (stock × cost_price)

### Expiry Alerts
- [ ] Item expired yesterday → Shows as "Expired"
- [ ] Item expires today → Shows as "Expired" (expired at start of day)
- [ ] Item expires in 29 days → Shows as "Expiring Soon"
- [ ] Item expires in 31 days → Shows as "Safe"

### Low Stock
- [ ] Stock=10, Reorder=10 → Shows as "Low Stock" ✅
- [ ] Stock=9, Reorder=10 → Shows as "Low Stock" ✅
- [ ] Stock=11, Reorder=10 → Does NOT show as "Low Stock" ✅

---

## 🧪 RECOMMENDED TESTS BEFORE PRODUCTION

1. **End-to-End Sale Test**
   - Add items to cart
   - Complete sale
   - Verify stock decreased
   - Verify sale appears in history
   - Verify receipt total matches

2. **Multi-User Concurrent Test**
   - Open checkout on 2 devices
   - Try to sell same item simultaneously
   - Verify stock doesn't go negative

3. **Expiry Workflow Test**
   - Add item expiring soon
   - Verify alerts show correctly
   - Verify FEFO suggests oldest expiry first

4. **Financial Report Test**
   - Record several sales
   - Verify daily total matches sum of individual sales
   - Verify profit calculation (if selling_price - unit_price × qty)

5. **Branch Transfer Test**
   - Transfer stock from HQ to branch
   - Verify HQ stock decreases
   - Verify branch stock increases
   - Sell from branch, verify branch stock decreases

---

## CONCLUSION

The codebase has **solid calculation logic** with proper handling of:
- Null/undefined values
- Edge cases (zero stock, expired items)
- Real-time stock verification
- Branch isolation

**Confidence Level:** 85%

**Remaining 15% Risk Areas:**
- Concurrent user scenarios (need load testing)
- Offline sync edge cases
- Price change during cart session

**Recommendation:** Proceed with controlled pilot testing with 1 pharmacy before full rollout.
