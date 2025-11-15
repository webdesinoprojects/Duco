const express = require("express")
const {SubCreateCatogry,getallsubcategory,getSubcategoriesByCategoryId, updateSubcategory, deleteSubcategory} = require("../Controller/CategoryController")

const router = express();

router.get("/getallsubctg",getallsubcategory)
router.post("/create",SubCreateCatogry)
router.get("/subcat/:categoryId",getSubcategoriesByCategoryId)
router.put("/update/:id", updateSubcategory)
router.delete("/delete/:id", deleteSubcategory)


module.exports = router;