# Dojo Duel – Roadmap

Dieses Projekt wächst über Wochen in Meilensteinen. Der Projekt-Besitzer ist
Creative Director (Referenzen, Feedback, Prioritäten), Claude setzt um.
Jeder Meilenstein endet mit einem spielbaren Stand.

## Getroffene Entscheidungen

- **Stages:** Die generierten Panorama-Referenzen werden direkt als
  scrollende Hintergründe verwendet (`assets/stage-N.png`); die
  prozeduralen Code-Stages bleiben als Fallback und für Zusatz-Ebenen.
- **Charakter-Art:** Hybrid-Workflow. Referenz-Sheets liefert der
  Projekt-Besitzer, Claude setzt sie als editierbare Text-Grid-Sprites um
  und animiert sie. Später werden die Sprites vergrössert und verfeinert.
- **Roster bisher:** KLAUS VÖLKER (MMA, Deutschland — Heterochromie: von
  rechts blau, von links braun) und ANTOINE MOREAU (Judo/GIGN, Frankreich —
  wirft Granaten). Der Karate-Prototyp HANZO bleibt als Bonus-Set im Code.

## Meilensteine

### M1 – Kamera & echte Stages  *(in Arbeit)*
- [x] Kamera-System: scrollende 640px-Arenen, sanfte Verfolgung, Titel-Schwenk
- [x] Alle drei Code-Stages auf Parallax-Ebenen umgebaut (fern/mitte/nah/vorn)
- [x] Vordergrund-Silhouetten (Strommasten, Holo-Banner, Gebetsfahnen)
- [x] Panorama-Pipeline: `assets/stage-N.png` wird automatisch scrollende Welt
- [ ] **Offen: Original-Panoramen als PNG in `assets/` hochladen** (siehe assets/README.md)
- [ ] Feintuning nach Spieltest

### M2 – Charakter-Grafik-Upgrade
- [x] Erste Fassungen von Klaus & Antoine nach Referenz (28x36-Grids)
- [ ] Sprites auf ~48x72 vergrössern, mehr Farben, Licht-/Schattenkanten
- [ ] Mehr Animationsphasen: Atmung, Antizipation, Follow-Through
- [ ] Details aus den Referenzen: Tattoos, Narbe, Frisuren-Feinschliff

### M3 – Effekte & Gamefeel („Grafik-Gewitter")
- [ ] Superblitz, Zeitlupen-K.O., Bewegungs-Trails, Landestaub
- [ ] Animierte Trefferfunken-Sprites statt Partikel-Quadrate
- [ ] Stage-Reaktionen (Menge jubelt beim K.O.), Sieges-Splash mit Portrait

### M4 – Kampftiefe
- [ ] Spezial-Eingaben (z.B. Viertelkreis + Schlag)
- [ ] Antoines Judo-Wurf als Grab-Mechanik, Granaten-Wurfbahn (Bogen)
- [ ] 2–3 Specials pro Charakter, Combos, Super-Leiste

### M5 – Dritter Charakter
- [ ] Nach nächster Referenz des Projekt-Besitzers

### M6 – Sound & Musik
- [ ] Chiptune-Tracks pro Stage (WebAudio-Sequencer), mehr SFX-Varianten

### M7 – Release-Polish
- [ ] Charakterauswahl-Bildschirm, Arcade-Modus (Gegner-Reihe)
- [ ] Gamepad-Unterstützung, itch.io-Build
