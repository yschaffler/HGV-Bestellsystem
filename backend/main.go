package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
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
	/*r.ParseForm()
	price, err := strconv.ParseFloat(r.FormValue("price"), 64)
	if err != nil {
		log.Printf("error parsing price: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	name := r.FormValue("name")
	category, err := strconv.Atoi(r.FormValue("category"))
	if err != nil {
		log.Printf("error parsing price: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	product := Product{Price: price, Name: name, Category: category}
	err = insertProduct(product, DB)
	if err != nil {
		log.Printf("error inserting into database: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)*/
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

func main() {
	OpenDatabaseHandle()
	router := http.NewServeMux()
	router.HandleFunc("/get/all-products/", getProducts)
	router.HandleFunc("/get/all-categories/", getCategories)
	router.HandleFunc("/add/product/", addProduct)
	router.HandleFunc("/update/product/", updateProductHandler)
	router.HandleFunc("/delete/product/", deleteProductHandler)
	router.HandleFunc("/add/category/", addCategoryHandler)
	router.HandleFunc("/delete/category/", deleteCategoryHandler)

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
