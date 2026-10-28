import { Product, InventoryBatch, Category, Manufacturer } from '../models/index.js';
import { logAudit } from '../middleware/auth.js';

export const getProducts = async ({
  search = '',
  category,
  manufacturer,
  scheduleType,
  status = 'Active',
  page = 1,
  limit = 50,
  outletId,
}) => {
  const query = {};

  if (status && status !== 'All') {
    query.status = status;
  }

  if (category) {
    query.category = category;
  }

  if (manufacturer) {
    query.manufacturer = manufacturer;
  }

  if (scheduleType) {
    query.scheduleType = scheduleType;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { genericName: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const total = await Product.countDocuments(query);

  const products = await Product.find(query)
    .populate('category', 'name')
    .populate('manufacturer', 'name shortName')
    .sort({ name: 1 })
    .skip(skip)
    .limit(parseInt(limit, 10))
    .lean();

  // If outletId is provided, attach active stock & nearest expiry batch
  if (outletId && products.length > 0) {
    const productIds = products.map((p) => p._id);
    const batches = await InventoryBatch.find({
      product: { $in: productIds },
      outlet: outletId,
      availableQuantity: { $gt: 0 },
      expiryDate: { $gt: new Date() },
    })
      .sort({ expiryDate: 1 })
      .lean();

    const batchMap = {};
    for (const batch of batches) {
      const pid = batch.product.toString();
      if (!batchMap[pid]) {
        batchMap[pid] = {
          totalStock: 0,
          batchesCount: 0,
          nearestExpiry: batch.expiryDate,
          batches: [],
        };
      }
      batchMap[pid].totalStock += batch.availableQuantity;
      batchMap[pid].batchesCount += 1;
      batchMap[pid].batches.push(batch);
    }

    products.forEach((p) => {
      const bInfo = batchMap[p._id.toString()];
      p.currentStock = bInfo ? bInfo.totalStock : 0;
      p.batchesCount = bInfo ? bInfo.batchesCount : 0;
      p.nearestExpiry = bInfo ? bInfo.nearestExpiry : null;
      p.batches = bInfo ? bInfo.batches : [];
    });
  }

  return {
    products,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};

export const getProductById = async (id, outletId) => {
  const product = await Product.findById(id)
    .populate('category')
    .populate('manufacturer')
    .lean();

  if (!product) {
    throw new Error('Product not found');
  }

  if (outletId) {
    const batches = await InventoryBatch.find({
      product: id,
      outlet: outletId,
      availableQuantity: { $gt: 0 },
    })
      .sort({ expiryDate: 1 })
      .lean();

    product.batches = batches;
    product.currentStock = batches.reduce((acc, b) => acc + b.availableQuantity, 0);
  }

  return product;
};

export const createProduct = async (data, user, req) => {
  const existing = await Product.findOne({
    $or: [{ sku: data.sku }, ...(data.barcode ? [{ barcode: data.barcode }] : [])],
  });

  if (existing) {
    throw new Error(`Product with SKU '${data.sku}' or Barcode '${data.barcode}' already exists.`);
  }

  const product = await Product.create(data);

  await logAudit({
    user,
    action: 'CREATE_PRODUCT',
    module: 'Products',
    details: { productId: product._id, name: product.name, sku: product.sku },
    req,
  });

  return product;
};

export const updateProduct = async (id, data, user, req) => {
  const product = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!product) {
    throw new Error('Product not found');
  }

  await logAudit({
    user,
    action: 'UPDATE_PRODUCT',
    module: 'Products',
    details: { productId: product._id, name: product.name },
    req,
  });

  return product;
};

export const findSubstitutes = async (genericName, excludeProductId, outletId) => {
  if (!genericName) return [];

  // Match products with similar generic compositions (active salt)
  const query = {
    genericName: { $regex: genericName.split('+')[0].trim(), $options: 'i' },
    status: 'Active',
    ...(excludeProductId && { _id: { $ne: excludeProductId } }),
  };

  const substitutes = await Product.find(query)
    .populate('category', 'name')
    .populate('manufacturer', 'name')
    .limit(10)
    .lean();

  if (outletId && substitutes.length > 0) {
    const subIds = substitutes.map((s) => s._id);
    const batches = await InventoryBatch.find({
      product: { $in: subIds },
      outlet: outletId,
      availableQuantity: { $gt: 0 },
      expiryDate: { $gt: new Date() },
    }).lean();

    const stockMap = {};
    for (const b of batches) {
      const pid = b.product.toString();
      stockMap[pid] = (stockMap[pid] || 0) + b.availableQuantity;
    }

    substitutes.forEach((s) => {
      s.currentStock = stockMap[s._id.toString()] || 0;
    });
  }

  return substitutes;
};
