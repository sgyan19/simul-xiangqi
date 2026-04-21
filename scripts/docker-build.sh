#!/bin/bash
set -Eeuo pipefail

# 配置
IMAGE_NAME="${IMAGE_NAME:-chess-game}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-}"

# 帮助信息
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --tag TAG        Set image tag (default: latest)"
    echo "  -r, --registry URL   Set registry URL (e.g., docker.io, ghcr.io)"
    echo "  -p, --push           Push image to registry after build"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Build image: chess-game:latest"
    echo "  $0 -t v1.2.1                 # Build image: chess-game:v1.2.1"
    echo "  $0 -r docker.io -t v1.2.1 -p # Build and push to Docker Hub"
}

# 解析参数
PUSH=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -p|--push)
            PUSH=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# 全量镜像名
if [[ -n "$REGISTRY" ]]; then
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
else
    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
fi

cd "$(dirname "$0")/.."

echo "=========================================="
echo "  Docker Build Script"
echo "=========================================="
echo "  Image Name: ${IMAGE_NAME}"
echo "  Image Tag:  ${IMAGE_TAG}"
echo "  Registry:   ${REGISTRY:-none}"
echo "  Full Name:  ${FULL_IMAGE_NAME}"
echo "=========================================="
echo ""

# 构建镜像
echo "Building Docker image..."
docker build -t "${FULL_IMAGE_NAME}" .

if [[ $? -eq 0 ]]; then
    echo ""
    echo "Build successful!"
    echo "Image: ${FULL_IMAGE_NAME}"
else
    echo ""
    echo "Build failed!"
    exit 1
fi

# 推送镜像（如果需要）
if [[ "$PUSH" == true ]]; then
    echo ""
    echo "Pushing image to registry..."
    docker push "${FULL_IMAGE_NAME}"
    
    if [[ $? -eq 0 ]]; then
        echo "Push successful!"
    else
        echo "Push failed!"
        exit 1
    fi
fi

echo ""
echo "Done!"
