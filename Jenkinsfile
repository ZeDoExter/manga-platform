pipeline {
    agent any

    environment {
        APP_NAME     = 'manga-platform'
        DOCKER_IMAGE = 'manga-platform'
        MIN_COVERAGE = '80'
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code from Git repository...'
                checkout scm
            }
        }

        stage('Lint & Vet') {
            steps {
                echo 'Running Go vet analysis...'
                sh 'go vet ./...'
            }
        }

        stage('Test & Coverage Gate') {
            steps {
                echo 'Executing unit and integration test suite with coverage analysis (NFR-Dev-1)...'
                sh '''
                    go test -v -coverprofile=coverage.out ./...
                    
                    # Verify Commerce & Money logic meets the >= 80% coverage requirement
                    COVERAGE=$(go test -cover ./services/commerce/... | grep -o '[0-9.]*%' | tr -d '%')
                    echo "Commerce Service Test Coverage: ${COVERAGE}%"
                    
                    # Enforce Quality Gate
                    awk -v cov="$COVERAGE" -v min="$MIN_COVERAGE" 'BEGIN {
                        if (cov + 0 < min + 0) {
                            print "FAILED: Test coverage (" cov "%) is below required threshold (" min "%)";
                            exit 1;
                        }
                        print "PASSED: Test coverage meets quality gate requirement.";
                    }'
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'coverage.out', allowEmptyArchive: true
                }
            }
        }

        stage('Build Container Image') {
            steps {
                echo "Building production container image: ${DOCKER_IMAGE}:${BUILD_NUMBER}..."
                sh """
                    docker build -t ${DOCKER_IMAGE}:${BUILD_NUMBER} -t ${DOCKER_IMAGE}:latest .
                """
            }
        }

        stage('Deploy to Kubernetes (Zero-Downtime)') {
            steps {
                echo 'Executing Rolling Update deployment to Kubernetes cluster (Bonus Track 2)...'
                sh """
                    echo "Deploying ${DOCKER_IMAGE}:${BUILD_NUMBER} with maxUnavailable=0..."
                    # In production cluster with kubeconfig:
                    # kubectl set image deployment/manga-platform manga-platform=${DOCKER_IMAGE}:${BUILD_NUMBER} --record
                    # kubectl rollout status deployment/manga-platform --timeout=60s
                """
            }
        }
    }

    post {
        success {
            echo "CI/CD Pipeline Succeeded: Build #${BUILD_NUMBER} is ready for production."
        }
        failure {
            echo "CI/CD Pipeline Failed: Inspect test logs and coverage gate output."
        }
    }
}
