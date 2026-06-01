package main

import (
	"fmt"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/core"
)

func OrderByServerID() (core.Maroto, error) {
	arrRechnungen, r := getAllRechnungen(DB)
	arrStorno, r := getAllStornos(DB)
	if r != nil {
		return nil, r
	}

	m := maroto.New()

	//Umsatz
	Umsatz := 0.0
	for i := 0; i < len(arrRechnungen); i++ {
		Umsatz += arrRechnungen[i].Gesamt
	}
	m.AddRow(5,
		text.NewCol(4, "Umsatz"),
		text.NewCol(4, "->"),
		text.NewCol(4, fmt.Sprintf("%v", Umsatz)),
	)

	//Gesamt Stornos
	Storno := 0.0
	for i := 0; i < len(arrStorno); i++ {
		Storno += arrStorno[i].Gesamt
	}
	m.AddRow(5,
		text.NewCol(4, "Alle Stornos"),
		text.NewCol(4, "->"),
		text.NewCol(4, fmt.Sprintf("%v", Storno)),
	)

	//Anzahl Verkaufter Artikel
	Anzahl := 0
	for i := 0; i < len(arrRechnungen); i++ {
		Anzahl += arrRechnungen[i].Positionen[0].Amount
	}
	m.AddRow(5,
		text.NewCol(4, "Anzahl Verkaufter Artikel"),
		text.NewCol(4, "->"),
		text.NewCol(4, fmt.Sprintf("%v", Anzahl)),
	)

	//Kellner zuordnung zu Einnahmen
	var tempmap map[string]float64 = make(map[string]float64)
	m.AddRow(5,
		text.NewCol(4, "KellnerID"),
		text.NewCol(4, "->"),
		text.NewCol(4, "Gesamt"),
	)

	for i := 0; i < len(arrRechnungen); i++ {
		if arrRechnungen[i].KellnerId == "" {
			arrRechnungen[i].KellnerId = "Bar"
		}
		tempmap[arrRechnungen[i].KellnerId] += arrRechnungen[i].Gesamt
	}

	for key, value := range tempmap {
		m.AddRow(5,
			text.NewCol(4, fmt.Sprintf("%v", key)),
			text.NewCol(4, fmt.Sprintf("%v", "->")),
			text.NewCol(4, fmt.Sprintf("%v", value)),
		)
	}

	return m, nil
}
