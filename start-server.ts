import { setupExpress } from "./server";
setupExpress()
  .then((server) => {
    const shutdown = () => {
      server.close(() => process.exit(0));
      setTimeout(() => {
        server.closeAllConnections();
        process.exit(0);
      }, 10_000).unref();
    };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  })
  .catch((error) => {
    console.error("Server startup failed:", error);
    process.exitCode = 1;
  });
