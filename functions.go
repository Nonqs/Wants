package main

import (
	"log"
	"strconv"
)


func calculateTimeScore(days float64) float64 {
	switch {
	case days < 7:
		return 0
	case days >= 7 && days < 30:
		return 1
	case days >= 30 && days < 90:
		return 2
	default:
		return 4
	}
}

func calculatePercentages(items []Item) map[string]float64 {
	var totalScore float64
	percentages := make(map[string]float64)

	for _, item := range items {
		totalScore += item.Score()
	}

	if totalScore <= 0 {
		return percentages
	}

	for _, item := range items {
		percentage := item.Score() / totalScore
		percentages[item.Name] = percentage
	}

	return percentages
}

func parseToInt(s string) int {
	valor, err := strconv.Atoi(s)
	if err != nil {
		log.Fatal("failed to convert string to integer", err)
	}
	return valor
}
