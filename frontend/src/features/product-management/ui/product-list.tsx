import { FC } from 'react';
import { Card } from '@/shared/ui';
import { useProducts } from '../api';

export const ProductList: FC = () => {
  const { data, isLoading, error } = useProducts();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center">
        Error loading products: {error.message}
      </div>
    );
  }

  const products = data?.products || [];

  return (
    <div className="space-y-4">
      {products.length === 0 ? (
        <Card>
          <p className="text-gray-500 text-center py-8">
            No products found. Create your first one!
          </p>
        </Card>
      ) : (
        products.map((product) => (
          <Card key={product.id}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{product.name}</h3>
                {product.description && (
                  <p className="text-gray-600 mt-1">{product.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm font-medium">${product.price}</span>
                  <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                  <span className="text-sm text-gray-500">SKU: {product.sku}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Created: {new Date(product.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};
