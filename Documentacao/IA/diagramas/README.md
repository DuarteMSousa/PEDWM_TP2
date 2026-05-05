# Diagramas Tecnicos MVP

Este diretorio contem diagramas de apoio ao `blueprint_tecnico_v1.md`.

## Ficheiros

- `arquitetura_mvp.puml`: visao logica da arquitetura (frontend, backend, realtime, outbox).
- `order_state_machine_mvp.puml`: maquina de estados oficial da `Order`.
- `sequencia_checkout_realtime.puml`: fluxo de checkout ate notificacao realtime.
- `sequencia_atribuicao_estafeta.puml`: fluxo de matching e timeout de estafeta.
- `realtime_canais_autorizacao.puml`: canais WebSocket e regras de autorizacao por role.

## Como gerar imagem (exemplo)

```bash
plantuml arquitetura_mvp.puml
plantuml order_state_machine_mvp.puml
```

