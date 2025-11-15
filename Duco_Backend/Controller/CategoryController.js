const CategoryModel = require("../DataBase/Models/Category")

const SubCategoryModel = require("../DataBase/Models/subCategory")

const CreateCatogry =async(req, res)=>{
 
    const {category} = req.body;


    try {

        const ctg =  new CategoryModel({
            category:category,
           
        })
          const rt = await ctg.save();

          res.status(200).json({
            message:
                "Catgory is Created ",
                category:rt

          })
        
    } catch (error) {
        console.log(`Error in CraeteCatgoryController ${error}` )
         res.status(500).send({ message: "Fetching failed", error });
        
    }



}


const getallCatgory = async(req,res)=>{

    

    try {

        const ref = await CategoryModel.find();
        res.status(200).json({
            message:"Get All Category",
            category:ref
        })
        
    } catch (error) {
        console.log(`Error In getallCatgory : ${error}`)
           res.status(500).send({ message: "Fetching subcategories failed", error });

    }
}

const SubCreateCatogry =async(req, res)=>{
 
    const {subcatogry,categoryId  } = req.body;


    try {

        const ctg =  new SubCategoryModel({
            subcatogry:subcatogry,
            categoryId:categoryId
        })
          const rt = await ctg.save();

          res.status(200).json({
            message:
                "SubCatogry is Created ",
                category:rt

          })
        
    } catch (error) {
        console.log(`Error in CraeteCatgoryController ${error}` )
         res.status(500).send({ message: "Subcategory creation failed", error });
        
    }



}

const getallsubcategory = async (req,res)=>{

    try {

        const subCategory = await SubCategoryModel.find().populate("categoryId")
        res.status(200).json({
          message: "All SubCategories Fetched",
          subCategory,
            });
        
    } catch (error) {
         console.error("Error in getAllSubCategories:", error);
    res.status(500).send({ message: "Fetching subcategories failed", error });
        
    }
}
const getSubcategoriesByCategoryId = async (req, res) => {
  const { categoryId } = req.params;

  try {
    const subcategories = await SubCategoryModel.find({ categoryId: categoryId });

    res.status(200).json({
      success: true,
      count: subcategories.length,
      data: subcategories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Update Category
const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { category } = req.body;

  try {
    const updatedCategory = await CategoryModel.findByIdAndUpdate(
      id,
      { category },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Failed to update category", error });
  }
};

// Delete Category
const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    // First, delete all subcategories associated with this category
    await SubCategoryModel.deleteMany({ categoryId: id });

    // Then delete the category
    const deletedCategory = await CategoryModel.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category and associated subcategories deleted successfully",
      category: deletedCategory,
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Failed to delete category", error });
  }
};

// Update Subcategory
const updateSubcategory = async (req, res) => {
  const { id } = req.params;
  const { subcatogry, categoryId } = req.body;

  try {
    const updatedSubcategory = await SubCategoryModel.findByIdAndUpdate(
      id,
      { subcatogry, categoryId },
      { new: true }
    ).populate("categoryId");

    if (!updatedSubcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    res.status(200).json({
      message: "Subcategory updated successfully",
      subcategory: updatedSubcategory,
    });
  } catch (error) {
    console.error("Error updating subcategory:", error);
    res.status(500).json({ message: "Failed to update subcategory", error });
  }
};

// Delete Subcategory
const deleteSubcategory = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedSubcategory = await SubCategoryModel.findByIdAndDelete(id);

    if (!deletedSubcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    res.status(200).json({
      message: "Subcategory deleted successfully",
      subcategory: deletedSubcategory,
    });
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    res.status(500).json({ message: "Failed to delete subcategory", error });
  }
};

module.exports = {
        CreateCatogry,
        SubCreateCatogry,
        getallCatgory,
        getallsubcategory,
        getSubcategoriesByCategoryId,
        updateCategory,
        deleteCategory,
        updateSubcategory,
        deleteSubcategory
}