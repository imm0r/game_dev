// The stages of Dojo Duel – procedurally drawn pixel homages to the
// project owner's reference images, running as scrolling arenas with
// parallax layers since milestone 1:
//   far   (factor 0.35) sky, mountains, skyline
//   mid   (factor 0.65) viaduct, temple, city
//   near  (factor 1.0)  shops, crowd, fighting ground
//   front (factor 1.15) silhouettes IN FRONT of the fighters – sells depth
//
// Want your own panorama? Drop a PNG at assets/stage-1.png (or stage-2/
// stage-3) – it gets scaled to 180px height and used as a scrolling arena
// (world width = image width, capped at 832px; see assets/README.md).
window.DD = window.DD || {};

(function () {
  const W = 320, H = 180;       // Viewport
  const WORLD = 640;            // world width of the procedural stages
  const F_FAR = 0.35, F_MID = 0.65, F_FG = 1.15;
  const FAR_W = W + Math.ceil((WORLD - W) * F_FAR);   // 432
  const MID_W = W + Math.ceil((WORLD - W) * F_MID);   // 528
  const FG_W = W + Math.ceil((WORLD - W) * F_FG);     // 688

  function rect(c, x, y, w, h, col) {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  }

  function layer(w) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = H;
    return cv;
  }

  // simple pixel mountain: peak (px,py), half width hw, base at baseY
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
    let farCv, midCv, nearCv, crowd;

    function buildFar() {
      farCv = layer(FAR_W);
      const c = farCv.getContext('2d');

      const sky = ['#1c0f2e', '#33132f', '#54182c', '#7c2526', '#a2381d', '#c04c1a'];
      for (let i = 0; i < sky.length; i++) rect(c, 0, i * 12, FAR_W, 12, sky[i]);
      rect(c, 0, 72, FAR_W, H - 72, '#c04c1a');

      [18, 26, 39].forEach((y, i) => {
        rect(c, 20 + i * 120, y, 70 - i * 12, 2, '#42152a');
        rect(c, 230 + i * 60, y + 4, 46, 2, '#42152a');
      });

      // distant skyline across the whole layer width
      const bld = [
        [0, 52, 26], [22, 44, 16], [40, 56, 22], [66, 48, 14],
        [84, 58, 26], [112, 42, 18], [132, 54, 24], [158, 46, 14],
        [174, 58, 30], [206, 50, 18], [226, 58, 18], [262, 46, 20],
        [284, 54, 20], [320, 50, 24], [346, 44, 18], [366, 56, 26],
        [394, 46, 20], [414, 56, 18],
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

      // red radio tower
      const tx = 306;
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
    }

    function buildMid() {
      midCv = layer(MID_W);
      const c = midCv.getContext('2d');

      // rail viaduct across the full mid layer
      rect(c, 0, 74, MID_W, 3, '#5a666e');
      rect(c, 0, 77, MID_W, 16, '#39434a');
      rect(c, 0, 91, MID_W, 3, '#22282c');
      for (let x = 4; x < MID_W; x += 12) rect(c, x, 79, 2, 12, '#2c343a');
      rect(c, 210, 79, 44, 10, '#2e7d46');
      rect(c, 211, 80, 42, 8, '#1e5c32');
      rect(c, 214, 83, 36, 2, '#e8f0e8');

      rect(c, 0, 94, MID_W, 44, '#241b28');
      for (const px of [24, 100, 178, 256, 334, 412, 490]) {
        rect(c, px, 94, 8, 44, '#2e3438');
        rect(c, px + 1, 94, 2, 44, '#3c454c');
      }
      for (const gx of [40, 116, 194, 272, 350, 428]) {
        rect(c, gx, 100, 46, 38, '#33222a');
        rect(c, gx + 6, 106, 34, 32, '#4a2c20');
        rect(c, gx + 14, 112, 18, 26, '#6a3c22');
        rect(c, gx + 20, 118, 7, 20, '#8a5426');
      }
    }

    // shop module A: marquee + vertical neon + warm window (96px wide)
    function shopMarquee(c, x, v) {
      const neon = v ? '#40e8f8' : '#ff40c8';
      const glyph = v ? '#ff6ad0' : '#40e8f8';
      rect(c, x, 50, 96, 88, '#241a2c');
      rect(c, x, 50, 96, 3, '#3a3046');
      rect(c, x + 93, 50, 3, 88, '#160e1c');
      rect(c, x + 24, 58, 64, 24, v ? '#f8a03e' : '#f8d23e');
      rect(c, x + 26, 60, 60, 20, '#2a1030');
      rect(c, x + 30, 63, 52, 5, glyph);
      for (let i = x + 32; i < x + 80; i += 6) rect(c, i, 64, 3, 3, '#2a1030');
      rect(c, x + 30, 71, 52, 5, '#59f8e8');
      for (let i = x + 33; i < x + 80; i += 7) rect(c, i, 72, 3, 3, '#2a1030');
      rect(c, x + 6, 56, 14, 56, neon);
      rect(c, x + 8, 58, 10, 52, '#1a0f22');
      for (let i = 0; i < 4; i++) {
        rect(c, x + 10, 62 + i * 12, 6, 8, glyph);
        rect(c, x + 12, 64 + i * 12, 2, 2, '#1a0f22');
        rect(c, x + 10, 66 + i * 12, 2, 2, '#1a0f22');
      }
      rect(c, x + 28, 92, 58, 34, '#170f1c');
      rect(c, x + 30, 94, 54, 30, '#4a2c1c');
      rect(c, x + 34, 98, 20, 22, '#7a4522');
      rect(c, x + 58, 98, 22, 22, '#8a5426');
      for (let i = 0; i < 5; i++) {
        rect(c, x + 32 + i * 12, 88, 4, 5, '#e83828');
        rect(c, x + 33 + i * 12, 87, 2, 1, '#f8d838');
      }
    }

    // shop module B: blue sign + red banner + window (96px wide)
    function shopBlue(c, x, v) {
      const sign = v ? '#8af838' : '#38c8f8';
      rect(c, x, 50, 96, 88, '#201826');
      rect(c, x, 50, 96, 3, '#363048');
      rect(c, x, 50, 3, 88, '#140d1a');
      rect(c, x + 8, 62, 56, 22, sign);
      rect(c, x + 10, 64, 52, 18, '#101828');
      rect(c, x + 14, 68, 44, 4, '#f8d848');
      for (let i = x + 17; i < x + 56; i += 6) rect(c, i, 69, 3, 2, '#101828');
      rect(c, x + 14, 75, 30, 4, '#ff6a5a');
      rect(c, x + 74, 54, 14, 60, '#a01818');
      rect(c, x + 76, 56, 10, 56, '#d82818');
      for (let i = 0; i < 5; i++) rect(c, x + 79, 60 + i * 11, 4, 6, '#f8e8d0');
      rect(c, x + 8, 92, 58, 34, '#150e1a');
      rect(c, x + 10, 94, 54, 30, '#3c2c40');
      rect(c, x + 14, 98, 20, 22, '#6a3c50');
      rect(c, x + 38, 98, 22, 22, '#7a4522');
    }

    function buildNear() {
      nearCv = layer(WORLD);
      const c = nearCv.getContext('2d');

      // shops with gaps in between so viaduct and skyline shine through
      shopMarquee(c, 0, 0);
      shopBlue(c, 160, 0);
      shopMarquee(c, 352, 1);
      shopBlue(c, 512, 1);

      // sidewalk + street across the whole world
      rect(c, 0, 152, WORLD, 3, '#8a8090');
      rect(c, 0, 155, WORLD, 3, '#565060');
      rect(c, 0, 158, WORLD, 22, '#46424e');
      for (let i = 0; i < 120; i++) {
        const x = (i * 53) % WORLD;
        const y = 160 + ((i * 31) % 18);
        rect(c, x, y, 2, 1, (i % 3 === 0) ? '#3c3844' : '#514c5a');
      }
      for (const x of [46, 130, 214, 292, 372, 458, 540, 612]) rect(c, x, 166, 12, 2, '#3a3642');
      rect(c, 0, 176, WORLD, 4, '#302c38');
    }

    function buildCrowd() {
      crowd = [];
      const cols = ['#7a5a9a', '#5a7a4a', '#9a5a4a', '#4a6a8a', '#8a7a3a',
                    '#6a4a6a', '#4a8a7a', '#9a7a5a'];
      const skins = ['#e8b080', '#c89060', '#f0c090', '#a87850'];
      for (let x = 6; x < WORLD - 8; x += 11) {
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
      if (p > 300) return;
      const x = Math.round(-140 + (p / 300) * (MID_W + 280));
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
      worldW: WORLD,
      init() { buildFar(); buildMid(); buildNear(); buildCrowd(); },
      draw(c, t, cam) {
        c.drawImage(farCv, -Math.round(cam * F_FAR), 0);
        c.save();
        c.translate(-Math.round(cam * F_MID), 0);
        c.drawImage(midCv, 0, 0);
        drawTrain(c, t);
        c.restore();
        c.save();
        c.translate(-Math.round(cam), 0);
        c.drawImage(nearCv, 0, 0);
        drawCrowd(c, t);
        // crowd barrier IN FRONT of the crowd
        rect(c, 0, 146, WORLD, 1, '#8a8494');
        rect(c, 0, 149, WORLD, 1, '#6a6474');
        for (let x = 4; x < WORLD; x += 14) rect(c, x, 146, 2, 6, '#7a7484');
        // neon pulse + tower beacon (the tower lives in the far layer)
        const on = (t % 90) < 60;
        c.globalAlpha = 0.22;
        if (on) { rect(c, 6, 56, 14, 56, '#ff40c8'); rect(c, 358, 56, 14, 56, '#ff40c8'); }
        else { rect(c, 168, 62, 56, 22, '#38c8f8'); rect(c, 520, 62, 56, 22, '#38c8f8'); }
        c.globalAlpha = 1;
        c.restore();
        if ((t % 120) < 60) rect(c, 306 - Math.round(cam * F_FAR), 21, 2, 2, '#ff4030');
      },
      drawFg(c, t, cam) {
        // utility poles pass IN FRONT of the fighters
        c.save();
        c.translate(-Math.round(cam * F_FG), 0);
        for (const x of [56, 330, 604]) {
          rect(c, x, 38, 3, 122, '#100c14');
          rect(c, x - 8, 50, 19, 2, '#100c14');
          rect(c, x - 6, 44, 15, 2, '#100c14');
        }
        c.restore();
      },
    };
  }

  // ======================================================= 2: NEON CROSSING
  function makeNeon() {
    let farCv, midCv, nearCv;

    function buildFar() {
      farCv = layer(FAR_W);
      const c = farCv.getContext('2d');
      const sky = ['#20203e', '#28284c', '#32325c', '#3e3e6c', '#4a4a7a'];
      for (let i = 0; i < sky.length; i++) rect(c, 0, i * 12, FAR_W, 12, sky[i]);
      rect(c, 0, 60, FAR_W, H - 60, '#55558a');
      mountain(c, 40, 18, 34, 64, '#5a6690', '#e8ecf6');
      mountain(c, 118, 10, 40, 64, '#5a6690', '#e8ecf6');
      mountain(c, 200, 16, 34, 64, '#5a6690', '#e8ecf6');
      mountain(c, 276, 8, 44, 64, '#5a6690', '#e8ecf6');
      mountain(c, 352, 14, 38, 64, '#5a6690', '#e8ecf6');
      mountain(c, 420, 20, 32, 64, '#5a6690', '#e8ecf6');
      mountain(c, 76, 30, 30, 66, '#454e74', '#c8d0e4');
      mountain(c, 158, 26, 34, 66, '#454e74', '#c8d0e4');
      mountain(c, 244, 30, 30, 66, '#454e74', '#c8d0e4');
      mountain(c, 330, 28, 32, 66, '#454e74', '#c8d0e4');
      mountain(c, 408, 32, 28, 66, '#454e74', '#c8d0e4');
    }

    function buildMid() {
      midCv = layer(MID_W);
      const c = midCv.getContext('2d');

      // neon towers across the full mid layer
      const tw = [
        [0, 44, 30], [34, 30, 22], [60, 50, 18], [82, 38, 20],
        [280, 36, 22], [306, 48, 18], [328, 30, 24], [356, 42, 38],
        [398, 34, 24], [426, 46, 20], [450, 30, 26], [480, 40, 30],
        [512, 48, 16],
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

      // billboard tower
      rect(c, 218, 26, 30, 104, '#20243c');
      rect(c, 216, 28, 34, 26, '#f84ad8');
      rect(c, 218, 30, 30, 22, '#160b28');
      rect(c, 226, 33, 14, 16, '#3ae8f8');
      rect(c, 230, 37, 6, 3, '#160b28');
      rect(c, 228, 42, 4, 3, '#160b28');
      rect(c, 216, 58, 34, 16, '#f8a03e');
      rect(c, 218, 60, 30, 12, '#28122c');
      rect(c, 221, 63, 24, 3, '#f8d848');
      rect(c, 221, 68, 16, 2, '#ff6a5a');
      rect(c, 216, 78, 34, 16, '#3a6af8');
      rect(c, 218, 80, 30, 12, '#101a34');
      rect(c, 221, 83, 24, 3, '#6ae8f8');
      rect(c, 221, 88, 20, 2, '#f84ad8');

      // glowing orb on a pedestal
      rect(c, 112, 88, 16, 4, '#2a3450');
      rect(c, 115, 74, 10, 14, '#1a4a58');
      rect(c, 116, 72, 8, 14, '#2a8aa8');
      rect(c, 117, 73, 6, 10, '#3ae8f8');
      rect(c, 118, 74, 4, 5, '#c8f8ff');

      // mech statues
      for (const [mx, eye] of [[140, '#f84a4a'], [170, '#3ae8f8']]) {
        rect(c, mx - 3, 124, 16, 8, '#343c58');
        rect(c, mx, 100, 10, 6, '#2a3244');
        rect(c, mx + 2, 102, 5, 2, eye);
        rect(c, mx - 3, 106, 16, 10, '#323a50');
        rect(c, mx - 3, 106, 4, 6, '#3e4862');
        rect(c, mx + 9, 106, 4, 6, '#3e4862');
        rect(c, mx, 116, 4, 8, '#2a3244');
        rect(c, mx + 6, 116, 4, 8, '#2a3244');
      }

      // cable-stayed bridge
      rect(c, 466, 34, 4, 96, '#4a5570');
      rect(c, 467, 34, 1, 96, '#6a7694');
      for (let i = 0; i < 6; i++) {
        const x0 = 468, y0 = 38 + i * 4;
        const x1 = 432 + i * 10, y1 = 118;
        for (let s = 0; s < 14; s++) {
          rect(c, Math.round(x0 + (x1 - x0) * s / 14),
                  Math.round(y0 + (y1 - y0) * s / 14), 1, 1, '#8a96b4');
        }
      }
      rect(c, 428, 118, 100, 4, '#3a4258');

      // monorail track
      rect(c, 0, 108, 428, 2, '#5a6580');
      for (let x = 10; x < 420; x += 36) rect(c, x, 110, 3, 20, '#2e3650');
    }

    function buildNear() {
      nearCv = layer(WORLD);
      const c = nearCv.getContext('2d');

      // spectator niches behind railings, spread across the world
      const spect = [
        [8, '#3ae8f8'], [24, '#f84ad8'], [286, '#f8d848'], [302, '#3ae8f8'],
        [330, '#f84ad8'], [590, '#f8d848'], [612, '#3ae8f8'],
      ];
      for (const [px, vis] of spect) {
        rect(c, px + 1, 138, 3, 3, '#c8a080');
        rect(c, px, 141, 5, 8, '#232c40');
        rect(c, px + 1, 139, 3, 1, vis);
      }
      for (const [rx, rw] of [[0, 44], [276, 70], [576, 64]]) {
        rect(c, rx, 148, rw, 2, '#4a5570');
        for (let x = rx + 2; x < rx + rw; x += 10) rect(c, x, 148, 2, 6, '#3a4258');
      }

      // glass walkway (fighting surface)
      rect(c, 0, 152, WORLD, 2, '#9ab8c8');
      rect(c, 0, 154, WORLD, 4, '#2a4a56');
      rect(c, 0, 158, WORLD, 22, '#16323c');
    }

    function drawTraffic(c, t) {
      // traffic BELOW the glass floor (dimmed light streaks)
      c.globalAlpha = 0.5;
      for (let i = 0; i < 13; i++) {
        const lane = i % 2;
        const speed = lane === 0 ? 2.2 : -1.8;
        const y = lane === 0 ? 163 + (i % 3) * 2 : 170 + (i % 3) * 2;
        let x = ((i * 97) + t * speed) % (WORLD + 60);
        if (x < 0) x += WORLD + 60;
        x -= 30;
        rect(c, x, y, 10, 2, lane === 0 ? '#d8e8f0' : '#f85a4a');
      }
      c.globalAlpha = 1;
      for (let x = 0; x < WORLD; x += 32) rect(c, x, 158, 1, 22, '#2a5a6a');
      rect(c, 0, 158, WORLD, 1, '#3a6a7a');
    }

    function drawMonorail(c, t) {
      const p = t % 700;
      if (p > 260) return;
      const x = Math.round(MID_W - (p / 260) * (MID_W + 130));
      rect(c, x, 100, 64, 8, '#d8e0ea');
      rect(c, x, 105, 64, 2, '#3ae8f8');
      for (let i = 0; i < 5; i++) rect(c, x + 5 + i * 12, 102, 7, 3, '#1c2438');
    }

    function drawDrone(c, t) {
      const p = t % 1100;
      if (p > 600) return;
      const x = Math.round(-10 + (p / 600) * (FAR_W + 20));
      const y = 22 + Math.round(Math.sin(p / 30) * 3);
      rect(c, x, y, 4, 2, '#1c2438');
      if ((t % 30) < 15) rect(c, x + 1, y - 1, 1, 1, '#f84a4a');
    }

    return {
      name: 'NEON CROSSING',
      worldW: WORLD,
      init() { buildFar(); buildMid(); buildNear(); },
      draw(c, t, cam) {
        c.drawImage(farCv, -Math.round(cam * F_FAR), 0);
        c.save();
        c.translate(-Math.round(cam * F_FAR), 0);
        drawDrone(c, t);
        c.restore();
        c.save();
        c.translate(-Math.round(cam * F_MID), 0);
        c.drawImage(midCv, 0, 0);
        drawMonorail(c, t);
        // pulsing billboards + mech eyes
        const on = (t % 80) < 50;
        c.globalAlpha = 0.25;
        if (on) rect(c, 216, 28, 34, 26, '#f84ad8');
        else rect(c, 216, 78, 34, 16, '#3a6af8');
        c.globalAlpha = 1;
        if ((t % 140) < 20) rect(c, 142, 102, 5, 2, '#ff8a8a');
        c.restore();
        c.save();
        c.translate(-Math.round(cam), 0);
        c.drawImage(nearCv, 0, 0);
        drawTraffic(c, t);
        c.restore();
      },
      drawFg(c, t, cam) {
        // hanging holo banners pass IN FRONT of the fighters
        c.save();
        c.translate(-Math.round(cam * F_FG), 0);
        for (const [x, col] of [[120, '#3ae8f8'], [420, '#f84ad8'], [640, '#f8d848']]) {
          rect(c, x, 0, 2, 44, '#141828');
          rect(c, x + 2, 4, 8, 36, '#141828');
          c.globalAlpha = 0.6;
          rect(c, x + 3, 6, 6, 32, col);
          c.globalAlpha = 1;
          for (let i = 0; i < 4; i++) rect(c, x + 4, 9 + i * 8, 4, 3, '#141828');
        }
        c.restore();
      },
    };
  }

  // ========================================================= 3: WIND TEMPLE
  function makeTemple() {
    let farCv, midCv, nearCv, monks;

    function buildFar() {
      farCv = layer(FAR_W);
      const c = farCv.getContext('2d');
      const sky = ['#38304a', '#584052', '#8a4e44', '#c47440', '#eda254'];
      for (let i = 0; i < sky.length; i++) rect(c, 0, i * 12, FAR_W, 12, sky[i]);
      rect(c, 0, 60, FAR_W, H - 60, '#eda254');
      [8, 16, 24].forEach((y, i) => {
        rect(c, 30 + i * 110, y, 60, 2, '#2e2838');
        rect(c, 250 + i * 50, y + 3, 44, 2, '#2e2838');
      });
      mountain(c, 50, 14, 40, 68, '#6a5a68', '#eef2f8', '#e8b87a');
      mountain(c, 140, 6, 46, 68, '#6a5a68', '#f4f6fa', '#e8b87a');
      mountain(c, 226, 12, 42, 68, '#6a5a68', '#eef2f8', '#e8b87a');
      mountain(c, 310, 10, 44, 68, '#6a5a68', '#f4f6fa', '#e8b87a');
      mountain(c, 396, 16, 40, 68, '#6a5a68', '#eef2f8', '#e8b87a');
      mountain(c, 96, 34, 30, 70, '#544a58', '#d8dce8');
      mountain(c, 262, 36, 28, 70, '#544a58', '#d8dce8');
      mountain(c, 404, 36, 30, 70, '#544a58', '#d8dce8');
    }

    function buildMid() {
      midCv = layer(MID_W);
      const c = midCv.getContext('2d');

      // rice terraces + river on the left
      for (let i = 0; i < 8; i++) {
        rect(c, 0, 70 + i * 9, 140 - i * 12, 9, i % 2 ? '#5a7a3a' : '#4c6a30');
        rect(c, 140 - i * 12 - 2, 70 + i * 9, 2, 9, '#3a5424');
      }
      for (let i = 0; i < 24; i++) {
        rect(c, 92 + Math.round(Math.sin(i / 3) * 6), 76 + i * 3, 3, 3, '#58a8c8');
      }

      // temple
      const T = 110; // offset versus the old 320px composition
      rect(c, 118 + T, 122, 84, 18, '#8a7a6a');
      rect(c, 118 + T, 122, 84, 2, '#a89884');
      for (let i = 0; i < 3; i++) rect(c, 130 + T - i * 4, 134 + i * 2, 60 + i * 8, 2, '#9a8a74');
      rect(c, 128 + T, 96, 64, 26, '#6a3a34');
      rect(c, 128 + T, 96, 64, 2, '#d8a848');
      for (const px of [132, 150, 166, 184]) rect(c, px + T, 98, 4, 24, '#4a2824');
      rect(c, 152 + T, 104, 16, 18, '#2a1814');
      rect(c, 154 + T, 108, 12, 14, '#8a5426');
      rect(c, 122 + T, 88, 76, 8, '#7a2e28');
      rect(c, 120 + T, 88, 80, 2, '#d8a848');
      rect(c, 134 + T, 78, 52, 8, '#7a2e28');
      rect(c, 132 + T, 78, 56, 2, '#d8a848');
      rect(c, 146 + T, 68, 28, 8, '#7a2e28');
      rect(c, 144 + T, 68, 32, 2, '#d8a848');
      rect(c, 158 + T, 62, 4, 6, '#d8a848');
      rect(c, 159 + T, 58, 2, 4, '#f8d848');

      // stupas
      rect(c, 332, 112, 18, 16, '#e8e0d0');
      rect(c, 336, 104, 10, 8, '#d8ccb8');
      rect(c, 339, 96, 4, 8, '#d8a848');
      rect(c, 340, 92, 2, 4, '#f8d848');
      rect(c, 362, 120, 12, 10, '#e8e0d0');
      rect(c, 365, 114, 6, 6, '#d8ccb8');
      rect(c, 367, 110, 2, 4, '#d8a848');

      // gong
      rect(c, 388, 108, 3, 30, '#4a3228');
      rect(c, 409, 108, 3, 30, '#4a3228');
      rect(c, 386, 104, 28, 4, '#4a3228');
      rect(c, 393, 110, 14, 14, '#d8a848');
      rect(c, 396, 113, 8, 8, '#a87828');
      rect(c, 398, 115, 4, 4, '#d8a848');

      // small shrine on the far right
      rect(c, 470, 116, 34, 22, '#8a7a6a');
      rect(c, 474, 104, 26, 12, '#6a3a34');
      rect(c, 472, 102, 30, 3, '#7a2e28');
      rect(c, 478, 96, 18, 6, '#7a2e28');
      rect(c, 484, 108, 8, 8, '#2a1814');

      rect(c, 0, 138, MID_W, 42, '#6a5a48'); // earth behind the plaza
      rect(c, 140, 138, MID_W - 140, 3, '#7a6a54');
    }

    function drawFlags(c, t) {
      // prayer flag strings in the mid layer, fluttering in the wind
      const cols = ['#4878d8', '#e8e8e8', '#d84838', '#48a858', '#e8c838'];
      const lines = [
        { x0: 270, y0: 64, x1: 20, y1: 92 },
        { x0: 270, y0: 64, x1: 508, y1: 88 },
      ];
      for (const L of lines) {
        const steps = 30;
        for (let s = 0; s <= steps; s++) {
          const x = Math.round(L.x0 + (L.x1 - L.x0) * s / steps);
          const sag = Math.round(Math.sin((s / steps) * Math.PI) * 9);
          const y = Math.round(L.y0 + (L.y1 - L.y0) * s / steps) + sag;
          rect(c, x, y, 1, 1, '#3a3230');
          if (s % 3 === 1) {
            const flutter = ((t / 8 + s) | 0) % 2;
            rect(c, x, y + 1, 3, 3 - flutter, cols[s % cols.length]);
          }
        }
      }
    }

    function drawSmoke(c, t) {
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.4 + i * 22) % 88;
        const x = 316 + Math.round(Math.sin((p + i * 9) / 7) * 2);
        c.globalAlpha = Math.max(0, 0.5 - p / 100);
        rect(c, x, 128 - p / 2, 2, 2, '#d8d0c8');
      }
      c.globalAlpha = 1;
    }

    function buildNear() {
      nearCv = layer(WORLD);
      const c = nearCv.getContext('2d');

      // stone plaza across the whole world
      rect(c, 0, 152, WORLD, 2, '#b8a888');
      rect(c, 0, 154, WORLD, 4, '#8a7a64');
      rect(c, 0, 158, WORLD, 22, '#9a8a74');
      for (let x = 12; x < WORLD; x += 24) rect(c, x, 158, 1, 22, '#7a6a58');
      rect(c, 0, 165, WORLD, 1, '#7a6a58');
      rect(c, 0, 172, WORLD, 1, '#7a6a58');
      for (let i = 0; i < 80; i++) {
        rect(c, (i * 67) % WORLD, 159 + ((i * 41) % 20), 2, 1, '#a89884');
      }
      rect(c, 0, 176, WORLD, 4, '#6a5a48');

      // stone lanterns as plaza decoration
      for (const x of [150, 340, 530]) {
        rect(c, x, 142, 10, 10, '#8a7a6a');
        rect(c, x + 2, 134, 6, 8, '#9a8a74');
        rect(c, x + 3, 136, 4, 4, '#f8d848');
        rect(c, x - 1, 130, 12, 4, '#6a5a48');
      }
    }

    function buildMonks() {
      monks = [];
      for (const x of [16, 60, 120, 210, 300, 390, 470, 560, 610]) {
        monks.push({ x, robe: (x % 2) ? '#d87828' : '#b85a20', phase: (x * 7) % 120 });
      }
    }

    function drawMonks(c, t) {
      for (const m of monks) {
        const sway = ((t + m.phase) % 240) < 120 ? 0 : 1;
        rect(c, m.x + 1, 139 + sway, 4, 3, '#c89060');
        rect(c, m.x, 142 + sway, 6, 8, m.robe);
        rect(c, m.x + 1, 148 + sway, 4, 2, '#8a4818');
      }
    }

    return {
      name: 'WIND TEMPLE',
      worldW: WORLD,
      init() { buildFar(); buildMid(); buildNear(); buildMonks(); },
      draw(c, t, cam) {
        c.drawImage(farCv, -Math.round(cam * F_FAR), 0);
        c.save();
        c.translate(-Math.round(cam * F_MID), 0);
        c.drawImage(midCv, 0, 0);
        drawFlags(c, t);
        drawSmoke(c, t);
        c.restore();
        c.save();
        c.translate(-Math.round(cam), 0);
        c.drawImage(nearCv, 0, 0);
        drawMonks(c, t);
        c.restore();
      },
      drawFg(c, t, cam) {
        // one flag string high above the plaza, IN FRONT of the fighters
        const cols = ['#4878d8', '#e8e8e8', '#d84838', '#48a858', '#e8c838'];
        c.save();
        c.translate(-Math.round(cam * F_FG), 0);
        for (let s = 0; s <= 34; s++) {
          const x = Math.round((s / 34) * FG_W);
          const y = 6 + Math.round(Math.sin((s / 34) * Math.PI) * 10);
          rect(c, x, y, 1, 1, '#3a3230');
          if (s % 2 === 1) {
            const flutter = ((t / 7 + s) | 0) % 2;
            rect(c, x, y + 1, 4, 4 - flutter, cols[s % cols.length]);
          }
        }
        c.restore();
      },
    };
  }

  // ================================================================ Management

  const stages = [makeTokyo(), makeNeon(), makeTemple()];
  const bgImgs = stages.map(() => ({ img: null, ok: false, canvas: null }));

  const MAX_IMG_WORLD = 832; // ~2.6 screen widths

  function imgWorldW(slot) {
    const w = Math.round(slot.img.width * (H / slot.img.height));
    return Math.max(W, Math.min(MAX_IMG_WORLD, w));
  }

  // Downscale the panorama once, cleanly, to world size (with smoothing).
  // After that every frame just blits 1:1 – sharp and shimmer-free.
  function prerender(slot) {
    const world = imgWorldW(slot);
    const scaledW = Math.round(slot.img.width * (H / slot.img.height));
    const cropWorld = Math.max(0, (scaledW - world) / 2);
    const cropSrc = cropWorld * (slot.img.height / H);
    const cv = document.createElement('canvas');
    cv.width = world; cv.height = H;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(
      slot.img,
      cropSrc, 0, slot.img.width - 2 * cropSrc, slot.img.height,
      0, 0, world, H,
    );
    slot.canvas = cv;
  }

  function init() {
    stages.forEach((s, i) => {
      s.init();
      const slot = bgImgs[i];
      slot.img = new Image();
      slot.img.onload = () => { prerender(slot); slot.ok = true; };
      slot.img.onerror = () => { slot.ok = false; };
      // DD.ASSETS allows embedded images (single-file build/artifact)
      slot.img.src = (DD.ASSETS && DD.ASSETS[i + 1]) || `assets/stage-${i + 1}.png`;
    });
  }

  function worldW(index) {
    const slot = bgImgs[index];
    return slot.ok ? slot.canvas.width : stages[index].worldW;
  }

  function draw(ctx, index, t, cam) {
    const slot = bgImgs[index];
    if (slot.ok) {
      ctx.drawImage(slot.canvas, -Math.round(cam), 0);
      return;
    }
    stages[index].draw(ctx, t, cam || 0);
  }

  function drawFg(ctx, index, t, cam) {
    const slot = bgImgs[index];
    if (slot.ok) return; // panorama stages: no extra front layer
    if (stages[index].drawFg) stages[index].drawFg(ctx, t, cam || 0);
  }

  DD.stage = {
    init,
    draw,
    drawFg,
    worldW,
    count: stages.length,
    name: (i) => stages[i].name,
  };
})();
