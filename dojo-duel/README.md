# DOJO DUEL

Ein Retro-Pixel-Fighting-Game im Geist der frühen 90er — komplett in
Vanilla-JavaScript, ohne Engine, ohne Build-Schritt, ohne externe Assets.
Einfach `index.html` im Browser öffnen und kämpfen.

![Titelbildschirm](docs/screenshots/doc-title.png)

## Spielen

**Am einfachsten:** Doppelklick auf `index.html` — läuft direkt im Browser.

Alternativ mit lokalem Server (empfohlen, falls du eigene Stage-Bilder in
`assets/` nutzen willst und der Browser lokale Dateien blockiert):

```bash
cd dojo-duel
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

## Steuerung

| Aktion        | Spieler 1 | Spieler 2 |
| ------------- | --------- | --------- |
| Bewegen       | A / D     | ← / →     |
| Springen      | W         | ↑         |
| Ducken        | S         | ↓         |
| Schlag        | F         | K         |
| Tritt         | G         | L         |
| Feuerball     | H         | J         |
| **Blocken**   | *rückwärts halten, während der Gegner angreift* | ebenso |

Sprung + Tritt = fliegender Tritt. Chip-Schaden beim Blocken ist dabei,
kann aber (anders als beim grossen Vorbild) kein K.O. erzielen.

**Menü / Allgemein:** Enter = Start/Bestätigen · ↑↓ = Modus wählen ·
←→ = Stage wählen · P = Pause · M = Ton an/aus

## Was schon drin ist

- **2 Kämpfer:** HANZO (weisser Gi) und KAITO (roter Gi) — klassischer
  Palette-Swap wie anno 1991
- **1-Spieler-Modus gegen CPU** (die KI hält Distanz, blockt, weicht
  Feuerbällen aus — und ist absichtlich nicht perfekt) sowie **lokaler
  2-Spieler-Modus** an einer Tastatur
- **3 Stages** nach den Referenzbildern des Projekt-Besitzers, alle mit
  animierten Details:

  | Stage | Hommage | Animationen |
  | ----- | ------- | ----------- |
  | TOKYO STREET | Abendliche Einkaufsstrasse | fahrender Zug, jubelnde Menge, Neon-Flackern, Turm-Blinklicht |
  | NEON CROSSING | Cyberpunk-Boulevard | Verkehr unter dem Glasboden, Monorail, Drohne, pulsierende Werbetafeln, Mech-Augen |
  | WIND TEMPLE | Bergkloster | flatternde Gebetsfahnen, Räucherwerk, wippende Mönche |

- Lebensbalken mit rotem Schadens-Nachlauf, 99-Sekunden-Timer,
  Best-of-3-Runden, K.O.- und Time-Over-Logik, Siegerpose
- Trefferfunken, Hitstop (kurzes Einfrieren beim Treffer), Screenshake
  beim K.O. — die kleinen Dinge, die sich "arcade" anfühlen
- Synthetisierte Chiptune-Soundeffekte (WebAudio, keine Audiodateien)
- Eigener 3x5-Pixel-Font, CRT-Scanline-Effekt (in `style.css` abschaltbar)

![Tokyo Street](docs/screenshots/doc-stage1.png)
![Neon Crossing](docs/screenshots/doc-stage2.png)
![Wind Temple](docs/screenshots/doc-stage3.png)

## Eigene Stage-Hintergründe

Die drei Stages sind prozedural im Code gezeichnet. Du kannst sie jederzeit
durch eigene Pixel-Art ersetzen: Lege einfach `assets/stage-1.png`,
`assets/stage-2.png` oder `assets/stage-3.png` ab. Das Bild wird auf 180px
Höhe skaliert und mittig beschnitten — bei sehr breiten Panoramen also am
besten vorher einen Ausschnitt im Verhältnis 16:9 wählen. Die Kampffläche
(Fusslinie) liegt bei y = 158 von 180.

## Projektstruktur

| Datei | Aufgabe |
| ----- | ------- |
| `js/constants.js` | Alle Stellschrauben: Physik, Frame-Daten der Angriffe, Schaden |
| `js/sprites.js` | **Die Pixel-Art.** Jeder Frame ist ein Text-Grid, jedes Zeichen ein Pixel |
| `js/font.js` | 3x5-Pixel-Font |
| `js/stage.js` | Die drei prozeduralen Stages |
| `js/fighter.js` | Zustandsmaschine der Kämpfer, Hitboxen, Treffer-Logik |
| `js/ai.js` | CPU-Gegner |
| `js/game.js` | Rundenablauf, Kollisionen, Projektile, Partikel |
| `js/input.js` | Tastatur (physische Tasten, QWERTZ-sicher) |
| `js/audio.js` | Synthetisierte Soundeffekte |
| `js/ui.js` | HUD, Titelbildschirm, Ansagen |
| `js/main.js` | 60fps-Loop mit fester Schrittweite |

### Sprites bearbeiten — so einfach ist das

In `js/sprites.js` sieht ein Frame so aus (Ausschnitt):

```text
'............KHHHK...........',   ← Haare
'...........KHHHHHK..........',
'..........RRKRRRRK..........',   ← Stirnband
'...........KSSSKSSK.........',   ← Gesicht mit Auge
```

`K` = Umriss, `S` = Haut, `H` = Haar, `R` = Akzent, `G` = Anzug, `D` =
Anzug-Schatten, `B` = Gürtel. Zeichen ändern, Seite neu laden, fertig.
Spieler 2 bekommt seine Farben automatisch über die Palette in derselben
Datei.

### Balancing

Alle Angriffe stehen als Frame-Daten in `js/constants.js`:

```js
punch: { startup: 5, active: 4, recovery: 10, dmg: 6, ... }
```

`startup` = Frames Anlauf, `active` = Frames Trefferfenster, `recovery` =
Frames Erholung (bei 60 Frames pro Sekunde). Wer hier dreht, balanciert
das Spiel.

## Single-File-Build

```bash
node tools/build-single.mjs
```

erzeugt `dist/dojo-duel.html` — das komplette Spiel in einer einzigen
Datei, praktisch zum Verschicken oder Hochladen (z.B. itch.io).

## Tests

Ein automatisierter Rauchtest (Playwright) startet das Spiel headless,
simuliert Tastatur-Eingaben und prüft Treffer, Feuerball, Sprung, K.O. und
Rundenwechsel: siehe `tools/smoke-test.js`.

```bash
npm install playwright   # einmalig, irgendwo ausserhalb des Repos ok
node tools/smoke-test.js
```

## Roadmap-Ideen

- [ ] Spezial-Eingaben wie ↓↘→ + Schlag statt eigener Taste
- [ ] Kombos & Cancels (Frame-Daten sind schon da)
- [ ] Zweiter Charakter mit eigenem Move-Set (neue Grids in `sprites.js`)
- [ ] Scrollende, breitere Stages mit Kamera
- [ ] Gamepad-Unterstützung (Gamepad API)
- [ ] Chiptune-Musik (WebAudio-Sequencer)
- [ ] Online-Duell via WebRTC (ambitioniert — Rollback-Netcode ist ein eigenes Abenteuer)

## Rechtliches

Inspiriert von den Arcade-Klassikern der 90er, aber alle Namen, Sprites,
Stages und Sounds sind Eigenkreationen dieses Projekts. Kein fremdes
Material enthalten.
