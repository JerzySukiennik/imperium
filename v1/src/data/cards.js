// Imperium Gzowianskie: cards found in packs. Photos come from the Gzowo Dataset.
export const RARITY = { zwykla: { name: 'Zwykła', weight: 70 }, rzadka: { name: 'Rzadka', weight: 24 }, legendarna: { name: 'Legendarna', weight: 6 } }

export const CARDS = [
  { id: 'lody', name: 'Lody z Moya', rarity: 'zwykla', target: 'none', text: 'Dostajesz 30 000 szyszek.' },
  { id: 'sniadanie', name: 'Śniadanie', rarity: 'zwykla', target: 'none', text: 'Duży stół, pełny talerz. Dostajesz 50 000 szyszek.' },
  { id: 'kopanie', name: 'Kopanie w piasku', rarity: 'zwykla', target: 'none', text: 'Wykopujesz 40 000 szyszek.' },
  { id: 'obiad', name: 'Zimowy obiad', rarity: 'zwykla', target: 'none', text: 'Następna opłata, którą płacisz, jest o połowę mniejsza.' },
  { id: 'hamak', name: 'Hamak', rarity: 'zwykla', target: 'none', text: 'Do końca tej tury nie płacisz za wejście na cudze miejsca.' },
  { id: 'kajak', name: 'Kajak', rarity: 'zwykla', target: 'steps', text: 'Płyniesz 1, 2 albo 3 pola do przodu.' },
  { id: 'sup', name: 'Deska SUP', rarity: 'zwykla', target: 'steps', text: 'Cofasz się o 1, 2 albo 3 pola.' },
  { id: 'dron', name: 'Dron Avata', rarity: 'zwykla', target: 'player', text: 'Podglądasz karty wybranego gracza.' },
  { id: 'ognisko', name: 'Ognisko', rarity: 'zwykla', target: 'none', text: 'Wszyscy siadają przy Twoim ognisku. Każdy daje Ci 20 000 szyszek.' },
  { id: 'ptaki', name: 'Klucz ptaków', rarity: 'zwykla', target: 'none', text: 'Rzucasz kostkami jeszcze raz.' },
  { id: 'grad', name: 'Grad', rarity: 'zwykla', target: 'player', text: 'Wybrany gracz płaci 20 000 szyszek za każdy swój domek.' },
  { id: 'hossa', name: 'Hossa Gzowium', rarity: 'zwykla', target: 'none', text: 'Kurs Gzowium rośnie o jedną czwartą.' },
  { id: 'krach', name: 'Krach Gzowium', rarity: 'zwykla', target: 'none', text: 'Kurs Gzowium spada o jedną czwartą.' },
  { id: 'mapa', name: 'Mapa geodezyjna', rarity: 'rzadka', target: 'freePlace', text: 'Kupujesz dowolne wolne miejsce za jego cenę, bez stawania na nim.' },
  { id: 'waldek', name: 'Waldek i koparka', rarity: 'rzadka', target: 'myPlace', text: 'Waldek stawia Ci darmowy domek, nawet bez całej grupy.' },
  { id: 'major', name: 'Major', rarity: 'rzadka', target: 'theirBuilt', text: 'Wycinka. Usuwasz jeden domek z cudzego miejsca.' },
  { id: 'wojt', name: 'Wójt', rarity: 'rzadka', target: 'player', text: 'Wybrany gracz płaci podatek: dziesiątą część swoich szyszek.' },
  { id: 'saperzy', name: 'Niewypał', rarity: 'rzadka', target: 'anyPlace', text: 'Zakopujesz niewypał na wybranym miejscu. Kto pierwszy na nim stanie, płaci Ci 50 000 i traci kolejkę.' },
  { id: 'beethoven', name: 'Beethoven', rarity: 'rzadka', target: 'none', text: 'Głuchy kot. Następna karta zagrana przeciwko Tobie nie działa.' },
  { id: 'dropsik', name: 'Dropsik', rarity: 'rzadka', target: 'player', text: 'Dropsik porywa losową kartę wybranemu graczowi i przynosi ją Tobie.' },
  { id: 'koza', name: 'Koza na święta', rarity: 'rzadka', target: 'none', text: 'Dostajesz 20 000 szyszek za każde swoje miejsce.' },
  { id: 'benny', name: 'Benny', rarity: 'rzadka', target: 'none', text: 'Idzie w deszczu i nic go nie rusza. Do Twojej następnej tury nie płacisz za wejście.' },
  { id: 'noc', name: 'Czerwona noc', rarity: 'rzadka', target: 'player', text: 'Zamieniasz się pionkami z wybranym graczem.' },
  { id: 'zofia', name: 'Mama w czerwieni', rarity: 'rzadka', target: 'player', text: 'Wybrany gracz oddaje Ci 100 000 szyszek.' },
  { id: 'helikopter', name: 'Helikopter', rarity: 'legendarna', target: 'anyField', text: 'Lecisz na dowolne pole planszy.' },
  { id: 'osmiornica', name: 'Ośmiornica', rarity: 'legendarna', target: 'theirPlace', text: 'Macki sięgają daleko. Zabierasz wybranemu graczowi jedno miejsce bez Domu.' },
  { id: 'tablica', name: 'Tablica FSO', rarity: 'legendarna', target: 'none', text: 'Dostajesz za darmo najtańsze wolne miejsce. Gdy brak wolnych, 150 000 szyszek.' },
  { id: 'daje', name: 'Ośrodek daje', rarity: 'legendarna', target: 'none', text: 'Ośrodek daje, Ośrodek daje. Dostajesz 200 000 szyszek.' },
  { id: 'orange', name: 'The Orange Beauty', rarity: 'legendarna', target: 'none', text: 'Udany start. Dostajesz 100 000 szyszek, a kurs Gzowium rośnie o piątą część.' },
]

export const cardById = Object.fromEntries(CARDS.map(c => [c.id, c]))
export const photoOf = id => `assets/karty/${id}.jpg`
