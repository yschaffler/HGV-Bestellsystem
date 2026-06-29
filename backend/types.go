package main

import "time"

//Type definition for a product as defined in the database schema
type Product struct {
	Product_Id int     `json:"product_id"`
	Price      float64 `json:"price"`
	Name       string  `json:"name"`
	Category   int     `json:"category"`
}

//Type definition for a product category as defined in the database schema
type Category struct {
	Category_Id int    `json:"category_id"`
	Name        string `json:"category_name"`
	Color       string `json:"category_color"`
}

// Order and PayRequest kept for backwards compatibility with the bar page
type Order struct {
	Id      int     `json:"order_id"`
	Product int     `json:"order_product"`
	Amount  int     `json:"order_amount"`
	Price   float64 `json:"order_price"`
	Payed   bool    `json:"order_payed"`
	Table   int     `json:"order_table"`
}

//PayItem and PayRequest are used for handling payment of an order
type PayItem struct {
	Product int `json:"product"`
	Amount  int `json:"amount"`
}

type PayRequest struct {
	Table int       `json:"table"`
	Items []PayItem `json:"items"`
}

// RechnungPosition is a line item within a Rechnung
type RechnungPosition struct {
	ProductId int     `json:"product_id"`
	Name      string  `json:"name"`
	Amount    int     `json:"amount"`
	Price     float64 `json:"price"`
	Kategorie string  `json:"kategorie"`
	Note      string  `json:"note,omitempty"`
}

// Rechnung represents a closed invoice or a cancellation (Storno)
type Rechnung struct {
	Id         int                `json:"rechnung_id"`
	Tisch      int                `json:"rechnung_tisch"`
	Typ        string             `json:"rechnung_typ"` // "RECHNUNG" or "STORNO"
	ErstelltAm time.Time          `json:"rechnung_erstellt_am"`
	Gesamt     float64            `json:"rechnung_gesamt"` // negative for STORNO
	Positionen []RechnungPosition `json:"rechnung_positionen"`
	KellnerId  string             `json:"rechnung_kellner_id"`
}

// CreateRechnungRequest is the POST body for /add/rechnung/
type CreateRechnungRequest struct {
	Tisch      int                `json:"tisch"`
	Typ        string             `json:"typ"` // "RECHNUNG" or "STORNO"
	Gesamt     float64            `json:"gesamt"`
	Positionen []RechnungPosition `json:"positionen"`
	KellnerId  string             `json:"kellner_id"`
	Note       string             `json:"note"`
}

// PrinterRule defines which printer receives an order item.
// TableFrom/TableTo are optional (nil = no restriction).
// Categories is optional (empty = all categories).
type PrinterRule struct {
	ID         string   `json:"id"`
	BarName    string   `json:"barName"`
	TableFrom  *int     `json:"tableFrom"`
	TableTo    *int     `json:"tableTo"`
	Categories []string `json:"categories"`
	AccountId  string   `json:"accountId"` // optional: only match orders from this kellner_id
}

// PrinterSettingsConfig is the full printer configuration stored in the DB.
type PrinterSettingsConfig struct {
	PrintBarOrders bool          `json:"printBarOrders"`
	Rules          []PrinterRule `json:"rules"`
}

//Type definition for a user as defined in the database schema
type User struct {
	Id       int    `json:"user_id"`
	Username string `json:"user_username"`
	Name     string `json:"user_realname"`
	Password string `json:"user_password"`
	Role     string `json:"user_role"`
}

//Type definition for a login request containing all the necessary information needed for user authentication
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}
