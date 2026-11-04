const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {checkReactVersions} = require('../check-react-versions.cjs');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'dun-react-version-test-'));
const write = (file, data) => {
  const target = path.join(fixture, file);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, JSON.stringify(data));
};
try {
  const manifest = {dependencies:{react:'19.3.1','react-dom':'19.3.1'},devDependencies:{'react-test-renderer':'19.3.1'}};
  write('package.json', manifest);
  write('node_modules/react/package.json', {name:'react',version:'19.3.1'});
  write('node_modules/react-dom/package.json', {name:'react-dom',version:'19.3.0'});
  assert.throws(() => checkReactVersions(fixture), /React version mismatch/);
  console.log('PASS Reject the exact deployed 19.3.1 / 19.3.0 mismatch before building');
  write('node_modules/react-dom/package.json', {name:'react-dom',version:'19.3.1'});
  assert.equal(checkReactVersions(fixture).react, '19.3.1');
  console.log('PASS Accept matching pinned React and React DOM');
  write('package.json', {...manifest,dependencies:{...manifest.dependencies,react:'^19.3.1'}});
  assert.throws(() => checkReactVersions(fixture), /must be pinned/);
  console.log('PASS Reject unpinned React ranges');
  write('package.json', {...manifest,devDependencies:{'react-test-renderer':'19.3.0'}});
  assert.throws(() => checkReactVersions(fixture), /react-test-renderer/);
  console.log('PASS Reject mismatching test-renderer declarations');
} finally {
  const resolved = fs.realpathSync(fixture);
  if (path.dirname(resolved) !== fs.realpathSync(os.tmpdir()) || !path.basename(resolved).startsWith('dun-react-version-test-')) throw new Error('Unexpected fixture path');
  fs.rmSync(resolved, {recursive:true,force:true});
}
