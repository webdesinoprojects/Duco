const express = require('express')
const {CreateCatogry,getallCatgory, updateCategory, deleteCategory} = require("../Controller/CategoryController")

const router = express.Router();


router.post("/create",CreateCatogry)
router.get("/getall",getallCatgory)
router.put("/update/:id", updateCategory)
router.delete("/delete/:id", deleteCategory)


module.exports = router;
