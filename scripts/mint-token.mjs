// Generates a demo JWT for testing the API.
// Usage: JWT_SECRET=your-secret node scripts/mint-token.mjs [role] [sub]
import { sign } from "../src/lib/auth.mjs";
if (!process.env.JWT_SECRET) { console.error("Set JWT_SECRET first."); process.exit(1); }
const role = process.argv[2] || "provider";
const sub = process.argv[3] || "demo-user";
console.log(sign({ sub, role }, { expiresInSec: 7200 }));
