package main

import (
	"fmt"
	"log"
	"slices"
	"strings"
	"time"
)

func printHelp() {
	fmt.Println(`Usage:
	wants <command> [options]

Commands:
	add      Add a new item
	list     Show all items
	deposit  Deposit money and distribute it
	cancel   Remove an item by name
	modify   Update an existing item
	help     Show this help message

Examples:
	wants add --name "Laptop" --price 1200 --necessity 8 --utility 7 --desire 5 --wish=true
	wants list
	wants deposit 50`)
}

func modifyItem(flags []string) {
	items := readItems()

	for i, item := range items {
		if strings.EqualFold(item.Name, nameFlag) {
			for _, f := range flags {
				switch f {
				case "price":
					items[i].Price = priceFlag
				case "necessity":
					items[i].Necessity = necessityFlag
				case "utility":
					items[i].Utility = utilityFlag
				case "desire":
					items[i].Desire = desireFlag
				case "wish":
					items[i].Wish = wishFlag
				}
			}
			break
		}
	}

	saveItems(items)

}

func cancel(name string) {
	items := readItems()
	j := -1
	var deposit float64

	for i, item := range items {
		if strings.EqualFold(item.Name, name) {
			j = i
			deposit = item.Saved
			break
		}
	}

	if j < 0 {
		fmt.Print("Product does not exist")
		return
	}

	fmt.Println("What do you want to do with the saved money?")
	fmt.Println("A. Redistribute")
	fmt.Println("B. Keep it removed")

	var election string
	fmt.Scanln(&election)

	items = slices.Delete(items, j, j+1)
	saveItems(items)

	if strings.EqualFold(election, "A") {
		depositMoney(deposit)
	}

}

func createExtra() Item {
	var newItem Item
	newItem.Name = "extra"
	newItem.Price = 0
	newItem.Necessity = 0
	newItem.Utility = 0
	newItem.Desire = 0
	newItem.Wish = false
	newItem.StartDate = time.Now().Unix()

	return newItem
}

func listItems() {
	items := readItems()

	for i, item := range items {
		percentage := 0.0

		if item.Price > 0 {
			percentage = (item.Saved / float64(item.Price)) * 100
		}

		if percentage > 100 {
			percentage = 100
		}

		barWidth := 25
		filled := int((percentage / 100) * float64(barWidth))
		empty := barWidth - filled

		bar := "[" +
			strings.Repeat("█", filled) +
			strings.Repeat("░", empty) +
			"]"

		days := int(time.Since(time.Unix(item.StartDate, 0)).Hours() / 24)

		fmt.Printf(
			"%d. %s\n"+
				"   Wanting it for: %d days\n"+
				"   %s %.1f%%\n"+
				"   %.2f / %.0f €\n"+
				"   Utility: %d | Necessity: %d | Desire: %d\n\n",
			i+1,
			item.Name,
			days,
			bar,
			percentage,
			item.Saved,
			item.Price,
			item.Utility,
			item.Necessity,
			item.Desire,
		)
	}
}

func addNewItem() {

	items := readItems()
	var newItem Item
	newItem.Name = nameFlag
	for _, item := range items {
		if strings.EqualFold(newItem.Name, item.Name) {
			log.Fatal("Item already exist")
		}
	}

	newItem.Price = priceFlag
	newItem.Necessity = necessityFlag
	newItem.Utility = utilityFlag
	newItem.Desire = desireFlag
	newItem.Wish = wishFlag

	if newItem.Necessity < 0 || newItem.Necessity > 10 ||
		newItem.Utility < 0 || newItem.Utility > 10 ||
		newItem.Desire < 0 || newItem.Desire > 10 {

		log.Fatal("Scores must be between 0 and 10")
	}

	newItem.StartDate = time.Now().Unix()

	items = append(items, newItem)
	saveItems(items)

}

func depositMoney(deposit float64) {

	if deposit <= 0 {
		log.Fatal("Deposit must be a greater than 0")
	}

	items := readItems()

	percentages := calculatePercentages(items)
	var extra float64
	// No items || all items are full
	if len(percentages) == 0 {
		for i, item := range items {
			if item.Name == "extra" {
				items[i].Saved += deposit
				deposit = 0
			}
		}

		if deposit != 0 {
			items = append(items, createExtra())
			for i, item := range items {
				if item.Name == "extra" {
					items[i].Saved += deposit
					deposit = 0
				}
			}
		}
	} else {
		for i, item := range items {
			money := deposit * percentages[item.Name]
			if money+item.Saved > item.Price {
				aux := item.Price - item.Saved
				items[i].Saved += aux
				extra += money - aux
			} else {
				items[i].Saved += money
			}
		}
	}

	saveItems(items)

	if extra > 0 {
		depositMoney(extra)
	}
}


