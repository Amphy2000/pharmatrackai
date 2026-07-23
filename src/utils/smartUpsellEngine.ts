/**
 * Autopilot Smart Upsell Engine for PharmaTrack POS.
 * 
 * Features:
 * - 0ms instant execution
 * - 100% offline support
 * - Zero AI API cost or rate limits
 * - Clinical & commercial cross-selling logic (Antibiotics -> Probiotics/Vitamins, Antimalarials -> Paracetamol, Painkillers -> Antacids, etc.)
 */

export interface UpsellSuggestion {
  product_id: string;
  product_name: string;
  reason: string;
  confidence: number;
}

interface ItemContext {
  id: string;
  name: string;
  category?: string;
}

const UPSELL_RULES = [
  {
    cartKeywords: ['ciprofloxacin', 'amoxicillin', 'augmentin', 'azithromycin', 'doxycycline', 'flagyl', 'metronidazole', 'antibiotic', 'ciprotab', 'amoxil'],
    targetKeywords: ['vitamin c', 'multivitamin', 'probiotic', 'zinc', 'rehydration', 'ors', 'b-complex'],
    reason: 'Antibiotic therapy can deplete gut flora and vitamins. Recommend Vitamin C/Probiotics for recovery.',
    confidence: 0.95
  },
  {
    cartKeywords: ['artemether', 'lumefantrine', 'amatem', 'coartem', 'lonart', 'artesunate', 'antimalarial', 'malaria'],
    targetKeywords: ['paracetamol', 'panadol', 'acetaminophen', 'analgesic', 'vitamin c', 'multivitamin'],
    reason: 'Antimalarial treatment is best accompanied by Paracetamol for fever/body pain relief.',
    confidence: 0.92
  },
  {
    cartKeywords: ['ibuprofen', 'diclofenac', 'piroxicam', 'felvin', 'naproxen', 'nsaid', 'aspirin'],
    targetKeywords: ['gestid', 'antacid', 'omeprazole', 'pantoprazole', 'nexium', 'gastrogel'],
    reason: 'NSAIDs cause gastric irritation. Suggest an Antacid or PPI for stomach protection.',
    confidence: 0.88
  },
  {
    cartKeywords: ['emzolyn', 'cough', 'syrup', 'benadryl', 'piriton', 'cold', 'flutabs', 'procold'],
    targetKeywords: ['vitamin c', 'lozenges', 'strepsils', 'balm', 'tissue', 'menthol'],
    reason: 'Complement cold/cough treatment with Vitamin C and throat lozenges for soothing relief.',
    confidence: 0.90
  },
  {
    cartKeywords: ['metformin', 'glibenclamide', 'amlodipine', 'lisinopril', 'losartan', 'hypertension', 'diabetes'],
    targetKeywords: ['strips', 'glucometer', 'bp monitor', 'lancets', 'sugar free', 'omega 3'],
    reason: 'Chronic disease management item. Recommend health monitoring accessories.',
    confidence: 0.85
  }
];

export function generateSmartUpsell(
  cartItems: ItemContext[],
  availableInventory: ItemContext[]
): UpsellSuggestion[] {
  if (!cartItems || cartItems.length === 0 || !availableInventory || availableInventory.length === 0) {
    return [];
  }

  const suggestions: UpsellSuggestion[] = [];
  const addedIds = new Set<string>(cartItems.map(c => c.id));

  const cartText = cartItems.map(c => `${c.name} ${c.category || ''}`.toLowerCase()).join(' ');

  for (const rule of UPSELL_RULES) {
    const matchesCart = rule.cartKeywords.some(kw => cartText.includes(kw));

    if (matchesCart) {
      // Find matching item in available inventory not already in cart
      const candidate = availableInventory.find(inv =>
        !addedIds.has(inv.id) &&
        rule.targetKeywords.some(kw => (inv.name || '').toLowerCase().includes(kw) || (inv.category || '').toLowerCase().includes(kw))
      );

      if (candidate && !addedIds.has(candidate.id)) {
        addedIds.add(candidate.id);
        suggestions.push({
          product_id: candidate.id,
          product_name: candidate.name,
          reason: rule.reason,
          confidence: rule.confidence
        });
      }
    }

    if (suggestions.length >= 3) break;
  }

  // Fallback: If no rule matched, suggest popular Health & Wellness / Vitamins items
  if (suggestions.length === 0) {
    const fallbackCandidate = availableInventory.find(inv =>
      !addedIds.has(inv.id) &&
      (inv.category === 'Vitamins' || inv.category === 'Supplements' || (inv.name || '').toLowerCase().includes('vitamin'))
    );

    if (fallbackCandidate) {
      suggestions.push({
        product_id: fallbackCandidate.id,
        product_name: fallbackCandidate.name,
        reason: 'Popular wellness supplement to boost immunity and general wellness.',
        confidence: 0.80
      });
    }
  }

  return suggestions;
}
