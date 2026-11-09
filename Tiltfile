# Tilt modes: compose (default, fast day-to-day) or k8s (minikube, prod-like).
#   tilt up              -> compose mode (ports 8080-8086 + web 3000)
#   TILT_MODE=k8s tilt up -> k8s mode (minikube must be running)
#
# Never run both at once: they bind the same host ports.

MODE = os.environ.get('TILT_MODE', 'compose').lower()

SERVICES = ['identity', 'catalog', 'commerce', 'reader', 'moderation', 'community', 'library', 'media', 'server']
PORTS = {'identity': 8081, 'catalog': 8082, 'commerce': 8083, 'reader': 8084,
         'moderation': 8085, 'community': 8086, 'library': 8087, 'media': 8088, 'server': 8080}

def web_resource(deps):
    local_resource(
        'web',
        serve_cmd='npm run dev -- --port 3000',
        serve_dir='web',
        labels=['frontend'],
        links=['http://localhost:3000'],
        resource_deps=deps,
    )

if MODE == 'k8s':
    print('*** Tilt K8s mode: deploying to minikube (make sure `minikube start` is done) ***')

    # Build each Go service image into minikube's Docker daemon, live-update on code change.
    for svc in SERVICES:
        img = 'manga-%s:latest' % ('gateway' if svc == 'server' else svc)
        docker_build(
            img,
            '.',
            build_args={'SERVICE': svc},
            live_update=[
                sync('./services', '/build/services'),
                sync('./pkg', '/build/pkg'),
                sync('./cmd', '/build/cmd'),
                run('cd /build && CGO_ENABLED=0 go build -ldflags="-s -w" -o /bin/service ./cmd/%s' % svc,
                    trigger=['./services', './pkg', './cmd']),
            ],
        )

    k8s_yaml(['deploy/k8s/deployment.yaml', 'deploy/k8s/service.yaml'])

    for name in ['identity', 'catalog', 'commerce', 'reader', 'moderation', 'community', 'library', 'media', 'gateway']:
        k8s_resource(
            name,
            labels=['backend' if name != 'gateway' else 'edge'],
            port_forwards=['%d:8080' % PORTS['server' if name == 'gateway' else name]],
            links=['http://localhost:%d/healthz' % PORTS['server' if name == 'gateway' else name]],
        )

    web_resource(deps=['gateway'])

else:
    print('*** Tilt compose mode: plain Docker containers ***')

    docker_compose('./docker-compose.yml')

    dc_resource('identity', labels=['backend'], links=['http://localhost:8081/healthz'])
    dc_resource('catalog', labels=['backend'], links=['http://localhost:8082/healthz'])
    dc_resource('commerce', labels=['backend'], links=['http://localhost:8083/healthz'])
    dc_resource('reader', labels=['backend'], links=['http://localhost:8084/healthz'])
    dc_resource('moderation', labels=['backend'], links=['http://localhost:8085/healthz'])
    dc_resource('community', labels=['backend'], links=['http://localhost:8086/healthz'])
    dc_resource('library', labels=['backend'], links=['http://localhost:8087/healthz'])
    dc_resource('media', labels=['backend'], links=['http://localhost:8088/healthz'])
    dc_resource('gateway', labels=['edge'], links=['http://localhost:8080/healthz'])

    web_resource(deps=['gateway'])
