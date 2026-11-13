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

# Install modern Go (1.23) so tests run instantly
RUN curl -fsSL https://go.dev/dl/go1.23.6.linux-amd64.tar.gz | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:${PATH}"

WORKDIR /azp/

COPY ./start.sh ./
RUN chmod +x ./start.sh && sed -i 's/\r$//' ./start.sh

ENV AGENT_ALLOW_RUNASROOT="true"

ENTRYPOINT [ "./start.sh" ]
