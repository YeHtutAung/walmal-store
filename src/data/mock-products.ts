import type { Product, ProductVariant } from '@/types/product'

export const mockProducts: Product[] = [
  {
    productId: 'prod-001',
    name: 'Classic White T-Shirt',
    slug: 'classic-white-tshirt',
    brand: 'Walmal Basics',
    description: 'A timeless white t-shirt made from 100% organic cotton. Comfortable, breathable, and perfect for everyday wear.',
    primaryImageUrl: '/images/products/tshirt-white.jpg',
    lowestPrice: 19.99,
    currency: 'USD',
    categoryName: 'Clothing',
  },
  {
    productId: 'prod-002',
    name: 'Leather Crossbody Bag',
    slug: 'leather-crossbody-bag',
    brand: 'Walmal Accessories',
    description: 'Genuine leather crossbody bag with adjustable strap. Features multiple compartments for organized storage.',
    primaryImageUrl: '/images/products/bag-leather.jpg',
    lowestPrice: 59.99,
    currency: 'USD',
    categoryName: 'Accessories',
  },
  {
    productId: 'prod-003',
    name: 'Wireless Bluetooth Headphones',
    slug: 'wireless-bluetooth-headphones',
    brand: 'SoundWave',
    description: 'Premium over-ear wireless headphones with active noise cancellation. Up to 30 hours of battery life.',
    primaryImageUrl: '/images/products/headphones.jpg',
    lowestPrice: 89.99,
    currency: 'USD',
    categoryName: 'Electronics',
  },
  {
    productId: 'prod-004',
    name: 'Running Sneakers',
    slug: 'running-sneakers',
    brand: 'StrideFlex',
    description: 'Lightweight running shoes with responsive cushioning and breathable mesh upper. Ideal for daily runs.',
    primaryImageUrl: '/images/products/sneakers.jpg',
    lowestPrice: 74.99,
    currency: 'USD',
    categoryName: 'Footwear',
  },
  {
    productId: 'prod-005',
    name: 'Stainless Steel Water Bottle',
    slug: 'stainless-steel-water-bottle',
    brand: 'HydroKeep',
    description: 'Double-walled vacuum insulated water bottle. Keeps drinks cold for 24 hours or hot for 12 hours. 750ml capacity.',
    primaryImageUrl: '/images/products/water-bottle.jpg',
    lowestPrice: 24.99,
    currency: 'USD',
    categoryName: 'Home & Kitchen',
  },
  {
    productId: 'prod-006',
    name: 'Organic Scented Candle',
    slug: 'organic-scented-candle',
    brand: 'GlowCraft',
    description: 'Hand-poured soy wax candle with natural essential oils. Burns for up to 50 hours. Lavender & vanilla scent.',
    primaryImageUrl: '/images/products/candle.jpg',
    lowestPrice: 14.99,
    currency: 'USD',
    categoryName: 'Home & Kitchen',
  },
]

export const mockVariants: Record<string, ProductVariant[]> = {
  'prod-001': [
    { variantId: 'var-001a', productId: 'prod-001', sku: 'TSH-WHT-S', name: 'Small', size: 'S', color: 'White', status: 'ACTIVE' },
    { variantId: 'var-001b', productId: 'prod-001', sku: 'TSH-WHT-M', name: 'Medium', size: 'M', color: 'White', status: 'ACTIVE' },
    { variantId: 'var-001c', productId: 'prod-001', sku: 'TSH-WHT-L', name: 'Large', size: 'L', color: 'White', status: 'ACTIVE' },
  ],
  'prod-002': [
    { variantId: 'var-002a', productId: 'prod-002', sku: 'BAG-LTH-BLK', name: 'Black', color: 'Black', status: 'ACTIVE' },
    { variantId: 'var-002b', productId: 'prod-002', sku: 'BAG-LTH-BRN', name: 'Brown', color: 'Brown', status: 'ACTIVE' },
  ],
  'prod-003': [
    { variantId: 'var-003a', productId: 'prod-003', sku: 'HP-BT-BLK', name: 'Black', color: 'Black', status: 'ACTIVE' },
    { variantId: 'var-003b', productId: 'prod-003', sku: 'HP-BT-WHT', name: 'White', color: 'White', status: 'ACTIVE' },
  ],
  'prod-004': [
    { variantId: 'var-004a', productId: 'prod-004', sku: 'SNK-RUN-9', name: 'Size 9', size: '9', status: 'ACTIVE' },
    { variantId: 'var-004b', productId: 'prod-004', sku: 'SNK-RUN-10', name: 'Size 10', size: '10', status: 'ACTIVE' },
    { variantId: 'var-004c', productId: 'prod-004', sku: 'SNK-RUN-11', name: 'Size 11', size: '11', status: 'ACTIVE' },
  ],
  'prod-005': [
    { variantId: 'var-005a', productId: 'prod-005', sku: 'WB-SS-750', name: 'Silver', color: 'Silver', status: 'ACTIVE' },
    { variantId: 'var-005b', productId: 'prod-005', sku: 'WB-SS-750-BLK', name: 'Matte Black', color: 'Black', status: 'ACTIVE' },
  ],
  'prod-006': [
    { variantId: 'var-006a', productId: 'prod-006', sku: 'CND-LAV', name: 'Lavender & Vanilla', status: 'ACTIVE' },
  ],
}
