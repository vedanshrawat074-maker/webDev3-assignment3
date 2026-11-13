require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const products = [
  { name: 'Wireless Mouse', sku: 'ELEC-MS-101', category: 'Electronics', price: 799, quantity: 25, reorderLevel: 10, supplier: 'Logitech India' },
  { name: 'Bluetooth Speaker', sku: 'ELEC-SP-102', category: 'Electronics', price: 2499, quantity: 8, reorderLevel: 10, supplier: 'boAt' },
  { name: 'Smart Watch', sku: 'ELEC-SW-103', category: 'Electronics', price: 4999, quantity: 5, reorderLevel: 8, supplier: 'Noise' },
  { name: 'Mechanical Keyboard', sku: 'ELEC-KB-104', category: 'Electronics', price: 3499, quantity: 30, reorderLevel: 10, supplier: 'Redragon' },
  { name: 'Study Table', sku: 'FURN-TB-812', category: 'Furniture', price: 3999, quantity: 2, reorderLevel: 4, supplier: 'IKEA India' },
  { name: 'Office Chair', sku: 'FURN-CH-813', category: 'Furniture', price: 6499, quantity: 15, reorderLevel: 5, supplier: 'Godrej Interio' },
  { name: 'Gel Pen Pack of 15', sku: 'STNY-PN-713', category: 'Stationery', price: 120, quantity: 40, reorderLevel: 20, supplier: 'Cello Pens' },
  { name: 'A4 Notebook', sku: 'STNY-NB-714', category: 'Stationery', price: 85, quantity: 15, reorderLevel: 20, supplier: 'Classmate' },
  { name: 'Marker Set', sku: 'STNY-MK-715', category: 'Stationery', price: 250, quantity: 60, reorderLevel: 25, supplier: 'Camlin' },
  { name: 'Cotton T-Shirt', sku: 'APRL-TS-501', category: 'Apparel', price: 599, quantity: 40, reorderLevel: 15, supplier: 'Allen Solly' },
  { name: 'Denim Jacket', sku: 'APRL-JK-502', category: 'Apparel', price: 2199, quantity: 38, reorderLevel: 10, supplier: 'Levis' },
  { name: 'Basmati Rice 5kg', sku: 'GROC-RC-901', category: 'Grocery', price: 650, quantity: 50, reorderLevel: 20, supplier: 'India Gate' },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Product.deleteMany({});
    await Product.create(products);
    console.log(`Seeded ${products.length} products`);
  } catch (err) {
    console.error(err.message);
  } finally {
    await mongoose.disconnect();
  }
})();