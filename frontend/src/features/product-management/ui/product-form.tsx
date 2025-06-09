import { FC, FormEvent, useState } from 'react';
import { Button, Input } from '@/shared/ui';
import { useCreateProduct } from '../api';
import {
  type CreateProductInput,
  validateCreateProductInputWithErrors,
} from '@/shared/types/product';

interface ProductFormProps {
  onSuccess?: () => void;
}

export const ProductForm: FC<ProductFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(0);
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  
  const [nameError, setNameError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [stockError, setStockError] = useState('');
  const [skuError, setSkuError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  
  const { mutate: createProduct, isPending, error } = useCreateProduct();

  const validateForm = (): CreateProductInput | null => {
    const validation = validateCreateProductInputWithErrors({ 
      name, 
      description, 
      price,
      stock,
      sku,
      category
    });
    
    if (validation.success) {
      setNameError('');
      setDescriptionError('');
      setPriceError('');
      setStockError('');
      setSkuError('');
      setCategoryError('');
      return validation.data;
    }

    setNameError(validation.errors?.name || '');
    setDescriptionError(validation.errors?.description || '');
    setPriceError(validation.errors?.price || '');
    setStockError(validation.errors?.stock || '');
    setSkuError(validation.errors?.sku || '');
    setCategoryError(validation.errors?.category || '');
    return null;
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.trim()) {
      const validation = validateCreateProductInputWithErrors({
        name: value,
        description: description || undefined,
        price,
        stock,
        sku,
        category
      });
      if (!validation.success && validation.errors?.name) {
        setNameError(validation.errors.name);
      } else {
        setNameError('');
      }
    } else {
      setNameError('');
    }
  };

  const isFormValid = name.trim() && price.trim() && sku.trim() && category.trim() && 
                     !nameError && !priceError && !skuError && !categoryError;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Validate form with zod
    const validatedInput = validateForm();
    if (!validatedInput) {
      return;
    }

    createProduct(validatedInput, {
      onSuccess: () => {
        setName('');
        setDescription('');
        setPrice('');
        setStock(0);
        setSku('');
        setCategory('');
        setNameError('');
        setDescriptionError('');
        setPriceError('');
        setStockError('');
        setSkuError('');
        setCategoryError('');
        onSuccess?.();
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
      aria-label="Create new product"
    >
      <h2 className="text-lg font-semibold mb-4">Create New Product</h2>
      
      <Input
        label="Name *"
        type="text"
        value={name}
        onChange={handleNameChange}
        placeholder="Enter product name"
        isRequired
        isDisabled={isPending}
        error={nameError}
        autoComplete="off"
      />

      <Input
        label="Description"
        type="text"
        value={description}
        onChange={setDescription}
        placeholder="Enter description (optional)"
        isDisabled={isPending}
        error={descriptionError}
        autoComplete="off"
      />

      <Input
        label="Price *"
        type="text"
        value={price}
        onChange={setPrice}
        placeholder="0.00"
        isRequired
        isDisabled={isPending}
        error={priceError}
        autoComplete="off"
      />

      <Input
        label="Stock *"
        type="number"
        value={stock.toString()}
        onChange={(value) => setStock(parseInt(value) || 0)}
        placeholder="0"
        isRequired
        isDisabled={isPending}
        error={stockError}
        autoComplete="off"
      />

      <Input
        label="SKU *"
        type="text"
        value={sku}
        onChange={setSku}
        placeholder="Enter SKU"
        isRequired
        isDisabled={isPending}
        error={skuError}
        autoComplete="off"
      />

      <Input
        label="Category *"
        type="text"
        value={category}
        onChange={setCategory}
        placeholder="Enter category"
        isRequired
        isDisabled={isPending}
        error={categoryError}
        autoComplete="off"
      />

      {error && (
        <div
          className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-md"
          role="alert"
          aria-live="polite"
        >
          <strong>Error:</strong> {error.message}
        </div>
      )}

      <Button
        type="submit"
        isDisabled={isPending || !isFormValid}
        aria-describedby={isPending ? 'submit-status' : undefined}
      >
        {isPending ? 'Creating...' : 'Create Product'}
      </Button>

      {isPending && (
        <div id="submit-status" className="sr-only" aria-live="polite">
          Creating product, please wait...
        </div>
      )}
    </form>
  );
};
