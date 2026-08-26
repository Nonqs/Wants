package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"slices"
	"strings"

	"log"
	"os"
	"strconv"
	"time"
)

var(
	nameFlag string
	priceFlag int
	necessityFlag int
	utilityFlag int
	wishFlag bool
)

type Item struct {
	Name string `json:"name"`
	Price int `json:"price"`
	Necessity int `json:"necessity"`
	Utility int `json:"utility"`
	Desire int `json:"desire"`
	StartDate int64 `json:"start_date"`
	Saved float64 `json:"saved"`
	Days int64 `json:"days"`
}

func main() {

	// os.Args[1:] -> [add]
	// os.Args[1] -> add
	if len(os.Args) < 2 {
		fmt.Println("Se requiere un subcomando. Opciones: add, list")
		os.Exit(1)
	}

	flag.Parse()

	args := flag.Args()
	subcommand := args[0]

	addCmd := flag.NewFlagSet("greet", flag.ContinueOnError)
	addCmd.StringVar(&nameFlag, "name", "", "")
	addCmd.IntVar(&priceFlag, "price", 0, "")
	addCmd.IntVar(&necessityFlag, "necessity", 0, "")
	addCmd.IntVar(&utilityFlag, "utility", 0, "")
	addCmd.BoolVar(&wishFlag, "wish", false,"")

	switch subcommand{
	case "add": addNewItem(os.Args[1:])
	case "list": listItems()
	case "deposit": {
		deposit, err := strconv.ParseFloat(os.Args[2], 64)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}
		depositMoney(deposit)
	}
	case "cancel": cancel(os.Args[2])
	default: fmt.Println("Enter a valid command")
	}
}

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
	newData, _ := json.MarshalIndent(items, "", "  ")

	if err := os.WriteFile("items.json", newData, 0644); err != nil {
		panic(err)
	}
}

func cancel(name string){
	items := readItems()

	j := -1
	var deposit float64
	
	for i, item := range items{
		if(item.Name == name){
			j = i
			deposit = item.Saved
		}
	}

	if(j < 0){
		fmt.Print("Product does not exist")
	}else{
		items = slices.Delete(items, j, j+1)
		saveItems(items)
		depositMoney(deposit)

	}
}

func listItems(){

	items := readItems()

	for i, item := range items{
		fmt.Printf("%d. %v: %v / %v\n", i+1, item.Name, item.Price, item.Saved)
	}

}

func addNewItem(parameters []string){
	//fmt.Print(parameters[2])
	//fastmode without flags: <name> <price> <necessity> <utility>

	items := readItems()
	var newItem Item
	newItem.Name = parameters[1] 
	for _, item := range items{
		if(strings.EqualFold(newItem.Name, item.Name)){
			log.Fatal("Item already exist")
		}
	}

	newItem.Price = parseToInt(parameters[2])
	newItem.Necessity = parseToInt(parameters[3])
	newItem.Utility = parseToInt(parameters[4])
	newItem.Desire = parseToInt(parameters[5])

	if( newItem.Price < 0 || newItem.Price > 10 ||
	    newItem.Necessity < 0 || newItem.Necessity >10 ||
		newItem.Utility < 0 || newItem.Utility >10 ||
		newItem.Desire < 0 || newItem.Desire > 10 ){

			log.Fatal("Scores must be between 0 and 10")
		}

	newItem.StartDate = time.Now().Unix()

	items = append(items, newItem)
	saveItems(items)

}

func depositMoney(deposit float64){

	if(deposit < 0){
		log.Fatal("Deposit must be a greater than 0")
	}

	items := readItems()

	percentages := calculatePercentages(items)

	for i, item := range items {
		items[i].Saved += math.Round((deposit * percentages[item.Name])*100) /100
	}

	saveItems(items)
}

func (i Item) Score() float64 {
    days := time.Since(time.Unix(i.StartDate, 0)).Hours() / 24

    return float64(i.Desire)*0.20 +
        float64(i.Necessity)*0.25 +
        float64(i.Utility)*0.30 +
        calculateTimeScore(days)*0.25
}

func calculateTimeScore(days float64) float64{
	switch{
	case days < 7: return 0
	case days >= 7 && days < 30: return 1
	case days >= 30 && days < 90: return 2
	default: return 4
	}
}

func calculatePercentages(items []Item) map[string]float64 {
    var totalScore float64
	percentages := make(map[string]float64)

    for _, item := range items {
        totalScore += item.Score()
    }

    for _, item := range items {
        percentage := item.Score() / totalScore
		percentages[item.Name] = percentage
    }

	return percentages
}



func parseToInt(s string) int {
	valor, err:= strconv.Atoi(s)
	if err != nil {
		log.Fatal("failed to convert string to integer", err)
	}
	return valor
}