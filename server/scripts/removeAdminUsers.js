import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../src/config/db.js";
import { User } from "../src/models/index.js";

const REMOVE_DATABASES = [
  "campuscoin",
  "campuscoin_dev",
  "campuscoin_development",
  "campuscoin_test",
];

async function main() {
  if (process.env.REMOVE_ADMIN_USERS !== "yes") {
    console.error("Refusing to remove admin users: set REMOVE_ADMIN_USERS=yes to confirm.");
    console.error("Run it as:  REMOVE_ADMIN_USERS=yes node scripts/removeAdminUsers.js");
    process.exit(1);
  }

  await connectDb();

  const dbName = mongoose.connection.name;
  if (!REMOVE_DATABASES.includes(dbName)) {
    console.error(`Refusing to touch database "${dbName}".`);
    await disconnectDb();
    process.exit(1);
  }

  const admins = await User.find({ role: "admin" }).select("_id email").lean();
  const before = admins.length;
  await User.deleteMany({ role: "admin" });
  for (const admin of admins) {
    await mongoose.connection.collection("sessions").deleteMany({
      session: { $regex: `"userId":"${admin._id.toString()}"` },
    });
  }
  const after = await User.countDocuments({ role: "admin" });

  console.log(`admin users before ${before} after ${after}`);
  for (const admin of admins) {
    console.log(`  removed ${admin.email}`);
  }

  await disconnectDb();
}

main().catch(async (error) => {
  console.error("Remove admins failed:", error.message);
  await disconnectDb().catch(() => {});
  process.exit(1);
});
