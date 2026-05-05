package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"
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

func statsPDFHandler(w http.ResponseWriter, r *http.Request) {
	if err := generateProductReport(DB); err != nil {
		log.Printf("error generating report report: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Serve the generated file directly in the response
	data, err := os.ReadFile("produkte.pdf")
	if err != nil {
		log.Printf("error reading generated pdf: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "attachment; filename=\"Report.pdf\"")
	w.Write(data)
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

	router.HandleFunc("/stats/pdf/", statsPDFHandler)

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
