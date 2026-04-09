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
