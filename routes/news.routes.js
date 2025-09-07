const express = require("express");
const router = express.Router();
const { news } = require("../model/new");

// Middleware for logging
const logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`, req.body || req.params || req.query);
  next();
};

// Middleware for error handling
const handleError = (res, error, message = "Server error", statusCode = 500) => {
  console.error(`Error: ${message}`, error);
  res.status(statusCode).json({ 
    message: message,
    error: error.message || error,
    timestamp: new Date().toISOString()
  });
};

// Middleware to validate ObjectId
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  if (id && !id.match(/^[0-9a-fA-F]{24}$/)) {
    return handleError(res, new Error("Invalid ID format"), "Invalid ID format", 400);
  }
  next();
};

// Middleware to validate news data
const validateNewsData = (req, res, next) => {
  const { title, content, description, image } = req.body;
  
  if (req.method === 'POST') {
    if (!title || !title.trim()) {
      return handleError(res, new Error("Title is required"), "Title is required", 400);
    }
  }
  
  if (title && title.length > 200) {
    return handleError(res, new Error("Title too long"), "Title cannot exceed 200 characters", 400);
  }
  
  if (content && content.length > 10000) {
    return handleError(res, new Error("Content too long"), "Content cannot exceed 10000 characters", 400);
  }
  
  if (description && description.length > 300) {
    return handleError(res, new Error("Description too long"), "Description cannot exceed 300 characters", 400);
  }
  
  if (image && image.trim() && !isValidUrl(image)) {
    return handleError(res, new Error("Invalid image URL"), "Image must be a valid URL", 400);
  }

  next();
};

// Utility to validate URLs
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Apply logging middleware
router.use(logRequest);

// GET all news
router.get("/", async (req, res) => {
  try {
    const allNews = await news.findPublished().lean();
    console.log(`Found ${allNews.length} news items`);
    res.json(allNews);
  } catch (err) {
    handleError(res, err, "Error fetching all news");
  }
});

// GET news by ID
router.get("/:id", validateObjectId, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching news with ID: ${id}`);
    const foundNews = await news.findById(id).lean();
    if (!foundNews) {
      return handleError(res, new Error("News not found"), "News not found", 404);
    }
    await news.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    res.json(foundNews);
  } catch (err) {
    if (err.name === 'CastError') {
      return handleError(res, err, "Invalid ID format", 400);
    }
    handleError(res, err, `Error fetching news with ID ${req.params.id}`);
  }
});

// POST create new news
router.post("/", validateNewsData, async (req, res) => {
try {
    const { title, content = '', description = '', image = '' } = req.body;
    console.log("Creating new news with data:", { title, content, description, image });
    
    const existingNews = await news.findOne({ 
      title: { $regex: new RegExp(`^${title.trim()}$`, 'i') } 
    });
    if (existingNews) {
      return handleError(res, new Error("Duplicate title"), "A news item with this title already exists", 409);
    }

    const newPost = new news({
      title: title.trim(),
      content: content.trim(),
      description: description.trim(),
      image: image.trim(),
      status: 'published'
    });
    const saved = await newPost.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message).join(', ');
      return handleError(res, err, `Validation error: ${errors}`, 400);
    }
    handleError(res, err, "Error creating news", 400);
  }
});

// PATCH partial update news by ID
router.patch("/:id", validateObjectId, validateNewsData, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log(`Patching news with ID: ${id}, data:`, updateData);

    const existingNews = await news.findById(id);
    if (!existingNews) {
      return handleError(res, new Error("News not found"), "News not found", 404);
    }

    if (updateData.title && updateData.title !== existingNews.title) {
      const duplicateNews = await news.findOne({ 
        _id: { $ne: id },
        title: { $regex: new RegExp(`^${updateData.title.trim()}$`, 'i') } 
      });
      if (duplicateNews) {
        return handleError(res, new Error("Duplicate title"), "A news item with this title already exists", 409);
      }
    }

    const updatedNews = await news.findByIdAndUpdate(
      id,
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      },
      { 
        new: true, 
        runValidators: true,
        lean: true
      }
    );

    res.json(updatedNews);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message).join(', ');
      return handleError(res, err, `Validation error: ${errors}`, 400);
    }
    if (err.name === 'CastError') {
      return handleError(res, err, "Invalid ID format", 400);
    }
    handleError(res, err, `Error patching news with ID ${req.params.id}`);
  }
});

// PUT full update news by ID
router.put("/:id", validateObjectId, validateNewsData, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content = '', description = '', image = '' } = req.body;
    console.log(`Full update of news with ID: ${id}`);

    const existingNews = await news.findById(id);
    if (!existingNews) {
      return handleError(res, new Error("News not found"), "News not found", 404);
    }

    if (title !== existingNews.title) {
const duplicateNews = await news.findOne({ 
        _id: { $ne: id },
        title: { $regex: new RegExp(`^${title.trim()}$`, 'i') } 
      });
      if (duplicateNews) {
        return handleError(res, new Error("Duplicate title"), "A news item with this title already exists", 409);
      }
    }

    const updateData = {
      title: title.trim(),
      content: content.trim(),
      description: description.trim(),
      image: image.trim(),
      updatedAt: new Date()
    };

    const updatedNews = await news.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        lean: true
      }
    );

    res.json(updatedNews);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message).join(', ');
      return handleError(res, err, `Validation error: ${errors}`, 400);
    }
    if (err.name === 'CastError') {
      return handleError(res, err, "Invalid ID format", 400);
    }
    handleError(res, err, `Error updating news with ID ${req.params.id}`);
  }
});

// DELETE news by ID
router.delete("/:id", validateObjectId, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting news with ID: ${id}`);

    const deletedNews = await news.findByIdAndDelete(id);
    if (!deletedNews) {
      return handleError(res, new Error("News not found"), "News not found", 404);
    }

    res.json({
      message: "News deleted successfully",
      deletedNews
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return handleError(res, err, "Invalid ID format", 400);
    }
    handleError(res, err, `Error deleting news with ID ${req.params.id}`);
  }
});

// DELETE multiple news
router.delete("/", async (req, res) => {
  try {
    const { ids } = req.body;
    console.log("Deleting multiple news with IDs:", ids);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return handleError(res, new Error("Invalid IDs"), "IDs array is required", 400);
    }

    for (let id of ids) {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return handleError(res, new Error(`Invalid ID: ${id}`), `Invalid ID format: ${id}`, 400);
      }
    }

    const result = await news.deleteMany({ _id: { $in: ids } });

    res.json({
      message: `${result.deletedCount} news items deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    handleError(res, err, "Error deleting multiple news");
  }
});

// GET search news
router.get("/search/:keyword", async (req, res) => {
  try {
    const { keyword } = req.params;
    console.log(`Searching news with keyword: ${keyword}`);

    if (!keyword || keyword.trim() === '') {
      return handleError(res, new Error("Keyword required"), "Search keyword is required", 400);
    }

    const searchResults = await news.searchNews(keyword);
    res.json(searchResults);
  } catch (err) {
    handleError(res, err, "Error searching news");
  }
});

// GET news statistics
router.get("/admin/stats", async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    const [total, thisMonth, thisWeek, today] = await Promise.all([
      news.countDocuments(),
      news.countDocuments({ createdAt: { $gte: startOfMonth } }),
      news.countDocuments({ createdAt: { $gte: startOfWeek } }),
      news.countDocuments({ createdAt: { $gte: startOfDay } })
    ]);

    res.json({
      total,
      thisMonth,
      thisWeek,
      today
    });
  } catch (err) {
    handleError(res, err, "Error fetching stats");
  }
});

module.exports = router;