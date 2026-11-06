const {spawnSync}=require('node:child_process');const path=require('node:path');
let failed=false;for(const file of ['offline-shell.cjs','mcq-flashcard-toggle.cjs','project-storage.cjs','sync-regression.cjs','cloud-sync.cjs','quota-outbox.cjs']){const result=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit'});if(result.status!==0)failed=true;}
try{require.resolve('react-test-renderer');const result=spawnSync(process.execPath,[path.join(__dirname,'flashcard-component.cjs')],{stdio:'inherit'});if(result.status!==0)failed=true;}
catch{console.log('Component suite skipped: install a react-test-renderer version matching React to run it.');}
process.exitCode=failed?1:0;
