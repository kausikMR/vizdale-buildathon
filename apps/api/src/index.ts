import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "api" });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
