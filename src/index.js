import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./auth/routes/auth.routes.js";
import teacherRoutes from "./teacher/routes/teacher.routes.js";
import studentRoutes from "./student/routes/student.routes.js";
import internalRoutes from "./internal/routes/internal.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/internal", internalRoutes);
app.use("/api/v1/internal", internalRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});