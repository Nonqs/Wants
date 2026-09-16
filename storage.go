package main

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
)

const dataDirName = "wants"
const dataFileName = "items.json"

func getItemsFilePath() string {
	if customPath := os.Getenv("WANTS_DATA_PATH"); customPath != "" {
		return customPath
	}

	home, err := os.UserHomeDir()
	if err != nil {
		log.Fatal("failed to resolve user home directory:", err)
	}

	return filepath.Join(home, ".local", "share", dataDirName, dataFileName)
}

func readItems() []Item{
	var items []Item
	itemsPath := getItemsFilePath()

	fileData, err := os.ReadFile(itemsPath)

	if err == nil {
		if err := json.Unmarshal(fileData, &items); err != nil {
			log.Fatal("failed to parse items data:", err)
		}
	} else if !os.IsNotExist(err) {
		log.Fatal("failed to read items data:", err)
	}

	return items
}

func saveItems(items []Item) {
	itemsPath := getItemsFilePath()

	if err := os.MkdirAll(filepath.Dir(itemsPath), 0755); err != nil {
		log.Fatal("failed to create data directory:", err)
	}

	newData, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		log.Fatal("failed to marshal items:", err)
	}

	if err := os.WriteFile(itemsPath, newData, 0644); err != nil {
		panic(err)
	}
}