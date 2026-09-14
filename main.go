package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"slices"
	"strings"

	"log"
	"os"
	"strconv"
	"time"
)

var(
	nameFlag string
	priceFlag float64
	necessityFlag int
	utilityFlag int
	desireFlag int
	wishFlag bool
)

type Item struct {
	Name string `json:"name"`
	Price float64 `json:"price"`
	Necessity int `json:"necessity"`
	Utility int `json:"utility"`
	Desire int `json:"desire"`
	Wish bool `json:"wish"`
	StartDate int64 `json:"start_date"`
	Saved float64 `json:"saved"`
	Days int64 `json:"days"`
}

func main() {

	// os.Args[1:] -> [add]
	// os.Args[1] -> add
	if len(os.Args) < 2 {
		os.Exit(1)
	}


	subcommand := os.Args[1]
	subArgs := os.Args[2:]

	addCmd := flag.NewFlagSet("add", flag.ContinueOnError)
	addCmd.StringVar(&nameFlag, "name", "", "")
	addCmd.Float64Var(&priceFlag, "price", 0, "")
	addCmd.IntVar(&necessityFlag, "necessity", 0, "")
	addCmd.IntVar(&utilityFlag, "utility", 0, "")
	addCmd.IntVar(&desireFlag, "desire", 0, "")
	addCmd.BoolVar(&wishFlag, "wish", true,"")

	modifyCmd := flag.NewFlagSet("modify", flag.ContinueOnError)
	modifyCmd.StringVar(&nameFlag, "name", "", "")
	modifyCmd.Float64Var(&priceFlag, "price", 0, "")
	modifyCmd.IntVar(&necessityFlag, "necessity", 0, "")
	modifyCmd.IntVar(&utilityFlag, "utility", 0, "")
	modifyCmd.IntVar(&desireFlag, "desire", 0, "")
	modifyCmd.BoolVar(&wishFlag, "wish", true,"")
	//depositCmd := flag.NewFlagSet("deposit", flag.ContinueOnError)

	switch subcommand{
	case "add": 
		if err := addCmd.Parse(subArgs); err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
		if addCmd.NFlag() > 0 {
			addNewItem()
		} else {
			nameFlag = subArgs[0]
			parsedFloat, _ := strconv.ParseFloat(subArgs[1],64)
			priceFlag = parsedFloat
			necessityFlag = parseToInt(subArgs[2])
			utilityFlag = parseToInt(subArgs[3])
			desireFlag = parseToInt(subArgs[4])
			wish,_  := strconv.ParseBool(subArgs[5])
			wishFlag = wish
			addNewItem()
		}
	case "list": listItems()
	case "deposit": 
		deposit, err := strconv.ParseFloat(os.Args[2], 64)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}
		depositMoney(deposit)
	
	case "cancel": cancel(os.Args[2])
	case "modify": 
		if err := modifyCmd.Parse(subArgs); err != nil {
			fmt.Println(err)
			os.Exit(1)
		}

		var flags []string
		modifyCmd.Visit(func(f *flag.Flag) {
    		flags = append(flags, f.Name)
		})

		if(strings.EqualFold(nameFlag, "")){
			log.Fatal("A name must be provide")
		}
		modifyItem(flags)
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
	newData, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		log.Fatal("failed to marshal items:", err)
	}

	if err := os.WriteFile("items.json", newData, 0644); err != nil {
		panic(err)
	}
}

func modifyItem(flags []string) {
	items := readItems()
	
	for i, item := range items{
		if(strings.EqualFold(item.Name, nameFlag)){
			for _, f := range flags{
				switch f{
					case "price": items[i].Price = priceFlag
					case "necessity": items[i].Necessity = necessityFlag
					case "utility": items[i].Utility = utilityFlag
					case "desire": items[i].Desire = desireFlag
					case "wish": items[i].Wish = wishFlag
				}
			}
			break
		}
	}

	saveItems(items)
	
}

func cancel(name string){
	items := readItems()

	j := -1
	var deposit float64
	
	for i, item := range items{
		if(item.Name == name){
			if(item.Name == "extra") {
				deleteExtra()
			}else{
				j = i
				deposit = item.Saved
			}
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

func deleteExtra(){
	//TODO: if extra is deleted, ask what to do with de extra money
	// A. redistribute among the other products
	// B. Delete deposit (for investing, other expenses, etc)

	
}

func createExtra()Item{
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

func addNewItem(){

	items := readItems()
	var newItem Item
	newItem.Name = nameFlag 
	for _, item := range items{
		if(strings.EqualFold(newItem.Name, item.Name)){
			log.Fatal("Item already exist")
		}
	}

	newItem.Price = priceFlag
	newItem.Necessity = necessityFlag
	newItem.Utility = utilityFlag
	newItem.Desire = desireFlag
	newItem.Wish = wishFlag

	if( newItem.Necessity < 0 || newItem.Necessity >10 ||
		newItem.Utility < 0 || newItem.Utility >10 ||
		newItem.Desire < 0 || newItem.Desire > 10 ){

			log.Fatal("Scores must be between 0 and 10")
		}

	newItem.StartDate = time.Now().Unix()

	items = append(items, newItem)
	saveItems(items)

}

func depositMoney(deposit float64){

	//TODO: SOlucionar que hacer en caso de que todos los items esten llenos
	if(deposit <= 0){
		log.Fatal("Deposit must be a greater than 0")
	}

	items := readItems()

	percentages := calculatePercentages(items)
	var extra float64
	// No items || all items are full
	if(len(percentages) == 0){
		for i, item := range items {
			if(item.Name == "extra"){
				items[i].Saved += deposit
				deposit = 0
			}
		}

		if(deposit != 0){
			items = append(items, createExtra())
			for i, item := range items {
				if(item.Name == "extra"){
					items[i].Saved += deposit
					deposit = 0
				}
			}
		}
	}else{
		for i, item := range items {
			money := deposit * percentages[item.Name]
			if(money + item.Saved > item.Price){
				aux := item.Price - item.Saved
				items[i].Saved += aux
				extra += money - aux
			}else{
				items[i].Saved += money
			}
		}
	}

	saveItems(items)

	if(extra > 0){
		depositMoney(extra)
	}
}

func (i Item) Score() float64 {
	if(i.Wish && i.Price > i.Saved){
    days := time.Since(time.Unix(i.StartDate, 0)).Hours() / 24

    return float64(i.Desire)*0.20 +
        float64(i.Necessity)*0.25 +
        float64(i.Utility)*0.30 +
        calculateTimeScore(days)*0.25
	}
	
	return 0
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
	valor, err:= strconv.Atoi(s)
	if err != nil {
		log.Fatal("failed to convert string to integer", err)
	}
	return valor
}