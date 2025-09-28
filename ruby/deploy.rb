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
def deploy_stack(name, pastel)
  puts pastel.yellow("==> Deploying stack: #{name}")
  if system("npx cdktf deploy #{name} --auto-approve")
    puts pastel.green("[DONE] #{name} deployed successfully")
    true
  else
    puts pastel.red("[FAILED] #{name} deployment failed!")
    false
  end
end

puts pastel.yellow("==> Deploying Global DNS Stack: escambo-dns")
exit(1) unless deploy_stack("escambo-dns", pastel)

puts pastel.yellow("==> Deploying ECR: escambo-ecr")
exit(1) unless deploy_stack("escambo-ecr", pastel)

# --- Deploy per-environment stacks ---
env_files = Dir.glob("#{config_dir}/env/*.json")

# Define environment → stacks mapping
STACKS = [
  "customer-react-web-client",
  "provider-react-web-client",
]

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
  puts "StaticSite:  #{cfg.dig('clients', 'reactWebClient', 'staticSiteName')}"
  puts pastel.cyan("------------------------------------------------------------")

  STACKS.each do |stack_suffix|
    stack = "escambo-#{env}-#{stack_suffix}"
    exit(1) unless deploy_stack(stack, pastel)
  end
end

puts pastel.green.bold("\n============================================================")
puts pastel.green.bold("All environments deployed successfully!")
puts pastel.green.bold("============================================================")
