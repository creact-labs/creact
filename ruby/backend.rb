#!/usr/bin/env ruby
require "json"
require "pastel"
require "aws-sdk-s3"
require "aws-sdk-dynamodb"

pastel = Pastel.new

config_dir = File.join(__dir__, "../config")

# Load shared.json
shared_file = File.join(config_dir, "shared/shared.json")
shared_cfg = JSON.parse(File.read(shared_file))

bucket = shared_cfg["terraform"]["backend"]["bucket"]
table  = shared_cfg["terraform"]["backend"]["dynamodbTable"]
region = shared_cfg["aws"]["region"]

# AWS credentials
creds = Aws::Credentials.new(
  ENV["AWS_ACCESS_KEY_ID"],
  ENV["AWS_SECRET_ACCESS_KEY"]
)

s3  = Aws::S3::Client.new(region: region, credentials: creds)
ddb = Aws::DynamoDB::Client.new(region: region, credentials: creds)

# --- S3 Bucket ---
puts pastel.yellow("Checking S3 bucket: #{bucket}")
begin
  s3.head_bucket(bucket: bucket)
  puts pastel.green("✔ Bucket already exists: #{bucket}")
rescue Aws::S3::Errors::NotFound, Aws::S3::Errors::NoSuchBucket
  puts pastel.yellow("Creating bucket: #{bucket}...")
  if region == "us-east-1"
    s3.create_bucket(bucket: bucket)
  else
    s3.create_bucket(
      bucket: bucket,
      create_bucket_configuration: { location_constraint: region }
    )
  end
  puts pastel.green("✔ Bucket created: #{bucket}")
end

# Enable versioning
s3.put_bucket_versioning(
  bucket: bucket,
  versioning_configuration: { status: "Enabled" }
)
puts pastel.green("✔ Versioning enabled on bucket: #{bucket}")

# --- DynamoDB Table ---
puts pastel.yellow("\nChecking DynamoDB table: #{table}")
begin
  ddb.describe_table(table_name: table)
  puts pastel.green("✔ Table already exists: #{table}")
rescue Aws::DynamoDB::Errors::ResourceNotFoundException
  puts pastel.yellow("Creating DynamoDB table: #{table}...")
  ddb.create_table(
    table_name: table,
    attribute_definitions: [
      { attribute_name: "LockID", attribute_type: "S" }
    ],
    key_schema: [
      { attribute_name: "LockID", key_type: "HASH" }
    ],
    billing_mode: "PAY_PER_REQUEST"
  )
  puts pastel.green("✔ Table created: #{table}")
end

# --- Final Output ---
puts pastel.green.bold("\nTerraform backend setup complete!")
puts pastel.cyan("S3 Bucket: #{bucket}")
puts pastel.cyan("DynamoDB Table: #{table}")
puts pastel.cyan("Region: #{region}")
