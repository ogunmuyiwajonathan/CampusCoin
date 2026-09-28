import "dotenv/config";

const HOSTS = [
  "ac-g739vhp-shard-00-00.0m2omm8.mongodb.net:27017",
  "ac-g739vhp-shard-00-01.0m2omm8.mongodb.net:27017",
  "ac-g739vhp-shard-00-02.0m2omm8.mongodb.net:27017",
].join(",");

const srv = process.env.MONGODB_URI || "";
if (srv.startsWith("mongodb+srv://")) {
  let plain = srv.replace(/^mongodb\+srv:\/\/([^@]+)@[^/?]+/, `mongodb://$1@${HOSTS}`);
  const extra = ["tls=true", "authSource=admin", "retryWrites=true", "w=majority"]
    .filter((pair) => !plain.includes(pair))
    .join("&");
  if (extra) plain += plain.includes("?") ? `&${extra}` : `?${extra}`;
  process.env.MONGODB_URI = plain;
}

process.env.PORT = process.argv[2] || "5012";
process.env.CORS_ORIGIN = "http://localhost:5173,http://localhost:4173,http://localhost:4189";

await import("../src/index.js");
