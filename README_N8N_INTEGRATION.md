# 🔌 Guia de Integração N8N - Portal Rastro

## 📋 Visão Geral

Este portal foi desenvolvido como um **boilerplate headless** pronto para integração completa com n8n. Toda a lógica de negócios e processamento de dados deve ser implementada no n8n através dos endpoints documentados abaixo.

## ⚙️ Configuração Inicial

### 1. Criar arquivo .env

Copie o arquivo `.env.example` para `.env` e configure a URL do seu servidor n8n:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Desenvolvimento
VITE_API_BASE_URL=http://localhost:5678/webhook/rastro

# Produção
# VITE_API_BASE_URL=https://seu-n8n-server.com/webhook/rastro
```

### 2. Instalar n8n

```bash
npm install n8n -g
# ou
docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

## 📡 Endpoints da API

Todos os endpoints devem ser criados como **Webhooks** no n8n. Abaixo está a documentação completa de cada endpoint.

---

### 🏠 **GET /api/dashboard**

**Descrição:** Retorna KPIs e resumo geral do dashboard.

**Workflow n8n sugerido:**
1. Webhook (GET)
2. Aggregate dados de telemetria do banco de dados
3. Calcular: total de pneus, pneus críticos, economia estimada, parceiros ativos
4. Respond to Webhook

**Resposta Esperada (JSON):**
```json
{
  "totalPneus": 90,
  "pneusCriticos": 9,
  "economiaEstimada": 15300,
  "parceirosAtivos": 3,
  "pilulaConhecimento": "Ao realizar a reforma dos 9 pneus..."
}
```

---

### 🔍 **GET /api/telemetria**

**Descrição:** Lista todos os dados de telemetria dos pneus.

**Workflow n8n sugerido:**
1. Webhook (GET)
2. Query banco de dados (Postgres/MySQL)
3. Respond to Webhook

**Resposta Esperada (JSON):**
```json
[
  {
    "id": "PN-001",
    "veiculo": "V001",
    "frota": "Frota A",
    "quilometragem": 155000,
    "pressao": 108,
    "profundidadeBanda": 12,
    "dataColeta": "2025-10-20T10:00:00Z",
    "status": "normal"
  },
  {
    "id": "PN-002",
    "veiculo": "V001",
    "frota": "Frota A",
    "quilometragem": 185000,
    "pressao": 85,
    "profundidadeBanda": 2.5,
    "dataColeta": "2025-10-20T10:00:00Z",
    "status": "critical"
  }
]
```

**Status possíveis:**
- `normal`: Pneu em boas condições
- `warning`: Atenção necessária
- `critical`: Ação imediata necessária

---

### 📤 **POST /api/telemetria**

**Descrição:** Recebe novos dados de telemetria (simulando upload de CSV).

**Workflow n8n sugerido:**
1. Webhook (POST)
2. Parse CSV data
3. Validate dados
4. Insert no banco de dados
5. Trigger análise de alertas
6. Respond to Webhook

**Body Esperado (JSON):**
```json
{
  "data": [
    {
      "id": "PN-091",
      "veiculo": "V006",
      "frota": "Frota C",
      "quilometragem": 160000,
      "pressao": 105,
      "profundidadeBanda": 11,
      "dataColeta": "2025-10-27T14:30:00Z"
    }
  ]
}
```

**Resposta Esperada (JSON):**
```json
{
  "success": true,
  "message": "Dados de telemetria inseridos com sucesso",
  "insertedCount": 1
}
```

---

### 🛠️ **GET /api/sop**

**Descrição:** Retorna tarefas, técnicos e contratos do S&OP.

**Workflow n8n sugerido:**
1. Webhook (GET)
2. Query 3 tabelas: tarefas, tecnicos, contratos
3. Merge results
4. Respond to Webhook

**Resposta Esperada (JSON):**
```json
{
  "tarefas": [
    {
      "id": "T-001",
      "descricao": "Inspeção Frota A",
      "frota": "Frota A",
      "tecnico": "João Silva",
      "prioridade": "alta",
      "status": "pendente"
    }
  ],
  "tecnicos": [
    {
      "id": "TEC-001",
      "nome": "João Silva",
      "especialidade": "Diagnóstico de Desgaste",
      "frotasAtribuidas": ["Frota A", "Frota B"]
    }
  ],
  "contratos": [
    {
      "id": "CTR-001",
      "cliente": "Transportadora Alpha",
      "escopo": "Monitoramento mensal completo",
      "visitasMes": 4,
      "dataVencimento": "2025-12-31T00:00:00Z",
      "status": "ativo"
    }
  ]
}
```

---

### 👷 **POST /api/sop/alocar**

**Descrição:** Aloca um técnico a uma frota/contrato.

**Workflow n8n sugerido:**
1. Webhook (POST)
2. Validate técnico e frota existem
3. Update registro de alocação
4. Send notification (email/SMS) ao técnico
5. Respond to Webhook

**Body Esperado (JSON):**
```json
{
  "tecnicoId": "TEC-001",
  "frotaId": "Frota A"
}
```

**Resposta Esperada (JSON):**
```json
{
  "success": true,
  "message": "Técnico João Silva alocado à Frota A com sucesso"
}
```

---

### 💰 **POST /api/analise-financeira** ⭐ **ENDPOINT PRINCIPAL**

**Descrição:** Gera a "Pílula de Conhecimento" - análise financeira de economia.

Este é o **coração da automação**. O n8n deve:
1. Buscar pneus com status `critical` da telemetria
2. Calcular: `economia = (custoPneuNovo - custoReforma) * qtdPneusCriticos`
3. Gerar mensagem da Pílula de Conhecimento
4. Salvar análise no banco de dados
5. (Opcional) Enviar email/notificação ao cliente

**Workflow n8n sugerido:**
1. Webhook (POST)
2. Query pneus críticos (status='critical')
3. Calculate:
   - `economiaPorPneu = custoPneuNovo - custoReforma`
   - `economiaTotal = economiaPorPneu * count(pneusCriticos)`
4. Generate mensagem da Pílula
5. Insert na tabela analises_financeiras
6. (Opcional) Send email/notification
7. Respond to Webhook

**Body Esperado (JSON):**
```json
{
  "custoPneuNovo": 2500,
  "custoReforma": 800
}
```

**Resposta Esperada (JSON):**
```json
{
  "pilulaConhecimento": "Ao realizar a reforma dos 9 pneus identificados com desgaste crítico em vez de comprar novos, sua frota economizará R$ 15.300,00 nos próximos 6 meses (baseado na vida útil esperada do pneu reformado).",
  "economiaTotal": 15300,
  "quantidadePneus": 9,
  "detalhamento": [
    {
      "id": "PN-002",
      "economia": 1700
    },
    {
      "id": "PN-015",
      "economia": 1700
    }
  ]
}
```

---

### 📊 **GET /api/analise-financeira**

**Descrição:** Retorna a última análise financeira gerada.

**Workflow n8n sugerido:**
1. Webhook (GET)
2. Query última análise (ORDER BY data_criacao DESC LIMIT 1)
3. Respond to Webhook

**Resposta Esperada:** Mesmo formato do POST acima.

---

### 🌍 **GET /api/parcerias**

**Descrição:** Lista parceiros homologados e ciclo de vida dos pneus.

**Workflow n8n sugerido:**
1. Webhook (GET)
2. Query 2 tabelas: parceiros, ciclo_vida_pneus
3. Merge results
4. Respond to Webhook

**Resposta Esperada (JSON):**
```json
{
  "parceiros": [
    {
      "id": "PARC-001",
      "nome": "Recapagem Forte",
      "tipo": "reformadora",
      "seloQualidade": true,
      "volumeVendas": 45,
      "comissaoDevida": 7650
    },
    {
      "id": "PARC-002",
      "nome": "Pneus Gigantes",
      "tipo": "fornecedor",
      "seloQualidade": true,
      "volumeVendas": 23,
      "comissaoDevida": 11500
    }
  ],
  "cicloVida": [
    {
      "id": "PN-001",
      "veiculo": "V001",
      "dataInstalacao": "2024-01-15T00:00:00Z",
      "statusFinal": "Em Operação",
      "reformas": 0
    },
    {
      "id": "PN-050",
      "veiculo": "V003",
      "dataInstalacao": "2023-06-10T00:00:00Z",
      "statusFinal": "Reforma Recomendada",
      "reformas": 1
    }
  ]
}
```

---

## 🗄️ Estrutura de Banco de Dados Sugerida

### Tabela: `telemetria`
```sql
CREATE TABLE telemetria (
  id VARCHAR(50) PRIMARY KEY,
  veiculo VARCHAR(50) NOT NULL,
  frota VARCHAR(50) NOT NULL,
  quilometragem INT NOT NULL,
  pressao DECIMAL(5,2) NOT NULL,
  profundidade_banda DECIMAL(4,2) NOT NULL,
  data_coleta TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'normal', 'warning', 'critical'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `tarefas`
```sql
CREATE TABLE tarefas (
  id VARCHAR(50) PRIMARY KEY,
  descricao TEXT NOT NULL,
  frota VARCHAR(50) NOT NULL,
  tecnico VARCHAR(100),
  prioridade VARCHAR(20) NOT NULL, -- 'alta', 'media', 'baixa'
  status VARCHAR(30) NOT NULL, -- 'pendente', 'em_execucao', 'concluido'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `tecnicos`
```sql
CREATE TABLE tecnicos (
  id VARCHAR(50) PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  especialidade VARCHAR(100),
  frotas_atribuidas TEXT, -- JSON array ou tabela relacionada
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `contratos`
```sql
CREATE TABLE contratos (
  id VARCHAR(50) PRIMARY KEY,
  cliente VARCHAR(100) NOT NULL,
  escopo TEXT NOT NULL,
  visitas_mes INT NOT NULL,
  data_vencimento DATE NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'ativo', 'vencido', 'renovacao'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `analises_financeiras`
```sql
CREATE TABLE analises_financeiras (
  id VARCHAR(50) PRIMARY KEY,
  pilula_conhecimento TEXT NOT NULL,
  economia_total DECIMAL(12,2) NOT NULL,
  quantidade_pneus INT NOT NULL,
  detalhamento JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `parceiros`
```sql
CREATE TABLE parceiros (
  id VARCHAR(50) PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(30) NOT NULL, -- 'reformadora', 'fornecedor'
  selo_qualidade BOOLEAN DEFAULT FALSE,
  volume_vendas INT DEFAULT 0,
  comissao_devida DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `ciclo_vida_pneus`
```sql
CREATE TABLE ciclo_vida_pneus (
  id VARCHAR(50) PRIMARY KEY,
  veiculo VARCHAR(50) NOT NULL,
  data_instalacao DATE NOT NULL,
  status_final VARCHAR(50) NOT NULL,
  reformas INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔄 Fluxo de Trabalho Recomendado

### 1. Coleta de Telemetria (Diária/Semanal)
```
Sensor IoT/CSV Upload → POST /api/telemetria → n8n processa → Salva no banco
                                                          ↓
                                              Detecta pneus críticos
                                                          ↓
                                              Trigger automático do endpoint
                                              POST /api/analise-financeira
```

### 2. Geração da Pílula de Conhecimento (Automático)
```
Novos pneus críticos detectados → POST /api/analise-financeira → n8n calcula economia
                                                                           ↓
                                                                    Gera relatório PDF
                                                                           ↓
                                                                    Envia email ao cliente
```

### 3. Gestão de S&OP (Manual via UI)
```
Gestor aloca técnico via UI → POST /api/sop/alocar → n8n atualiza banco
                                                            ↓
                                                     Envia notificação ao técnico
```

---

## 🧪 Testando os Endpoints

### Usando cURL:

```bash
# GET Dashboard
curl http://localhost:5678/webhook/rastro/dashboard

# POST Telemetria
curl -X POST http://localhost:5678/webhook/rastro/telemetria \
  -H "Content-Type: application/json" \
  -d '{"data":[{"id":"PN-100","veiculo":"V001","frota":"Frota A","quilometragem":160000,"pressao":105,"profundidadeBanda":11,"dataColeta":"2025-10-27T14:30:00Z"}]}'

# POST Análise Financeira
curl -X POST http://localhost:5678/webhook/rastro/analise-financeira \
  -H "Content-Type: application/json" \
  -d '{"custoPneuNovo":2500,"custoReforma":800}'
```

---

## 📚 Recursos Adicionais

- **n8n Documentation:** https://docs.n8n.io/
- **n8n Webhook Guide:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- **Estrutura de Arquivos do Projeto:** Veja `src/services/api.ts` para todos os endpoints definidos no front-end

---

## 🎯 Próximos Passos

1. ✅ Configure o arquivo `.env`
2. ✅ Instale e inicie o n8n
3. ✅ Crie um workflow para cada endpoint documentado acima
4. ✅ Configure um banco de dados (Postgres recomendado)
5. ✅ Teste cada endpoint com cURL ou Postman
6. ✅ Conecte o front-end ao n8n e valide a integração completa

---

**Desenvolvido para integração completa com n8n | Portal Rastro v1.0**
