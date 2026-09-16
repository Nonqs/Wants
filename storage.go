package main

import (
	"encoding/json"
	"log"
	"os"
)

func readItems() []Item{
	var items []Item

	fileData, err := os.ReadFile("items.json")

	if err == nil {
		err = json.Unmarshal(fileData, &items)
	} else if !os.IsNotExist(err) {
	}

	return items
}

func saveItems(items []Item) {
	newData, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		log.Fatal("failed to marshal items:", err)
	}

	if err := os.WriteFile("items.json", newData, 0644); err != nil {
		panic(err)
	}
}