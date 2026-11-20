import {configured} from './db.mjs';
import {dueForSync} from './cms.mjs';
import {syncSources} from './sources.mjs';
if(!configured()){console.error('Supabase credentials not configured');process.exitCode=1;}
else {try{if(await dueForSync())console.log(JSON.stringify(await syncSources({requestedBy:'railway-cron'})));else console.log('Not due for sync yet');}catch(e){console.error('Cron failed',e.message);process.exitCode=1;}}
