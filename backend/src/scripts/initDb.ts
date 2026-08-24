import { cleanAndSeedDatabase } from "./cleanDb.ts";

// Execute clean and fresh seed
cleanAndSeedDatabase().catch(console.error);
