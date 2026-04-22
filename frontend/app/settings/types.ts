export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type User = {
  id: string;
  username: string;
  password: string;
  role: "ADMIN" | "KELLNER";
};

export type DeleteDialog =
  | { type: "product"; id: string; name: string }
  | { type: "category"; name: string }
  | { type: "user"; id: string; name: string }
  | null;

export type ApiUser = { 
  user_id: number; 
  user_username: string; 
  user_password: string; 
  user_role: "ADMIN" | "KELLNER" 
};

export type ApiCategory = { 
  category_id: number; 
  category_name: string; 
  category_color: string 
};

export type ApiProduct = { 
  product_id: number; 
  price: number; 
  name: string; 
  category: number 
};
