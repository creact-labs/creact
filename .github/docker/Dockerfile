FROM ubuntu:22.04

# Install prerequisites
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    unzip \
    software-properties-common \
    apt-transport-https \
    lsb-release \
    ruby-full \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip ./aws

# Install Terraform
ENV TERRAFORM_VERSION=1.9.5
RUN curl -fsSL https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
    -o terraform.zip \
    && unzip terraform.zip -d /usr/local/bin \
    && rm terraform.zip

# Install Ruby gems for AWS SDK
RUN gem install aws-sdk-s3 aws-sdk-dynamodb

