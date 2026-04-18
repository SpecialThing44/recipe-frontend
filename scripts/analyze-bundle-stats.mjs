import fs from 'node:fs';
import path from 'node:path';

const statsPath = path.resolve('dist/recipe-frontend/stats.json');

if (!fs.existsSync(statsPath)) {
  console.error('Missing stats file at dist/recipe-frontend/stats.json');
  console.error('Run: yarn build:stats');
  process.exit(1);
}

const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
const outputs = stats.outputs ?? {};

const rankedOutputs = Object.entries(outputs)
  .map(([name, value]) => ({
    name,
    bytes: value?.bytes ?? 0,
    entry: Boolean(value?.entryPoint),
  }))
  .sort((a, b) => b.bytes - a.bytes);

console.log('Top outputs by raw size');
for (const output of rankedOutputs.slice(0, 12)) {
  const kb = (output.bytes / 1024).toFixed(1);
  const entrySuffix = output.entry ? ' (entry)' : '';
  console.log(`${kb} KB\t${output.name}${entrySuffix}`);
}

const mainOutputName = Object.keys(outputs).find((name) => name.startsWith('main-'));
if (!mainOutputName) {
  process.exit(0);
}

const mainInputs = outputs[mainOutputName]?.inputs ?? {};
const rankedMainInputs = Object.entries(mainInputs)
  .map(([name, value]) => ({
    name,
    bytes: value?.bytesInOutput ?? value?.bytes ?? 0,
  }))
  .sort((a, b) => b.bytes - a.bytes);

console.log('\nTop contributors to main bundle');
for (const input of rankedMainInputs.slice(0, 20)) {
  const kb = (input.bytes / 1024).toFixed(1);
  console.log(`${kb} KB\t${input.name}`);
}
