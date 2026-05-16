package main

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	jwt "github.com/golang-jwt/jwt/v5"
)

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

func createUserHandler(w http.ResponseWriter, r *http.Request) {
	var u User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		log.Printf("error decoding user data from json: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
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
		"exp":      time.Now().Add(1 * time.Hour).Unix(),
	})
	tokenString, _ := token.SignedString([]byte("SECRET_KEY"))
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    tokenString,
		HttpOnly: true,
		Path:     "/",
		MaxAge:   86400,
	})
	w.WriteHeader(http.StatusOK)
}

func currentUser(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("auth_token")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	token, _ := jwt.Parse(cookie.Value, func(token *jwt.Token) (interface{}, error) {
		return []byte("SECRET_KEY"), nil
	})
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		idFloat, ok := claims["id"].(float64)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		id := int(idFloat)
		u, err := getUserById(id, DB)
		if err != nil {
			log.Printf("error retrieving user information: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
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
	} else {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
}

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

func requireAdmin(r *http.Request) bool {
	cookie, err := r.Cookie("auth_token")
	if err != nil {
		return false
	}
	token, err := jwt.Parse(cookie.Value, func(token *jwt.Token) (interface{}, error) {
		return []byte("SECRET_KEY"), nil
	})
	if err != nil || !token.Valid {
		return false
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return false
	}
	role, _ := claims["role"].(string)
	return role == "ADMIN"
}

func createRechnungHandler(w http.ResponseWriter, r *http.Request) {
	var req CreateRechnungRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("error decoding rechnung: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err := insertRechnung(req, DB); err != nil {
		log.Printf("error inserting rechnung: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

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

func main() {
	OpenDatabaseHandle()
	router := http.NewServeMux()
	router.HandleFunc("/get/all-products/", getProducts)
	router.HandleFunc("/get/all-categories/", getCategories)
	router.HandleFunc("/get/all-orders/", getAllOrdersHandler)
	router.HandleFunc("/get/unpaid-orders/", getUnpaidOrdersHandler)
	router.HandleFunc("/get/all-users/", getAllUsersHandler)
	router.HandleFunc("/get/order/table/{id}", getOpenOrdersForTableHandler)
	router.HandleFunc("/get/all-orders/table/{id}", getAllOrdersForTableHandler)
	router.HandleFunc("/get/user/{id}", getUserByIdHandler)

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
