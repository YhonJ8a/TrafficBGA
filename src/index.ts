import "reflect-metadata";
import app from "./app.js";
import dotenv from "dotenv";
import { AppDataSource } from "./database/db.js";
dotenv.config();

dotenv.config();
const PORT = process.env.PORT || 3000;

(async () => {

    AppDataSource.initialize()
        .then(() => { console.log("Conectado a PostgreSQL con TypeORM") })
        .catch((err) => { console.error("Error al conectar con la base de datos:", err) });
    app.listen(PORT);
    console.warn(`Server running on port http://localhost:${PORT}`);

})();


