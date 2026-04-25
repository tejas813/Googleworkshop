export interface UserProfile {
  gender: string;
  age: number | string;
  city: string;
  style: string;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  description: string;
  category: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  products?: Product[];
}
