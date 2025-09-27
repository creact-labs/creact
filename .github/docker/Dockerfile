FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install core dependencies including ruby-dev
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    unzip \
    git \
    ruby-full \
    ruby-dev \
    build-essential \
    software-properties-common \
    apt-transport-https \
    lsb-release \
    nodejs \
    npm \
    jq \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------
# Install AWS CLI v2
# -----------------------------------------
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip ./aws

# -----------------------------------------
# Install Terraform
# -----------------------------------------
ENV TERRAFORM_VERSION=1.9.5
RUN curl -fsSL "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip" \
    -o terraform.zip \
    && unzip terraform.zip -d /usr/local/bin \
    && rm terraform.zip

# -----------------------------------------
# Install CDK for Terraform
# -----------------------------------------
RUN npm install --global cdktf-cli@latest

# -----------------------------------------
# Install Ruby Gems
# -----------------------------------------
RUN gem install \
    aws-sdk-s3 \
    aws-sdk-dynamodb \
    pastel \
    json

WORKDIR /workspace

# Verify installations
RUN terraform -version && \
    aws --version && \
    ruby -v && \
    npm -v && \
    node -v

CMD ["/bin/bash"]
