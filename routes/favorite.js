// routes/favorite.js
import express from "express";
import { getFavorites, addFavorite, removeFavorite } from "../controllers/favorite.js";
import { varifyToken } from "../controllers/middlewareCon.js";

const router = express.Router();

router.get("/", varifyToken, getFavorites);          // GET /api/favorites
router.post("/", varifyToken, addFavorite);          // POST /api/favorites
router.delete("/:id", varifyToken, removeFavorite);  // DELETE /api/favorites/:id

export default router;
