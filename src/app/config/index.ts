import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV,
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  cloudinary: {
    api_secret: process.env.CLOUDINARY_API_SECRET,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
  },
  jwt: {
    access_secret: process.env.ACCESS_TOKEN_SECRET as string,
    refresh_secret: process.env.REFRESH_TOKEN_SECRET as string,
  },
  super_admin: {
    email: process.env.SUPER_ADMIN_EMAIL as string,
    password: process.env.SUPER_ADMIN_PASSWORD as string,
  },
  openRouterApiKey: process.env.OPENROUTER_API_KEY as string,
};