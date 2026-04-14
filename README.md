# Corked

En visuell vinskap-app (16 hyller × 6 flasker = 96 plasser).
Klikk på en plass for å registrere en flaske med farge (rødvin/hvitvin), status (lagring / drikkes nå), matpar og drikkevindu (år). Hold musen over en flaske for å se info.

## Live

https://markask.github.io/corked/

## Slik fungerer det

- **Ingen server, ingen database** — ren HTML + CSS + JavaScript
- **Data lagres lokalt** i nettleserens `localStorage` (nøkkel `vinskap-v1`)
- Hver bruker får sitt eget private skap — data er isolert per nettleser
- **Backup** via «Last ned backup» / «Last opp backup» (JSON-fil)
- **Automatisk status fra systemklokke:** sett «Drikkes best fra år 2035» — flasken skifter fra Lagring til Drikkes nå automatisk når året kommer

## Filer

- `index.html` — DOM, modaler
- `style.css` — styling, responsiv
- `app.js` — logikk, SVG-tegning, state
