import app from "./src/app.js";
import connectDB from "./src/config/DB.js";
import config from "./src/config/config.js";

connectDB()

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});