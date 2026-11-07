import { createContext, useContext, useState } from "react";

export const LANGS = { pl: "Polski", en: "English", uk: "Українська", ru: "Русский" };

const D = {
  pl: {
    scanTitle: "Skanuj kod", scanStaff: "Skieruj aparat na kod QR z tabliczki przy drzewie — pokażemy je na mapie.", scanGuest: "Zeskanuj kod z tabliczki i poznaj drzewo: co to za gatunek, jakie ptaki na nim mieszkają i gdzie stoi.", orTag: "Albo wpisz numer z tabliczki", find: "Szukaj", noTag: "Nie znaleziono drzewa o tym numerze", notArbix: "To nie jest kod ARBIX", noCamera: "Brak dostępu do aparatu. Zezwól na użycie aparatu w ustawieniach przeglądarki lub wpisz numer tabliczki poniżej.", show: "Pokaż", hide: "Ukryj",
    learn: "Poznaj to drzewo", birds: "Kto tu mieszka — ptaki", insects: "Owady i inne zwierzęta", facts: "Ciekawostki", generating: "Przygotowuję ciekawostki o tym drzewie…", aiNote: "Opracowano z pomocą AI na podstawie ogólnej wiedzy o gatunku.", gminaNote: "Opis przygotowany przez gminę.", serviceCard: "Karta serwisowa", fromYou: "od Ciebie", onSite: "Jesteś przy drzewie", tracking: "Śledzę Twoją lokalizację", showOnMap: "Pokaż na mapie", moreAbout: "Więcej o drzewie", speciesFacts: "Ciekawostki o gatunku",
    map: "Mapa", attractions: "Atrakcje", report: "Zgłoś", news: "Aktualności", join: "Dołącz", myReports: "Zgłoszenia", profile: "Profil", scan: "Skanuj", panel: "Panel", login: "Zaloguj",
    search: "Szukaj gminy, parku lub atrakcji", onlyMonuments: "Tylko pomniki przyrody", legend: "Legenda", locate: "Moja lokalizacja",
    reportEvent: "Zgłoś zdarzenie", details: "Szczegóły", navigate: "Nawiguj", share: "Udostępnij", source: "Zobacz w źródle", copied: "Skopiowano",
    tree: "Drzewo", speciesUnknown: "Gatunek nieznany", osmId: "ID w OpenStreetMap", gmina: "Gmina", park: "Park", coords: "Współrzędne", condition: "Stan", tag: "Nr tabliczki",
    height: "Wysokość", circumference: "Obwód", leafType: "Typ liścia", unverified: "Dane z rejestru publicznego, jeszcze niezweryfikowane przez gminę.",
    registered: "Drzewo w rejestrze gminy", monument: "Pomnik przyrody", attraction: "Atrakcja", publicTree: "Drzewo z rejestru publicznego",
    zoomHint: "Przybliż mapę, aby zobaczyć wszystkie drzewa", loadingTrees: "Wczytuję drzewa z OpenStreetMap…", osmDown: "Rejestr publiczny chwilowo niedostępny",
    lgGood: "Dobry stan", lgAttention: "Wymaga uwagi", lgDanger: "Stan zagrożenia", lgOsm: "Drzewo z OpenStreetMap", lgCluster: "Grupa drzew",
    rTitle: "Zgłoś zdarzenie", rGuest: "Zgłaszanie jest dostępne dla mieszkańców gminy", rGuestSub: "Zaloguj się numerem PESEL lub załóż konto, aby wysłać zgłoszenie ze zdjęciem.",
    register: "Załóż konto", rStaff: "Zgłoszenia mieszkańców obsłużysz w panelu.", openPanel: "Otwórz panel", rPending: "Twoje konto czeka na zatwierdzenie przez gminę.",
    rWhere: "Gdzie jest problem?", rScan: "Zeskanuj kod na drzewie", rScanSub: "Kod QR na tabliczce drzewa", rPick: "Wybierz drzewo na mapie", rPickSub: "Dotknij drzewo, potem „Zgłoś zdarzenie”",
    rHere: "W mojej lokalizacji", rHereSub: "Np. przewrócone drzewo przy drodze", rChange: "Zmień", rAt: "Miejsce zdarzenia", rOsm: "Drzewo z OpenStreetMap", rTree: "Drzewo",
    rToGmina: "Zgłoszenie trafi do Twojej gminy", osmSlow: "Wciąż wczytuję drzewa — to może potrwać do kilku minut", noLocation: "Nie udało się ustalić lokalizacji",
  },
  en: {
    scanTitle: "Scan code", scanStaff: "Point the camera at the QR code on the tree tag — we will show it on the map.", scanGuest: "Scan the code on the tag and discover the tree: its species, which birds live on it and where it stands.", orTag: "Or type the tag number", find: "Search", noTag: "No tree with this number", notArbix: "This is not an ARBIX code", noCamera: "No camera access. Allow the camera in browser settings or type the tag number below.", show: "Show", hide: "Hide",
    learn: "Discover this tree", birds: "Who lives here — birds", insects: "Insects and other animals", facts: "Fun facts", generating: "Preparing facts about this tree…", aiNote: "Prepared with AI from general knowledge about the species.", gminaNote: "Description by the gmina.", serviceCard: "Service card", fromYou: "from you", onSite: "You are at the tree", tracking: "Tracking your location", showOnMap: "Show on map", moreAbout: "More about the tree", speciesFacts: "Facts about the species",
    map: "Map", attractions: "Attractions", report: "Report", news: "News", join: "Join", myReports: "Reports", profile: "Profile", scan: "Scan", panel: "Panel", login: "Log in",
    search: "Search for a gmina, park or attraction", onlyMonuments: "Natural monuments only", legend: "Legend", locate: "My location",
    reportEvent: "Report an issue", details: "Details", navigate: "Navigate", share: "Share", source: "View source", copied: "Copied",
    tree: "Tree", speciesUnknown: "Unknown species", osmId: "OpenStreetMap ID", gmina: "Gmina", park: "Park", coords: "Coordinates", condition: "Condition", tag: "Tag no.",
    height: "Height", circumference: "Girth", leafType: "Leaf type", unverified: "Public register data, not yet verified by the gmina.",
    registered: "Tree in the gmina register", monument: "Natural monument", attraction: "Attraction", publicTree: "Tree from the public register",
    zoomHint: "Zoom in to see all trees", loadingTrees: "Loading trees from OpenStreetMap…", osmDown: "Public register temporarily unavailable",
    lgGood: "Good condition", lgAttention: "Needs attention", lgDanger: "Hazardous", lgOsm: "OpenStreetMap tree", lgCluster: "Group of trees",
    rTitle: "Report an issue", rGuest: "Reporting is available to gmina residents", rGuestSub: "Log in with your PESEL or create an account to send a report with a photo.",
    register: "Create account", rStaff: "Handle residents' reports in the panel.", openPanel: "Open panel", rPending: "Your account is waiting for gmina approval.",
    rWhere: "Where is the problem?", rScan: "Scan the code on a tree", rScanSub: "QR code on the tree tag", rPick: "Pick a tree on the map", rPickSub: "Tap a tree, then “Report an issue”",
    rHere: "At my location", rHereSub: "E.g. a fallen tree by the road", rChange: "Change", rAt: "Location", rOsm: "OpenStreetMap tree", rTree: "Tree",
    rToGmina: "The report goes to your gmina", osmSlow: "Still loading trees — this can take a few minutes", noLocation: "Could not get your location",
  },
  uk: {
    scanTitle: "Сканувати код", scanStaff: "Наведіть камеру на QR-код на табличці — покажемо дерево на мапі.", scanGuest: "Скануйте код на табличці й пізнайте дерево: який це вид, які птахи на ньому живуть і де воно росте.", orTag: "Або введіть номер таблички", find: "Шукати", noTag: "Дерево з таким номером не знайдено", notArbix: "Це не код ARBIX", noCamera: "Немає доступу до камери. Дозвольте камеру в налаштуваннях браузера або введіть номер таблички нижче.", show: "Показати", hide: "Сховати",
    learn: "Пізнай це дерево", birds: "Хто тут живе — птахи", insects: "Комахи та інші тварини", facts: "Цікаві факти", generating: "Готую цікаві факти про це дерево…", aiNote: "Підготовлено за допомогою ШІ на основі загальних знань про вид.", gminaNote: "Опис підготувала гміна.", serviceCard: "Службова картка", fromYou: "від вас", onSite: "Ви біля дерева", tracking: "Відстежую ваше місце", showOnMap: "Показати на мапі", moreAbout: "Більше про дерево", speciesFacts: "Факти про вид",
    map: "Мапа", attractions: "Пам'ятки", report: "Повідомити", news: "Новини", join: "Реєстрація", myReports: "Заявки", profile: "Профіль", scan: "Сканувати", panel: "Панель", login: "Увійти",
    search: "Пошук гміни, парку чи пам'ятки", onlyMonuments: "Лише пам'ятки природи", legend: "Легенда", locate: "Моє місце",
    reportEvent: "Повідомити про подію", details: "Деталі", navigate: "Маршрут", share: "Поділитися", source: "Джерело", copied: "Скопійовано",
    tree: "Дерево", speciesUnknown: "Вид невідомий", osmId: "ID в OpenStreetMap", gmina: "Гміна", park: "Парк", coords: "Координати", condition: "Стан", tag: "№ таблички",
    height: "Висота", circumference: "Обхват", leafType: "Тип листя", unverified: "Дані з публічного реєстру, ще не перевірені гміною.",
    registered: "Дерево в реєстрі гміни", monument: "Пам'ятка природи", attraction: "Пам'ятка", publicTree: "Дерево з публічного реєстру",
    zoomHint: "Наблизьте мапу, щоб побачити всі дерева", loadingTrees: "Завантажую дерева з OpenStreetMap…", osmDown: "Публічний реєстр тимчасово недоступний",
    lgGood: "Добрий стан", lgAttention: "Потребує уваги", lgDanger: "Аварійний", lgOsm: "Дерево з OpenStreetMap", lgCluster: "Група дерев",
    rTitle: "Повідомити про подію", rGuest: "Повідомлення доступні мешканцям гміни", rGuestSub: "Увійдіть за PESEL або створіть акаунт, щоб надіслати повідомлення з фото.",
    register: "Створити акаунт", rStaff: "Заявки мешканців обробляйте в панелі.", openPanel: "Відкрити панель", rPending: "Ваш акаунт чекає підтвердження гміною.",
    rWhere: "Де проблема?", rScan: "Скануйте код на дереві", rScanSub: "QR-код на табличці", rPick: "Оберіть дерево на мапі", rPickSub: "Торкніться дерева, потім «Повідомити»",
    rHere: "У моєму місці", rHereSub: "Напр. повалене дерево біля дороги", rChange: "Змінити", rAt: "Місце події", rOsm: "Дерево з OpenStreetMap", rTree: "Дерево",
    rToGmina: "Повідомлення надійде до вашої гміни", osmSlow: "Ще завантажую дерева — це може тривати кілька хвилин", noLocation: "Не вдалося визначити місце",
  },
  ru: {
    scanTitle: "Сканировать код", scanStaff: "Наведите камеру на QR-код на табличке — покажем дерево на карте.", scanGuest: "Отсканируйте код на табличке и узнайте дерево: какой это вид, какие птицы на нём живут и где оно растёт.", orTag: "Или введите номер таблички", find: "Найти", noTag: "Дерево с таким номером не найдено", notArbix: "Это не код ARBIX", noCamera: "Нет доступа к камере. Разрешите камеру в настройках браузера или введите номер таблички ниже.", show: "Показать", hide: "Скрыть",
    learn: "Узнай это дерево", birds: "Кто здесь живёт — птицы", insects: "Насекомые и другие животные", facts: "Интересные факты", generating: "Готовлю интересные факты об этом дереве…", aiNote: "Подготовлено с помощью ИИ на основе общих знаний о виде.", gminaNote: "Описание подготовила гмина.", serviceCard: "Служебная карточка", fromYou: "от вас", onSite: "Вы у дерева", tracking: "Отслеживаю ваше местоположение", showOnMap: "Показать на карте", moreAbout: "Подробнее о дереве", speciesFacts: "Факты о виде",
    map: "Карта", attractions: "Места", report: "Сообщить", news: "Новости", join: "Регистрация", myReports: "Заявки", profile: "Профиль", scan: "Сканировать", panel: "Панель", login: "Войти",
    search: "Поиск гмины, парка или достопримечательности", onlyMonuments: "Только памятники природы", legend: "Легенда", locate: "Моё место",
    reportEvent: "Сообщить о проблеме", details: "Подробнее", navigate: "Маршрут", share: "Поделиться", source: "Источник", copied: "Скопировано",
    tree: "Дерево", speciesUnknown: "Вид неизвестен", osmId: "ID в OpenStreetMap", gmina: "Гмина", park: "Парк", coords: "Координаты", condition: "Состояние", tag: "№ таблички",
    height: "Высота", circumference: "Обхват", leafType: "Тип листьев", unverified: "Данные из публичного реестра, ещё не проверены гминой.",
    registered: "Дерево в реестре гмины", monument: "Памятник природы", attraction: "Достопримечательность", publicTree: "Дерево из публичного реестра",
    zoomHint: "Приблизьте карту, чтобы увидеть все деревья", loadingTrees: "Загружаю деревья из OpenStreetMap…", osmDown: "Публичный реестр временно недоступен",
    lgGood: "Хорошее состояние", lgAttention: "Требует внимания", lgDanger: "Аварийное", lgOsm: "Дерево из OpenStreetMap", lgCluster: "Группа деревьев",
    rTitle: "Сообщить о проблеме", rGuest: "Сообщения доступны жителям гмины", rGuestSub: "Войдите по PESEL или зарегистрируйтесь, чтобы отправить сообщение с фото.",
    register: "Регистрация", rStaff: "Заявки жителей обрабатываются в панели.", openPanel: "Открыть панель", rPending: "Ваш аккаунт ждёт подтверждения гминой.",
    rWhere: "Где проблема?", rScan: "Отсканируйте код на дереве", rScanSub: "QR-код на табличке", rPick: "Выберите дерево на карте", rPickSub: "Нажмите на дерево, затем «Сообщить»",
    rHere: "В моём месте", rHereSub: "Напр. упавшее дерево у дороги", rChange: "Изменить", rAt: "Место события", rOsm: "Дерево из OpenStreetMap", rTree: "Дерево",
    rToGmina: "Сообщение попадёт в вашу гмину", osmSlow: "Ещё загружаю деревья — это может занять несколько минут", noLocation: "Не удалось определить место",
  },
};

const Ctx = createContext({ lang: "pl", setLang: () => {}, t: (k) => D.pl[k] || k });

export const LangProvider = ({ children }) => {
  const [lang, setL] = useState(localStorage.getItem("arbix_lang") || "pl");
  const setLang = (l) => { localStorage.setItem("arbix_lang", l); document.documentElement.lang = l; setL(l); };
  const t = (k) => D[lang]?.[k] || D.pl[k] || k;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
};

export const useT = () => useContext(Ctx);
