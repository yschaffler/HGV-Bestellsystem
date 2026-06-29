package main

import (
	"fmt"
	"sort"
	"strconv"
	"time"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/image"
	"github.com/johnfercher/maroto/v2/pkg/components/line"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
)

// resolveKellnerName maps a kellner_id string to a human-readable name.
func resolveKellnerName(id string, userMap map[int]User) string {
	if id == "" {
		return "Unbekannt"
	}
	n, err := strconv.Atoi(id)
	if err != nil {
		// not a numeric ID → return as-is (e.g. legacy "bar")
		return id
	}
	if u, ok := userMap[n]; ok {
		if u.Name != "" {
			return u.Name
		}
		return u.Username
	}
	return id
}

// sectionHeader adds a bold section title with a horizontal rule.
func sectionHeader(m core.Maroto, title string) {
	m.AddRow(4)
	m.AddRow(6,
		text.NewCol(12, title, props.Text{Style: fontstyle.Bold, Size: 10}),
	)
	m.AddRow(3, line.NewCol(12, props.Line{Thickness: 0.4}))
}

// tableHeader adds a shaded header row for a table.
func tableHeader(m core.Maroto, cols []struct {
	label string
	width uint
	right bool
}) {
	cells := make([]core.Col, len(cols))
	for i, c := range cols {
		a := align.Left
		if c.right {
			a = align.Right
		}
		cells[i] = text.NewCol(int(c.width), c.label, props.Text{
			Style: fontstyle.Bold,
			Size:  8,
			Align: a,
		})
	}
	m.AddRow(6, cells...)
	m.AddRow(1, line.NewCol(12, props.Line{Thickness: 0.2}))
}

func getStatsForPDF() (core.Maroto, error) {
	m := maroto.New()

	arrRechnungen, err := getAllRechnungen(DB)
	if err != nil {
		return nil, err
	}
	arrNonStorno, err := getAllNonStornoRechnungen(DB)
	if err != nil {
		return nil, err
	}
	arrStorno, err := getAllStornos(DB)
	if err != nil {
		return nil, err
	}

	// Build user lookup map for name resolution
	allUsers, err := getAllUsers(DB)
	if err != nil {
		return nil, err
	}
	userMap := make(map[int]User, len(allUsers))
	for _, u := range allUsers {
		userMap[u.Id] = u
	}

	// ── Document header ───────────────────────────────────────────────────────
	const iconPath = "./public/icons/icon-192x192.png"
	iconCol := image.NewFromFileCol(1, iconPath, props.Rect{Percent: 90, Center: true})

	m.AddRow(14,
		iconCol,
		text.NewCol(7, "HGV Bestellsystem", props.Text{
			Style: fontstyle.Bold,
			Size:  14,
			Top:   2,
		}),
		text.NewCol(4, time.Now().Format("02.01.2006 15:04 Uhr"), props.Text{
			Align: align.Right,
			Size:  8,
			Top:   5,
		}),
	)
	m.AddRow(4,
		text.NewCol(1, ""),
		text.NewCol(11, "Event-Auswertung", props.Text{Size: 9}),
	)
	m.AddRow(2, line.NewCol(12, props.Line{Thickness: 0.8}))
	m.AddRow(3)

	// ── KPIs ─────────────────────────────────────────────────────────────────
	umsatzGes := 0.0
	for _, r := range arrRechnungen {
		umsatzGes += r.Gesamt
	}
	stornoGes := 0.0
	for _, r := range arrStorno {
		stornoGes += r.Gesamt // negative
	}

	totalSold := 0
	for _, r := range arrNonStorno {
		for _, pos := range r.Positionen {
			totalSold += pos.Amount
		}
	}
	for _, r := range arrStorno {
		for _, pos := range r.Positionen {
			totalSold -= pos.Amount
		}
	}
	if totalSold < 0 {
		totalSold = 0
	}

	// best table by revenue
	tischMap := make(map[int]float64)
	for _, r := range arrRechnungen {
		tischMap[r.Tisch] += r.Gesamt
	}
	bestTable, bestTableRev := -1, 0.0
	for t, rev := range tischMap {
		if rev > bestTableRev {
			bestTable, bestTableRev = t, rev
		}
	}

	m.AddRow(6,
		text.NewCol(3, "Umsatz (netto)", props.Text{Style: fontstyle.Bold, Size: 9}),
		text.NewCol(3, "Storniert", props.Text{Style: fontstyle.Bold, Size: 9}),
		text.NewCol(3, "Stärkster Tisch", props.Text{Style: fontstyle.Bold, Size: 9}),
		text.NewCol(3, "Artikel verkauft", props.Text{Style: fontstyle.Bold, Size: 9}),
	)
	bestTableLabel := "–"
	if bestTable >= 0 {
		if bestTable == 0 {
			bestTableLabel = fmt.Sprintf("Bar (%.2f €)", bestTableRev)
		} else {
			bestTableLabel = fmt.Sprintf("Tisch %d (%.2f €)", bestTable, bestTableRev)
		}
	}
	m.AddRow(7,
		text.NewCol(3, fmt.Sprintf("%.2f €", umsatzGes), props.Text{Size: 11, Style: fontstyle.Bold}),
		text.NewCol(3, fmt.Sprintf("%.2f €", stornoGes), props.Text{Size: 11}),
		text.NewCol(3, bestTableLabel, props.Text{Size: 9}),
		text.NewCol(3, fmt.Sprintf("%d Stück", totalSold), props.Text{Size: 11}),
	)
	m.AddRow(2,
		text.NewCol(3, fmt.Sprintf("%d Rechnungen", len(arrNonStorno)), props.Text{Size: 7}),
		text.NewCol(3, fmt.Sprintf("%d Stornos", len(arrStorno)), props.Text{Size: 7}),
		text.NewCol(6, ""),
	)
	m.AddRow(5)

	// ── Kellner / Account Übersicht ───────────────────────────────────────────
	type kellnerStat struct {
		name    string
		umsatz  float64
		storni  float64
		count   int
	}
	kellnerMap := make(map[string]*kellnerStat)
	for _, r := range arrRechnungen {
		id := r.KellnerId
		if id == "" {
			id = "Unbekannt"
		}
		if kellnerMap[id] == nil {
			kellnerMap[id] = &kellnerStat{name: resolveKellnerName(id, userMap)}
		}
		s := kellnerMap[id]
		s.umsatz += r.Gesamt
		if r.Typ == "RECHNUNG" {
			s.count++
		} else {
			s.storni += -r.Gesamt
		}
	}
	if len(kellnerMap) > 0 {
		sectionHeader(m, "Kellner / Accounts")
		tableHeader(m, []struct {
			label string
			width uint
			right bool
		}{
			{"Name", 5, false},
			{"Rechnungen", 3, true},
			{"Storno", 2, true},
			{"Umsatz", 2, true},
		})

		type ks struct {
			id string
			*kellnerStat
		}
		var kSlice []ks
		for id, s := range kellnerMap {
			kSlice = append(kSlice, ks{id, s})
		}
		sort.Slice(kSlice, func(i, j int) bool { return kSlice[i].umsatz > kSlice[j].umsatz })
		for _, k := range kSlice {
			stornoStr := "–"
			if k.storni > 0 {
				stornoStr = fmt.Sprintf("-%.2f €", k.storni)
			}
			m.AddRow(5,
				text.NewCol(5, k.name, props.Text{Size: 8}),
				text.NewCol(3, fmt.Sprintf("%d", k.count), props.Text{Size: 8, Align: align.Right}),
				text.NewCol(2, stornoStr, props.Text{Size: 8, Align: align.Right}),
				text.NewCol(2, fmt.Sprintf("%.2f €", k.umsatz), props.Text{Size: 8, Align: align.Right, Style: fontstyle.Bold}),
			)
		}
		m.AddRow(5)
	}

	// ── Tische ────────────────────────────────────────────────────────────────
	if len(tischMap) > 0 {
		type tischStat struct {
			tisch   int
			revenue float64
			count   int
		}
		tischCountMap := make(map[int]int)
		for _, r := range arrNonStorno {
			tischCountMap[r.Tisch]++
		}
		var tischSlice []tischStat
		for t, rev := range tischMap {
			tischSlice = append(tischSlice, tischStat{t, rev, tischCountMap[t]})
		}
		sort.Slice(tischSlice, func(i, j int) bool { return tischSlice[i].revenue > tischSlice[j].revenue })

		sectionHeader(m, "Tische")
		tableHeader(m, []struct {
			label string
			width uint
			right bool
		}{
			{"Tisch", 4, false},
			{"Bestellungen", 4, true},
			{"Umsatz", 4, true},
		})
		for _, t := range tischSlice {
			label := fmt.Sprintf("Tisch %d", t.tisch)
			if t.tisch == 0 {
				label = "Bar"
			}
			m.AddRow(5,
				text.NewCol(4, label, props.Text{Size: 8}),
				text.NewCol(4, fmt.Sprintf("%d", t.count), props.Text{Size: 8, Align: align.Right}),
				text.NewCol(4, fmt.Sprintf("%.2f €", t.revenue), props.Text{Size: 8, Align: align.Right, Style: fontstyle.Bold}),
			)
		}
		m.AddRow(5)
	}

	// ── Kategorien ────────────────────────────────────────────────────────────
	type katData struct {
		name         string
		sold         int
		revenue      float64
		stornoSold   int
		stornoRev    float64
	}
	katMap := make(map[string]*katData)
	for _, r := range arrNonStorno {
		for _, pos := range r.Positionen {
			k := pos.Kategorie
			if k == "" {
				k = "Sonstiges"
			}
			if katMap[k] == nil {
				katMap[k] = &katData{name: k}
			}
			katMap[k].sold += pos.Amount
			katMap[k].revenue += pos.Price * float64(pos.Amount)
		}
	}
	for _, r := range arrStorno {
		for _, pos := range r.Positionen {
			k := pos.Kategorie
			if k == "" {
				k = "Sonstiges"
			}
			if katMap[k] == nil {
				katMap[k] = &katData{name: k}
			}
			katMap[k].stornoSold += pos.Amount
			katMap[k].stornoRev += pos.Price * float64(pos.Amount)
		}
	}

	type katEntry struct{ *katData }
	var katSlice []katEntry
	for _, kd := range katMap {
		katSlice = append(katSlice, katEntry{kd})
	}
	sort.Slice(katSlice, func(i, j int) bool {
		return (katSlice[i].revenue - katSlice[i].stornoRev) > (katSlice[j].revenue - katSlice[j].stornoRev)
	})

	if len(katSlice) > 0 {
		sectionHeader(m, "Kategorien")
		tableHeader(m, []struct {
			label string
			width uint
			right bool
		}{
			{"Kategorie", 5, false},
			{"Stück (netto)", 3, true},
			{"Storno", 2, true},
			{"Umsatz (netto)", 2, true},
		})
		for _, k := range katSlice {
			net := k.revenue - k.stornoRev
			netSold := k.sold - k.stornoSold
			stornoStr := "–"
			if k.stornoRev > 0 {
				stornoStr = fmt.Sprintf("-%.2f €", k.stornoRev)
			}
			m.AddRow(5,
				text.NewCol(5, k.name, props.Text{Size: 8}),
				text.NewCol(3, fmt.Sprintf("%d", netSold), props.Text{Size: 8, Align: align.Right}),
				text.NewCol(2, stornoStr, props.Text{Size: 8, Align: align.Right}),
				text.NewCol(2, fmt.Sprintf("%.2f €", net), props.Text{Size: 8, Align: align.Right, Style: fontstyle.Bold}),
			)
		}
		m.AddRow(5)
	}

	// ── Artikel pro Kategorie ─────────────────────────────────────────────────
	type artikelInfo struct {
		name   string
		sold   int
		revenue float64
	}
	produktMap := make(map[string]map[string]*artikelInfo) // kat → name → info
	for _, r := range arrNonStorno {
		for _, pos := range r.Positionen {
			k := pos.Kategorie
			if k == "" {
				k = "Sonstiges"
			}
			if produktMap[k] == nil {
				produktMap[k] = make(map[string]*artikelInfo)
			}
			if produktMap[k][pos.Name] == nil {
				produktMap[k][pos.Name] = &artikelInfo{name: pos.Name}
			}
			produktMap[k][pos.Name].sold += pos.Amount
			produktMap[k][pos.Name].revenue += pos.Price * float64(pos.Amount)
		}
	}
	for _, r := range arrStorno {
		for _, pos := range r.Positionen {
			k := pos.Kategorie
			if k == "" {
				k = "Sonstiges"
			}
			if produktMap[k] != nil && produktMap[k][pos.Name] != nil {
				produktMap[k][pos.Name].sold -= pos.Amount
				produktMap[k][pos.Name].revenue -= pos.Price * float64(pos.Amount)
			}
		}
	}

	Kategorien, err := getAllCategories(DB)
	if err != nil {
		return nil, err
	}

	// Build ordered category list (DB order + any extra from orders)
	orderedKats := make([]string, 0)
	seen := make(map[string]bool)
	for _, cat := range Kategorien {
		if produktMap[cat.Name] != nil {
			orderedKats = append(orderedKats, cat.Name)
			seen[cat.Name] = true
		}
	}
	for k := range produktMap {
		if !seen[k] {
			orderedKats = append(orderedKats, k)
		}
	}

	if len(orderedKats) > 0 {
		sectionHeader(m, "Artikel pro Kategorie")
		for _, katName := range orderedKats {
			prods := produktMap[katName]
			if len(prods) == 0 {
				continue
			}
			var aSlice []artikelInfo
			for _, a := range prods {
				if a.sold > 0 {
					aSlice = append(aSlice, *a)
				}
			}
			if len(aSlice) == 0 {
				continue
			}
			sort.Slice(aSlice, func(i, j int) bool { return aSlice[i].revenue > aSlice[j].revenue })

			m.AddRow(6,
				text.NewCol(12, katName, props.Text{Style: fontstyle.Bold, Size: 8}),
			)
			for _, a := range aSlice {
				m.AddRow(5,
					text.NewCol(1, ""),
					text.NewCol(7, a.name, props.Text{Size: 8}),
					text.NewCol(2, fmt.Sprintf("%dx", a.sold), props.Text{Size: 8, Align: align.Right}),
					text.NewCol(2, fmt.Sprintf("%.2f €", a.revenue), props.Text{Size: 8, Align: align.Right}),
				)
			}
			m.AddRow(3)
		}
	}

	// ── Footer ────────────────────────────────────────────────────────────────
	m.AddRow(5)
	m.AddRow(2, line.NewCol(12, props.Line{Thickness: 0.4}))
	m.AddRow(5,
		text.NewCol(12, fmt.Sprintf("Erstellt am %s", time.Now().Format("02.01.2006 um 15:04 Uhr")),
			props.Text{Size: 7, Align: align.Center}),
	)

	return m, nil
}
