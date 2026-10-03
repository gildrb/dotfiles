;;; Local Hermes Qwen. Nix concatenates this only on the computer host.
(in-package #:antaios)

(register-openai-compatible-provider
 :name "qwen-local"
 :description "Local Qwen3.8-27B used by Hermes"
 :endpoint "http://127.0.0.1:18020/v1/chat/completions"
 :models-endpoint "http://127.0.0.1:18020/v1/models"
 ;; Elpis issues this key; reading it per request survives key rotation.
 :api-key-file "/mnt/ssd/storage/ai/qwen3.8-27b/api-key"
 :models '((:name "qwen3.8-27b"
            :description "Hermes default Qwen3.8-27B"
            :context-window 262144)))
