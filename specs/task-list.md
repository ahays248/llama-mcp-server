# Task List

Pick the FIRST uncompleted task. Complete it. Mark it done. Exit.

## Status Legend
- `[ ]` = Not started
- `[x]` = Complete

---

## Phase 1: Infrastructure

- [x] Create src/types.ts with Tool and ToolResult interfaces
- [x] Create src/config.ts with environment loading
- [x] Create src/client.ts with LlamaClient interface and createClient function
- [x] Write tests/unit/config.test.ts
- [x] Write tests/unit/client.test.ts
- [x] Write tests/unit/build.test.ts

## Phase 2: Server Tools

- [x] Implement llama_health in src/tools/server.ts
- [x] Write tests for llama_health in tests/unit/tools/server.test.ts
- [x] Implement llama_props in src/tools/server.ts
- [x] Write tests for llama_props
- [x] Implement llama_models in src/tools/server.ts
- [x] Write tests for llama_models
- [x] Implement llama_slots in src/tools/server.ts
- [x] Write tests for llama_slots
- [x] Implement llama_metrics in src/tools/server.ts
- [x] Write tests for llama_metrics

## Phase 3: Token Tools

- [x] Implement llama_tokenize in src/tools/tokens.ts
- [x] Write tests for llama_tokenize in tests/unit/tools/tokens.test.ts
- [x] Implement llama_detokenize in src/tools/tokens.ts
- [x] Write tests for llama_detokenize
- [x] Implement llama_apply_template in src/tools/tokens.ts
- [x] Write tests for llama_apply_template

## Phase 4: Inference Tools

- [x] Implement llama_complete in src/tools/inference.ts
- [x] Write tests for llama_complete in tests/unit/tools/inference.test.ts
- [x] Implement llama_chat in src/tools/inference.ts
- [x] Write tests for llama_chat
- [x] Implement llama_embed in src/tools/inference.ts
- [x] Write tests for llama_embed
- [x] Implement llama_infill in src/tools/inference.ts
- [x] Write tests for llama_infill
- [x] Implement llama_rerank in src/tools/inference.ts
- [x] Write tests for llama_rerank

## Phase 5: Model Management Tools

- [x] Implement llama_load_model in src/tools/models.ts
- [x] Write tests for llama_load_model in tests/unit/tools/models.test.ts
- [x] Implement llama_unload_model in src/tools/models.ts
- [x] Write tests for llama_unload_model

## Phase 6: LoRA Tools

- [x] Implement llama_lora_list in src/tools/lora.ts
- [x] Write tests for llama_lora_list in tests/unit/tools/lora.test.ts
- [x] Implement llama_lora_set in src/tools/lora.ts
- [x] Write tests for llama_lora_set

## Phase 7: Process Control Tools

- [x] Implement llama_start in src/tools/process.ts
- [x] Write tests for llama_start in tests/unit/tools/process.test.ts
- [x] Implement llama_stop in src/tools/process.ts
- [x] Write tests for llama_stop

## Phase 8: Integration

- [x] Create src/server.ts that registers all tools
- [x] Create src/index.ts entry point with stdio transport
- [x] Write README.md with installation and usage instructions
- [x] Create LICENSE file (MIT)

---

## Success Criteria

After completing a task, verify:
```bash
npm run typecheck   # No TypeScript errors
npm test            # All tests pass
```

When both pass, mark the task [x] and output: **RALPH_WIGGUM_COMPLETE**
