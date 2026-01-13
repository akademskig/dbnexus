#!/usr/bin/env node

/**
 * Icon Generation Script for DB Nexus
 * 
 * This script generates app icons in various sizes for different platforms.
 * 
 * Prerequisites:
 *   - Install sharp: npm install sharp
 *   - Install png-to-ico (for Windows): npm install png-to-ico
 * 
 * Usage:
 *   node scripts/generate-icons.js
 * 
 * Output:
 *   - resources/icon.png (1024x1024 - master)
 *   - resources/icons/icon-16.png
 *   - resources/icons/icon-32.png
 *   - resources/icons/icon-48.png
 *   - resources/icons/icon-64.png
 *   - resources/icons/icon-128.png
 *   - resources/icons/icon-256.png
 *   - resources/icons/icon-512.png
 *   - resources/icon.ico (Windows)
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESOURCES_DIR = path.join(__dirname, '..', 'resources');
const ICONS_DIR = path.join(RESOURCES_DIR, 'icons');
const SVG_PATH = path.join(RESOURCES_DIR, 'icon.svg');

const SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];

async function generateIcons() {
    console.log('🎨 Generating app icons...\n');

    // Ensure icons directory exists
    await fs.mkdir(ICONS_DIR, { recursive: true });

    // Read SVG
    const svgBuffer = await fs.readFile(SVG_PATH);

    // Generate PNGs for each size
    for (const size of SIZES) {
        const outputPath = size === 1024 
            ? path.join(RESOURCES_DIR, 'icon.png')
            : path.join(ICONS_DIR, `icon-${size}.png`);

        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(outputPath);

        console.log(`  ✓ Generated ${size}x${size} PNG`);
    }

    console.log('\n✅ Icon generation complete!');
    console.log('\nNext steps:');
    console.log('  1. For Windows .ico: Use an online converter or png-to-ico package');
    console.log('  2. For macOS .icns: Use iconutil on macOS or an online converter');
    console.log('  3. Update electron-builder config to point to these icons');
}

generateIcons().catch(console.error);
