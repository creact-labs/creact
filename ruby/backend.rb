#!/usr/bin/env ruby
require "json"
require "aws-sdk-s3"
require "aws-sdk-dynamodb"

config_dir = File.join(__dir__, "../config")

puts "Setting up Terraform backends for all environments in #{config_dir}\n"

# Load shared.json once (terraform + aws data lives here now)
shared_file = File.join(config_dir, "shared.json")
shared_cfg = JSON.parse(File.read(shared_file))

bucket = shared_cfg["terraform"]["backend"]["bucket"]
table  = shared_cfg["terraform"]["backend"]["dynamodbTable"]
region = shared_cfg["aws"]["region"]

Dir.glob("#{config_dir}/*.json").each do |file|
  next if File.basename(file) == "shared.json" # skip shared.json itself

  env = File.basename(file, ".json")
  cfg = JSON.parse(File.read(file))

  puts "------------------------------------------------------------"
  puts "Environment:    #{env}"
  puts "Config file:    #{file}"
  puts "S3 Bucket:      #{bucket}"
  puts "DynamoDB Table: #{table}"
  puts "Region:         #{region}\n"

  creds = Aws::Credentials.new(
    ENV["AWS_ACCESS_KEY_ID"],
    ENV["AWS_SECRET_ACCESS_KEY"]
  )

  s3  = Aws::S3::Client.new(region: region, credentials: creds)
  ddb = Aws::DynamoDB::Client.new(region: region, credentials: creds)

  # --- S3 Bucket ---
  begin
    s3.head_bucket(bucket: bucket)
    puts "[OK] Bucket already exists: #{bucket}"
  rescue Aws::S3::Errors::NotFound, Aws::S3::Errors::NoSuchBucket
    puts "[CREATE] Bucket: #{bucket}"
    if region == "us-east-1"
      s3.create_bucket(bucket: bucket)
    else
      s3.create_bucket(bucket: bucket,
                       create_bucket_configuration: { location_constraint: region })
    end
  end

  # Enable versioning
  s3.put_bucket_versioning(bucket: bucket,
                           versioning_configuration: { status: "Enabled" })
  puts "[OK] Versioning enabled on bucket: #{bucket}"

  # --- DynamoDB Table ---
  begin
    ddb.describe_table(table_name: table)
    puts "[OK] DynamoDB table already exists: #{table}"
  rescue Aws::DynamoDB::Errors::ResourceNotFoundException
    puts "[CREATE] DynamoDB table: #{table}"
    ddb.create_table(
      table_name: table,
      attribute_definitions: [{ attribute_name: "LockID", attribute_type: "S" }],
      key_schema: [{ attribute_name: "LockID", key_type: "HASH" }],
      billing_mode: "PAY_PER_REQUEST"
    )
  end

  puts "[DONE] Backend ready for environment: #{env}\n"
end

puts "------------------------------------------------------------"
puts "All Terraform backends are set up."
