FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# -----------------------------------------
# Install core dependencies
# -----------------------------------------
RUN apt-get update && apt-get install -y \
    bash \
    curl \
    git \
    jq \
    unzip \
    build-essential \
    ruby-full \
    ruby-dev \
    nodejs \
    npm \
    python3 \
    python3-pip \
    gnupg \
    ca-certificates \
    lsb-release \
    iptables \
    uidmap \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------
# Install Docker CE (CLI + daemon)
# -----------------------------------------
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | tee /etc/apt/keyrings/docker.asc > /dev/null && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && apt-get install -y \
      docker-ce \
      docker-ce-cli \
      containerd.io \
      docker-buildx-plugin \
      docker-compose-plugin \
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

# -----------------------------------------
# Verify installations
# -----------------------------------------
RUN dockerd --version && \
    docker --version && \
    terraform -version && \
    aws --version && \
    ruby -v && \
    npm -v && \
    node -v


CMD ["bash"]
