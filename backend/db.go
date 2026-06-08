package main

import (
	"database/sql"
	"encoding/json"
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
	dsn := fmt.Sprintf("root:%v@tcp(%v:%v)/bestellservice?charset=utf8mb4&parseTime=true", password, host, port)
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
	query := fmt.Sprintf("insert into produkt_kategorien (name, color) values (\"%v\", \"%v\");", c.Name, c.Color)
	_, err := db.Exec(query)
	return err
}

func updateCategory(c Category, db *sql.DB) error {
	query := fmt.Sprintf("update produkt_kategorien set name=\"%v\", color=\"%v\" where id=%v;", c.Name, c.Color, c.Category_Id)
	_, err := db.Exec(query)
	return err
}

func deleteCategory(id int, db *sql.DB) error {
	query := fmt.Sprintf("delete from produkt_kategorien where id=%v;", id)
	_, err := db.Exec(query)
	return err
}

func insertOrder(o Order, db *sql.DB) error {
	query := fmt.Sprintf("INSERT INTO bestellungen (product, amount, price, payed, `table`) VALUES (%v, %v, %v, %v, %v);", o.Product, o.Amount, o.Price, o.Payed, o.Table)
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
	query := fmt.Sprintf("SELECT * FROM bestellungen WHERE `table`=%v AND payed=false;", table)
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
	query := fmt.Sprintf("SELECT * FROM bestellungen WHERE `table`=%v;", table)
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
	query := fmt.Sprintf("UPDATE bestellungen SET product=%v, amount=%v, price=%v, payed=%v, `table`=%v WHERE id=%v;", o.Product, o.Amount, o.Price, o.Payed, o.Table, o.Id)
	_, err := db.Exec(query)
	return err
}

func deleteOrder(o Order, db *sql.DB) error {
	query := fmt.Sprintf("DELETE FROM bestellungen WHERE id=%v;", o.Id)
	_, err := db.Exec(query)
	return err
}

func payTableItems(table int, items []PayItem, db *sql.DB) error {
	for _, item := range items {
		amountToPay := item.Amount
		query := fmt.Sprintf("SELECT id, amount, price FROM bestellungen WHERE `table`=%v AND product=%v AND payed=false ORDER BY id ASC;", table, item.Product)
		rows, err := db.Query(query)
		if err != nil {
			return err
		}

		type orderRow struct {
			id     int
			amount int
			price  float64
		}
		var openOrders []orderRow
		for rows.Next() {
			var o orderRow
			if err := rows.Scan(&o.id, &o.amount, &o.price); err == nil {
				openOrders = append(openOrders, o)
			}
		}
		rows.Close()

		for _, row := range openOrders {
			if amountToPay <= 0 {
				break
			}
			deduct := amountToPay
			if deduct > row.amount {
				deduct = row.amount
			}

			if deduct == row.amount {
				_, _ = db.Exec(fmt.Sprintf("UPDATE bestellungen SET payed=true WHERE id=%v;", row.id))
			} else {
				_, _ = db.Exec(fmt.Sprintf("UPDATE bestellungen SET amount=amount-%v WHERE id=%v;", deduct, row.id))
				_, _ = db.Exec(fmt.Sprintf("INSERT INTO bestellungen (product, amount, price, payed, `table`) VALUES (%v, %v, %v, true, %v);", item.Product, deduct, row.price, table))
			}
			amountToPay -= deduct
		}
	}
	return nil
}

func returnTableItems(table int, items []PayItem, db *sql.DB) error {
	for _, item := range items {
		amountToReturn := item.Amount
		query := fmt.Sprintf("SELECT id, amount, price FROM bestellungen WHERE `table`=%v AND product=%v AND payed=true ORDER BY id ASC;", table, item.Product)
		rows, err := db.Query(query)
		if err != nil {
			return err
		}

		type orderRow struct {
			id     int
			amount int
			price  float64
		}
		var openOrders []orderRow
		for rows.Next() {
			var o orderRow
			if err := rows.Scan(&o.id, &o.amount, &o.price); err == nil {
				openOrders = append(openOrders, o)
			}
		}
		rows.Close()

		for _, row := range openOrders {
			if amountToReturn <= 0 {
				break
			}
			deduct := amountToReturn
			if deduct > row.amount {
				deduct = row.amount
			}

			if deduct == row.amount {
				_, _ = db.Exec(fmt.Sprintf("DELETE FROM bestellungen WHERE id=%v;", row.id))
			} else {
				_, _ = db.Exec(fmt.Sprintf("UPDATE bestellungen SET amount=amount-%v WHERE id=%v;", deduct, row.id))
			}
			amountToReturn -= deduct
		}
	}
	return nil
}

func insertRechnung(req CreateRechnungRequest, db *sql.DB) (int64, error) {
	data, err := json.Marshal(req.Positionen)
	if err != nil {
		return 0, fmt.Errorf("error marshaling rechnung positions: %v", err)
	}
	typ := req.Typ
	if typ == "" {
		typ = "RECHNUNG"
	}
	result, err := db.Exec(
		"INSERT INTO rechnungen (tisch, typ, gesamt, positionen, kellner_id) VALUES (?, ?, ?, ?, ?)",
		req.Tisch, typ, req.Gesamt, string(data), req.KellnerId,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func getRechnungenForTable(table int, db *sql.DB) ([]Rechnung, error) {
	rows, err := db.Query(
		"SELECT id, tisch, typ, erstellt_am, gesamt, positionen, kellner_id FROM rechnungen WHERE tisch=? ORDER BY erstellt_am DESC",
		table,
	)
	if err != nil {
		return []Rechnung{}, fmt.Errorf("error querying rechnungen: %v", err)
	}
	defer rows.Close()

	var rechnungen []Rechnung
	for rows.Next() {
		var r Rechnung
		var posJson string
		if err := rows.Scan(&r.Id, &r.Tisch, &r.Typ, &r.ErstelltAm, &r.Gesamt, &posJson, &r.KellnerId); err != nil {
			return []Rechnung{}, fmt.Errorf("error scanning rechnung: %v", err)
		}
		if err := json.Unmarshal([]byte(posJson), &r.Positionen); err != nil {
			return []Rechnung{}, fmt.Errorf("error unmarshaling positions: %v", err)
		}
		rechnungen = append(rechnungen, r)
	}
	if rechnungen == nil {
		rechnungen = []Rechnung{}
	}
	return rechnungen, nil
}

func getAllRechnungen(db *sql.DB) ([]Rechnung, error) {
	rows, err := db.Query(
		"SELECT id, tisch, typ, erstellt_am, gesamt, positionen, kellner_id FROM rechnungen ORDER BY erstellt_am DESC",
	)
	if err != nil {
		return []Rechnung{}, fmt.Errorf("error querying all rechnungen: %v", err)
	}
	defer rows.Close()

	var rechnungen []Rechnung
	for rows.Next() {
		var r Rechnung
		var posJson string
		if err := rows.Scan(&r.Id, &r.Tisch, &r.Typ, &r.ErstelltAm, &r.Gesamt, &posJson, &r.KellnerId); err != nil {
			return []Rechnung{}, fmt.Errorf("error scanning rechnung: %v", err)
		}
		if err := json.Unmarshal([]byte(posJson), &r.Positionen); err != nil {
			return []Rechnung{}, fmt.Errorf("error unmarshaling positions: %v", err)
		}
		rechnungen = append(rechnungen, r)
	}
	if rechnungen == nil {
		rechnungen = []Rechnung{}
	}
	return rechnungen, nil
}

func getAllNonStornoRechnungen(db *sql.DB) ([]Rechnung, error) {
	rows, err := db.Query(
		"SELECT id, tisch, typ, erstellt_am, gesamt, positionen, kellner_id FROM rechnungen WHERE typ!='STORNO' ORDER BY erstellt_am DESC",
	)
	if err != nil {
		return []Rechnung{}, fmt.Errorf("error querying stornos: %v", err)
	}
	defer rows.Close()

	var rechnungen []Rechnung
	for rows.Next() {
		var r Rechnung
		var posJson string
		if err := rows.Scan(&r.Id, &r.Tisch, &r.Typ, &r.ErstelltAm, &r.Gesamt, &posJson, &r.KellnerId); err != nil {
			return []Rechnung{}, fmt.Errorf("error scanning rechnung: %v", err)
		}
		if err := json.Unmarshal([]byte(posJson), &r.Positionen); err != nil {
			return []Rechnung{}, fmt.Errorf("error unmarshaling positions: %v", err)
		}
		rechnungen = append(rechnungen, r)
	}
	if rechnungen == nil {
		rechnungen = []Rechnung{}
	}
	return rechnungen, nil
}

func getAllStornos(db *sql.DB) ([]Rechnung, error) {
	rows, err := db.Query(
		"SELECT id, tisch, typ, erstellt_am, gesamt, positionen, kellner_id FROM rechnungen WHERE typ='STORNO' ORDER BY erstellt_am DESC",
	)
	if err != nil {
		return []Rechnung{}, fmt.Errorf("error querying stornos: %v", err)
	}
	defer rows.Close()

	var rechnungen []Rechnung
	for rows.Next() {
		var r Rechnung
		var posJson string
		if err := rows.Scan(&r.Id, &r.Tisch, &r.Typ, &r.ErstelltAm, &r.Gesamt, &posJson, &r.KellnerId); err != nil {
			return []Rechnung{}, fmt.Errorf("error scanning rechnung: %v", err)
		}
		if err := json.Unmarshal([]byte(posJson), &r.Positionen); err != nil {
			return []Rechnung{}, fmt.Errorf("error unmarshaling positions: %v", err)
		}
		rechnungen = append(rechnungen, r)
	}
	if rechnungen == nil {
		rechnungen = []Rechnung{}
	}
	return rechnungen, nil
}

func resetRechnungen(db *sql.DB) error {
	if _, err := db.Exec("DELETE FROM `rechnungen`;"); err != nil {
		return err
	}
	_, err := db.Exec("ALTER TABLE `rechnungen` AUTO_INCREMENT = 1;")
	return err
}

func createUser(u User, db *sql.DB) error {
	query := fmt.Sprintf("INSERT INTO `user` (`username`, `name`, `password`, `role`) VALUES (\"%v\", \"%v\", \"%v\", \"%v\");",
		u.Username, u.Name, u.Password, u.Role)
	_, err := db.Exec(query)
	return err
}

func getGesamt_KellnerIdFromRechnungnen(db *sql.DB) ([]Rechnung, error) {
	query := "select `gesamt`,`kellner_id` from `rechnungen` order by `kellner_id`;"
	var rechnungen []Rechnung
	rows, err := db.Query(query)
	if err != nil {
		return []Rechnung{}, err
	}
	for rows.Next() {
		var r Rechnung
		err = rows.Scan(&r.Gesamt, &r.KellnerId)
		if err != nil {
			return []Rechnung{}, err
		}
		rechnungen = append(rechnungen, r)
	}
	return rechnungen, nil
}

func getUserById(id int, db *sql.DB) (User, error) {
	query := fmt.Sprintf("SELECT `id`, `username`, `name`, `role` FROM `user` WHERE `id`=%v;", id)
	rows := db.QueryRow(query)
	var u User
	err := rows.Scan(&u.Id, &u.Username, &u.Name, &u.Role)
	if err != nil {
		return User{}, err
	}
	return u, nil
}

func getAllUsers(db *sql.DB) ([]User, error) {
	query := "SELECT `id`, `username`, `name`, `role` FROM `user`;"
	rows, err := db.Query(query)
	if err != nil {
		return []User{}, err
	}
	defer rows.Close()
	users := make([]User, 0)
	for rows.Next() {
		var u User
		err := rows.Scan(&u.Id, &u.Username, &u.Name, &u.Role)
		if err != nil {
			return []User{}, err
		}
		users = append(users, u)
	}
	return users, nil
}

func getUserByUsername(username string, db *sql.DB) (User, error) {
	query := fmt.Sprintf("SELECT `id`, `username`, `name`, `password`, `role` FROM `user` WHERE `username`=\"%v\";", username)
	row := db.QueryRow(query)
	var u User
	err := row.Scan(&u.Id, &u.Username, &u.Name, &u.Password, &u.Role)
	if err != nil {
		return User{}, err
	}
	return u, nil
}

func updateUser(u User, db *sql.DB) error {
	if u.Password == "" {
		return updateUserWithoutPassword(u, db)
	}
	return updateUserWithPassword(u, db)
}

func updateUserWithPassword(u User, db *sql.DB) error {
	query := fmt.Sprintf("UPDATE `user` SET `username`=\"%v\", `name`=\"%v\", `password`=\"%v\", `role`=\"%v\" WHERE `id`=%v",
		u.Username, u.Name, u.Password, u.Role, u.Id)
	_, err := db.Exec(query)
	return err
}

func updateUserWithoutPassword(u User, db *sql.DB) error {
	query := fmt.Sprintf("UPDATE `user` SET `username`=\"%v\", `name`=\"%v\", `role`=\"%v\" WHERE `id`=%v",
		u.Username, u.Name, u.Role, u.Id)
	_, err := db.Exec(query)
	return err
}

func deleteUser(u User, db *sql.DB) error {
	query := fmt.Sprintf("DELETE FROM `user` WHERE `id`=%v;", u.Id)
	_, err := db.Exec(query)
	return err
}

func defaultPrinterSettings() PrinterSettingsConfig {
	return PrinterSettingsConfig{
		PrintBarOrders: true,
		Rules: []PrinterRule{
			{ID: "1", BarName: "Bar 1", Categories: []string{}},
		},
	}
}

func getPrinterSettings(db *sql.DB) (PrinterSettingsConfig, error) {
	var raw string
	err := db.QueryRow("SELECT settings_json FROM printer_settings WHERE id=1").Scan(&raw)
	if err == sql.ErrNoRows {
		return defaultPrinterSettings(), nil
	}
	if err != nil {
		return defaultPrinterSettings(), err
	}
	var cfg PrinterSettingsConfig
	if err := json.Unmarshal([]byte(raw), &cfg); err != nil {
		return defaultPrinterSettings(), err
	}
	// Ensure Categories slice is never nil
	for i := range cfg.Rules {
		if cfg.Rules[i].Categories == nil {
			cfg.Rules[i].Categories = []string{}
		}
	}
	return cfg, nil
}

func savePrinterSettingsDB(db *sql.DB, raw string) error {
	_, err := db.Exec(
		"INSERT INTO printer_settings (id, settings_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE settings_json=VALUES(settings_json)",
		raw,
	)
	return err
}

func resetOrders(db *sql.DB) error {
	query := "DELETE FROM `bestellungen`;"
	_, err := db.Exec(query)
	return err
}

func resetAutoIncrementForOrders(db *sql.DB) error {
	query := "ALTER TABLE `bestellungen` AUTO_INCREMENT = 1;"
	_, err := db.Exec(query)
	return err
}

// ensurePushTables creates the push_subscriptions and app_config tables if they
// don't exist. Called once at startup so no schema migration file is needed.
func ensurePushTables(db *sql.DB) error {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS push_subscriptions (
		id         INT AUTO_INCREMENT PRIMARY KEY,
		endpoint   TEXT NOT NULL,
		p256dh     TEXT NOT NULL,
		auth       TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE KEY uq_endpoint (endpoint(512))
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
	if err != nil {
		return err
	}
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS app_config (
		key_name   VARCHAR(128) PRIMARY KEY,
		value      TEXT NOT NULL
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
	return err
}

func getAppConfig(db *sql.DB, key string) (string, error) {
	var val string
	err := db.QueryRow("SELECT value FROM app_config WHERE key_name=?", key).Scan(&val)
	return val, err
}

func setAppConfig(db *sql.DB, key, value string) error {
	_, err := db.Exec(
		"INSERT INTO app_config (key_name, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)",
		key, value,
	)
	return err
}

type PushSubscription struct {
	Endpoint string `json:"endpoint"`
	P256DH   string `json:"p256dh"`
	Auth     string `json:"auth"`
}

func savePushSubscription(db *sql.DB, sub PushSubscription) error {
	_, err := db.Exec(
		"INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?,?,?) ON DUPLICATE KEY UPDATE p256dh=VALUES(p256dh), auth=VALUES(auth)",
		sub.Endpoint, sub.P256DH, sub.Auth,
	)
	return err
}

func deletePushSubscription(db *sql.DB, endpoint string) error {
	_, err := db.Exec("DELETE FROM push_subscriptions WHERE endpoint=?", endpoint)
	return err
}

func getAllPushSubscriptions(db *sql.DB) ([]PushSubscription, error) {
	rows, err := db.Query("SELECT endpoint, p256dh, auth FROM push_subscriptions")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var subs []PushSubscription
	for rows.Next() {
		var s PushSubscription
		if err := rows.Scan(&s.Endpoint, &s.P256DH, &s.Auth); err != nil {
			return nil, err
		}
		subs = append(subs, s)
	}
	return subs, nil
}
