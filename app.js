/* =========================================================
   Corked — Vinskap-app
   Ingen byggesteg, ingen rammeverk. Ren vanilla JS.
   State: localStorage under STORAGE_KEY.
   ========================================================= */

"use strict";

/* ----- Konstanter --------------------------------------- */

const STORAGE_KEY = "vinskap-v1";
const SVG_NS = "http://www.w3.org/2000/svg";

// Temptech CL180SB — fysisk oppsett observert av brukeren:
// 16 hyller × 6 flasker = 96 synlige plasser. Produsentens "166"
// refererer til totalkapasitet med flasker lagret bak-rad/staggered,
// men appen sporer visuelt tilgjengelige plasser (6 per hylle).
const LAYOUT = {
  shelves: Array.from({ length: 16 }, (_, i) => ({ id: i + 1, slots: 6 }))
};

function totalSlots() {
  return LAYOUT.shelves.reduce((sum, s) => sum + s.slots, 0);
}

/* ----- State ------------------------------------------- */

/** @type {{ version: number, bottles: Record<string, any>, updatedAt: string }} */
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.bottles) {
      return emptyState();
    }
    return parsed;
  } catch (e) {
    console.warn("Kunne ikke lese localStorage, starter tomt.", e);
    return emptyState();
  }
}

function emptyState() {
  return { version: 1, bottles: {}, updatedAt: new Date().toISOString() };
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    alert("Kunne ikke lagre til nettleserens localStorage: " + e.message);
  }
}

/* ----- SVG-tegning ------------------------------------- */

// Layout-konstanter for SVG (i SVG-enheter). viewBox bestemmer
// sluttstørrelse — CSS styrer visning.
const SVG = {
  width: 460,
  shelfHeight: 38,
  topPad: 60,      // kronelist + finialer
  bottomPad: 110,  // skuff + sokkel + cabriole-ben
  pillarW: 22,     // søyler i hver side
  bottleW: 32,
  bottleH: 18
};

function buildCabinet() {
  const svg = document.getElementById("cabinet");
  svg.innerHTML = "";

  const shelfCount = LAYOUT.shelves.length;
  const innerHeight = shelfCount * SVG.shelfHeight;
  const cabinetH = SVG.topPad + innerHeight + SVG.bottomPad;

  // Scenen er bredere enn selve skapet — plass til dekor på sidene
  const sceneWidth = 640;
  const floorH = 60;
  const sceneHeight = cabinetH + floorH;
  const cabinetX = (sceneWidth - SVG.width) / 2;

  svg.setAttribute("viewBox", `0 0 ${sceneWidth} ${sceneHeight}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // Definisjoner: treverk-gradienter, glass, messing, flis, drue
  const defs = createEl("defs");
  defs.innerHTML = `
    <linearGradient id="wood-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d9a36d" />
      <stop offset="45%" stop-color="#a66a36" />
      <stop offset="100%" stop-color="#5e3416" />
    </linearGradient>
    <linearGradient id="wood-pillar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5e3416" />
      <stop offset="50%" stop-color="#c98b4f" />
      <stop offset="100%" stop-color="#5e3416" />
    </linearGradient>
    <linearGradient id="wood-dark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8e5a2d" />
      <stop offset="100%" stop-color="#5e3416" />
    </linearGradient>
    <linearGradient id="inner-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a2414" />
      <stop offset="100%" stop-color="#150c06" />
    </linearGradient>
    <linearGradient id="shelf-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d8a26b" />
      <stop offset="55%" stop-color="#a6764c" />
      <stop offset="100%" stop-color="#6b4326" />
    </linearGradient>
    <linearGradient id="brass-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8a6a28" />
      <stop offset="50%" stop-color="#f3db82" />
      <stop offset="100%" stop-color="#8a6a28" />
    </linearGradient>
    <linearGradient id="glass-reflex" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.10)" />
      <stop offset="25%" stop-color="rgba(255,255,255,0.00)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.05)" />
    </linearGradient>
    <linearGradient id="tile-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c8a886" />
      <stop offset="100%" stop-color="#8e725a" />
    </linearGradient>
    <radialGradient id="grape-grad" cx="0.35" cy="0.35" r="0.7">
      <stop offset="0%" stop-color="#9c4c88" />
      <stop offset="100%" stop-color="#3d1844" />
    </radialGradient>
    <linearGradient id="bottle-green" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2d5a3a" />
      <stop offset="100%" stop-color="#0f2a16" />
    </linearGradient>
  `;
  svg.appendChild(defs);

  const stroke = "#2d1708";
  const strokeSoft = "#5e3416";

  /* ========= FLISGULV (bak alt) ========= */
  drawFloor(svg, sceneWidth, cabinetH - 20, floorH + 20);

  /* ========= SKAPET (wrap i translated group) ========= */
  const cab = createEl("g", { transform: `translate(${cabinetX} 0)` });
  svg.appendChild(cab);

  const centerX = SVG.width / 2;

  /* ========= 1. Kronelist og finialer på toppen ========= */

  // Tre små finialer (små domer)
  [0.22, 0.5, 0.78].forEach(ratio => {
    const fx = SVG.width * ratio;
    const finial = createEl("path", {
      d: `M ${fx - 5} 12
          Q ${fx} 0, ${fx + 5} 12
          L ${fx + 3} 14
          L ${fx - 3} 14 Z`,
      fill: "url(#wood-grad)",
      stroke: stroke, "stroke-width": 1.5
    });
    cab.appendChild(finial);
  });

  // Kronelist (bred topp)
  const crown = createEl("rect", {
    x: 10, y: 14,
    width: SVG.width - 20, height: 18,
    rx: 3, ry: 3,
    fill: "url(#wood-grad)",
    stroke: stroke, "stroke-width": 2
  });
  cab.appendChild(crown);

  // Dekor-stripe i kronelisten (mørkere)
  const crownStripe = createEl("rect", {
    x: 18, y: 20,
    width: SVG.width - 36, height: 6,
    rx: 1, ry: 1,
    fill: "url(#wood-dark)",
    stroke: strokeSoft, "stroke-width": 0.8
  });
  cab.appendChild(crownStripe);

  // Smalere moulding under kronen
  const moulding = createEl("rect", {
    x: 16, y: 32,
    width: SVG.width - 32, height: 8,
    fill: "url(#wood-grad)",
    stroke: stroke, "stroke-width": 1.5
  });
  cab.appendChild(moulding);

  /* ========= 2. Hovedkropp ========= */

  const bodyY = 40;
  const bodyH = innerHeight + 44;

  const body = createEl("rect", {
    x: 16, y: bodyY,
    width: SVG.width - 32, height: bodyH,
    rx: 4, ry: 4,
    fill: "url(#wood-grad)",
    stroke: stroke, "stroke-width": 2.5
  });
  cab.appendChild(body);

  /* ========= 3. Søyler (pilastre) i hver side ========= */

  const pillarPositions = [20, SVG.width - 20 - SVG.pillarW];
  pillarPositions.forEach(px => {
    const capital = createEl("rect", {
      x: px - 3, y: bodyY + 4,
      width: SVG.pillarW + 6, height: 10,
      fill: "url(#wood-grad)",
      stroke: stroke, "stroke-width": 1.5
    });
    cab.appendChild(capital);

    const shaft = createEl("rect", {
      x: px, y: bodyY + 14,
      width: SVG.pillarW, height: bodyH - 32,
      fill: "url(#wood-pillar)",
      stroke: stroke, "stroke-width": 1.2
    });
    cab.appendChild(shaft);

    const flute = createEl("line", {
      x1: px + SVG.pillarW / 2, y1: bodyY + 18,
      x2: px + SVG.pillarW / 2, y2: bodyY + bodyH - 22,
      stroke: "#3a1f0a", "stroke-width": 0.8,
      "stroke-dasharray": "2 3"
    });
    cab.appendChild(flute);

    const base = createEl("rect", {
      x: px - 3, y: bodyY + bodyH - 18,
      width: SVG.pillarW + 6, height: 10,
      fill: "url(#wood-grad)",
      stroke: stroke, "stroke-width": 1.5
    });
    cab.appendChild(base);
  });

  /* ========= 4. Indre glass-område ========= */

  const glassX = 20 + SVG.pillarW + 6;
  const glassY = bodyY + 12;
  const glassW = SVG.width - 2 * (20 + SVG.pillarW + 6);
  const glassH = bodyH - 24;

  const glass = createEl("rect", {
    x: glassX, y: glassY,
    width: glassW, height: glassH,
    rx: 4, ry: 4,
    fill: "url(#inner-grad)",
    stroke: stroke, "stroke-width": 2
  });
  cab.appendChild(glass);

  /* ========= 5. Hyller og flasker ========= */

  const innerLeft = glassX + 10;
  const innerRight = glassX + glassW - 10;
  const innerW = innerRight - innerLeft;
  const shelvesStartY = glassY + 14;

  LAYOUT.shelves.forEach((shelf, idx) => {
    const rowY = shelvesStartY + idx * SVG.shelfHeight;
    const shelfY = rowY + SVG.shelfHeight - 7;
    const shelfRect = createEl("rect", {
      x: innerLeft - 4,
      y: shelfY,
      width: innerW + 8,
      height: 6,
      rx: 2, ry: 2,
      fill: "url(#shelf-grad)",
      stroke: "#4a3220", "stroke-width": 1
    });
    cab.appendChild(shelfRect);

    const n = shelf.slots;
    const spacing = innerW / n;
    for (let i = 0; i < n; i++) {
      const cx = innerLeft + spacing * (i + 0.5);
      const cy = rowY + SVG.shelfHeight / 2 - 3;
      const slotId = `S${shelf.id}-${i + 1}`;
      cab.appendChild(makeSlot(slotId, cx, cy));
    }
  });

  // Glass-refleks over hele ruten
  const glassReflex = createEl("rect", {
    x: glassX + 1, y: glassY + 1,
    width: glassW - 2, height: glassH - 2,
    rx: 3, ry: 3,
    fill: "url(#glass-reflex)",
    "pointer-events": "none"
  });
  cab.appendChild(glassReflex);

  /* ========= 6. Messing-håndtak på høyre side av døra ========= */

  const handleX = glassX + glassW - 10;
  const handleY = bodyY + bodyH * 0.38;
  const handleHeight = bodyH * 0.28;
  [handleY - 3, handleY + handleHeight + 3].forEach(hy => {
    const mount = createEl("circle", {
      cx: handleX + 2, cy: hy, r: 3,
      fill: "url(#brass-grad)",
      stroke: "#5c4515", "stroke-width": 1
    });
    cab.appendChild(mount);
  });
  const handle = createEl("rect", {
    x: handleX, y: handleY,
    width: 4, height: handleHeight,
    rx: 2, ry: 2,
    fill: "url(#brass-grad)",
    stroke: "#5c4515", "stroke-width": 1
  });
  cab.appendChild(handle);

  /* ========= 7. Skuff med utskjært panel nederst ========= */

  const drawerY = bodyY + bodyH + 6;
  const drawerH = 42;

  const drawer = createEl("rect", {
    x: 24, y: drawerY,
    width: SVG.width - 48, height: drawerH,
    rx: 4, ry: 4,
    fill: "url(#wood-grad)",
    stroke: stroke, "stroke-width": 2
  });
  cab.appendChild(drawer);

  const panel = createEl("rect", {
    x: 36, y: drawerY + 7,
    width: SVG.width - 72, height: drawerH - 14,
    rx: 3, ry: 3,
    fill: "url(#wood-dark)",
    stroke: strokeSoft, "stroke-width": 1.5
  });
  cab.appendChild(panel);

  const diamondY = drawerY + drawerH / 2;
  const diamond = createEl("path", {
    d: `M ${centerX} ${diamondY - 8}
        L ${centerX + 10} ${diamondY}
        L ${centerX} ${diamondY + 8}
        L ${centerX - 10} ${diamondY} Z`,
    fill: "url(#wood-grad)",
    stroke: stroke, "stroke-width": 1.5
  });
  cab.appendChild(diamond);

  [centerX - 52, centerX + 52].forEach(kx => {
    const knob = createEl("circle", {
      cx: kx, cy: diamondY, r: 3.5,
      fill: "url(#brass-grad)",
      stroke: "#5c4515", "stroke-width": 1
    });
    cab.appendChild(knob);
  });

  /* ========= 8. Sokkel og cabriole-ben ========= */

  const skirtY = drawerY + drawerH + 4;
  const skirtH = 10;
  const skirt = createEl("path", {
    d: `M 28 ${skirtY}
        L ${SVG.width - 28} ${skirtY}
        L ${SVG.width - 28} ${skirtY + skirtH - 4}
        Q ${SVG.width - 40} ${skirtY + skirtH + 4}, ${SVG.width - 56} ${skirtY + skirtH - 4}
        L 56 ${skirtY + skirtH - 4}
        Q 40 ${skirtY + skirtH + 4}, 28 ${skirtY + skirtH - 4}
        Z`,
    fill: "url(#wood-grad)",
    stroke: stroke, "stroke-width": 1.5
  });
  cab.appendChild(skirt);

  const legTopY = skirtY + skirtH;
  const legBottomY = cabinetH - 4;
  const legPositions = [44, SVG.width - 44];
  legPositions.forEach(lx => {
    const leg = createEl("path", {
      d: `M ${lx - 7} ${legTopY}
          C ${lx - 14} ${legTopY + 6}, ${lx - 4} ${legTopY + 14}, ${lx - 4} ${legBottomY - 6}
          L ${lx + 4} ${legBottomY - 6}
          C ${lx + 4} ${legTopY + 14}, ${lx + 14} ${legTopY + 6}, ${lx + 7} ${legTopY}
          Z`,
      fill: "url(#wood-grad)",
      stroke: stroke, "stroke-width": 1.5
    });
    cab.appendChild(leg);
    const foot = createEl("ellipse", {
      cx: lx, cy: legBottomY - 2,
      rx: 7, ry: 3,
      fill: "url(#wood-dark)",
      stroke: stroke, "stroke-width": 1.2
    });
    cab.appendChild(foot);
  });

  /* ========= 9. Dekor på siden + korker ========= */
  // Skygge under skapet
  const shadow = createEl("ellipse", {
    cx: sceneWidth / 2, cy: cabinetH + 4,
    rx: SVG.width / 2 - 20, ry: 8,
    fill: "rgba(0,0,0,0.35)",
    "pointer-events": "none"
  });
  svg.appendChild(shadow);

  // Drueklase venstre side
  drawGrapeCluster(svg, 50, cabinetH + 2);
  // Stående vinflasker høyre side
  drawStandingBottles(svg, sceneWidth - 70, cabinetH - 10);
  // Korker på gulvet
  drawCorks(svg, sceneWidth, cabinetH);
}

/* ========= Helpers for scene-dekor ========= */

function drawFloor(svg, w, startY, height) {
  const floor = createEl("rect", {
    x: 0, y: startY,
    width: w, height: height,
    fill: "url(#tile-grad)"
  });
  svg.appendChild(floor);

  // Diagonale flis-linjer (gir et skråstilt rutemønster)
  const g = createEl("g", {
    stroke: "rgba(60,40,25,0.35)",
    "stroke-width": 0.8,
    fill: "none"
  });
  const spacing = 30;
  for (let x = -height; x < w + height; x += spacing) {
    const l1 = createEl("line", {
      x1: x, y1: startY,
      x2: x + height, y2: startY + height
    });
    g.appendChild(l1);
    const l2 = createEl("line", {
      x1: x, y1: startY + height,
      x2: x + height, y2: startY
    });
    g.appendChild(l2);
  }
  svg.appendChild(g);

  // Toppkant (overgang gulv/vegg)
  const topEdge = createEl("line", {
    x1: 0, y1: startY,
    x2: w, y2: startY,
    stroke: "rgba(60,40,25,0.45)", "stroke-width": 1
  });
  svg.appendChild(topEdge);
}

function drawGrapeCluster(svg, cx, groundY) {
  // Stilk
  const stem = createEl("path", {
    d: `M ${cx - 2} ${groundY - 58}
        Q ${cx + 3} ${groundY - 50}, ${cx} ${groundY - 42}`,
    fill: "none",
    stroke: "#4a2e14",
    "stroke-width": 1.8,
    "stroke-linecap": "round"
  });
  svg.appendChild(stem);

  // Blad (hjerteform-aktig)
  const leaf = createEl("path", {
    d: `M ${cx - 2} ${groundY - 58}
        C ${cx - 20} ${groundY - 66}, ${cx - 26} ${groundY - 52}, ${cx - 14} ${groundY - 46}
        C ${cx - 6} ${groundY - 44}, ${cx - 2} ${groundY - 52}, ${cx - 2} ${groundY - 58} Z`,
    fill: "#5a8c3c",
    stroke: "#2e4e1a",
    "stroke-width": 1.2
  });
  svg.appendChild(leaf);

  // Bladåre
  const vein = createEl("line", {
    x1: cx - 3, y1: groundY - 57,
    x2: cx - 20, y2: groundY - 50,
    stroke: "#2e4e1a", "stroke-width": 0.6
  });
  svg.appendChild(vein);

  // Klasen — druer i et triangulært mønster
  const grapeR = 4.5;
  const rows = [
    { y: groundY - 38, count: 3 },
    { y: groundY - 30, count: 4 },
    { y: groundY - 22, count: 3 },
    { y: groundY - 14, count: 2 },
    { y: groundY - 7,  count: 1 }
  ];
  rows.forEach(row => {
    const rowW = row.count * grapeR * 2 - 2;
    for (let i = 0; i < row.count; i++) {
      const gx = cx - rowW / 2 + i * (grapeR * 2 - 2) + grapeR;
      const grape = createEl("circle", {
        cx: gx, cy: row.y, r: grapeR,
        fill: "url(#grape-grad)",
        stroke: "#2b0e30",
        "stroke-width": 0.8
      });
      svg.appendChild(grape);
      // Liten glans
      const shine = createEl("circle", {
        cx: gx - 1.5, cy: row.y - 1.5, r: 1,
        fill: "rgba(255,255,255,0.45)"
      });
      svg.appendChild(shine);
    }
  });
}

function drawStandingBottles(svg, rightX, groundY) {
  // Tre flasker ved siden av hverandre, litt overlappende
  const positions = [
    { x: rightX, color: "url(#bottle-green)", stroke: "#0a1f0e" },
    { x: rightX + 16, color: "#7a1f2b", stroke: "#3a0e14" },
    { x: rightX + 30, color: "url(#bottle-green)", stroke: "#0a1f0e" }
  ];
  positions.forEach(pos => {
    const baseY = groundY;
    // Kropp
    const body = createEl("rect", {
      x: pos.x - 5, y: baseY - 44,
      width: 12, height: 34,
      rx: 3, ry: 3,
      fill: pos.color,
      stroke: pos.stroke,
      "stroke-width": 1.2
    });
    svg.appendChild(body);
    // Skulder
    const shoulder = createEl("path", {
      d: `M ${pos.x - 5} ${baseY - 44}
          Q ${pos.x + 1} ${baseY - 52}, ${pos.x + 7} ${baseY - 44} Z`,
      fill: pos.color,
      stroke: pos.stroke,
      "stroke-width": 1.2
    });
    svg.appendChild(shoulder);
    // Hals
    const neck = createEl("rect", {
      x: pos.x - 1, y: baseY - 56,
      width: 4, height: 10,
      fill: pos.color,
      stroke: pos.stroke,
      "stroke-width": 1.2
    });
    svg.appendChild(neck);
    // Kork/kapsel
    const cap = createEl("rect", {
      x: pos.x - 2, y: baseY - 59,
      width: 6, height: 5,
      rx: 0.5, ry: 0.5,
      fill: "#c9a06a",
      stroke: "#6a4a26",
      "stroke-width": 1
    });
    svg.appendChild(cap);
    // Etikett
    const label = createEl("rect", {
      x: pos.x - 4, y: baseY - 32,
      width: 10, height: 12,
      rx: 0.5, ry: 0.5,
      fill: "#f4dcbf",
      stroke: "#a6764c",
      "stroke-width": 0.5
    });
    svg.appendChild(label);
  });
}

function drawCorks(svg, sceneW, groundY) {
  // Noen korker spredt på gulvet
  const corks = [
    { x: sceneW * 0.25, y: groundY + 40, rot: 20 },
    { x: sceneW * 0.35, y: groundY + 52, rot: -15 },
    { x: sceneW * 0.55, y: groundY + 38, rot: 45 },
    { x: sceneW * 0.7,  y: groundY + 50, rot: -30 }
  ];
  corks.forEach(c => {
    const g = createEl("g", {
      transform: `translate(${c.x} ${c.y}) rotate(${c.rot})`
    });
    const body = createEl("rect", {
      x: -7, y: -2.5,
      width: 14, height: 5,
      rx: 1.2, ry: 1.2,
      fill: "#c9a06a",
      stroke: "#6a4a26",
      "stroke-width": 0.8
    });
    g.appendChild(body);
    // Stripe midt på korken
    const stripe = createEl("line", {
      x1: -5, y1: 0, x2: 5, y2: 0,
      stroke: "#8a6a40", "stroke-width": 0.5
    });
    g.appendChild(stripe);
    svg.appendChild(g);
  });
}

// Flaske tegnet i cartoon-stil, liggende med kork til høyre.
// Struktur: ytre <g> bærer POSISJON (SVG transform-attributt),
// indre <g.slot> bærer EFFEKTER (CSS hover/klasser). Dette unngår
// at CSS transform på hover overskriver posisjons-transformen.
function makeSlot(slotId, cx, cy) {
  const pos = createEl("g", {
    "data-slot-id": slotId,
    transform: `translate(${cx} ${cy})`
  });
  const g = createEl("g", { class: "slot" });
  pos.appendChild(g);

  // Kropp (chunky, tykk kontur for cartoon-look)
  const bodyW = 22, bodyH = SVG.bottleH;
  const body = createEl("rect", {
    class: "bottle-body",
    x: -SVG.bottleW / 2,
    y: -bodyH / 2,
    width: bodyW,
    height: bodyH,
    rx: 5, ry: 5
  });
  g.appendChild(body);

  // Etikett (lys stripe midt på kroppen)
  const label = createEl("rect", {
    class: "bottle-label",
    x: -SVG.bottleW / 2 + 5,
    y: -4,
    width: 11,
    height: 8,
    rx: 1.5, ry: 1.5
  });
  g.appendChild(label);

  // Skulder — liten trekant-lignende overgang fra kropp til hals
  const shoulder = createEl("path", {
    class: "bottle-body",
    d: `M ${-SVG.bottleW / 2 + bodyW} ${-bodyH/2 + 2}
        L ${-SVG.bottleW / 2 + bodyW + 3} ${-3}
        L ${-SVG.bottleW / 2 + bodyW + 3} ${3}
        L ${-SVG.bottleW / 2 + bodyW} ${bodyH/2 - 2}
        Z`
  });
  g.appendChild(shoulder);

  // Hals
  const neck = createEl("rect", {
    class: "bottle-neck",
    x: -SVG.bottleW / 2 + bodyW + 3,
    y: -2.5,
    width: 5,
    height: 5,
    rx: 1, ry: 1
  });
  g.appendChild(neck);

  // Kork
  const cork = createEl("rect", {
    class: "bottle-cork",
    x: -SVG.bottleW / 2 + bodyW + 8,
    y: -2,
    width: 3.5,
    height: 4,
    rx: 0.8, ry: 0.8
  });
  g.appendChild(cork);

  // Shine (liten hvit glans)
  const shine = createEl("rect", {
    class: "bottle-shine",
    x: -SVG.bottleW / 2 + 3,
    y: -bodyH / 2 + 2,
    width: 2,
    height: 4,
    rx: 1, ry: 1
  });
  g.appendChild(shine);

  // Stor usynlig hitbox for touch (44px-mål blir oppnådd etter CSS-skalering)
  const hit = createEl("rect", {
    class: "hit",
    x: -SVG.bottleW / 2 - 4,
    y: -SVG.bottleH / 2 - 3,
    width: SVG.bottleW + 10,
    height: SVG.bottleH + 6,
    fill: "transparent"
  });
  g.appendChild(hit);

  return pos;
}

function createEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
  }
  return el;
}

/* ----- Rendering av flaskene i nåværende state --------- */

let currentFilter = "all";

/**
 * Effektiv status — hvis drinkFrom/drinkUntil er satt, overstyres manuell
 * status basert på dagens årstall (systemklokke).
 * Returnerer "storage" | "drink-now" | "past-prime".
 */
function effectiveStatus(bottle) {
  const now = new Date().getFullYear();
  const from = Number.isFinite(bottle.drinkFrom) ? bottle.drinkFrom : null;
  const until = Number.isFinite(bottle.drinkUntil) ? bottle.drinkUntil : null;

  if (from !== null && now < from) return "storage";
  if (until !== null && now > until) return "past-prime";
  if (from !== null && now >= from) return "drink-now";
  // Ingen år satt — fall tilbake på manuelt valg
  return bottle.status === "drink-now" ? "drink-now" : "storage";
}

function render() {
  const outers = document.querySelectorAll("#cabinet [data-slot-id]");
  let filled = 0;

  outers.forEach(outer => {
    const id = outer.getAttribute("data-slot-id");
    const slot = outer.querySelector(".slot");
    if (!slot) return;
    const bottle = state.bottles[id];

    slot.classList.remove("red", "white", "drink-now", "dimmed", "empty", "past-prime");

    if (bottle) {
      filled++;
      slot.classList.add(bottle.color === "white" ? "white" : "red");

      const eff = effectiveStatus(bottle);
      if (eff === "drink-now") slot.classList.add("drink-now");
      if (eff === "past-prime") slot.classList.add("past-prime");

      if (currentFilter !== "all") {
        const matches =
          (currentFilter === "red" && bottle.color === "red") ||
          (currentFilter === "white" && bottle.color === "white") ||
          (currentFilter === "drink-now" && (eff === "drink-now" || eff === "past-prime")) ||
          (currentFilter === "storage" && eff === "storage");
        if (!matches) slot.classList.add("dimmed");
      }
    } else {
      slot.classList.add("empty");
      if (currentFilter !== "all") slot.classList.add("dimmed");
    }
  });

  document.getElementById("count-filled").textContent = String(filled);
  document.getElementById("count-total").textContent = String(totalSlots());
}

/* ----- Tooltip ----------------------------------------- */

const tooltip = document.getElementById("tooltip");

function showTooltip(slotId, evt) {
  const bottle = state.bottles[slotId];
  if (!bottle) {
    hideTooltip();
    return;
  }
  const title = bottle.name ? escapeHtml(bottle.name) : `Plass ${slotId}`;
  const color = bottle.color === "white" ? "Hvitvin" : "Rødvin";
  const eff = effectiveStatus(bottle);
  const statusLabel =
    eff === "drink-now" ? "Drikkes nå" :
    eff === "past-prime" ? "Drikkes nå (forbi toppen)" :
    "Lagring";
  const food = bottle.food ? escapeHtml(bottle.food) : "—";
  const added = bottle.addedAt ? formatDate(bottle.addedAt) : "—";

  let windowLine = "";
  const from = Number.isFinite(bottle.drinkFrom) ? bottle.drinkFrom : null;
  const until = Number.isFinite(bottle.drinkUntil) ? bottle.drinkUntil : null;
  if (from !== null || until !== null) {
    const range = from !== null && until !== null ? `${from}–${until}` :
                  from !== null ? `fra ${from}` : `til ${until}`;
    windowLine = `<div class="tt-row">Drikkevindu: <strong>${range}</strong></div>`;
  }

  tooltip.innerHTML = `
    <div class="tt-title">${title}</div>
    <div class="tt-row"><strong>${color}</strong> · ${statusLabel}</div>
    ${windowLine}
    <div class="tt-row">Mat: <strong>${food}</strong></div>
    <div class="tt-row">Plass: <strong>${slotId}</strong> · lagt inn ${added}</div>
  `;
  tooltip.hidden = false;
  positionTooltip(evt);
}

function positionTooltip(evt) {
  const pad = 12;
  const rect = tooltip.getBoundingClientRect();
  let x = evt.clientX + pad;
  let y = evt.clientY + pad;
  if (x + rect.width > window.innerWidth - 8) x = evt.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - 8) y = evt.clientY - rect.height - pad;
  tooltip.style.left = Math.max(8, x) + "px";
  tooltip.style.top = Math.max(8, y) + "px";
}

function hideTooltip() {
  tooltip.hidden = true;
}

/* ----- Modal ------------------------------------------- */

const modal = document.getElementById("modal");
const form = document.getElementById("bottle-form");
const modalTitle = document.getElementById("modal-title");
const fSlotId = document.getElementById("f-slot-id");
const fName = document.getElementById("f-name");
const fFood = document.getElementById("f-food");
const fDrinkFrom = document.getElementById("f-drink-from");
const fDrinkUntil = document.getElementById("f-drink-until");
const yearsFieldset = form.querySelector(".field-years");

function updateYearsVisibility() {
  const status = form.querySelector('input[name="status"]:checked')?.value;
  const show = status === "storage";
  yearsFieldset.hidden = !show;
  if (!show) {
    // Tøm feltene når de ikke er aktuelle, slik at vi ikke lagrer uønsket drikkevindu
    fDrinkFrom.value = "";
    fDrinkUntil.value = "";
  }
}

form.querySelectorAll('input[name="status"]').forEach(radio => {
  radio.addEventListener("change", updateYearsVisibility);
});
const btnRemove = document.getElementById("btn-remove");
const btnSave = document.getElementById("btn-save");
const tagButtons = document.querySelectorAll("#food-tags .tag");

function openModal(slotId) {
  const bottle = state.bottles[slotId];
  form.reset();
  resetTags();

  fSlotId.value = slotId;

  if (bottle) {
    modalTitle.textContent = `Flaske — plass ${slotId}`;
    selectRadio("color", bottle.color);
    selectRadio("status", bottle.status || "storage");
    fName.value = bottle.name || "";
    fFood.value = bottle.food || "";
    fDrinkFrom.value = Number.isFinite(bottle.drinkFrom) ? bottle.drinkFrom : "";
    fDrinkUntil.value = Number.isFinite(bottle.drinkUntil) ? bottle.drinkUntil : "";
    // Ingen tag-sync mot fritekst (fritekst er sannhet). Merk matchende tags visuelt.
    if (bottle.food) syncTagsFromFood(bottle.food);
    btnRemove.hidden = false;
    btnSave.textContent = "Lagre endringer";
  } else {
    modalTitle.textContent = `Ny flaske — plass ${slotId}`;
    fDrinkFrom.value = "";
    fDrinkUntil.value = "";
    btnRemove.hidden = true;
    btnSave.textContent = "Lagre";
  }

  updateYearsVisibility();
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  // Fokuser første radio
  setTimeout(() => form.querySelector('input[name="color"]').focus(), 30);
}

function closeModal() {
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
}

function selectRadio(name, value) {
  const el = form.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
}

function resetTags() {
  tagButtons.forEach(b => b.classList.remove("selected"));
}

function syncTagsFromFood(foodText) {
  const parts = foodText.split(/[,\s;]+/).map(s => s.toLowerCase().trim());
  tagButtons.forEach(b => {
    const t = b.dataset.tag.toLowerCase();
    if (parts.includes(t)) b.classList.add("selected");
  });
}

tagButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("selected");
    // Oppdater fritekstfeltet: samle valgte tags + evt. eksisterende fritekst som ikke er en tag
    const selectedTags = Array.from(tagButtons)
      .filter(b => b.classList.contains("selected"))
      .map(b => b.dataset.tag);

    // Behold fritekst som ikke matcher noen tag
    const existing = fFood.value.split(",").map(s => s.trim()).filter(Boolean);
    const allTagsLower = Array.from(tagButtons).map(b => b.dataset.tag.toLowerCase());
    const extras = existing.filter(s => !allTagsLower.includes(s.toLowerCase()));

    fFood.value = [...selectedTags, ...extras].join(", ");
  });
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const color = data.get("color");
  const status = data.get("status");
  if (!color || !status) return;

  const slotId = fSlotId.value;
  const existing = state.bottles[slotId];

  const fromRaw = data.get("drinkFrom");
  const untilRaw = data.get("drinkUntil");
  const drinkFrom = fromRaw !== null && fromRaw !== "" ? parseInt(fromRaw, 10) : null;
  const drinkUntil = untilRaw !== null && untilRaw !== "" ? parseInt(untilRaw, 10) : null;

  if (drinkFrom !== null && drinkUntil !== null && drinkUntil < drinkFrom) {
    alert("«Til år» må være lik eller senere enn «Fra år».");
    return;
  }

  state.bottles[slotId] = {
    color,
    status,
    name: (data.get("name") || "").toString().trim(),
    food: (data.get("food") || "").toString().trim(),
    drinkFrom: Number.isFinite(drinkFrom) ? drinkFrom : null,
    drinkUntil: Number.isFinite(drinkUntil) ? drinkUntil : null,
    addedAt: existing ? existing.addedAt : new Date().toISOString()
  };
  saveState();
  render();
  closeModal();
});

/* ----- Confirm remove ---------------------------------- */

const confirmEl = document.getElementById("confirm");
const confirmText = document.getElementById("confirm-text");
const confirmYes = document.getElementById("confirm-yes");
let pendingRemoveSlotId = null;

btnRemove.addEventListener("click", () => {
  const slotId = fSlotId.value;
  if (!slotId) return;
  pendingRemoveSlotId = slotId;
  confirmText.textContent = `Fjerne flasken fra plass ${slotId}?`;
  confirmEl.hidden = false;
  confirmEl.setAttribute("aria-hidden", "false");
});

confirmYes.addEventListener("click", () => {
  if (pendingRemoveSlotId) {
    delete state.bottles[pendingRemoveSlotId];
    saveState();
    render();
    pendingRemoveSlotId = null;
    confirmEl.hidden = true;
    confirmEl.setAttribute("aria-hidden", "true");
    closeModal();
  }
});

/* ----- Event-binding på skapet ------------------------- */

const cabinetSvg = document.getElementById("cabinet");

cabinetSvg.addEventListener("click", (e) => {
  const slot = e.target.closest("[data-slot-id]");
  if (!slot) return;
  const slotId = slot.getAttribute("data-slot-id");
  hideTooltip();
  openModal(slotId);
});

cabinetSvg.addEventListener("mouseover", (e) => {
  const slot = e.target.closest("[data-slot-id]");
  if (!slot) return;
  const slotId = slot.getAttribute("data-slot-id");
  if (state.bottles[slotId]) showTooltip(slotId, e);
});

cabinetSvg.addEventListener("mousemove", (e) => {
  if (!tooltip.hidden) positionTooltip(e);
});

cabinetSvg.addEventListener("mouseout", (e) => {
  const to = e.relatedTarget;
  if (!to || !cabinetSvg.contains(to)) hideTooltip();
});

/* ----- Lukk-handlers (modal + confirm) ----------------- */

document.addEventListener("click", (e) => {
  if (e.target.matches("[data-close]")) closeModal();
  if (e.target.matches("[data-close-confirm]")) {
    confirmEl.hidden = true;
    confirmEl.setAttribute("aria-hidden", "true");
    pendingRemoveSlotId = null;
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!confirmEl.hidden) {
      confirmEl.hidden = true;
      confirmEl.setAttribute("aria-hidden", "true");
      pendingRemoveSlotId = null;
    } else if (!modal.hidden) {
      closeModal();
    }
  }
});

/* ----- Filtre ------------------------------------------ */

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

/* ----- Backup eksport / import ------------------------- */

document.getElementById("btn-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `vinskap-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

const fileInput = document.getElementById("file-import");
document.getElementById("btn-import").addEventListener("click", () => {
  fileInput.click();
});
fileInput.addEventListener("change", () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || typeof parsed !== "object" || !parsed.bottles) {
        alert("Filen ser ikke ut til å være en gyldig Corked-backup.");
        return;
      }
      const count = Object.keys(parsed.bottles).length;
      if (!confirm(`Laste opp ${count} flasker? Dette erstatter eksisterende data.`)) {
        return;
      }
      state = {
        version: parsed.version || 1,
        bottles: parsed.bottles,
        updatedAt: new Date().toISOString()
      };
      saveState();
      render();
      alert(`Lastet inn ${count} flasker.`);
    } catch (err) {
      alert("Kunne ikke lese fil: " + err.message);
    } finally {
      fileInput.value = "";
    }
  };
  reader.readAsText(file);
});

/* ----- Hjelpere ---------------------------------------- */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("no-NO", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

/* ----- Init -------------------------------------------- */

buildCabinet();
render();
