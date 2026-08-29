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

### M2 – Charakter-Grafik-Upgrade  *(in Arbeit)*

Entschieden: Handarbeit in Testpixel-Qualität, Ziel „flüssig modern"
(4–6 Frames pro Aktion, wird paketweise aufgestockt).

**Paket 1 (geliefert): Klaus v2**
- [x] Neues Animationssystem: Frame-Sequenzen, Phasen-Frames für Angriffe,
      geschwindigkeitsbasierte Sprung-Frames, pro Charakter eigene Pixeldichte
- [x] Klaus komplett neu: 42x68 in 1x-Dichte, 20 Farben, Anatomie-Schattierung,
      Bart-Textur, Tattoo, Flaggen-Patch — 20 Frames
- [x] 4-Frame-Laufzyklus, 4-phasige Idle-Atmung, Angriffe mit
      Ausholen/Treffen/Zurückziehen, eigenes Energie-Projektil
- [x] Übergangsweise Standard-Kampf als Klaus-Spiegelmatch (gold vs. crimson)

**Paket 2 (nächstes): Antoine v2**
- [ ] Antoine in derselben Qualitätsstufe (Uniform, Vollbart, Narbe, Stiefel)
- [ ] Granaten-Projektil im neuen Stil, danach Roster zurück auf Klaus vs. Antoine

**Paket 3: Aufstockung**
- [ ] Laufzyklus auf 6 Frames, Idle auf 4 echte Posen
- [ ] Angriffe auf 4-5 Phasen (Impact-Frames, Follow-Through)
- [ ] Treffer-Reaktion ausbauen (2 Stufen), Narbe/Detail-Pass nach Referenz

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
