export const CONDITIONS = {
  good: { label: "Dobry stan", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  attention: { label: "Wymaga uwagi", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  danger: { label: "Stan zagrożenia", cls: "bg-rose-100 text-rose-800 border-rose-300" },
  removed: { label: "Usunięte", cls: "bg-slate-100 text-slate-700 border-slate-300" },
};

export const REPORT_STATUS = {
  new: { label: "Nowe", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  in_progress: { label: "W trakcie", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  done: { label: "Zrealizowane", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Odrzucone", cls: "bg-red-100 text-red-800 border-red-200" },
};

export const SUB_STATUS = {
  trial: { label: "Okres próbny", cls: "bg-sky-100 text-sky-800 border-sky-200" },
  card: { label: "Opłacona kartą", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  manual: { label: "Włączona ręcznie", cls: "bg-teal-100 text-teal-900 border-teal-200" },
  expired: { label: "Wygasła", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  disabled: { label: "Wyłączona", cls: "bg-rose-100 text-rose-800 border-rose-200" },
};

export const USER_STATUS = {
  active: { label: "Aktywny", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  pending: { label: "Oczekuje", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  invited: { label: "Zaproszony", cls: "bg-sky-100 text-sky-800 border-sky-200" },
  rejected: { label: "Odrzucony", cls: "bg-red-100 text-red-800 border-red-200" },
  disabled: { label: "Wyłączony", cls: "bg-slate-100 text-slate-700 border-slate-300" },
};

export const WORK_TYPES = {
  inspection: "Przegląd",
  pruning: "Przycinka",
  treatment: "Zabieg pielęgnacyjny / leczenie",
  removal: "Usunięcie",
  planting: "Nasadzenie",
  other: "Inne",
};

export const REPORT_TYPES = {
  broken_branch: "Złamana gałąź",
  disease: "Choroba / szkodniki",
  leaning: "Pochylenie / ryzyko upadku",
  damage: "Uszkodzenie (kora, pień)",
  other: "Inne",
};

export const PLAN_NAMES = { mala: "Mała", srednia: "Średnia", duza: "Duża / miasto" };
export const ROLE_NAMES = { owner: "Właściciel platformy", gmina_admin: "Administrator gminy", worker: "Pracownik", resident: "Mieszkaniec" };

export const PLACE_CATS = {
  fountain: "Fontanna",
  viewpoint: "Miejsce widokowe",
  heritage: "Zabytek",
  playground: "Plac zabaw",
  nature: "Przyroda",
  other: "Inne",
};
