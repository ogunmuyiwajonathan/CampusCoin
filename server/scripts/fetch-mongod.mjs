// Downloads the mongod binary that mongodb-memory-server needs, with retries.
// The default download dies partway on some networks (ECONNRESET), so this
// wraps it in a loop instead of failing the whole run on one reset.
import { MongoBinary } from "mongodb-memory-server-core";

const ATTEMPTS = 12;
const WAIT_MS = 4000;

for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    process.stdout.write(`attempt ${attempt}/${ATTEMPTS} ... `);
    const binaryPath = await MongoBinary.getPath({});
    console.log("ready");
    console.log(binaryPath);
    process.exit(0);
  } catch (error) {
    console.log(`failed: ${error.message}`);
    if (attempt === ATTEMPTS) {
      console.error("\nGiving up. Run this from a different network, or set");
      console.error("MONGOMS_DOWNLOAD_MIRROR if your network blocks fastdl.mongodb.org.");
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  }
}
