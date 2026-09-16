package main

import "time"

type Item struct {
	Name      string  `json:"name"`
	Price     float64 `json:"price"`
	Necessity int     `json:"necessity"`
	Utility   int     `json:"utility"`
	Desire    int     `json:"desire"`
	Wish      bool    `json:"wish"`
	StartDate int64   `json:"start_date"`
	Saved     float64 `json:"saved"`
	Days      int64   `json:"days"`
}

func (i Item) Score() float64 {
	if i.Wish && i.Price > i.Saved {
		days := time.Since(time.Unix(i.StartDate, 0)).Hours() / 24

		return float64(i.Desire)*0.20 +
			float64(i.Necessity)*0.25 +
			float64(i.Utility)*0.30 +
			calculateTimeScore(days)*0.25
	}

	return 0
}