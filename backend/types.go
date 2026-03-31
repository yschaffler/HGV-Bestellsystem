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
}
