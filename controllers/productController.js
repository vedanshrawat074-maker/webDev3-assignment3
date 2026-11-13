const Product = require('../models/Product');

// ---------- helpers ----------

// Wraps async handlers so any rejected promise reaches the centralized error handler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const SORTABLE_FIELDS = [
  'name', 'sku', 'category', 'price', 'quantity',
  'reorderLevel', 'supplier', 'createdAt', 'updatedAt',
];

// "?sort=-price,name" -> "-price name" (only whitelisted fields)
const buildSort = (sortParam) => {
  if (!sortParam) return '-createdAt';
  const fields = String(sortParam)
    .split(',')
    .map((f) => f.trim())
    .filter((f) => SORTABLE_FIELDS.includes(f.replace(/^-/, '')));
  return fields.length ? fields.join(' ') : '-createdAt';
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- CRUD ----------

// POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

// GET /api/products?category=&supplier=&search=&minPrice=&maxPrice=&sort=&page=&limit=
const getProducts = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  // String() prevents NoSQL operator injection like ?category[$ne]=x
  const filter = {};
  if (req.query.category) filter.category = String(req.query.category);
  if (req.query.supplier) filter.supplier = String(req.query.supplier);
  if (req.query.search) {
    filter.name = { $regex: escapeRegex(String(req.query.search)), $options: 'i' };
  }

  const min = parseFloat(req.query.minPrice);
  const max = parseFloat(req.query.maxPrice);
  if (!Number.isNaN(min) || !Number.isNaN(max)) {
    filter.price = {};
    if (!Number.isNaN(min)) filter.price.$gte = min;
    if (!Number.isNaN(max)) filter.price.$lte = max;
  }

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort(buildSort(req.query.sort))
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  res.status(200).json({
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count: products.length,
    products,
  });
});

// GET /api/products/:id
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw httpError(404, 'Product not found');
  res.status(200).json(product);
});

// PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) throw httpError(404, 'Product not found');
  res.status(200).json(product);
});

// DELETE /api/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw httpError(404, 'Product not found');
  res.status(200).json({ message: 'Product deleted', id: product.id });
});

// ---------- Stock adjustment ----------

// PATCH /api/products/:id/stock   body: { "change": 10 } or { "change": -3 }
const updateStock = asyncHandler(async (req, res) => {
  const { change } = req.body || {};

  if (typeof change !== 'number' || !Number.isFinite(change)) {
    throw httpError(400, '"change" must be a valid number');
  }

  // Atomic update: the filter guarantees quantity never drops below zero,
  // even when two sale requests hit the server at the same time.
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, quantity: { $gte: -change } },
    { $inc: { quantity: change } },
    { new: true, runValidators: true }
  );

  if (!product) {
    // Either the product doesn't exist, or the stock was insufficient
    const existing = await Product.findById(req.params.id).select('quantity');
    if (!existing) throw httpError(404, 'Product not found');
    throw httpError(
      400,
      `Insufficient stock: current quantity is ${existing.quantity}, cannot change by ${change}`
    );
  }

  res.status(200).json({ message: 'Stock updated', product });
});

// ---------- Reports / Aggregations ----------

// GET /api/products/low-stock
const getLowStock = asyncHandler(async (req, res) => {
  // $expr lets us compare two fields of the same document
  const lowStockItems = await Product.find({
    $expr: { $lte: ['$quantity', '$reorderLevel'] },
  }).sort('quantity');

  res.status(200).json({ count: lowStockItems.length, lowStockItems });
});

// GET /api/products/summary
const getSummary = asyncHandler(async (req, res) => {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        avgPrice: { $avg: '$price' },
      },
    },
    {
      $project: {
        totalItems: 1,
        totalQuantity: 1,
        totalStockValue: 1,
        avgPrice: { $round: ['$avgPrice', 2] },
      },
    },
    { $sort: { totalStockValue: -1 } },
  ]);

  res.status(200).json({ categories: summary.length, summary });
});

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateStock,
  getLowStock,
  getSummary,
};