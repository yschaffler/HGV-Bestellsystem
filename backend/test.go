package main

import (
	"database/sql"
	"fmt"
	"strconv"

	//"github.com/johnfercher/maroto/v2/pkg/components/checkbox"

	"github.com/johnfercher/maroto/v2/pkg/core"

	//"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	//"github.com/johnfercher/maroto/v2/pkg/components/line"

	"github.com/johnfercher/maroto/v2"

	//"github.com/johnfercher/maroto/v2/pkg/components/code"
	//"github.com/johnfercher/maroto/v2/pkg/components/image"
	//"github.com/johnfercher/maroto/v2/pkg/components/signature"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/props"
)

type ReportColumn struct {
	Header string
	Width  int // was uint
}

func buildPdf(title string, cols []ReportColumn, rows [][]string) core.Maroto {
	m := maroto.New()
	m.AddRows(text.NewRow(10, title, props.Text{Size: 16, Style: fontstyle.Bold}))

	headerCols := make([]core.Col, len(cols))
	for i, c := range cols {
		headerCols[i] = text.NewCol(c.Width, c.Header, props.Text{Style: fontstyle.Bold})
	}
	m.AddRows(row.New(12).Add(headerCols...)) // col → row

	for _, r := range rows {
		rowCols := make([]core.Col, len(cols))
		for i, c := range cols {
			val := ""
			if i < len(r) {
				val = r[i]
			}
			rowCols[i] = text.NewCol(c.Width, val, props.Text{Size: 9})
		}
		m.AddRows(row.New(12).Add(rowCols...)) // col → row
	}
	return m
}

func generateProductReport(db *sql.DB) error {
	products, err := getAllProducts(db)
	if err != nil {
		return fmt.Errorf("failed to get products: %v", err)
	}

	cols := []ReportColumn{
		{Header: "ID", Width: 2},
		{Header: "Name", Width: 6},
		{Header: "Preis", Width: 2},
		{Header: "Kategorie", Width: 2},
	}

	// Convert []Product into [][]string for buildPdf
	var rows [][]string
	for _, p := range products {
		rows = append(rows, []string{
			strconv.Itoa(p.Product_Id),
			p.Name,
			fmt.Sprintf("%.2f €", p.Price),
			strconv.Itoa(p.Category),
		})
	}

	m := buildPdf("Produktliste", cols, rows)
	doc, err := m.Generate()
	if err != nil {
		return fmt.Errorf("failed to generate pdf: %v", err)
	}
	return doc.Save("produkte.pdf")
}
