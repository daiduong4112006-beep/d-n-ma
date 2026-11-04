const fs = require('node:fs');
const path = require('node:path');

function checkReactVersions(root = process.cwd()) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const names = ['react', 'react-dom'];
  const installed = Object.fromEntries(names.map(name => [name,
    JSON.parse(fs.readFileSync(require.resolve(`${name}/package.json`, {paths: [root]}), 'utf8')).version,
  ]));
  if (installed.react !== installed['react-dom']) {
    throw new Error(`React version mismatch: react=${installed.react}, react-dom=${installed['react-dom']}. Reinstall dependencies from the committed lockfile before building.`);
  }
  for (const name of names) {
    if (manifest.dependencies?.[name] !== installed[name]) {
      throw new Error(`${name} must be pinned to its installed version (${installed[name]}), without ^ or ~.`);
    }
  }
  if (manifest.devDependencies?.['react-test-renderer'] !== installed.react) {
    throw new Error('Pin react-test-renderer to the same exact version as React.');
  }
  return installed;
}

module.exports = {checkReactVersions};
if (require.main === module) {
  try {
    const versions = checkReactVersions();
    console.log(`React dependency check passed: react and react-dom ${versions.react}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
