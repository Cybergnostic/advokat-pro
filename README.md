# Advokat Pro — modularna offline verzija

Pokretanje:

```bash
cd ~/projects/advokat_pro
python3 -m http.server 8080
```

Otvorite `http://localhost:8080`.

Struktura:
- `index.html` — HTML prikaz
- `css/` — stilovi
- `js/` — logika podeljena po funkcionalnim celinama
- `manifest.webmanifest` — PWA podešavanja
- `sw.js` — offline keš i notifikacije

Podaci se i dalje čuvaju u istom `localStorage` ključu `ap12`, pa postojeći lokalni podaci ostaju sačuvani na istom origin-u.


## Added functionality
- Assessable and non-assessable civil matters with the existing 2025 tariff categories from the prototype.
- Prosecution cases can distinguish suspect, accused and injured party.
- Submissions can include PDF, Word or image attachments stored offline in IndexedDB.
- Each case has a chronological numbered submissions register.

Important: tariff values are carried over from the original prototype and should be independently checked by a practising lawyer before production use.

## Responsive layout (v4)

- Mobile-first layout retained.
- Small phones use a compact header and 2x2 statistics grid.
- Tablets show two-column record grids and centred modal dialogs.
- Desktop displays up to three or four cards per row depending on the section.
- Calendar cells expand on larger screens.
- Touch targets remain large on phones and tablets.
