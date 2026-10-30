// Generate deterministic, clearly labeled synthetic VSS clips with FFmpeg.
// Run from any directory: node frontend/scripts/generate_fixtures.js
// Requires ffmpeg on PATH. Outputs identical files to frontend and backend fixtures.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const frontendDir = path.resolve(__dirname, '..');
const projectDir = path.resolve(frontendDir, '..');
const outputDirs = [
  path.join(projectDir, 'backend', 'tests', 'fixtures', 'videos'),
  path.join(frontendDir, 'public', 'demo-videos'),
];
const font = process.env.SENTIASA_VIDEO_FONT || 'C\\:/Windows/Fonts/arial.ttf';
const clips = [
  { name: 'clip_benign_hallway.mp4', title: 'BENIGN CONTROL', detail: 'School hallway | walking | weapon=false | aggression=false', color: '0x17334a' },
  { name: 'clip_stationery_ruler.mp4', title: 'AMBIGUITY CONTROL', detail: 'Student holding ruler | weapon=false', color: '0x27472f' },
  { name: 'clip_physical_altercation.mp4', title: 'STAGED ALTERCATION', detail: 'Simulated pushing | aggression=true | no injury', color: '0x563b20' },
  { name: 'clip_weapon_threat.mp4', title: 'STAGED WEAPON SCENE', detail: 'Prop blade visible | weapon=true | simulation only', color: '0x522929' },
];

for (const dir of outputDirs) fs.mkdirSync(dir, { recursive: true });

for (const clip of clips) {
  // A six-second, 720p synthetic slate. Distinct moving bars make the file a
  // real video stream; explicit labels document the intended test bucket.
  const filters = [
    `drawbox=x='mod(t*90\\,600)':y=400:w=120:h=24:color=white@0.8:t=fill`,
    `drawtext=fontfile='${font}':text='${clip.title}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=190`,
    `drawtext=fontfile='${font}':text='${clip.detail}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=270`,
    `drawtext=fontfile='${font}':text='SYNTHETIC TEST FIXTURE - NOT REAL FOOTAGE':fontcolor=0xffd166:fontsize=20:x=(w-text_w)/2:y=620`,
  ].join(',');
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
    `color=c=${clip.color}:s=1280x720:r=15:d=6`, '-vf', filters,
    '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  ];
  const tempFile = path.join(outputDirs[0], clip.name);
  const result = spawnSync('ffmpeg', [...args, tempFile], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(`ffmpeg failed for ${clip.name} (exit ${result.status})`);
  }
  fs.copyFileSync(tempFile, path.join(outputDirs[1], clip.name));
  const size = fs.statSync(tempFile).size;
  console.log(`${clip.name}: 6 seconds, 1280x720, ${(size / 1024).toFixed(1)} KiB per copy`);
}
