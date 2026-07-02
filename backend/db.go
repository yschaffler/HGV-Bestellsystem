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

//initialising the database connection
//the necessary credentials are extracted from the environment variables
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

//get all products from the db
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

//insert a product into the db
func insertProduct(p Product, db *sql.DB) error {
	query := fmt.Sprintf("insert into test_produkte (price, name, product_category) values (%v, \"%v\", %v);", p.Price, p.Name, p.Category)
	_, err := db.Exec(query)
	if err != nil {
		return err
	}
	return nil
}

//update a product in the db
func updateProduct(p Product, db *sql.DB) error {
	query := fmt.Sprintf("update test_produkte set price=%v, name=\"%v\", product_category=%v where id=%v;", p.Price, p.Name, p.Category, p.Product_Id)
	_, err := db.Exec(query)
	return err
}

//delete a product from the db
func deleteProduct(id int, db *sql.DB) error {
	query := fmt.Sprintf("delete from test_produkte where id=%v;", id)
	_, err := db.Exec(query)
	return err
}

//get all product categories from the db
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

//insert a product category into the db
func insertCategory(c Category, db *sql.DB) error {
	query := fmt.Sprintf("insert into produkt_kategorien (name, color) values (\"%v\", \"%v\");", c.Name, c.Color)
	_, err := db.Exec(query)
	return err
}

//update a product category in the db
func updateCategory(c Category, db *sql.DB) error {
	query := fmt.Sprintf("update produkt_kategorien set name=\"%v\", color=\"%v\" where id=%v;", c.Name, c.Color, c.Category_Id)
	_, err := db.Exec(query)
	return err
}

//delete a product category from the db
func deleteCategory(id int, db *sql.DB) error {
	query := fmt.Sprintf("delete from produkt_kategorien where id=%v;", id)
	_, err := db.Exec(query)
	return err
}

//insert a rechnung into the db
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

//returns every rechnung for a table
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

//get every rechnung
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

//get all rechnungen that are not a storno
func getAllNonStornoRechnungen(db *sql.DB) ([]Rechnung, error) {
	rows, err := db.Query(
		"SELECT id, tisch, typ, erstellt_am, gesamt, positionen, kellner_id FROM rechnungen WHERE typ = 'RECHNUNG' ORDER BY erstellt_am DESC",
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

//get all stornos
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

//resets the rechnungen
func resetRechnungen(db *sql.DB) error {
	if _, err := db.Exec("DELETE FROM `rechnungen`;"); err != nil {
		return err
	}
	_, err := db.Exec("ALTER TABLE `rechnungen` AUTO_INCREMENT = 1;")
	return err
}

//creates a user in the db
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

//retrieves user info by the user id
func getUserById(id int, db *sql.DB) (User, error) {
	query := fmt.Sprintf("SELECT `id`, `username`, `name`, `role`, `token_version` FROM `user` WHERE `id`=%v;", id)
	rows := db.QueryRow(query)
	var u User
	err := rows.Scan(&u.Id, &u.Username, &u.Name, &u.Role, &u.TokenVersion)
	if err != nil {
		return User{}, err
	}
	return u, nil
}

//retrieves all users from the db
func getAllUsers(db *sql.DB) ([]User, error) {
	query := "SELECT `id`, `username`, `name`, `role`, `token_version` FROM `user`;"
	rows, err := db.Query(query)
	if err != nil {
		return []User{}, err
	}
	defer rows.Close()
	users := make([]User, 0)
	for rows.Next() {
		var u User
		err := rows.Scan(&u.Id, &u.Username, &u.Name, &u.Role, &u.TokenVersion)
		if err != nil {
			return []User{}, err
		}
		users = append(users, u)
	}
	return users, nil
}

//retrieve the user info by username from the db
func getUserByUsername(username string, db *sql.DB) (User, error) {
	query := fmt.Sprintf("SELECT `id`, `username`, `name`, `password`, `role`, `token_version` FROM `user` WHERE `username`=\"%v\";", username)
	row := db.QueryRow(query)
	var u User
	err := row.Scan(&u.Id, &u.Username, &u.Name, &u.Password, &u.Role, &u.TokenVersion)
	if err != nil {
		return User{}, err
	}
	return u, nil
}

//updates the user info
func updateUser(u User, db *sql.DB) error {
	if u.Password == "" {
		return updateUserWithoutPassword(u, db)
	}
	return updateUserWithPassword(u, db)
}

//update user info containing also the password; increments token_version to invalidate existing sessions
func updateUserWithPassword(u User, db *sql.DB) error {
	query := fmt.Sprintf("UPDATE `user` SET `username`=\"%v\", `name`=\"%v\", `password`=\"%v\", `role`=\"%v\", `token_version`=`token_version`+1 WHERE `id`=%v",
		u.Username, u.Name, u.Password, u.Role, u.Id)
	_, err := db.Exec(query)
	return err
}

//only update the user info but not the password
func updateUserWithoutPassword(u User, db *sql.DB) error {
	query := fmt.Sprintf("UPDATE `user` SET `username`=\"%v\", `name`=\"%v\", `role`=\"%v\" WHERE `id`=%v",
		u.Username, u.Name, u.Role, u.Id)
	_, err := db.Exec(query)
	return err
}

//delete a user from the db
func deleteUser(u User, db *sql.DB) error {
	query := fmt.Sprintf("DELETE FROM `user` WHERE `id`=%v;", u.Id)
	_, err := db.Exec(query)
	return err
}

//returns the default printer settings
func defaultPrinterSettings() PrinterSettingsConfig {
	return PrinterSettingsConfig{
		PrintBarOrders: true,
		Rules: []PrinterRule{
			{ID: "1", BarName: "Bar 1", Categories: []string{}},
		},
	}
}

//retrieve the printer settings from the db
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

//save printer settings to the db
func savePrinterSettingsDB(db *sql.DB, raw string) error {
	_, err := db.Exec(
		"INSERT INTO printer_settings (id, settings_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE settings_json=VALUES(settings_json)",
		raw,
	)
	return err
}

//resets the order table
func resetOrders(db *sql.DB) error {
	query := "DELETE FROM `bestellungen`;"
	_, err := db.Exec(query)
	return err
}

//reset the autoincrement counter for the order table
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

//get the app config from the db
func getAppConfig(db *sql.DB, key string) (string, error) {
	var val string
	err := db.QueryRow("SELECT value FROM app_config WHERE key_name=?", key).Scan(&val)
	return val, err
}

//setting the app config in the db
func setAppConfig(db *sql.DB, key, value string) error {
	_, err := db.Exec(
		"INSERT INTO app_config (key_name, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)",
		key, value,
	)
	return err
}

//type definition for a push subscribtion 
type PushSubscription struct {
	Endpoint string `json:"endpoint"`
	P256DH   string `json:"p256dh"`
	Auth     string `json:"auth"`
}

//add a push subscribtion to the db
func savePushSubscription(db *sql.DB, sub PushSubscription) error {
	_, err := db.Exec(
		"INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?,?,?) ON DUPLICATE KEY UPDATE p256dh=VALUES(p256dh), auth=VALUES(auth)",
		sub.Endpoint, sub.P256DH, sub.Auth,
	)
	return err
}

//delete a push subscribtion from the db
func deletePushSubscription(db *sql.DB, endpoint string) error {
	_, err := db.Exec("DELETE FROM push_subscriptions WHERE endpoint=?", endpoint)
	return err
}

//returns all push subscribtions from the database
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
