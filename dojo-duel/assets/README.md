# assets/ – eigene Stage-Panoramen

Lege hier deine Original-Panoramen ab, dann benutzt das Spiel sie
automatisch als scrollende Stage-Hintergründe:

| Datei | ersetzt |
| ----- | ------- |
| `stage-1.png` | Tokyo Street |
| `stage-2.png` | Neon Crossing |
| `stage-3.png` | Wind Temple |

**So geht's über die GitHub-Website:** Repository öffnen → oben den Branch
wählen → in den Ordner `dojo-duel/assets/` gehen → „Add file" → „Upload
files" → PNGs hineinziehen (mit exakt den Dateinamen oben) → Commit.

**Technik:** Das Bild wird beim Laden einmalig sauber (mit Glättung) auf
180px Höhe vorgerechnet. Die Weltbreite ergibt sich aus der Bildbreite,
gedeckelt bei 832px (≈ 2,6 Bildschirmbreiten); breitere Panoramen werden
mittig beschnitten. Die Kampf-Fusslinie liegt bei y = 158 von 180 — ideal
sind Panoramen, bei denen der Boden im unteren Bilddrittel liegt. Ein
Neuladen der Seite genügt, kein Build nötig. Für den Single-File-Build
bettet `node tools/build-single.mjs --embed` die Panoramen mit ein.
