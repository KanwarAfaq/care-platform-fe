import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
interface CareCenter {
  id?: number;
  name: string;
  address: string;
  phone: string;
  capacity: number;
  district: string;
}

const emptyForm: CareCenter = {
  name: '',
  address: '',
  phone: '',
  capacity: 0,
  district: '桃園區',
};

export default function AdminDashboard() {
  const [centers, setCenters] = useState<CareCenter[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CareCenter>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('care_centers')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      if (data) setCenters(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (center: CareCenter) => {
    setEditingId(center.id || null);
    setFormData(center);
    setIsModalOpen(true);
  };

  // Save (Insert or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('care_centers')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('care_centers')
          .insert([formData]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchCenters(); // Refresh list
    } catch (error) {
      console.error('Error saving record:', error);
      alert('儲存失敗 (Save failed)');
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`確定要刪除「${name}」嗎？`)) return;

    try {
      const { error } = await supabase
        .from('care_centers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCenters(centers.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('刪除失敗');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">機構管理後台 (Admin Dashboard)</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          onClick={handleOpenCreate}
        >
          + 新增機構 (Add New)
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">載入中...</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-4 font-semibold text-gray-600">ID</th>
                <th className="p-4 font-semibold text-gray-600">名稱</th>
                <th className="p-4 font-semibold text-gray-600">區域</th>
                <th className="p-4 font-semibold text-gray-600">電話</th>
                <th className="p-4 font-semibold text-gray-600">床位</th>
                <th className="p-4 font-semibold text-gray-600 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {centers.map((center) => (
                <tr key={center.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 text-gray-500">{center.id}</td>
                  <td className="p-4 font-medium text-gray-800">{center.name}</td>
                  <td className="p-4 text-gray-600">{center.district}</td>
                  <td className="p-4 text-gray-600">{center.phone}</td>
                  <td className="p-4 text-gray-600">{center.capacity}</td>
                  <td className="p-4 text-center space-x-2">
                    <button
                      className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded hover:bg-yellow-200 transition"
                      onClick={() => handleOpenEdit(center)}
                    >
                      編輯
                    </button>
                    <button
                      className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition"
                      onClick={() => handleDelete(center.id!, center.name)}
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Create / Edit Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {editingId ? '編輯機構 (Edit Center)' : '新增機構 (Add Center)'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">機構名稱 (Name)</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">行政區 (District)</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地址 (Address)</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話 (Phone)</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">核定床位 (Capacity)</label>
                <input
                  type="number"
                  required
                  className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100"
                  onClick={() => setIsModalOpen(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}