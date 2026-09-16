package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
)

var (
	nameFlag      string
	priceFlag     float64
	necessityFlag int
	utilityFlag   int
	desireFlag    int
	wishFlag      bool
)

func main() {

	// os.Args[1:] -> [add]
	// os.Args[1] -> add
	if len(os.Args) < 2 {
		printHelp()
		os.Exit(0)
	}

	subcommand := os.Args[1]
	subArgs := os.Args[2:]

	addCmd := flag.NewFlagSet("add", flag.ContinueOnError)
	addCmd.StringVar(&nameFlag, "name", "", "")
	addCmd.Float64Var(&priceFlag, "price", 0, "")
	addCmd.IntVar(&necessityFlag, "necessity", 0, "")
	addCmd.IntVar(&utilityFlag, "utility", 0, "")
	addCmd.IntVar(&desireFlag, "desire", 0, "")
	addCmd.BoolVar(&wishFlag, "wish", true, "")

	modifyCmd := flag.NewFlagSet("modify", flag.ContinueOnError)
	modifyCmd.StringVar(&nameFlag, "name", "", "")
	modifyCmd.Float64Var(&priceFlag, "price", 0, "")
	modifyCmd.IntVar(&necessityFlag, "necessity", 0, "")
	modifyCmd.IntVar(&utilityFlag, "utility", 0, "")
	modifyCmd.IntVar(&desireFlag, "desire", 0, "")
	modifyCmd.BoolVar(&wishFlag, "wish", true, "")
	//depositCmd := flag.NewFlagSet("deposit", flag.ContinueOnError)

	switch subcommand {
	case "add":
		subArgs = normalizeBoolFlagArgs(subArgs, "wish")
		if err := addCmd.Parse(subArgs); err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
		if addCmd.NFlag() > 0 {
			addNewItem()
		} else {
			nameFlag = subArgs[0]
			parsedFloat, _ := strconv.ParseFloat(subArgs[1], 64)
			priceFlag = parsedFloat
			necessityFlag = parseToInt(subArgs[2])
			utilityFlag = parseToInt(subArgs[3])
			desireFlag = parseToInt(subArgs[4])
			wish, _ := strconv.ParseBool(subArgs[5])
			wishFlag = wish
			addNewItem()
		}
	case "list":
		listItems()
	case "deposit":
		deposit, err := strconv.ParseFloat(os.Args[2], 64)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}
		depositMoney(deposit)
	
	case "cancel": cancel(os.Args[2])
	case "help": printHelp()
	case "modify": 
		subArgs = normalizeBoolFlagArgs(subArgs, "wish")
		if err := modifyCmd.Parse(subArgs); err != nil {
			fmt.Println(err)
			os.Exit(1)
		}

		var flags []string
		modifyCmd.Visit(func(f *flag.Flag) {
			flags = append(flags, f.Name)
		})

		if strings.EqualFold(nameFlag, "") {
			log.Fatal("A name must be provide")
		}
		modifyItem(flags)
	default:
		fmt.Println("Enter a valid command")
	}
}

func normalizeBoolFlagArgs(args []string, flagName string) []string {
	normalized := make([]string, 0, len(args))

	for i := 0; i < len(args); i++ {
		arg := args[i]

		if (arg == "-"+flagName || arg == "--"+flagName) && i+1 < len(args) {
			next := args[i+1]
			if strings.EqualFold(next, "true") || strings.EqualFold(next, "false") {
				normalized = append(normalized, arg+"="+next)
				i++
				continue
			}
		}

		normalized = append(normalized, arg)
	}

	return normalized
}

