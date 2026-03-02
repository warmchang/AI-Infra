---
status: Active
maintainer: pacoxu
last_updated: 2026-03-02
tags: inference, llm, vllm, serving, optimization
canonical_path: docs/inference/README.md
---

# LLM Inference Platforms & Engines

Comprehensive overview of LLM inference platforms, engines, and optimization
techniques for Kubernetes-native deployments.

More details about specific platforms and techniques:

- [Model Architectures (Llama, Qwen, DeepSeek, Flux)](./model-architectures.md)
- [LoRA: Low-Rank Adaptation for Efficient LLM Serving](./lora.md)
- [OME: Kubernetes Operator for LLM Management](./ome.md)
- [Serverless AI Inference (Knative, AWS SageMaker, Platform Comparison)](./serverless.md)
- [Model Switching and Dynamic Scheduling (Aegaeon, vLLM Sleep Mode)](./model-switching.md)
- [Caching in LLM Inference](./caching.md)
- [Memory, Context, and Database for AI Agents](./memory-context-db.md)
- [Large Scale Experts (MoE Models)](./large-scale-experts.md)
- [Model Lifecycle Management (Cold-Start, Sleep Mode, Offloading)](./model-lifecycle.md)
- [Performance Testing & Benchmark Tools](./performance-testing.md)

## Inference Platform Landscape

The inference platform ecosystem can be organized into three layers:

### Inference Engines (底座引擎)

The core serving engines that execute LLM inference:

| Engine | Organization | Key Features |
| --- | --- | --- |
| [vLLM](https://github.com/vllm-project/vllm) | vLLM Project (LF AI) | PagedAttention, continuous batching, widest model support |
| [SGLang](https://github.com/sgl-project/sglang) | SGLang Team | RadixAttention, fast structured output, speculative decoding |
| [TensorRT-LLM](https://github.com/NVIDIA/TensorRT-LLM) | NVIDIA | CUDA-optimized, highest throughput on NVIDIA hardware |
| [Triton Inference Server](https://github.com/triton-inference-server/server) | NVIDIA | Multi-framework, dynamic batching, model ensembles |
| [TGI (Text Generation Inference)](https://github.com/huggingface/text-generation-inference) | Hugging Face | Production-ready, Flash Attention, Paged Attention |
| [MindIE](https://www.hiascend.com/software/mindie) | Huawei | Ascend NPU optimized inference engine |
| [lmdeploy](https://github.com/InternLM/lmdeploy) | Shanghai AI Lab | Turbomind kernel, continuous batching, quantization |
| [llama.cpp](https://github.com/ggml-org/llama.cpp) | ggml-org | CPU/GPU inference, GGUF format, edge deployment |
| [Ollama](https://github.com/ollama/ollama) | Ollama | Developer-friendly, local deployment, model library |

### Inference Platforms (推理平台)

Kubernetes-native platforms for orchestrating LLM inference at scale:

| Platform | Organization | Architecture | Key Features |
| --- | --- | --- | --- |
| [AIBrix](https://github.com/vllm-project/aibrix) | vLLM Project | StormService + RoleSet CRDs | High-density LoRA, gateway, autoscaling, P/D disaggregation |
| [Kthena](https://github.com/volcano-sh/kthena) | Volcano (CNCF Sandbox) | Serving Group / LWS | Gang scheduling, topology-aware, revision control |
| [NVIDIA Dynamo](https://github.com/ai-dynamo/dynamo) | NVIDIA | Grove/LWS dual mode | NVIDIA-optimized, disaggregated serving, KV routing |
| [OME](https://github.com/sigs/ome) | Kubernetes SIG | Operator pattern | Model management, lifecycle, multi-engine support |
| [KServe](https://github.com/kserve/kserve) | CNCF Incubating | InferenceService CRD | Multi-framework, canary, explainability, serverless |
| [llm-d](https://github.com/llm-d/llm-d) | Red Hat / IBM | Dual LWS + KServe | P/D disaggregation reference implementation |
| [vLLM production-stack](https://github.com/vllm-project/production-stack) | vLLM Project | Helm-based | Router, multi-instance, KV-aware routing |
| [Kaito](https://github.com/kaito-project/kaito) | Microsoft (CNCF Sandbox) | Workspace CRD | GPU auto-provisioning, preset models, AKS integration |

### Orchestration & Routing (编排与路由)

Components that handle request routing, load balancing, and P/D disaggregation:

| Component | Project | Purpose |
| --- | --- | --- |
| Gateway API Inference Extension | Kubernetes SIG | Inference-aware routing via Gateway API |
| AIBrix Gateway | AIBrix | LLM-aware routing, load balancing, prefix caching |
| Kthena Router | Kthena | Topology-aware P/D routing |
| LMCache | [LMCache](https://github.com/LMCache/LMCache) | KV cache offloading and reuse |
| Mooncake | [Moonshot AI](https://github.com/kvcache-ai/Mooncake) | KV cache-centric disaggregated inference |
| RBG | [SGLang](https://github.com/sgl-project/rbg) | Resource-aware batch scheduler (LWS-inspired) |

## Featured Projects

### AIBrix

[`AIBrix`](https://github.com/vllm-project/aibrix) is an open-source,
cloud-native solution optimized for deploying, managing, and scaling
large language model (LLM) inference in enterprise environments. As part
of the vLLM project ecosystem, AIBrix provides essential building blocks
for constructing scalable GenAI inference infrastructure.

**Key highlights:**

- High-density LoRA management and dynamic switching
- LLM-aware gateway and intelligent routing
- App-tailored autoscaling for LLM workloads
- Distributed inference and KV cache capabilities
- Cost-efficient heterogeneous serving with SLO guarantees

For detailed information, see [AIBrix Introduction](./aibrix.md).

### Kthena

[`Kthena`](https://github.com/volcano-sh/kthena) is a Kubernetes-native LLM
inference platform that transforms how organizations deploy and manage Large
Language Models in production. Kthena is part of the Volcano ecosystem and
provides comprehensive infrastructure for scalable LLM inference. **Latest
release: v0.3.0** introduces LeaderWorkerSet support, network topology-aware
scheduling, and enhanced observability.

**Key highlights:**

- **LeaderWorkerSet Integration**: Native support for distributed inference
  with leader-worker topologies
- **Topology-Aware Scheduling**: Role-level gang scheduling and network
  topology awareness for optimized P/D disaggregation (requires Volcano v1.14+)
- **ModelServing Revision Control**: Native version control for ModelServing
  with rollback capabilities
- **Router Observability**: Comprehensive metrics, debug port, and E2E testing
  for production reliability
- **Enhanced Rolling Updates**: Configurable maxUnavailable for faster rollouts
- **Plugin Framework**: Extensible architecture for custom configuration logic
- **vLLM Data Parallel**: Support for vLLM data parallel deployment modes

### llm-d

[`llm-d`](https://github.com/llm-d/llm-d) is a production-ready LLM inference
platform that implements Prefill-Decode disaggregation using a dual
LeaderWorkSet (LWS) architecture. llm-d demonstrates best practices for
orchestrating disaggregated inference workloads on Kubernetes.

**Key highlights:**

- Dual LWS architecture for P/D disaggregation
- LMCache integration for efficient KV cache management
- Routing sidecar for intelligent request routing
- Production-grade implementation for P/D disaggregation

For detailed information about P/D disaggregation implementations, see
[Prefill-Decode Disaggregation](./pd-disaggregation.md).

### NVIDIA Dynamo

[`Dynamo`](https://github.com/ai-dynamo/dynamo) is NVIDIA's open-source
distributed inference framework optimized for AI factories. Dynamo supports
disaggregated prefill-decode architectures and provides deep integration with
NVIDIA hardware and software stacks.

**Key highlights:**

- **Disaggregated serving**: Native P/D disaggregation with KV cache routing
- **Dual deployment modes**: Grove (NVIDIA-native) and LWS (Kubernetes-native)
- **Smart KV routing**: Intelligent routing based on KV cache locality
- **NIXL transport**: High-performance KV cache transfer protocol
- **AIConfigurator**: Data-driven P/D configuration optimization tool

### KServe

[`KServe`](https://github.com/kserve/kserve) is a CNCF Incubating project that
provides a Kubernetes-native platform for deploying ML models at scale, with
growing support for LLM inference workloads.

**Key highlights:**

- **InferenceService CRD**: Unified API for model serving across frameworks
- **LMCache integration**: KV cache offloading for LLM serving
- **Canary deployments**: Safe rollout with traffic splitting
- **Serverless serving**: Knative-based scale-to-zero support
- **llm-d integration**: Foundation for disaggregated LLM serving

### vLLM Production Stack

[`vLLM production-stack`](https://github.com/vllm-project/production-stack)
provides Helm-based deployment infrastructure for running vLLM at scale in
Kubernetes environments.

**Key highlights:**

- KV-aware request routing for cache efficiency
- Multi-instance load balancing
- Prometheus metrics and observability
- Router supporting prefix caching optimization

TODO:

- Add KServe detailed introduction (basic P/D disaggregation info added to
  [pd-disaggregation.md](./pd-disaggregation.md))
- Add comprehensive end-to-end benchmark comparison across platforms
