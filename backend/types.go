package main

type Product struct {
	Product_Id int     `json:"product_id"`
	Price      float64 `json:"price"`
	Name       string  `json:"name"`
	Category   int     `json:"category"`
}

type Category struct {
	Category_Id int    `json:"category_id"`
	Name        string `json:"category_name"`
	Color       string `json:"category_color"`
}

type Order struct {
	Id      int     `json:"order_id"`
	Product int     `json:"order_product"`
	Amount  int     `json:"order_amount"`
	Price   float64 `json:"order_price"`
	Payed   bool    `json:"order_payed"`
	Table   int     `json:"order_table"`
}
