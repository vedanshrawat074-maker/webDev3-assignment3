const express = require('express');
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateStock,
  getLowStock,
  getSummary,
} = require('../controllers/productController');

const router = express.Router();

// Static routes MUST be declared before "/:id",
// otherwise "low-stock" and "summary" would be treated as an ID.
router.get('/low-stock', getLowStock);
router.get('/summary', getSummary);

router.route('/').post(createProduct).get(getProducts);

router.route('/:id').get(getProductById).put(updateProduct).delete(deleteProduct);

router.patch('/:id/stock', updateStock);

module.exports = router;