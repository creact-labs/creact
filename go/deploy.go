package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/fatih/color"
)

type SharedConfig struct {
	Aws struct {
		Region string `json:"region"`
	} `json:"aws"`
	BaseDomain string `json:"baseDomain"`
	Terraform  struct {
		Backend struct {
			Bucket        string `json:"bucket"`
			DynamoDBTable string `json:"dynamodbTable"`
		} `json:"backend"`
	} `json:"terraform"`
}

func deployStack(name string, success, fail func(a ...interface{}) string) bool {
	fmt.Println(color.YellowString("==> Deploying stack: %s", name))
	cmd := exec.Command("npx", "cdktf", "deploy", name, "--auto-approve")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fmt.Println(fail("[FAILED] " + name + " deployment failed!"))
		return false
	}
	fmt.Println(success("[DONE] " + name + " deployed successfully"))
	return true
}

func main() {
	title := color.New(color.FgCyan, color.Bold).SprintFunc()
	success := color.New(color.FgGreen).SprintFunc()
	fail := color.New(color.FgRed).SprintFunc()

	// Load shared config
	sharedFile := filepath.Join("..", "config", "shared", "shared.json")
	data, err := os.ReadFile(sharedFile)
	if err != nil {
		log.Fatalf("Failed to read shared config: %v", err)
	}
	var sharedCfg SharedConfig
	if err := json.Unmarshal(data, &sharedCfg); err != nil {
		log.Fatalf("Invalid shared config JSON: %v", err)
	}

	// Banner
	fmt.Println(title("\n=============================="))
	fmt.Println(title("  ESCAMBO DEPLOY STARTING"))
	fmt.Println(title("==============================\n"))

	// --- Deploy global stacks ---
	if !deployStack("escambo-dns", success, fail) {
		os.Exit(1)
	}

	// --- Deploy per-environment stacks ---
	envDir := filepath.Join("..", "config", "env")
	envFiles, err := filepath.Glob(filepath.Join(envDir, "*.json"))
	if err != nil {
		log.Fatalf("Failed to list env configs: %v", err)
	}

	stacks := []string{
		"customer-react-web-client",
		"provider-react-web-client",
		"ecr",
	}

	for _, file := range envFiles {
		env := filepath.Base(file[:len(file)-len(filepath.Ext(file))])
		if env == "qa" {
			continue
		}

		envData, err := os.ReadFile(file)
		if err != nil {
			log.Fatalf("Failed to read env config %s: %v", file, err)
		}
		var cfg map[string]interface{}
		_ = json.Unmarshal(envData, &cfg)

		fmt.Println(title("\n------------------------------------------------------------"))
		fmt.Println("Environment: ", color.YellowString(env))
		fmt.Println("Config file:", file)
		fmt.Println("Region:     ", sharedCfg.Aws.Region)
		fmt.Println("Base Domain:", sharedCfg.BaseDomain)
		fmt.Println("S3 Bucket:  ", sharedCfg.Terraform.Backend.Bucket)
		fmt.Println("DynamoDB:   ", sharedCfg.Terraform.Backend.DynamoDBTable)

		if clients, ok := cfg["clients"].(map[string]interface{}); ok {
			if react, ok := clients["reactWebClient"].(map[string]interface{}); ok {
				if staticName, ok := react["staticSiteName"].(string); ok {
					fmt.Println("StaticSite: ", staticName)
				}
			}
		}
		fmt.Println(title("------------------------------------------------------------"))

		for _, suffix := range stacks {
			stackName := "escambo-" + env + "-" + suffix
			if !deployStack(stackName, success, fail) {
				os.Exit(1)
			}
		}
	}

	fmt.Println(success("\n============================================================"))
	fmt.Println(success("All environments deployed successfully!"))
	fmt.Println(success("============================================================"))
}
