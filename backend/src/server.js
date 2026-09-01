import { connectDB } from "./config/db.js";
import app from "./app.js";

const PORT = process.env.PORT || 8000;

/** Start the API only after PostgreSQL connectivity is verified. */
export async function startServer() {
  const isConnected = await connectDB();
  if (!isConnected) {
    console.error("Fatal: PostgreSQL database connection failed. Halting server startup.");
    process.exit(1);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Authentication Backend Server running on http://localhost:${PORT}`);
  });
}

startServer();
