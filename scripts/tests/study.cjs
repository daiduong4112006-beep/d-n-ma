const {spawnSync} = require('node:child_process');
const path = require('node:path');
let failed = false;
for (const file of ['fe-matrix.cjs', 'typing-score.cjs']) {
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], {stdio:'inherit'});
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
