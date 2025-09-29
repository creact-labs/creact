package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

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
	Terraform struct {
		Backend struct {
			Bucket        string `json:"bucket"`
			DynamoDBTable string `json:"dynamodbTable"`
		} `json:"backend"`
	} `json:"terraform"`
}

func main() {
	ctx := context.Background()
	title := color.New(color.FgCyan, color.Bold).SprintFunc()
	success := color.New(color.FgGreen).SprintFunc()
	warn := color.New(color.FgYellow).SprintFunc()
	fail := color.New(color.FgRed).SprintFunc()

	// Load shared.json
	sharedFile := "./config/shared/shared.json"
	data, err := os.ReadFile(sharedFile)
	if err != nil {
		log.Fatalf("Failed to read shared config: %v", err)
	}
	var cfg SharedConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		log.Fatalf("Invalid JSON in shared config: %v", err)
	}

	region := cfg.Aws.Region
	bucket := cfg.Terraform.Backend.Bucket
	table := cfg.Terraform.Backend.DynamoDBTable

	awsCfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		log.Fatalf("Unable to load AWS SDK config: %v", err)
	}

	s3Client := s3.NewFromConfig(awsCfg)
	dynamo := dynamodb.NewFromConfig(awsCfg)

	fmt.Println(title("==> Checking S3 bucket: " + bucket))
	_, err = s3Client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(bucket)})
	if err == nil {
		fmt.Println(success("✔ Bucket already exists: " + bucket))
	} else {
		fmt.Println(warn("Creating bucket: " + bucket + "..."))
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
		fmt.Println(success("✔ Bucket created: " + bucket))
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
	fmt.Println(success("✔ Versioning enabled on bucket: " + bucket))

	fmt.Println(title("\n==> Checking DynamoDB table: " + table))
	_, err = dynamo.DescribeTable(ctx, &dynamodb.DescribeTableInput{TableName: aws.String(table)})
	if err == nil {
		fmt.Println(success("✔ Table already exists: " + table))
	} else {
		fmt.Println(warn("Creating DynamoDB table: " + table + "..."))
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
		fmt.Println(success("✔ Table created: " + table))
	}

	fmt.Println(success("\nTerraform backend setup complete!"))
	fmt.Println(color.CyanString("S3 Bucket: " + bucket))
	fmt.Println(color.CyanString("DynamoDB Table: " + table))
	fmt.Println(color.CyanString("Region: " + region))
}
