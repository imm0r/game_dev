// Die Stages von Dojo Duel – prozedural gezeichnete Pixel-Hommagen an die
// Referenzbilder des Projekt-Besitzers:
//   1 TOKYO STREET  – Abendhimmel, roter Funkturm, Bahnviadukt, Neon, Menge
//   2 NEON CROSSING – Cyberpunk-Boulevard, Mech-Statuen, Glassteg über Verkehr
//   3 WIND TEMPLE   – Bergkloster, Gebetsfahnen, Mönche, Gong, Steinplatz
//
// Eigenes Hintergrundbild verwenden? PNG unter assets/stage-1.png (bzw.
// stage-2/stage-3) ablegen – wird automatisch geladen, auf 180px Höhe
// skaliert und mittig beschnitten.
window.DD = window.DD || {};

(function () {
  const W = 320, H = 180;

  function rect(c, x, y, w, h, col) {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  }

  // einfacher Pixel-Berg: Spitze (px,py), Halbbreite hw, Fuss bei baseY
  function mountain(c, px, py, hw, baseY, rock, snow, lit) {
    const hgt = baseY - py;
    for (let i = 0; i < hgt; i++) {
      const w = Math.max(1, Math.round((i / hgt) * hw * 2));
      const x = px - Math.round(w / 2);
      const col = i < hgt * 0.38 ? snow : rock;
      rect(c, x, py + i, w, 1, col);
      if (lit && i >= hgt * 0.38) rect(c, x, py + i, Math.max(1, w >> 2), 1, lit);
    }
  }

  // ======================================================== 1: TOKYO STREET
  function makeTokyo() {
    let farCv, nearCv, crowd;

    function buildFar() {
      farCv = document.createElement('canvas');
      farCv.width = W; farCv.height = H;
      const c = farCv.getContext('2d');

      const sky = ['#1c0f2e', '#33132f', '#54182c', '#7c2526', '#a2381d', '#c04c1a'];
      for (let i = 0; i < sky.length; i++) rect(c, 0, i * 12, W, 12, sky[i]);
      rect(c, 0, 72, W, H - 72, '#c04c1a');

      [18, 26, 39].forEach((y, i) => {
        rect(c, 20 + i * 90, y, 70 - i * 12, 2, '#42152a');
        rect(c, 180 + i * 40, y + 4, 46, 2, '#42152a');
      });

      const bld = [
        [0, 52, 26], [22, 44, 16], [40, 56, 22], [66, 48, 14],
        [84, 58, 26], [112, 42, 18], [132, 54, 24], [158, 46, 14],
        [174, 58, 30], [206, 50, 18], [226, 58, 18], [262, 46, 20],
        [284, 54, 20], [304, 48, 16],
      ];
      for (const [x, y, w] of bld) {
        rect(c, x, y, w, 72 - y, '#231230');
        if (72 - y > 22) rect(c, x + ((x * 7) % w), y - 3, 1, 3, '#231230');
        for (let i = 0; i < Math.floor(w * (72 - y) / 40); i++) {
          const fx = x + 2 + ((x * 13 + i * 29) % (w - 4));
          const fy = y + 2 + ((y * 7 + i * 17) % (72 - y - 4));
          rect(c, fx, fy, 1, 1, (i % 5 === 0) ? '#6fd8f0' : '#f8b848');
        }
      }

      // roter Funkturm
      const tx = 248;
      rect(c, tx, 22, 2, 6, '#e8503a');
      rect(c, tx - 1, 28, 4, 8, '#c83c28');
      rect(c, tx - 2, 36, 6, 8, '#e8503a');
      rect(c, tx - 3, 44, 8, 6, '#c83c28');
      rect(c, tx - 4, 50, 10, 4, '#e8503a');
      rect(c, tx - 5, 54, 3, 14, '#c83c28');
      rect(c, tx + 4, 54, 3, 14, '#c83c28');
      rect(c, tx - 1, 54, 4, 6, '#7c2526');
      rect(c, tx - 2, 40, 6, 1, '#f8d848');
      rect(c, tx - 3, 48, 8, 1, '#f8d848');

      // Bahnviadukt
      rect(c, 0, 74, W, 3, '#5a666e');
      rect(c, 0, 77, W, 16, '#39434a');
      rect(c, 0, 91, W, 3, '#22282c');
      for (let x = 4; x < W; x += 12) rect(c, x, 79, 2, 12, '#2c343a');
      rect(c, 138, 79, 44, 10, '#2e7d46');
      rect(c, 139, 80, 42, 8, '#1e5c32');
      rect(c, 142, 83, 36, 2, '#e8f0e8');

      rect(c, 0, 94, W, 44, '#241b28');
      for (const px of [24, 100, 178, 256]) {
        rect(c, px, 94, 8, 44, '#2e3438');
        rect(c, px + 1, 94, 2, 44, '#3c454c');
      }
      for (const gx of [40, 116, 194, 272]) {
        rect(c, gx, 100, 46, 38, '#33222a');
        rect(c, gx + 6, 106, 34, 32, '#4a2c20');
        rect(c, gx + 14, 112, 18, 26, '#6a3c22');
        rect(c, gx + 20, 118, 7, 20, '#8a5426');
      }
    }

    function buildNear() {
      nearCv = document.createElement('canvas');
      nearCv.width = W; nearCv.height = H;
      const c = nearCv.getContext('2d');

      // Ladenzeile links
      rect(c, 0, 50, 96, 88, '#241a2c');
      rect(c, 0, 50, 96, 3, '#3a3046');
      rect(c, 93, 50, 3, 88, '#160e1c');
      rect(c, 24, 58, 64, 24, '#f8d23e');
      rect(c, 26, 60, 60, 20, '#2a1030');
      rect(c, 30, 63, 52, 5, '#ff6ad0');
      for (let x = 32; x < 80; x += 6) rect(c, x, 64, 3, 3, '#2a1030');
      rect(c, 30, 71, 52, 5, '#59f8e8');
      for (let x = 33; x < 80; x += 7) rect(c, x, 72, 3, 3, '#2a1030');
      rect(c, 6, 56, 14, 56, '#ff40c8');
      rect(c, 8, 58, 10, 52, '#1a0f22');
      for (let i = 0; i < 4; i++) {
        rect(c, 10, 62 + i * 12, 6, 8, '#40e8f8');
        rect(c, 12, 64 + i * 12, 2, 2, '#1a0f22');
        rect(c, 10, 66 + i * 12, 2, 2, '#1a0f22');
      }
      rect(c, 28, 92, 58, 34, '#170f1c');
      rect(c, 30, 94, 54, 30, '#4a2c1c');
      rect(c, 34, 98, 20, 22, '#7a4522');
      rect(c, 58, 98, 22, 22, '#8a5426');
      for (let i = 0; i < 5; i++) {
        rect(c, 32 + i * 12, 88, 4, 5, '#e83828');
        rect(c, 33 + i * 12, 87, 2, 1, '#f8d838');
      }

      // Ladenzeile rechts
      rect(c, 224, 50, 96, 88, '#201826');
      rect(c, 224, 50, 96, 3, '#363048');
      rect(c, 224, 50, 3, 88, '#140d1a');
      rect(c, 232, 62, 56, 22, '#38c8f8');
      rect(c, 234, 64, 52, 18, '#101828');
      rect(c, 238, 68, 44, 4, '#f8d848');
      for (let x = 241; x < 280; x += 6) rect(c, x, 69, 3, 2, '#101828');
      rect(c, 238, 75, 30, 4, '#ff6a5a');
      rect(c, 298, 54, 14, 60, '#a01818');
      rect(c, 300, 56, 10, 56, '#d82818');
      for (let i = 0; i < 5; i++) rect(c, 303, 60 + i * 11, 4, 6, '#f8e8d0');
      rect(c, 232, 92, 58, 34, '#150e1a');
      rect(c, 234, 94, 54, 30, '#3c2c40');
      rect(c, 238, 98, 20, 22, '#6a3c50');
      rect(c, 262, 98, 22, 22, '#7a4522');

      // Gehweg + Strasse
      rect(c, 0, 152, W, 3, '#8a8090');
      rect(c, 0, 155, W, 3, '#565060');
      rect(c, 0, 158, W, 22, '#46424e');
      for (let i = 0; i < 60; i++) {
        const x = (i * 53) % W;
        const y = 160 + ((i * 31) % 18);
        rect(c, x, y, 2, 1, (i % 3 === 0) ? '#3c3844' : '#514c5a');
      }
      for (const x of [46, 130, 214, 292]) rect(c, x, 166, 12, 2, '#3a3642');
      rect(c, 0, 176, W, 4, '#302c38');
    }

    function buildCrowd() {
      crowd = [];
      const cols = ['#7a5a9a', '#5a7a4a', '#9a5a4a', '#4a6a8a', '#8a7a3a',
                    '#6a4a6a', '#4a8a7a', '#9a7a5a'];
      const skins = ['#e8b080', '#c89060', '#f0c090', '#a87850'];
      for (let x = 6; x < W - 8; x += 11) {
        crowd.push({
          x: x + ((x * 7) % 5) - 2,
          body: cols[(x / 11 | 0) % cols.length],
          skin: skins[(x / 11 | 0) % skins.length],
          phase: (x * 13) % 40,
        });
      }
    }

    function drawTrain(c, t) {
      const p = t % 900;
      if (p > 260) return;
      const x = Math.round(-140 + (p / 260) * (W + 280));
      const y = 78;
      rect(c, x, y, 130, 12, '#b9bdc2');
      rect(c, x, y + 8, 130, 3, '#3fae52');
      rect(c, x, y, 130, 2, '#83878c');
      for (let i = 0; i < 6; i++) {
        rect(c, x + 6 + i * 21, y + 3, 12, 4, '#20262c');
        rect(c, x + 19 + i * 21, y, 1, 12, '#83878c');
      }
      rect(c, x - 2, y + 2, 2, 8, '#8a8e92');
      rect(c, x + 130, y + 2, 2, 8, '#8a8e92');
    }

    function drawCrowd(c, t) {
      for (const p of crowd) {
        const up = ((t + p.phase) % 40) < 20;
        const y = up ? 137 : 138;
        rect(c, p.x + 1, y, 3, 3, p.skin);
        rect(c, p.x, y + 3, 5, 6, p.body);
        if (up) {
          rect(c, p.x - 1, y + 1, 1, 3, p.skin);
          rect(c, p.x + 5, y + 1, 1, 3, p.skin);
        } else {
          rect(c, p.x - 1, y + 4, 1, 3, p.body);
          rect(c, p.x + 5, y + 4, 1, 3, p.body);
        }
      }
    }

    return {
      name: 'TOKYO STREET',
      init() { buildFar(); buildNear(); buildCrowd(); },
      draw(c, t) {
        c.drawImage(farCv, 0, 0);
        drawTrain(c, t);
        c.drawImage(nearCv, 0, 0);
        drawCrowd(c, t);
        // Absperrgitter VOR der Menge (sie steht dahinter)
        rect(c, 0, 146, W, 1, '#8a8494');
        rect(c, 0, 149, W, 1, '#6a6474');
        for (let x = 4; x < W; x += 14) rect(c, x, 146, 2, 6, '#7a7484');
        const on = (t % 90) < 60;
        c.globalAlpha = 0.22;
        if (on) rect(c, 6, 56, 14, 56, '#ff40c8');
        else rect(c, 232, 62, 56, 22, '#38c8f8');
        c.globalAlpha = 1;
        if ((t % 120) < 60) rect(c, 248, 21, 2, 2, '#ff4030');
      },
    };
  }

  // ======================================================= 2: NEON CROSSING
  function makeNeon() {
    let cv;

    function build() {
      cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const c = cv.getContext('2d');

      // kühler Abendhimmel
      const sky = ['#20203e', '#28284c', '#32325c', '#3e3e6c', '#4a4a7a'];
      for (let i = 0; i < sky.length; i++) rect(c, 0, i * 12, W, 12, sky[i]);
      rect(c, 0, 60, W, H - 60, '#55558a');

      // verschneite Bergketten
      mountain(c, 40, 18, 34, 64, '#5a6690', '#e8ecf6');
      mountain(c, 118, 10, 40, 64, '#5a6690', '#e8ecf6');
      mountain(c, 200, 16, 34, 64, '#5a6690', '#e8ecf6');
      mountain(c, 276, 8, 44, 64, '#5a6690', '#e8ecf6');
      mountain(c, 76, 30, 30, 66, '#454e74', '#c8d0e4');
      mountain(c, 158, 26, 34, 66, '#454e74', '#c8d0e4');
      mountain(c, 244, 30, 30, 66, '#454e74', '#c8d0e4');

      // Stadt-Silhouette mit Neon-Fenstern
      const tw = [
        [0, 44, 30], [34, 30, 22], [60, 50, 18], [82, 38, 20],
        [206, 36, 22], [232, 48, 18], [254, 30, 24], [282, 42, 38],
      ];
      for (const [x, y, w] of tw) {
        rect(c, x, y, w, 130 - y, '#191c34');
        rect(c, x, y, w, 2, '#2a2e54');
        for (let i = 0; i < Math.floor(w * (130 - y) / 26); i++) {
          const fx = x + 2 + ((x * 11 + i * 23) % (w - 3));
          const fy = y + 3 + ((y * 5 + i * 13) % (130 - y - 6));
          const col = (i % 3 === 0) ? '#f84ad8' : (i % 3 === 1) ? '#3ae8f8' : '#8a6af8';
          rect(c, fx, fy, 1, 2, col);
        }
      }

      // Werbetafel-Turm in der Mitte
      rect(c, 148, 26, 30, 104, '#20243c');
      rect(c, 146, 28, 34, 26, '#f84ad8');
      rect(c, 148, 30, 30, 22, '#160b28');
      rect(c, 156, 33, 14, 16, '#3ae8f8');       // grosses Leucht-"Zeichen"
      rect(c, 160, 37, 6, 3, '#160b28');
      rect(c, 158, 42, 4, 3, '#160b28');
      rect(c, 146, 58, 34, 16, '#f8a03e');
      rect(c, 148, 60, 30, 12, '#28122c');
      rect(c, 151, 63, 24, 3, '#f8d848');
      rect(c, 151, 68, 16, 2, '#ff6a5a');
      rect(c, 146, 78, 34, 16, '#3a6af8');
      rect(c, 148, 80, 30, 12, '#101a34');
      rect(c, 151, 83, 24, 3, '#6ae8f8');
      rect(c, 151, 88, 20, 2, '#f84ad8');

      // leuchtende Kugel auf Sockel (Arcade-Globus)
      rect(c, 92, 88, 16, 4, '#2a3450');
      rect(c, 95, 74, 10, 14, '#1a4a58');
      rect(c, 96, 72, 8, 14, '#2a8aa8');
      rect(c, 97, 73, 6, 10, '#3ae8f8');
      rect(c, 98, 74, 4, 5, '#c8f8ff');

      // Mech-Statuen auf Podesten
      for (const [mx, eye] of [[212, '#f84a4a'], [240, '#3ae8f8']]) {
        rect(c, mx - 3, 124, 16, 8, '#343c58');           // Podest
        rect(c, mx, 100, 10, 6, '#2a3244');               // Kopf
        rect(c, mx + 2, 102, 5, 2, eye);                  // Visier
        rect(c, mx - 3, 106, 16, 10, '#323a50');          // Schultern/Torso
        rect(c, mx - 3, 106, 4, 6, '#3e4862');
        rect(c, mx + 9, 106, 4, 6, '#3e4862');
        rect(c, mx, 116, 4, 8, '#2a3244');                // Beine
        rect(c, mx + 6, 116, 4, 8, '#2a3244');
      }

      // Schrägseilbrücke rechts
      rect(c, 296, 34, 4, 96, '#4a5570');
      rect(c, 297, 34, 1, 96, '#6a7694');
      for (let i = 0; i < 6; i++) {
        const x0 = 298, y0 = 38 + i * 4;
        const x1 = 262 + i * 10, y1 = 118;
        const steps = 14;
        for (let s = 0; s < steps; s++) {
          rect(c, Math.round(x0 + (x1 - x0) * s / steps),
                  Math.round(y0 + (y1 - y0) * s / steps), 1, 1, '#8a96b4');
        }
      }
      rect(c, 258, 118, 62, 4, '#3a4258');

      // Monorail-Trasse
      rect(c, 0, 108, 258, 2, '#5a6580');
      for (let x = 10; x < 250; x += 36) rect(c, x, 110, 3, 20, '#2e3650');

      // Zuschauer-Nischen am Rand (hinter Geländern)
      for (const [px, vis] of [[8, '#3ae8f8'], [24, '#f84ad8'], [286, '#f8d848'], [302, '#3ae8f8']]) {
        rect(c, px + 1, 138, 3, 3, '#c8a080');
        rect(c, px, 141, 5, 8, '#232c40');
        rect(c, px + 1, 139, 3, 1, vis);                  // Visier/Brille
      }
      rect(c, 0, 148, 44, 2, '#4a5570');
      rect(c, 276, 148, 44, 2, '#4a5570');
      for (let x = 2; x < 44; x += 10) rect(c, x, 148, 2, 6, '#3a4258');
      for (let x = 278; x < 318; x += 10) rect(c, x, 148, 2, 6, '#3a4258');

      // Glassteg (Kampffläche)
      rect(c, 0, 152, W, 2, '#9ab8c8');
      rect(c, 0, 154, W, 4, '#2a4a56');
      rect(c, 0, 158, W, 22, '#16323c');
    }

    function drawTraffic(c, t) {
      // Verkehr UNTER dem Glasboden (gedimmte Lichtstreifen)
      c.globalAlpha = 0.5;
      for (let i = 0; i < 7; i++) {
        const lane = i % 2;
        const speed = lane === 0 ? 2.2 : -1.8;
        const y = lane === 0 ? 163 + (i % 3) * 2 : 170 + (i % 3) * 2;
        let x = ((i * 97) + t * speed) % (W + 60);
        if (x < 0) x += W + 60;
        x -= 30;
        rect(c, x, y, 10, 2, lane === 0 ? '#d8e8f0' : '#f85a4a');
      }
      c.globalAlpha = 1;
      // Panel-Fugen des Glasbodens
      for (let x = 0; x < W; x += 32) rect(c, x, 158, 1, 22, '#2a5a6a');
      rect(c, 0, 158, W, 1, '#3a6a7a');
    }

    function drawMonorail(c, t) {
      const p = t % 700;
      if (p > 200) return;
      const x = Math.round(W - (p / 200) * (W + 130));
      rect(c, x, 100, 64, 8, '#d8e0ea');
      rect(c, x, 105, 64, 2, '#3ae8f8');
      for (let i = 0; i < 5; i++) rect(c, x + 5 + i * 12, 102, 7, 3, '#1c2438');
    }

    function drawDrone(c, t) {
      const p = t % 1100;
      if (p > 500) return;
      const x = Math.round(-10 + (p / 500) * (W + 20));
      const y = 22 + Math.round(Math.sin(p / 30) * 3);
      rect(c, x, y, 4, 2, '#1c2438');
      if ((t % 30) < 15) rect(c, x + 1, y - 1, 1, 1, '#f84a4a');
    }

    return {
      name: 'NEON CROSSING',
      init() { build(); },
      draw(c, t) {
        c.drawImage(cv, 0, 0);
        drawMonorail(c, t);
        drawDrone(c, t);
        drawTraffic(c, t);
        // pulsierende Werbetafeln + Mech-Augen blinken
        const on = (t % 80) < 50;
        c.globalAlpha = 0.25;
        if (on) rect(c, 146, 28, 34, 26, '#f84ad8');
        else rect(c, 146, 78, 34, 16, '#3a6af8');
        c.globalAlpha = 1;
        if ((t % 140) < 20) rect(c, 214, 102, 5, 2, '#ff8a8a');
      },
    };
  }

  // ========================================================= 3: WIND TEMPLE
  function makeTemple() {
    let cv, monks;

    function build() {
      cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const c = cv.getContext('2d');

      // Sonnenuntergang über den Bergen
      const sky = ['#38304a', '#584052', '#8a4e44', '#c47440', '#eda254'];
      for (let i = 0; i < sky.length; i++) rect(c, 0, i * 12, W, 12, sky[i]);
      rect(c, 0, 60, W, H - 60, '#eda254');
      [8, 16, 24].forEach((y, i) => {
        rect(c, 30 + i * 70, y, 60, 2, '#2e2838');
        rect(c, 190 + i * 30, y + 3, 44, 2, '#2e2838');
      });

      // Schneeberge, von der Abendsonne angestrahlt
      mountain(c, 50, 14, 40, 68, '#6a5a68', '#eef2f8', '#e8b87a');
      mountain(c, 140, 6, 46, 68, '#6a5a68', '#f4f6fa', '#e8b87a');
      mountain(c, 226, 12, 42, 68, '#6a5a68', '#eef2f8', '#e8b87a');
      mountain(c, 296, 20, 36, 68, '#6a5a68', '#e8ecf4', '#e8b87a');
      mountain(c, 96, 34, 30, 70, '#544a58', '#d8dce8');
      mountain(c, 262, 36, 28, 70, '#544a58', '#d8dce8');

      // Reisterrassen + Fluss links
      for (let i = 0; i < 8; i++) {
        rect(c, 0, 70 + i * 9, 96 - i * 9, 9, i % 2 ? '#5a7a3a' : '#4c6a30');
        rect(c, 96 - i * 9 - 2, 70 + i * 9, 2, 9, '#3a5424');
      }
      for (let i = 0; i < 24; i++) {
        rect(c, 62 + Math.round(Math.sin(i / 3) * 6), 76 + i * 3, 3, 3, '#58a8c8');
      }

      // Tempel in der Mitte
      rect(c, 118, 122, 84, 18, '#8a7a6a');              // Steinbasis
      rect(c, 118, 122, 84, 2, '#a89884');
      for (let i = 0; i < 3; i++) rect(c, 130 - i * 4, 134 + i * 2, 60 + i * 8, 2, '#9a8a74'); // Stufen
      rect(c, 128, 96, 64, 26, '#6a3a34');               // Halle
      rect(c, 128, 96, 64, 2, '#d8a848');
      for (const px of [132, 150, 166, 184]) rect(c, px, 98, 4, 24, '#4a2824');
      rect(c, 152, 104, 16, 18, '#2a1814');              // Tor
      rect(c, 154, 108, 12, 14, '#8a5426');              // warmes Licht
      // gestufte Dächer
      rect(c, 122, 88, 76, 8, '#7a2e28');
      rect(c, 120, 88, 80, 2, '#d8a848');
      rect(c, 134, 78, 52, 8, '#7a2e28');
      rect(c, 132, 78, 56, 2, '#d8a848');
      rect(c, 146, 68, 28, 8, '#7a2e28');
      rect(c, 144, 68, 32, 2, '#d8a848');
      rect(c, 158, 62, 4, 6, '#d8a848');                 // goldene Spitze
      rect(c, 159, 58, 2, 4, '#f8d848');

      // Stupas rechts
      rect(c, 222, 112, 18, 16, '#e8e0d0');
      rect(c, 226, 104, 10, 8, '#d8ccb8');
      rect(c, 229, 96, 4, 8, '#d8a848');
      rect(c, 230, 92, 2, 4, '#f8d848');
      rect(c, 252, 120, 12, 10, '#e8e0d0');
      rect(c, 255, 114, 6, 6, '#d8ccb8');
      rect(c, 257, 110, 2, 4, '#d8a848');

      // Gong rechts
      rect(c, 278, 108, 3, 30, '#4a3228');
      rect(c, 299, 108, 3, 30, '#4a3228');
      rect(c, 276, 104, 28, 4, '#4a3228');
      rect(c, 283, 110, 14, 14, '#d8a848');
      rect(c, 286, 113, 8, 8, '#a87828');
      rect(c, 288, 115, 4, 4, '#d8a848');

      // Boden hinter dem Platz
      rect(c, 0, 138, W, 14, '#6a5a48');
      rect(c, 96, 138, 224, 3, '#7a6a54');

      // Steinplatz (Kampffläche)
      rect(c, 0, 152, W, 2, '#b8a888');
      rect(c, 0, 154, W, 4, '#8a7a64');
      rect(c, 0, 158, W, 22, '#9a8a74');
      for (let x = 12; x < W; x += 24) rect(c, x, 158, 1, 22, '#7a6a58');
      rect(c, 0, 165, W, 1, '#7a6a58');
      rect(c, 0, 172, W, 1, '#7a6a58');
      for (let i = 0; i < 40; i++) {
        rect(c, (i * 67) % W, 159 + ((i * 41) % 20), 2, 1, '#a89884');
      }
      rect(c, 0, 176, W, 4, '#6a5a48');
    }

    function buildMonks() {
      monks = [];
      for (const x of [16, 40, 68, 210, 246, 306]) {
        monks.push({ x, robe: (x % 2) ? '#d87828' : '#b85a20', phase: (x * 7) % 120 });
      }
    }

    function drawFlags(c, t) {
      // Gebetsfahnen-Ketten, im Wind flatternd
      const cols = ['#4878d8', '#e8e8e8', '#d84838', '#48a858', '#e8c838'];
      const lines = [
        { x0: 160, y0: 64, x1: 12, y1: 92 },
        { x0: 160, y0: 64, x1: 308, y1: 88 },
      ];
      for (const L of lines) {
        const steps = 22;
        for (let s = 0; s <= steps; s++) {
          const x = Math.round(L.x0 + (L.x1 - L.x0) * s / steps);
          const sag = Math.round(Math.sin((s / steps) * Math.PI) * 8);
          const y = Math.round(L.y0 + (L.y1 - L.y0) * s / steps) + sag;
          rect(c, x, y, 1, 1, '#3a3230');
          if (s % 3 === 1) {
            const flutter = ((t / 8 + s) | 0) % 2;
            rect(c, x, y + 1, 3, 3 - flutter, cols[s % cols.length]);
          }
        }
      }
    }

    function drawMonks(c, t) {
      for (const m of monks) {
        const sway = ((t + m.phase) % 240) < 120 ? 0 : 1;
        rect(c, m.x + 1, 139 + sway, 4, 3, '#c89060');   // Kopf (rasiert)
        rect(c, m.x, 142 + sway, 6, 8, m.robe);          // Robe (sitzend)
        rect(c, m.x + 1, 148 + sway, 4, 2, '#8a4818');
      }
    }

    function drawSmoke(c, t) {
      // Räucherwerk neben dem Tor
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.4 + i * 22) % 88;
        const x = 206 + Math.round(Math.sin((p + i * 9) / 7) * 2);
        c.globalAlpha = Math.max(0, 0.5 - p / 100);
        rect(c, x, 128 - p / 2, 2, 2, '#d8d0c8');
      }
      c.globalAlpha = 1;
    }

    return {
      name: 'WIND TEMPLE',
      init() { build(); buildMonks(); },
      draw(c, t) {
        c.drawImage(cv, 0, 0);
        drawFlags(c, t);
        drawMonks(c, t);
        drawSmoke(c, t);
      },
    };
  }

  // ================================================================ Verwaltung

  const stages = [makeTokyo(), makeNeon(), makeTemple()];
  const bgImgs = stages.map(() => ({ img: null, ok: false }));

  function init() {
    stages.forEach((s, i) => {
      s.init();
      const slot = bgImgs[i];
      slot.img = new Image();
      slot.img.onload = () => { slot.ok = true; };
      slot.img.onerror = () => { slot.ok = false; };
      slot.img.src = `assets/stage-${i + 1}.png`;
    });
  }

  function draw(ctx, index, t) {
    const slot = bgImgs[index];
    if (slot.ok) {
      const s = H / slot.img.height;
      const w = Math.round(slot.img.width * s);
      ctx.drawImage(slot.img, Math.round((W - w) / 2), 0, w, H);
      return;
    }
    stages[index].draw(ctx, t);
  }

  DD.stage = {
    init,
    draw,
    count: stages.length,
    name: (i) => stages[i].name,
  };
})();
