const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [1, 'Title cannot be empty'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: true
  },
  content: {
    type: String,
    required: false, // Made optional to match seeded data
    trim: true,
    maxlength: [10000, 'Content cannot exceed 10000 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [300, 'Description cannot exceed 300 characters'],
    default: ''
  },
  image: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function(v) {
        if (!v || v === '') return true;
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Image must be a valid URL'
    }
  },
  author: {
    type: String,
    trim: true,
    default: 'Admin'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  seoTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'SEO title cannot exceed 60 characters']
  },
  seoDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'SEO description cannot exceed 160 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.id;
      return ret;
    }
  },
  toObject: { virtuals: true },
  collection: 'news' // Explicitly set collection name
});

// Indexes for better performance
newsSchema.index({ title: 'text', content: 'text', description: 'text', tags: 'text' });

// Virtual for reading time estimation
newsSchema.virtual('readingTime').get(function() {
  if (!this.content) return 0;
  const wordsPerMinute = 200;
  const plainText = this.content.replace(/<[^>]*>/g, '');
  const wordCount = plainText.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Pre-save middleware to update updatedAt
newsSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Pre-update middleware to update updatedAt
newsSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Static method to find published news
newsSchema.statics.findPublished = function(conditions = {}) {
  return this.find({ 
    ...conditions, 
    status: 'published',
    publishedAt: { $lte: new Date() }
  }).sort({ createdAt: -1 });
};
// Static method to search news
newsSchema.statics.searchNews = function(keyword, options = {}) {
  const searchConditions = {
    $and: [
      {
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { content: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
          { tags: { $in: [new RegExp(keyword, 'i')] } }
        ]
      },
      options.status ? { status: options.status } : {}
    ].filter(condition => Object.keys(condition).length > 0)
  };
  
  return this.find(searchConditions.length > 1 ? { $and: searchConditions } : searchConditions[0] || {})
    .sort({ createdAt: -1 });
};

// Instance method to increment view count
newsSchema.methods.incrementViewCount = function() {
  this.viewCount = (this.viewCount || 0) + 1;
  return this.save();
};

// Instance method to check if news is published
newsSchema.methods.isPublished = function() {
  return this.status === 'published' && this.publishedAt <= new Date();
};

// Error handling for duplicate titles
newsSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    if (error.keyPattern && error.keyPattern.title) {
      const err = new Error('A news item with this title already exists');
      err.name = 'ValidationError';
      next(err);
    } else {
      next(error);
    }
  } else {
    next(error);
  }
});

const NewsModel = mongoose.models.News || mongoose.model("News", newsSchema);

module.exports = { 
  news: NewsModel,
  News: NewsModel
};