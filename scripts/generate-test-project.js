/**
 * LabCoordinator — Test project generator.
 * Creates a valid .labcoord ZIP containing session.json and a custom image.bmp.
 * Used to verify UI components without manual data entry.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import bmp from 'bmp-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../test-data');
const outFile = path.join(outDir, 'test-project.labcoord');

/**
 * Generate a 1200x900 pixel BMP image for testing.
 */
function generateTestImage() {
  const width = 1200;
  const height = 900;
  const buffer = Buffer.alloc(width * height * 4);

  // Feature positions (radius 8px, color #333333)
  const features = [
    { x: 180, y: 135 }, { x: 810, y: 135 }, { x: 810, y: 765 }, { x: 180, y: 765 },
    { x: 495, y: 450 }, { x: 300, y: 450 }
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let r = 255, g = 255, b = 255; // White background

      // Grey border (60px)
      if (x < 60 || x > width - 60 || y < 60 || y > height - 60) {
        r = g = b = 204; // #CCCCCC
      }

      // Faint grid (100px)
      if (x % 100 === 0 || y % 100 === 0) {
        r = g = b = 238; // #EEEEEE
      }

      // Scale bar (horizontal line)
      if (y >= 858 && y <= 862 && x >= 60 && x <= 260) {
        r = g = b = 51; // #333333
      }

      // Feature points
      features.forEach(f => {
        const dx = x - f.x;
        const dy = y - f.y;
        if (dx * dx + dy * dy < 64) {
          r = g = b = 51; // #333333
        }
      });

      // bmp-js expects ABGR
      buffer[idx] = 0;     // Alpha
      buffer[idx + 1] = b; // Blue
      buffer[idx + 2] = g; // Green
      buffer[idx + 3] = r; // Red
    }
  }

  const bmpData = {
    data: buffer,
    width: width,
    height: height
  };
  return bmp.encode(bmpData).data;
}

/**
 * Create the version 6 session.json data.
 */
function generateSessionJson() {
  return {
    version: 6,
    projectName: "Test Project",
    sampleId: "TEST-001",
    tagPresetName: "Mineralogy + Priority + Texture",
    instruments: [
      {
        id: "inst-sem",
        name: "SEM",
        isSource: true,
        transformFrom: null,
        units: "µm",
        transform: null,
        qualityOverridden: false
      },
      {
        id: "inst-epma",
        name: "EPMA",
        isSource: false,
        transformFrom: "inst-sem",
        units: "µm",
        transform: null,
        qualityOverridden: false
      }
    ],
    tagCategories: [
      {
        id: "tc-mineral",
        name: "Mineral",
        isColorCategory: true,
        values: [
          { label: "Pyrite",   color: "#FFC107" },
          { label: "Albite",   color: "#4CAF50" },
          { label: "Zircon",   color: "#F44336" },
          { label: "Feldspar", color: "#2196F3" }
        ]
      },
      {
        id: "tc-priority",
        name: "Priority",
        isColorCategory: false,
        values: [
          { label: "Priority 1", color: null },
          { label: "Priority 2", color: null },
          { label: "Priority 3", color: null }
        ]
      },
      {
        id: "tc-texture",
        name: "Texture",
        isColorCategory: false,
        values: [
          { label: "Rim",    color: null },
          { label: "Core",   color: null },
          { label: "Matrix", color: null }
        ]
      }
    ],
    points: [
      {
        id: "pt-ref1",
        name: "Ref-1",
        pixelCoords: { x: 180, y: 135 },
        enteredCoords: {
          "inst-sem":  { x: 62127.91,  y: -1598.304 },
          "inst-epma": { x: -52.6729,  y: 35.5296   }
        },
        pixelProxy: [],
        tags: { "Mineral": "Albite", "Priority": "Priority 1", "Texture": "Core" },
        notes: "NE corner reference — use if accessible"
      },
      {
        id: "pt-ref2",
        name: "Ref-2",
        pixelCoords: { x: 810, y: 135 },
        enteredCoords: {
          "inst-sem":  { x: 53311.28,  y: -1450.848 },
          "inst-epma": { x: -43.8859,  y: 35.0774   }
        },
        pixelProxy: [],
        tags: { "Mineral": "Zircon", "Priority": "Priority 1" },
        notes: ""
      },
      {
        id: "pt-ref3",
        name: "Ref-3",
        pixelCoords: { x: 810, y: 765 },
        enteredCoords: {
          "inst-sem":  { x: 53716.784, y: 7217.312 },
          "inst-epma": { x: -44.5791,  y: 26.4321  }
        },
        pixelProxy: [],
        tags: { "Mineral": "Feldspar" },
        notes: ""
      },
      {
        id: "pt-ref4",
        name: "Ref-4",
        pixelCoords: { x: 180, y: 765 },
        enteredCoords: {
          "inst-sem":  { x: 61629.232, y: 7340.192 },
          "inst-epma": { x: -52.4636,  y: 26.5906  }
        },
        pixelProxy: [],
        tags: { "Mineral": "Pyrite", "Priority": "Priority 2", "Texture": "Rim" },
        notes: ""
      },
      {
        id: "pt-001",
        name: "Pt-001",
        pixelCoords: { x: 495, y: 450 },
        enteredCoords: {
          "inst-sem": { x: 57500.0, y: 2800.0 }
        },
        pixelProxy: [],
        tags: { "Mineral": "Zircon", "Priority": "Priority 1", "Texture": "Rim" },
        notes: "Primary target — high priority zircon"
      },
      {
        id: "pt-002",
        name: "Pt-002",
        pixelCoords: { x: 300, y: 450 },
        enteredCoords: {
          "inst-sem": { x: 60200.0, y: 2900.0 }
        },
        pixelProxy: [],
        tags: { "Mineral": "Albite", "Texture": "Matrix" },
        notes: "Secondary target"
      }
    ]
  };
}

/**
 * Main generator routine.
 */
async function generate() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const zip = new JSZip();
  const sessionData = generateSessionJson();
  const imageBuffer = generateTestImage();

  zip.file('session.json', JSON.stringify(sessionData, null, 2));
  zip.file('image.bmp', imageBuffer);

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(outFile, content);

  console.log(`✓ test-project.labcoord generated (${(content.length / 1024).toFixed(1)}kb)`);
  console.log(`✓ session.json valid (${sessionData.points.length} points, ${sessionData.instruments.length} instruments)`);
  console.log(`✓ image.bmp present (1200x900)`);
}

generate();
