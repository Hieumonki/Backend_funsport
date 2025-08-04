const express = require("express");
const router = express.Router();
const categoryCon = require("../controllers/categoryCon");

// ADMIN APIs
router.post("/", categoryCon.addcategory);            
router.get("/", categoryCon.getAllcategory);          
router.get("/:id", categoryCon.getAncategory);       
router.put("/:id", categoryCon.updatecategory);      
router.delete("/:id", categoryCon.deletecategory); 

// USER APIs
router.get("/active", categoryCon.getActiveCategories); 

module.exports = router;
