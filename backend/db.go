package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func OpenDatabaseHandle() {
	if DB != nil {
		return
	}
	//Bei shell neustart passwort, host wieder neu in umgebungsvariable speichern
	password, ok := os.LookupEnv("BESTELLSERVICE_PASSWORD")
	if !ok {
		log.Fatalf("error looking up database password")
	}
	host, ok := os.LookupEnv("BESTELLSERVICE_HOST")
	if !ok {
		log.Fatalf("error looking up database host")
	}
	port, ok := os.LookupEnv("BESTELLSERVICE_PORT")
	if !ok {
		port = "3306"
	}
	dsn := fmt.Sprintf("root:%v@tcp(%v:%v)/bestellservice?charset=utf8mb4", password, host, port)
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("error creating handle to database: %v", err)
	}
	DB = db
}

func getAllProducts(db *sql.DB) ([]Product, error) {
	var products []Product
	rows, err := db.Query("SELECT * FROM test_produkte;")
	if err != nil {
		return []Product{}, fmt.Errorf("failed to retrieve products from database: %v", err)
	}
	defer rows.Close()
	for rows.Next() {
		p := Product{}
		err := rows.Scan(&p.Product_Id, &p.Price, &p.Name, &p.Category)
		if err != nil {
			return []Product{}, fmt.Errorf("failed to scan database response: %v", err)
		}
		products = append(products, p)
	}
	return products, nil
}

func insertProduct(p Product, db *sql.DB) error {
	query := fmt.Sprintf("insert into test_produkte (price, name, product_category) values (%v, \"%v\", %v);", p.Price, p.Name, p.Category)
	_, err := db.Exec(query)
	if err != nil {
		return err
	}
	return nil
}

func updateProduct(p Product, db *sql.DB) error {
	query := fmt.Sprintf("update test_produkte set price=%v, name=\"%v\", product_category=%v where id=%v;", p.Price, p.Name, p.Category, p.Product_Id)
	_, err := db.Exec(query)
	return err
}

func deleteProduct(id int, db *sql.DB) error {
	query := fmt.Sprintf("delete from test_produkte where id=%v;", id)
	_, err := db.Exec(query)
	return err
}

func getAllCategories(db *sql.DB) ([]Category, error) {
	var cats []Category
	rows, err := db.Query("SELECT * FROM produkt_kategorien;")
	if err != nil {
		return []Category{}, fmt.Errorf("failed to retrieve categories from database: %v", err)
	}
	defer rows.Close()
	for rows.Next() {
		c := Category{}
		err := rows.Scan(&c.Category_Id, &c.Name, &c.Color)
		if err != nil {
			return []Category{}, fmt.Errorf("failed to scan database response: %v", err)
		}
		cats = append(cats, c)
	}
	return cats, nil
}

func insertCategory(c Category, db *sql.DB) error {
	query := fmt.Sprintf("insert into produkt_kategorien (name) values (\"%v\");", c.Name)
	_, err := db.Exec(query)
	return err
}

func deleteCategory(id int, db *sql.DB) error {
	query := fmt.Sprintf("delete from produkt_kategorien where id=%v;", id)
	_, err := db.Exec(query)
	return err
}

func insertOrder(o Order, db *sql.DB) error {
	query := fmt.Sprintf("INSERT INTO bestellungen (product, amount, price, payed, table) VALUES (%v, %v, %v, %v, %v);", o.Product, o.Amount, o.Price, o.Payed, o.Table)
	_, err := db.Exec(query)
	return err
}

func getUnpaidOrders(db *sql.DB) ([]Order, error) {
	var orders []Order
	rows, err := db.Query("SELECT * FROM bestellungen WHERE payed=false;")
	if err != nil {
		return []Order{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var o Order
		err = rows.Scan(&o.Id, &o.Product, &o.Amount, &o.Price, &o.Payed, &o.Table)
		if err != nil {
			return []Order{}, err
		}
		orders = append(orders, o)
	}
	return orders, nil
}

func getOpenOrdersForTable(table int, db *sql.DB) ([]Order, error) {
	var orders []Order
	query := fmt.Sprintf("SELECT * FROM bestellungen WHERE table=%v AND payed=false;", table)
	rows, err := db.Query(query)
	if err != nil {
		return []Order{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var o Order
		err = rows.Scan(&o.Id, &o.Product, &o.Amount, &o.Price, &o.Payed, &o.Table)
		if err != nil {
			return []Order{}, err
		}
		orders = append(orders, o)
	}
	return orders, nil
}

func getAllOrdersForTable(table int, db *sql.DB) ([]Order, error) {
	var orders []Order
	query := fmt.Sprintf("SELECT * FROM bestellungen WHERE table=%v;", table)
	rows, err := db.Query(query)
	if err != nil {
		return []Order{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var o Order
		err = rows.Scan(&o.Id, &o.Product, &o.Amount, &o.Price, &o.Payed, &o.Table)
		if err != nil {
			return []Order{}, err
		}
		orders = append(orders, o)
	}
	return orders, nil
}

func getAllOrders(db *sql.DB) ([]Order, error) {
	var orders []Order
	rows, err := db.Query("SELECT * FROM bestellungen;")
	if err != nil {
		return []Order{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var o Order
		err = rows.Scan(&o.Id, &o.Product, &o.Amount, &o.Price, &o.Payed, &o.Table)
		if err != nil {
			return []Order{}, err
		}
		orders = append(orders, o)
	}
	return orders, nil
}

func updateOrder(o Order, db *sql.DB) error {
	query := fmt.Sprintf("UPDATE bestellungen SET product=%v, amount=%v, price=%v, payed=%v, table=%v WHERE id=%v;", o.Product, o.Amount, o.Price, o.Payed, o.Table, o.Id)
	_, err := db.Exec(query)
	return err
}

func deleteOrder(o Order, db *sql.DB) error {
	query := fmt.Sprintf("DELETE FROM bestellungen WHERE id=%v", o.Id)
	_, err := db.Exec(query)
	return err
}
