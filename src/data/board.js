// Imperium Gzowianskie: the 24-field loop around the Gzowo plot, place groups and money rules.
export const GROUPS = {
  domki: { name: 'Domki', color: '#ff9d1a' },
  sosny: { name: 'Sosny', color: '#2fbf71' },
  woda: { name: 'Nad wodą', color: '#2f9fe0' },
  okolica: { name: 'Okolica', color: '#8a52d6' },
  skarpa: { name: 'Skarpa', color: '#ffd21a' },
  osrodek: { name: 'Ośrodek', color: '#e23b2e' },
}

export const FIELDS = [
  { id: 'start', name: 'Śniadanie', type: 'start', lore: 'Dzień w Gzowie zaczyna się śniadaniem przy dużym stole na limonkowych kozłach.' },
  { id: 'domek1', name: 'Domek nr 1', type: 'place', group: 'domki', price: 60000, lore: 'Ciemny drewniany domek z czerwonymi drzwiami i tabliczką Ośrodek Wypoczynkowy.' },
  { id: 'domek2', name: 'Domek nr 2', type: 'place', group: 'domki', price: 60000, lore: 'Jeden z trzech domków, które zostały z dziesięciu.' },
  { id: 'moya', name: 'Stacja Moya', type: 'moya', lore: 'Stacja benzynowa obok Gzowa. Chodzi się tam na lody, a panie są bardzo miłe.' },
  { id: 'domek3', name: 'Domek nr 3', type: 'place', group: 'domki', price: 80000, lore: 'Ostatni domek dawnego ośrodka FSO.' },
  { id: 'hamak', name: 'Hamak', type: 'place', group: 'sosny', price: 100000, lore: 'Hamak rozwieszony między sosnami, w tle prześwituje Narew.' },
  { id: 'niewypal', name: 'Niewypał', type: 'niewypal', lore: 'To tereny powojenne. W ziemi trafiają się niewypały i wtedy przyjeżdżają saperzy.' },
  { id: 'ognisko', name: 'Ognisko', type: 'place', group: 'sosny', price: 100000, lore: 'Ogień plus Gzowo to niepokonane combo.' },
  { id: 'sosny', name: 'Kępa sosen', type: 'place', group: 'sosny', price: 120000, lore: 'Wysokie sosny rosną w samym środku działki.' },
  { id: 'koparka', name: 'Koparka Waldka', type: 'koparka', lore: 'Koparka na kółkach. Pracuje nią głównie Waldek.' },
  { id: 'plaza', name: 'Plaża', type: 'place', group: 'woda', price: 140000, lore: 'Piaszczysty stok do płytkiej wody. Tu się kopie w piasku i woduje kajaki.' },
  { id: 'cypel', name: 'Cypel', type: 'place', group: 'woda', price: 140000, lore: 'Miejsce nad samą wodą, z paleniskiem. Najlepsze zachody słońca.' },
  { id: 'heli', name: 'Helikopter', type: 'heli', lore: 'Szamborski czasem przylatuje do Gzowa granatowym helikopterem.' },
  { id: 'kanal', name: 'Kanał', type: 'place', group: 'woda', price: 160000, lore: 'Kanał obok Kociej Wyspy. Stąd jest Paweł.' },
  { id: 'kocia', name: 'Kocia Wyspa', type: 'place', group: 'okolica', price: 180000, lore: 'Wyspa obok kanału. Koty są w Gzowie ważne.' },
  { id: 'wojt', name: 'Wójt', type: 'wojt', lore: 'Wójt pilnuje, żeby w gminie wszystko się zgadzało.' },
  { id: 'waldek', name: 'Dom Waldka', type: 'place', group: 'okolica', price: 200000, lore: 'Waldek to pomocnik w Gzowie, ale też bardzo przyjaciel.' },
  { id: 'panele', name: 'Panele', type: 'place', group: 'skarpa', price: 220000, lore: 'Panele słoneczne stoją tam, gdzie kiedyś były domki.' },
  { id: 'rakieta', name: 'GL Launch Site', type: 'rakieta', lore: 'Stąd startują rakiety Gzofajfus. Czeka się, aż ucichnie wiatr.' },
  { id: 'sklad', name: 'Stary skład', type: 'place', group: 'skarpa', price: 240000, lore: 'Pod skarpą jest najprawdopodobniej stary skład bomb i broni.' },
  { id: 'grad', name: 'Burza z gradem', type: 'grad', lore: 'Kiedyś padał tu grad wielkości małych kostek lodu.' },
  { id: 'wiata', name: 'Wiata', type: 'place', group: 'osrodek', price: 260000, lore: 'Stoi od czasów ośrodka. Pod nią pasiasty fotel i drewno na opał.' },
  { id: 'taras', name: 'Taras', type: 'place', group: 'osrodek', price: 300000, lore: 'Duży drewniany taras z desek.' },
  { id: 'dom', name: 'Dom', type: 'place', group: 'osrodek', price: 400000, lore: 'Dom wsunięty w skarpę, wzorowany na dawnych łazienkach ośrodka.' },
]

export const RULES = {
  startMoney: 800000,
  lapBonus: 150000,
  startBonus: 250000,
  packPrice: 50000,
  handLimit: 5,
  saperzyFee: 50000,
  wojtRate: 0.1,
  wojtMin: 20000,
  gradCabin: 20000,
  gradDom: 60000,
  koparkaCash: 50000,
  gzmStart: 10000,
  lengths: { krotka: 8, normalna: 12, dluga: 18 },
  levelMult: [1, 4, 8, 12, 20],
}

export const round10k = n => Math.max(10000, Math.round(n / 10000) * 10000)
export const baseFee = f => round10k(f.price * 0.1)
export const cabinCost = f => round10k(f.price / 2)
export const groupFields = g => FIELDS.map((f, i) => (f.group === g ? i : -1)).filter(i => i >= 0)
export const szyszki = n => n.toLocaleString('pl-PL').replace(/ | /g, ' ')
