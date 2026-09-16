# Focus Flow

Un'app Pomodoro minimale, veloce e senza dipendenze: un anello di progresso, un elenco di attività e le statistiche della giornata, tutto in HTML, CSS e JavaScript vanilla.

## Funzionalità

- Timer Pomodoro con tre modalità: Focus (25 min), Pausa breve (5 min), Pausa lunga (15 min)
- Pausa lunga automatica ogni 4 cicli completati
- Elenco attività: aggiungi, completa, elimina e imposta un'attività come "attiva"
- Conteggio dei pomodori per attività
- Statistiche giornaliere (sessioni completate, minuti di focus) salvate in `localStorage`
- Segnale acustico al termine di ogni sessione

## Come usarlo

Basta aprire [`index.html`](index.html) in un browser: non servono build step né server.

```bash
open index.html
```

## Struttura del progetto

- `index.html` — markup dell'app
- `style.css` — stile e tema
- `script.js` — logica del timer, delle attività e dello stato persistente
