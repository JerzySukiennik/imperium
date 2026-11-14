// Imperium Gzowianskie, the printed board game: single source of truth for fields, prices, fees, costs, cards and game lengths. The simulator, board, cards and rulebook are all generated from this file.
export const RES = {
  drewno: { name: 'Drewno', one: 'drewno', color: '#a8672e' },
  piasek: { name: 'Piasek', one: 'piasek', color: '#e8b93a' },
  ryby: { name: 'Ryby', one: 'rybę', color: '#2f9fe0' },
}

export const GROUPS = {
  domki: { name: 'Domki', color: '#ff9d1a' },
  sosny: { name: 'Sosny', color: '#2fbf71' },
  woda: { name: 'Nad wodą', color: '#2f9fe0' },
  okolica: { name: 'Okolica', color: '#8a52d6' },
  skarpa: { name: 'Skarpa', color: '#ffd21a' },
  osrodek: { name: 'Ośrodek', color: '#19c2b0' },
}

const place = (id, name, group, res, price, fee, lore) => ({ id, name, type: 'place', group, res, price, fee, lore })

export const FIELDS = [
  { id: 'start', name: 'Śniadanie', type: 'start', lore: 'Dzień w Gzowie zaczyna się śniadaniem przy dużym stole.' },
  place('domek1', 'Domek nr 1', 'domki', 'drewno', 3, 1, 'Ciemny drewniany domek z czerwonymi drzwiami.'),
  place('domek2', 'Domek nr 2', 'domki', 'piasek', 3, 1, 'Jeden z trzech domków, które zostały z dziesięciu.'),
  { id: 'moya', name: 'Stacja Moya', type: 'moya', lore: 'Chodzi się tam na lody, a panie są bardzo miłe.' },
  place('domek3', 'Domek nr 3', 'domki', 'ryby', 4, 1, 'Ostatni domek dawnego ośrodka wędkarskiego FSO.'),
  place('hamak', 'Hamak', 'sosny', 'drewno', 5, 2, 'Rozwieszony między sosnami, w tle prześwituje Narew.'),
  { id: 'niewypal', name: 'Niewypał', type: 'niewypal', lore: 'Tereny powojenne. Przyjeżdżają saperzy.' },
  place('ognisko', 'Ognisko', 'sosny', 'drewno', 5, 2, 'Ogień plus Gzowo to niepokonane combo.'),
  place('sosny', 'Kępa sosen', 'sosny', 'drewno', 6, 2, 'Wysokie sosny w samym środku działki.'),
  { id: 'koparka', name: 'Koparka Waldka', type: 'koparka', lore: 'Koparka na kółkach. Pracuje nią Waldek.' },
  place('plaza', 'Plaża', 'woda', 'piasek', 7, 2, 'Piaszczysty stok do płytkiej wody.'),
  place('cypel', 'Cypel', 'woda', 'ryby', 7, 2, 'Nad samą wodą, najlepsze zachody słońca.'),
  { id: 'heli', name: 'Helikopter', type: 'heli', lore: 'Szamborski przylatuje granatowym helikopterem.' },
  place('kanal', 'Kanał', 'woda', 'ryby', 8, 3, 'Kanał obok Kociej Wyspy.'),
  place('kocia', 'Kocia Wyspa', 'okolica', 'ryby', 9, 3, 'Koty są w Gzowie ważne.'),
  { id: 'wojt', name: 'Wójt', type: 'wojt', lore: 'Pilnuje, żeby w gminie wszystko się zgadzało.' },
  place('waldek', 'Dom Waldka', 'okolica', 'piasek', 10, 3, 'Waldek to pomocnik, ale też bardzo przyjaciel.'),
  place('panele', 'Panele', 'skarpa', 'piasek', 11, 4, 'Stoją tam, gdzie kiedyś były domki.'),
  { id: 'rakieta', name: 'GL Launch Site', type: 'rakieta', lore: 'Stąd startują rakiety Gzofajfus.' },
  place('sklad', 'Stary skład', 'skarpa', 'piasek', 12, 4, 'Pod skarpą jest pewnie stary skład bomb.'),
  { id: 'grad', name: 'Burza z gradem', type: 'grad', lore: 'Grad wielkości małych kostek lodu.' },
  place('wiata', 'Wiata', 'osrodek', 'drewno', 13, 4, 'Pod nią pasiasty fotel i drewno na opał.'),
  place('taras', 'Taras', 'osrodek', 'drewno', 15, 5, 'Duży drewniany taras z desek.'),
  place('dom', 'Dom', 'osrodek', 'ryby', 20, 6, 'Dom wsunięty w skarpę.'),
]

export const RULES = {
  startMoney: 30,
  seatBonus: 4,
  salary: 4,
  startExact: 2,
  harvestOnLap: true,
  ownLanding: 2,
  buyBonus: 1,
  feeGroup: 2,
  feeCabin: 4,
  feeHouse: 10,
  cabin: { drewno: 2, piasek: 1 },
  house: { drewno: 1, piasek: 2, ryby: 3 },
  buyout: 2,
  cardCost: { ryby: 1 },
  handLimit: 5,
  bankTrade: 3,
  sellRes: 1,
  sellCabin: 2,
  sellHouse: 6,
  saperzy: 3,
  wojtPerPlace: 1,
  gradCabin: 2,
  gradHouse: 5,
  koparka: 2,
  rakieta: [-3, 2, 3, 4, 5, 6],
}

export const MODES = {
  szybka: { name: 'Osada', time: 'ok. 30 minut', deal: 2, groups: 1, houses: 0, all: false, goal: 'Cała grupa miejsc i domek na każdym z nich.' },
  normalna: { name: 'Imperium', time: 'ok. godziny', deal: 0, groups: 1, houses: 1, all: false, goal: 'Cała grupa miejsc, na jednym Dom, na pozostałych domki.' },
  dluga: { name: 'Wielkie Imperium', time: '2 godziny i więcej', deal: 0, groups: 2, houses: 2, all: true, goal: 'Dwie całe grupy miejsc, a na każdym ich miejscu Dom.' },
}

export const TOKENS = { szyszka1: 40, szyszka5: 24, szyszka10: 12, drewno: 24, piasek: 20, ryby: 20, domek: 16, dom: 10, niewypal: 2 }

export const feeOf = (f, level, fullGroup) => level === 2 ? f.fee * RULES.feeHouse : level === 1 ? f.fee * RULES.feeCabin : fullGroup ? f.fee * RULES.feeGroup : f.fee
export const groupFields = g => FIELDS.map((f, i) => (f.group === g ? i : -1)).filter(i => i >= 0)

const card = (id, name, rarity, when, text) => ({ id, name, rarity, when, text })

export const COPIES = { zwykla: 3, rzadka: 2, legendarna: 1 }
export const RARITY = { zwykla: 'Zwykła', rzadka: 'Rzadka', legendarna: 'Legendarna' }

export const CARDS = [
  card('lody', 'Lody z Moya', 'zwykla', 'tura', 'Weź 2 szyszki z banku.'),
  card('sniadanie', 'Śniadanie', 'zwykla', 'tura', 'Duży stół, pełny talerz. Weź 3 szyszki z banku.'),
  card('kopanie', 'Kopanie w piasku', 'zwykla', 'tura', 'Weź 2 piaski z banku.'),
  card('obiad', 'Zimowy obiad', 'zwykla', 'oplata', 'Zagraj, gdy masz zapłacić za wejście. Płacisz tylko połowę (zaokrąglij w górę).'),
  card('hamak', 'Hamak', 'zwykla', 'oplata', 'Zagraj, gdy masz zapłacić za wejście. Leżysz w hamaku i nie płacisz nic.'),
  card('kajak', 'Kajak', 'zwykla', 'ruch', 'Zagraj po rzucie kostkami. Płyniesz o 1, 2 albo 3 pola dalej.'),
  card('sup', 'Deska SUP', 'zwykla', 'ruch', 'Zagraj po rzucie kostkami. Stajesz o 1, 2 albo 3 pola bliżej.'),
  card('dron', 'Dron Avata', 'zwykla', 'tura', 'Obejrzyj karty wybranego gracza i zabierz mu 1 dowolny surowiec.'),
  card('ognisko', 'Ognisko', 'zwykla', 'tura', 'Każdy inny gracz przynosi Ci 1 drewno. Kto nie ma drewna, daje 1 szyszkę.'),
  card('ptaki', 'Klucz ptaków', 'zwykla', 'tura', 'Po swoim ruchu rzuć kostkami jeszcze raz i idź drugi raz.'),
  card('grad', 'Grad', 'zwykla', 'tura', 'Wybrany gracz płaci bankowi 2 szyszki za każdy swój domek i 5 za każdy Dom.'),
  card('motorowka', 'Motorówka', 'zwykla', 'tura', 'Wypływasz na Narew na ryby. Weź 2 ryby z banku.'),
  card('taras', 'Praca nad tarasem', 'zwykla', 'tura', 'Zostało trochę desek. Weź 2 drewna z banku.'),
  card('mapa', 'Mapa geodezyjna', 'rzadka', 'tura', 'Kup dowolne wolne miejsce za jego cenę, bez stawania na nim.'),
  card('waldek', 'Waldek i koparka', 'rzadka', 'tura', 'Postaw domek na swoim miejscu za darmo, bez surowców.'),
  card('major', 'Major', 'rzadka', 'tura', 'Wycinka. Zdejmij jeden domek z cudzego miejsca. Domu nie ruszysz.'),
  card('wojt', 'Wójt', 'rzadka', 'tura', 'Wybrany gracz płaci bankowi 1 szyszkę za każde swoje miejsce.'),
  card('saperzy', 'Niewypał', 'rzadka', 'tura', 'Połóż żeton niewypału na dowolnym miejscu. Pierwszy inny gracz, który tam stanie, płaci Ci 3 szyszki i traci kolejkę.'),
  card('beethoven', 'Beethoven', 'rzadka', 'obrona', 'Głuchy kot. Zagraj, gdy ktoś zagrywa kartę przeciwko Tobie. Ta karta nie działa.'),
  card('dropsik', 'Dropsik', 'rzadka', 'tura', 'Dropsik porywa losową kartę z ręki wybranego gracza i przynosi ją Tobie.'),
  card('koza', 'Koza na święta', 'rzadka', 'tura', 'Dodatkowe zbiory: weź po 1 surowcu z każdego swojego miejsca.'),
  card('benny', 'Benny', 'rzadka', 'tura', 'Idzie w deszczu i nic go nie rusza. Połóż przed sobą: do swojej następnej tury nie płacisz za wejścia.'),
  card('noc', 'Czerwona noc', 'rzadka', 'tura', 'Zamień się pionkami z wybranym graczem. Nikt nie wykonuje pola.'),
  card('zofia', 'Mama w czerwieni', 'rzadka', 'tura', 'Wybrany gracz oddaje Ci 2 surowce, które sam wybierasz.'),
  card('helikopter', 'Helikopter', 'legendarna', 'zamiast', 'Zagraj zamiast rzutu kostkami. Lecisz na dowolne pole i je wykonujesz.'),
  card('osmiornica', 'Ośmiornica', 'legendarna', 'tura', 'Macki sięgają daleko. Zabierz wybranemu graczowi jedno miejsce bez budynku.'),
  card('tablica', 'Tablica FSO', 'legendarna', 'tura', 'Weź za darmo najtańsze wolne miejsce. Gdy wolnych nie ma, weź 5 szyszek.'),
  card('daje', 'Ośrodek daje', 'legendarna', 'tura', 'Ośrodek daje, Ośrodek daje. Weź 4 dowolne surowce z banku.'),
  card('orange', 'The Orange Beauty', 'legendarna', 'tura', 'Udany start. Każdy inny gracz płaci Ci 2 szyszki za bilet na pokaz.'),
]

export const WHEN = { tura: 'W swojej turze', oplata: 'Gdy płacisz', ruch: 'Po rzucie', zamiast: 'Zamiast rzutu', obrona: 'W obronie' }

export const DECK = CARDS.flatMap(c => Array(COPIES[c.rarity]).fill(c.id))
