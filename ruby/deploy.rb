#!/usr/bin/env ruby
require "json"

config_dir  = File.join(__dir__, "../config")
shared_file = File.join(config_dir, "shared.json")
shared_cfg  = JSON.parse(File.read(shared_file))

puts "==> Deploying Escambo Infrastructure...\n"

# --- Deploy global stacks first ---
puts "------------------------------------------------------------"
puts "==> Deploying Global DNS Stack: escambo-dns"
system("npx cdktf deploy escambo-dns --auto-approve") || exit($?.exitstatus)

# --- Deploy per-environment stacks ---
Dir.glob("#{config_dir}/*.json").each do |file|
  next if File.basename(file) == "shared.json"

  env = File.basename(file, ".json")
  cfg = JSON.parse(File.read(file))

  puts "------------------------------------------------------------"
  puts "Environment:   #{env}"
  puts "Config file:   #{file}"
  puts "Region:        #{shared_cfg['aws']['region']}"
  puts "Base Domain:   #{shared_cfg['baseDomain']}"
  puts "S3 Bucket:     #{shared_cfg['terraform']['backend']['bucket']}"
  puts "DynamoDB:      #{shared_cfg['terraform']['backend']['dynamodbTable']}"
  puts "StaticSite:    #{cfg['clients']['reactWebClient']['staticSiteName']}\n"

  stack = "escambo-#{env}-react-web-client"

  puts "==> Deploying React Web Client Stack: #{stack}"
  system("npx cdktf deploy #{stack} --auto-approve") || exit($?.exitstatus)

  puts "[DONE] All stacks deployed for environment: #{env}\n"
end

puts "------------------------------------------------------------"
puts "==> All environments deployed successfully."
