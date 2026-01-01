import { Server } from "http";
import app from "./app";
import config from "./app/config";
import { ensureSuperAdmin } from "./app/utility/superAdmin";
import { initCronJobs } from "./app/modules/cron/cron.services";

let server: Server;

async function main() {
  try {
    // --- LOCAL DEVELOPMENT ONLY ---
    // We check if we are NOT in production (Vercel)
     await ensureSuperAdmin();
    if (config.node_env !== 'production') {
        
      console.log("🛠️ Starting in Local Development Mode...");

      // 1. Run Admin Seed (Only locally or via specific script)
     
      
      // 2. Run Cron Jobs (Node-cron does not work on Vercel Serverless)
      initCronJobs();

      // 3. Start Server manually
      server = app.listen(config.port, () => {
        console.log(`🚀 Server is running on http://localhost:${config.port}`);
      });

      // Graceful Shutdown Logic
      const exitHandler = () => {
        if (server) {
          server.close(() => {
            console.log("Server closed gracefully.");
            process.exit(1);
          });
        } else {
          process.exit(1);
        }
      };

      process.on("uncaughtException", (error) => {
        console.log("💥 Uncaught Exception:", error);
        exitHandler();
      });

      process.on("unhandledRejection", (error) => {
        console.log("💥 Unhandled Rejection detected:", error);
        exitHandler();
      });
    } else {
       // --- VERCEL PRODUCTION ---
       console.log("🚀 Serverless Function Initialized");
       // On Vercel, we do NOT call app.listen().
       // We also skip initCronJobs() because serverless functions freeze after response.
    }

  } catch (error) {
    console.error("Error during server startup:", error);
    process.exit(1);
  }
}

// Execute the logic
main();

// --- CRITICAL EXPORT FOR VERCEL ---
export default app;