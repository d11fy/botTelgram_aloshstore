export interface Category {
  id: string;
  name: string;
  name_en?: string;
  icon: string;
  sort_order: number;
  status: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  categories?: Category;
  price: number;
  cost: number;
  duration: string;
  activation_method?: string;
  warranty?: string;
  notes?: string;
  image_url?: string;
  required_info_type?: string;
  required_info_prompt?: string;
  status: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: "bank" | "wallet" | "crypto";
  value: string;
  beneficiary_name?: string;
  instructions?: string;
  icon: string;
  status: boolean;
  sort_order: number;
  created_at: string;
}

export interface User {
  id: string;
  telegram_id: number;
  name?: string;
  username?: string;
  phone?: string;
  email?: string;
  is_blocked: boolean;
  created_at: string;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "completed"
  | "rejected"
  | "cancelled";

export interface Order {
  id: string;
  order_number: string;
  user_id?: string;
  users?: User;
  product_id?: string;
  products?: Product;
  product_name: string;
  product_duration: string;
  price: number;
  payment_method_id?: string;
  payment_methods?: PaymentMethod;
  payment_method_name: string;
  proof_image?: string;
  txid?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_notes?: string;
  notes?: string;
  status: OrderStatus;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  telegram_id?: number;
  username: string;
  name?: string;
  role: "admin" | "employee";
  is_active: boolean;
  created_at: string;
}

export interface DashboardStats {
  todayOrders: number;
  totalRevenue: number;
  netProfit: number;
  topProduct: string;
  pendingOrders: number;
  completedOrders: number;
}
