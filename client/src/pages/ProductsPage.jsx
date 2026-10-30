import React, { useState, useEffect } from 'react';
import {
  Pill,
  Search,
  Plus,
  Filter,
  Sparkles,
  Edit2,
  AlertTriangle,
  Download,
  CheckCircle,
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const ProductsPage = () => {
  const { currentOutlet } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    genericName: '',
    sku: '',
    barcode: '',
    hsnCode: '3004',
    category: '',
    manufacturer: '',
    dosageForm: 'Tablet',
    strength: '',
    packSize: '10 Tablets / Strip',
    uom: 'Strip',
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    gstRate: 12,
    minStockLevel: 20,
    scheduleType: 'OTC',
  });

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedSchedule, stockFilter, pagination.page, currentOutlet]);

  const fetchMetadata = async () => {
    try {
      const res = await apiClient.get('/products/metadata');
      setCategories(res.data?.categories || []);
      setManufacturers(res.data?.manufacturers || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/products', {
        params: {
          search,
          category: selectedCategory || undefined,
          scheduleType: selectedSchedule || undefined,
          page: pagination.page,
          outletId: currentOutlet?._id,
          limit: 15,
        },
      });
      setProducts(res.products || []);
      setPagination(res.pagination || { page: 1, total: 0, pages: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: '',
      genericName: '',
      sku: `MED-${Date.now().toString().slice(-6)}`,
      barcode: '',
      hsnCode: '3004',
      category: categories[0]?._id || '',
      manufacturer: manufacturers[0]?._id || '',
      dosageForm: 'Tablet',
      strength: '500mg',
      packSize: '10 Tablets / Strip',
      uom: 'Strip',
      purchasePrice: 20,
      sellingPrice: 30,
      mrp: 35,
      gstRate: 12,
      minStockLevel: 20,
      scheduleType: 'OTC',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      brand: p.brand || '',
      genericName: p.genericName,
      sku: p.sku,
      barcode: p.barcode || '',
      hsnCode: p.hsnCode || '3004',
      category: p.category?._id || p.category || '',
      manufacturer: p.manufacturer?._id || p.manufacturer || '',
      dosageForm: p.dosageForm || 'Tablet',
      strength: p.strength || '',
      packSize: p.packSize || '10 Tablets / Strip',
      uom: p.uom || 'Strip',
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      mrp: p.mrp,
      gstRate: p.gstRate || 12,
      minStockLevel: p.minStockLevel || 20,
      scheduleType: p.scheduleType || 'OTC',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await apiClient.put(`/products/${editingProduct._id}`, formData);
      } else {
        await apiClient.post('/products', formData);
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Medicine & Product Catalog</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Master database of pharmaceuticals, generic salts, schedule classifications and pricing
          </p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAdd}>
          Add New Medicine
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by medicine name, generic composition, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSchedule}
            onChange={(e) => setSelectedSchedule(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">All Schedules</option>
            <option value="OTC">OTC (Over the counter)</option>
            <option value="Schedule H">Schedule H</option>
            <option value="Schedule H1">Schedule H1 (Controlled)</option>
            <option value="Schedule X">Schedule X</option>
          </select>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Medicine Details</th>
                <th className="py-3 px-3">Manufacturer</th>
                <th className="py-3 px-3">Classification</th>
                <th className="py-3 px-3 text-right">Cost</th>
                <th className="py-3 px-3 text-right">MRP</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">In Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    Loading medicines catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No medicines match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const inStock = p.currentStock > 0;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{p.name}</span>
                        <span className="text-[10px] text-slate-400 truncate block max-w-xs">{p.genericName}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{p.manufacturer?.shortName || p.manufacturer?.name || 'N/A'}</td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            p.scheduleType === 'OTC'
                              ? 'default'
                              : p.scheduleType === 'Schedule H1'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {p.scheduleType}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {formatCurrency(p.purchasePrice)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">{formatCurrency(p.mrp)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(p.sellingPrice)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            inStock ? 'text-slate-800' : 'text-red-500 font-black'
                          }`}
                        >
                          {p.currentStock || 0} {p.uom}s
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="p-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.pages} ({pagination.total} medicines)
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Medicine Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'Edit Medicine Details' : 'Add New Medicine to Master'}
        subtitle="Configure generic composition, schedule drug compliance and pricing"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Medicine Commercial Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Calpol 650 Tablet"
              required
            />
            <Input
              label="Brand / Trademark"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="e.g. Calpol"
            />
          </div>

          <Input
            label="Generic Composition (Active Salts)"
            value={formData.genericName}
            onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
            placeholder="e.g. Paracetamol 650mg"
            helperText="Crucial for automatic alternative brand substitute recommendations"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="SKU Code"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              required
            />
            <Input
              label="Barcode / EAN"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="e.g. 8901030010011"
            />
            <Input
              label="HSN Code"
              value={formData.hsnCode}
              onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Therapeutic Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                required
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Manufacturer</label>
              <select
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                required
              >
                {manufacturers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Purchase Cost (₹)"
              type="number"
              step="0.1"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="MRP (₹)"
              type="number"
              step="0.1"
              value={formData.mrp}
              onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Selling Price (₹)"
              type="number"
              step="0.1"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="GST Slab (%)"
              type="number"
              value={formData.gstRate}
              onChange={(e) => setFormData({ ...formData, gstRate: parseInt(e.target.value) || 12 })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Schedule Classification</label>
              <select
                value={formData.scheduleType}
                onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
              >
                <option value="OTC">OTC (Over The Counter)</option>
                <option value="Schedule H">Schedule H (Prescription Required)</option>
                <option value="Schedule H1">Schedule H1 (Controlled Drug Register)</option>
                <option value="Schedule X">Schedule X (Narcotics)</option>
              </select>
            </div>

            <Input
              label="Min Reorder Stock Alert"
              type="number"
              value={formData.minStockLevel}
              onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 20 })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
