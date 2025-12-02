import { Server } from "http";
import app from "./app";
import config from "./app/config";
import { ensureSuperAdmin } from "./app/utility/superAdmin";


async function bootstrap() {
  let server: Server;

  try {
    // Create Super Admin before server listens
    await ensureSuperAdmin();

    server = app.listen(config.port, () => {
      console.log(`🚀 Server is running on http://localhost:${config.port}`);
    });

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

    process.on("unhandledRejection", (error) => {
      console.log("Unhandled Rejection detected. Closing server...");
      if (server) {
        server.close(() => {
          console.log(error);
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    });

  } catch (error) {
    console.error("Error during server startup:", error);
    process.exit(1);
  }
}

bootstrap();
