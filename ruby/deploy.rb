#!/usr/bin/env ruby
require "json"
require "pastel"

pastel = Pastel.new

config_dir  = File.join(__dir__, "../config")
shared_file = File.join(config_dir, "shared/shared.json")
shared_cfg  = JSON.parse(File.read(shared_file))

# Banner
puts pastel.cyan.bold("\n==============================")
puts pastel.cyan.bold("  ESCAMBO DEPLOY STARTING")
puts pastel.cyan.bold("==============================\n")

# --- Deploy global stacks first ---
puts pastel.yellow("==> Deploying Global DNS Stack: escambo-dns")
if system("npx cdktf deploy escambo-dns --auto-approve")
  puts pastel.green("[OK] DNS Stack deployed successfully")
else
  puts pastel.red("[ERROR] DNS Stack deployment failed!")
  exit(1)
end

# --- Deploy per-environment stacks ---
env_files = Dir.glob("#{config_dir}/env/*.json")

env_files.each do |file|
  env = File.basename(file, ".json")
  cfg = JSON.parse(File.read(file))

  puts pastel.cyan("\n------------------------------------------------------------")
  puts pastel.bold("Environment: ") + pastel.yellow(env)
  puts "Config file: #{file}"
  puts "Region:      #{shared_cfg['aws']['region']}"
  puts "Base Domain: #{shared_cfg['baseDomain']}"
  puts "S3 Bucket:   #{shared_cfg['terraform']['backend']['bucket']}"
  puts "DynamoDB:    #{shared_cfg['terraform']['backend']['dynamodbTable']}"
  puts "StaticSite:  #{cfg['clients']['reactWebClient']['staticSiteName']}"
  puts pastel.cyan("------------------------------------------------------------")

  stack = "escambo-#{env}-react-web-client"

  puts pastel.yellow("==> Deploying stack: #{stack}")
  if system("npx cdktf deploy #{stack} --auto-approve")
    puts pastel.green("[DONE] #{stack} deployed successfully")
  else
    puts pastel.red("[FAILED] #{stack} deployment failed!")
    exit(1)
  end
end

puts pastel.green.bold("\n============================================================")
puts pastel.green.bold("All environments deployed successfully!")
puts pastel.green.bold("============================================================")
