# Plan: Reorganize Analytics Tab - Financials First

## Problem Statement
Client feedback indicates financial data is buried in the Analytics tab. Currently, owners have to scroll through 9+ panels before seeing their financial reports. The FinancialSummary and SalesAnalytics components are at positions 10 and 12 respectively.

## Current Analytics Tab Order (Problematic)
1. QuickGlancePanel, ShiftClock, LiveActivityFeed
2. StaffQuickActions
3. Key Metrics (SKUs, Low Stock, Expired, Expiring)
4. StaffPerformancePanel
5. OwnerBranchReportsPanel
6. ConsolidatedReportsPanel
7. BranchComparisonPanel
8. ManagerKPIPanel
9. Business Intelligence (ProfitMarginAnalyzer, DemandForecasting)
10. **FinancialSummary** (buried!)
11. InventoryCharts
12. **SalesAnalytics** (buried!)
13. NAFDACCompliancePanel

## Proposed Analytics Tab Order (Financials First)
1. **SalesAnalytics** - Revenue, Profit, Orders, Margin (MOVED UP)
2. **FinancialSummary** - Inventory value, expired loss, at-risk (MOVED UP)
3. **ManagerKPIPanel** - Today's revenue, margin, transactions (MOVED UP)
4. QuickGlancePanel, ShiftClock, LiveActivityFeed
5. Key Metrics (SKUs, Low Stock, Expired, Expiring)
6. Business Intelligence (ProfitMarginAnalyzer, DemandForecasting)
7. OwnerBranchReportsPanel
8. ConsolidatedReportsPanel
9. BranchComparisonPanel
10. StaffPerformancePanel
11. InventoryCharts
12. StaffQuickActions (moved to bottom - less critical)
13. NAFDACCompliancePanel

## Implementation Details

### File to Modify
- `src/pages/Dashboard.tsx` (lines 437-638 - Analytics TabsContent)

### Changes Required
Reorder the motion.section components within the Analytics TabsContent to place financial components first:

1. Move SalesAnalytics to position 1 (delay: 0.1)
2. Move FinancialSummary to position 2 (delay: 0.15)
3. Move ManagerKPIPanel to position 3 (delay: 0.2)
4. QuickGlancePanel/ShiftClock/LiveActivityFeed to position 4 (delay: 0.25)
5. Key Metrics grid to position 5 (delay: 0.3)
6. Business Intelligence to position 6 (delay: 0.35)
7. OwnerBranchReportsPanel to position 7 (delay: 0.4)
8. ConsolidatedReportsPanel to position 8 (delay: 0.45)
9. BranchComparisonPanel to position 9 (delay: 0.5)
10. StaffPerformancePanel to position 10 (delay: 0.55)
11. InventoryCharts to position 11 (delay: 0.6)
12. StaffQuickActions to position 12 (delay: 0.65)
13. NAFDACCompliancePanel remains last (delay: 0.7)

## Risk Assessment

**Very Low Risk**
- No database changes
- No backend changes
- No new components
- No logic changes
- Only reordering existing JSX elements
- All components already tested and working

## Verification Steps
1. Navigate to /dashboard
2. Click "Analytics" tab
3. Verify SalesAnalytics appears first
4. Verify FinancialSummary appears second
5. Verify ManagerKPIPanel appears third
6. Verify all components still render correctly
7. Verify no console errors

## Expected Outcome
When owners click the Analytics tab, they immediately see:
1. Their sales and profit numbers (SalesAnalytics)
2. Their inventory financial overview (FinancialSummary)
3. Their daily business KPIs (ManagerKPIPanel)

This matches the competitor app experience where fiscal reports are front and center.

## Files Modified
| File | Action |
|------|--------|
| `src/pages/Dashboard.tsx` | MODIFY - Reorder Analytics tab sections |

## Critical Files for Implementation
- `src/pages/Dashboard.tsx` - Main file to modify (reorder sections in Analytics TabsContent)
- `src/components/dashboard/SalesAnalytics.tsx` - Reference for understanding what it displays
- `src/components/dashboard/FinancialSummary.tsx` - Reference for understanding what it displays
- `src/components/dashboard/ManagerKPIPanel.tsx` - Reference for understanding what it displays
