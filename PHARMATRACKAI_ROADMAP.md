# PHARMATRACKAI ROADMAP

## Version 1.0 - Foundation Phase

**Status:** In Progress  
**Last Updated:** 2026-07-26  
**Target:** Establish core pharmacy OS fundamentals with zero technical debt

---

## Current Release Cycle

### ✅ Completed Features

- [x] **Drug Interaction Engine** – Clinical rule matrix with 19 documented interactions
- [x] **Invoice Scanner** – Gemini vision API for automated invoice OCR
- [x] **Smart Upsell Engine** – AI-powered product recommendations
- [x] **Expiry Monitoring (FEFO)** – Automatic batch tracking and alerts
- [x] **Multi-branch Inventory** – Branch-specific stock management
- [x] **Role-Based Dashboards** – Cashier, Staff, Manager, Admin views
- [x] **PWA Support** – Offline-capable mobile app
- [x] **Supabase Backend** – Real-time sync with offline fallback

---

## Phase 1: Intelligent Automation (Current)

### Priority: Reduce pharmacist manual work to zero

#### 1.1 Automatic Low-Stock Detection

**Objective:** Pharmacists never manually check stock levels again.

- [ ] Background job monitors inventory hourly
- [ ] Automatic reorder suggestions based on consumption rate
- [ ] Smart alerts only for critical shortages
- [ ] Integration with supplier ordering system (future phase)

**Implementation:** Supabase scheduled functions + Upstash cron  
**Cost:** $0 (existing infrastructure)

---

#### 1.2 Automatic Report Generation

**Objective:** Reports exist before users ask for them.

- [ ] Daily sales summary auto-generated at close
- [ ] Weekly inventory variance analysis
- [ ] Monthly profitability breakdown by product category
- [ ] NAFDAC compliance reports auto-compiled
- [ ] Reports stored and accessible, not emailed

**Implementation:** Supabase Edge Functions + PostgSQL triggers  
**Cost:** $0

---

#### 1.3 Automatic Duplicate Medicine Detection

**Objective:** Prevent inventory chaos from duplicate entries.

- [ ] Fuzzy matching on medicine names (handle typos)
- [ ] Batch merge with stock consolidation
- [ ] Audit trail of merges for compliance
- [ ] Real-time warning when duplicates are about to be added

**Implementation:** Frontend validation + backend deduplication  
**Cost:** $0

---

#### 1.4 Automatic Expiry Warnings

**Objective:** No expired medicines ever reach the checkout.

- [ ] Real-time FEFO enforcement at POS
- [ ] Pre-checkout validation prevents expired items
- [ ] Dashboard highlights near-expiry batches (30 days, 7 days, 1 day)
- [ ] Automatic removal of expired items from sellable inventory

**Implementation:** Supabase triggers + real-time subscriptions  
**Cost:** $0

---

#### 1.5 Intelligent Reorder Suggestions

**Objective:** Pharmacists know what to order before stock runs out.

- [ ] Consumption rate analysis (30-day rolling average)
- [ ] Automatic reorder point calculation per medicine
- [ ] Supplier lead time factored in
- [ ] "Suggested Purchase Order" pre-filled with quantities
- [ ] Export to PDF or direct supplier integration

**Implementation:** Backend algorithm + caching  
**Cost:** $0

---

### Phase 1 Success Criteria

✅ Pharmacists spend <5 minutes/day on routine administration  
✅ Zero manual stock checks required  
✅ No expired medicines reach customers  
✅ Reports generate automatically  
✅ Operating costs remain $0 additional  

---

## Phase 2: Smart Decision Support (Planned)

### Priority: Help pharmacists make better business decisions

#### 2.1 Predictive Demand Forecasting

- [ ] Seasonal patterns detected (cold/flu season, malaria season)
- [ ] Weather-based demand prediction
- [ ] Product bundle suggestions (complimentary medicines)
- [ ] Surplus detection (overstocked items about to expire)

**Implementation:** Time-series analysis + local ML model  
**Cost:** $0

---

#### 2.2 Profit Margin Optimization

- [ ] Identify low-margin products
- [ ] Suggest price adjustments based on competitor data (future)
- [ ] Bundle discounts that maximize profit
- [ ] Cost analysis per product

**Implementation:** Backend calculation engine  
**Cost:** $0

---

#### 2.3 Customer Segmentation

- [ ] Identify high-value customers
- [ ] Loyalty insights (repeat purchase patterns)
- [ ] Personalized recommendations per customer
- [ ] Revenue by customer type

**Implementation:** Database queries + real-time sync  
**Cost:** $0

---

## Phase 3: Regulatory Compliance Automation (Planned)

### Priority: Reduce compliance overhead

#### 3.1 NAFDAC Reporting

- [ ] Automatic batch tracking and expiry compliance
- [ ] Adverse event reporting templates
- [ ] Audit trail for all transactions
- [ ] Compliance dashboard

**Implementation:** Supabase audit tables + scheduled reports  
**Cost:** $0

---

#### 3.2 Prescription Validation

- [ ] Check for controlled substance restrictions
- [ ] Dosage validation (alert if unusual)
- [ ] Drug-disease contraindications
- [ ] Interaction checking with patient history (future)

**Implementation:** Clinical rule engine + patient records  
**Cost:** $0 (extends existing interaction engine)

---

## Phase 4: Advanced Analytics (Planned)

### Priority: Actionable business intelligence

#### 4.1 Sales Analytics Dashboard

- [ ] Revenue trends over time
- [ ] Top-selling products
- [ ] Product category performance
- [ ] Cashier productivity metrics

**Implementation:** Real-time Supabase queries + Recharts  
**Cost:** $0

---

#### 4.2 Inventory Health Score

- [ ] Overall inventory status (A/B/C classification)
- [ ] Turnover rates
- [ ] Dead stock identification
- [ ] Stockout risk prediction

**Implementation:** Backend algorithm + caching  
**Cost:** $0

---

## Phase 5: Multi-Branch Optimization (Planned)

### Priority: Scale across branches efficiently

#### 5.1 Branch Transfer Automation

- [ ] Auto-suggest transfers between branches
- [ ] Prevent overstocking at low-traffic locations
- [ ] Optimize stock distribution across network

**Implementation:** Advanced algorithm + manager approval flow  
**Cost:** $0

---

#### 5.2 Centralized Supply Chain

- [ ] Master purchase orders across all branches
- [ ] Consolidated supplier negotiations
- [ ] Shared supplier performance metrics

**Implementation:** Backend service + reporting  
**Cost:** $0

---

## Phase 6: Mobile-First Enhancements (Planned)

### Priority: Seamless mobile experience

#### 6.1 Mobile Checkout Optimization

- [ ] One-handed operation confirmed
- [ ] Barcode scanner performance improved
- [ ] Offline checkout fully functional
- [ ] Mobile receipt printing

**Implementation:** React Native refactor or PWA optimization  
**Cost:** TBD

---

#### 6.2 Mobile Inventory Management

- [ ] Stock count on mobile with camera
- [ ] Barcode generation and labeling
- [ ] Receipt scanning for stock verification

**Implementation:** Camera API + offline storage  
**Cost:** $0

---

## Rejected Features (Not Aligned with Constitution)

These will not be built because they violate the Constitution or Roadmap principles:

❌ **AI Chatbot on every screen** – Uses AI where deterministic logic suffices  
❌ **Email notifications** – Use in-app notifications instead  
❌ **Third-party integrations** – Unless they save cost or time significantly  
❌ **Complex permission system** – Until multi-staff collaboration is essential  
❌ **Social features** – Out of scope for pharmacy operating system  
❌ **Custom reports builder** – Pre-built reports sufficient initially  

---

## Implementation Rules for All Phases

### Before adding any feature:

1. ✅ Does it satisfy Constitution objectives?
2. ✅ Does it reduce work or automate something?
3. ✅ Can it be built with existing infrastructure?
4. ✅ Will it remain < $0.10/month/user to operate?
5. ✅ Does it improve mobile experience or maintain it?

### If any answer is NO, the feature is rejected.

---

## Metrics for Success

### Phase 1 Goals:

- ⏱️ **Time Savings:** Average pharmacist saves 4+ hours/week
- ⚠️ **Error Reduction:** 90%+ reduction in expiry incidents
- 📊 **Automation Rate:** 75%+ of routine tasks automated
- 💰 **Cost per User:** < $0.05/month

### Phase 2 Goals:

- 📈 **Revenue Impact:** 10%+ avg profit margin improvement
- 👥 **Adoption:** 80%+ of features actively used
- 🎯 **Engagement:** 95%+ daily active users

### Phase 3+ Goals:

- 📋 **Compliance:** 100% regulatory alignment
- 🌍 **Scale:** Support 100+ branches nationally
- 💼 **Enterprise:** Multi-pharmacy chain support

---

## Resource Allocation

### Current Team:

- 1 Product Lead (you)
- 1 Senior Engineer (Antigravity AI)
- 1 QA/Testing (Antigravity AI)

### Monthly Operating Cost:

- Supabase: ~$10 (minimal usage)
- Vercel: ~$20 (hobby tier)
- Domain: $10-15
- APIs: $0 (using free tier Gemini + OpenRouter free models)

**Total: ~$40-45/month**

---

## Next Immediate Actions

1. ✅ **Commit Constitution & Directive** (DONE)
2. ⏳ **Commit Roadmap** (THIS)
3. 🔄 **Start Phase 1.1** – Automatic low-stock detection
4. 📝 **Document API schemas** for each feature

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-26 | Initial roadmap with 5-phase plan |

---

## How to Use This Roadmap

### Every development session:

1. **Select next item** from current phase
2. **Read Constitution + Directive**
3. **Plan the smallest safe change**
4. **Implement, test, deploy**
5. **Move to next item**

**No roadmap creep. No random features. Pure focus.**

---

## Feedback & Changes

This roadmap is binding but not rigid. Changes require:

✅ Evidence that current plan is wrong  
✅ Approval from Product Lead  
✅ Constitutional alignment check  
✅ Cost/benefit analysis  

Suggestions welcome. Scope creep is not.
