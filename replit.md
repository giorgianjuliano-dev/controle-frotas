# FleetTrack - Sistema de Rastreamento Veicular

## Visão Geral
Sistema completo de rastreamento veicular em tempo real desenvolvido em React + Express. Permite monitorar frota, gerenciar geofences, controlar velocidade e visualizar histórico de trajetos.

## Arquitetura

### Frontend (client/)
- **Framework**: React 18 com TypeScript
- **Roteamento**: wouter
- **Estado**: TanStack Query v5 para cache e sincronização
- **UI**: shadcn/ui + Tailwind CSS
- **Mapas**: Leaflet + react-leaflet v4.2.1
- **Gráficos**: Recharts
- **Tema**: Suporte a dark/light mode

### Backend (server/)
- **Framework**: Express.js
- **Storage**: In-memory (MemStorage)
- **Simulação**: Atualização automática de posição de veículos a cada 3 segundos

## Estrutura de Páginas

### Dashboard (/)
- Mapa interativo com todos os veículos
- Lista lateral de veículos com filtros (Todos, Em Movimento, Parados, Alertas, Offline)
- Painel de detalhes do veículo selecionado
- Modo "Seguir veículo" para acompanhar em tempo real
- Indicadores de status: velocidade, direção, precisão GPS, ignição

### Histórico (/history)
- Seleção de veículo e período (calendário)
- Visualização de rota no mapa com marcadores
- Resumo do trajeto: distância, tempo, paradas, velocidade média/máxima
- Lista de eventos cronológicos (partidas, paradas, infrações)

### Geofences (/geofences)
- Lista de áreas virtuais configuradas
- Criação de geofences circulares ou poligonais
- Regras de alerta: entrada, saída, permanência prolongada
- Configuração de tolerância para evitar falsos positivos

### Alertas (/alerts)
- Feed de alertas em tempo real
- Filtros: Todos, Velocidade, Geofence, Sistema, Não lidos
- Ações: marcar como lido, limpar alertas lidos

### Relatórios (/reports)
- KPIs: total de infrações, veículos com infrações, excesso médio
- Gráfico de infrações por período
- Ranking dos 10 veículos com mais infrações
- Detalhamento de cada infração

## API Endpoints

### Veículos
- `GET /api/vehicles` - Lista todos os veículos
- `GET /api/vehicles/:id` - Detalhes de um veículo
- `PATCH /api/vehicles/:id` - Atualiza veículo (ex: limite de velocidade)

### Geofences
- `GET /api/geofences` - Lista geofences
- `POST /api/geofences` - Cria geofence
- `PATCH /api/geofences/:id` - Atualiza geofence
- `DELETE /api/geofences/:id` - Remove geofence

### Alertas
- `GET /api/alerts` - Lista alertas
- `PATCH /api/alerts/:id` - Atualiza alerta (marcar como lido)
- `POST /api/alerts/mark-all-read` - Marca todos como lidos
- `DELETE /api/alerts/clear-read` - Remove alertas lidos

### Histórico e Relatórios
- `GET /api/trips?vehicleId=&startDate=&endDate=` - Trajetos de um veículo
- `GET /api/reports/violations?startDate=&endDate=` - Infrações de velocidade
- `GET /api/reports/speed-stats?startDate=&endDate=` - Estatísticas de velocidade

## Modelos de Dados (shared/schema.ts)

### Vehicle
- id, name, licensePlate, model
- status: moving | stopped | idle | offline
- ignition: on | off
- currentSpeed, speedLimit, heading
- latitude, longitude, accuracy
- lastUpdate, batteryLevel

### Geofence
- id, name, description, type (circle | polygon)
- center/radius (círculo) ou points (polígono)
- rules: entrada, saída, permanência, tolerância
- vehicleIds, active, lastTriggered, color

### Alert
- id, type (speed | geofence_entry | geofence_exit | geofence_dwell | system)
- priority: critical | warning | info
- vehicleId, vehicleName, message, timestamp, read

### Trip
- id, vehicleId, startTime, endTime
- totalDistance, travelTime, stoppedTime
- averageSpeed, maxSpeed, stopsCount
- points[], events[]

## Design System

### Cores
- Primary: Azul (#3b82f6 / hsl 217 91% 45%)
- Destructive: Vermelho para alertas críticos
- Status: Verde (online), Âmbar (parado), Cinza (offline)

### Tipografia
- Sans: Inter
- Mono: Roboto Mono (para dados numéricos)

### Componentes
- Baseados em shadcn/ui
- Suporte a dark mode via classe .dark
- Elevação via hover-elevate e active-elevate-2

## Funcionalidades Implementadas

1. **Localização em Tempo Real**
   - Posição atual de cada veículo no mapa
   - Ícones direcionais indicando sentido de movimento
   - Atualização automática a cada 5 segundos
   - Traçado do percurso recente

2. **Histórico de Trajetos**
   - Seleção por data/hora com calendário
   - Visualização de rota completa com marcadores
   - Resumo com métricas detalhadas
   - Lista de eventos do trajeto

3. **Alertas Geográficos (Geofencing)**
   - Criação de áreas circulares e poligonais
   - Regras de entrada, saída e permanência
   - Tolerância configurável para evitar falsos positivos

4. **Monitoramento de Velocidade**
   - Alertas de excesso de velocidade em tempo real
   - Relatórios de conformidade
   - Ranking de veículos com mais infrações

## Comandos de Desenvolvimento

```bash
npm run dev    # Inicia servidor de desenvolvimento (porta 5000)
npm run build  # Build de produção
npm run db:push # Sincroniza schema com banco (não usado, em memória)
```

## Próximos Passos (Fase 2)
- Persistência com PostgreSQL
- Notificações push/SMS/e-mail
- Geocodificação reversa para endereços
- Sistema multi-usuário com autenticação
- Relatórios agendados
