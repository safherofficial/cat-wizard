import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('runtime, art scene and HUD contain no enemy or player-damage systems', async () => {
  const [main, worldArt, html] = await Promise.all([
    read('../src/main.js'),
    read('../src/world-art.js'),
    read('../index.html')
  ]);
  assert.doesNotMatch(main, /wisps?|buildWisps|updateWisps|hitWisp|hurtPlayer|playerHealth|playerInvul|respawn/i);
  assert.doesNotMatch(worldArt, /wisps?|buildWisps/i);
  assert.doesNotMatch(html, /wisps?|CAT VITALITY|health-value|wisp-value/i);
});
