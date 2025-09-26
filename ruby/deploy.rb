#!/usr/bin/env ruby

puts "==> Deploying Escambo Bootstrap Stack..."
system("npx cdktf deploy bootstrap --auto-approve") || exit($?.exitstatus)

puts "==> Deploying Escambo React Web Client Stack..."
system("npx cdktf deploy escambo-react-web-client --auto-approve") || exit($?.exitstatus)

puts "==> All infrastructure deployed successfully."
