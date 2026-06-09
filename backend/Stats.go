package main

import (
	"fmt"

	"sort"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
)

func getStatsForPDF() (core.Maroto, error) {
	m := maroto.New()
	arrRechnungen, err := getAllRechnungen(DB)
	arrNonStorno, err := getAllNonStornoRechnungen(DB)
	if err != nil {
		return nil, err
	}
	arrStorno, err := getAllStornos(DB)
	if err != nil {
		return nil, err
	}

	if err := Umsatz(m, arrRechnungen, arrStorno); err != nil {
		return nil, err
	}

	m.AddRow(5) //Leerzeile

	if err := AnzahlVerkaufterArtikel(m, arrNonStorno); err != nil {
		return nil, err
	}

	m.AddRow(5) //Leerzeile

	if err := UmsatzProKellner(m, arrRechnungen); err != nil {
		return nil, err
	}

	m.AddRow(5) //Leerzeile

	if err := UmsatzProKategorie(m, arrRechnungen); err != nil {
		return nil, err
	}

	m.AddRow(5) //Leerzeile

	if err := ArtikelProKategorie(m, arrNonStorno); err != nil {
		return nil, err
	}

	//^ ENTHÄLT LEERZEILE; KEINE WEITER BENÖIGT
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
		text.NewCol(4, fmt.Sprintf("%.2f €", UmsatzGes)),
	)

	m.AddRow(5) //Leerzeile

	Storno := 0.0
	for i := 0; i < len(arrStorno); i++ {
		Storno += arrStorno[i].Gesamt
	}
	m.AddRow(5,
		text.NewCol(4, "Gesamt Stornos"),
		text.NewCol(4, "->"),
		text.NewCol(4, fmt.Sprintf("%.2f €", Storno)),
	)

	m.AddRow(5) //Leerzeile

	return nil
}

func AnzahlVerkaufterArtikel(m core.Maroto, arrRechnungen []Rechnung) error {
	Anzahl := 0
	for _, rechnung := range arrRechnungen {
		for _, pos := range rechnung.Positionen {
			Anzahl += pos.Amount
		}
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
		text.NewCol(4, "KellnerID", props.Text{Style: fontstyle.Bold}),
		text.NewCol(4, "->"),
		text.NewCol(4, "Gesamt", props.Text{Style: fontstyle.Bold}),
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
			text.NewCol(4, fmt.Sprintf("%.2f €", value)),
		)
	}
	return nil
}

// currently no used
func TopArtikel(m core.Maroto) error {
	arrRechnungen, err := getAllRechnungen(DB)
	mapTopArtikel := make(map[string]float64)

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
		text.NewCol(4, "Top 3 Artikel:", props.Text{Style: fontstyle.Bold}),
	)

	for i := 0; i < len(sortedArtikel); i++ {
		m.AddRow(5,
			text.NewCol(4, fmt.Sprintf("%v", sortedArtikel[i])),
			text.NewCol(4, "->"),
			text.NewCol(4, fmt.Sprintf("%.2f €", mapTopArtikel[sortedArtikel[i]])),
		)
	}
	return nil
}

func UmsatzProKategorie(m core.Maroto, arrRechnungen []Rechnung) error {
	mapKategorie := make(map[string]float64)

	for _, rechnung := range arrRechnungen {
		for _, pos := range rechnung.Positionen {
			if pos.Kategorie == "" {
				continue
			}
			mapKategorie[pos.Kategorie] += pos.Price * float64(pos.Amount)
		}
	}

	m.AddRow(5,
		text.NewCol(4, "Umsatz pro Kategorie:", props.Text{Style: fontstyle.Bold}),
	)

	type kategorieInfo struct {
		name   string
		umsatz float64
	}
	kategorieSlice := make([]kategorieInfo, 0, len(mapKategorie))
	for name, umsatz := range mapKategorie {
		kategorieSlice = append(kategorieSlice, kategorieInfo{name: name, umsatz: umsatz})
	}
	sort.Slice(kategorieSlice, func(i, j int) bool {
		return kategorieSlice[i].umsatz > kategorieSlice[j].umsatz
	})

	for _, k := range kategorieSlice {
		m.AddRow(5,
			text.NewCol(4, k.name),
			text.NewCol(4, "->"),
			text.NewCol(4, fmt.Sprintf("%.2f €", k.umsatz)),
		)
	}

	return nil
}

func ArtikelProKategorie(m core.Maroto, arrRechnungen []Rechnung) error {
	Kategorien, err := getAllCategories(DB)
	verkaufMap := make(map[string]map[string]float64)
	type artikelInfo struct {
		name  string
		menge float64
	}

	if err != nil {
		return err
	}

	for _, rechnung := range arrRechnungen {
		for _, pos := range rechnung.Positionen {
			if pos.Kategorie == "" {
				continue
			}
			if verkaufMap[pos.Kategorie] == nil {
				verkaufMap[pos.Kategorie] = make(map[string]float64)
			}
			verkaufMap[pos.Kategorie][pos.Name] += float64(pos.Amount)
		}
	}

	m.AddRow(5,
		text.NewCol(4, "Artikel", props.Text{Style: fontstyle.Bold}),
		text.NewCol(4, "->"),
		text.NewCol(4, "Menge Verkauft", props.Text{Style: fontstyle.Bold}),
	)

	for _, cat := range Kategorien {
		artikelInKat, ok := verkaufMap[cat.Name]
		if !ok || len(artikelInKat) == 0 {
			continue
		}

		artikelSlice := make([]artikelInfo, 0, len(artikelInKat))
		for name, menge := range artikelInKat {
			artikelSlice = append(artikelSlice, artikelInfo{name: name, menge: menge})
		}

		sort.Slice(artikelSlice, func(i, j int) bool {
			return artikelSlice[i].menge > artikelSlice[j].menge
		})

		m.AddRow(5,
			text.NewCol(4, cat.Name+":", props.Text{Style: fontstyle.Bold}),
		)

		for _, a := range artikelSlice {
			m.AddRow(5,
				text.NewCol(4, a.name),
				text.NewCol(4, ""),
				text.NewCol(4, fmt.Sprintf("%.0f", a.menge)),
			)
		}

		m.AddRow(5) //Leerzeile
	}
	return nil
}
