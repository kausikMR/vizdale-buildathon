import express from "express";
import cors from "cors";
import { attachUser } from "./middleware.js";
import { authRouter } from "./routes/auth.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());
app.use(attachUser);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "api" });
});

app.use("/api/auth", authRouter);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
