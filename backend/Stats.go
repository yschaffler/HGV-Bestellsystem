package main

import (
	"fmt"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/core"
)

func OrderByServerID() (core.Maroto, error) {
	arr, err := getAllRechnungen(DB)
	if err != nil {
		return nil, err
	}

	m := maroto.New()
	var tempmap map[string]float64 = make(map[string]float64)

	m.AddRow(5,
		text.NewCol(4, "KellnerID"),
		text.NewCol(4, "->"),
		text.NewCol(4, "Gesamt"),
	)

	for i := 0; i < len(arr); i++ {
		if arr[i].KellnerId == "" {
			continue
		}
		tempmap[arr[i].KellnerId] += arr[i].Gesamt
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
