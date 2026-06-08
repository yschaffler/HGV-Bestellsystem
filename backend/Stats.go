package main

import (
	"fmt"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/core"
)

func getStatsForPDF() (core.Maroto, error) {
	m := maroto.New()
	arrRechnungen, err := getAllRechnungen(DB)
	arrStorno, err := getAllStornos(DB)
	if err != nil {
		return nil, err
	}

	if err := Umsatz(m, arrRechnungen, arrStorno); err != nil {
		return nil, err
	}

	m.AddRow(5) //Leerzeile

	if err := AnzahlVerkaufterArtikel(m, arrRechnungen); err != nil {
		return nil, err
	}

	m.AddRow(5) //Leerzeile

	if err := UmsatzProKellner(m, arrRechnungen); err != nil {
		return nil, err
	}

	m.AddRow(5) //Leerzeile

	if err := TopArtikel(m); err != nil {
		return nil, err
	}

	return m, nil
}

func Umsatz(m core.Maroto, arrRechnungen []Rechnung, arrStorno []Rechnung) error {
	UmsatzGes := 0.0
	for i := 0; i < len(arrRechnungen); i++ {
		UmsatzGes += arrRechnungen[i].Gesamt
	}
	m.AddRow(5,
		text.NewCol(4, "Umsatz mit Stornos"),
		text.NewCol(4, "->"),
		text.NewCol(4, fmt.Sprintf("%v", UmsatzGes)),
	)

	m.AddRow(5) //Leerzeile

	Storno := 0.0
	for i := 0; i < len(arrStorno); i++ {
		Storno += arrStorno[i].Gesamt
	}
	m.AddRow(5,
		text.NewCol(4, "Gesamt Stornos"),
		text.NewCol(4, "->"),
		text.NewCol(4, fmt.Sprintf("%v", Storno)),
	)

	m.AddRow(5) //Leerzeile

	UmsatzOhneStorno := UmsatzGes - Storno
	m.AddRow(5,
		text.NewCol(4, "Umsatz ohne Stornos"),
		text.NewCol(4, "->"),
		text.NewCol(4, fmt.Sprintf("%v", UmsatzOhneStorno)),
	)
	return nil
}

func AnzahlVerkaufterArtikel(m core.Maroto, arrRechnungen []Rechnung) error {
	Anzahl := 0
	for i := 0; i < len(arrRechnungen); i++ {
		Anzahl += arrRechnungen[i].Positionen[0].Amount
	}
	m.AddRow(5,
		text.NewCol(4, "Anzahl Verkaufter Artikel"),
		text.NewCol(4, "->"),
		text.NewCol(4, fmt.Sprintf("%v", Anzahl)),
	)
	return nil
}

func UmsatzProKellner(m core.Maroto, arrRechnungen []Rechnung) error {
	var KellnerUmsatzmap map[string]float64 = make(map[string]float64)

	m.AddRow(5,
		text.NewCol(4, "KellnerID"),
		text.NewCol(4, "->"),
		text.NewCol(4, "Gesamt"),
	)

	for i := 0; i < len(arrRechnungen); i++ {
		if arrRechnungen[i].KellnerId == "" {
			continue
		}
		KellnerUmsatzmap[arrRechnungen[i].KellnerId] += arrRechnungen[i].Gesamt
	}

	for key, value := range KellnerUmsatzmap {
		m.AddRow(5,
			text.NewCol(4, fmt.Sprintf("%v", key)),
			text.NewCol(4, fmt.Sprintf("%v", "->")),
			text.NewCol(4, fmt.Sprintf("%v", value)),
		)
	}
	return nil
}

func TopArtikel(m core.Maroto) error {
	arrRechnungen, err := getAllRechnungen(DB)
	mapTopArtikel := make(map[string]float64)
	mengeReturnedArtikel := 0
	if err != nil {
		return err
	}
	for i := 0; i < len(arrRechnungen); i++ {
		for j := 0; j < len(arrRechnungen[i].Positionen); j++ {
			mapTopArtikel[arrRechnungen[i].Positionen[j].Name] += float64(arrRechnungen[i].Positionen[j].Amount)
		}
	}

	sortedArtikel := make([]string, 0, len(mapTopArtikel))
	for key := range mapTopArtikel {
		sortedArtikel = append(sortedArtikel, key)
	}
	m.AddRow(5,
		text.NewCol(4, "Top 3 Artikel:"),
	)

	if len(sortedArtikel) < mengeReturnedArtikel {
		mengeReturnedArtikel = len(sortedArtikel)
	}
	for i := 0; i < mengeReturnedArtikel; i++ {
		m.AddRow(5,
			text.NewCol(4, fmt.Sprintf("%v", sortedArtikel[i])),
			text.NewCol(4, "->"),
			text.NewCol(4, fmt.Sprintf("%v", mapTopArtikel[sortedArtikel[i]])),
		)
	}
	return nil
}
