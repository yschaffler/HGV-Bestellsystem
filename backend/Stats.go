package main

import (
	"fmt"
	"sort"
	"strconv"
	"time"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/image"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/border"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/consts/pagesize"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
)

// ── Colours ───────────────────────────────────────────────────────────────────

var (
	cDark   = &props.Color{Red: 28, Green: 28, Blue: 28}
	cGray   = &props.Color{Red: 100, Green: 100, Blue: 100}
	cLight  = &props.Color{Red: 247, Green: 247, Blue: 247}
	cAlt    = &props.Color{Red: 255, Green: 255, Blue: 255}
	cBorder = &props.Color{Red: 210, Green: 210, Blue: 210}
	cWhite  = &props.Color{Red: 255, Green: 255, Blue: 255}
	cBar    = &props.Color{Red: 28, Green: 28, Blue: 28} // table header bg
)

// ── Cell style presets ────────────────────────────────────────────────────────

func styleHeader() *props.Cell {
	return &props.Cell{BackgroundColor: cBar, BorderType: border.None}
}
func styleEven() *props.Cell {
	return &props.Cell{BackgroundColor: cLight, BorderType: border.None}
}
func styleOdd() *props.Cell {
	return &props.Cell{BackgroundColor: cAlt, BorderType: border.None}
}
func styleKpi() *props.Cell {
	return &props.Cell{
		BackgroundColor: cLight,
		BorderType:      border.Full,
		BorderColor:     cBorder,
		BorderThickness: 0.3,
	}
}
func styleSub() *props.Cell {
	return &props.Cell{
		BackgroundColor: &props.Color{Red: 238, Green: 238, Blue: 238},
		BorderType:      border.None,
	}
}
func styleSep() *props.Cell {
	return &props.Cell{BackgroundColor: cDark, BorderType: border.None}
}
func styleFooterSep() *props.Cell {
	return &props.Cell{BackgroundColor: cBorder, BorderType: border.None}
}

// ── Generic column builders ───────────────────────────────────────────────────

func th(width int, label string, a align.Type) core.Col {
	return text.NewCol(width, label, props.Text{
		Style: fontstyle.Bold, Size: 8,
		Align: a, Color: cWhite, Top: 2.5,
	}).WithStyle(styleHeader())
}

func td(width int, label string, a align.Type, bold bool, even bool) core.Col {
	fs := fontstyle.Normal
	if bold {
		fs = fontstyle.Bold
	}
	st := styleOdd()
	if even {
		st = styleEven()
	}
	return text.NewCol(width, label, props.Text{
		Style: fs, Size: 8, Align: a, Top: 2,
	}).WithStyle(st)
}

// ── Money (German format: 1.234,56 €) ────────────────────────────────────────

func eur(v float64) string {
	negative := v < 0
	if negative {
		v = -v
	}
	whole := int64(v)
	frac := int(v*100+0.5) % 100
	// insert thousand separators
	s := fmt.Sprintf("%d", whole)
	out := ""
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			out += "."
		}
		out += string(c)
	}
	result := fmt.Sprintf("%s,%02d €", out, frac)
	if negative {
		return "-" + result
	}
	return result
}

// ── Name resolution ───────────────────────────────────────────────────────────

func resolveKellnerName(id string, userMap map[int]User) string {
	if id == "" {
		return "Unbekannt"
	}
	n, err := strconv.Atoi(id)
	if err != nil {
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

// ── Section heading ───────────────────────────────────────────────────────────

func section(m core.Maroto, title string) {
	m.AddRows(row.New(5))
	m.AddRows(row.New(6).Add(
		text.NewCol(12, title, props.Text{
			Style: fontstyle.Bold, Size: 8,
			Color: cGray, Top: 1,
		}),
	))
	// thin rule under heading
	m.AddRows(row.New(1).Add(
		text.NewCol(12, "").WithStyle(&props.Cell{
			BackgroundColor: cBorder, BorderType: border.None,
		}),
	))
	m.AddRows(row.New(3))
}

// ── PDF ───────────────────────────────────────────────────────────────────────

func getStatsForPDF() (core.Maroto, error) {
	cfg := config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithLeftMargin(14).
		WithRightMargin(14).
		WithTopMargin(14).
		WithBottomMargin(14).
		WithPageNumber(props.PageNumber{
			Pattern: "Seite {current} von {total}",
			Place:   props.RightBottom,
		}).
		Build()

	m := maroto.New(cfg)

	// ── Load data ─────────────────────────────────────────────────────────────
	arrAll, err := getAllRechnungen(DB)
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
	allUsers, err := getAllUsers(DB)
	if err != nil {
		return nil, err
	}
	userMap := make(map[int]User, len(allUsers))
	for _, u := range allUsers {
		userMap[u.Id] = u
	}

	// ── KPI sums ──────────────────────────────────────────────────────────────
	totalRevenue := 0.0
	for _, r := range arrAll {
		totalRevenue += r.Gesamt
	}
	totalStorno := 0.0
	for _, r := range arrStorno {
		totalStorno += r.Gesamt // negative
	}
	totalItems := 0
	for _, r := range arrNonStorno {
		for _, p := range r.Positionen {
			totalItems += p.Amount
		}
	}
	for _, r := range arrStorno {
		for _, p := range r.Positionen {
			totalItems -= p.Amount
		}
	}
	if totalItems < 0 {
		totalItems = 0
	}
	tischRevMap := make(map[int]float64)
	for _, r := range arrAll {
		tischRevMap[r.Tisch] += r.Gesamt
	}
	bestTable, bestRev := -1, 0.0
	for t, rev := range tischRevMap {
		if rev > bestRev {
			bestTable, bestRev = t, rev
		}
	}

	// ═════════════════════════════════════════════════════════════════════════
	// HEADER  (col sum must equal 12)
	// 1 (icon) + 8 (title) + 3 (date) = 12
	// ═════════════════════════════════════════════════════════════════════════
	m.AddRows(row.New(15).Add(
		image.NewFromFileCol(1, "./public/icons/icon-192x192.png",
			props.Rect{Percent: 80, Center: true}),
		text.NewCol(8, "HGV Bestellsystem", props.Text{
			Style: fontstyle.Bold, Size: 15, Top: 3, Color: cDark,
		}),
		text.NewCol(3, time.Now().Format("02.01.2006\n15:04 Uhr"), props.Text{
			Align: align.Right, Size: 8, Top: 4, Color: cGray,
		}),
	))
	// subtitle row: 1 + 11 = 12
	m.AddRows(row.New(5).Add(
		text.NewCol(1, ""),
		text.NewCol(11, "Event-Auswertung", props.Text{
			Size: 9, Color: cGray,
		}),
	))
	// thick dark separator
	m.AddRows(row.New(1).Add(text.NewCol(12, "").WithStyle(styleSep())))
	m.AddRows(row.New(5))

	// ═════════════════════════════════════════════════════════════════════════
	// KPI CARDS  — 4 × 3 = 12  (no spacers!)
	// ═════════════════════════════════════════════════════════════════════════
	bestLabel := "–"
	if bestTable == 0 {
		bestLabel = "Bar"
	} else if bestTable > 0 {
		bestLabel = fmt.Sprintf("Tisch %d", bestTable)
	}

	// Thick top-accent + light bg for the entire KPI block
	styleKpiAccent := &props.Cell{
		BackgroundColor: cDark,
		BorderType:      border.None,
	}
	styleKpiBg := &props.Cell{
		BackgroundColor: cLight,
		BorderType:      border.None,
	}
	// 1-unit gap column between cards (white)
	styleGap := &props.Cell{
		BackgroundColor: cAlt,
		BorderType:      border.None,
	}
	gap := func() core.Col {
		return text.NewCol(1, "").WithStyle(styleGap)
	}
	// col widths: 3+0+3+0+3+0+3 would be 12 — but we use
	//   card(3) gap(0) ... not possible with int.
	// Instead: card=2, gap=1 → 2+1+2+1+2+1+2+1 = 12  (but cards only 2 wide)
	// Or keep card=3 and put border-right only on each card.
	// Best approach: use cards of width 3, no gaps, but add right border for separation.
	styleSepRight := &props.Cell{
		BackgroundColor: cLight,
		BorderType:      border.Right,
		BorderColor:     cBorder,
		BorderThickness: 0.5,
	}

	kpiLabelCol := func(w int, s string, sepRight bool) core.Col {
		st := styleKpiBg
		if sepRight {
			st = styleSepRight
		}
		return text.NewCol(w, s, props.Text{
			Style: fontstyle.Bold, Size: 7,
			Align: align.Center, Color: cGray, Top: 3,
		}).WithStyle(st)
	}
	kpiValueCol := func(w int, s string, sepRight bool) core.Col {
		st := styleKpiBg
		if sepRight {
			st = styleSepRight
		}
		return text.NewCol(w, s, props.Text{
			Style: fontstyle.Bold, Size: 13,
			Align: align.Center, Color: cDark, Top: 2,
		}).WithStyle(st)
	}
	kpiSubCol := func(w int, s string, sepRight bool) core.Col {
		st := styleKpiBg
		if sepRight {
			st = styleSepRight
		}
		return text.NewCol(w, s, props.Text{
			Size: 7, Align: align.Center, Color: cGray, Top: 1.5,
		}).WithStyle(st)
	}
	_ = gap // suppress unused warning

	// Top accent bar: thin dark strip = 3+3+3+3 = 12 ✓
	m.AddRows(row.New(2).Add(
		text.NewCol(3, "").WithStyle(styleKpiAccent),
		text.NewCol(3, "").WithStyle(styleKpiAccent),
		text.NewCol(3, "").WithStyle(styleKpiAccent),
		text.NewCol(3, "").WithStyle(styleKpiAccent),
	))
	// label row: 3+3+3+3 = 12 ✓
	m.AddRows(row.New(6).Add(
		kpiLabelCol(3, "UMSATZ (NETTO)", true),
		kpiLabelCol(3, "STORNIERT", true),
		kpiLabelCol(3, "STÄRKSTER TISCH", true),
		kpiLabelCol(3, "ARTIKEL", false),
	))
	// value row: 3+3+3+3 = 12 ✓
	m.AddRows(row.New(10).Add(
		kpiValueCol(3, eur(totalRevenue), true),
		kpiValueCol(3, eur(-totalStorno), true),
		kpiValueCol(3, bestLabel, true),
		kpiValueCol(3, fmt.Sprintf("%d", totalItems), false),
	))
	// sub row: 3+3+3+3 = 12 ✓
	m.AddRows(row.New(6).Add(
		kpiSubCol(3, fmt.Sprintf("%d Rechnungen", len(arrNonStorno)), true),
		kpiSubCol(3, fmt.Sprintf("%d Stornos", len(arrStorno)), true),
		kpiSubCol(3, eur(bestRev), true),
		kpiSubCol(3, "Stück (netto)", false),
	))

	// ═════════════════════════════════════════════════════════════════════════
	// KELLNER / ACCOUNTS  — 5+2+2+3 = 12 ✓
	// ═════════════════════════════════════════════════════════════════════════
	type kellnerStat struct {
		name   string
		umsatz float64
		storni float64
		count  int
	}
	kMap := make(map[string]*kellnerStat)
	for _, r := range arrAll {
		id := r.KellnerId
		if id == "" {
			id = "Unbekannt"
		}
		if kMap[id] == nil {
			kMap[id] = &kellnerStat{name: resolveKellnerName(id, userMap)}
		}
		s := kMap[id]
		s.umsatz += r.Gesamt
		if r.Typ == "RECHNUNG" {
			s.count++
		} else {
			s.storni += -r.Gesamt
		}
	}
	if len(kMap) > 0 {
		var kSlice []*kellnerStat
		for _, s := range kMap {
			kSlice = append(kSlice, s)
		}
		sort.Slice(kSlice, func(i, j int) bool { return kSlice[i].umsatz > kSlice[j].umsatz })

		section(m, "KELLNER / ACCOUNTS")
		m.AddRows(row.New(7).Add(
			th(5, "Name", align.Left),
			th(2, "Rechnungen", align.Center),
			th(2, "Stornos", align.Right),
			th(3, "Umsatz", align.Right),
		))
		for i, k := range kSlice {
			even := i%2 == 0
			stornoStr := "–"
			if k.storni > 0 {
				stornoStr = "-" + eur(k.storni)
			}
			m.AddRows(row.New(6).Add(
				td(5, k.name, align.Left, false, even),
				td(2, fmt.Sprintf("%d", k.count), align.Center, false, even),
				td(2, stornoStr, align.Right, false, even),
				td(3, eur(k.umsatz), align.Right, true, even),
			))
		}
	}

	// ═════════════════════════════════════════════════════════════════════════
	// TISCHE  — 6+3+3 = 12 ✓
	// ═════════════════════════════════════════════════════════════════════════
	if len(tischRevMap) > 0 {
		tCountMap := make(map[int]int)
		for _, r := range arrNonStorno {
			tCountMap[r.Tisch]++
		}
		type tEntry struct {
			tisch   int
			revenue float64
			count   int
		}
		var tSlice []tEntry
		for t, rev := range tischRevMap {
			tSlice = append(tSlice, tEntry{t, rev, tCountMap[t]})
		}
		sort.Slice(tSlice, func(i, j int) bool { return tSlice[i].revenue > tSlice[j].revenue })

		section(m, "TISCHE")
		m.AddRows(row.New(7).Add(
			th(6, "Tisch", align.Left),
			th(3, "Bestellungen", align.Center),
			th(3, "Umsatz", align.Right),
		))
		for i, t := range tSlice {
			even := i%2 == 0
			label := fmt.Sprintf("Tisch %d", t.tisch)
			if t.tisch == 0 {
				label = "Bar"
			}
			m.AddRows(row.New(6).Add(
				td(6, label, align.Left, false, even),
				td(3, fmt.Sprintf("%d", t.count), align.Center, false, even),
				td(3, eur(t.revenue), align.Right, true, even),
			))
		}
	}

	// ═════════════════════════════════════════════════════════════════════════
	// KATEGORIEN  — 5+2+2+3 = 12 ✓
	// ═════════════════════════════════════════════════════════════════════════
	type katData struct {
		name      string
		sold      int
		revenue   float64
		stornoRev float64
	}
	katM := make(map[string]*katData)
	for _, r := range arrNonStorno {
		for _, pos := range r.Positionen {
			k := pos.Kategorie
			if k == "" {
				k = "Sonstiges"
			}
			if katM[k] == nil {
				katM[k] = &katData{name: k}
			}
			katM[k].sold += pos.Amount
			katM[k].revenue += pos.Price * float64(pos.Amount)
		}
	}
	for _, r := range arrStorno {
		for _, pos := range r.Positionen {
			k := pos.Kategorie
			if k == "" {
				k = "Sonstiges"
			}
			if katM[k] == nil {
				katM[k] = &katData{name: k}
			}
			katM[k].stornoRev += pos.Price * float64(pos.Amount)
		}
	}
	var katSlice []*katData
	for _, kd := range katM {
		katSlice = append(katSlice, kd)
	}
	sort.Slice(katSlice, func(i, j int) bool {
		return (katSlice[i].revenue - katSlice[i].stornoRev) > (katSlice[j].revenue - katSlice[j].stornoRev)
	})

	if len(katSlice) > 0 {
		section(m, "KATEGORIEN")
		m.AddRows(row.New(7).Add(
			th(5, "Kategorie", align.Left),
			th(2, "Stück", align.Center),
			th(2, "Storno", align.Right),
			th(3, "Umsatz", align.Right),
		))
		for i, k := range katSlice {
			even := i%2 == 0
			net := k.revenue - k.stornoRev
			stornoStr := "–"
			if k.stornoRev > 0 {
				stornoStr = "-" + eur(k.stornoRev)
			}
			m.AddRows(row.New(6).Add(
				td(5, k.name, align.Left, false, even),
				td(2, fmt.Sprintf("%d", k.sold), align.Center, false, even),
				td(2, stornoStr, align.Right, false, even),
				td(3, eur(net), align.Right, true, even),
			))
		}
	}

	// ═════════════════════════════════════════════════════════════════════════
	// ARTIKEL PRO KATEGORIE  — 1+7+2+2 = 12 ✓
	// ═════════════════════════════════════════════════════════════════════════
	type artikelInfo struct {
		name    string
		sold    int
		revenue float64
	}
	prodMap := make(map[string]map[string]*artikelInfo)
	for _, r := range arrNonStorno {
		for _, pos := range r.Positionen {
			k := pos.Kategorie
			if k == "" {
				k = "Sonstiges"
			}
			if prodMap[k] == nil {
				prodMap[k] = make(map[string]*artikelInfo)
			}
			if prodMap[k][pos.Name] == nil {
				prodMap[k][pos.Name] = &artikelInfo{name: pos.Name}
			}
			prodMap[k][pos.Name].sold += pos.Amount
			prodMap[k][pos.Name].revenue += pos.Price * float64(pos.Amount)
		}
	}
	for _, r := range arrStorno {
		for _, pos := range r.Positionen {
			k := pos.Kategorie
			if k == "" {
				k = "Sonstiges"
			}
			if prodMap[k] != nil && prodMap[k][pos.Name] != nil {
				prodMap[k][pos.Name].sold -= pos.Amount
				prodMap[k][pos.Name].revenue -= pos.Price * float64(pos.Amount)
			}
		}
	}

	// ordered by DB category order
	dbCats, err := getAllCategories(DB)
	if err != nil {
		return nil, err
	}
	orderedKats := make([]string, 0)
	seen := make(map[string]bool)
	for _, cat := range dbCats {
		if prodMap[cat.Name] != nil {
			orderedKats = append(orderedKats, cat.Name)
			seen[cat.Name] = true
		}
	}
	for k := range prodMap {
		if !seen[k] {
			orderedKats = append(orderedKats, k)
		}
	}

	hasArtikel := false
	for _, katName := range orderedKats {
		if len(prodMap[katName]) > 0 {
			hasArtikel = true
			break
		}
	}
	if hasArtikel {
		section(m, "ARTIKEL PRO KATEGORIE")

		for _, katName := range orderedKats {
			prods := prodMap[katName]
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

			// category sub-header: 12 ✓
			m.AddRows(row.New(7).Add(
				text.NewCol(12, katName, props.Text{
					Style: fontstyle.Bold, Size: 8, Color: cGray, Top: 1.5,
				}).WithStyle(styleSub()),
			))
			// product rows: 1+7+2+2 = 12 ✓
			for i, a := range aSlice {
				even := i%2 == 0
				m.AddRows(row.New(6).Add(
					td(1, "", align.Left, false, even),
					td(7, a.name, align.Left, false, even),
					td(2, fmt.Sprintf("%d×", a.sold), align.Right, false, even),
					td(2, eur(a.revenue), align.Right, true, even),
				))
			}
			m.AddRows(row.New(3))
		}
	}

	// ═════════════════════════════════════════════════════════════════════════
	// FOOTER  — 6+6 = 12 ✓
	// ═════════════════════════════════════════════════════════════════════════
	m.AddRows(row.New(8))
	m.AddRows(row.New(1).Add(text.NewCol(12, "").WithStyle(styleFooterSep())))
	m.AddRows(row.New(5).Add(
		text.NewCol(6, "HGV Bestellsystem", props.Text{
			Size: 7, Color: cGray, Top: 1.5,
		}),
		text.NewCol(6, fmt.Sprintf("Erstellt am %s", time.Now().Format("02.01.2006 um 15:04 Uhr")), props.Text{
			Size: 7, Color: cGray, Align: align.Right, Top: 1.5,
		}),
	))

	return m, nil
}
