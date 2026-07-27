# Product

## Platform

web

## Users

Utenti non tecnici che vogliono usare i propri servizi web preferiti (Gmail, Calendar, WhatsApp, ecc.) come app desktop native, senza dover gestire manualmente profili browser, estensioni o multi-login. Il contesto d'uso è il PC personale o di lavoro, spesso con più account dello stesso servizio (es. Gmail personale + lavoro, più numeri WhatsApp) da tenere separati ma facilmente raggiungibili. Il job da fare: passare da un account/servizio all'altro istantaneamente, senza logout/login continui e senza che le sessioni si mischino.

## Product Purpose

Silos trasforma siti web in app desktop portabili (Windows, poi Linux/macOS), ciascuna con una sidebar di sottospazi che possono condividere o isolare sessione e cookie a piacere. Un'app può contenere più servizi Google con lo stesso utente (sessione condivisa) oppure più account dello stesso servizio isolati tra loro (es. più WhatsApp). Successo per l'utente: switch istantaneo tra account/servizi, con app pronte in tray, protette da PIN quando serve, e cache/cookie ripulibili come in un browser standard.

## Positioning

L'unica app-builder desktop che rende il multi-account senza friction: sottospazi che condividono o isolano sessione a scelta dell'utente, in un'app portable — non un wrapper Electron generico né un browser travestito.

## Brand Personality

Solido, essenziale, hacker-friendly: nessun fronzolo, tono da tool di controllo anche se l'utente finale non è tecnico — la UI deve restare semplice e leggibile pur trasmettendo affidabilità e precisione "da strumento serio".

## Anti-references

Non deve sembrare un wrapper Electron bloat/generico (UI pesante, lenta, priva di identità). Non deve sembrare un browser vero e proprio: deve sentirsi un'app dedicata, non Chrome/Edge con altra skin.

## Design Principles

- Sottospazi e sessioni sono il concetto centrale: la sidebar e lo switch tra spazi devono essere sempre il percorso più veloce, mai nascosti in menu profondi.
- Leggerezza percepita: interfaccia scattante e minimale, mai "Electron pesante" — niente chrome visivo superfluo.
- Fiducia da tool: precisione, stati chiari (sessione condivisa vs isolata, PIN attivo, cache pulita), niente ambiguità su quale account/sessione si sta usando.
- Portabilità come valore: l'app deve sentirsi leggera e autonoma, non un'installazione pesante.
- Semplice per utenti non tecnici, ma senza infantilizzare: essenziale, non giocoso.

## Accessibility & Inclusion

Standard WCAG AA: contrasto colore, focus visibile su tutti i controlli interattivi, piena navigabilità da tastiera (rilevante anche per switch rapido tra sottospazi).
