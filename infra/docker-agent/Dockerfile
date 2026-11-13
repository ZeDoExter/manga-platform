FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TARGETARCH="linux-x64"

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        jq \
        libicu70 \
        tar \
        gzip \
        docker.io && \
    rm -rf /var/lib/apt/lists/*

# 1. Install Azure CLI
RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash

# 2. Install kubectl
RUN curl -fsSL -o /usr/local/bin/kubectl https://dl.k8s.io/release/v1.31.0/bin/linux/amd64/kubectl && \
    chmod +x /usr/local/bin/kubectl

# 3. Install Node.js (for npx wrangler in Deploy stage)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# 4. Install Go 1.23
RUN curl -fsSL https://go.dev/dl/go1.23.6.linux-amd64.tar.gz | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:${PATH}"

WORKDIR /azp/

COPY ./start.sh ./
RUN chmod +x ./start.sh && sed -i 's/\r$//' ./start.sh

ENV AGENT_ALLOW_RUNASROOT="true"

ENTRYPOINT [ "./start.sh" ]
