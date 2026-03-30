# Castle of the Winds Mobile

A browser-playable, dependency-light homage to the classic Windows roguelike, rebuilt for phone travel play.

## Run

Open [index.html](./index.html) directly in a browser, or serve the folder with any static file server.
Direct `file://` launch uses the bundled fallback script for Chrome compatibility.
For offline installation on a phone, serve once over HTTP/HTTPS so the service worker and manifest can install.

Examples:

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy To GitHub Pages

This project is set up to deploy through GitHub Actions to GitHub Pages.

1. Push this repository to GitHub on the `main` branch.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push a commit to `main` or run the workflow manually from the `Actions` tab.

The workflow builds a clean `dist/` folder and deploys only the files the game needs.
If your repository name stays `castleofthewins`, the Pages URL will be:

`https://perfectz.github.io/castleofthewins/`

## Controls

- `Arrow keys`, `numpad`, or `QWE/ASD/ZXC`: move in 8 directions
- `.` or `Space`: wait
- `G`: pick up items
- `I`: inventory
- `S`: spells
- `R`: rest briefly
- `U` or `V`: use a fountain or throne
- `F`: search for hidden traps and doors
- `<` and `>`: use stairs

Controller:

- Left stick or D-pad: move or aim
- South button: confirm
- East button: cancel
- Shoulder buttons: pack and spells
- Start/Select: settings or map focus

## Features

- Phone-first full-screen layout with persistent action buttons and touch pad
- Character creation with race/class selection
- PWA manifest and service worker for installable offline play
- Town hub with shops, sage, temple, junk dealer, and bank
- Procedural multi-floor dungeon
- Fog of war and line of sight
- Targeted spells and wands, ranged monsters, simple projectile effects, and controller support
- Unidentified, cursed, enchanted, and charged items
- Fountains, thrones, traps, hidden doors, set-piece rooms, overcasting, and a spell quick bar
- Inventory, equipment, spells, treasure, and save/load via browser storage
- Quest objective: retrieve the Runestone of the Winds and return to town
