import "dotenv/config";
import { beginRefresh, refreshFinished, job } from "../server/refresh-v3";
beginRefresh();
let last = "";
const timer = setInterval(() => {
  if (last !== job.message) {
    console.log(job.message);
    last = job.message;
  }
}, 2000);
await refreshFinished();
clearInterval(timer);
console.log(job.message);
for (const error of job.errors) console.log(error);
if (job.state === "failed") process.exitCode = 1;
