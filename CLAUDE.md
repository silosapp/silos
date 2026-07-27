# Silos

- Applicazione desktop cross platform per gestire e creare versioni desktop di siti web.
- Per ora supportare solo Windows, prevedere in futuro anche Linux e macOS. **Il codice specifico per macOS/Linux (`src-tauri/src/platform/macos`, `src-tauri/src/platform/linux`) è stato scritto da Claude in preparazione al supporto multipiattaforma futuro, ma non è mai stato compilato né testato su quei sistemi operativi** — trattarlo come bozza non verificata finché non verrà completato e testato più avanti.
- Dashboard per poter selezionare il sito web da far diventare una app desktop
- L'icona dell'app viene automaticamente scaricata dal sito o si può selezionare una immagine PNG
- L'applicazione sarà Portable
- L'app è una alternativa ispirata ad altri software come WebCatalog

# Funzioni app web

Ogni app web non è un semplice wrapper del sito, ma offrirà diverse funzionalità per la gestione di utenti.
Avrà una piccola sidebar laterale dove poter creare più copie con sottospazi diversi e si deve poter decidere quali condividono la stessa sessione.

Alcuni esempi di uso.

## Spazio Google singolo utente

Creo un'app i cui sotto spazi condivisono cookie e sessione e nella sidebar aggiungo i servizi come Gmai, Calendar, Photos e passo da uno spazio all'altro sempre con lo stesso utente senza dover fare login in ogni sottospazio.

## Spazio Google multi utente

Creo un'app i cui sotto spazi sono molteplici Gmail, ed ogni sotto spazio ha la sua gestione di cookie/sessione per poter gestire più account

## Whatsapp

Creao un'app i cui sotto spazi sono separati in modo da poter usare i vari account di WhatSapp

# Altre funzioni

- Le app devono poter essere protette da PIN
- Le app devono poter girare in background nella tray
- Devo poter ripulire cache/cooki come in browser standard di ogni sottospazio, tutti insieme o singoli

# Design Context

Strategic and visual design context lives in `PRODUCT.md` (users, positioning, brand personality, anti-references) and `DESIGN.md` (colors, typography, elevation, components, do's/don'ts — North Star: "The Departure Board"). Read both before any UI work; the `impeccable` skill also reads them automatically.
