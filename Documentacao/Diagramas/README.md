# Diagramas FastBite

Diagramas em formato **PlantUML** prontos para inserir no relatório PEDWM.

## Conteúdo

| Ficheiro | Substitui no relatório | Descrição |
|---|---|---|
| `01_diagrama_classes.puml` | Figura 1 (pág. 15) | Diagrama de classes completo do domínio FastBite |
| `02_diagrama_er.puml` | Figura 2 (pág. 19) | Entidade-Relação extraído das migrations |
| `03_sequencia_criar_encomenda.puml` | Figura 3 (pág. 20) | Cliente → checkout → ORDER_CREATED → restaurante notificado |
| `04_sequencia_aceitar_pedido.puml` | (novo) | Restaurante → startPreparingOrder → Delivery + DeliveryOffer |
| `05_sequencia_entrega.puml` | (novo) | Estafeta aceita → pickup → in transit → delivered |
| `06_comunicacao_realtime.puml` | Figura 4 (pág. 21) | Arquitetura event-driven: Domain Event → Outbox → Reverb → cliente |
| `07_state_machine_order.puml` | (novo) | Máquina de estados de uma Order |

## Como renderizar para PNG/SVG

### Opção A — VS Code (mais rápido)

1. Instalar extensão **"PlantUML"** (jebbs.plantuml).
2. Abrir o `.puml` no editor.
3. `Alt+D` para preview, ou `Ctrl+Shift+P → PlantUML: Export Current Diagram` → PNG/SVG.

> Requer Java instalado. Em alternativa, configurar `plantuml.server = "https://www.plantuml.com/plantuml"` nas settings para usar o servidor online.

### Opção B — CLI (em lote)

```powershell
# Descarregar plantuml.jar uma vez:
Invoke-WebRequest "https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar" -OutFile plantuml.jar

# Gerar PNGs de todos os diagramas:
java -jar plantuml.jar -tpng Documentacao/Diagramas/*.puml

# Ou SVG (melhor qualidade para o Word):
java -jar plantuml.jar -tsvg Documentacao/Diagramas/*.puml
```

### Opção C — Online

Copia o conteúdo de cada `.puml` e cola em https://www.plantuml.com/plantuml/uml — descarrega o PNG.

## Como inserir no Word

1. Renderizar para **SVG** (preserva qualidade ao redimensionar).
2. No Word: **Inserir → Imagens → A partir do dispositivo** → seleciona o SVG.
3. Adicionar legenda: **Referências → Inserir Legenda** (mantém a numeração automática).
4. Atualizar a Lista de Figuras no fim (botão direito → Atualizar Campos).

## Notas

- Os nomes dos canais Reverb (`customer.{id}.orders`, `restaurant.{id}.orders`, `order.{id}.tracking`, `courier.{id}.jobs`) foram extraídos diretamente do código (`OrderService.php`, `DeliveryService.php`, `CourierPositionUpdated.php`).
- Os event types (`ORDER_CREATED`, `ORDER_CONFIRMED`, `JOB_OFFERED`, etc.) vêm das enums em `Backend/app/Enums/`.
- O fluxo de `Outbox → Worker → Reverb` reflete a implementação real em `App\Services\OutboxService` + `App\Events\DomainEventBroadcasted`.
