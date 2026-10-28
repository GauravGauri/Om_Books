import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  findSubstitutes,
} from '../services/productService.js';
import { Category, Manufacturer } from '../models/index.js';

export const listProducts = async (req, res, next) => {
  try {
    const result = await getProducts(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id, req.query.outletId);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const addProduct = async (req, res, next) => {
  try {
    const product = await createProduct(req.body, req.user, req);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const editProduct = async (req, res, next) => {
  try {
    const product = await updateProduct(req.params.id, req.body, req.user, req);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const getSubstitutes = async (req, res, next) => {
  try {
    const { genericName, excludeProductId, outletId } = req.query;
    const subs = await findSubstitutes(genericName, excludeProductId, outletId);
    res.json({ success: true, data: subs });
  } catch (err) {
    next(err);
  }
};

export const getMetadata = async (req, res, next) => {
  try {
    const [categories, manufacturers] = await Promise.all([
      Category.find({ isActive: true }).sort({ name: 1 }).lean(),
      Manufacturer.find({ isActive: true }).sort({ name: 1 }).lean(),
    ]);
    res.json({
      success: true,
      data: { categories, manufacturers },
    });
  } catch (err) {
    next(err);
  }
};
