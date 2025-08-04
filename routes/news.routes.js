const express = require("express");
const router = express.Router();
const { news } = require("../model/model");

// GET tất cả bài viết tin tức
router.get("/", async (req, res) => {
  try {
    const allNews = await news.find().sort({ createdAt: -1 });
    res.json(allNews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST tạo tin mới
router.post("/", async (req, res) => {
  try {
    const newPost = new news(req.body);
    const saved = await newPost.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
