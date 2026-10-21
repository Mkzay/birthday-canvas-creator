import 'dotenv/config';
import { runRetentionCleanup } from '../server/retention';
// Preview by default. Execution is explicit and should first be checked in staging.
console.log(JSON.stringify(await runRetentionCleanup({ apply: process.argv.includes('--apply') }), null, 2));
