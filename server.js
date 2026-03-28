const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();

// Configuración de CORS para permitir que tu sitio de Netlify se conecte
app.use(cors());
app.use(express.json());

// Usamos una variable de entorno para la URI. Si no existe, usa la local (solo para pruebas)
const uri = process.env.MONGO_URI || "mongodb+srv://admin_equipo:CashControl64.@cluster0.fjvg1sp.mongodb.net/Cash_Control?retryWrites=true&w=majority";
const client = new MongoClient(uri);

let db;

async function conectarDB() {
  try {
    console.log("Intentando conectar a MongoDB Atlas...");
    await client.connect();
    db = client.db("Cash_Control");
    console.log("✅ ¡Conexión exitosa a MongoDB!");

    // IMPORTANTE: Render asigna el puerto automáticamente mediante process.env.PORT
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error("❌ ERROR DE CONEXIÓN:");
    console.dir(error);
  }
}

conectarDB();

// Rutas
app.post("/usuario", async (req, res) => {
  try {
    const { nombre, correo, password } = req.body;
    const nuevoUsuario = {
      nombre,
      correo,
      password,
      rol: "usuario",
      fecha_registro: new Date().toISOString().split('T')[0]
    };
    const result = await db.collection("usuarios").insertOne(nuevoUsuario);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ error: "Error al insertar usuario" });
  }
});

app.post("/gasto", async (req, res) => {
  try {
    const result = await db.collection("gastos").insertOne(req.body);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ error: "Error al registrar gasto" });
  }
});

app.post("/meta", async (req, res) => {
  try {
    const result = await db.collection("metas_ahorro").insertOne(req.body);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ error: "Error al crear meta" });
  }
});

app.get("/progreso/:usuario", async (req, res) => {
  try {
    const usuario = req.params.usuario;
    const gastos = await db.collection("gastos").aggregate([
      { $match: { usuario: usuario } },
      { $group: { _id: null, total: { $sum: "$monto" } } }
    ]).toArray();
    const meta = await db.collection("metas_ahorro").findOne({ usuario });
    const gastado = gastos.length ? gastos[0].total : 0;
    const metaTotal = meta ? meta.meta : 0;

    res.send({
      gastado,
      meta: metaTotal,
      restante: Math.max(0, metaTotal - gastado)
    });
  } catch (error) {
    res.status(500).send({ error: "Error al obtener progreso" });
  }
});