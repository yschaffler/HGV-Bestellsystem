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

// ── Colour palette ────────────────────────────────────────────────────────────

var (
	colDark   = &props.Color{Red: 30, Green: 30, Blue: 30}
	colMid    = &props.Color{Red: 90, Green: 90, Blue: 90}
	colLight  = &props.Color{Red: 245, Green: 245, Blue: 245}
	colStripe = &props.Color{Red: 250, Green: 250, Blue: 250}
	colBorder = &props.Color{Red: 220, Green: 220, Blue: 220}
	colWhite  = &props.Color{Red: 255, Green: 255, Blue: 255}
	colAccent = &props.Color{Red: 40, Green: 40, Blue: 40}
)

// ── Shared cell styles ────────────────────────────────────────────────────────

var (
	styleHeaderCell = &props.Cell{
		BackgroundColor: colAccent,
		BorderType:      border.None,
	}
	styleEvenCell = &props.Cell{
		BackgroundColor: colLight,
		BorderType:      border.None,
	}
	styleOddCell = &props.Cell{
		BackgroundColor: colWhite,
		BorderType:      border.None,
	}
	styleDivider = &props.Cell{
		BackgroundColor: colBorder,
		BorderType:      border.None,
	}
)

// ── Text props helpers ────────────────────────────────────────────────────────

func headerText(label string, a align.Type) core.Col {
	return text.NewCol(0, label, props.Text{
		Style: fontstyle.Bold,
		Size:  8,
		Align: a,
		Color: colWhite,
		Top:   2.5,
	}).WithStyle(styleHeaderCell)
}

func headerTextW(width int, label string, a align.Type) core.Col {
	return text.NewCol(width, label, props.Text{
		Style: fontstyle.Bold,
		Size:  8,
		Align: a,
		Color: colWhite,
		Top:   2.5,
	}).WithStyle(styleHeaderCell)
}

func cell(width int, label string, a align.Type, bold bool, style *props.Cell) core.Col {
	fs := fontstyle.Normal
	if bold {
		fs = fontstyle.Bold
	}
	return text.NewCol(width, label, props.Text{
		Style: fs,
		Size:  8,
		Align: a,
		Top:   2,
	}).WithStyle(style)
}

// ── Section heading ───────────────────────────────────────────────────────────

func sectionTitle(m core.Maroto, title string) {
	m.AddRows(row.New(3))
	m.AddRows(
		row.New(7).Add(
			text.NewCol(12, title, props.Text{
				Style: fontstyle.Bold,
				Size:  9,
				Top:   1.5,
				Color: colMid,
			}),
		),
	)
	m.AddRows(row.New(1).Add(
		text.NewCol(12, "", props.Text{}).WithStyle(styleDivider),
	))
	m.AddRows(row.New(2))
}

// ── Money formatter ───────────────────────────────────────────────────────────

func eur(v float64) string {
	return fmt.Sprintf("%.2f €", v)
}

// ── Name resolver ─────────────────────────────────────────────────────────────

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

// ── Main PDF builder ──────────────────────────────────────────────────────────

func getStatsForPDF() (core.Maroto, error) {
	cfg := config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithLeftMargin(15).
		WithRightMargin(15).
		WithTopMargin(15).
		WithBottomMargin(15).
		WithPageNumber(props.PageNumber{
			Pattern: "{current} / {total}",
			Place:   props.RightBottom,
		}).
		Build()

	m := maroto.New(cfg)

	// ── Load data ─────────────────────────────────────────────────────────────
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
	allUsers, err := getAllUsers(DB)
	if err != nil {
		return nil, err
	}
	userMap := make(map[int]User, len(allUsers))
	for _, u := range allUsers {
		userMap[u.Id] = u
	}

	// ── Global KPI calculations ───────────────────────────────────────────────
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
		for _, p := range r.Positionen {
			totalSold += p.Amount
		}
	}
	for _, r := range arrStorno {
		for _, p := range r.Positionen {
			totalSold -= p.Amount
		}
	}
	if totalSold < 0 {
		totalSold = 0
	}
	bestTable, bestTableRev := -1, 0.0
	tischRevMap := make(map[int]float64)
	for _, r := range arrRechnungen {
		tischRevMap[r.Tisch] += r.Gesamt
	}
	for t, rev := range tischRevMap {
		if rev > bestTableRev {
			bestTable, bestTableRev = t, rev
		}
	}

	// ═════════════════════════════════════════════════════════════════════════
	// HEADER
	// ═════════════════════════════════════════════════════════════════════════
	const iconPath = "./public/icons/icon-192x192.png"
	m.AddRows(
		row.New(16).Add(
			image.NewFromFileCol(1, iconPath, props.Rect{Percent: 85, Center: true}),
			text.NewCol(8, "HGV Bestellsystem", props.Text{
				Style: fontstyle.Bold,
				Size:  16,
				Top:   3,
				Color: colDark,
			}),
			text.NewCol(3, time.Now().Format("02.01.2006\n15:04 Uhr"), props.Text{
				Align: align.Right,
				Size:  8,
				Top:   4,
				Color: colMid,
			}),
		),
	)
	m.AddRows(
		row.New(5).Add(
			text.NewCol(1, ""),
			text.NewCol(11, "Event-Auswertung", props.Text{
				Size:  10,
				Color: colMid,
				Top:   0,
			}),
		),
	)
	// thick separator
	m.AddRows(row.New(1).Add(
		text.NewCol(12, "").WithStyle(&props.Cell{BackgroundColor: colDark, BorderType: border.None}),
	))
	m.AddRows(row.New(4))

	// ═════════════════════════════════════════════════════════════════════════
	// KPI BOXES  (4 nebeneinander mit dunklem Hintergrund)
	// ═════════════════════════════════════════════════════════════════════════
	bestTableLabel := "–"
	if bestTable == 0 {
		bestTableLabel = fmt.Sprintf("Bar")
	} else if bestTable > 0 {
		bestTableLabel = fmt.Sprintf("Tisch %d", bestTable)
	}

	kpiBox := &props.Cell{BackgroundColor: colLight, BorderType: border.None}

	kpiLabel := func(w int, label string) core.Col {
		return text.NewCol(w, label, props.Text{
			Size:  7,
			Style: fontstyle.Bold,
			Color: colMid,
			Top:   2.5,
			Align: align.Center,
		}).WithStyle(kpiBox)
	}
	kpiValue := func(w int, val string) core.Col {
		return text.NewCol(w, val, props.Text{
			Size:  13,
			Style: fontstyle.Bold,
			Color: colDark,
			Top:   1,
			Align: align.Center,
		}).WithStyle(kpiBox)
	}
	kpiSub := func(w int, sub string) core.Col {
		return text.NewCol(w, sub, props.Text{
			Size:  7,
			Color: colMid,
			Top:   1,
			Align: align.Center,
		}).WithStyle(kpiBox)
	}
	spacer := func() core.Col {
		return text.NewCol(1, "").WithStyle(&props.Cell{BackgroundColor: colWhite, BorderType: border.None})
	}

	m.AddRows(row.New(5).Add(
		kpiLabel(3, "UMSATZ (NETTO)"),
		spacer(),
		kpiLabel(3, "STORNIERT"),
		spacer(),
		kpiLabel(3, "STÄRKSTER TISCH"),
		spacer(),
		kpiLabel(3, "ARTIKEL VERKAUFT"),
	))
	m.AddRows(row.New(8).Add(
		kpiValue(3, eur(umsatzGes)),
		spacer(),
		kpiValue(3, eur(-stornoGes)),
		spacer(),
		kpiValue(3, bestTableLabel),
		spacer(),
		kpiValue(3, fmt.Sprintf("%d", totalSold)),
	))
	m.AddRows(row.New(5).Add(
		kpiSub(3, fmt.Sprintf("%d Rechnungen", len(arrNonStorno))),
		spacer(),
		kpiSub(3, fmt.Sprintf("%d Stornos", len(arrStorno))),
		spacer(),
		kpiSub(3, eur(bestTableRev)),
		spacer(),
		kpiSub(3, "Stück (netto)"),
	))
	m.AddRows(row.New(6))

	// ═════════════════════════════════════════════════════════════════════════
	// KELLNER / ACCOUNTS
	// ═════════════════════════════════════════════════════════════════════════
	type kellnerStat struct {
		name   string
		umsatz float64
		storni float64
		count  int
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
		type ks struct{ *kellnerStat }
		var kSlice []ks
		for _, s := range kellnerMap {
			kSlice = append(kSlice, ks{s})
		}
		sort.Slice(kSlice, func(i, j int) bool { return kSlice[i].umsatz > kSlice[j].umsatz })

		sectionTitle(m, "KELLNER / ACCOUNTS")

		// header row
		m.AddRows(row.New(7).Add(
			headerTextW(5, "Name", align.Left),
			headerTextW(2, "Rechnungen", align.Center),
			headerTextW(2, "Stornos", align.Right),
			headerTextW(3, "Umsatz", align.Right),
		))

		for i, k := range kSlice {
			st := styleOddCell
			if i%2 == 0 {
				st = styleEvenCell
			}
			stornoStr := "–"
			if k.storni > 0 {
				stornoStr = "-" + eur(k.storni)
			}
			m.AddRows(row.New(6).Add(
				cell(5, k.name, align.Left, false, st),
				cell(2, fmt.Sprintf("%d", k.count), align.Center, false, st),
				cell(2, stornoStr, align.Right, false, st),
				cell(3, eur(k.umsatz), align.Right, true, st),
			))
		}
	}

	// ═════════════════════════════════════════════════════════════════════════
	// TISCHE
	// ═════════════════════════════════════════════════════════════════════════
	if len(tischRevMap) > 0 {
		tischCountMap := make(map[int]int)
		for _, r := range arrNonStorno {
			tischCountMap[r.Tisch]++
		}
		type tischEntry struct {
			tisch   int
			revenue float64
			count   int
		}
		var tSlice []tischEntry
		for t, rev := range tischRevMap {
			tSlice = append(tSlice, tischEntry{t, rev, tischCountMap[t]})
		}
		sort.Slice(tSlice, func(i, j int) bool { return tSlice[i].revenue > tSlice[j].revenue })

		sectionTitle(m, "TISCHE")

		m.AddRows(row.New(7).Add(
			headerTextW(6, "Tisch", align.Left),
			headerTextW(3, "Bestellungen", align.Center),
			headerTextW(3, "Umsatz", align.Right),
		))

		for i, t := range tSlice {
			st := styleOddCell
			if i%2 == 0 {
				st = styleEvenCell
			}
			label := fmt.Sprintf("Tisch %d", t.tisch)
			if t.tisch == 0 {
				label = "Bar"
			}
			m.AddRows(row.New(6).Add(
				cell(6, label, align.Left, false, st),
				cell(3, fmt.Sprintf("%d", t.count), align.Center, false, st),
				cell(3, eur(t.revenue), align.Right, true, st),
			))
		}
	}

	// ═════════════════════════════════════════════════════════════════════════
	// KATEGORIEN
	// ═════════════════════════════════════════════════════════════════════════
	type katData struct {
		name      string
		sold      int
		revenue   float64
		stornoRev float64
	}
	katMap2 := make(map[string]*katData)
	for _, r := range arrNonStorno {
		for _, pos := range r.Positionen {
			k := pos.Kategorie
			if k == "" {
				k = "Sonstiges"
			}
			if katMap2[k] == nil {
				katMap2[k] = &katData{name: k}
			}
			katMap2[k].sold += pos.Amount
			katMap2[k].revenue += pos.Price * float64(pos.Amount)
		}
	}
	for _, r := range arrStorno {
		for _, pos := range r.Positionen {
			k := pos.Kategorie
			if k == "" {
				k = "Sonstiges"
			}
			if katMap2[k] == nil {
				katMap2[k] = &katData{name: k}
			}
			katMap2[k].stornoRev += pos.Price * float64(pos.Amount)
		}
	}
	var katSlice []*katData
	for _, kd := range katMap2 {
		katSlice = append(katSlice, kd)
	}
	sort.Slice(katSlice, func(i, j int) bool {
		return (katSlice[i].revenue - katSlice[i].stornoRev) > (katSlice[j].revenue - katSlice[j].stornoRev)
	})

	if len(katSlice) > 0 {
		sectionTitle(m, "KATEGORIEN")

		m.AddRows(row.New(7).Add(
			headerTextW(5, "Kategorie", align.Left),
			headerTextW(2, "Stück (netto)", align.Center),
			headerTextW(2, "Storno", align.Right),
			headerTextW(3, "Umsatz (netto)", align.Right),
		))

		for i, k := range katSlice {
			st := styleOddCell
			if i%2 == 0 {
				st = styleEvenCell
			}
			net := k.revenue - k.stornoRev
			stornoStr := "–"
			if k.stornoRev > 0 {
				stornoStr = "-" + eur(k.stornoRev)
			}
			m.AddRows(row.New(6).Add(
				cell(5, k.name, align.Left, false, st),
				cell(2, fmt.Sprintf("%d", k.sold), align.Center, false, st),
				cell(2, stornoStr, align.Right, false, st),
				cell(3, eur(net), align.Right, true, st),
			))
		}
	}

	// ═════════════════════════════════════════════════════════════════════════
	// ARTIKEL PRO KATEGORIE
	// ═════════════════════════════════════════════════════════════════════════
	type artikelInfo struct {
		name    string
		sold    int
		revenue float64
	}
	produktMap := make(map[string]map[string]*artikelInfo)
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

	hasArtikel := false
	for _, katName := range orderedKats {
		if len(produktMap[katName]) > 0 {
			hasArtikel = true
			break
		}
	}

	if hasArtikel {
		sectionTitle(m, "ARTIKEL PRO KATEGORIE")

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

			// category sub-header
			m.AddRows(row.New(6).Add(
				text.NewCol(12, katName, props.Text{
					Style: fontstyle.Bold,
					Size:  8,
					Color: colMid,
					Top:   1.5,
				}).WithStyle(&props.Cell{
					BackgroundColor: colStripe,
					BorderType:      border.None,
				}),
			))

			for i, a := range aSlice {
				st := styleOddCell
				if i%2 == 0 {
					st = styleEvenCell
				}
				m.AddRows(row.New(6).Add(
					text.NewCol(1, "", props.Text{}).WithStyle(st),
					cell(7, a.name, align.Left, false, st),
					cell(2, fmt.Sprintf("%d×", a.sold), align.Right, false, st),
					cell(2, eur(a.revenue), align.Right, true, st),
				))
			}
			m.AddRows(row.New(3))
		}
	}

	// ═════════════════════════════════════════════════════════════════════════
	// FOOTER
	// ═════════════════════════════════════════════════════════════════════════
	m.AddRows(row.New(6))
	m.AddRows(row.New(1).Add(
		text.NewCol(12, "").WithStyle(&props.Cell{BackgroundColor: colBorder, BorderType: border.None}),
	))
	m.AddRows(row.New(5).Add(
		text.NewCol(6, "HGV Bestellsystem", props.Text{
			Size:  7,
			Color: colMid,
			Top:   1,
		}),
		text.NewCol(6, fmt.Sprintf("Erstellt am %s", time.Now().Format("02.01.2006 um 15:04 Uhr")), props.Text{
			Size:  7,
			Color: colMid,
			Align: align.Right,
			Top:   1,
		}),
	))

	return m, nil
}

