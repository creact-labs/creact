package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	ddbTypes "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3Types "github.com/aws/aws-sdk-go-v2/service/s3/types"
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

func main() {
	title := color.New(color.FgCyan, color.Bold).SprintFunc()
	success := color.New(color.FgGreen).SprintFunc()
	fail := color.New(color.FgRed).SprintFunc()
	warn := color.New(color.FgYellow).SprintFunc()

	fmt.Println(title("\n=============================="))
	fmt.Println(title(" ESCAMBO PIPELINE STARTING"))
	fmt.Println(title("==============================\n"))

	// --- Install Node/CDKTF deps ---
	setupCdktfDeps(success, fail)

	// --- Load shared config ---
	sharedFile := filepath.Join("config", "shared", "shared.json")
	sharedData, err := os.ReadFile(sharedFile)
	if err != nil {
		log.Fatalf("Failed to read shared config: %v", err)
	}
	var sharedCfg SharedConfig
	if err := json.Unmarshal(sharedData, &sharedCfg); err != nil {
		log.Fatalf("Invalid shared config JSON: %v", err)
	}

	// --- Backend setup ---
	setupBackend(sharedCfg, success, fail, warn)

	// --- Deploy global stacks ---
	if !deployStack("escambo-dns", success, fail) {
		os.Exit(1)
	} 

	// --- Deploy per-environment stacks ---
	envDir := filepath.Join("config", "env")
	envFiles, err := filepath.Glob(filepath.Join(envDir, "*.json"))
	if err != nil {
		log.Fatalf("Failed to list env configs: %v", err)
	}

	stacks := []string{
		"ecr",
		"customer-react-web-client",
		"provider-react-web-client",
		"core-java-service",
		"widgets-java-service",
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
		fmt.Println("Environment:", color.YellowString(env))
		fmt.Println("Config file:", file)
		fmt.Println("Region:     ", sharedCfg.Aws.Region)
		fmt.Println("Base Domain:", sharedCfg.BaseDomain)
		fmt.Println("S3 Bucket:  ", sharedCfg.Terraform.Backend.Bucket)
		fmt.Println("DynamoDB:   ", sharedCfg.Terraform.Backend.DynamoDBTable)

		fmt.Println(title("------------------------------------------------------------"))

		for _, suffix := range stacks {
			stackName := "escambo-" + env + "-" + suffix
			if !deployStack(stackName, success, fail) {
				os.Exit(1)
			}
		}
	}

	fmt.Println(success("\n============================================================"))
	fmt.Println(success("Pipeline finished successfully!"))
	fmt.Println(success("============================================================"))
}

// --- Install npm ci + cdktf get ---
func setupCdktfDeps(success, fail func(a ...interface{}) string) {
	fmt.Println(color.YellowString("==> Installing Node.js dependencies (npm ci)"))
	cmd := exec.Command("npm", "ci")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		log.Fatalf("%s npm ci failed: %v", fail("✖"), err)
	}
	fmt.Println(success("✔ npm ci completed"))

	fmt.Println(color.YellowString("==> Generating CDKTF providers (cdktf get)"))
	cmd = exec.Command("npx", "cdktf", "get")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		log.Fatalf("%s cdktf get failed: %v", fail("✖"), err)
	}

	fmt.Println(color.YellowString("==> Running CDKTF synth (cdktf synth)"))
	cmd = exec.Command("npx", "cdktf", "synth")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		log.Fatalf("%s cdktf synth failed: %v", fail("✖"), err)
	}
	fmt.Println(success("✔ cdktf synth completed"))
}

// --- Backend setup (S3 + DynamoDB) ---
func setupBackend(cfg SharedConfig, success, fail, warn func(a ...interface{}) string) {
	ctx := context.Background()
	region := cfg.Aws.Region
	bucket := cfg.Terraform.Backend.Bucket
	table := cfg.Terraform.Backend.DynamoDBTable

	awsCfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		log.Fatalf("Unable to load AWS SDK config: %v", err)
	}

	s3Client := s3.NewFromConfig(awsCfg)
	dynamo := dynamodb.NewFromConfig(awsCfg)

	fmt.Println(warn("==> Checking S3 bucket:", bucket))
	_, err = s3Client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(bucket)})
	if err == nil {
		fmt.Println(success("✔ Bucket already exists:", bucket))
	} else {
		fmt.Println(warn("Creating bucket:", bucket))
		if region == "us-east-1" {
			_, err = s3Client.CreateBucket(ctx, &s3.CreateBucketInput{Bucket: aws.String(bucket)})
		} else {
			_, err = s3Client.CreateBucket(ctx, &s3.CreateBucketInput{
				Bucket: aws.String(bucket),
				CreateBucketConfiguration: &s3Types.CreateBucketConfiguration{
					LocationConstraint: s3Types.BucketLocationConstraint(region),
				},
			})
		}
		if err != nil {
			log.Fatalf("%s Failed to create bucket: %v", fail("✖"), err)
		}
		fmt.Println(success("✔ Bucket created:", bucket))
	}

	_, err = s3Client.PutBucketVersioning(ctx, &s3.PutBucketVersioningInput{
		Bucket: aws.String(bucket),
		VersioningConfiguration: &s3Types.VersioningConfiguration{
			Status: s3Types.BucketVersioningStatusEnabled,
		},
	})
	if err != nil {
		log.Fatalf("%s Failed to enable versioning: %v", fail("✖"), err)
	}
	fmt.Println(success("✔ Versioning enabled on bucket:", bucket))

	fmt.Println(warn("==> Checking DynamoDB table:", table))
	_, err = dynamo.DescribeTable(ctx, &dynamodb.DescribeTableInput{TableName: aws.String(table)})
	if err == nil {
		fmt.Println(success("✔ Table already exists:", table))
	} else {
		fmt.Println(warn("Creating DynamoDB table:", table))
		_, err = dynamo.CreateTable(ctx, &dynamodb.CreateTableInput{
			TableName: aws.String(table),
			AttributeDefinitions: []ddbTypes.AttributeDefinition{
				{AttributeName: aws.String("LockID"), AttributeType: ddbTypes.ScalarAttributeTypeS},
			},
			KeySchema: []ddbTypes.KeySchemaElement{
				{AttributeName: aws.String("LockID"), KeyType: ddbTypes.KeyTypeHash},
			},
			BillingMode: ddbTypes.BillingModePayPerRequest,
		})
		if err != nil {
			log.Fatalf("%s Failed to create table: %v", fail("✖"), err)
		}
		fmt.Println(success("✔ Table created:", table))
	}
}

// --- Deploy stack using `cdktf deploy` ---
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
