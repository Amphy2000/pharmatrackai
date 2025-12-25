import { useCallback, useEffect, useState } from "react";

const SELECTED_PHARMACY_KEY = "pharmatrack_selected_pharmacy";
const SELECTED_PHARMACY_EVENT = "pharmatrack:selected-pharmacy-changed";

export const getSelectedPharmacyId = (): string | null => {
  try {
    return localStorage.getItem(SELECTED_PHARMACY_KEY);
  } catch {
    return null;
  }
};

export const setSelectedPharmacyId = (pharmacyId: string) => {
  localStorage.setItem(SELECTED_PHARMACY_KEY, pharmacyId);
  window.dispatchEvent(new Event(SELECTED_PHARMACY_EVENT));
};

export const clearSelectedPharmacyId = () => {
  localStorage.removeItem(SELECTED_PHARMACY_KEY);
  window.dispatchEvent(new Event(SELECTED_PHARMACY_EVENT));
};

export const useSelectedPharmacyId = () => {
  const [selectedPharmacyId, setSelected] = useState<string | null>(() => getSelectedPharmacyId());

  const sync = useCallback(() => {
    setSelected(getSelectedPharmacyId());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SELECTED_PHARMACY_KEY) sync();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(SELECTED_PHARMACY_EVENT, sync as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SELECTED_PHARMACY_EVENT, sync as EventListener);
    };
  }, [sync]);

  return {
    selectedPharmacyId,
    setSelectedPharmacyId,
    clearSelectedPharmacyId,
  };
};
