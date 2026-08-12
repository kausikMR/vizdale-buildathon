import cors from "cors";
import express from "express";
import { errorHandler, router } from "./routes.js";
import { seed } from "./store.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());
app.use("/api", router);
// Must come last: turns RuleError into the { error: { code, message } } envelope.
app.use(errorHandler);

// One shared in-memory data service, seeded on boot. Restarting the API resets
// the demo to a known-good state, which is what we want during a buildathon.
seed();

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
