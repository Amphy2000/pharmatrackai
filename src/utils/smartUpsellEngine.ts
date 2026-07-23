/**
 * Autopilot Smart Upsell Engine v2 for PharmaTrack POS.
 *
 * True Multi-Drug Intelligence:
 * - Evaluates EVERY item in cart individually against ALL rules
 * - Scores and ranks all candidates by confidence
 * - Deduplicates by suggestion category (won't suggest two antacids)
 * - Anti-repeats: never suggests a product in a class the cart already contains
 * - Handles 1 drug, 5 drugs, or 20 drugs intelligently
 * - 0ms | 100% offline | zero API cost
 */

export interface UpsellSuggestion {
  product_id: string;
  product_name: string;
  reason: string;
  confidence: number;
  triggeredBy: string; // which cart item triggered this
}

interface ItemContext {
  id: string;
  name: string;
  category?: string;
}

// ─── Drug Class Detector ────────────────────────────────────────────────────
// Used to prevent suggesting a class already present in the cart
const DRUG_CLASS_STEMS: Record<string, string[]> = {
  'Antibiotic':         ['floxacin', 'cillin', 'cycline', 'thromycin', 'septrin', 'flagyl', 'metronidazole', 'ciprotab', 'augmentin', 'amoxil', 'bactrim'],
  'Antimalarial':       ['artemether', 'lumefantrine', 'amatem', 'coartem', 'lonart', 'artesunate', 'malaria'],
  'NSAID':              ['ibuprofen', 'diclofenac', 'piroxicam', 'felvin', 'naproxen', 'aspirin', 'celebrex', 'meloxicam'],
  'Paracetamol':        ['paracetamol', 'acetaminophen', 'panadol', 'emzor paracetamol', 'calpol', 'febridol'],
  'Antacid_PPI':        ['gestid', 'antacid', 'omeprazole', 'pantoprazole', 'nexium', 'gastrogel', 'prazole', 'ranitidine'],
  'Vitamin_Supplement': ['vitamin', 'multivitamin', 'neurovite', 'b-complex', 'supplement', 'zinc', 'ferrous', 'folic', 'omega', 'fish oil'],
  'Antihistamine':      ['piriton', 'benadryl', 'chlorpheniramine', 'promethazine', 'phenergan', 'cetirizine', 'loratadine'],
  'CoughCold':          ['emzolyn', 'cough', 'procold', 'flutabs', 'actifed', 'covonia', 'cold'],
  'Antifungal':         ['fluconazole', 'ketoconazole', 'clotrimazole', 'flucosten', 'antifungal'],
  'Probiotic':          ['probiotic', 'lacteol', 'lactobacillus', 'gut flora'],
  'ORS':                ['ors', 'rehydrat', 'electrolyte', 'dioralyte'],
  'Lozenges':           ['lozenges', 'strepsils', 'difflam', 'menthol'],
  'BPMonitor':          ['glucometer', 'bp monitor', 'strips', 'lancet'],
  'Antidiabetic':       ['metformin', 'glibenclamide', 'glimepiride', 'insulin', 'glucophage'],
  'Antihypertensive':   ['amlodipine', 'lisinopril', 'losartan', 'atenolol', 'nifedipine', 'ramipril'],
  'Statin':             ['statin', 'atorvastatin', 'simvastatin', 'rosuvastatin', 'lipitor'],
  'Antimalaria_Prev':   ['chloroquine', 'malarone', 'doxycycline prophylaxis'],
  'IronFolicAcid':      ['folic acid', 'ferrous', 'iron tablet', 'haematinics'],
  'Analgesic':          ['tramadol', 'codeine', 'morphine'],
};

/** Returns all drug classes present in a single drug name string */
function detectDrugClasses(name: string): Set<string> {
  const lower = name.toLowerCase();
  const found = new Set<string>();
  for (const [cls, stems] of Object.entries(DRUG_CLASS_STEMS)) {
    if (stems.some(s => lower.includes(s))) found.add(cls);
  }
  return found;
}

// ─── Upsell Rules ────────────────────────────────────────────────────────────
interface UpsellRule {
  cartKeywords:   string[];   // if cart item name contains any of these
  targetKeywords: string[];   // look for inventory items with these in name/category
  targetClass:    string;     // class of the suggested product (for dedup)
  reason:         string;
  confidence:     number;
}

const UPSELL_RULES: UpsellRule[] = [
  // ── Antibiotics ─────────────────────────────────────────────────────────
  {
    cartKeywords:   ['floxacin', 'cillin', 'cycline', 'thromycin', 'septrin', 'flagyl', 'metronidazole', 'ciprotab', 'augmentin', 'amoxil', 'cloxacillin'],
    targetKeywords: ['probiotic', 'lacteol', 'lactobacillus'],
    targetClass:    'Probiotic',
    reason:         '🦠 Antibiotics destroy gut bacteria. A probiotic protects the patient\'s digestive health during therapy.',
    confidence:     0.96,
  },
  {
    cartKeywords:   ['floxacin', 'cillin', 'cycline', 'thromycin', 'septrin', 'flagyl', 'ciprotab', 'augmentin', 'amoxil'],
    targetKeywords: ['vitamin c', 'multivitamin', 'neurovite', 'b-complex'],
    targetClass:    'Vitamin_Supplement',
    reason:         '💊 Antibiotic course depletes vitamins. Vitamin C/B-complex supports faster immune recovery.',
    confidence:     0.92,
  },

  // ── Antimalarials ────────────────────────────────────────────────────────
  {
    cartKeywords:   ['artemether', 'lumefantrine', 'amatem', 'coartem', 'lonart', 'artesunate', 'p-alaxin', 'artesunat'],
    targetKeywords: ['paracetamol', 'panadol', 'acetaminophen', 'emzor para', 'calpol'],
    targetClass:    'Paracetamol',
    reason:         '🌡️ Paracetamol relieves the fever, chills, and body pain that accompany malaria treatment.',
    confidence:     0.95,
  },
  {
    cartKeywords:   ['artemether', 'lumefantrine', 'amatem', 'coartem', 'lonart', 'artesunate'],
    targetKeywords: ['vitamin c', 'multivitamin', 'neurovite', 'b-complex', 'supplement'],
    targetClass:    'Vitamin_Supplement',
    reason:         '⚡ Vitamins speed recovery from malaria and help restore energy levels post-treatment.',
    confidence:     0.88,
  },
  {
    cartKeywords:   ['artemether', 'lumefantrine', 'amatem', 'coartem', 'lonart'],
    targetKeywords: ['ors', 'rehydrat', 'electrolyte', 'dioralyte'],
    targetClass:    'ORS',
    reason:         '💧 Rehydration salts prevent dehydration from malaria fever and vomiting.',
    confidence:     0.85,
  },

  // ── NSAIDs & Pain ────────────────────────────────────────────────────────
  {
    cartKeywords:   ['ibuprofen', 'diclofenac', 'piroxicam', 'felvin', 'naproxen', 'aspirin', 'meloxicam', 'celecoxib'],
    targetKeywords: ['gestid', 'antacid', 'omeprazole', 'pantoprazole', 'nexium', 'gastrogel', 'esomeprazole'],
    targetClass:    'Antacid_PPI',
    reason:         '🛡️ NSAIDs damage the stomach lining. A PPI or antacid is essential stomach protection.',
    confidence:     0.95,
  },
  {
    cartKeywords:   ['ibuprofen', 'diclofenac', 'piroxicam', 'felvin', 'aspirin'],
    targetKeywords: ['vitamin c', 'zinc', 'b-complex', 'multivitamin'],
    targetClass:    'Vitamin_Supplement',
    reason:         '🍊 Vitamin C helps reduce inflammation and supports tissue healing during NSAID therapy.',
    confidence:     0.80,
  },

  // ── Antifungals ──────────────────────────────────────────────────────────
  {
    cartKeywords:   ['fluconazole', 'ketoconazole', 'clotrimazole', 'flucosten', 'itraconazole', 'voriconazole'],
    targetKeywords: ['probiotic', 'lacteol', 'lactobacillus'],
    targetClass:    'Probiotic',
    reason:         '🦠 Antifungal treatment can disturb natural flora. Probiotics restore vaginal and gut health.',
    confidence:     0.90,
  },

  // ── Cough & Cold ─────────────────────────────────────────────────────────
  {
    cartKeywords:   ['cough', 'emzolyn', 'procold', 'flutabs', 'actifed', 'cold', 'covonia', 'benylin'],
    targetKeywords: ['vitamin c', 'ascorbic', 'multivitamin'],
    targetClass:    'Vitamin_Supplement',
    reason:         '🍊 Vitamin C shortens cold duration and boosts immunity during respiratory illness.',
    confidence:     0.92,
  },
  {
    cartKeywords:   ['cough', 'emzolyn', 'procold', 'sore throat', 'cold', 'flutabs'],
    targetKeywords: ['lozenges', 'strepsils', 'difflam', 'menthol', 'throat'],
    targetClass:    'Lozenges',
    reason:         '🍬 Throat lozenges provide instant soothing relief alongside cough syrup treatment.',
    confidence:     0.88,
  },

  // ── Vitamins / Supplements (already in cart) ──────────────────────────────
  // If only buying vitamins, suggest ORS or probiotic as a health package
  {
    cartKeywords:   ['neurovite', 'b-complex', 'blood tonic', 'haematinics', 'folic', 'ferrous'],
    targetKeywords: ['vitamin c', 'ascorbic', 'zinc'],
    targetClass:    'Vitamin_C',
    reason:         '🌟 Vitamin C enhances the absorption of iron and B-vitamins taken together.',
    confidence:     0.82,
  },

  // ── Diabetes / Hypertension / Chronic Care ───────────────────────────────
  {
    cartKeywords:   ['metformin', 'glibenclamide', 'glimepiride', 'gliclazide', 'insulin', 'glucophage'],
    targetKeywords: ['strips', 'glucometer', 'lancet', 'sugar free'],
    targetClass:    'BPMonitor',
    reason:         '📊 Blood glucose strips are essential for patients self-monitoring on diabetic medication.',
    confidence:     0.90,
  },
  {
    cartKeywords:   ['amlodipine', 'lisinopril', 'losartan', 'atenolol', 'ramipril', 'nifedipine', 'enalapril'],
    targetKeywords: ['bp monitor', 'sphygmomanometer', 'omega 3', 'fish oil', 'coq10'],
    targetClass:    'BPMonitor',
    reason:         '💉 Blood pressure monitors and Omega-3 support long-term hypertension management at home.',
    confidence:     0.87,
  },
  {
    cartKeywords:   ['metformin', 'glibenclamide', 'amlodipine', 'lisinopril', 'losartan', 'atenolol'],
    targetKeywords: ['vitamin d', 'calcium', 'magnesium', 'omega 3', 'coq10'],
    targetClass:    'Vitamin_Supplement',
    reason:         '🩺 Vitamin D, Magnesium and Omega-3 support cardiovascular and metabolic health in chronic disease.',
    confidence:     0.83,
  },

  // ── Statins ──────────────────────────────────────────────────────────────
  {
    cartKeywords:   ['statin', 'atorvastatin', 'simvastatin', 'rosuvastatin', 'lipitor', 'zocor'],
    targetKeywords: ['coq10', 'omega 3', 'fish oil', 'vitamin d'],
    targetClass:    'Vitamin_Supplement',
    reason:         '❤️ Statins deplete CoQ10. Supplementing CoQ10 prevents muscle pain and supports heart function.',
    confidence:     0.89,
  },

  // ── Iron / Folic / Pregnancy ─────────────────────────────────────────────
  {
    cartKeywords:   ['folic', 'ferrous', 'iron tablet', 'haematinic', 'chemiron', 'pregnacare'],
    targetKeywords: ['vitamin c', 'ascorbic', 'orange'],
    targetClass:    'Vitamin_C',
    reason:         '🍊 Vitamin C dramatically increases iron absorption — always recommend together.',
    confidence:     0.97,
  },
  {
    cartKeywords:   ['folic', 'ferrous', 'pregnacare', 'antenatal'],
    targetKeywords: ['calcium', 'vitamin d', 'prenatal', 'omega 3'],
    targetClass:    'Vitamin_Supplement',
    reason:         '🤰 Calcium and Vitamin D support fetal bone development in pregnancy.',
    confidence:     0.90,
  },

  // ── ORS / Diarrhoea ──────────────────────────────────────────────────────
  {
    cartKeywords:   ['ors', 'rehydrat', 'electrolyte', 'dioralyte', 'loperamide', 'imodium'],
    targetKeywords: ['zinc', 'zinc sulphate', 'zincovit'],
    targetClass:    'Vitamin_Supplement',
    reason:         '🌿 WHO recommends Zinc alongside ORS — it reduces diarrhoea duration by 25%.',
    confidence:     0.93,
  },

  // ── Paracetamol (alone) ──────────────────────────────────────────────────
  {
    cartKeywords:   ['paracetamol', 'panadol', 'acetaminophen', 'calpol', 'febridol', 'emzor paracetamol'],
    targetKeywords: ['vitamin c', 'ascorbic', 'zinc', 'lozenges'],
    targetClass:    'Vitamin_Supplement',
    reason:         '🍊 Vitamin C or Zinc alongside paracetamol boosts immune support for fever/flu management.',
    confidence:     0.78,
  },

  // ── Eye Drops / ENT ──────────────────────────────────────────────────────
  {
    cartKeywords:   ['eye drop', 'chloramphenicol eye', 'gentamicin eye', 'conjunct', 'ear drop'],
    targetKeywords: ['saline', 'eye wash', 'cotton wool', 'swab'],
    targetClass:    'FirstAid',
    reason:         '👁️ Sterile saline and cotton wool are recommended for eye cleaning during treatment.',
    confidence:     0.85,
  },
];

// ─── Main Engine ─────────────────────────────────────────────────────────────

export function generateSmartUpsell(
  cartItems: ItemContext[],
  availableInventory: ItemContext[]
): UpsellSuggestion[] {
  if (!cartItems?.length || !availableInventory?.length) return [];

  // Step 1: Identify all drug classes already in the cart
  const cartClassesPresent = new Set<string>();
  for (const item of cartItems) {
    for (const cls of detectDrugClasses(`${item.name} ${item.category || ''}`)) {
      cartClassesPresent.add(cls);
    }
  }

  // Exclude already-in-cart items
  const cartIds = new Set<string>(cartItems.map(c => c.id));

  // Step 2: Score ALL rules against ALL cart items
  interface ScoredCandidate {
    inventoryItem: ItemContext;
    rule: UpsellRule;
    triggeredBy: string;
    finalScore: number;
  }

  const rawCandidates: ScoredCandidate[] = [];
  const suggestedTargetClasses = new Set<string>();

  for (const cartItem of cartItems) {
    const itemText = `${cartItem.name} ${cartItem.category || ''}`.toLowerCase();

    for (const rule of UPSELL_RULES) {
      // Check if cart item matches this rule
      const matchedKeyword = rule.cartKeywords.find(kw => itemText.includes(kw));
      if (!matchedKeyword) continue;

      // Don't suggest a product class if cart already has it
      if (cartClassesPresent.has(rule.targetClass)) continue;

      // Find the best available inventory match for this rule
      const candidate = availableInventory.find(inv =>
        !cartIds.has(inv.id) &&
        rule.targetKeywords.some(kw =>
          (inv.name || '').toLowerCase().includes(kw) ||
          (inv.category || '').toLowerCase().includes(kw)
        )
      );

      if (candidate) {
        rawCandidates.push({
          inventoryItem: candidate,
          rule,
          triggeredBy: cartItem.name,
          finalScore: rule.confidence,
        });
      }
    }
  }

  if (rawCandidates.length === 0) {
    // Smart fallback: suggest something from Health & Wellness not already in cart
    const healthItem = availableInventory.find(inv =>
      !cartIds.has(inv.id) &&
      !cartClassesPresent.has('Vitamin_Supplement') &&
      (inv.category === 'Vitamins' || inv.category === 'Supplements' ||
        (inv.name || '').toLowerCase().includes('vitamin'))
    );
    if (healthItem) {
      return [{
        product_id: healthItem.id,
        product_name: healthItem.name,
        reason: '🌟 Popular wellness supplement to support immunity and overall wellbeing.',
        confidence: 0.75,
        triggeredBy: 'general',
      }];
    }
    return [];
  }

  // Step 3: Sort by score, then deduplicate by targetClass and by inventoryItem.id
  rawCandidates.sort((a, b) => b.finalScore - a.finalScore);

  const finalSuggestions: UpsellSuggestion[] = [];
  const usedInventoryIds = new Set<string>(cartIds);

  for (const candidate of rawCandidates) {
    if (finalSuggestions.length >= 2) break; // Max 2 visible suggestions for clean UI
    if (usedInventoryIds.has(candidate.inventoryItem.id)) continue;
    if (suggestedTargetClasses.has(candidate.rule.targetClass)) continue; // no duplicate categories

    suggestedTargetClasses.add(candidate.rule.targetClass);
    usedInventoryIds.add(candidate.inventoryItem.id);

    finalSuggestions.push({
      product_id: candidate.inventoryItem.id,
      product_name: candidate.inventoryItem.name,
      reason: candidate.rule.reason,
      confidence: candidate.finalScore,
      triggeredBy: candidate.triggeredBy,
    });
  }

  return finalSuggestions;
}
