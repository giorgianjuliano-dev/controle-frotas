# Configuração do Supabase - Sistema de Controle de Frotas

Este guia explica como configurar o Supabase para usar como banco de dados do sistema de controle de frotas.

## Índice

1. [Criar Projeto no Supabase](#1-criar-projeto-no-supabase)
2. [Criar as Tabelas](#2-criar-as-tabelas)
3. [Configurar Variáveis de Ambiente](#3-configurar-variáveis-de-ambiente)
4. [Configurar Políticas de Segurança (RLS)](#4-configurar-políticas-de-segurança-rls)
5. [Testar a Integração](#5-testar-a-integração)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login ou crie uma conta
2. Clique em **"New Project"**
3. Preencha as informações:
   - **Name**: `controle-frotas` (ou o nome de sua preferência)
   - **Database Password**: Crie uma senha forte (guarde-a!)
   - **Region**: Escolha a região mais próxima (ex: South America - São Paulo)
4. Clique em **"Create new project"**
5. Aguarde alguns minutos até o projeto ser criado

---

## 2. Criar as Tabelas

Após o projeto ser criado, vá para o **SQL Editor** no menu lateral e execute os seguintes comandos SQL para criar as tabelas:

### 2.1 Tabela de Veículos

```sql
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('moving', 'stopped', 'idle', 'offline')),
  ignition TEXT NOT NULL DEFAULT 'off' CHECK (ignition IN ('on', 'off')),
  current_speed INTEGER NOT NULL DEFAULT 0,
  speed_limit INTEGER NOT NULL DEFAULT 80,
  heading INTEGER NOT NULL DEFAULT 0,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  accuracy NUMERIC(5, 2) NOT NULL DEFAULT 5,
  last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  battery_level INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_last_update ON vehicles(last_update);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2.2 Tabela de Cercas Virtuais (Geofences)

```sql
CREATE TABLE geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'circle' CHECK (type IN ('circle', 'polygon')),
  active BOOLEAN NOT NULL DEFAULT true,
  center JSONB, -- {latitude: number, longitude: number}
  radius NUMERIC(10, 2),
  points JSONB, -- Array de {latitude: number, longitude: number}
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  vehicle_ids TEXT[] NOT NULL DEFAULT '{}',
  last_triggered TIMESTAMPTZ,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_geofences_active ON geofences(active);
CREATE INDEX idx_geofences_type ON geofences(type);

-- Trigger para updated_at
CREATE TRIGGER update_geofences_updated_at
  BEFORE UPDATE ON geofences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2.3 Tabela de Alertas

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('speed', 'geofence_entry', 'geofence_exit', 'geofence_dwell', 'system')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'warning', 'info')),
  vehicle_id TEXT NOT NULL,
  vehicle_name TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read BOOLEAN NOT NULL DEFAULT false,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  speed INTEGER,
  speed_limit INTEGER,
  geofence_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas frequentes
CREATE INDEX idx_alerts_read ON alerts(read);
CREATE INDEX idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX idx_alerts_vehicle_id ON alerts(vehicle_id);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_priority ON alerts(priority);
```

### 2.4 Tabela de Viagens

```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_distance NUMERIC(12, 2) NOT NULL,
  travel_time NUMERIC(10, 2) NOT NULL,
  stopped_time NUMERIC(10, 2) NOT NULL,
  average_speed NUMERIC(6, 2) NOT NULL,
  max_speed NUMERIC(6, 2) NOT NULL,
  stops_count INTEGER NOT NULL DEFAULT 0,
  points JSONB NOT NULL DEFAULT '[]'::jsonb,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_trips_start_time ON trips(start_time);
CREATE INDEX idx_trips_end_time ON trips(end_time);
```

### 2.5 Tabela de Violações de Velocidade

```sql
CREATE TABLE speed_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id TEXT NOT NULL,
  vehicle_name TEXT NOT NULL,
  speed INTEGER NOT NULL,
  speed_limit INTEGER NOT NULL,
  excess_speed INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_speed_violations_vehicle_id ON speed_violations(vehicle_id);
CREATE INDEX idx_speed_violations_timestamp ON speed_violations(timestamp DESC);
```

---

## 3. Configurar Variáveis de Ambiente

### 3.1 Obter as Chaves de API

1. No Supabase Dashboard, vá para **Settings** > **API**
2. Copie as seguintes informações:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: Chave pública (começa com `eyJ...`)
   - **service_role**: Chave de serviço (começa com `eyJ...`) - **NUNCA exponha esta chave no frontend!**

### 3.2 Configurar o Arquivo .env

Crie um arquivo `.env` na raiz do projeto (copie do `.env.example`):

```bash
# Tipo de armazenamento
STORAGE_TYPE=supabase

# Configuração do Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-aqui
```

> ⚠️ **IMPORTANTE**: Nunca faça commit do arquivo `.env` no Git. Ele já está no `.gitignore`.

---

## 4. Configurar Políticas de Segurança (RLS)

O Supabase usa Row Level Security (RLS) para proteger os dados. Execute os seguintes comandos para configurar as políticas:

### 4.1 Habilitar RLS nas Tabelas

```sql
-- Habilitar RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_violations ENABLE ROW LEVEL SECURITY;
```

### 4.2 Políticas para Service Role (Backend)

Para que o backend funcione corretamente com a `service_role` key, as políticas abaixo permitem acesso total:

```sql
-- Vehicles - Acesso total para service role
CREATE POLICY "Service role full access to vehicles" ON vehicles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Geofences - Acesso total para service role
CREATE POLICY "Service role full access to geofences" ON geofences
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Alerts - Acesso total para service role
CREATE POLICY "Service role full access to alerts" ON alerts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trips - Acesso total para service role
CREATE POLICY "Service role full access to trips" ON trips
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Speed Violations - Acesso total para service role
CREATE POLICY "Service role full access to speed_violations" ON speed_violations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

### 4.3 (Opcional) Políticas para Leitura Pública

Se você quiser que algumas tabelas sejam legíveis publicamente:

```sql
-- Permitir leitura pública de veículos (para o mapa em tempo real)
CREATE POLICY "Public read access to vehicles" ON vehicles
  FOR SELECT
  USING (true);

-- Permitir leitura pública de geofences
CREATE POLICY "Public read access to geofences" ON geofences
  FOR SELECT
  USING (true);
```

---

## 5. Testar a Integração

### 5.1 Inserir Dados de Teste

Execute no SQL Editor para inserir um veículo de teste:

```sql
INSERT INTO vehicles (name, license_plate, model, status, ignition, current_speed, speed_limit, heading, latitude, longitude, accuracy)
VALUES 
  ('Caminhão 01', 'ABC-1234', 'Mercedes Actros', 'moving', 'on', 72, 80, 45, -23.5489, -46.6388, 5),
  ('Van 02', 'DEF-5678', 'Fiat Ducato', 'stopped', 'off', 0, 60, 0, -23.5605, -46.6533, 3);
```

### 5.2 Iniciar o Servidor

```bash
# Definir variáveis de ambiente e iniciar
npm run dev
```

Você deve ver no console:
```
✅ Usando Supabase como armazenamento
```

### 5.3 Testar a API

```bash
# Listar veículos
curl http://localhost:5000/api/vehicles
```

---

## 6. Troubleshooting

### Erro: "Variáveis de ambiente não configuradas"

Verifique se:
- O arquivo `.env` existe na raiz do projeto
- As variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão definidas
- `STORAGE_TYPE=supabase` está configurado

### Erro: "new row violates row-level security policy"

Execute as políticas RLS da seção 4.2 para dar acesso ao service role.

### Erro: "relation does not exist"

Execute os comandos SQL da seção 2 para criar as tabelas.

### Dados não aparecem no frontend

1. Verifique se há dados nas tabelas (via Supabase Dashboard > Table Editor)
2. Verifique os logs do servidor para erros
3. Confira se as políticas RLS permitem leitura

### Performance lenta

1. Verifique se os índices foram criados
2. Considere adicionar mais índices para consultas frequentes
3. Use a funcionalidade de "Explain" no SQL Editor para analisar queries

---

## Estrutura das Tabelas

### vehicles
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único (auto-gerado) |
| name | TEXT | Nome do veículo |
| license_plate | TEXT | Placa do veículo |
| model | TEXT | Modelo (opcional) |
| status | TEXT | moving, stopped, idle, offline |
| ignition | TEXT | on, off |
| current_speed | INTEGER | Velocidade atual em km/h |
| speed_limit | INTEGER | Limite de velocidade |
| heading | INTEGER | Direção em graus (0-360) |
| latitude | NUMERIC | Coordenada de latitude |
| longitude | NUMERIC | Coordenada de longitude |
| accuracy | NUMERIC | Precisão do GPS em metros |
| last_update | TIMESTAMPTZ | Última atualização |
| battery_level | INTEGER | Nível de bateria (%) |

### geofences
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| name | TEXT | Nome da cerca virtual |
| description | TEXT | Descrição |
| type | TEXT | circle ou polygon |
| active | BOOLEAN | Se está ativa |
| center | JSONB | Centro (para círculos) |
| radius | NUMERIC | Raio em metros |
| points | JSONB | Pontos do polígono |
| rules | JSONB | Regras de alerta |
| vehicle_ids | TEXT[] | IDs dos veículos monitorados |
| last_triggered | TIMESTAMPTZ | Último disparo |
| color | TEXT | Cor no mapa |

### alerts
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| type | TEXT | Tipo do alerta |
| priority | TEXT | critical, warning, info |
| vehicle_id | TEXT | ID do veículo |
| vehicle_name | TEXT | Nome do veículo |
| message | TEXT | Mensagem do alerta |
| timestamp | TIMESTAMPTZ | Data/hora do alerta |
| read | BOOLEAN | Se foi lido |
| latitude/longitude | NUMERIC | Localização do evento |
| speed | INTEGER | Velocidade (se aplicável) |
| speed_limit | INTEGER | Limite (se aplicável) |
| geofence_name | TEXT | Nome da cerca (se aplicável) |

---

## Próximos Passos

1. **Autenticação**: Implementar autenticação de usuários com Supabase Auth
2. **Realtime**: Usar Supabase Realtime para atualizações em tempo real
3. **Backup**: Configurar backups automáticos no Supabase Dashboard
4. **Monitoramento**: Usar o Supabase Dashboard para monitorar performance









