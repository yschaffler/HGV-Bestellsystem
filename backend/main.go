package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	jwt "github.com/golang-jwt/jwt/v5"

	"bestellsystem_server/ws"
)

var PrintHub *ws.Hub

// -- the following functions contain the CRUD operations on the product table --
func getProducts(w http.ResponseWriter, r *http.Request) {
	products, err := getAllProducts(DB)
	if err != nil {
		log.Printf("error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	data, err := json.Marshal(products)
	if err != nil {
		log.Printf("error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(data)
}

func addProduct(w http.ResponseWriter, r *http.Request) {
	var p Product
	err := json.NewDecoder(r.Body).Decode(&p)
	if err != nil {
		log.Printf("error decoding product from json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	err = insertProduct(p, DB)
	if err != nil {
		log.Printf("error inserting product into database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func updateProductHandler(w http.ResponseWriter, r *http.Request) {
	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err := updateProduct(p, DB); err != nil {
		log.Printf("error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func deleteProductHandler(w http.ResponseWriter, r *http.Request) {
	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err := deleteProduct(p.Product_Id, DB); err != nil {
		log.Printf("error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

//-- the following functions contain the CRUD operations for the category table from the database --
func getCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := getAllCategories(DB)
	if err != nil {
		log.Printf("error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	data, err := json.Marshal(categories)
	if err != nil {
		log.Printf("error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(data)
}

func addCategoryHandler(w http.ResponseWriter, r *http.Request) {
	var c Category
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err := insertCategory(c, DB); err != nil {
		log.Printf("error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func updateCategoryHandler(w http.ResponseWriter, r *http.Request) {
	var c Category
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err := updateCategory(c, DB); err != nil {
		log.Printf("error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func deleteCategoryHandler(w http.ResponseWriter, r *http.Request) {
	var c Category
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err := deleteCategory(c.Category_Id, DB); err != nil {
		log.Printf("error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

//--  the following functions contain the CRUD operations for the Order table from the database
//and some additional operations on the order table --
func createOrderHandler(w http.ResponseWriter, r *http.Request) {
	var o Order
	if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
		log.Printf("error parsing new order from request body: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if err := insertOrder(o, DB); err != nil {
		log.Printf("error isnerting order into database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func getUnpaidOrdersHandler(w http.ResponseWriter, r *http.Request) {
	orders, err := getUnpaidOrders(DB)
	if err != nil {
		log.Printf("errorretrieving unoaid order form the database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	data, err := json.Marshal(orders)
	if err != nil {
		log.Printf("error marhsaling orders to json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(data)
}

func getAllOrdersHandler(w http.ResponseWriter, r *http.Request) {
	orders, err := getAllOrders(DB)
	if err != nil {
		log.Printf("errorretrieving unoaid order form the database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	data, err := json.Marshal(orders)
	if err != nil {
		log.Printf("error marhsaling orders to json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(data)
}

func getOpenOrdersForTableHandler(w http.ResponseWriter, r *http.Request) {
	idString := r.PathValue("id")
	id, err := strconv.Atoi(idString)
	if err != nil {
		log.Printf("error parsing id from parameters: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	orders, err := getOpenOrdersForTable(id, DB)
	data, err := json.Marshal(orders)
	if err != nil {
		log.Printf("error marshaling orders to json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(data)
}

func getAllOrdersForTableHandler(w http.ResponseWriter, r *http.Request) {
	idString := r.PathValue("id")
	id, err := strconv.Atoi(idString)
	if err != nil {
		log.Printf("error parsing id from parameters: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	orders, err := getAllOrdersForTable(id, DB)
	data, err := json.Marshal(orders)
	if err != nil {
		log.Printf("error marshaling orders to json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(data)
}

func updateOrdersHandler(w http.ResponseWriter, r *http.Request) {
	var o Order
	if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
		log.Printf("error decoding order from json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if err := updateOrder(o, DB); err != nil {
		log.Printf("error updating order: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func deleteOrdersHandler(w http.ResponseWriter, r *http.Request) {
	var o Order
	if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
		log.Printf("error decodign order from json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if err := deleteOrder(o, DB); err != nil {
		log.Printf("error deleting order: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func payOrdersHandler(w http.ResponseWriter, r *http.Request) {
	var body PayRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		log.Printf("error decoding pay orders from json: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err := payTableItems(body.Table, body.Items, DB); err != nil {
		log.Printf("error paying orders in database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func returnOrdersHandler(w http.ResponseWriter, r *http.Request) {
	var body PayRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		log.Printf("error decoding return orders from json: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err := returnTableItems(body.Table, body.Items, DB); err != nil {
		log.Printf("error returning orders in database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

//-- the following functions contain the CRUD operations for the user table from the database ---
func createUserHandler(w http.ResponseWriter, r *http.Request) {
	var u User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		log.Printf("error decoding user data from json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	// Check for duplicate username
	if _, err := getUserByUsername(u.Username, DB); err == nil {
		w.WriteHeader(http.StatusConflict) // 409 – username already taken
		return
	}
	h := sha256.New()
	h.Write([]byte(u.Password))
	hashedPassword := base64.StdEncoding.EncodeToString(h.Sum(nil))
	u.Password = hashedPassword
	if err := createUser(u, DB); err != nil {
		log.Printf("error creating user in the database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func getUserByIdHandler(w http.ResponseWriter, r *http.Request) {
	idString := r.PathValue("id")
	id, err := strconv.Atoi(idString)
	if err != nil {
		log.Printf("error converting user id from string to int: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	u, err := getUserById(id, DB)
	if err != nil {
		log.Printf("error retrieving user from database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	data, err := json.Marshal(u)
	if err != nil {
		log.Printf("error converting user data to json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(data)
}

func getAllUsersHandler(w http.ResponseWriter, r *http.Request) {
	users, err := getAllUsers(DB)
	if err != nil {
		log.Printf("error retrieving user data from the database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	data, err := json.Marshal(users)
	if err != nil {
		log.Printf("error converting user data to json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(data)
}

func updateUserHandler(w http.ResponseWriter, r *http.Request) {
	var u User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		log.Printf("error decoding user data from json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if u.Password != "" {
		h := sha256.New()
		h.Write([]byte(u.Password))
		hashedPassword := base64.StdEncoding.EncodeToString(h.Sum(nil))
		u.Password = hashedPassword
	}
	if err := updateUser(u, DB); err != nil {
		log.Printf("error updating user in the database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func deleteUserHandler(w http.ResponseWriter, r *http.Request) {
	var u User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		log.Printf("error decoding user data from json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if err := deleteUser(u, DB); err != nil {
		log.Printf("error deleting user from database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

//handles user login
func loginHandler(w http.ResponseWriter, r *http.Request) {
	var lrq LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&lrq); err != nil {
		log.Printf("error parsing login request info: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	h := sha256.New()
	h.Write([]byte(lrq.Password))
	hashedPassword := base64.StdEncoding.EncodeToString(h.Sum(nil))
	lrq.Password = hashedPassword
	u, err := getUserByUsername(lrq.Username, DB)
	if err != nil {
		log.Printf("error fetching user data from the database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if lrq.Password != u.Password {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":       u.Id,
		"username": u.Username,
		"name":     u.Name,
		"role":     u.Role,
		"ver":      u.TokenVersion,
		"exp":      time.Now().Add(30 * 24 * time.Hour).Unix(),
	})
	tokenString, _ := token.SignedString([]byte("SECRET_KEY"))
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    tokenString,
		HttpOnly: true,
		Path:     "/",
		MaxAge:   30 * 24 * 60 * 60,
	})
	w.WriteHeader(http.StatusOK)
}

//provides the data of the current user from the cookie
func currentUser(w http.ResponseWriter, r *http.Request) {
	_, u, err := validateToken(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	data, err := json.Marshal(u)
	if err != nil {
		log.Printf("error parsing json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(data)
}

//handles user logout
func logoutHandler(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    "",
		HttpOnly: true,
		Path:     "/",
		MaxAge:   -1,
	})
	w.WriteHeader(http.StatusOK)
}

// validateToken parses the JWT from the request cookie and verifies the
// token_version against the database. Returns the claims and the DB user on
// success, or an error if the token is missing, invalid, or belongs to a
// session that has been invalidated (e.g. after a password change).
func validateToken(r *http.Request) (jwt.MapClaims, User, error) {
	cookie, err := r.Cookie("auth_token")
	if err != nil {
		return nil, User{}, err
	}
	token, err := jwt.Parse(cookie.Value, func(token *jwt.Token) (interface{}, error) {
		return []byte("SECRET_KEY"), nil
	})
	if err != nil || !token.Valid {
		return nil, User{}, fmt.Errorf("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, User{}, fmt.Errorf("invalid claims")
	}
	idFloat, ok := claims["id"].(float64)
	if !ok {
		return nil, User{}, fmt.Errorf("missing id claim")
	}
	u, err := getUserById(int(idFloat), DB)
	if err != nil {
		return nil, User{}, fmt.Errorf("user not found: %w", err)
	}
	ver, _ := claims["ver"].(float64)
	if int(ver) != u.TokenVersion {
		return nil, User{}, fmt.Errorf("token invalidated")
	}
	return claims, u, nil
}

//returns true when the account of the user possesses the admin role and otherwise returns false,
//used for securing endpoints that require admin privileges
func requireAdmin(r *http.Request) bool {
	claims, _, err := validateToken(r)
	if err != nil {
		return false
	}
	role, _ := claims["role"].(string)
	return role == "ADMIN"
}

// findPrinterForItem returns the first matching printer name for an item,
// or "" if no rule matches.
func findPrinterForItem(pos RechnungPosition, table int, kellnerId string, settings PrinterSettingsConfig) string {
	for _, rule := range settings.Rules {
		if rule.TableFrom != nil && table < *rule.TableFrom {
			continue
		}
		if rule.TableTo != nil && table > *rule.TableTo {
			continue
		}
		if rule.AccountId != "" && rule.AccountId != kellnerId {
			continue
		}
		if len(rule.Categories) > 0 {
			matched := false
			for _, cat := range rule.Categories {
				if cat == pos.Kategorie {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}
		return rule.BarName
	}
	return ""
}

// routePrintJobs splits order items by printer and enqueues a PrintJob per printer.
func routePrintJobs(req CreateRechnungRequest, settings PrinterSettingsConfig, orderID int64) {
	// Bar orders (tisch=0) respect the printBarOrders toggle
	if req.Tisch == 0 && !settings.PrintBarOrders {
		return
	}

	jobType := req.Typ
	if jobType == "" {
		jobType = "RECHNUNG"
	}
	waiterName := waiterNameForPrint(req.KellnerId)

	// Group items by target printer (preserving order)
	type entry struct {
		printer string
		item    ws.OrderItem
	}
	grouped := make(map[string][]ws.OrderItem)
	order := []string{}
	seen := make(map[string]bool)

	for _, pos := range req.Positionen {
		printer := findPrinterForItem(pos, req.Tisch, req.KellnerId, settings)
		if printer == "" {
			continue
		}
		grouped[printer] = append(grouped[printer], ws.OrderItem{
			Name:     pos.Name,
			Quantity: pos.Amount,
			Price:    pos.Price,
			Note:     pos.Note,
		})
		if !seen[printer] {
			order = append(order, printer)
			seen[printer] = true
		}
	}

	for _, printer := range order {
		PrintHub.EnqueueAndSend(printer, &ws.PrintJob{
			OrderID:    int(orderID),
			JobType:    jobType,
			Table:      req.Tisch,
			WaiterName: waiterName,
			Items:      grouped[printer],
			Note:       req.Note,
		})
	}
}

//provides the name of a waiter for printing on a bon
func waiterNameForPrint(kellnerId string) string {
	if kellnerId == "" {
		return ""
	}
	if kellnerId == "bar" {
		return "Bar"
	}
	id, err := strconv.Atoi(kellnerId)
	if err != nil {
		return kellnerId
	}
	u, err := getUserById(id, DB)
	if err != nil {
		log.Printf("error resolving waiter name for print job: %v", err)
		return kellnerId
	}
	if u.Name != "" {
		return u.Name
	}
	return u.Username
}

//create a new rechnung
func createRechnungHandler(w http.ResponseWriter, r *http.Request) {
	var req CreateRechnungRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("error decoding rechnung: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	id, err := insertRechnung(req, DB)
	if err != nil {
		log.Printf("error inserting rechnung: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	settings, settingsErr := getPrinterSettings(DB)
	if settingsErr != nil {
		log.Printf("error loading printer settings for routing: %v", settingsErr)
	} else {
		routePrintJobs(req, settings, id)
	}

	w.WriteHeader(http.StatusOK)
}

//returns the rechnungen for a specific table
func getRechnungenForTableHandler(w http.ResponseWriter, r *http.Request) {
	idString := r.PathValue("id")
	id, err := strconv.Atoi(idString)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	rechnungen, err := getRechnungenForTable(id, DB)
	if err != nil {
		log.Printf("error retrieving rechnungen: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	data, err := json.Marshal(rechnungen)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(data)
}

//returns all rechnungen
func getAllRechnungenHandler(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(r) {
		w.WriteHeader(http.StatusForbidden)
		return
	}
	rechnungen, err := getAllRechnungen(DB)
	if err != nil {
		log.Printf("error retrieving all rechnungen: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	data, err := json.Marshal(rechnungen)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(data)
}

//handler for resetting the rechnungen
func resetRechnungenHandler(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(r) {
		w.WriteHeader(http.StatusForbidden)
		return
	}
	if err := resetRechnungen(DB); err != nil {
		log.Printf("error resetting rechnungen: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

//handler for returning the printer settings
func getPrinterSettingsHandler(w http.ResponseWriter, r *http.Request) {
	cfg, err := getPrinterSettings(DB)
	if err != nil {
		log.Printf("error getting printer settings: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	data, err := json.Marshal(cfg)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(data)
}

//a handler for saving the printer settings
func savePrinterSettingsHandler(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(r) {
		w.WriteHeader(http.StatusForbidden)
		return
	}
	var buf json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&buf); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err := savePrinterSettingsDB(DB, string(buf)); err != nil {
		log.Printf("error saving printer settings: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

//handler for resetting the orders
func resetOrdersHandler(w http.ResponseWriter, r *http.Request) {
	if err := resetOrders(DB); err != nil {
		log.Printf("error resetting the database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if err := resetAutoIncrementForOrders(DB); err != nil {
		log.Printf("failed to reset auto increment for the order table: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

//returns the latest statistics in pdf format to the user
func getLatestPDFStatisticsHandler(w http.ResponseWriter, r *http.Request) {
	c, err := getStatsForPDF()
	if err != nil {
		log.Printf("error creating the pdf: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	doc, err := c.Generate()
	if err != nil {
		log.Printf("error creating the pdf: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	data := doc.GetBytes()
	w.Header().Set("Content-Type", "application/pdf")
	w.Write(data)
}

// ─── VAPID key management ────────────────────────────────────────────────────

var vapidPublicKey string
var vapidPrivateKey string

//initialise VAPID keys
func initVAPIDKeys() {
	pub, err := getAppConfig(DB, "vapid_public")
	if err == sql.ErrNoRows || pub == "" {
		privKey, pubKey, err := webpush.GenerateVAPIDKeys()
		if err != nil {
			log.Fatalf("failed to generate VAPID keys: %v", err)
		}
		_ = setAppConfig(DB, "vapid_public", pubKey)
		_ = setAppConfig(DB, "vapid_private", privKey)
		vapidPublicKey = pubKey
		vapidPrivateKey = privKey
		log.Printf("push: VAPID keys generated (public key: %.20s...)", pubKey)
		return
	}
	if err != nil {
		log.Fatalf("failed to load VAPID public key: %v", err)
	}
	priv, err := getAppConfig(DB, "vapid_private")
	if err != nil {
		log.Fatalf("failed to load VAPID private key: %v", err)
	}
	vapidPublicKey = pub
	vapidPrivateKey = priv
	log.Printf("push: VAPID keys loaded from DB (public key: %.20s...)", pub)
}

//sends a push notification to all subscribed users
func sendPushToAll(title, body string) {
	subs, err := getAllPushSubscriptions(DB)
	if err != nil {
		log.Printf("push: could not load subscriptions: %v", err)
		return
	}
	if len(subs) == 0 {
		log.Printf("push: no subscriptions registered — skipping send (title: %q)", title)
		return
	}
	log.Printf("push: sending to %d subscriber(s) — %q", len(subs), title)
	payload, _ := json.Marshal(map[string]string{"title": title, "body": body})
	for i, sub := range subs {
		s := &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys: webpush.Keys{
				P256dh: sub.P256DH,
				Auth:   sub.Auth,
			},
		}
		resp, err := webpush.SendNotification(payload, s, &webpush.Options{
			VAPIDPublicKey:  vapidPublicKey,
			VAPIDPrivateKey: vapidPrivateKey,
			Subscriber:      "https://github.com/yschaffler/HGV-Bestellsystem",
			TTL:             60,
		})
		if err != nil {
			log.Printf("push[%d]: send error (endpoint: %.50s...): %v", i, sub.Endpoint, err)
			continue
		}
		respBody := make([]byte, 512)
		n, _ := resp.Body.Read(respBody)
		resp.Body.Close()
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			log.Printf("push[%d]: delivered — HTTP %d (endpoint: %.50s...)", i, resp.StatusCode, sub.Endpoint)
		} else {
			log.Printf("push[%d]: failed — HTTP %d body: %s (endpoint: %.50s...)", i, resp.StatusCode, string(respBody[:n]), sub.Endpoint)
		}
		if resp.StatusCode == 410 || resp.StatusCode == 404 {
			log.Printf("push[%d]: subscription expired, removing from DB", i)
			_ = deletePushSubscription(DB, sub.Endpoint)
		}
		if resp.StatusCode == 403 {
			log.Printf("push[%d]: VAPID public key in use: %.20s... — browser subscription may use a different key; client must re-subscribe", i, vapidPublicKey)
		}
	}
}

// staleDetectionLoop checks every minute for printer queues with jobs that are
// stuck (client disconnected, jobs older than 3 minutes) and sends push alerts.
func staleDetectionLoop() {
	const checkInterval = time.Minute
	const staleThreshold = 3 * time.Minute
	alerted := make(map[string]bool)

	ticker := time.NewTicker(checkInterval)
	defer ticker.Stop()
	for range ticker.C {
		stale := PrintHub.StaleQueues(staleThreshold)
		nowAlerted := make(map[string]bool)
		for _, info := range stale {
			nowAlerted[info.Bar] = true
			if !alerted[info.Bar] {
				log.Printf("stale queue alert: bar=%q jobs=%d", info.Bar, len(info.Jobs))
				go sendPushToAll(
					"⚠️ Drucker nicht verbunden",
					info.Bar+" hat "+strconv.Itoa(len(info.Jobs))+" Bon(s) in der Warteschlange – Druckerclient prüfen!",
				)
			}
		}
		alerted = nowAlerted
	}
}

// ─── Printer queue API ───────────────────────────────────────────────────────

//handler for the endpoint responsible for returning the jobs in the printer queue
func getPrinterQueuesHandler(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(r) {
		w.WriteHeader(http.StatusForbidden)
		return
	}
	status := PrintHub.GetAllQueueStatus()
	if status == nil {
		status = []ws.QueueInfo{}
	}
	data, _ := json.Marshal(status)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(data)
}

//handler for the endpoint responsible for deleting a printer job
func deletePrinterJobHandler(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(r) {
		w.WriteHeader(http.StatusForbidden)
		return
	}
	var req struct {
		Bar     string `json:"bar"`
		OrderID int    `json:"order_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Bar == "" || req.OrderID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if PrintHub.DeleteJob(req.Bar, req.OrderID) {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusNotFound)
	}
}

//handler for the endpoint responsible for resending a printer jon
func resendPrinterJobHandler(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(r) {
		w.WriteHeader(http.StatusForbidden)
		return
	}
	var req struct {
		Bar     string `json:"bar"`
		OrderID int    `json:"order_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Bar == "" || req.OrderID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if PrintHub.ResendJob(req.Bar, req.OrderID) {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusNotFound)
	}
}

// ─── Push notification API ───────────────────────────────────────────────────
//handler for the endpoint responsible for providing the VAPID public key
func getVAPIDPublicKeyHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	data, _ := json.Marshal(map[string]string{"publicKey": vapidPublicKey})
	w.Write(data)
}

//handler for the endpoint responsible for unsubscribing to Push-Notifications
func subscribePushHandler(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(r) {
		w.WriteHeader(http.StatusForbidden)
		return
	}
	var sub PushSubscription
	if err := json.NewDecoder(r.Body).Decode(&sub); err != nil || sub.Endpoint == "" {
		log.Printf("push subscribe: bad request: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err := savePushSubscription(DB, sub); err != nil {
		log.Printf("push subscribe: error saving subscription: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	log.Printf("push subscribe: new subscription saved (endpoint: %.60s...)", sub.Endpoint)
	w.WriteHeader(http.StatusOK)
}

//handler for the endpoint responsible for unsubscribing to Push-Notifications
func unsubscribePushHandler(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(r) {
		w.WriteHeader(http.StatusForbidden)
		return
	}
	var req struct {
		Endpoint string `json:"endpoint"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Endpoint == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	_ = deletePushSubscription(DB, req.Endpoint)
	log.Printf("push unsubscribe: removed (endpoint: %.60s...)", req.Endpoint)
	w.WriteHeader(http.StatusOK)
}

//main entrypoint for the program, establishing a database connection, setting up all server endpoints and serving
func main() {
	OpenDatabaseHandle()
	if err := ensurePushTables(DB); err != nil {
		log.Fatalf("failed to create push tables: %v", err)
	}
	initVAPIDKeys()
	PrintHub = ws.NewHub(os.Getenv("PRINTER_SECRET"))
	go staleDetectionLoop()
	router := http.NewServeMux()
	router.HandleFunc("/get/all-products/", getProducts)
	router.HandleFunc("/get/all-categories/", getCategories)
	router.HandleFunc("/get/all-orders/", getAllOrdersHandler)
	router.HandleFunc("/get/unpaid-orders/", getUnpaidOrdersHandler)
	router.HandleFunc("/get/all-users/", getAllUsersHandler)
	router.HandleFunc("/get/order/table/{id}", getOpenOrdersForTableHandler)
	router.HandleFunc("/get/all-orders/table/{id}", getAllOrdersForTableHandler)
	router.HandleFunc("/get/user/{id}", getUserByIdHandler)
	router.HandleFunc("/get/statistics-pdf/", getLatestPDFStatisticsHandler)

	router.HandleFunc("/add/product/", addProduct)
	router.HandleFunc("/add/category/", addCategoryHandler)
	router.HandleFunc("/add/order/", createOrderHandler)
	router.HandleFunc("/add/user/", createUserHandler)

	router.HandleFunc("/update/product/", updateProductHandler)
	router.HandleFunc("/update/category/", updateCategoryHandler)
	router.HandleFunc("/update/order/", updateOrdersHandler)
	router.HandleFunc("/update/user/", updateUserHandler)

	router.HandleFunc("/delete/product/", deleteProductHandler)
	router.HandleFunc("/delete/category/", deleteCategoryHandler)
	router.HandleFunc("/delete/order/", deleteOrdersHandler)
	router.HandleFunc("/delete/user/", deleteUserHandler)

	router.HandleFunc("/pay/orders/", payOrdersHandler)
	router.HandleFunc("/return/orders/", returnOrdersHandler)

	router.HandleFunc("POST /add/rechnung/", createRechnungHandler)
	router.HandleFunc("GET /get/rechnungen/table/{id}", getRechnungenForTableHandler)

	router.HandleFunc("GET /admin/rechnungen/", getAllRechnungenHandler)
	router.HandleFunc("POST /admin/reset/rechnungen/", resetRechnungenHandler)

	router.Handle("/ws/printer", PrintHub)

	router.HandleFunc("GET /settings/printer/", getPrinterSettingsHandler)
	router.HandleFunc("POST /settings/printer/", savePrinterSettingsHandler)

	router.HandleFunc("GET /admin/printer/queues/", getPrinterQueuesHandler)
	router.HandleFunc("POST /admin/printer/queues/delete/", deletePrinterJobHandler)
	router.HandleFunc("POST /admin/printer/queues/resend/", resendPrinterJobHandler)

	router.HandleFunc("GET /push/vapid-public-key/", getVAPIDPublicKeyHandler)
	router.HandleFunc("POST /push/subscribe/", subscribePushHandler)
	router.HandleFunc("POST /push/unsubscribe/", unsubscribePushHandler)

	router.HandleFunc("POST /login/", loginHandler)
	router.HandleFunc("/me/", currentUser)
	router.HandleFunc("POST /logout/", logoutHandler)

	router.HandleFunc("/reset/orders/", resetOrdersHandler)

	// Serve frontend static files
	fs := http.FileServer(http.Dir("./public"))
	router.Handle("/", fs)
	server := http.Server{Addr: ":8000", Handler: router}
	log.Println("Listening for requests...")
	go server.ListenAndServe()

	recvSignal := make(chan os.Signal, 1)
	signal.Notify(recvSignal, syscall.SIGTERM, syscall.SIGINT)
	<-recvSignal
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		DB.Close()
		log.Fatalf("error shutting down server: %v", err)
	}
	println()
	log.Println("Shutting Down...")
	DB.Close()
}
