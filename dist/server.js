"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./app/config"));
const superAdmin_1 = require("./app/utility/superAdmin");
const cron_services_1 = require("./app/modules/cron/cron.services");
let server;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // --- LOCAL DEVELOPMENT ONLY ---
            // We check if we are NOT in production (Vercel)
            yield (0, superAdmin_1.ensureSuperAdmin)();
            if (config_1.default.node_env !== 'production') {
                console.log("🛠️ Starting in Local Development Mode...");
                // 1. Run Admin Seed (Only locally or via specific script)
                // 2. Run Cron Jobs (Node-cron does not work on Vercel Serverless)
                (0, cron_services_1.initCronJobs)();
                // 3. Start Server manually
                server = app_1.default.listen(config_1.default.port, () => {
                    console.log(`🚀 Server is running on http://localhost:${config_1.default.port}`);
                });
                // Graceful Shutdown Logic
                const exitHandler = () => {
                    if (server) {
                        server.close(() => {
                            console.log("Server closed gracefully.");
                            process.exit(1);
                        });
                    }
                    else {
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
            }
            else {
                // --- VERCEL PRODUCTION ---
                console.log("🚀 Serverless Function Initialized");
                // On Vercel, we do NOT call app.listen().
                // We also skip initCronJobs() because serverless functions freeze after response.
            }
        }
        catch (error) {
            console.error("Error during server startup:", error);
            process.exit(1);
        }
    });
}
// Execute the logic
main();
// --- CRITICAL EXPORT FOR VERCEL ---
exports.default = app_1.default;
