// Imperium Gzowianskie: the Octopus host. Turns engine events into short Polish lines for the speech bubble and feeds the same facts to the live voice.
import { FIELDS, RULES, szyszki } from '../data/board.js'
import { cardById } from '../data/cards.js'

const one = a => a[Math.floor(Math.random() * a.length)]

export const SYSTEM = `Jesteś Ośmiornicą: bankierem, krupierem i prowadzącym grę Imperium Gzowiańskie. To gra rodzinna rozgrywana na jednym tablecie, który wędruje z rąk do rąk. Mówisz wyłącznie po polsku, na głos, do ludzi siedzących przy stole w Gzowie.

CHARAKTER: cwany, sympatyczny krupier. Trzymasz stronę banku, cieszysz się, gdy ktoś płaci, docinasz bogatym, kibicujesz biednym. Jesteś ośmiornicą z logo Gzowa 34, masz osiem macek i lubisz o tym napomknąć. Żartujesz ciepło, nigdy nie obrażasz.

JAK MÓWISZ: jedno albo dwa krótkie zdania, nigdy więcej. Bez list, bez wyliczanek, bez emoji. Kwoty mów jak człowiek: "sześćdziesiąt tysięcy szyszek". Zwracaj się do graczy po imieniu.

SKĄD WIESZ, CO SIĘ DZIEJE: aplikacja jest bankiem i sędzią. Dostajesz od niej wiadomości zaczynające się od [GRA] z faktami: kto rzucił, gdzie stanął, ile zapłacił, ile ma. Nigdy nie wymyślaj kwot, pól ani wyników. Jeśli czegoś nie wiesz, użyj narzędzia stan_gry. Po wiadomości [GRA] skomentuj krótko to, co najważniejsze, i podaj najważniejszą liczbę. Nie powtarzaj wszystkiego słowo w słowo.

TAJEMNICE: karty w ręku graczy są tajne. Nigdy nie mów na głos, jakie karty ktoś dostał z paka ani co ma w ręku. Możesz powiedzieć tylko, czy trafiła się karta rzadka albo legendarna.

GDY GRACZ MÓWI DO CIEBIE: to zawsze gracz, który ma teraz turę. Odpowiadaj krótko. Jeśli prosi o ruch w grze (rzut kostkami, zakup, pak, zagranie karty, budowę, giełdę, koniec tury), wykonaj go odpowiednim narzędziem i powiedz, co wyszło, na podstawie odpowiedzi narzędzia. Jeśli narzędzie odmówi, powiedz dlaczego. Jeśli nie rozumiesz, powiedz "Nie dosłyszałam, powtórz proszę".

ZASADY GRY: pętla 24 pól wokół działki. Gracze rzucają dwiema kostkami, kupują miejsca, płacą sobie za wejście na cudze. Cała grupa miejsc w jednym kolorze daje podwójną opłatę i pozwala stawiać domki FSO (do trzech), a potem Dom. Paki kart kosztują ${szyszki(RULES.packPrice)} szyszek, jeden na turę, na Stacji Moya pak jest darmowy. Jest giełda Gzowium, kurs skacze co rundę i po wydarzeniach. Pola specjalne: Śniadanie (start, ${szyszki(RULES.lapBonus)} za okrążenie), Stacja Moya, Niewypał (saperzy), Koparka Waldka, Helikopter Szamborskiego, Wójt (podatek), GL Launch Site (start rakiety na zakład), Burza z gradem. Gra kończy się po ustalonej liczbie rund, wygrywa najbogatszy.

O GZOWIE (prawdziwe fakty, możesz nimi sypać): Gzowo 34 to działka nad Narwią, dawny ośrodek wędkarski Fabryki Samochodów Osobowych. Kiedyś stało tu dziesięć domków, zostały trzy. Jan to tata i Kierownik Ośrodka, jego zasada brzmi "Ośrodek daje, Ośrodek daje". Zofia to mama. Jurek buduje rakiety Gzofajfus, Rysio to jego młodszy brat. Waldek to pomocnik i przyjaciel, pracuje koparką. Szamborski przylatuje granatowym helikopterem. Major łowi ryby i robi wycinki drzew. Beethoven to głuchy biały kot. Dropsik to psiak, którego kiedyś porwano. Na jedne święta przyjechała tu koza. Na Stację Moya chodzi się na lody. W ziemi trafiają się niewypały, więc przyjeżdżają saperzy. Kiedyś padał grad wielkości kostek lodu.

WYMOWA: Gzowo czytaj "gzo-wo" (g i z razem, bez samogłoski między nimi), Gzowium "gzo-wium", Narew "na-rew", Moya "moja", GL Launch Site "gie el lancz sajt", Gzofajfus "gzo-faj-fus".`

export const TOOLS = [
  { name: 'stan_gry', description: 'Zwraca aktualny stan gry: runda, kurs Gzowium, czyja tura, szyszki, miejsca i majątek każdego gracza.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'rzuc_kostkami', description: 'Rzuca kostkami za gracza, który ma turę.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'decyzja', description: 'Odpowiada na pytanie, które właśnie jest na ekranie: zakup miejsca (tak albo nie) albo niewypał (zapłacić saperom albo czekać).', parameters: { type: 'OBJECT', properties: { tak: { type: 'BOOLEAN', description: 'true = kupuję albo płacę saperom, false = nie kupuję albo czekam' } }, required: ['tak'] } },
  { name: 'kup_pak', description: 'Kupuje pak kart za szyszki.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'zagraj_karte', description: 'Zagrywa kartę z ręki gracza. Cel podaj tylko, gdy karta go potrzebuje: imię gracza albo nazwę pola.', parameters: { type: 'OBJECT', properties: { karta: { type: 'STRING', description: 'nazwa karty, np. Major, Helikopter, Lody z Moya' }, cel: { type: 'STRING', description: 'imię gracza albo nazwa pola' } }, required: ['karta'] } },
  { name: 'postaw_domek', description: 'Stawia domek (albo Dom po trzech domkach) na miejscu gracza.', parameters: { type: 'OBJECT', properties: { miejsce: { type: 'STRING' } }, required: ['miejsce'] } },
  { name: 'gielda', description: 'Kupuje albo sprzedaje Gzowium po aktualnym kursie.', parameters: { type: 'OBJECT', properties: { akcja: { type: 'STRING', description: 'kup albo sprzedaj' }, ile: { type: 'INTEGER' } }, required: ['akcja', 'ile'] } },
  { name: 'koniec_tury', description: 'Kończy turę gracza.', parameters: { type: 'OBJECT', properties: {} } },
]

export function createHost({ lineEl, octoEl, state }) {
  let live = null
  const n = id => state().players[id].name
  const f = i => FIELDS[i].name
  const k = x => szyszki(x)

  function text(e) {
    switch (e.t) {
      case 'begin': return `Witam w Imperium Gzowiańskim. Gra ${e.players.length} graczy, ${e.rounds} rund. Bank otwarty.`
      case 'turn': return one([`${n(e.player)}, Twoja kolej. Masz ${k(e.money)} szyszek.`, `Tablet bierze ${n(e.player)}. Na koncie ${k(e.money)} szyszek.`])
      case 'skipped': return `${n(e.player)} czeka na saperów i traci kolejkę.`
      case 'roll': return `${e.dice[0]} i ${e.dice[1]}, razem ${e.dice[0] + e.dice[1]}.`
      case 'land': return `${n(e.player)} staje na polu ${f(e.field)}.`
      case 'lap': return e.exact ? `Śniadanie przy dużym stole. ${n(e.player)} dostaje ${k(e.amount)} szyszek.` : `${n(e.player)} mija start i zgarnia ${k(e.amount)} szyszek.`
      case 'bought': return e.price ? one([`${n(e.player)} kupuje pole ${f(e.field)} za ${k(e.price)}. Bank dziękuje.`, `Pole ${f(e.field)} ma nowego właściciela: ${n(e.player)}.`]) : `${n(e.player)} dostaje pole ${f(e.field)} za darmo.`
      case 'skipBuy': return `${n(e.player)} nie kupuje. Pole ${f(e.field)} dalej wolne.`
      case 'cantBuy': return `${n(e.player)} nie ma dość szyszek na pole ${f(e.field)}.`
      case 'home': return `${n(e.player)} jest u siebie.`
      case 'pay': return e.to != null ? one([`${n(e.from)} płaci ${k(e.amount)} szyszek, zgarnia je ${n(e.to)}. ${e.why}.`, `${e.why}: ${n(e.from)} płaci ${k(e.amount)} szyszek, bierze ${n(e.to)}.`]) : `${n(e.from)} płaci bankowi ${k(e.amount)} szyszek. ${e.why}.`
      case 'immune': return `${n(e.player)} nic nie płaci.`
      case 'half': return `${n(e.player)} płaci tylko połowę.`
      case 'gain': return `${n(e.player)} dostaje ${k(e.amount)} szyszek. ${e.why}.`
      case 'freePack': return `Stacja Moya. ${n(e.player)} dostaje darmowy pak.`
      case 'packBought': return `${n(e.player)} kupuje pak za ${k(e.price)}.`
      case 'packTaken': { const r = e.cards.map(c => cardById[c].rarity); return r.includes('legendarna') ? 'W paku karta legendarna!' : r.includes('rzadka') ? 'W paku trafiła się rzadka karta.' : 'W paku same zwykłe karty.' }
      case 'card': return `${n(e.player)} zagrywa kartę ${cardById[e.card].name}.`
      case 'blocked': return `Beethoven nic nie słyszy i karta przepada. Ocalony gracz: ${n(e.player)}.`
      case 'extraRoll': return `${n(e.player)} rzuca jeszcze raz.`
      case 'rate': return e.why === 'runda' ? null : `Kurs Gzowium ${e.rate >= e.before ? 'rośnie' : 'spada'} do ${k(e.rate)}.`
      case 'round': return `Runda ${e.round} z ${e.rounds}. Kurs Gzowium: ${k(state().gzmRate)}.`
      case 'built': return e.free ? `Waldek stawia darmowy domek na polu ${f(e.field)}. Zyskuje ${n(e.player)}.` : `${n(e.player)} stawia ${e.level === 4 ? 'Dom' : 'domek'} na polu ${f(e.field)}.`
      case 'cut': return `Major wycina domek na polu ${f(e.field)}. ${n(e.victim)} może tylko patrzeć.`
      case 'trapSet': return `${n(e.player)} zakopuje gdzieś niewypał.`
      case 'trap': return `Niewypał! ${n(e.player)} wpada w pułapkę. Autor pułapki: ${n(e.owner)}.`
      case 'saperzy': return e.paid ? `${n(e.player)} płaci saperom i idzie dalej.` : `${n(e.player)} czeka na saperów. Traci następną kolejkę.`
      case 'fly': return `${n(e.player)} leci helikopterem na pole ${f(e.to)}.`
      case 'launch': return e.success ? (e.bet ? `Start udany! ${n(e.player)} wygrywa ${k(e.bet)} szyszek.` : 'Start udany, tylko nikt nic nie postawił.') : (e.bet ? `Spadochron się nie otworzył. ${n(e.player)} traci ${k(e.bet)} szyszek.` : 'Rakieta w krzakach. Dobrze, że bez zakładu.')
      case 'hail': return e.amount ? `Grad wielkości kostek lodu. Naprawy: ${k(e.amount)} szyszek, płaci ${n(e.player)}.` : `Grad, ale ${n(e.player)} nie ma czego naprawiać.`
      case 'stolenCard': return e.card ? `Dropsik porywa kartę. Traci ${n(e.victim)}, zyskuje ${n(e.player)}.` : 'Dropsik wraca z pustym pyskiem.'
      case 'swap': return `${n(e.player)} i ${n(e.victim)} zamieniają się miejscami na planszy.`
      case 'stolenPlace': return `Macki sięgają daleko. Pole ${f(e.field)} zmienia właściciela: traci ${n(e.victim)}, bierze ${n(e.player)}.`
      case 'market': return `${n(e.player)} ${e.kind === 'buy' ? 'kupuje' : 'sprzedaje'} ${e.n} Gzowium po ${k(e.rate)}.`
      case 'trade': return `${n(e.from)} i ${n(e.to)} dobili targu.`
      case 'liquidate': return `${n(e.player)} wyprzedaje majątek, żeby zapłacić.`
      case 'bankrupt': return `${n(e.player)} bankrutuje i odpada z gry.`
      case 'over': return `Koniec gry. Wygrywa ${e.ranking[0].name} z majątkiem ${k(e.ranking[0].wealth)} szyszek.`
      default: return null
    }
  }

  function show(t) {
    lineEl.textContent = t
  }

  function narrate(events, { quiet = false } = {}) {
    const lines = events.map(text).filter(Boolean)
    if (!lines.length) return ''
    show(lines.slice(-2).join(' '))
    if (!quiet && live && live.ready()) live.sendText(`[GRA] ${lines.join(' ')}`)
    return lines.join(' ')
  }

  return {
    narrate, show, text,
    setLive: l => { live = l },
    speaking: on => octoEl.classList.toggle('talk', on),
    online: on => octoEl.classList.toggle('off', !on),
  }
}
